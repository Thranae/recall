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
      {/* Tap backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Packwise Style Liquid Glass Bottom Sheet */}
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-[36px] ios-glass-card shadow-[0_-16px_48px_rgba(15,23,42,0.18)] pb-safe sm:max-h-[85vh] sm:max-w-lg sm:rounded-[32px] sm:border">
        {/* iOS Drag Handle */}
        <div className="flex w-full justify-center pt-3 pb-1 sm:hidden relative z-10">
          <div className="h-1.5 w-11 rounded-full bg-slate-300" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Details
            </span>
            {data?.screenshot.category && (
              <span className="rounded-full bg-blue-100/90 border border-blue-300/80 px-3 py-0.5 text-[10px] font-extrabold text-[#2F6BFF] shadow-2xs">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ios-glass-pill text-slate-600 active:scale-90 active:bg-red-50 active:text-red-600 transition-transform"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-600" /> : <Trash2 className="h-4 w-4 shrink-0 stroke-[2.2]" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ios-glass-pill text-slate-600 active:scale-90 active:bg-white active:text-slate-900 transition-transform"
            >
              <X className="h-4 w-4 shrink-0 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 relative z-10">
          {/* Image Preview Card */}
          <div className="relative overflow-hidden rounded-[26px] border border-white/80 bg-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
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
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full ios-glass-pill px-3 py-1.5 text-[10px] font-extrabold text-[#2F6BFF] shadow-sm active:scale-95"
            >
              <Maximize2 className="h-3 w-3 shrink-0 stroke-[2.2]" />
              <span>{isImageExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>

          {/* Search Result Explanation Banner if present */}
          {searchResult?.match_explanation && (
            <div className="rounded-[22px] border border-blue-300/80 bg-blue-50/90 p-3.5 text-xs text-blue-900 shadow-2xs backdrop-blur-md">
              <span className="font-extrabold block mb-0.5 text-[#2F6BFF]">Matched Query:</span>
              <p className="font-semibold leading-relaxed">{searchResult.match_explanation}</p>
            </div>
          )}

          {/* Packwise Segmented Tab Control */}
          <div className="grid grid-cols-3 rounded-[22px] ios-glass-pill p-1">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`h-9 rounded-[18px] text-xs font-extrabold transition-all duration-200 active:scale-95 flex items-center justify-center ${
                activeTab === 'content'
                  ? 'ios-filter-chip-active'
                  : 'text-[#56647D] hover:text-[#2F6BFF]'
              }`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`h-9 rounded-[18px] text-xs font-extrabold transition-all duration-200 active:scale-95 flex items-center justify-center ${
                activeTab === 'ocr'
                  ? 'ios-filter-chip-active'
                  : 'text-[#56647D] hover:text-[#2F6BFF]'
              }`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`h-9 rounded-[18px] text-xs font-extrabold transition-all duration-200 active:scale-95 flex items-center justify-center ${
                activeTab === 'info'
                  ? 'ios-filter-chip-active'
                  : 'text-[#56647D] hover:text-[#2F6BFF]'
              }`}
            >
              Info
            </button>
          </div>

          {loading ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 shrink-0" />
            </div>
          ) : (
            <div>
              {/* TAB 1: STRUCTURED CONTENT (CHATS OR GAME STATS) */}
              {activeTab === 'content' && (
                <div className="space-y-3">
                  {/* Chat Conversation Thread */}
                  {data?.messages && data.messages.length > 0 && (
                    <div className="rounded-[26px] bg-slate-50 border border-slate-200/90 p-4 shadow-2xs">
                      <div className="mb-3.5 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <MessageSquare className="h-4 w-4 text-blue-600 shrink-0 stroke-[2.2]" />
                          <span>Conversation Flow ({data.messages.length} messages)</span>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-slate-500">Sequence Verified</span>
                      </div>

                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                        {data.messages.map((msg) => {
                          const isRight = msg.sender_side === 'right';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1 mb-1 px-1">
                                <span className="font-mono text-[9px] text-slate-400 font-bold">#{msg.sequence_number}</span>
                                <span className="text-[10px] font-semibold text-slate-500">
                                  {msg.sender_label || (isRight ? 'You' : 'Sender')}
                                </span>
                              </div>
                              <div
                                className={`max-w-[85%] px-4 py-2.5 text-xs font-medium leading-relaxed ${
                                  isRight
                                    ? 'ios-plump-primary rounded-[20px] rounded-tr-xs text-white'
                                    : 'bg-white border border-slate-200/90 rounded-[20px] rounded-tl-xs text-slate-900 shadow-2xs'
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
                    <div className="rounded-[26px] border border-amber-200 bg-gradient-to-b from-amber-50 to-orange-50/60 p-4 shadow-2xs">
                      <div className="mb-3 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                          <Trophy className="h-4.5 w-4.5 text-amber-600 shrink-0 stroke-[2.2]" />
                          <span>{data.game_result.game_name || 'Match Statistics'}</span>
                        </div>
                        {data.game_result.rank && (
                          <span className="rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 font-mono text-xs font-bold text-amber-900 shadow-2xs">
                            Rank #{data.game_result.rank}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-center sm:grid-cols-4">
                        <div className="rounded-[18px] bg-white p-3 border border-amber-200/80 shadow-2xs">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Kills</p>
                          <p className="mt-0.5 font-mono text-2xl font-black text-amber-600 leading-tight">
                            {data.game_result.kills ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white p-3 border border-amber-200/80 shadow-2xs">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Damage</p>
                          <p className="mt-0.5 font-mono text-xl font-bold text-slate-900 leading-tight">
                            {data.game_result.damage ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white p-3 border border-amber-200/80 shadow-2xs">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Map</p>
                          <p className="mt-0.5 font-semibold text-xs text-slate-800 truncate leading-tight">
                            {data.game_result.map_name || 'Standard'}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white p-3 border border-amber-200/80 shadow-2xs">
                          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Mode</p>
                          <p className="mt-0.5 font-semibold text-xs text-slate-800 truncate leading-tight">
                            {data.game_result.mode || 'Classic'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback for standard images */}
                  {(!data?.messages || data.messages.length === 0) && !data?.game_result && (
                    <div className="rounded-[26px] bg-slate-50 border border-slate-200 p-6 text-center">
                      <Layers className="h-7 w-7 text-slate-400 mx-auto mb-2 shrink-0 stroke-[2.2]" />
                      <p className="text-xs text-slate-900 font-bold">Standard Visual Screenshot</p>
                      <p className="mt-1 text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto font-medium">
                        No structured chat sequence or game match stats detected in this image. You can view extracted text in the Text tab.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EXTRACTED TEXT */}
              {activeTab === 'ocr' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-600">Verbatim On-Screen Text</span>
                    <button
                      type="button"
                      onClick={handleCopyOcr}
                      disabled={!data?.screenshot.ocr_text}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3.5 text-xs font-bold text-slate-800 active:scale-95 transition-transform"
                    >
                      {copiedOcr ? <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.5]" /> : <Copy className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />}
                      <span>{copiedOcr ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>

                  <div className="rounded-[24px] bg-slate-50 border border-slate-200 p-4 font-mono text-xs text-slate-900 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap select-text">
                    {data?.screenshot.ocr_text || 'No text detected in this image.'}
                  </div>
                </div>
              )}

              {/* TAB 3: INFO */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  {/* Category Selector */}
                  <div className="rounded-[24px] bg-slate-50 border border-slate-200 p-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wider">
                      Category Classification
                    </label>
                    <select
                      value={data?.screenshot.category || 'other'}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-2xl bg-white border border-slate-200 p-3 text-xs text-slate-900 font-bold focus:outline-none"
                    >
                      <option value="chat">Chat Conversation</option>
                      <option value="game">Gaming Stats (BGMI / PUBG)</option>
                      <option value="product">Product / Shopping</option>
                      <option value="poster_document">Poster / Document</option>
                      <option value="other">Other Screenshot</option>
                    </select>
                  </div>

                  {/* Visual Description */}
                  {data?.screenshot.visual_description && (
                    <div className="rounded-[24px] bg-slate-50 border border-slate-200 p-4">
                      <span className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                        Visual Description
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium">
                        {data.screenshot.visual_description}
                      </p>
                    </div>
                  )}

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-slate-500">
                    <div className="rounded-[20px] bg-slate-50 border border-slate-200 p-3.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-500 font-bold">
                        <Calendar className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                        <span>Date Captured</span>
                      </div>
                      <p className="mt-1 font-bold text-slate-900">
                        {data ? new Date(data.screenshot.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>

                    <div className="rounded-[20px] bg-slate-50 border border-slate-200 p-3.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-500 font-bold">
                        <Tag className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                        <span>Indexed Tags</span>
                      </div>
                      <p className="mt-1 font-bold text-slate-900 truncate">
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
        <div className="border-t border-slate-200/80 px-5 py-3.5 relative z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-full ios-liquid-primary text-xs font-black text-white active:scale-[0.98] transition-transform flex items-center justify-center shadow-[0_6px_20px_rgba(47,107,255,0.4)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
