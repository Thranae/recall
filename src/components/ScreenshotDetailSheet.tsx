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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md sm:items-center sm:justify-center sm:p-4">
      {/* Tap backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* iOS 27 Plumpy Liquid Glass Bottom Sheet */}
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-[36px] ios-plump-card pb-safe sm:max-h-[85vh] sm:max-w-lg sm:rounded-[32px]">
        {/* iOS Plump Drag Handle */}
        <div className="flex w-full justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-11 rounded-full bg-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/[0.12] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-white/50">
              Details
            </span>
            {data?.screenshot.category && (
              <span className="rounded-full ios-plump-pill px-3 py-1 text-[10px] font-bold text-blue-200">
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ios-plump-pill text-white/60 active:scale-90 active:text-red-300 transition-transform"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4 shrink-0" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ios-plump-pill text-white/70 active:scale-90 active:text-white transition-transform"
            >
              <X className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* iOS Liquid Glass Image Preview Card */}
          <div className="relative overflow-hidden rounded-[26px] border border-white/20 bg-black/60 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35),0_8px_32px_rgba(0,0,0,0.5)]">
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
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full ios-plump-pill px-3 py-1.5 text-[10px] font-bold text-white shadow-md active:scale-95"
            >
              <Maximize2 className="h-3 w-3 shrink-0" />
              <span>{isImageExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>

          {/* Search Result Explanation Banner if present */}
          {searchResult?.match_explanation && (
            <div className="rounded-[22px] border border-blue-400/35 bg-gradient-to-b from-blue-500/25 to-blue-700/20 p-3.5 text-xs text-blue-100 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4)]">
              <span className="font-bold block mb-0.5 text-blue-200">Matched Query:</span>
              {searchResult.match_explanation}
            </div>
          )}

          {/* iOS Plumpy Segmented Tab Control */}
          <div className="grid grid-cols-3 rounded-full ios-plump-card p-1">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`h-9 rounded-full text-xs font-bold transition-transform duration-100 ease-out active:scale-95 flex items-center justify-center ${
                activeTab === 'content'
                  ? 'ios-plump-primary text-white'
                  : 'text-white/60 active:text-white'
              }`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`h-9 rounded-full text-xs font-bold transition-transform duration-100 ease-out active:scale-95 flex items-center justify-center ${
                activeTab === 'ocr'
                  ? 'ios-plump-primary text-white'
                  : 'text-white/60 active:text-white'
              }`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`h-9 rounded-full text-xs font-bold transition-transform duration-100 ease-out active:scale-95 flex items-center justify-center ${
                activeTab === 'info'
                  ? 'ios-plump-primary text-white'
                  : 'text-white/60 active:text-white'
              }`}
            >
              Info
            </button>
          </div>

          {loading ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400 shrink-0" />
            </div>
          ) : (
            <div>
              {/* TAB 1: STRUCTURED CONTENT (CHATS OR GAME STATS) */}
              {activeTab === 'content' && (
                <div className="space-y-3">
                  {/* Chat Conversation Thread */}
                  {data?.messages && data.messages.length > 0 && (
                    <div className="rounded-[26px] ios-plump-card p-4">
                      <div className="mb-3.5 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <MessageSquare className="h-4 w-4 text-blue-400 shrink-0" />
                          <span>Conversation Flow ({data.messages.length} messages)</span>
                        </div>
                        <span className="text-[10px] font-mono text-white/50">Sequence Verified</span>
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
                                <span className="font-mono text-[9px] text-white/40">#{msg.sequence_number}</span>
                                <span className="text-[10px] font-medium text-white/55">
                                  {msg.sender_label || (isRight ? 'You' : 'Sender')}
                                </span>
                              </div>
                              <div
                                className={`max-w-[85%] px-4 py-2.5 text-xs leading-relaxed ${
                                  isRight
                                    ? 'ios-plump-primary rounded-[20px] rounded-tr-xs text-white'
                                    : 'ios-plump-card rounded-[20px] rounded-tl-xs text-white/95'
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
                    <div className="rounded-[26px] border border-amber-400/35 bg-gradient-to-b from-amber-500/20 to-amber-700/20 backdrop-blur-3xl p-4 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4)]">
                      <div className="mb-3 flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                          <Trophy className="h-4.5 w-4.5 text-amber-400 shrink-0" />
                          <span>{data.game_result.game_name || 'Match Statistics'}</span>
                        </div>
                        {data.game_result.rank && (
                          <span className="rounded-full bg-amber-400/30 border border-amber-400/40 px-3 py-0.5 font-mono text-xs font-bold text-amber-200 shadow-sm">
                            Rank #{data.game_result.rank}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 text-center sm:grid-cols-4">
                        <div className="rounded-[18px] ios-plump-card p-3">
                          <p className="text-[10px] uppercase tracking-wider text-white/50">Kills</p>
                          <p className="mt-0.5 font-mono text-2xl font-black text-amber-400 leading-tight">
                            {data.game_result.kills ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[18px] ios-plump-card p-3">
                          <p className="text-[10px] uppercase tracking-wider text-white/50">Damage</p>
                          <p className="mt-0.5 font-mono text-xl font-bold text-white leading-tight">
                            {data.game_result.damage ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[18px] ios-plump-card p-3">
                          <p className="text-[10px] uppercase tracking-wider text-white/50">Map</p>
                          <p className="mt-0.5 font-semibold text-xs text-white/90 truncate leading-tight">
                            {data.game_result.map_name || 'Standard'}
                          </p>
                        </div>
                        <div className="rounded-[18px] ios-plump-card p-3">
                          <p className="text-[10px] uppercase tracking-wider text-white/50">Mode</p>
                          <p className="mt-0.5 font-semibold text-xs text-white/90 truncate leading-tight">
                            {data.game_result.mode || 'Classic'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback for standard images */}
                  {(!data?.messages || data.messages.length === 0) && !data?.game_result && (
                    <div className="rounded-[26px] ios-plump-card p-6 text-center">
                      <Layers className="h-7 w-7 text-white/40 mx-auto mb-2 shrink-0" />
                      <p className="text-xs text-white/90 font-bold">Standard Visual Screenshot</p>
                      <p className="mt-1 text-[11px] text-white/50 leading-relaxed max-w-xs mx-auto">
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
                    <span className="text-xs font-semibold text-white/60">Verbatim On-Screen Text</span>
                    <button
                      type="button"
                      onClick={handleCopyOcr}
                      disabled={!data?.screenshot.ocr_text}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full ios-plump-pill px-3.5 text-xs font-bold text-white active:scale-95 transition-transform"
                    >
                      {copiedOcr ? <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0" />}
                      <span>{copiedOcr ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>

                  <div className="rounded-[24px] ios-plump-card p-4 font-mono text-xs text-white/90 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap select-text">
                    {data?.screenshot.ocr_text || 'No text detected in this image.'}
                  </div>
                </div>
              )}

              {/* TAB 3: INFO */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  {/* Category Selector */}
                  <div className="rounded-[24px] ios-plump-card p-4">
                    <label className="block text-[11px] font-bold text-white/50 mb-2 uppercase tracking-wider">
                      Category Classification
                    </label>
                    <select
                      value={data?.screenshot.category || 'other'}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-2xl ios-plump-pill p-3 text-xs text-white font-semibold focus:outline-none"
                    >
                      <option value="chat" className="bg-slate-900">Chat Conversation</option>
                      <option value="game" className="bg-slate-900">Gaming Stats (BGMI / PUBG)</option>
                      <option value="product" className="bg-slate-900">Product / Shopping</option>
                      <option value="poster_document" className="bg-slate-900">Poster / Document</option>
                      <option value="other" className="bg-slate-900">Other Screenshot</option>
                    </select>
                  </div>

                  {/* Visual Description */}
                  {data?.screenshot.visual_description && (
                    <div className="rounded-[24px] ios-plump-card p-4">
                      <span className="block text-[11px] font-bold text-white/50 mb-1.5 uppercase tracking-wider">
                        Visual Description
                      </span>
                      <p className="text-white/85 leading-relaxed">
                        {data.screenshot.visual_description}
                      </p>
                    </div>
                  )}

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-white/50">
                    <div className="rounded-[20px] ios-plump-card p-3.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-white/40">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span>Date Captured</span>
                      </div>
                      <p className="mt-1 font-semibold text-white/90">
                        {data ? new Date(data.screenshot.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>

                    <div className="rounded-[20px] ios-plump-card p-3.5">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-white/40">
                        <Tag className="h-3.5 w-3.5 shrink-0" />
                        <span>Indexed Tags</span>
                      </div>
                      <p className="mt-1 font-semibold text-white/90 truncate">
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
        <div className="border-t border-white/[0.12] px-5 py-3.5 bg-black/50 backdrop-blur-2xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-full ios-plump-pill text-xs font-bold text-white active:scale-[0.98] transition-transform flex items-center justify-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
