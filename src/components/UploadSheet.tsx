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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md sm:items-center sm:justify-center sm:p-4">
      {/* Tap backdrop to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* iOS Liquid Glass Drawer */}
      <div className="relative z-10 w-full rounded-t-[32px] border-t border-white/20 bg-[#0d0f17]/90 backdrop-blur-3xl p-5 pb-safe shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_-12px_48px_rgba(0,0,0,0.7)] sm:max-w-md sm:rounded-[28px] sm:border sm:p-6">
        {/* iOS Drag handle */}
        <div className="flex w-full justify-center pb-2 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/25 shadow-sm" />
        </div>

        <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
          <h3 className="text-sm font-bold text-white tracking-tight">Import Screenshots</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white/60 active:scale-90 active:text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {uploadSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-2 animate-bounce" />
            <h4 className="text-sm font-bold text-white">Upload Complete</h4>
            <p className="mt-1 text-xs text-white/50">
              Your screenshots are being analyzed and indexed.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* iOS Liquid Glass Capture Cards */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Native Camera Capture */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/12 bg-white/[0.06] backdrop-blur-2xl p-4 text-center active:scale-[0.97] active:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-blue-500/20 border border-blue-400/30 text-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-white">Camera</span>
                  <span className="block text-[10px] text-white/40">Snap photo</span>
                </div>
              </button>

              {/* Photo Library Picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-[22px] border border-white/12 bg-white/[0.06] backdrop-blur-2xl p-4 text-center active:scale-[0.97] active:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-purple-500/20 border border-purple-400/30 text-purple-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-white">Photos</span>
                  <span className="block text-[10px] text-white/40">Browse library</span>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-white/50 px-1">
                  <span>Selected ({selectedFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-red-400 active:underline"
                  >
                    Clear all
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-[16px] bg-white/[0.06] backdrop-blur-xl px-3.5 py-2.5 text-xs border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                    >
                      <span className="truncate max-w-[80%] text-white/90">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-white/40 active:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 font-semibold text-white border border-white/25 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.45),0_6px_20px_rgba(0,122,255,0.4)] active:scale-[0.98] transition-transform disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Indexing Screenshots...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-5 w-5" />
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
