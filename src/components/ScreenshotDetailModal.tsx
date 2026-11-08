import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  Trophy,
  ExternalLink,
  Tag,
  Sparkles,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import type { Screenshot, ExtractedMessage, GameResult, SearchResultItem } from '../types';
import { api } from '../services/api';

interface ScreenshotDetailModalProps {
  screenshotId: string | null;
  searchResult?: SearchResultItem;
  onClose: () => void;
  onDeleted: (id: string) => void;
  onUpdated: () => void;
}

export const ScreenshotDetailModal: React.FC<ScreenshotDetailModalProps> = ({
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
  const [activeTab, setActiveTab] = useState<'structured' | 'ocr' | 'metadata'>('structured');
  const [copiedOcr, setCopiedOcr] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('other');

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
        setSelectedCategory(res.screenshot.category);
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
    if (!window.confirm('Are you sure you want to permanently delete this screenshot and all derived extracted data?')) {
      return;
    }
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

  const handleSaveCategory = async (newCat: string) => {
    setSelectedCategory(newCat);
    try {
      await api.updateMetadata(screenshotId, { category: newCat });
      if (data) {
        setData({
          ...data,
          screenshot: {
            ...data.screenshot,
            category: newCat as any,
          },
        });
      }
      setIsEditingCategory(false);
      onUpdated();
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
      <div className="relative flex flex-col lg:flex-row max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/80">
        {/* Close Button Top Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white transition-all shadow-md"
        >
          <X className="h-5 w-5" />
        </button>

        {loading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
            <Sparkles className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        )}

        {/* LEFT COLUMN: Original High-Resolution Screenshot */}
        <div className="relative flex-1 bg-black/60 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[360px] lg:min-h-full border-b lg:border-b-0 lg:border-r border-slate-800 overflow-hidden">
          <img
            src={imageUrl}
            alt={data?.screenshot.original_filename || 'Screenshot preview'}
            className="max-h-[72vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
          />

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>{data?.screenshot.original_filename}</span>
            <span>•</span>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
            >
              <span>Full resolution</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: Extracted Intelligence & Controls */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto max-h-[92vh] p-5 sm:p-7">
          <div>
            {/* Header / Category Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300 font-mono">
                  {data?.screenshot.category.toUpperCase()}
                </span>

                {isEditingCategory ? (
                  <select
                    value={selectedCategory}
                    onChange={(e) => handleSaveCategory(e.target.value)}
                    className="rounded bg-slate-800 px-2 py-1 text-xs text-white border border-slate-700 focus:outline-none"
                  >
                    <option value="chat">chat</option>
                    <option value="game">game</option>
                    <option value="product">product</option>
                    <option value="poster_document">poster_document</option>
                    <option value="other">other</option>
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingCategory(true)}
                    className="text-[11px] text-slate-400 hover:text-indigo-300 underline font-mono"
                  >
                    Change category
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Calendar className="h-3.5 w-3.5" />
                <span>{data?.screenshot.uploaded_at ? new Date(data.screenshot.uploaded_at).toLocaleDateString() : ''}</span>
              </div>
            </div>

            {/* Search Match Banner if triggered from search */}
            {searchResult && (
              <div className="mt-4 rounded-xl border border-indigo-500/40 bg-indigo-950/40 p-3.5 backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  <span>Why this screenshot matched</span>
                  <span className="ml-auto font-mono text-[10px] text-emerald-400">
                    {Math.round(searchResult.match_score * 100)}% Match
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-200 leading-relaxed font-sans">
                  {searchResult.match_explanation}
                </p>
              </div>
            )}

            {/* Visual Description */}
            {data?.screenshot.visual_description && (
              <div className="mt-4">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1">
                  Visual Understanding
                </h5>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  {data.screenshot.visual_description}
                </p>
              </div>
            )}

            {/* Tabs Selector: Structured Data vs Raw OCR */}
            <div className="mt-5 flex gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('structured')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === 'structured'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Structured Intelligence</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ocr')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === 'ocr'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Info className="h-3.5 w-3.5" />
                <span>Raw OCR Text</span>
              </button>
            </div>

            {/* TAB CONTENT 1: STRUCTURED INTELLIGENCE (CHATS OR GAME STATS) */}
            {activeTab === 'structured' && (
              <div className="mt-4 space-y-4">
                {/* 1. CHAT MESSAGES DISPLAY */}
                {data?.messages && data.messages.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Parsed Conversation ({data.messages.length} messages)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Ordered Sequence
                      </span>
                    </div>

                    <div className="space-y-2 rounded-2xl bg-slate-950/70 p-4 border border-slate-800/80 max-h-[300px] overflow-y-auto">
                      {data.messages.map((m) => {
                        const isRight = m.sender_side === 'right';
                        return (
                          <div
                            key={m.id || m.sequence_number}
                            className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}
                          >
                            <span className="text-[9px] font-mono text-slate-500 mb-0.5 px-1">
                              #{m.sequence_number} {m.sender_label || (isRight ? 'You' : 'Sender')}
                            </span>
                            <div
                              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                                isRight
                                  ? 'bg-indigo-600 text-white rounded-br-xs'
                                  : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-xs'
                              }`}
                            >
                              <p className="leading-snug">{m.message_text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {/* 2. GAME RESULT STATS DISPLAY */}
                {data?.game_result ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Trophy className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-semibold text-slate-200">
                        Extracted Match Statistics
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-2xl bg-slate-950/70 p-3.5 border border-slate-800/80">
                      <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Game</span>
                        <span className="text-sm font-bold text-white">{data.game_result.game_name}</span>
                      </div>

                      <div className="rounded-xl bg-amber-500/10 p-2.5 border border-amber-500/20">
                        <span className="text-[10px] font-mono text-amber-400/80 block uppercase">Kills</span>
                        <span className="text-base font-black text-amber-300">
                          {data.game_result.kills ?? 'N/A'}
                        </span>
                      </div>

                      <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Rank / Placement</span>
                        <span className="text-xs font-bold text-emerald-400 truncate block">
                          {data.game_result.rank || 'Recorded'}
                        </span>
                      </div>

                      {data.game_result.map_name && (
                        <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                          <span className="text-[10px] font-mono text-slate-500 block uppercase">Map</span>
                          <span className="text-xs font-semibold text-slate-200">{data.game_result.map_name}</span>
                        </div>
                      )}

                      {data.game_result.damage && (
                        <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                          <span className="text-[10px] font-mono text-slate-500 block uppercase">Damage</span>
                          <span className="text-xs font-semibold text-slate-200">{data.game_result.damage}</span>
                        </div>
                      )}

                      <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800">
                        <span className="text-[10px] font-mono text-slate-500 block uppercase">Confidence</span>
                        <span className="text-xs font-mono font-semibold text-slate-300">
                          {Math.round(data.game_result.extraction_confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* If neither chat nor game */}
                {!data?.messages?.length && !data?.game_result && (
                  <div className="rounded-xl bg-slate-950/40 p-4 text-center border border-slate-800 text-xs text-slate-400">
                    No conversation threads or game stats detected. This screenshot is indexed as{' '}
                    <span className="text-indigo-300 font-semibold">{data?.screenshot.category}</span>.
                  </div>
                )}

                {/* Tags Section */}
                {data?.screenshot.tags && data.screenshot.tags.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      <span>Search Tags</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {data.screenshot.tags.map((t, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[10px] text-slate-300 font-mono"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: RAW OCR TEXT */}
            {activeTab === 'ocr' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300">Verbatim Extracted OCR Text</span>
                  <button
                    type="button"
                    onClick={handleCopyOcr}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedOcr ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedOcr ? 'Copied' : 'Copy Text'}</span>
                  </button>
                </div>
                <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {data?.screenshot.ocr_text || 'No text extracted from this screenshot.'}
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls: Delete Screenshot */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
            <span className="text-[11px] text-slate-500 font-mono">
              ID: {screenshotId}
            </span>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Screenshot'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
