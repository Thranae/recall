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

      {/* iOS Light Liquid Glass Drawer */}
      <div className="relative z-10 w-full rounded-t-[36px] bg-white/95 backdrop-blur-3xl border-t border-black/[0.08] shadow-[0_-12px_48px_rgba(0,0,0,0.15)] p-5 pb-safe sm:max-w-md sm:rounded-[32px] sm:p-6 sm:border">
        {/* iOS Plump Drag handle */}
        <div className="flex w-full justify-center pb-2 sm:hidden">
          <div className="h-1.5 w-11 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between border-b border-black/[0.06] pb-3.5">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Import Screenshots</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-slate-600 active:scale-90 active:bg-slate-200 active:text-slate-900 transition-transform"
          >
            <X className="h-4 w-4 shrink-0 stroke-[2.2]" />
          </button>
        </div>

        {uploadSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-600 mb-2.5 animate-bounce shrink-0 stroke-[2.5]" />
            <h4 className="text-sm font-bold text-slate-900">Upload Complete</h4>
            <p className="mt-1 text-xs text-slate-500 font-medium">
              Your screenshots are being analyzed and indexed.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* iOS Light Liquid Glass Capture Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Native Camera Capture */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 rounded-[24px] border border-slate-200/90 bg-white/90 p-4 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.97] transition-transform"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-blue-50 border border-blue-200/80 text-blue-600 shadow-2xs">
                  <Camera className="h-5 w-5 shrink-0 stroke-[2.2]" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">Camera</span>
                  <span className="block text-[10px] text-slate-500 font-medium mt-0.5">Snap photo</span>
                </div>
              </button>

              {/* Photo Library Picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2.5 rounded-[24px] border border-slate-200/90 bg-white/90 p-4 text-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] active:scale-[0.97] transition-transform"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-purple-50 border border-purple-200/80 text-purple-600 shadow-2xs">
                  <ImageIcon className="h-5 w-5 shrink-0 stroke-[2.2]" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-900">Photos</span>
                  <span className="block text-[10px] text-slate-500 font-medium mt-0.5">Browse library</span>
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
                  <span className="font-bold text-slate-800">Selected ({selectedFiles.length})</span>
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
                      className="flex items-center justify-between rounded-[18px] bg-slate-50 border border-slate-200/80 px-4 py-2.5 text-xs shadow-2xs"
                    >
                      <span className="truncate max-w-[80%] text-slate-800 font-medium">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-slate-400 active:text-rose-600 p-0.5"
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
                  className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full ios-plump-primary font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-60 text-xs shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),0_4px_16px_rgba(37,99,235,0.35)]"
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
