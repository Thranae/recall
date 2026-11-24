import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, Camera, Image as ImageIcon, Loader2, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import type { User } from '../types';

interface UploadSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  user?: User | null;
  currentScreenshotCount?: number;
  onOpenSubscription?: () => void;
}

export const UploadSheet: React.FC<UploadSheetProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  user,
  currentScreenshotCount = 0,
  onOpenSubscription,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const isPro = user?.subscription_tier === 'pro';
  const isVaultFull = !isPro && currentScreenshotCount >= 50;

  // Prevent background page from scrolling when upload sheet is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const MAX_UPLOAD_LIMIT = 50;

  const handleFilesAdded = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);
    const newFiles = Array.from(files).filter(
      (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|heic|heif|svg)$/i.test(f.name)
    );
    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > MAX_UPLOAD_LIMIT) {
        setErrorMessage('You can upload up to 50 screenshots at once. Selected the first 50 files.');
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
    setUploadProgress(0);
    setErrorMessage(null);
    try {
      await api.uploadScreenshots(selectedFiles, (percent) => {
        setUploadProgress(percent);
      });
      setUploadSuccess(true);
      setTimeout(() => {
        onUploadSuccess();
        onClose();
        setSelectedFiles([]);
        setUploadSuccess(false);
        setUploadProgress(0);
      }, 500);
    } catch (err: any) {
      console.error('Upload failed:', err);
      if (err?.code === 'UPGRADE_REQUIRED' || err?.message?.includes('limit reached')) {
        setIsLimitReached(true);
      }
      setErrorMessage(err.message || 'Upload failed. Please ensure the files are valid images.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/35 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4 touch-none overscroll-none">
      {/* Dismiss backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Modal */}
      <div className="liquid-glass-container relative z-10 w-full rounded-t-[32px] p-6 pb-safe sm:max-w-md sm:rounded-[32px] sm:p-6 shadow-xl touch-auto overscroll-contain">
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

        {/* Pro Upsell Alert if Vault Full or Limit Reached */}
        {(isVaultFull || isLimitReached) && (
          <div className="mt-3 rounded-[20px] bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 p-3.5 border border-amber-400/40 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-2xs">
                <Crown className="h-4 w-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-amber-950 truncate">Free Vault Limit (50/50)</p>
                <p className="text-[10.5px] text-amber-900/80 leading-tight">Upgrade to Recall Pro for unlimited storage</p>
              </div>
            </div>
            {onOpenSubscription && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubscription();
                }}
                className="shrink-0 rounded-full bg-gradient-to-r from-slate-900 to-[#172B4D] px-3 py-1.5 text-[11px] font-extrabold text-white shadow-xs active:scale-95 transition-transform cursor-pointer"
              >
                Upgrade
              </button>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {uploadSuccess ? (
            <motion.div
              key="success-container"
              initial={{ opacity: 0, scale: 0.94, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="relative mb-3 flex items-center justify-center">
                {/* Subtle soft ambient aura */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [0.8, 1.3, 1.2], opacity: [0, 0.35, 0.15] }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute h-20 w-20 rounded-full bg-emerald-400/25 blur-md pointer-events-none"
                />

                {/* Tactile Tick Button with subtle spring settling */}
                <motion.div
                  initial={{ scale: 0.82, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 280, mass: 0.7 }}
                  className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 border border-white/40 ring-4 ring-emerald-500/10"
                >
                  <svg
                    className="h-7 w-7 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.6}
                  >
                    <motion.path
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 0.12, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
              </div>

              <motion.h4
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="text-sm font-bold text-slate-800 tracking-tight"
              >
                Upload Complete
              </motion.h4>
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-1 text-xs text-slate-500 font-normal max-w-[240px]"
              >
                Screenshots saved. Recall is analyzing and indexing in the background.
              </motion.p>
            </motion.div>
          ) : isUploading ? (
            <motion.div
              key="uploading-progress-container"
              initial={{ opacity: 0, scale: 0.94, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center py-7 text-center"
            >
              {/* Circular Liquid Glass Progress Ring Pod */}
              <div className="relative mb-3 flex items-center justify-center">
                {/* Ambient Soft Glow */}
                <div className="absolute h-28 w-28 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />

                {/* Glass Pod Container */}
                <div
                  className="relative flex h-28 w-28 items-center justify-center rounded-full p-2"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 246, 255, 0.88) 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.95)',
                    boxShadow:
                      '0 12px 28px -4px rgba(23, 43, 77, 0.12), inset 0 2px 3px #FFFFFF, inset 0 -2px 3px rgba(52, 120, 246, 0.12)',
                  }}
                >
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="upload-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4A8CF7" />
                        <stop offset="50%" stopColor="#3478F6" />
                        <stop offset="100%" stopColor="#2060DC" />
                      </linearGradient>
                    </defs>

                    {/* Muted Track Circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(52, 120, 246, 0.14)"
                      strokeWidth="6"
                    />

                    {/* Active Progress Circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="url(#upload-progress-gradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={263.89}
                      strokeDashoffset={263.89 - (uploadProgress / 100) * 263.89}
                      style={{
                        transition: 'stroke-dashoffset 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    />
                  </svg>

                  {/* Percentage in Center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none">
                    <span className="text-xl font-black font-mono tracking-tight text-[#172B4D]">
                      {uploadProgress}%
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#3478F6]">
                      Uploading
                    </span>
                  </div>
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                Uploading {selectedFiles.length} Screenshot{selectedFiles.length > 1 ? 's' : ''}
              </h4>
              <p className="mt-1 text-xs text-slate-500 font-normal max-w-[240px]">
                {uploadProgress < 100
                  ? 'Transmitting encrypted visual files to Recall vault...'
                  : 'Finalizing cloud storage and starting AI indexing...'}
              </p>

              {/* Status Pill */}
              <div className="mt-3 liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3478F6] animate-pulse" />
                <span className="font-mono text-[10px] font-bold text-[#3478F6]">
                  {uploadProgress}% complete
                </span>
              </div>
            </motion.div>
          ) : (
            <div className="mt-4 space-y-4">
              {errorMessage && (
                <div className="rounded-[18px] bg-rose-50/90 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium flex items-center justify-between gap-2 shadow-2xs">
                  <span>{errorMessage}</span>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

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
                accept="image/*,.heic,.heif"
                capture="environment"
                onChange={(e) => handleFilesAdded(e.target.files)}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
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
                        <span>Uploading Screenshots...</span>
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
        </AnimatePresence>
      </div>
    </div>
  );
};
