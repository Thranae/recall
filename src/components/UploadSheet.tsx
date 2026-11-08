import React, { useState, useRef } from 'react';
import { X, UploadCloud, Camera, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

interface UploadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadSheet: React.FC<UploadSheetProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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
      }, 1000);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please ensure the files are valid images.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      {/* Tap backdrop to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Packwise Liquid Glass Drawer */}
      <div className="relative z-10 w-full rounded-t-[36px] ios-glass-card p-5 pb-safe sm:max-w-md sm:rounded-[32px] sm:p-6 shadow-[0_-16px_48px_rgba(15,23,42,0.15)]">
        {/* iOS Plump Drag handle */}
        <div className="flex w-full justify-center pb-2 sm:hidden relative z-10">
          <div className="h-1.5 w-11 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3.5 relative z-10">
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Import Screenshots</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ios-glass-pill text-slate-600 active:scale-90 active:bg-white active:text-slate-900 transition-transform"
          >
            <X className="h-4 w-4 shrink-0 stroke-[2.2]" />
          </button>
        </div>

        {uploadSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center relative z-10">
            <CheckCircle2 className="h-14 w-14 text-emerald-600 mb-2.5 animate-bounce shrink-0 stroke-[2.5]" />
            <h4 className="text-sm font-black text-slate-900">Upload Complete</h4>
            <p className="mt-1 text-xs text-slate-500 font-semibold">
              Your screenshots are being analyzed and indexed.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4 relative z-10">
            {/* Packwise Style Liquid Glass Capture Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Native Camera Capture */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 rounded-[24px] ios-glass-card p-4 text-center active:scale-[0.97] transition-transform"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] ios-glass-icon-pod text-[#2F6BFF] relative z-10">
                  <Camera className="h-5 w-5 shrink-0 stroke-[2.2]" />
                </div>
                <div className="relative z-10">
                  <span className="block text-xs font-black text-slate-900">Camera</span>
                  <span className="block text-[10px] text-slate-500 font-bold mt-0.5">Snap photo</span>
                </div>
              </button>

              {/* Photo Library Picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 rounded-[24px] ios-glass-card p-4 text-center active:scale-[0.97] transition-transform"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] ios-glass-icon-pod text-purple-600 relative z-10">
                  <ImageIcon className="h-5 w-5 shrink-0 stroke-[2.2]" />
                </div>
                <div className="relative z-10">
                  <span className="block text-xs font-black text-slate-900">Photos</span>
                  <span className="block text-[10px] text-slate-500 font-bold mt-0.5">Browse library</span>
                </div>
              </button>
            </div>

            {/* Hidden native inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handleFilesAdded(e.target.files)}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleFilesAdded(e.target.files)}
              className="hidden"
            />

            {/* Selected Images List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-black text-slate-800">Selected ({selectedFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-rose-600 font-bold active:underline"
                  >
                    Clear all
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-[18px] ios-glass-pill px-4 py-2.5 text-xs"
                    >
                      <span className="truncate max-w-[80%] text-slate-800 font-bold relative z-10">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-slate-400 active:text-rose-600 p-0.5 relative z-10"
                      >
                        <X className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full ios-liquid-primary font-black text-white active:scale-[0.98] transition-transform disabled:opacity-60 text-xs shadow-[0_8px_24px_rgba(47,107,255,0.4)]"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin shrink-0" />
                      <span>Indexing Screenshots...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4.5 w-4.5 shrink-0 stroke-[2.2] drop-shadow-xs" />
                      <span>Upload {selectedFiles.length} Screenshot{selectedFiles.length > 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
