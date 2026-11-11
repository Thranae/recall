import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  MessageSquare,
  Layers,
  Plus,
  Images,
  BarChart3,
  Trophy,
  Trash2,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import type { Screenshot, VaultInsightsSummary } from '../types';
import { ScreenshotCard } from './ScreenshotCard';

interface LibraryViewProps {
  screenshots: Screenshot[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onSelectScreenshot: (id: string) => void;
  onOpenUpload: () => void;
  onRefresh?: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: SlidersHorizontal },
  { id: 'chat', label: 'Chats', icon: MessageSquare },
  { id: 'other', label: 'Other', icon: Layers },
];

const VISUAL_FILTERS: Array<{
  id: string;
  label: string;
  swatch?: string;
  pattern: RegExp;
}> = [
  { id: 'people', label: 'People', pattern: /\b(boy|girl|man|woman|kid|child|person|people|portrait|selfie|face)\b/i },
  { id: 'outfits', label: 'Outfits', pattern: /\b(shirt|t-shirt|tshirt|tee|hoodie|jacket|dress|jeans|pants|shoes|sneakers|outfit|apparel)\b/i },
  { id: 'black', label: 'Black', swatch: '#172B4D', pattern: /\bblack\b/i },
  { id: 'blue', label: 'Blue', swatch: '#3478F6', pattern: /\b(blue|navy|denim|cyan)\b/i },
  { id: 'red', label: 'Red', swatch: '#EF4444', pattern: /\b(red|crimson|maroon)\b/i },
  { id: 'white', label: 'White', swatch: '#FFFFFF', pattern: /\bwhite\b/i },
  { id: 'green', label: 'Green', swatch: '#10B981', pattern: /\b(green|olive|emerald)\b/i },
  { id: 'yellow', label: 'Yellow', swatch: '#F59E0B', pattern: /\b(yellow|gold|amber)\b/i },
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  screenshots,
  selectedCategory,
  onSelectCategory,
  onSelectScreenshot,
  onOpenUpload,
  onRefresh,
}) => {
  const [activeVisualFilter, setActiveVisualFilter] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<VaultInsightsSummary | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);

  const chatCount = screenshots.filter((s) => s.category === 'chat').length;
  const otherCount = screenshots.filter((s) => s.category !== 'chat').length;

  const filteredScreenshots = useMemo(() => {
    const activeRule = VISUAL_FILTERS.find((f) => f.id === activeVisualFilter);
    return screenshots.filter((s) => {
      if (selectedCategory === 'chat' && s.category !== 'chat') return false;
      if (selectedCategory === 'other' && s.category === 'chat') return false;
      if (activeRule) {
        const text = `${s.visual_description || ''} ${(s.tags || []).join(' ')} ${s.ocr_text || ''}`;
        return activeRule.pattern.test(text);
      }
      return true;
    });
  }, [screenshots, selectedCategory, activeVisualFilter]);

  const handleToggleInsights = async () => {
    const next = !showInsights;
    setShowInsights(next);
    if (next && !insights && screenshots.length > 0) {
      setLoadingInsights(true);
      try {
        const res = await api.getVaultInsights();
        setInsights(res);
      } catch (err) {
        console.warn('Could not load insights:', err);
      } finally {
        setLoadingInsights(false);
      }
    }
  };

  const handleCleanDuplicates = async () => {
    if (!insights || insights.duplicate_groups.length === 0 || cleaningDuplicates) return;
    setCleaningDuplicates(true);
    try {
      const idsToDelete = insights.duplicate_groups.flatMap((g) => g.duplicates.map((d) => d.id));
      for (const id of idsToDelete) {
        await api.deleteScreenshot(id);
      }
      const refreshed = await api.getVaultInsights();
      setInsights(refreshed);
      onRefresh?.();
    } catch (err) {
      console.error('Duplicate cleanup failed:', err);
    } finally {
      setCleaningDuplicates(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-2 pb-36 space-y-4">
      {/* 1. Symmetrical Liquid Glass Filter Chips (3 Chips, Generous Width, Full Text Visibility) */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const count =
            cat.id === 'all'
              ? screenshots.length
              : cat.id === 'chat'
                ? chatCount
                : otherCount;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`liquid-filter-chip w-full flex items-center justify-center gap-1.5 px-3 py-2 cursor-pointer ${
                isSelected ? 'liquid-filter-chip-active' : ''
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 stroke-[2.2] ${isSelected ? 'text-[#3478F6]' : 'text-slate-500'}`} />
              <span className="whitespace-nowrap text-[12px] font-semibold">{cat.label}</span>
              <span className={`text-[10px] font-mono ml-0.5 px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-[#B9D9FF]/40 text-[#3478F6] font-bold' : 'bg-slate-200/60 text-slate-500 font-semibold'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tactile Color & Visual Subject Swatch Strip (Preserves 3 Main Filter Chips Above) */}
      {screenshots.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          {activeVisualFilter && (
            <button
              type="button"
              onClick={() => setActiveVisualFilter(null)}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#172B4D] text-white px-2.5 py-1 text-[10.5px] font-semibold active:scale-95 transition-transform cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
          {VISUAL_FILTERS.map((vf) => {
            const isActive = activeVisualFilter === vf.id;
            return (
              <button
                key={vf.id}
                type="button"
                onClick={() => setActiveVisualFilter(isActive ? null : vf.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer ${
                  isActive
                    ? 'bg-[#3478F6] text-white shadow-xs'
                    : 'liquid-glass-pill text-slate-600'
                }`}
              >
                {vf.swatch && (
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 border ${
                      vf.id === 'white' ? 'border-slate-300' : 'border-white/70'
                    }`}
                    style={{ backgroundColor: vf.swatch }}
                  />
                )}
                <span>{vf.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Library Status Strip */}
      <div className="flex items-center justify-between px-1">
        <h2 className="font-bold text-[#172B4D] text-[15px] tracking-tight">
          {selectedCategory === 'all'
            ? 'All Screenshots'
            : selectedCategory === 'chat'
              ? 'Conversations'
              : 'Other Screenshots'}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium font-mono">
            {filteredScreenshots.length} {filteredScreenshots.length === 1 ? 'item' : 'items'}
          </span>
          {screenshots.length > 0 && (
            <button
              type="button"
              onClick={handleToggleInsights}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold transition-all active:scale-95 cursor-pointer ${
                showInsights
                  ? 'bg-[#3478F6] text-white shadow-xs'
                  : 'liquid-glass-pill text-[#3478F6]'
              }`}
            >
              <BarChart3 className="h-3 w-3 stroke-[2.3]" />
              <span>Insights</span>
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Vault Insights & Duplicate Radar Panel */}
      <AnimatePresence>
        {showInsights && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="liquid-glass-card rounded-[22px] p-4 space-y-3"
          >
            {loadingInsights || !insights ? (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#3478F6]" />
                <span>Analyzing library insights...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-[14px] bg-white/75 border border-white p-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Chats</p>
                    <p className="text-sm font-bold text-[#172B4D] font-mono">
                      {insights.category_counts.chat || 0}
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-white/75 border border-white p-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-center gap-1">
                      <Trophy className="h-2.5 w-2.5 text-amber-600" />
                      <span>Best Kills</span>
                    </p>
                    <p className="text-sm font-bold text-amber-700 font-mono">
                      {insights.gaming.best_kills}
                    </p>
                  </div>
                  <div className="rounded-[14px] bg-white/75 border border-white p-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Wins</p>
                    <p className="text-sm font-bold text-emerald-700 font-mono">
                      {insights.gaming.chicken_dinners}
                    </p>
                  </div>
                </div>

                {insights.top_colors.length > 0 && (
                  <div className="flex items-center justify-between gap-2 text-[11px] px-0.5">
                    <span className="font-semibold text-slate-500">Top Colors</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {insights.top_colors.slice(0, 4).map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => {
                            const matched = VISUAL_FILTERS.find((f) => f.id === c.color);
                            if (matched) setActiveVisualFilter(matched.id);
                          }}
                          className="rounded-full bg-white/80 border border-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 capitalize hover:text-[#3478F6] cursor-pointer"
                        >
                          {c.color} ({c.count})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-[14px] bg-white/75 border border-white px-3 py-2">
                  <div className="flex items-center gap-2 text-[11px]">
                    {insights.duplicate_count > 0 ? (
                      <>
                        <Trash2 className="h-3.5 w-3.5 text-amber-600" />
                        <span className="font-semibold text-slate-700">
                          {insights.duplicate_count} near-duplicate{insights.duplicate_count === 1 ? '' : 's'} found
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-semibold text-slate-600">No duplicate clutter</span>
                      </>
                    )}
                  </div>
                  {insights.duplicate_count > 0 && (
                    <button
                      type="button"
                      onClick={handleCleanDuplicates}
                      disabled={cleaningDuplicates}
                      className="rounded-full bg-rose-500 text-white px-2.5 py-1 text-[10px] font-bold active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {cleaningDuplicates ? 'Cleaning...' : 'Clean All'}
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Screenshots Gallery Grid */}
      {filteredScreenshots.length === 0 && activeVisualFilter && screenshots.length > 0 ? (
        <div className="liquid-glass-card rounded-[24px] p-6 text-center my-4 space-y-3">
          <p className="text-sm font-bold text-[#172B4D]">No images match "{activeVisualFilter}"</p>
          <p className="text-xs text-slate-500">
            Try clearing the visual filter or tap Re-analyze in Settings to index older photos.
          </p>
          <button
            type="button"
            onClick={() => setActiveVisualFilter(null)}
            className="inline-flex h-9 items-center justify-center rounded-full liquid-glass-pill px-4 text-xs font-semibold text-[#3478F6] active:scale-95 cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      ) : filteredScreenshots.length === 0 ? (
        <div className="liquid-glass-card rounded-[26px] p-6 text-center my-4 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] liquid-icon-pod text-[#3478F6]">
            <Images className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#172B4D] tracking-tight">Your Personal Knowledge Base</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed font-normal">
              Drop chat conversations, gaming scoreboards, flight tickets, or receipts. Recall extracts and connects every message and stat automatically.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 text-left">
            <div className="rounded-[16px] bg-white/70 border border-white/90 p-2.5">
              <span className="text-[10px] font-bold text-[#3478F6] uppercase tracking-wider block">Relational</span>
              <p className="text-[11px] font-semibold text-slate-700 mt-0.5 leading-tight">Chat Thread Links</p>
            </div>
            <div className="rounded-[16px] bg-white/70 border border-white/90 p-2.5">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Stats</span>
              <p className="text-[11px] font-semibold text-slate-700 mt-0.5 leading-tight">Score & Kills</p>
            </div>
            <div className="rounded-[16px] bg-white/70 border border-white/90 p-2.5">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Private</span>
              <p className="text-[11px] font-semibold text-slate-700 mt-0.5 leading-tight">User Scoped</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenUpload}
            className="w-full flex h-11 items-center justify-center gap-2 rounded-full px-5 text-xs font-semibold text-white liquid-btn-primary active:scale-95 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Upload First Screenshot</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5">
          {filteredScreenshots.map((s) => (
            <ScreenshotCard
              key={s.id}
              screenshot={s}
              onClick={() => onSelectScreenshot(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
