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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md sm:items-center sm:justify-center sm:p-4">
      {/* Tap backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* iOS Liquid Glass Bottom Sheet Container */}
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-[32px] border-t border-white/20 bg-[#0d0f17]/90 backdrop-blur-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_-12px_48px_rgba(0,0,0,0.7)] sm:max-h-[85vh] sm:max-w-lg sm:rounded-[28px] sm:border">
        {/* iOS Drag Handle */}
        <div className="flex w-full justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-white/25 shadow-sm" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Details
            </span>
            {data?.screenshot.category && (
              <span className="rounded-full bg-white/12 border border-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-blue-300 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
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
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white/60 active:scale-90 active:bg-red-500/25 active:text-red-300 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white/60 active:scale-90 active:text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* iOS Liquid Glass Image Card */}
          <div className="relative overflow-hidden rounded-[22px] border border-white/12 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.3)]">
            <img
              src={imageUrl}
              alt="Screenshot Preview"
              className={`w-full object-contain transition-all ${
                isImageExpanded ? 'max-h-[70vh]' : 'max-h-56'
              }`}
            />
            <button
              type="button"
              onClick={() => setIsImageExpanded(!isImageExpanded)}
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-black/60 border border-white/20 px-2.5 py-1 text-[10px] font-medium text-white/80 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-95"
            >
              <Maximize2 className="h-3 w-3" />
              <span>{isImageExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>

          {/* Search Result Explanation Banner if present */}
          {searchResult?.match_explanation && (
            <div className="rounded-[18px] border border-blue-400/30 bg-blue-500/15 backdrop-blur-xl p-3 text-xs text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <span className="font-semibold block mb-0.5 text-blue-200">Matched Query:</span>
              {searchResult.match_explanation}
            </div>
          )}

          {/* iOS Frosted Segmented Tab Control */}
          <div className="grid grid-cols-3 rounded-full bg-white/[0.08] backdrop-blur-2xl p-1 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`rounded-full py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                activeTab === 'content'
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,122,255,0.3)]'
                  : 'text-white/60 active:text-white'
              }`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`rounded-full py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                activeTab === 'ocr'
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,122,255,0.3)]'
                  : 'text-white/60 active:text-white'
              }`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`rounded-full py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                activeTab === 'info'
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,122,255,0.3)]'
                  : 'text-white/60 active:text-white'
              }`}
            >
              Info
            </button>
          </div>

          {loading ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            </div>
          ) : (
            <div>
              {/* TAB 1: STRUCTURED CONTENT (CHATS OR GAME STATS) */}
              {activeTab === 'content' && (
                <div className="space-y-3">
                  {/* iOS Style Chat Conversation Thread */}
                  {data?.messages && data.messages.length > 0 && (
                    <div className="rounded-[22px] border border-white/12 bg-white/[0.05] backdrop-blur-2xl p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                      <div className="mb-3 flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <MessageSquare className="h-3.5 w-3.5 text-blue-400" />
                          <span>Conversation Flow ({data.messages.length} messages)</span>
                        </div>
                        <span className="text-[10px] font-mono text-white/50">Sequence Verified</span>
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
                                <span className="font-mono text-[9px] text-white/40">#{msg.sequence_number}</span>
                                <span className="text-[10px] font-medium text-white/50">
                                  {msg.sender_label || (isRight ? 'You' : 'Sender')}
                                </span>
                              </div>
                              <div
                                className={`max-w-[85%] px-3.5 py-2 text-xs leading-relaxed ${
                                  isRight
                                    ? 'bg-gradient-to-b from-[#007aff] to-[#006fe6] text-white rounded-[18px] rounded-tr-sm shadow-[0_2px_8px_rgba(0,122,255,0.3)]'
                                    : 'bg-white/15 border border-white/15 text-white/95 rounded-[18px] rounded-tl-sm backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
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
                    <div className="rounded-[22px] border border-amber-400/25 bg-amber-500/15 backdrop-blur-2xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                          <Trophy className="h-4 w-4 text-amber-400" />
                          <span>{data.game_result.game_name || 'Match Statistics'}</span>
                        </div>
                        {data.game_result.rank && (
                          <span className="rounded-full bg-amber-400/25 border border-amber-400/30 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                            Rank #{data.game_result.rank}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                        <div className="rounded-[16px] bg-white/[0.08] backdrop-blur-xl p-3 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                          <p className="text-[10px] uppercase tracking-wider text-white/50">Kills</p>
                          <p className="mt-0.5 font-mono text-xl font-black text-amber-400">
                            {data.game_result.kills ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[16px] bg-white/[0.08] backdrop-blur-xl p-3 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                          <p className="text-[10px] uppercase tracking-wider text-white/50">Damage</p>
                          <p className="mt-0.5 font-mono text-lg font-bold text-white">
                            {data.game_result.damage ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[16px] bg-white/[0.08] backdrop-blur-xl p-3 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                          <p className="text-[10px] uppercase tracking-wider text-white/50">Map</p>
                          <p className="mt-0.5 font-medium text-xs text-white/90 truncate">
                            {data.game_result.map_name || 'Standard'}
                          </p>
                        </div>
                        <div className="rounded-[16px] bg-white/[0.08] backdrop-blur-xl p-3 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                          <p className="text-[10px] uppercase tracking-wider text-white/50">Mode</p>
                          <p className="mt-0.5 font-medium text-xs text-white/90 truncate">
                            {data.game_result.mode || 'Classic'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback for standard images */}
                  {(!data?.messages || data.messages.length === 0) && !data?.game_result && (
                    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <Layers className="h-6 w-6 text-white/40 mx-auto mb-1.5" />
                      <p className="text-xs text-white/90 font-medium">Standard Visual Screenshot</p>
                      <p className="mt-1 text-[11px] text-white/50">
                        No structured chat sequence or game match stats detected in this image. You can view extracted text in the Text tab.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EXTRACTED TEXT */}
              {activeTab === 'ocr' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="text-xs font-medium text-white/60">Verbatim On-Screen Text</span>
                    <button
                      type="button"
                      onClick={handleCopyOcr}
                      disabled={!data?.screenshot.ocr_text}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/12 border border-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] active:scale-95"
                    >
                      {copiedOcr ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedOcr ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>

                  <div className="rounded-[20px] border border-white/10 bg-black/40 backdrop-blur-2xl p-4 font-mono text-xs text-white/90 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                    {data?.screenshot.ocr_text || 'No text detected in this image.'}
                  </div>
                </div>
              )}

              {/* TAB 3: INFO */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  {/* Category Selector */}
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                    <label className="block text-[11px] font-semibold text-white/50 mb-1.5 uppercase tracking-wider">
                      Category Classification
                    </label>
                    <select
                      value={data?.screenshot.category || 'other'}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-xl border border-white/15 bg-white/10 backdrop-blur-xl p-2.5 text-xs text-white focus:outline-none"
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
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
                      <span className="block text-[11px] font-semibold text-white/50 mb-1 uppercase tracking-wider">
                        Visual Description
                      </span>
                      <p className="text-white/85 leading-relaxed">
                        {data.screenshot.visual_description}
                      </p>
                    </div>
                  )}

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-2 text-white/50">
                    <div className="rounded-[16px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <div className="flex items-center gap-1 text-[10px] uppercase text-white/40">
                        <Calendar className="h-3 w-3" />
                        <span>Date Captured</span>
                      </div>
                      <p className="mt-1 font-medium text-white/90">
                        {data ? new Date(data.screenshot.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>

                    <div className="rounded-[16px] border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <div className="flex items-center gap-1 text-[10px] uppercase text-white/40">
                        <Tag className="h-3 w-3" />
                        <span>Indexed Tags</span>
                      </div>
                      <p className="mt-1 font-medium text-white/90 truncate">
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
        <div className="border-t border-white/10 px-5 py-3 pb-safe bg-black/40 backdrop-blur-xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full bg-white/12 border border-white/15 py-3 text-xs font-semibold text-white active:scale-[0.98] active:bg-white/20 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
