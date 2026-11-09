import React, { useState, useEffect } from 'react';
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
  Layers,
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
  const [activeTab, setActiveTab] = useState<'content' | 'ocr' | 'info'>('content');
  const [copiedOcr, setCopiedOcr] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  useEffect(() => {
    if (!screenshotId) {
      setData(null);
      return;
    }

    setLoading(true);
    api
      .getScreenshotDetails(screenshotId)
      .then((res: ScreenshotDetailData) => {
        setData(res);
        if (res.messages && res.messages.length > 0) {
          setActiveTab('content');
        } else if (res.game_result) {
          setActiveTab('content');
        } else {
          setActiveTab('ocr');
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load screenshot details:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [screenshotId]);

  if (!screenshotId) return null;

  const imageUrl = api.getImageUrl(screenshotId);

  const handleCopyOcr = () => {
    if (!data?.screenshot.ocr_text) return;
    navigator.clipboard.writeText(data.screenshot.ocr_text);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 2000);
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      {/* Dismiss backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Modal with Plump Liquid Glass */}
      <div className="liquid-glass-container relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-[32px] pb-safe sm:max-h-[85vh] sm:max-w-lg sm:rounded-[32px] shadow-xl">
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
              <span className="rounded-full liquid-glass-pill px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                {data.screenshot.category.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Image Preview with Plump Frame */}
          <div className="relative overflow-hidden rounded-[20px] border border-white/80 bg-slate-100/60 shadow-xs">
            <img
              src={imageUrl}
              alt="Screenshot Preview"
              className={`w-full object-contain transition-all duration-200 ${
                isImageExpanded ? 'max-h-[70vh]' : 'max-h-56'
              }`}
            />
            <button
              type="button"
              onClick={() => setIsImageExpanded(!isImageExpanded)}
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-slate-900/65 backdrop-blur-md px-2.5 py-1 text-[10px] font-medium text-white border border-white/20 active:scale-95 cursor-pointer shadow-xs"
            >
              <Maximize2 className="h-3 w-3" />
              <span>{isImageExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>

          {/* Search Result Explanation Banner if present */}
          {searchResult?.match_explanation && (
            <div className="rounded-[18px] border border-amber-200/70 bg-amber-50/60 backdrop-blur-md p-3.5 text-xs text-stone-800 shadow-2xs">
              <span className="font-bold block mb-0.5 text-[#9A4635]">Match Explanation</span>
              <p className="leading-relaxed font-normal">{searchResult.match_explanation}</p>
            </div>
          )}

          {/* Symmetrical Liquid Glass Filter Tabs Grid (Aligned Full Width, No Box Wrappers) */}
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
              {/* TAB 1: STRUCTURED CONTENT (CHATS OR GAME STATS) */}
              {activeTab === 'content' && (
                <div className="space-y-3">
                  {/* Chat Conversation Thread */}
                  {data?.messages && data.messages.length > 0 && (
                    <div className="rounded-[20px] liquid-glass-card p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-slate-700 font-bold px-0.5">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-[#9A4635] stroke-[2]" />
                          <span>Conversation Flow ({data.messages.length})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Verified Order</span>
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

                  {/* Gaming Stats Dashboard */}
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

                  {/* Fallback for standard images */}
                  {(!data?.messages || data.messages.length === 0) && !data?.game_result && (
                    <div className="rounded-[20px] liquid-glass-card p-6 text-center">
                      <Layers className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-800 font-bold">Visual Capture</p>
                      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto font-normal">
                        No chat flow or game match detected. You can view all extracted OCR text in the Text tab.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EXTRACTED TEXT */}
              {activeTab === 'ocr' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700">On-Screen Text (OCR)</span>
                    <button
                      type="button"
                      onClick={handleCopyOcr}
                      disabled={!data?.screenshot.ocr_text}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full liquid-glass-pill px-3 text-xs font-semibold text-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      {copiedOcr ? <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.2]" /> : <Copy className="h-3.5 w-3.5 stroke-[2]" />}
                      <span>{copiedOcr ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="rounded-[18px] bg-white/70 border border-white/80 backdrop-blur-md p-3.5 font-mono text-xs text-slate-800 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
                    {data?.screenshot.ocr_text || 'No text detected in this image.'}
                  </div>
                </div>
              )}

              {/* TAB 3: INFO */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  {/* Category Selector */}
                  <div className="rounded-[18px] liquid-glass-card p-3.5">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      Category Classification
                    </label>
                    <select
                      value={data?.screenshot.category || 'other'}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-[14px] bg-white/90 border border-white p-2.5 text-xs text-slate-800 font-semibold focus:outline-none backdrop-blur-xs"
                    >
                      <option value="chat">Chat Conversation</option>
                      <option value="game">Gaming Stats (BGMI / PUBG)</option>
                      <option value="product">Product / Shopping</option>
                      <option value="poster_document">Poster / Document</option>
                      <option value="other">Other Screenshot</option>
                    </select>
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-2 text-slate-500">
                    <div className="rounded-[18px] liquid-glass-card p-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 font-bold">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Date</span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-800 truncate">
                        {data ? new Date(data.screenshot.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>

                    <div className="rounded-[18px] liquid-glass-card p-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 font-bold">
                        <Tag className="h-3.5 w-3.5" />
                        <span>Tags</span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-800 truncate">
                        {(data?.screenshot.tags || []).join(', ') || 'None'}
                      </p>
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
