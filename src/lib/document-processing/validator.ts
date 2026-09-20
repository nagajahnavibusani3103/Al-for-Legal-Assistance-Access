import path from 'path';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  detectedType?: 'pdf' | 'docx' | 'txt';
  sanitizedFileName?: string;
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.ps1', '.vbs', '.js', '.jar',
  '.scr', '.pif', '.dll', '.com', '.zip', '.tar', '.gz', '.7z', '.rar'
]);

export function sanitizeFileName(rawFileName: string): string {
  // Strip path traversal sequences like ../ or ..\
  const base = path.basename(rawFileName);
  // Replace unsafe characters
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 150);
}

export function validateDocumentFile(
  fileName: string, 
  fileBuffer: Buffer, 
  declaredMimeType: string
): ValidationResult {
  // 1. File Size check
  if (!fileBuffer || fileBuffer.length === 0) {
    return { isValid: false, error: 'File is empty (0 bytes).' };
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    return { 
      isValid: false, 
      error: `File exceeds maximum allowed size of 15 MB (uploaded: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB).` 
    };
  }

  // 2. Extension validation
  const ext = path.extname(fileName).toLowerCase();
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return { 
      isValid: false, 
      error: `Security violation: File type '${ext}' is executable or an unsupported archive.` 
    };
  }

  const sanitized = sanitizeFileName(fileName);

  // 3. Magic Bytes verification (never trust client MIME alone)
  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (fileBuffer.length >= 4 && fileBuffer[0] === 0x25 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x44 && fileBuffer[3] === 0x46) {
    return {
      isValid: true,
      detectedType: 'pdf',
      sanitizedFileName: sanitized
    };
  }

  // DOCX / Office Open XML: PK.. (ZIP archive 0x50 0x4B 0x03 0x04)
  if (fileBuffer.length >= 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b && fileBuffer[2] === 0x03 && fileBuffer[3] === 0x04) {
    if (ext === '.docx' || declaredMimeType.includes('wordprocessingml')) {
      return {
        isValid: true,
        detectedType: 'docx',
        sanitizedFileName: sanitized
      };
    }
  }

  // Executable check: MZ header (Windows PE / EXE)
  if (fileBuffer.length >= 2 && fileBuffer[0] === 0x4d && fileBuffer[1] === 0x5a) {
    return { isValid: false, error: 'Security violation: Executable PE/MZ binary rejected.' };
  }

  // Executable check: ELF header
  if (fileBuffer.length >= 4 && fileBuffer[0] === 0x7f && fileBuffer[1] === 0x45 && fileBuffer[2] === 0x4c && fileBuffer[3] === 0x46) {
    return { isValid: false, error: 'Security violation: Executable ELF binary rejected.' };
  }

  // TXT check: must be valid UTF-8 and not binary
  if (ext === '.txt' || ext === '.md' || declaredMimeType.includes('text/plain')) {
    // Check for excessive binary null bytes
    let nullBytes = 0;
    const sampleLength = Math.min(fileBuffer.length, 1024);
    for (let i = 0; i < sampleLength; i++) {
      if (fileBuffer[i] === 0) nullBytes++;
    }
    if (nullBytes > 0) {
      return { isValid: false, error: 'File contains binary data and is not a valid text document.' };
    }

    return {
      isValid: true,
      detectedType: 'txt',
      sanitizedFileName: sanitized
    };
  }

  return {
    isValid: false,
    error: `Unsupported file format. Please upload a PDF (.pdf), Word (.docx), or Text document (.txt).`
  };
}
