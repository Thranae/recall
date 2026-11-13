import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Trophy,
  ShoppingBag,
  FileText,
  Layers,
  Clock,
  AlertCircle,
  RefreshCw,
  Check,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import type { Screenshot, SearchResultItem } from '../types';
import { api } from '../services/api';

interface ScreenshotCardProps {
  screenshot: Screenshot;
  searchResult?: SearchResultItem;
  onClick: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  isDeleting?: boolean;
  deleteCountdown?: number;
  onUndoDelete?: () => void;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}

export const ScreenshotCard: React.FC<ScreenshotCardProps> = ({
  screenshot,
  searchResult,
  onClick,
  isSelectionMode = false,
  isSelected = false,
  isDeleting = false,
  deleteCountdown,
  onUndoDelete,
  onToggleSelect,
  onLongPress,
}) => {
  const baseImageUrl = api.getImageUrl(screenshot.id);
  const [retryState, setRetryState] = useState<{ id: string; count: number }>({
    id: screenshot.id,
    count: 0,
  });
  const [failedId, setFailedId] = useState<string | null>(null);

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isLongPressRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(12);
        } catch {}
      }
      onLongPress?.();
    }, 360);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!longPressTimerRef.current) return;
    const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
    if (dist > 8) {
      clearLongPressTimer();
    }
  };

  const handlePointerUp = () => {
    clearLongPressTimer();
  };

  const handlePointerCancel = () => {
    clearLongPressTimer();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDeleting) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(15);
        } catch {}
      }
      onUndoDelete?.();
      return;
    }

    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (isSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(10);
        } catch {}
      }
      onToggleSelect?.();
    } else {
      onClick();
    }
  };

  const retryCount = retryState.id === screenshot.id ? retryState.count : 0;
  const imgFailed = failedId === screenshot.id;

  const imageUrl =
    retryCount > 0
      ? `${baseImageUrl}${baseImageUrl.includes('?') ? '&' : '?'}v=${retryCount}`
      : baseImageUrl;

  const handleImageError = () => {
    if (retryCount < 1) {
      setTimeout(() => {
        setRetryState((prev) => ({
          id: screenshot.id,
          count: (prev.id === screenshot.id ? prev.count : 0) + 1,
        }));
      }, 350);
    } else {
      setFailedId(screenshot.id);
    }
  };

  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'chat':
        return { label: 'Chat', icon: MessageSquare };
      case 'game':
        return { label: 'Game Stats', icon: Trophy };
      case 'product':
        return { label: 'Product', icon: ShoppingBag };
      case 'poster_document':
        return { label: 'Document', icon: FileText };
      default:
        return { label: 'Image', icon: Layers };
    }
  };

  const { label, icon: CatIcon } = getCategoryDetails(screenshot.category);
  const tags = screenshot.tags || [];

  return (
    <div
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={handleContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (isSelectionMode) {
            onToggleSelect?.();
          } else {
            onClick();
          }
        }
      }}
      className={`liquid-glass-card relative flex flex-col overflow-hidden rounded-[22px] select-none cursor-pointer transition-all duration-300 ${
        isDeleting
          ? 'scale-[0.96] ring-2 ring-rose-500/80 shadow-[0_0_24px_rgba(244,63,94,0.30)]'
          : isSelected
          ? 'ring-2 ring-[#3478F6] ring-offset-2 ring-offset-[#F3F7FC]'
          : 'active:scale-[0.98]'
      }`}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'pan-y',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Full Card Plump Liquid Glass Inner Stroke Overlay */}
      <div className="liquid-card-inner-stroke" />

      {/* Selected Card Soft Wash Tint */}
      {!isDeleting && isSelected && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-[#3478F6]/10 rounded-[22px]" />
      )}

      {/* 5-Second iPhone-style Aesthetic Deleting Countdown Overlay */}
      {isDeleting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="absolute inset-0 z-40 flex flex-col items-center justify-center p-3 text-center bg-slate-950/65 backdrop-blur-md rounded-[22px] select-none cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onUndoDelete?.();
          }}
        >
          {/* Apple Circular Countdown Progress Ring */}
          <div className="relative flex items-center justify-center w-14 h-14">
            <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 56 56">
              {/* Background Track Circle */}
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="rgba(255, 255, 255, 0.24)"
                strokeWidth="3.2"
              />
              {/* Animated Progress Arc */}
              <motion.circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="#F43F5E"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="138.23"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: 138.23 }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            </svg>
            {/* Center Seconds Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-extrabold text-white tracking-tight leading-none drop-shadow-sm font-mono">
                {deleteCountdown ?? 5}s
              </span>
            </div>
          </div>

          {/* Deleting Status Text */}
          <span className="text-[12px] font-bold text-white/95 mt-2 tracking-tight drop-shadow-sm">
            Deleting...
          </span>

          {/* Plump Liquid Frosted Undo Pill Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUndoDelete?.();
            }}
            className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-white bg-white/25 hover:bg-white/35 active:scale-95 transition-all cursor-pointer backdrop-blur-lg border border-white/50 shadow-md"
          >
            <RotateCcw className="h-3 w-3 stroke-[2.6]" />
            <span>Tap to Undo</span>
          </button>
        </motion.div>
      )}

      {/* Thumbnail Aspect Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100/50">
        {imgFailed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-3 text-center text-slate-400">
            <Layers className="h-5 w-5 text-slate-300" />
            <span className="text-[10px] font-medium">Preview unavailable</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFailedId(null);
                setRetryState((prev) => ({
                  id: screenshot.id,
                  count: (prev.id === screenshot.id ? prev.count : 0) + 1,
                }));
              }}
              className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[9.5px] font-semibold text-[#3478F6] border border-slate-200 cursor-pointer"
            >
              <RefreshCw className="h-2.5 w-2.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={screenshot.original_filename}
            loading="lazy"
            onError={handleImageError}
            draggable={false}
            className={`h-full w-full object-cover pointer-events-none select-none transition-all duration-300 ${
              isDeleting ? 'grayscale contrast-90 brightness-75 scale-95' : ''
            }`}
            style={{
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
              userSelect: 'none',
            }}
          />
        )}

        {/* Minimal Liquid Glass Inner Stroke on Image */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.60)',
            boxShadow:
              'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.85), inset 0 0 0 1px rgba(255, 255, 255, 0.30), inset 0 -1.5px 3px 0 rgba(23, 43, 77, 0.06)',
          }}
        />

        {/* Top Specular Hairline Highlight */}
        <div
          className="pointer-events-none absolute top-0 left-3 right-3 h-px z-20 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 25%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 75%, transparent 100%)',
          }}
        />

        {/* Selection Checkbox Badge */}
        {isSelectionMode && (
          <div
            className="absolute top-2.5 right-2.5 z-30 transition-transform duration-200 pointer-events-none"
            style={{ transform: isDeleting || isSelected ? 'scale(1.05)' : 'scale(1)' }}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200 shadow-md ${
                isDeleting
                  ? 'bg-rose-500 text-white ring-2 ring-white'
                  : isSelected
                  ? 'bg-[#3478F6] text-white ring-2 ring-white'
                  : 'bg-black/35 backdrop-blur-md border-[1.5px] border-white/90 text-transparent'
              }`}
            >
              {isDeleting ? (
                <Trash2 className="h-3.5 w-3.5 stroke-[2.4] text-white" />
              ) : (
                <Check
                  className={`h-3.5 w-3.5 stroke-[3] text-white transition-all duration-150 ${
                    isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
                  }`}
                />
              )}
            </div>
          </div>
        )}

        {/* Floating Liquid Glass Category Badge */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none z-10">
          <span className="liquid-category-badge shadow-xs">
            <CatIcon className="h-3 w-3 shrink-0 stroke-[2.2] text-[#3478F6]" />
            <span className="leading-none truncate text-[#172B4D]">{label}</span>
          </span>

          {!isSelectionMode && screenshot.processing_status !== 'ready' && (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full liquid-glass-badge p-0 shadow-xs text-amber-600"
            >
              {screenshot.processing_status === 'processing' ? (
                <Clock className="h-2.5 w-2.5 animate-spin stroke-[2.2]" />
              ) : screenshot.processing_status === 'queued' ? (
                <Clock className="h-2.5 w-2.5 stroke-[2.2]" />
              ) : (
                <AlertCircle className="h-2.5 w-2.5 text-rose-500 stroke-[2.2]" />
              )}
            </span>
          )}
        </div>

        {/* Search match percentage pill on thumbnail */}
        {searchResult && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className="liquid-category-badge px-2 py-0.5 font-mono text-[9.5px] font-bold text-[#3478F6] shadow-xs">
              {Math.round(searchResult.match_score * 100)}% match
            </span>
          </div>
        )}
      </div>

      {/* Card Info Details / Precise Answer Presentation */}
      {searchResult ? (
        <div className="p-3 bg-white/75 backdrop-blur-xs border-t border-white/80 space-y-1">
          {searchResult.precise_value ? (
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                {searchResult.precise_value.badge && (
                  <span className="liquid-category-badge px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#3478F6]">
                    {searchResult.precise_value.badge}
                  </span>
                )}
                <span className="text-[9.5px] font-semibold text-slate-400 capitalize">
                  {searchResult.match_type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[12.5px] font-bold text-[#172B4D] leading-snug line-clamp-2">
                {searchResult.precise_value.headline}
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-500 line-clamp-1 font-normal">
                {searchResult.precise_value.detail}
              </p>
              {searchResult.matched_tags && searchResult.matched_tags.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {searchResult.matched_tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-white/80 border border-blue-100/80 px-1.5 py-0.5 text-[9px] font-semibold text-[#3478F6]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[9.5px] font-bold text-[#3478F6] uppercase">
                  {searchResult.match_type.replace('_', ' ')}
                </span>
              </div>
              <p className="truncate text-[12.5px] font-bold text-[#172B4D]">
                {screenshot.original_filename}
              </p>
              <p className="text-[10.5px] text-slate-500 line-clamp-1 font-normal">
                {searchResult.match_explanation}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3">
          <p className="truncate text-[12.5px] font-bold text-[#172B4D] leading-snug">
            {screenshot.original_filename}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono">
              {new Date(screenshot.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {tags.length > 0 && (
              <span className="truncate max-w-[50%] font-semibold text-[#3478F6]">
                #{tags[0]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
