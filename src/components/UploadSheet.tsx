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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      {/* Tap backdrop to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Slide-Up Drawer */}
      <div className="relative z-10 w-full rounded-t-3xl border-t border-slate-800 bg-slate-950 p-4 pb-safe sm:max-w-md sm:rounded-2xl sm:border sm:p-6">
        {/* Drag handle */}
        <div className="flex w-full justify-center pb-2 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-700" />
        </div>

        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h3 className="text-base font-bold text-white">Import Screenshots</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-slate-400 hover:text-white active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {uploadSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-2 animate-bounce" />
            <h4 className="text-sm font-bold text-white">Upload Complete</h4>
            <p className="mt-1 text-xs text-slate-400">
              Your screenshots are being analyzed and indexed.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Quick Mobile Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Native Camera Capture */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center active:scale-[0.98] hover:border-slate-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-white">Camera</span>
                  <span className="block text-[10px] text-slate-400">Snap screenshot</span>
                </div>
              </button>

              {/* Photo Library Picker */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-center active:scale-[0.98] hover:border-slate-700"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-white">Photos</span>
                  <span className="block text-[10px] text-slate-400">Browse library</span>
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
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Selected ({selectedFiles.length})</span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-red-400 hover:underline"
                  >
                    Clear all
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-xs border border-slate-800"
                    >
                      <span className="truncate max-w-[80%] text-slate-200">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="text-slate-400 hover:text-red-400"
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
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/30 active:scale-[0.98] disabled:opacity-60"
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
