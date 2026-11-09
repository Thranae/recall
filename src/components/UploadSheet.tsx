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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45 backdrop-blur-md sm:items-center sm:justify-center sm:p-4">
      {/* Dismiss backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* iOS Modal Sheet with Plump Liquid Glass */}
      <div className="liquid-glass-container relative z-10 w-full rounded-t-[38px] p-6 pb-safe sm:max-w-md sm:rounded-[36px] sm:p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
        {/* iOS Drag Handle */}
        <div className="flex w-full justify-center pb-3 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between border-b border-white/70 pb-3.5">
          <h3 className="text-sm font-black text-slate-900 tracking-tight">Add Screenshots</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full liquid-glass-pill text-slate-700 active:scale-90 transition-all cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[2.4]" />
          </button>
        </div>

        {uploadSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mb-2 animate-bounce stroke-[2.4]" />
            <h4 className="text-base font-black text-slate-900">Upload Complete</h4>
            <p className="mt-1 text-xs text-slate-600 font-semibold">
              Your screenshots are being analyzed and indexed.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Capture Source Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="liquid-glass-card flex flex-col items-center justify-center gap-2.5 rounded-[24px] p-4 text-center cursor-pointer active:scale-95 transition-all"
              >
                <div className="flex h-13 w-13 items-center justify-center rounded-[20px] liquid-icon-pod text-[#2F6BFF]">
                  <Camera className="h-6 w-6 stroke-[2.4]" />
                </div>
                <div>
                  <span className="block text-xs font-black text-slate-900">Camera</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 font-bold">Take a photo</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="liquid-glass-card flex flex-col items-center justify-center gap-2.5 rounded-[24px] p-4 text-center cursor-pointer active:scale-95 transition-all"
              >
                <div className="flex h-13 w-13 items-center justify-center rounded-[20px] liquid-icon-pod text-purple-600">
                  <ImageIcon className="h-6 w-6 stroke-[2.4]" />
                </div>
                <div>
                  <span className="block text-xs font-black text-slate-900">Photos</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 font-bold">Choose from files</span>
                </div>
              </button>
            </div>

            {/* Hidden native file pickers */}
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

            {/* Selected Files List & Upload Action */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-black text-slate-900">Selected ({selectedFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-rose-600 font-extrabold hover:underline cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-[18px] bg-white/70 border border-white/85 backdrop-blur-md px-3.5 py-2.5 text-xs shadow-2xs"
                    >
                      <span className="truncate max-w-[80%] text-slate-900 font-black">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full liquid-btn-primary font-black text-white active:scale-[0.98] transition-all disabled:opacity-50 text-xs shadow-md cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing Screenshots...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4.5 w-4.5 stroke-[2.6]" />
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
