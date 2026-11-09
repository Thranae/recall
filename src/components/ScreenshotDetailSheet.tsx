import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  Trophy,
  Layers,
  Calendar,
  Tag,
  Loader2,
  Maximize2,
} from 'lucide-react';
import type { Screenshot, ExtractedMessage, GameResult, SearchResultItem } from '../types';
import { api } from '../services/api';

interface ScreenshotDetailSheetProps {
  screenshotId: string | null;
  searchResult?: SearchResultItem;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onUpdated: () => void;
}

export const ScreenshotDetailSheet: React.FC<ScreenshotDetailSheetProps> = ({
  screenshotId,
  searchResult,
  onClose,
  onDeleted,
  onUpdated,
}) => {
  const [data, setData] = useState<{
    screenshot: Screenshot;
    messages: ExtractedMessage[];
    game_result: GameResult | null;
  } | null>(null);

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
      .then((res) => {
        setData(res);
        if (res.messages.length > 0 || res.game_result) {
          setActiveTab('content');
        } else {
          setActiveTab('ocr');
        }
      })
      .catch((err) => {
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
    if (!window.confirm('Delete this screenshot from your private library?')) return;
    setIsDeleting(true);
    try {
      await api.deleteScreenshot(screenshotId);
      onDeleted(screenshotId);
      onClose();
    } catch (err) {
      console.error('Failed to delete screenshot:', err);
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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      {/* Dismiss backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* iOS Bottom Sheet Modal */}
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-[32px] bg-white border border-black/[0.08] shadow-[0_-16px_48px_rgba(0,0,0,0.15)] pb-safe sm:max-h-[85vh] sm:max-w-lg sm:rounded-[28px]">
        {/* iOS Drag Handle */}
        <div className="flex w-full justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              Details
            </span>
            {data?.screenshot.category && (
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-semibold text-[#2F6BFF]">
                {data.screenshot.category.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete screenshot"
              aria-label="Delete screenshot"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 active:scale-90 transition-all cursor-pointer"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" /> : <Trash2 className="h-3.5 w-3.5 stroke-[2]" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 active:scale-90 transition-all cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Image Preview */}
          <div className="relative overflow-hidden rounded-2xl border border-black/[0.06] bg-slate-100 shadow-xs">
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
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-1 text-[10px] font-medium text-white border border-white/20 active:scale-95 cursor-pointer"
            >
              <Maximize2 className="h-3 w-3" />
              <span>{isImageExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>

          {/* Search Result Explanation Banner if present */}
          {searchResult?.match_explanation && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 text-xs text-blue-900">
              <span className="font-bold block mb-0.5 text-[#2F6BFF]">Match Explanation</span>
              <p className="leading-relaxed font-normal">{searchResult.match_explanation}</p>
            </div>
          )}

          {/* Segmented Control */}
          <div className="ios-segmented-control w-full">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`ios-segment-btn ${activeTab === 'content' ? 'ios-segment-btn-active' : ''}`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`ios-segment-btn ${activeTab === 'ocr' ? 'ios-segment-btn-active' : ''}`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`ios-segment-btn ${activeTab === 'info' ? 'ios-segment-btn-active' : ''}`}
            >
              Info
            </button>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#2F6BFF]" />
            </div>
          ) : (
            <div>
              {/* TAB 1: STRUCTURED CONTENT (CHATS OR GAME STATS) */}
              {activeTab === 'content' && (
                <div className="space-y-3">
                  {/* Chat Conversation Thread */}
                  {data?.messages && data.messages.length > 0 && (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-700 font-semibold px-1">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-[#2F6BFF]" />
                          <span>Conversation Flow ({data.messages.length})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Verified Order</span>
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
                                <span className="font-mono text-[9px] text-slate-400">#{msg.sequence_number}</span>
                                <span className="text-[10px] font-medium text-slate-500">
                                  {msg.sender_label || (isRight ? 'You' : 'Sender')}
                                </span>
                              </div>
                              <div
                                className={`max-w-[85%] px-3.5 py-2 text-xs font-normal leading-relaxed rounded-2xl ${
                                  isRight
                                    ? 'bg-[#2F6BFF] text-white rounded-tr-xs'
                                    : 'bg-white border border-slate-200/90 text-slate-900 rounded-tl-xs shadow-2xs'
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
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-amber-900 px-1">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-3.5 w-3.5 text-amber-600" />
                          <span>{data.game_result.game_name || 'Match Stats'}</span>
                        </div>
                        {data.game_result.rank && (
                          <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-900">
                            Rank #{data.game_result.rank}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                        <div className="rounded-xl bg-white p-2.5 border border-amber-200/80">
                          <p className="text-[10px] uppercase text-slate-400 font-semibold">Kills</p>
                          <p className="mt-0.5 font-mono text-xl font-bold text-amber-600">
                            {data.game_result.kills ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-2.5 border border-amber-200/80">
                          <p className="text-[10px] uppercase text-slate-400 font-semibold">Damage</p>
                          <p className="mt-0.5 font-mono text-lg font-bold text-slate-900">
                            {data.game_result.damage ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-2.5 border border-amber-200/80">
                          <p className="text-[10px] uppercase text-slate-400 font-semibold">Map</p>
                          <p className="mt-0.5 text-xs text-slate-800 truncate font-medium">
                            {data.game_result.map_name || 'Standard'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-2.5 border border-amber-200/80">
                          <p className="text-[10px] uppercase text-slate-400 font-semibold">Mode</p>
                          <p className="mt-0.5 text-xs text-slate-800 truncate font-medium">
                            {data.game_result.mode || 'Classic'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback for standard images */}
                  {(!data?.messages || data.messages.length === 0) && !data?.game_result && (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-6 text-center">
                      <Layers className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-800 font-semibold">Visual Capture</p>
                      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
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
                    <span className="text-xs font-semibold text-slate-700">On-Screen Text (OCR)</span>
                    <button
                      type="button"
                      onClick={handleCopyOcr}
                      disabled={!data?.screenshot.ocr_text}
                      className="inline-flex h-7.5 items-center gap-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 px-3 text-xs font-semibold text-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      {copiedOcr ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedOcr ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 font-mono text-xs text-slate-800 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text">
                    {data?.screenshot.ocr_text || 'No text detected in this image.'}
                  </div>
                </div>
              )}

              {/* TAB 3: INFO */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  {/* Category Selector */}
                  <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5">
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5 uppercase">
                      Category Classification
                    </label>
                    <select
                      value={data?.screenshot.category || 'other'}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-xl bg-white border border-slate-200 p-2.5 text-xs text-slate-900 font-semibold focus:outline-none"
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
                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 font-semibold">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Date</span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-800 truncate">
                        {data ? new Date(data.screenshot.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 font-semibold">
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
        <div className="border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
