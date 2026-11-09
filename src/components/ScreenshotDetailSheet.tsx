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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-md sm:items-center sm:justify-center sm:p-4">
      {/* Dismiss backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* iOS Bottom Sheet Modal with Plump Liquid Glass */}
      <div className="liquid-glass-container relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-[38px] pb-safe sm:max-h-[85vh] sm:max-w-lg sm:rounded-[36px] shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
        {/* iOS Drag Handle */}
        <div className="flex w-full justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-900">
              Details
            </span>
            {data?.screenshot.category && (
              <span className="rounded-full liquid-glass-pill px-3 py-1 text-[10px] font-black text-[#2F6BFF]">
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
              className="flex h-9 w-9 items-center justify-center rounded-full liquid-glass-pill text-slate-600 hover:text-rose-600 active:scale-90 transition-all cursor-pointer"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-rose-600" /> : <Trash2 className="h-4 w-4 stroke-[2.2]" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="flex h-9 w-9 items-center justify-center rounded-full liquid-glass-pill text-slate-600 active:scale-90 transition-all cursor-pointer"
            >
              <X className="h-4 w-4 stroke-[2.4]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Image Preview with Plump Frame */}
          <div className="relative overflow-hidden rounded-[24px] border-2 border-white/80 bg-slate-100/60 shadow-md">
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
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 rounded-full bg-slate-950/70 backdrop-blur-md px-3 py-1.5 text-[10.5px] font-black text-white border border-white/30 active:scale-95 cursor-pointer shadow-md"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>{isImageExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>

          {/* Search Result Explanation Banner if present */}
          {searchResult?.match_explanation && (
            <div className="rounded-[22px] border border-blue-300/80 bg-blue-50/80 backdrop-blur-md p-4 text-xs text-blue-950 shadow-sm">
              <span className="font-black block mb-1 text-[#2F6BFF]">Match Explanation</span>
              <p className="leading-relaxed font-semibold">{searchResult.match_explanation}</p>
            </div>
          )}

          {/* Plump Liquid Glass Filter Chips for Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`liquid-filter-chip ${activeTab === 'content' ? 'liquid-filter-chip-active' : ''}`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`liquid-filter-chip ${activeTab === 'ocr' ? 'liquid-filter-chip-active' : ''}`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`liquid-filter-chip ${activeTab === 'info' ? 'liquid-filter-chip-active' : ''}`}
            >
              Info
            </button>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#2F6BFF]" />
            </div>
          ) : (
            <div>
              {/* TAB 1: STRUCTURED CONTENT (CHATS OR GAME STATS) */}
              {activeTab === 'content' && (
                <div className="space-y-3">
                  {/* Chat Conversation Thread */}
                  {data?.messages && data.messages.length > 0 && (
                    <div className="rounded-[24px] liquid-glass-card p-4 space-y-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs text-slate-900 font-black px-1">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-[#2F6BFF] stroke-[2.4]" />
                          <span>Conversation Flow ({data.messages.length})</span>
                        </div>
                        <span className="text-[10px] text-slate-600 font-black">Verified Order</span>
                      </div>

                      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                        {data.messages.map((msg) => {
                          const isRight = msg.sender_side === 'right';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1 mb-0.5 px-1">
                                <span className="font-mono text-[9px] text-slate-500 font-bold">#{msg.sequence_number}</span>
                                <span className="text-[10px] font-black text-slate-800">
                                  {msg.sender_label || (isRight ? 'You' : 'Sender')}
                                </span>
                              </div>
                              <div
                                className={`max-w-[85%] px-4 py-2.5 text-xs font-bold leading-relaxed rounded-[20px] ${
                                  isRight
                                    ? 'liquid-btn-primary text-white rounded-tr-xs shadow-xs'
                                    : 'bg-white/85 border border-white text-slate-900 rounded-tl-xs shadow-2xs'
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
                    <div className="rounded-[24px] border-2 border-amber-300/80 bg-amber-50/70 backdrop-blur-md p-4 space-y-3.5 shadow-sm">
                      <div className="flex items-center justify-between text-xs font-black text-amber-950 px-1">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4.5 w-4.5 text-amber-600 stroke-[2.4]" />
                          <span>{data.game_result.game_name || 'Match Stats'}</span>
                        </div>
                        {data.game_result.rank && (
                          <span className="rounded-full bg-amber-200/90 border border-amber-300 px-3 py-1 font-mono text-[11px] font-black text-amber-950">
                            Rank #{data.game_result.rank}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-center sm:grid-cols-4">
                        <div className="rounded-[18px] bg-white/85 backdrop-blur-sm p-3 border border-amber-200/70 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-500 font-bold">Kills</p>
                          <p className="mt-0.5 font-mono text-2xl font-black text-amber-600">
                            {data.game_result.kills ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white/85 backdrop-blur-sm p-3 border border-amber-200/70 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-500 font-bold">Damage</p>
                          <p className="mt-0.5 font-mono text-lg font-black text-slate-900">
                            {data.game_result.damage ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white/85 backdrop-blur-sm p-3 border border-amber-200/70 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-500 font-bold">Map</p>
                          <p className="mt-0.5 text-xs text-slate-900 truncate font-black">
                            {data.game_result.map_name || 'Standard'}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white/85 backdrop-blur-sm p-3 border border-amber-200/70 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-500 font-bold">Mode</p>
                          <p className="mt-0.5 text-xs text-slate-900 truncate font-black">
                            {data.game_result.mode || 'Classic'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback for standard images */}
                  {(!data?.messages || data.messages.length === 0) && !data?.game_result && (
                    <div className="rounded-[24px] liquid-glass-card p-6 text-center">
                      <Layers className="h-7 w-7 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-900 font-black">Visual Capture</p>
                      <p className="mt-1 text-[11px] text-slate-600 leading-relaxed max-w-xs mx-auto font-semibold">
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
                    <span className="text-xs font-black text-slate-900">On-Screen Text (OCR)</span>
                    <button
                      type="button"
                      onClick={handleCopyOcr}
                      disabled={!data?.screenshot.ocr_text}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full liquid-glass-pill px-4 text-xs font-black text-slate-800 active:scale-95 transition-all cursor-pointer"
                    >
                      {copiedOcr ? <Check className="h-4 w-4 text-emerald-600 stroke-[2.6]" /> : <Copy className="h-4 w-4 stroke-[2.4]" />}
                      <span>{copiedOcr ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="rounded-[22px] bg-white/70 border-2 border-white/85 backdrop-blur-md p-4 font-mono text-xs text-slate-900 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
                    {data?.screenshot.ocr_text || 'No text detected in this image.'}
                  </div>
                </div>
              )}

              {/* TAB 3: INFO */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  {/* Category Selector */}
                  <div className="rounded-[22px] liquid-glass-card p-4">
                    <label className="block text-[11px] font-black text-slate-600 mb-2 uppercase tracking-wide">
                      Category Classification
                    </label>
                    <select
                      value={data?.screenshot.category || 'other'}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-[16px] bg-white/90 border-2 border-white p-3 text-xs text-slate-900 font-black focus:outline-none backdrop-blur-xs shadow-xs"
                    >
                      <option value="chat">Chat Conversation</option>
                      <option value="game">Gaming Stats (BGMI / PUBG)</option>
                      <option value="product">Product / Shopping</option>
                      <option value="poster_document">Poster / Document</option>
                      <option value="other">Other Screenshot</option>
                    </select>
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-3 text-slate-500">
                    <div className="rounded-[22px] liquid-glass-card p-3.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-500 font-black">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Date</span>
                      </div>
                      <p className="mt-1 font-black text-slate-900 truncate">
                        {data ? new Date(data.screenshot.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>

                    <div className="rounded-[22px] liquid-glass-card p-3.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-500 font-black">
                        <Tag className="h-3.5 w-3.5" />
                        <span>Tags</span>
                      </div>
                      <p className="mt-1 font-black text-slate-900 truncate">
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
        <div className="border-t border-white/70 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-full liquid-btn-primary text-xs font-black text-white active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
