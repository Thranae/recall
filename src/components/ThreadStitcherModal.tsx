import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Layers,
  MessageSquare,
  Loader2,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { ThreadGroup } from '../types';
import { api } from '../services/api';
import { downloadImageFile } from '../utils/fileDownload';

interface ThreadStitcherModalProps {
  isOpen: boolean;
  thread: ThreadGroup | null;
  onClose: () => void;
  onSelectScreenshot?: (id: string) => void;
}

export const ThreadStitcherModal: React.FC<ThreadStitcherModalProps> = ({
  isOpen,
  thread,
  onClose,
  onSelectScreenshot,
}) => {
  const [viewMode, setViewMode] = useState<'visual' | 'transcript'>('visual');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const reelContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !thread) return null;

  const handleExportStitched = async () => {
    if (!thread.screenshots.length || isExporting) return;
    setIsExporting(true);

    try {
      // 1. Load all screenshot images
      const loadedImages = await Promise.all(
        thread.screenshots.map((sc) => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image ${sc.id}`));
            img.src = api.getImageUrl(sc.id);
          });
        })
      );

      // 2. Measure dimensions for seamless vertical stitching
      const targetWidth = Math.max(...loadedImages.map((img) => img.naturalWidth || 800));
      let totalHeight = 0;
      const scaledHeights: number[] = [];

      for (const img of loadedImages) {
        const aspect = (img.naturalHeight || 1200) / (img.naturalWidth || 800);
        const h = Math.round(targetWidth * aspect);
        scaledHeights.push(h);
        totalHeight += h;
      }

      // Add 80px top header and 40px footer on stitched reel
      const headerH = 120;
      const footerH = 60;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = totalHeight + headerH + footerH;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not initialize canvas context');

      // Draw background
      ctx.fillStyle = '#0B1220';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Stitch Header
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(0, 0, canvas.width, headerH);
      ctx.fillStyle = '#3478F6';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('RECALL • STITCHED CONVERSATION', 40, 50);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '22px sans-serif';
      ctx.fillText(`${thread.title} · ${thread.screenshots.length} Screenshots Stitched`, 40, 90);

      // Draw images vertically
      let currentY = headerH;
      for (let i = 0; i < loadedImages.length; i++) {
        const img = loadedImages[i];
        const h = scaledHeights[i];
        ctx.drawImage(img, 0, currentY, targetWidth, h);

        // Draw subtle separator line between stitched parts
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

      // Draw Stitch Footer
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, currentY, canvas.width, footerH);
      ctx.fillStyle = '#64748B';
      ctx.font = '18px sans-serif';
      ctx.fillText(`Preserved securely in RECALL Vault · ${new Date().toLocaleDateString()}`, 40, currentY + 38);

      const dataUrl = canvas.toDataURL('image/png', 0.95);
      const cleanTitle = thread.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const filename = `stitched-thread-${cleanTitle}.png`;
      await downloadImageFile(dataUrl, filename);
    } catch (err) {
      console.error('Stitch reel export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyTranscript = () => {
    const lines: string[] = [];
    lines.push(`--- ${thread.title} ---`);
    for (const sc of thread.screenshots) {
      if (sc.ocr_text) {
        lines.push(`\n[${sc.original_filename}]:\n${sc.ocr_text}`);
      }
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  const scrollToPart = (index: number) => {
    const el = document.getElementById(`thread-part-${index}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-md sm:items-center sm:justify-center sm:p-4 touch-none overscroll-none">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="liquid-glass-container relative z-10 flex h-[94dvh] w-full flex-col rounded-t-[32px] sm:max-w-2xl sm:h-[88vh] sm:rounded-[32px] shadow-2xl overflow-hidden touch-auto overscroll-contain"
      >
        {/* Drag handle */}
        <div className="flex w-full justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/70 px-5 py-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#3478F6]/10 text-[#3478F6] shrink-0 shadow-2xs">
              <Layers className="h-4.5 w-4.5 stroke-[2.3]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#172B4D] truncate">
                  {thread.title}
                </h3>
                <span className="liquid-category-badge px-2 py-0.5 text-[9.5px] font-bold">
                  THREAD REEL
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {thread.screenshots.length} sequential screenshots stitched
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-full bg-white/70 p-1 border border-white/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === 'visual'
                    ? 'bg-[#3478F6] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Visual Reel
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
                Transcript
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-500 active:scale-90 transition-all cursor-pointer"
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div ref={reelContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {viewMode === 'visual' ? (
            <div className="relative mx-auto max-w-md">
              {/* Floating Quick Navigation Pills (Part Anchors) */}
              <div className="sticky top-2 z-20 flex justify-center mb-3">
                <div className="flex items-center gap-1.5 rounded-full bg-slate-900/80 backdrop-blur-md px-3 py-1.5 shadow-md border border-white/20">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mr-1">
                    Jump:
                  </span>
                  {thread.screenshots.map((sc, idx) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => scrollToPart(idx)}
                      className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-white/10 hover:bg-white/25 text-white transition-all active:scale-95 cursor-pointer"
                    >
                      Part {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Continuous Stitched Vertical Reel */}
              <div className="rounded-[28px] overflow-hidden border-2 border-white/90 shadow-xl bg-slate-950 divide-y divide-blue-500/30">
                {thread.screenshots.map((sc, idx) => (
                  <div
                    key={sc.id}
                    id={`thread-part-${idx}`}
                    className="relative group transition-opacity"
                  >
                    {/* Part overlay watermark badge */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[10.5px] font-bold text-white border border-white/20 shadow-xs pointer-events-none">
                      <Layers className="h-3 w-3 text-[#3478F6]" />
                      <span>Part {idx + 1} of {thread.screenshots.length}</span>
                    </div>

                    {/* Tap to open individual detail */}
                    <button
                      type="button"
                      onClick={() => onSelectScreenshot?.(sc.id)}
                      className="absolute top-3 right-3 z-10 rounded-full bg-white/80 hover:bg-white text-slate-800 px-2.5 py-1 text-[10.5px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer opacity-90 hover:opacity-100"
                    >
                      Open Detail
                    </button>

                    <img
                      src={api.getImageUrl(sc.id)}
                      alt={sc.original_filename}
                      loading="lazy"
                      className="w-full object-contain block"
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

              {thread.screenshots.map((sc, idx) => (
                <div
                  key={sc.id}
                  className="liquid-glass-card rounded-[20px] p-4 space-y-2 border border-white/80"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>Part {idx + 1}: {sc.original_filename}</span>
                    <span className="font-mono text-slate-400">{new Date(sc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap font-mono bg-white/50 p-3 rounded-[14px] border border-white/60">
                    {sc.ocr_text || 'No transcribed text detected'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-white/70 px-5 py-3.5 flex items-center justify-between gap-3 bg-white/60 backdrop-blur-md">
          <div className="text-xs font-bold text-slate-600">
            {thread.screenshots.length} Screenshots Combined
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportStitched}
              disabled={isExporting}
              className="flex h-10 items-center gap-2 rounded-full px-5 text-xs font-bold text-white liquid-btn-primary shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
        </div>
      </motion.div>
    </div>
  );
};
