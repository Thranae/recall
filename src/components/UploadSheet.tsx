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

  const MAX_UPLOAD_LIMIT = 50;

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > MAX_UPLOAD_LIMIT) {
        alert(`You can upload up to 50 screenshots at once. Selected the first 50 files.`);
        return combined.slice(0, MAX_UPLOAD_LIMIT);
      }
      return combined;
    });
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
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(err.message || 'Upload failed. Please ensure the files are valid images.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/35 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      {/* Dismiss backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Modal */}
      <div className="liquid-glass-container relative z-10 w-full rounded-t-[32px] p-6 pb-safe sm:max-w-md sm:rounded-[32px] sm:p-6 shadow-xl">
        {/* Drag Handle */}
        <div className="flex w-full justify-center pb-3 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        <div className="flex items-center justify-between border-b border-white/70 pb-3">
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">Add Screenshots</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-500 active:scale-90 transition-all cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[2]" />
          </button>
        </div>

        {uploadSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mb-2 animate-bounce stroke-[2.2]" />
            <h4 className="text-sm font-bold text-slate-800">Upload Complete</h4>
            <p className="mt-1 text-xs text-slate-500 font-normal">
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
                className="liquid-glass-card flex flex-col items-center justify-center gap-2 rounded-[20px] p-4 text-center cursor-pointer active:scale-95 transition-all"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] liquid-icon-pod text-slate-700">
                  <Camera className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-800">Camera</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5 font-normal">Take a photo</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="liquid-glass-card flex flex-col items-center justify-center gap-2 rounded-[20px] p-4 text-center cursor-pointer active:scale-95 transition-all"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[16px] liquid-icon-pod text-slate-700">
                  <ImageIcon className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-800">Photos</span>
                  <span className="block text-[11px] text-slate-400 mt-0.5 font-normal">Batch up to 50 files</span>
                </div>
              </button>
            </div>

            {/* Batch capacity indicator */}
            <div className="flex items-center justify-between px-1 text-[11px] text-[#4A5D78]">
              <span>Batch capacity: 50 screenshots / upload</span>
              <span className="font-mono font-bold text-[#3478F6]">{selectedFiles.length}/50</span>
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
                  <span className="font-bold text-slate-700">Selected ({selectedFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-rose-600 font-semibold active:opacity-70 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-[14px] bg-white/70 border border-white/90 backdrop-blur-md px-3 py-2 text-xs"
                    >
                      <span className="truncate max-w-[80%] text-slate-800 font-medium">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-slate-400 active:text-rose-600 active:scale-90 p-0.5 cursor-pointer"
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
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-full liquid-btn-primary font-bold text-white active:scale-[0.98] transition-all disabled:opacity-50 text-xs shadow-sm cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing Screenshots...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4 stroke-[2.2]" />
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
