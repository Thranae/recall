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
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Mobile Slide-Up Sheet Container */}
      <div className="relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-3xl border-t border-slate-800 bg-slate-950 sm:max-h-[85vh] sm:max-w-lg sm:rounded-2xl sm:border">
        {/* Top Drag Indicator for mobile */}
        <div className="flex w-full justify-center pt-2.5 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-700" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Screenshot Details
            </span>
            {data?.screenshot.category && (
              <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                {data.screenshot.category.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete screenshot"
              aria-label="Delete screenshot"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/20 hover:text-red-400 active:scale-95"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-400" /> : <Trash2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-slate-400 hover:text-white active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {/* Image Viewer */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
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
              className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-slate-950/80 px-2 py-1 text-[10px] font-medium text-slate-300 backdrop-blur-md active:scale-95"
            >
              <Maximize2 className="h-3 w-3" />
              <span>{isImageExpanded ? 'Collapse' : 'Expand'}</span>
            </button>
          </div>

          {/* Search Result Explanation Banner if present */}
          {searchResult?.match_explanation && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5 text-xs text-indigo-200">
              <span className="font-semibold block mb-0.5">Matched Query:</span>
              {searchResult.match_explanation}
            </div>
          )}

          {/* Segmented Tab Controls */}
          <div className="grid grid-cols-3 rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'content' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'ocr' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Extracted Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                activeTab === 'info' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Info & Tags
            </button>
          </div>

          {loading ? (
            <div className="flex h-36 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
            </div>
          ) : (
            <div>
              {/* TAB 1: STRUCTURED CONTENT (CHATS OR GAME STATS) */}
              {activeTab === 'content' && (
                <div className="space-y-3">
                  {/* Chat Conversation Thread */}
                  {data?.messages && data.messages.length > 0 && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                          <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Conversation Flow ({data.messages.length} messages)</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">Chronological Order</span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {data.messages.map((msg) => {
                          const isRight = msg.sender_side === 'right';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="font-mono text-[9px] text-slate-400">#{msg.sequence_number}</span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  {msg.sender_label || (isRight ? 'You' : 'Sender')}
                                </span>
                              </div>
                              <div
                                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                                  isRight
                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                    : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
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
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                      <div className="mb-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                          <Trophy className="h-4 w-4 text-amber-400" />
                          <span>{data.game_result.game_name || 'Match Statistics'}</span>
                        </div>
                        {data.game_result.rank && (
                          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                            Rank #{data.game_result.rank}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                        <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Kills</p>
                          <p className="mt-0.5 font-mono text-xl font-black text-amber-400">
                            {data.game_result.kills ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Damage</p>
                          <p className="mt-0.5 font-mono text-lg font-bold text-white">
                            {data.game_result.damage ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Map</p>
                          <p className="mt-0.5 font-medium text-xs text-slate-200 truncate">
                            {data.game_result.map_name || 'Standard'}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400">Mode</p>
                          <p className="mt-0.5 font-medium text-xs text-slate-200 truncate">
                            {data.game_result.mode || 'Classic'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback if no structured game/chat was found */}
                  {(!data?.messages || data.messages.length === 0) && !data?.game_result && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-center">
                      <Layers className="h-6 w-6 text-slate-500 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-300 font-medium">Standard Visual Screenshot</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        No structured chat sequence or game match stats detected in this image. You can view extracted text in the Extracted Text tab.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: EXTRACTED OCR TEXT */}
              {activeTab === 'ocr' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">Verbatim On-Screen Text</span>
                    <button
                      type="button"
                      onClick={handleCopyOcr}
                      disabled={!data?.screenshot.ocr_text}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 active:scale-95"
                    >
                      {copiedOcr ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedOcr ? 'Copied' : 'Copy Text'}</span>
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 font-mono text-xs text-slate-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text">
                    {data?.screenshot.ocr_text || 'No text detected in this image.'}
                  </div>
                </div>
              )}

              {/* TAB 3: INFO & TAGS */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  {/* Category Selector */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                      Category Classification
                    </label>
                    <select
                      value={data?.screenshot.category || 'other'}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
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
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                      <span className="block text-[11px] font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                        Visual Description
                      </span>
                      <p className="text-slate-200 leading-relaxed">
                        {data.screenshot.visual_description}
                      </p>
                    </div>
                  )}

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-2 text-slate-400">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                      <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <span>Date Captured</span>
                      </div>
                      <p className="mt-1 font-medium text-slate-200">
                        {data ? new Date(data.screenshot.created_at).toLocaleString() : 'N/A'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5">
                      <div className="flex items-center gap-1 text-[10px] uppercase text-slate-500">
                        <Tag className="h-3 w-3" />
                        <span>Indexed Tags</span>
                      </div>
                      <p className="mt-1 font-medium text-slate-200 truncate">
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
        <div className="border-t border-slate-800/80 px-4 py-3 pb-safe bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 py-3 text-xs font-semibold text-slate-200 hover:bg-slate-800 active:scale-[0.98]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
