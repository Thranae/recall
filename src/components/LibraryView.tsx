import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  CheckCircle2,
  Loader2,
  ArrowRight,
  CheckSquare,
  Pencil,
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
  filterQuery?: string;
  onFilterChange?: (q: string) => void;
  onQuickSearch?: (query: string) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: SlidersHorizontal },
  { id: 'chat', label: 'Chats', icon: MessageSquare },
  { id: 'other', label: 'Other', icon: Layers },
];

const QUICK_FILLER_WORDS = new Set(['a', 'an', 'the', 'in', 'on', 'with', 'of', 'for', 'and', 'to', 'me', 'my', 'find', 'show']);

export const LibraryView: React.FC<LibraryViewProps> = ({
  screenshots,
  selectedCategory,
  onSelectCategory,
  onSelectScreenshot,
  onOpenUpload,
  onRefresh,
  filterQuery = '',
  onFilterChange,
  onQuickSearch,
}) => {
  const [showInsights, setShowInsights] = useState(false);
  const [insights, setInsights] = useState<VaultInsightsSummary | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [cleaningDuplicates, setCleaningDuplicates] = useState(false);

  // Multi-Select & Batch Delete State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // Single Screenshot Renaming State
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Synchronize deletedIds cleanup when screenshots list updates from parent
  useEffect(() => {
    if (deletedIds.size > 0) {
      setDeletedIds((prev) => {
        const serverIds = new Set(screenshots.map((s) => s.id));
        const next = new Set<string>();
        for (const id of prev) {
          if (serverIds.has(id)) {
            next.add(id);
          }
        }
        return next;
      });
    }
  }, [screenshots, deletedIds.size]);

  const chatCount = screenshots.filter((s) => s.category === 'chat').length;
  const otherCount = screenshots.filter((s) => s.category !== 'chat').length;

  const filteredScreenshots = useMemo(() => {
    const raw = filterQuery.trim().toLowerCase();
    const tokens = raw
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0 && !QUICK_FILLER_WORDS.has(t));

    return screenshots
      .filter((s) => !deletedIds.has(s.id))
      .filter((s) => {
        if (selectedCategory === 'chat' && s.category !== 'chat') return false;
        if (selectedCategory === 'other' && s.category === 'chat') return false;
        if (tokens.length > 0) {
          const haystack = `${s.original_filename || ''} ${s.visual_description || ''} ${(s.tags || []).join(' ')} ${s.ocr_text || ''}`.toLowerCase();
          return tokens.every((tok) => haystack.includes(tok));
        }
        return true;
      });
  }, [screenshots, selectedCategory, filterQuery, deletedIds]);

  const handleCardLongPress = useCallback((id: string) => {
    setIsSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    const visibleIds = filteredScreenshots.map((s) => s.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  }, [filteredScreenshots, selectedIds]);

  const handleOpenRename = useCallback(() => {
    if (selectedIds.size !== 1) return;
    const targetId = Array.from(selectedIds)[0];
    const targetScreenshot = screenshots.find((s) => s.id === targetId);
    if (!targetScreenshot) return;
    setRenameTarget({ id: targetId, name: targetScreenshot.original_filename });
    setRenameInput(targetScreenshot.original_filename);
  }, [selectedIds, screenshots]);

  const handleSaveRename = async () => {
    if (!renameTarget || !renameInput.trim() || isRenaming) return;
    const trimmed = renameInput.trim();
    if (trimmed === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    setIsRenaming(true);
    try {
      await api.renameScreenshot(renameTarget.id, trimmed);
      setRenameTarget(null);
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      onRefresh?.();
    } catch (err) {
      console.error('Failed to rename screenshot:', err);
      alert('Failed to rename screenshot');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleConfirmDelete = async () => {
    if (selectedIds.size === 0 || isDeleting) return;

    const idsToDelete = Array.from(selectedIds);
    setIsDeleting(true);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {}
    }

    // 1. Immediately trigger the subtle exit animation on the selected cards
    setDeletedIds((prev) => new Set([...prev, ...idsToDelete]));

    // 2. Immediately dismiss selection mode so UI cleanly transitions back
    setIsSelectionMode(false);
    setSelectedIds(new Set());

    try {
      await Promise.all(idsToDelete.map((id) => api.deleteScreenshot(id)));
    } catch (err) {
      console.error('Failed to batch delete screenshots:', err);
    } finally {
      setIsDeleting(false);
      onRefresh?.();
    }
  };

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
          {isSelectionMode ? (
            <button
              type="button"
              onClick={handleExitSelectionMode}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold text-[#3478F6] bg-blue-50/80 border border-blue-200/60 active:scale-95 transition-all cursor-pointer"
            >
              <span>Done</span>
            </button>
          ) : (
            <>
              <span className="text-xs text-slate-500 font-medium font-mono">
                {filteredScreenshots.length} {filteredScreenshots.length === 1 ? 'item' : 'items'}
              </span>
              {filteredScreenshots.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsSelectionMode(true)}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold liquid-glass-pill text-[#3478F6] active:scale-95 cursor-pointer"
                >
                  <CheckSquare className="h-3 w-3 stroke-[2.3]" />
                  <span>Select</span>
                </button>
              )}
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
            </>
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
                          onClick={() => onFilterChange?.(c.color)}
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
      {filteredScreenshots.length === 0 && filterQuery.trim() && screenshots.length > 0 ? (
        <div className="liquid-glass-card rounded-[24px] p-6 text-center my-4 space-y-3">
          <p className="text-sm font-bold text-[#172B4D]">No quick matches for "{filterQuery.trim()}"</p>
          <p className="text-xs text-slate-500">
            Run Deep AI Search for semantic synonyms, chat flow sequences, or numeric game stats.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onFilterChange?.('')}
              className="inline-flex h-9 items-center justify-center rounded-full liquid-glass-pill px-4 text-xs font-semibold text-slate-600 active:scale-95 cursor-pointer"
            >
              Clear
            </button>
            {onQuickSearch && (
              <button
                type="button"
                onClick={() => onQuickSearch(filterQuery.trim())}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-full liquid-btn-primary px-4 text-xs font-semibold text-white active:scale-95 cursor-pointer"
              >
                <span>Deep AI Search</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
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
        <div className="relative w-full">
          <div className="grid grid-cols-2 gap-3.5 relative">
            <AnimatePresence mode="popLayout">
              {filteredScreenshots.map((s) => (
                <motion.div
                  key={s.id}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.90,
                    transition: {
                      duration: 0.20,
                      ease: [0.32, 0.72, 0, 1],
                    },
                  }}
                  transition={{
                    layout: {
                      type: 'spring',
                      stiffness: 380,
                      damping: 32,
                      mass: 0.8,
                    },
                  }}
                  className="w-full"
                >
                  <ScreenshotCard
                    screenshot={s}
                    onClick={() => onSelectScreenshot(s.id)}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(s.id)}
                    onToggleSelect={() => handleToggleSelect(s.id)}
                    onLongPress={() => handleCardLongPress(s.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 4. Minimal Floating Multi-Select Action Bar */}
      <AnimatePresence>
        {isSelectionMode && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="fixed bottom-22 inset-x-4 max-w-sm mx-auto z-50 pointer-events-auto select-none"
          >
            <div className="relative overflow-hidden rounded-[24px] bg-white/95 backdrop-blur-2xl border border-white/90 px-3.5 py-2.5 shadow-[0_12px_32px_rgba(23,43,77,0.16)]">
              {/* Top Specular Hairline */}
              <div
                className="pointer-events-none absolute top-0 left-6 right-6 h-px z-10"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 50%, transparent 100%)',
                }}
              />

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full bg-[#3478F6] text-white text-[11px] font-bold font-mono shadow-xs">
                    {selectedIds.size}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-[11.5px] font-semibold text-[#3478F6] active:scale-95 transition-all cursor-pointer"
                  >
                    {filteredScreenshots.length > 0 &&
                    selectedIds.size === filteredScreenshots.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {selectedIds.size === 1 && (
                    <button
                      type="button"
                      onClick={handleOpenRename}
                      className="flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 text-xs font-semibold text-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      <Pencil className="h-3 w-3 stroke-[2.2] text-[#3478F6]" />
                      <span>Rename</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleExitSelectionMode}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 active:scale-95 transition-all cursor-pointer"
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    disabled={selectedIds.size === 0 || isDeleting}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 transition-all cursor-pointer ${
                      selectedIds.size === 0
                        ? 'bg-rose-300 opacity-60 cursor-not-allowed'
                        : 'bg-rose-500 hover:bg-rose-600'
                    }`}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5 stroke-[2.3]" />
                    )}
                    <span>Delete {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Rename Screenshot Modal */}
      <AnimatePresence>
        {renameTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="w-full max-w-sm rounded-[24px] bg-white/95 backdrop-blur-2xl border border-white p-5 shadow-2xl space-y-4"
            >
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#172B4D]">Rename Screenshot</h3>
                <p className="text-xs text-slate-500">
                  Give this screenshot a descriptive name so you can search and find it easily anytime.
                </p>
              </div>

              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setRenameTarget(null);
                }}
                autoFocus
                placeholder="e.g. Flight Ticket to Tokyo..."
                className="w-full rounded-xl bg-white border border-[#3478F6] px-3.5 py-2 text-xs font-bold text-[#172B4D] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#3478F6]/25"
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRenameTarget(null)}
                  disabled={isRenaming}
                  className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRename}
                  disabled={isRenaming || !renameInput.trim()}
                  className="flex items-center gap-1.5 rounded-full bg-[#3478F6] hover:bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRenaming ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
