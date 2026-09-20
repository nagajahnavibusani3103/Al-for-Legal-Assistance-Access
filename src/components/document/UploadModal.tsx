'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, File, AlertCircle, CheckCircle2, Loader2, X, FileText } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (documentId: string) => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isUploading, onClose]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setErrorMessage(null);
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage(`File exceeds 15 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    const validExtensions = ['.pdf', '.docx', '.txt', '.md'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMessage('Please upload a PDF (.pdf), Word document (.docx), or Text file (.txt).');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_.-]/g, ' '));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setStatusMessage('Validating document & checking safety headers...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (title.trim()) {
        formData.append('title', title.trim());
      }

      setStatusMessage('Extracting pages, chunking clauses & generating grounded embeddings...');

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload failed.');
      }

      setStatusMessage('Analysis complete! Redirecting...');
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess(data.documentId);
        } else {
          router.push(`/documents/${data.documentId}`);
        }
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during document processing.');
      setIsUploading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div 
        ref={modalRef}
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            <h2 id="upload-modal-title" className="text-base font-bold text-slate-900">
              Upload Legal Document
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div 
              role="alert" 
              className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragActive 
                ? 'border-blue-600 bg-blue-50/50' 
                : selectedFile 
                ? 'border-emerald-400 bg-emerald-50/30' 
                : 'border-slate-300 hover:border-slate-400 bg-slate-50/40'
            }`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <p className="text-xs text-blue-600 underline">Click to choose a different file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Drag and drop your contract or agreement
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports PDF, DOCX, or TXT (up to 15 MB)
                  </p>
                </div>
                <span className="inline-flex px-3 py-1 rounded bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-sm mt-1">
                  Browse Files
                </span>
              </div>
            )}
          </div>

          {/* Title Override Field */}
          <div>
            <label htmlFor="doc-title" className="block text-xs font-semibold text-slate-700 mb-1">
              Document Display Title (Optional)
            </label>
            <input
              id="doc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isUploading}
              placeholder="e.g., Commercial Lease Agreement 2025"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Processing Status */}
          {isUploading && (
            <div 
              role="status" 
              aria-live="polite" 
              className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3 text-xs text-blue-900"
            >
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
              <span className="font-medium">{statusMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Analyze Document</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
