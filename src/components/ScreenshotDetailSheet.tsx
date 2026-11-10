import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Calendar,
  Tag,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  Trophy,
  Maximize2,
  Sparkles,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import type { Screenshot, ExtractedMessage, GameResult, SearchResultItem } from '../types';

type ScreenshotDetailData = {
  screenshot: Screenshot;
  messages: ExtractedMessage[];
  game_result: GameResult | null;
};

interface ScreenshotDetailSheetProps {
  screenshotId: string | null;
  searchResult?: SearchResultItem;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export const ScreenshotDetailSheet: React.FC<ScreenshotDetailSheetProps> = ({
  screenshotId,
  searchResult,
  onClose,
  onDeleted,
  onUpdated,
}) => {
  const [data, setData] = useState<ScreenshotDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'ocr' | 'info'>('content');
  const [copiedOcr, setCopiedOcr] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load screenshot details
  const fetchDetails = (id: string, isInitial = false) => {
    if (isInitial) setLoading(true);
    api
      .getScreenshotDetails(id)
      .then((res: ScreenshotDetailData) => {
        setData(res);
        if (isInitial) {
          if (res.screenshot.visual_description || (res.messages && res.messages.length > 0) || res.game_result) {
            setActiveTab('content');
          } else if (res.screenshot.ocr_text) {
            setActiveTab('ocr');
          } else {
            setActiveTab('info');
          }
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load screenshot details:', err);
      })
      .finally(() => {
        if (isInitial) setLoading(false);
      });
  };

  useEffect(() => {
    if (!screenshotId) {
      setData(null);
      return;
    }

    fetchDetails(screenshotId, true);
  }, [screenshotId]);

  // Auto-poll if screenshot is still in processing state
  useEffect(() => {
    if (!screenshotId || !data) return;

    if (data.screenshot.processing_status === 'processing') {
      pollIntervalRef.current = setInterval(() => {
        api.getScreenshotDetails(screenshotId).then((res) => {
          if (res.screenshot.processing_status !== 'processing') {
            setData(res);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            onUpdated();
          }
        }).catch(() => {});
      }, 1500);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [screenshotId, data?.screenshot.processing_status]);

  // Prevent background page from scrolling when detail sheet is open
  useEffect(() => {
    if (!screenshotId) return;

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
  }, [screenshotId]);

  if (!screenshotId) return null;

  const imageUrl = api.getImageUrl(screenshotId);

  const handleCopyOcr = () => {
    if (!data?.screenshot.ocr_text) return;
    navigator.clipboard.writeText(data.screenshot.ocr_text);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 2000);
  };

  const handleReanalyze = async () => {
    if (!screenshotId || isReanalyzing) return;
    setIsReanalyzing(true);
    try {
      const res = await api.reanalyze(screenshotId);
      setData({
        screenshot: res.screenshot,
        messages: res.messages || [],
        game_result: res.game_result || null,
      });
      setActiveTab('content');
      onUpdated();
    } catch (err) {
      console.error('Re-analysis failed:', err);
      alert('Failed to re-analyze screenshot with AI');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this screenshot?')) return;
    setIsDeleting(true);
    try {
      await api.deleteScreenshot(screenshotId);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete screenshot');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCategoryChange = async (newCat: string) => {
    if (!data) return;
    try {
      await api.updateMetadata(screenshotId, { category: newCat });
      setData({
        ...data,
        screenshot: { ...data.screenshot, category: newCat as Screenshot['category'] },
      });
      onUpdated();
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const ocrWordsCount = (data?.screenshot.ocr_text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4 touch-none overscroll-none">
      {/* Dismiss backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Modal with Plump Liquid Glass */}
      <div className="liquid-glass-container relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-[32px] pb-safe sm:max-h-[88vh] sm:max-w-lg sm:rounded-[32px] shadow-2xl touch-auto overscroll-contain">
        {/* Drag Handle */}
        <div className="flex w-full justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/70 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-slate-800">
              Details
            </span>
            {data?.screenshot.category && (
              <span className="liquid-category-badge px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider">
                {data.screenshot.category.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Re-Analyze with AI Button */}
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={isReanalyzing || loading}
              title="Re-analyze image with Gemini Vision AI"
              aria-label="Re-analyze image with Gemini Vision AI"
              className="flex h-8 items-center gap-1.5 rounded-full liquid-glass-pill px-2.5 text-[11px] font-semibold text-[#3478F6] active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <Sparkles className={`h-3.5 w-3.5 text-[#3478F6] ${isReanalyzing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isReanalyzing ? 'Analyzing...' : 'Re-Analyze'}</span>
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete screenshot"
              aria-label="Delete screenshot"
              className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-500 active:text-rose-600 active:scale-90 transition-all cursor-pointer"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" /> : <Trash2 className="h-3.5 w-3.5 stroke-[2]" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-500 active:scale-90 transition-all cursor-pointer"
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          {/* Image Preview with Plump Liquid Glass Frame */}
          <div className="relative overflow-hidden rounded-[22px] border border-white/90 bg-slate-100/60 shadow-sm">
            <img
              src={imageUrl}
              alt="Screenshot Preview"
              className={`w-full object-contain transition-all duration-200 ${
                isImageExpanded ? 'max-h-[70vh]' : 'max-h-56'
              }`}
            />

            {/* Plump Liquid Glass Inner Stroke Overlay */}
            <div className="liquid-card-inner-stroke" />

            {/* Top Specular Hairline Highlight */}
            <div
              className="pointer-events-none absolute top-0 left-6 right-6 h-px z-20 rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 25%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 75%, transparent 100%)',
              }}
            />

            <button
              type="button"
              onClick={() => setIsImageExpanded(!isImageExpanded)}
              className="absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-full liquid-category-badge px-2.5 py-0.5 text-[9.5px] font-bold text-[#172B4D] active:scale-95 cursor-pointer shadow-xs"
            >
              <Maximize2 className="h-3 w-3 text-[#3478F6] stroke-[2.2]" />
              <span>{isImageExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>

          {/* AI Processing Status Indicator Banner */}
          {data?.screenshot.processing_status === 'processing' && (
            <div className="rounded-[18px] border border-blue-200/80 bg-blue-50/70 backdrop-blur-md p-3 flex items-center gap-2.5 text-xs text-blue-900 animate-pulse shadow-2xs">
              <Sparkles className="h-4 w-4 text-[#3478F6] animate-spin shrink-0" />
              <div className="flex-1">
                <span className="font-bold block">AI Multimodal Vision is analyzing this image...</span>
                <span className="text-[11px] text-blue-700">Extracting visual scene, text, and entities in real time.</span>
              </div>
            </div>
          )}

          {/* Search Result Explanation Banner if present */}
          {searchResult?.match_explanation && (
            <div className="rounded-[18px] border border-blue-200/70 bg-blue-50/60 backdrop-blur-md p-3.5 text-xs text-[#172B4D] shadow-2xs">
              <span className="font-bold block mb-0.5 text-[#3478F6]">Match Explanation</span>
              <p className="leading-relaxed font-normal">{searchResult.match_explanation}</p>
            </div>
          )}

          {/* Symmetrical Liquid Glass Filter Tabs Grid */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`liquid-filter-chip w-full flex items-center justify-center ${activeTab === 'content' ? 'liquid-filter-chip-active' : ''}`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`liquid-filter-chip w-full flex items-center justify-center ${activeTab === 'ocr' ? 'liquid-filter-chip-active' : ''}`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`liquid-filter-chip w-full flex items-center justify-center ${activeTab === 'info' ? 'liquid-filter-chip-active' : ''}`}
            >
              Info
            </button>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : (
            <div>
              {/* ========================================================= */}
              {/* TAB 1: VISUAL CONTENT & UNDERSTANDING                     */}
              {/* ========================================================= */}
              {activeTab === 'content' && (
                <div className="space-y-3">
                  {/* AI Visual Analysis Card (Always displayed for high-precision understanding) */}
                  <div className="rounded-[20px] liquid-glass-card p-4 space-y-2.5 shadow-xs border border-white/90">
                    <div className="flex items-center justify-between text-xs text-slate-800 font-bold px-0.5">
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#3478F6] stroke-[2]" />
                        <span>AI Visual Description</span>
                      </div>
                      <span className="liquid-category-badge px-2 py-0.5 text-[9px] font-bold text-[#3478F6]">
                        Multimodal Vision
                      </span>
                    </div>

                    <div className="rounded-[16px] bg-white/70 border border-white/80 p-3 text-xs text-slate-700 leading-relaxed font-normal shadow-2xs">
                      {data?.screenshot.visual_description ? (
                        <p>{data.screenshot.visual_description}</p>
                      ) : (
                        <p className="text-slate-400 italic">
                          Visual description will appear as soon as AI analysis is completed. Click "Re-Analyze" above to analyze now.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Chat Conversation Thread (if chat) */}
                  {data?.messages && data.messages.length > 0 && (
                    <div className="rounded-[20px] liquid-glass-card p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-slate-700 font-bold px-0.5">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-[#3478F6] stroke-[2]" />
                          <span>Conversation Flow ({data.messages.length})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Ordered</span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {data.messages.map((msg: ExtractedMessage) => {
                          const isRight = msg.sender_side === 'right';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1 mb-0.5 px-1">
                                <span className="font-mono text-[9px] text-slate-400">#{msg.sequence_number}</span>
                                <span className="text-[10px] font-semibold text-slate-600">
                                  {msg.sender_label || (isRight ? 'You' : 'Sender')}
                                </span>
                              </div>
                              <div
                                className={`max-w-[85%] px-3.5 py-2 text-xs font-medium leading-relaxed rounded-[16px] ${
                                  isRight
                                    ? 'liquid-btn-primary text-white rounded-tr-xs shadow-xs'
                                    : 'bg-white/80 border border-white text-slate-800 rounded-tl-xs shadow-2xs'
                                }`}
                              >
                                {msg.message_text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gaming Stats Dashboard (if game) */}
                  {data?.game_result && (
                    <div className="rounded-[20px] border border-amber-200/80 bg-amber-50/60 backdrop-blur-md p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900 px-0.5">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-4 w-4 text-amber-700 stroke-[2]" />
                          <span>{data.game_result.game_name || 'Match Stats'}</span>
                        </div>
                        {data.game_result.rank && (
                          <span className="rounded-full bg-amber-200/70 border border-amber-300 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-900">
                            Rank #{data.game_result.rank}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                        <div className="rounded-[14px] bg-white/80 p-2.5 border border-amber-200/50 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-400 font-bold">Kills</p>
                          <p className="mt-0.5 font-mono text-xl font-bold text-amber-700">
                            {data.game_result.kills ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[14px] bg-white/80 p-2.5 border border-amber-200/50 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-400 font-bold">Damage</p>
                          <p className="mt-0.5 font-mono text-lg font-bold text-slate-800">
                            {data.game_result.damage ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[14px] bg-white/80 p-2.5 border border-amber-200/50 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-400 font-bold">Map</p>
                          <p className="mt-0.5 text-xs text-slate-800 truncate font-semibold">
                            {data.game_result.map_name || 'Standard'}
                          </p>
                        </div>
                        <div className="rounded-[14px] bg-white/80 p-2.5 border border-amber-200/50 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-400 font-bold">Mode</p>
                          <p className="mt-0.5 text-xs text-slate-800 truncate font-semibold">
                            {data.game_result.mode || 'Classic'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Extracted Semantic Entities / Tags */}
                  {data?.screenshot.tags && data.screenshot.tags.length > 0 && (
                    <div className="rounded-[18px] liquid-glass-card p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 px-0.5">
                        <Tag className="h-3.5 w-3.5 text-[#3478F6]" />
                        <span>Key Entities & Topics</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.screenshot.tags.map((tag: string, idx: number) => (
                          <span
                            key={idx}
                            className="rounded-full bg-white/80 border border-white px-2.5 py-0.5 text-[10.5px] font-medium text-slate-700 shadow-2xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: EXTRACTED TEXT (OCR)                               */}
              {/* ========================================================= */}
              {activeTab === 'ocr' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Verbatim Transcription</span>
                      <span className="rounded-full bg-slate-200/60 border border-white px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                        {ocrWordsCount} words
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyOcr}
                      disabled={!data?.screenshot.ocr_text}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full liquid-glass-pill px-3 text-xs font-semibold text-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      {copiedOcr ? <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.2]" /> : <Copy className="h-3.5 w-3.5 stroke-[2]" />}
                      <span>{copiedOcr ? 'Copied' : 'Copy All'}</span>
                    </button>
                  </div>

                  <div className="rounded-[18px] bg-white/70 border border-white/80 backdrop-blur-md p-3.5 font-mono text-xs text-slate-800 leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
                    {data?.screenshot.ocr_text || 'No text detected in this image.'}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: METADATA & RECOGNITION INFO                        */}
              {/* ========================================================= */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  {/* Category Selector */}
                  <div className="rounded-[18px] liquid-glass-card p-3.5 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Category Classification
                    </label>
                    <select
                      value={data?.screenshot.category || 'other'}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-[14px] bg-white/90 border border-white p-2.5 text-xs text-slate-800 font-semibold focus:outline-none backdrop-blur-xs shadow-2xs"
                    >
                      <option value="chat">Chat Conversation</option>
                      <option value="game">Gaming Stats (BGMI / PUBG / COD)</option>
                      <option value="product">Product / E-Commerce</option>
                      <option value="poster_document">Poster / Document / Bill</option>
                      <option value="other">Other Screenshot</option>
                    </select>
                  </div>

                  {/* AI Engine Status Card */}
                  <div className="rounded-[18px] liquid-glass-card p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">AI Vision Engine</span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Ready</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-[11px] text-slate-500">Recognition Model</span>
                      <span className="font-semibold text-[11px] text-[#3478F6]">Gemini Multimodal Vision</span>
                    </div>
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-2 text-slate-500">
                    <div className="rounded-[18px] liquid-glass-card p-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 font-bold">
                        <Calendar className="h-3.5 w-3.5 text-[#3478F6]" />
                        <span>Upload Date</span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-800 truncate">
                        {data?.screenshot.uploaded_at
                          ? new Date(data.screenshot.uploaded_at).toLocaleDateString()
                          : data?.screenshot.created_at
                          ? new Date(data.screenshot.created_at).toLocaleDateString()
                          : 'N/A'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {data?.screenshot.uploaded_at
                          ? new Date(data.screenshot.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </p>
                    </div>

                    <div className="rounded-[18px] liquid-glass-card p-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 font-bold">
                        <HardDrive className="h-3.5 w-3.5 text-[#3478F6]" />
                        <span>File Size</span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-800 truncate">
                        {formatFileSize(data?.screenshot.file_size)}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {data?.screenshot.original_filename || 'image'}
                      </p>
                    </div>
                  </div>

                  {/* All Semantic Tags */}
                  <div className="rounded-[18px] liquid-glass-card p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 font-bold">
                      <Tag className="h-3.5 w-3.5 text-[#3478F6]" />
                      <span>Searchable Index Tags ({(data?.screenshot.tags || []).length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(data?.screenshot.tags || []).length > 0 ? (
                        data?.screenshot.tags?.map((t: string, i: number) => (
                          <span
                            key={i}
                            className="rounded-full bg-white/80 border border-white px-2.5 py-0.5 text-[10.5px] font-medium text-slate-700 shadow-2xs"
                          >
                            #{t}
                          </span>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No tags indexed</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-white/70 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-full liquid-btn-primary text-xs font-bold text-white active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
