import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  Layers,
  MessageSquare,
  Loader2,
  Check,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ThreadGroup } from '../types';
import { api } from '../services/api';
import { downloadImageFile } from '../utils/fileDownload';

interface ThreadStitcherModalProps {
  isOpen: boolean;
  thread: ThreadGroup | null;
  initialIndex?: number;
  onClose: () => void;
  onSelectScreenshot?: (id: string) => void;
}

export const ThreadStitcherModal: React.FC<ThreadStitcherModalProps> = ({
  isOpen,
  thread,
  initialIndex = 0,
  onClose,
  onSelectScreenshot,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'transcript'>('visual');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [activePartIndex, setActivePartIndex] = useState(initialIndex);

  const reelContainerRef = useRef<HTMLDivElement>(null);
  const partPillsContainerRef = useRef<HTMLDivElement>(null);
  const lastThreadRef = useRef<ThreadGroup | null>(thread);
  const isClickScrollingRef = useRef(false);
  const clickScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (thread) {
    lastThreadRef.current = thread;
  }
  const activeThread = thread || lastThreadRef.current;

  // Auto-centers the active part pill within the horizontal strip
  const centerActivePill = useCallback((idx: number, smooth = true) => {
    const container = partPillsContainerRef.current;
    const btn = document.getElementById(`thread-part-pill-${idx}`);
    if (container && btn) {
      const targetLeft = btn.offsetLeft - container.clientWidth / 2 + btn.clientWidth / 2;
      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // Jumps to part cleanly within container without jittering or fighting scroll listeners
  const scrollToPart = useCallback((index: number) => {
    if (clickScrollTimerRef.current) clearTimeout(clickScrollTimerRef.current);
    isClickScrollingRef.current = true;
    setActivePartIndex(index);
    centerActivePill(index, true);

    const container = reelContainerRef.current;
    const target = document.getElementById(`thread-part-${index}`);
    if (container && target) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const currentScroll = container.scrollTop;
      const targetOffset = targetRect.top - containerRect.top + currentScroll - 64;
      container.scrollTo({
        top: Math.max(0, targetOffset),
        behavior: 'smooth',
      });
    }

    clickScrollTimerRef.current = setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 600);
  }, [centerActivePill]);

  // Center initial part pill on open or when initialIndex changes
  useEffect(() => {
    if (isOpen) {
      const startIndex = Math.min(Math.max(0, initialIndex), Math.max(0, (activeThread?.screenshots.length || 1) - 1));
      setActivePartIndex(startIndex);
      const timer = setTimeout(() => {
        centerActivePill(startIndex, false);
        if (startIndex > 0) {
          scrollToPart(startIndex);
        }
      }, 75);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeThread?.threadId, initialIndex, centerActivePill, scrollToPart]);

  // Real-time smooth scroll synchronization: highlights active part & auto-scrolls pill strip
  useEffect(() => {
    if (!isOpen || !activeThread || viewMode !== 'visual') return;
    const container = reelContainerRef.current;
    if (!container) return;

    let ticking = false;
    let lastIdx = 0;

    const onScroll = () => {
      // If user just tapped a number, ignore intermediate frames to prevent glitching/fighting
      if (isClickScrollingRef.current) return;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (isClickScrollingRef.current) {
            ticking = false;
            return;
          }

          const containerRect = container.getBoundingClientRect();
          let closestIdx = 0;
          let minDistance = Infinity;

          activeThread.screenshots.forEach((_, idx) => {
            const el = document.getElementById(`thread-part-${idx}`);
            if (!el) return;
            const rect = el.getBoundingClientRect();
            // Distance from container top + sticky bar clearance
            const dist = Math.abs(rect.top - containerRect.top - 68);
            if (dist < minDistance) {
              minDistance = dist;
              closestIdx = idx;
            }
          });

          if (closestIdx !== lastIdx) {
            lastIdx = closestIdx;
            setActivePartIndex(closestIdx);
            centerActivePill(closestIdx, true);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [isOpen, activeThread, viewMode, centerActivePill]);

  const handleExportStitched = async () => {
    if (!activeThread?.screenshots.length || isExporting) return;
    setIsExporting(true);

    try {
      const loadedImages = await Promise.all(
        activeThread.screenshots.map((sc) => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image ${sc.id}`));
            img.src = api.getImageUrl(sc.id);
          });
        })
      );

      const targetWidth = Math.max(...loadedImages.map((img) => img.naturalWidth || 800));
      let totalHeight = 0;
      const scaledHeights: number[] = [];

      for (const img of loadedImages) {
        const aspect = (img.naturalHeight || 1200) / (img.naturalWidth || 800);
        const h = Math.round(targetWidth * aspect);
        scaledHeights.push(h);
        totalHeight += h;
      }

      const headerH = 120;
      const footerH = 60;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = totalHeight + headerH + footerH;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      ctx.fillStyle = '#0B1220';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, canvas.width, headerH);
      ctx.fillStyle = '#3478F6';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('RECALL • STITCHED CONVERSATION', 40, 50);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '22px sans-serif';
      ctx.fillText(
        `${activeThread.title} · ${activeThread.screenshots.length} Screenshots Stitched`,
        40,
        90
      );

      let currentY = headerH;
      for (let i = 0; i < loadedImages.length; i++) {
        const img = loadedImages[i];
        const h = scaledHeights[i];
        ctx.drawImage(img, 0, currentY, targetWidth, h);

        if (i < loadedImages.length - 1) {
          ctx.strokeStyle = 'rgba(52, 120, 246, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, currentY + h);
          ctx.lineTo(targetWidth, currentY + h);
          ctx.stroke();
        }

        currentY += h;
      }

      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, currentY, canvas.width, footerH);
      ctx.fillStyle = '#64748B';
      ctx.font = '18px sans-serif';
      ctx.fillText(
        `Preserved securely in RECALL Vault · ${new Date().toLocaleDateString()}`,
        40,
        currentY + 38
      );

      const dataUrl = canvas.toDataURL('image/png', 0.95);
      const cleanTitle = activeThread.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `stitched-thread-${cleanTitle}.png`;
      await downloadImageFile(dataUrl, filename);
    } catch (err) {
      console.error('Stitch reel export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyTranscript = () => {
    if (!activeThread) return;
    const lines: string[] = [];
    lines.push(`--- ${activeThread.title} ---`);
    for (const sc of activeThread.screenshots) {
      if (sc.ocr_text) {
        lines.push(`\n[${sc.original_filename}]:\n${sc.ocr_text}`);
      }
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && activeThread && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-black/60 backdrop-blur-xs sm:items-center sm:justify-center sm:p-4 touch-none overscroll-none">
          {/* Backdrop dismissal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="liquid-glass-container relative z-10 flex h-full sm:h-[88vh] w-full flex-col rounded-t-[32px] sm:max-w-2xl sm:rounded-[32px] shadow-2xl overflow-hidden touch-auto overscroll-contain bg-[#F3F7FC]"
          >
            {/* Specular Top Hairline */}
            <div
              className="absolute top-0 inset-x-0 h-px pointer-events-none z-30"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 30%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 70%, transparent 100%)',
              }}
            />

            {/* 1. Header Bar: Full Safe-Area Padding & Symmetrical Justification */}
            <header
              className="relative z-20 flex items-center justify-between border-b border-white/80 px-4 sm:px-5 py-2.5 bg-white/85 backdrop-blur-xl shrink-0 shadow-2xs"
              style={{
                paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
              }}
            >
              {/* Left Title & Status Badge */}
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Back to library"
                  className="flex h-8.5 w-8.5 items-center justify-center rounded-full liquid-glass-pill text-slate-700 active:scale-90 transition-all cursor-pointer shadow-2xs shrink-0"
                >
                  <ArrowLeft className="h-4.5 w-4.5 stroke-[2.3]" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-[14px] font-bold text-[#172B4D] truncate leading-tight">
                      {activeThread.title}
                    </h3>
                    <span className="liquid-filter-chip liquid-filter-chip-sm liquid-filter-chip-active !font-bold text-[#3478F6] shrink-0 gap-1.5 shadow-sm">
                      <Layers className="h-3 w-3 text-[#3478F6] stroke-[2.4]" />
                      <span>Thread</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate pt-0.5">
                    {activeThread.screenshots.length} connected conversation screenshots
                  </p>
                </div>
              </div>

              {/* Right View Mode Toggle & Close Button */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center rounded-full bg-white/80 p-0.5 border border-white/90 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('visual')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      viewMode === 'visual'
                        ? 'bg-[#3478F6] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Reel
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('transcript')}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                      viewMode === 'transcript'
                        ? 'bg-[#3478F6] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Text
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close thread viewer"
                  className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-600 active:scale-90 transition-all cursor-pointer shadow-2xs"
                >
                  <X className="h-4 w-4 stroke-[2.2]" />
                </button>
              </div>
            </header>

            {/* 2. Scrollable Body Content */}
            <div ref={reelContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 overscroll-contain">
              {viewMode === 'visual' ? (
                <div className="relative mx-auto max-w-md">
                  {/* Sticky Plump Liquid Glass Part Navigator (True iOS 27 Fluid Aesthetic) */}
                  <div className="sticky top-0 z-20 pb-3 pt-1 pointer-events-none flex justify-center">
                    <div
                      className="pointer-events-auto relative flex items-center rounded-full px-2 py-1.5 shadow-xl max-w-[94%] xs:max-w-md transition-all duration-300"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(246, 250, 255, 0.85) 50%, rgba(230, 242, 255, 0.80) 100%)',
                        backdropFilter: 'blur(30px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
                        border: '1.5px solid rgba(255, 255, 255, 0.95)',
                        borderTopColor: '#FFFFFF',
                        borderBottomColor: 'rgba(52, 120, 246, 0.25)',
                        boxShadow:
                          '0 10px 28px -4px rgba(23, 43, 77, 0.12), 0 3px 10px rgba(52, 120, 246, 0.08), inset 0 1.5px 2px #FFFFFF, inset 0 -1.5px 2px rgba(52, 120, 246, 0.12)',
                      }}
                    >
                      {/* Plump Specular Top Arc */}
                      <div
                        className="absolute top-0 inset-x-5 h-[1px] rounded-full pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,1) 30%, rgba(255,255,255,1) 70%, transparent 100%)',
                        }}
                      />

                      {/* Left Part Pill Indicator */}
                      <div className="flex items-center gap-1.5 pl-1.5 pr-2 shrink-0 border-r border-blue-200/50">
                        <span className="text-[10px] font-black text-[#3478F6] tracking-wider uppercase">
                          Viewing
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#172B4D] bg-white/85 border border-white/90 px-2 py-0.5 rounded-full shadow-2xs">
                          Part {activePartIndex + 1}
                        </span>
                      </div>

                      {/* Horizontally Auto-Scrolling Number Buttons */}
                      <div
                        ref={partPillsContainerRef}
                        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth max-w-[210px] xs:max-w-[260px] sm:max-w-[320px] py-0.5 px-2"
                        style={{
                          maskImage:
                            activeThread.screenshots.length > 5
                              ? 'linear-gradient(to right, transparent 0%, black 14px, black calc(100% - 14px), transparent 100%)'
                              : undefined,
                          WebkitMaskImage:
                            activeThread.screenshots.length > 5
                              ? 'linear-gradient(to right, transparent 0%, black 14px, black calc(100% - 14px), transparent 100%)'
                              : undefined,
                        }}
                      >
                        {activeThread.screenshots.map((sc, idx) => {
                          const isActive = activePartIndex === idx;
                          return (
                            <button
                              key={sc.id}
                              id={`thread-part-pill-${idx}`}
                              type="button"
                              onClick={() => scrollToPart(idx)}
                              className={`min-w-[29px] h-7 px-2 inline-flex items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer active:scale-90 shrink-0 ${
                                isActive
                                  ? 'bg-gradient-to-b from-[#4A8CF7] via-[#3478F6] to-[#2060DC] text-white shadow-md shadow-blue-500/25 font-black scale-105 border border-white/60'
                                  : 'text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white border border-white/90 shadow-2xs'
                              }`}
                            >
                              <span>{idx + 1}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Vertical Seamless Stitched Cards */}
                  <div className="rounded-[28px] overflow-hidden border border-white/90 shadow-xl bg-slate-950 space-y-0">
                    {activeThread.screenshots.map((sc, idx) => (
                      <div
                        key={sc.id}
                        id={`thread-part-${idx}`}
                        className="relative min-h-[380px] bg-slate-950 flex flex-col justify-center"
                      >
                        {/* Connected Seam Indicator Between Stitched Parts */}
                        {idx > 0 && (
                          <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-center -translate-y-1/2 pointer-events-none">
                            <div className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active shadow-md !font-bold text-[#3478F6]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3478F6] animate-pulse" />
                              <span>Connected Thread</span>
                            </div>
                          </div>
                        )}

                        {/* Top Overlay Badges: Left Part Number, Right Detail Launcher */}
                        <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between pointer-events-none">
                          <div className="liquid-filter-chip liquid-filter-chip-sm liquid-filter-chip-active shadow-md pointer-events-none gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-[#3478F6] stroke-[2.3] shrink-0" />
                            <span className="text-[11px] font-bold text-[#3478F6]">
                              Part {idx + 1}
                            </span>
                          </div>

                          {onSelectScreenshot && (
                            <button
                              type="button"
                              onClick={() => onSelectScreenshot(sc.id)}
                              className="liquid-filter-chip liquid-filter-chip-sm liquid-filter-chip-active shadow-md active:scale-95 transition-transform cursor-pointer hover:brightness-105 pointer-events-auto"
                              title="Open full screenshot details"
                            >
                              <span className="text-[11px] font-bold text-[#3478F6]">Detail</span>
                              <ExternalLink className="h-3 w-3 text-[#3478F6] stroke-[2.4]" />
                            </button>
                          )}
                        </div>

                        {/* Screenshot Visual Image (Eager & Async Decoded to prevent layout glitches) */}
                        <img
                          src={api.getImageUrl(sc.id)}
                          alt={sc.original_filename}
                          decoding="async"
                          className="w-full h-auto object-contain block select-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-md space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700">Unified Thread Transcript</span>
                    <button
                      type="button"
                      onClick={handleCopyTranscript}
                      className="flex items-center gap-1 rounded-full liquid-glass-pill px-3 py-1 text-xs font-bold text-[#3478F6] active:scale-95 cursor-pointer shadow-2xs"
                    >
                      {copiedTranscript ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <MessageSquare className="h-3.5 w-3.5" />}
                      <span>{copiedTranscript ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>

                  {activeThread.screenshots.map((sc, idx) => (
                    <div
                      key={sc.id}
                      className="liquid-glass-card rounded-[22px] p-4 space-y-2 border border-white/90 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>Part {idx + 1}: {sc.original_filename}</span>
                        <span className="font-mono text-slate-400">
                          {new Date(sc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap font-mono bg-white/60 p-3 rounded-[16px] border border-white/70">
                        {sc.ocr_text || 'No transcribed text detected'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Footer Bar: Plump Glass Actions & Safe Area Padding */}
            <footer
              className="border-t border-white/80 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 bg-white/85 backdrop-blur-xl shrink-0"
              style={{
                paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <div className="text-xs font-bold text-slate-600 min-w-0 truncate">
                {activeThread.screenshots.length} Screenshots Combined
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportStitched}
                  disabled={isExporting}
                  className="flex h-9.5 items-center gap-2 rounded-full px-4 text-xs font-bold text-white liquid-btn-primary shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Stitching Reel...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 stroke-[2.3]" />
                      <span>Export Stitched Reel</span>
                    </>
                  )}
                </button>
              </div>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
