import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Check,
  Clock,
  Loader2,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ClutterCandidate } from '../types';
import { api } from '../services/api';

interface ClutterSweeperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurged: () => void;
}

export const ClutterSweeperModal: React.FC<ClutterSweeperModalProps> = ({
  isOpen,
  onClose,
  onPurged,
}) => {
  const [candidates, setCandidates] = useState<ClutterCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [trashedIds, setTrashedIds] = useState<string[]>([]);
  const [keptIds, setKeptIds] = useState<string[]>([]);
  const [isPurging, setIsPurging] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setCurrentIndex(0);
    setTrashedIds([]);
    setKeptIds([]);
    setIsComplete(false);

    api
      .getClutterCandidates()
      .then((res) => {
        setCandidates(res.candidates || []);
      })
      .catch((err) => console.error('Failed to load clutter:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDecision = (decision: 'trash' | 'keep') => {
    if (currentIndex >= candidates.length) return;
    const current = candidates[currentIndex];

    if (decision === 'trash') {
      setTrashedIds((prev) => [...prev, current.screenshotId]);
    } else {
      setKeptIds((prev) => [...prev, current.screenshotId]);
    }

    if (currentIndex + 1 >= candidates.length) {
      setIsComplete(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePurge = async () => {
    if (trashedIds.length === 0 || isPurging) return;
    setIsPurging(true);
    try {
      await api.purgeClutter(trashedIds);
      onPurged();
      onClose();
    } catch (err) {
      console.error('Purge error:', err);
    } finally {
      setIsPurging(false);
    }
  };

  const currentItem = candidates[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-md sm:items-center sm:justify-center sm:p-4 touch-none overscroll-none">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="liquid-glass-container relative z-10 flex h-[92dvh] w-full flex-col rounded-t-[32px] sm:max-w-md sm:h-[84vh] sm:rounded-[32px] shadow-2xl overflow-hidden touch-auto overscroll-contain"
      >
        {/* Drag handle */}
        <div className="flex w-full justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/70 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 shrink-0 shadow-2xs">
              <Flame className="h-4.5 w-4.5 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#172B4D]">
                  Memory Sweeper
                </h3>
                <span className="liquid-category-badge px-2 py-0.5 text-[9.5px] font-bold text-rose-700">
                  SMART DECLUTTER
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Sweep away expired OTPs and past transient receipts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-500 active:scale-90 transition-all cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[2]" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
              <p className="text-xs font-bold text-slate-500">Finding temporary screenshots...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-xs">
                <Check className="h-7 w-7 stroke-[2.4]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Your vault is completely spotless!</h4>
                <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
                  No expired OTPs or past ticket clutter found. All screenshots in your vault have active utility.
                </p>
              </div>
            </div>
          ) : isComplete ? (
            <div className="space-y-4 text-center py-6">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-rose-50 text-rose-600 border border-rose-100 shadow-sm">
                <Trash2 className="h-7 w-7 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[#172B4D]">
                  Review Complete!
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  You marked <span className="font-bold text-rose-600">{trashedIds.length} items</span> for removal and kept <span className="font-bold text-emerald-600">{keptIds.length} items</span>.
                </p>
              </div>

              {trashedIds.length > 0 ? (
                <div className="pt-4 space-y-2">
                  <button
                    type="button"
                    onClick={handlePurge}
                    disabled={isPurging}
                    className="w-full h-11 rounded-full plump-liquid-rose-btn text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isPurging ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Permanently Purge {trashedIds.length} Screenshots</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentIndex(0);
                      setTrashedIds([]);
                      setKeptIds([]);
                      setIsComplete(false);
                    }}
                    className="w-full h-10 rounded-full liquid-glass-pill text-slate-600 text-xs font-bold active:scale-95 cursor-pointer"
                  >
                    Restart Review
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full h-11 rounded-full liquid-btn-primary text-white text-xs font-bold cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              {/* Progress counter */}
              <div className="flex items-center justify-between w-full px-2 text-xs font-bold text-slate-500">
                <span>Card {currentIndex + 1} of {candidates.length}</span>
                <span className="text-rose-600">{trashedIds.length} marked to trash</span>
              </div>

              {/* Swipeable Card Deck */}
              <div className="relative w-full max-w-sm h-80">
                <AnimatePresence mode="wait">
                  {currentItem && (
                    <motion.div
                      key={currentItem.id}
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="liquid-glass-card absolute inset-0 rounded-[28px] p-3 flex flex-col justify-between overflow-hidden border-2 border-white/90 shadow-xl bg-white/80"
                    >
                      {/* Reason Pill */}
                      <div className="flex items-center justify-between z-10">
                        <span className="rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-1 text-[10.5px] font-bold text-rose-700 flex items-center gap-1 shadow-2xs">
                          <Clock className="h-3 w-3" />
                          <span>{currentItem.reason}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {currentItem.ageDays}d old
                        </span>
                      </div>

                      {/* Image Preview */}
                      <div className="relative flex-1 my-2 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
                        <img
                          src={api.getImageUrl(currentItem.screenshotId)}
                          alt={currentItem.title}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Snippet Detail */}
                      <div className="px-1 text-center">
                        <h4 className="text-xs font-bold text-[#172B4D] truncate">
                          {currentItem.title}
                        </h4>
                        <p className="text-[10.5px] text-slate-400 truncate mt-0.5">
                          {currentItem.screenshot.original_filename}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tactile Decision Buttons */}
              <div className="flex items-center justify-center gap-4 w-full pt-2">
                <button
                  type="button"
                  onClick={() => handleDecision('trash')}
                  className="flex-1 h-12 rounded-full plump-liquid-rose-btn text-white text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4 stroke-[2.3]" />
                  <span>Trash</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDecision('keep')}
                  className="flex-1 h-12 rounded-full liquid-glass-pill border border-emerald-300 text-emerald-700 bg-emerald-50/70 text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 hover:bg-emerald-100"
                >
                  <Check className="h-4 w-4 stroke-[2.4]" />
                  <span>Keep</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
