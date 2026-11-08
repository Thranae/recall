import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileImage, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const imagesOnly = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      setSelectedFiles(imagesOnly);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    try {
      await api.uploadScreenshots(selectedFiles);
      setUploadSuccess(true);
      setTimeout(() => {
        onUploadSuccess();
        onClose();
        setSelectedFiles([]);
        setUploadSuccess(false);
      }, 1200);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please check image format and size.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/80">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-indigo-400" />
          <span>Import Screenshots</span>
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Upload screenshots for automatic OCR, conversation threading, and visual search.
        </p>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-400 bg-indigo-500/10'
              : 'border-slate-700 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-950/70'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 mb-3">
            <UploadCloud className="h-6 w-6" />
          </div>

          <p className="text-sm font-semibold text-slate-200">
            Click to upload or drag & drop screenshots
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            PNG, JPG, WEBP up to 30MB each
          </p>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto rounded-xl bg-slate-950 p-2.5 border border-slate-800 space-y-1.5">
            {selectedFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-slate-300 px-2 py-1 bg-slate-900 rounded-lg">
                <span className="truncate max-w-[280px] flex items-center gap-1.5">
                  <FileImage className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                  <span className="truncate">{f.name}</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {(f.size / 1024).toFixed(0)} KB
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading || uploadSuccess}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {uploadSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Uploaded! Analyzing...</span>
              </>
            ) : isUploading ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Import {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
