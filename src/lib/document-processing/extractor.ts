import mammoth from 'mammoth';

export interface ExtractedPage {
  pageNumber: number;
  content: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  pageCount: number;
  totalCharacters: number;
  isScanned: boolean;
  warnings?: string[];
}

export async function extractDocumentContent(
  fileBuffer: Buffer, 
  detectedType: 'pdf' | 'docx' | 'txt'
): Promise<ExtractionResult> {
  const warnings: string[] = [];

  if (detectedType === 'pdf') {
    return extractPdf(fileBuffer);
  } else if (detectedType === 'docx') {
    return extractDocx(fileBuffer);
  } else {
    return extractTxt(fileBuffer);
  }
}

async function extractPdf(fileBuffer: Buffer): Promise<ExtractionResult> {
  try {
    // Dynamic import of pdf-parse to handle serverless/bundler environments
    const pdfParse = (await import('pdf-parse')).default;
    
    const pageTexts: { [pageNum: number]: string } = {};

    const options = {
      pagerender: (pageData: any) => {
        return pageData.getTextContent().then((textContent: any) => {
          let lastY: number | null = null;
          let text = '';
          for (const item of textContent.items) {
            if (lastY === item.transform[5] || !lastY) {
              text += item.str;
            } else {
              text += '\n' + item.str;
            }
            lastY = item.transform[5];
          }
          pageTexts[pageData.pageIndex + 1] = text;
          return text;
        });
      }
    };

    const data = await pdfParse(fileBuffer, options);
    const pageCount = data.numpages || 1;
    const pages: ExtractedPage[] = [];

    for (let p = 1; p <= pageCount; p++) {
      const pageText = pageTexts[p] || '';
      pages.push({
        pageNumber: p,
        content: pageText.trim()
      });
    }

    // Fallback if pagerender didn't populate all pages
    if (pages.length === 0 || pages.every(p => !p.content)) {
      pages.length = 0;
      pages.push({
        pageNumber: 1,
        content: data.text.trim()
      });
    }

    const totalChars = pages.reduce((acc, p) => acc + p.content.length, 0);
    const avgCharsPerPage = totalChars / (pageCount || 1);
    const isScanned = totalChars < 50 || avgCharsPerPage < 30;

    return {
      pages,
      pageCount: pages.length,
      totalCharacters: totalChars,
      isScanned,
      warnings: isScanned ? ['Low text density detected. This document may be scanned or image-based.'] : []
    };
  } catch (err: any) {
    throw new Error(`Failed to parse PDF: ${err.message || String(err)}`);
  }
}

async function extractDocx(fileBuffer: Buffer): Promise<ExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const fullText = result.value || '';
    
    // DOCX files don't have hard physical pages in raw text; we split into logical 500-word reading pages
    const paragraphs = fullText.split(/\n\s*\n/);
    const pages: ExtractedPage[] = [];
    let currentPageNum = 1;
    let currentBuffer: string[] = [];
    let currentWordCount = 0;

    for (const para of paragraphs) {
      const words = para.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) continue;

      if (currentWordCount + words.length > 500 && currentBuffer.length > 0) {
        pages.push({
          pageNumber: currentPageNum,
          content: currentBuffer.join('\n\n').trim()
        });
        currentPageNum++;
        currentBuffer = [para.trim()];
        currentWordCount = words.length;
      } else {
        currentBuffer.push(para.trim());
        currentWordCount += words.length;
      }
    }

    if (currentBuffer.length > 0) {
      pages.push({
        pageNumber: currentPageNum,
        content: currentBuffer.join('\n\n').trim()
      });
    }

    if (pages.length === 0) {
      pages.push({
        pageNumber: 1,
        content: fullText.trim()
      });
    }

    return {
      pages,
      pageCount: pages.length,
      totalCharacters: fullText.length,
      isScanned: false,
      warnings: result.messages.map(m => m.message)
    };
  } catch (err: any) {
    throw new Error(`Failed to parse DOCX: ${err.message || String(err)}`);
  }
}

async function extractTxt(fileBuffer: Buffer): Promise<ExtractionResult> {
  const text = fileBuffer.toString('utf8');
  
  // Look for explicit page markers like "--- Page 2 ---" or "[Page 2]" or form feed characters (\f)
  const explicitPageSplit = text.split(/(?:---+\s*Page\s*(\d+)\s*---+|\[\s*Page\s*(\d+)\s*\]|\f)/i);
  
  const pages: ExtractedPage[] = [];

  if (text.includes('\f')) {
    const rawPages = text.split('\f');
    for (let i = 0; i < rawPages.length; i++) {
      if (rawPages[i].trim()) {
        pages.push({
          pageNumber: i + 1,
          content: rawPages[i].trim()
        });
      }
    }
  } else if (/---+\s*Page\s*\d+/i.test(text)) {
    const parts = text.split(/---+/);
    let currentPage = 1;
    for (const part of parts) {
      const trimmed = part.trim();
      const match = trimmed.match(/^Page\s*(\d+)/i);
      if (match) {
        currentPage = parseInt(match[1], 10);
        const body = trimmed.replace(/^Page\s*\d+\s*/i, '').trim();
        if (body) {
          pages.push({ pageNumber: currentPage, content: body });
        }
      } else if (trimmed) {
        pages.push({ pageNumber: currentPage, content: trimmed });
      }
    }
  }

  // Fallback: If no explicit pages found, segment by ~500 words per page
  if (pages.length === 0) {
    const paragraphs = text.split(/\n\s*\n/);
    let currentPageNum = 1;
    let currentBuffer: string[] = [];
    let currentWordCount = 0;

    for (const para of paragraphs) {
      const words = para.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) continue;

      if (currentWordCount + words.length > 500 && currentBuffer.length > 0) {
        pages.push({
          pageNumber: currentPageNum,
          content: currentBuffer.join('\n\n').trim()
        });
        currentPageNum++;
        currentBuffer = [para.trim()];
        currentWordCount = words.length;
      } else {
        currentBuffer.push(para.trim());
        currentWordCount += words.length;
      }
    }

    if (currentBuffer.length > 0) {
      pages.push({
        pageNumber: currentPageNum,
        content: currentBuffer.join('\n\n').trim()
      });
    }
  }

  if (pages.length === 0) {
    pages.push({ pageNumber: 1, content: text.trim() });
  }

  return {
    pages,
    pageCount: pages.length,
    totalCharacters: text.length,
    isScanned: false
  };
}
