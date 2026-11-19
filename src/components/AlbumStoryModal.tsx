import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Play,
  Pause,
  ExternalLink,
  MessageSquare,
  Trophy,
  Receipt,
  Tag,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Screenshot } from '../types';
import { api } from '../services/api';

interface AlbumStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  albumEmoji?: string;
  accentColor?: string;
  screenshots: Screenshot[];
  initialIndex?: number;
  onOpenDetail?: (id: string) => void;
}

const SLIDE_DURATION_MS = 5000;

export const AlbumStoryModal: React.FC<AlbumStoryModalProps> = ({
  isOpen,
  onClose,
  title,
  albumEmoji = '🎬',
  accentColor = '#3478F6',
  screenshots,
  initialIndex = 0,
  onOpenDetail,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100 for current slide

  const touchStartYRef = useRef<number | null>(null);
  const touchDeltaYRef = useRef<number>(0);
  const isHoldingRef = useRef(false);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef<number>(0);

  // Sync initialIndex when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.min(Math.max(0, initialIndex), Math.max(0, screenshots.length - 1)));
      setProgress(0);
      setIsPaused(false);
      elapsedBeforePauseRef.current = 0;
      startTimeRef.current = null;
    }
  }, [isOpen, initialIndex, screenshots.length]);

  const currentScreenshot = screenshots[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < screenshots.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      startTimeRef.current = null;
    } else {
      // Completed all slides
      onClose();
    }
  }, [currentIndex, screenshots.length, onClose]);

  const handlePrev = useCallback(() => {
    if (progress > 20) {
      // If past 20%, restart current slide
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      startTimeRef.current = null;
    } else if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      elapsedBeforePauseRef.current = 0;
      startTimeRef.current = null;
    }
  }, [currentIndex, progress]);

  // Animation Loop for Progress Bar
  useEffect(() => {
    if (!isOpen || isPaused || screenshots.length === 0) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const start = performance.now() - elapsedBeforePauseRef.current;
    startTimeRef.current = start;

    const step = (now: number) => {
      const elapsed = now - start;
      elapsedBeforePauseRef.current = elapsed;
      const pct = Math.min(100, (elapsed / SLIDE_DURATION_MS) * 100);
      setProgress(pct);

      if (elapsed >= SLIDE_DURATION_MS) {
        handleNext();
      } else {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isPaused, currentIndex, screenshots.length, handleNext]);

  // Pause handling
  const startHold = () => {
    holdTimeoutRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      setIsPaused(true);
    }, 120);
  };

  const endHold = () => {
    if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setIsPaused(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || screenshots.length === 0 || !currentScreenshot) return null;

  // Extract contextual insights
  const isChat = currentScreenshot.category === 'chat';
  const isGame = currentScreenshot.category === 'game';
  const isReceipt =
    currentScreenshot.category === 'poster_document' ||
    Boolean(currentScreenshot.ocr_text && /total|invoice|receipt|usd|rs|inr|\$/i.test(currentScreenshot.ocr_text));

  const imageUrl = api.getImageUrl(currentScreenshot.id);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none overflow-hidden touch-none"
      onTouchStart={(e) => {
        touchStartYRef.current = e.touches[0].clientY;
        touchDeltaYRef.current = 0;
        startHold();
      }}
      onTouchMove={(e) => {
        if (touchStartYRef.current !== null) {
          touchDeltaYRef.current = e.touches[0].clientY - touchStartYRef.current;
        }
      }}
      onTouchEnd={() => {
        endHold();
        if (touchDeltaYRef.current > 90) {
          // Swipe down to dismiss
          onClose();
        }
        touchStartYRef.current = null;
        touchDeltaYRef.current = 0;
      }}
      onMouseDown={startHold}
      onMouseUp={endHold}
    >
      {/* Background Soft Ambient Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 filter blur-3xl transition-colors duration-700"
        style={{
          background: `radial-gradient(circle at center, ${accentColor} 0%, transparent 70%)`,
        }}
      />

      {/* Main Full-Height Story Container */}
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col justify-between overflow-hidden">
        {/* Top Header & Segmented Progress Bars */}
        <div className="relative z-30 pt-safe px-3.5 pb-2">
          {/* Segmented Progress Bars */}
          <div className="flex items-center gap-1.5 w-full pt-2 pb-2">
            {screenshots.map((s, idx) => {
              let fillPct = 0;
              if (idx < currentIndex) fillPct = 100;
              else if (idx === currentIndex) fillPct = progress;

              return (
                <div
                  key={s.id || idx}
                  className="flex-1 h-1 bg-white/25 rounded-full overflow-hidden cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                    setProgress(0);
                    elapsedBeforePauseRef.current = 0;
                  }}
                >
                  <div
                    className="h-full bg-white rounded-full transition-all duration-75"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              );
            })}
          </div>

          {/* Top Bar Info & Controls */}
          <div className="flex items-center justify-between mt-1 text-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0 p-1 bg-white/10 rounded-full backdrop-blur-md">
                {albumEmoji}
              </span>
              <div className="min-w-0">
                <h3 className="font-bold text-sm tracking-tight truncate drop-shadow-sm">
                  {title}
                </h3>
                <p className="text-[11px] text-white/70 font-mono">
                  {currentIndex + 1} of {screenshots.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isPaused && (
                <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-semibold text-amber-300 border border-amber-300/30">
                  Paused
                </span>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPaused((p) => !p);
                }}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-all active:scale-95"
                aria-label={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur-md transition-all active:scale-95"
                aria-label="Close Story"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Central Display & Tap Navigators */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
          {/* Subtle Ken Burns Scaled Image */}
          <div className="relative w-full h-full flex items-center justify-center p-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentScreenshot.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="relative w-full h-full flex items-center justify-center"
              >
                <img
                  src={imageUrl}
                  alt={currentScreenshot.original_filename}
                  className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl transition-transform ease-out"
                  style={{
                    transform: isPaused ? 'scale(1.02)' : `scale(${1 + (progress / 100) * 0.05})`,
                    transitionDuration: isPaused ? '300ms' : '100ms',
                  }}
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Left Tap Zone (Previous) */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
          />

          {/* Right Tap Zone (Next) */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2/3 z-20 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>

        {/* Bottom Liquid Glass HUD & Smart Insights */}
        <div className="relative z-30 px-3.5 pb-safe pb-4">
          <div className="p-3.5 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/20 text-white shadow-2xl space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !font-bold capitalize text-[#3478F6] shadow-sm">
                    {currentScreenshot.category || 'other'}
                  </span>
                  {currentScreenshot.created_at && (
                    <span className="flex items-center gap-1 text-[11px] text-white/70">
                      <Calendar className="h-3 w-3" />
                      {new Date(currentScreenshot.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
                <h4 className="mt-1 text-xs font-semibold truncate text-white/95">
                  {currentScreenshot.original_filename}
                </h4>
              </div>

              {onOpenDetail && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(currentScreenshot.id);
                  }}
                  className="liquid-filter-chip liquid-filter-chip-sm liquid-filter-chip-active !font-bold text-[#3478F6] hover:brightness-105 active:scale-95 transition-all shrink-0 cursor-pointer shadow-md"
                >
                  <span>Detail</span>
                  <ExternalLink className="h-3 w-3 stroke-[2.4]" />
                </button>
              )}
            </div>

            {/* Smart Contextual Highlight Pill */}
            {(isChat || isGame || isReceipt || (currentScreenshot.tags && currentScreenshot.tags.length > 0)) && (
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center gap-2 text-xs">
                {isChat && (
                  <>
                    <MessageSquare className="h-3.5 w-3.5 text-blue-300 shrink-0" />
                    <span className="truncate text-white/90">
                      {currentScreenshot.ocr_text
                        ? currentScreenshot.ocr_text.slice(0, 75).trim() + '...'
                        : 'Conversation thread memory'}
                    </span>
                  </>
                )}
                {isGame && (
                  <>
                    <Trophy className="h-3.5 w-3.5 text-amber-300 shrink-0" />
                    <span className="truncate text-white/90">
                      {currentScreenshot.ocr_text?.slice(0, 60) || 'Gaming victory highlight'}
                    </span>
                  </>
                )}
                {isReceipt && !isChat && !isGame && (
                  <>
                    <Receipt className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
                    <span className="truncate text-white/90">
                      {currentScreenshot.ocr_text?.slice(0, 60) || 'Financial record & receipt'}
                    </span>
                  </>
                )}
                {!isChat && !isGame && !isReceipt && currentScreenshot.tags && (
                  <>
                    <Tag className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
                    <span className="truncate text-white/90">
                      {currentScreenshot.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
