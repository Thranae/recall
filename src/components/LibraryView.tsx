import React from 'react';
import {
  SlidersHorizontal,
  MessageSquare,
  Trophy,
  Plus,
  Sparkles,
  Flame,
} from 'lucide-react';
import type { Screenshot } from '../types';
import { ScreenshotCard } from './ScreenshotCard';

interface LibraryViewProps {
  screenshots: Screenshot[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onSelectScreenshot: (id: string) => void;
  onOpenUpload: () => void;
}

// Exactly 3 filter chips
const CATEGORIES = [
  { id: 'all', label: 'All', icon: SlidersHorizontal },
  { id: 'chat', label: 'Chats', icon: MessageSquare },
  { id: 'game', label: 'Gaming', icon: Trophy },
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  screenshots,
  selectedCategory,
  onSelectCategory,
  onSelectScreenshot,
  onOpenUpload,
}) => {
  const filteredScreenshots = screenshots.filter((s) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'chat') return s.category === 'chat';
    if (selectedCategory === 'game') return s.category === 'game';
    return true;
  });

  const chatCount = screenshots.filter((s) => s.category === 'chat').length;
  const gameCount = screenshots.filter((s) => s.category === 'game').length;

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-32 space-y-3.5">
      {/* 1. iOS Light Liquid 3 Filter Chips (Symmetrical Grid, Zero Clipping) */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`h-9 w-full rounded-full inline-flex items-center justify-center gap-1.5 px-2 text-xs font-bold transition-transform duration-100 ease-out active:scale-95 ${
                isSelected
                  ? 'ios-plump-primary text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),0_4px_14px_rgba(37,99,235,0.35)]'
                  : 'ios-plump-pill text-slate-700 active:text-slate-900 border border-black/[0.08]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.2] drop-shadow-xs" />
              <span className="leading-none pt-0.5 truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Visual Daily Highlights Reel (Apple Photos Style Visual Carousel) */}
      {selectedCategory === 'all' && screenshots.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0 stroke-[2.5]" />
              <span>Visual Highlights</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-semibold">Live Memory Reel</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Visual Reel Card 1: Chat Highlight */}
            <div
              onClick={() => {
                const chatItem = screenshots.find((s) => s.category === 'chat');
                if (chatItem) onSelectScreenshot(chatItem.id);
              }}
              role="button"
              tabIndex={0}
              className="relative overflow-hidden rounded-[22px] border border-blue-200/80 bg-gradient-to-b from-white/95 via-blue-50/70 to-blue-100/40 p-3.5 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_4px_16px_rgba(37,99,235,0.08)] active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-blue-500/15 text-blue-700 border border-blue-500/25">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-mono font-bold text-blue-700 border border-blue-200">
                  Relational
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight">Elena • WhatsApp</p>
              <p className="text-[10px] text-slate-600 line-clamp-2 mt-1 leading-normal font-medium">
                "I love you" ➔ "I love you too"
              </p>
            </div>

            {/* Visual Reel Card 2: Game Highlight */}
            <div
              onClick={() => {
                const gameItem = screenshots.find((s) => s.category === 'game');
                if (gameItem) onSelectScreenshot(gameItem.id);
              }}
              role="button"
              tabIndex={0}
              className="relative overflow-hidden rounded-[22px] border border-amber-200/80 bg-gradient-to-b from-white/95 via-amber-50/70 to-orange-100/40 p-3.5 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_4px_16px_rgba(245,158,11,0.08)] active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-amber-500/15 text-amber-700 border border-amber-500/25">
                  <Trophy className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-mono font-bold text-amber-800 border border-amber-200">
                  18 Kills
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight">BGMI Winner</p>
              <p className="text-[10px] text-slate-600 line-clamp-2 mt-1 leading-normal font-medium">
                Chicken Dinner • Erangel Rank #1
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Visual Memory Analytics Strip */}
      <div className="grid grid-cols-3 gap-2 rounded-[22px] ios-plump-card p-2 text-center">
        <div className="py-1">
          <p className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">Total</p>
          <p className="mt-0.5 font-mono text-base font-black text-slate-900">{screenshots.length}</p>
        </div>
        <div className="py-1 border-x border-slate-200/80">
          <p className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">Chats</p>
          <p className="mt-0.5 font-mono text-base font-black text-blue-600">{chatCount}</p>
        </div>
        <div className="py-1">
          <p className="text-[9px] uppercase tracking-wider text-slate-600 font-bold">Gaming</p>
          <p className="mt-0.5 font-mono text-base font-black text-amber-600">{gameCount}</p>
        </div>
      </div>

      {/* 4. Subheader with item count */}
      <div className="flex items-center justify-between py-1 text-xs px-1">
        <span className="font-bold text-slate-800">
          {selectedCategory === 'all'
            ? 'All Screenshots'
            : `${selectedCategory.toUpperCase()} Gallery`}
        </span>
        <span className="font-mono text-[11px] font-semibold text-slate-600">
          {filteredScreenshots.length} item{filteredScreenshots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* 5. Screenshots Grid */}
      {filteredScreenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] ios-plump-card p-8 text-center my-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] ios-plump-icon-pod text-blue-600 mb-3">
            <Sparkles className="h-7 w-7 shrink-0 drop-shadow-xs" />
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">No screenshots in this category</h3>
          <p className="mt-1.5 text-xs text-slate-500 max-w-xs leading-relaxed font-medium">
            Import new screenshots to analyze conversation flows and match statistics.
          </p>
          <button
            type="button"
            onClick={onOpenUpload}
            className="mt-5 flex h-11 items-center justify-center gap-2 rounded-full px-5 text-xs font-bold text-white ios-plump-primary active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
            <span>Import Screenshots</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
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
