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
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-36 space-y-3.5">
      {/* 1. Packwise Expo Style 3D Plump Liquid Glass Filter Chips */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`h-11.5 w-full rounded-[24px] inline-flex flex-col items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-92 cursor-pointer focus:outline-none ${
                isSelected
                  ? 'ios-filter-chip-active shadow-[0_6px_20px_-2px_rgba(47,107,255,0.22)]'
                  : 'ios-filter-chip-inactive'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="inline-flex items-center justify-center gap-1.5 px-2">
                <Icon
                  className={`h-4 w-4 shrink-0 stroke-[2.4] transition-colors duration-200 ${
                    isSelected ? 'text-[#2F6BFF] drop-shadow-[0_1px_4px_rgba(47,107,255,0.35)]' : 'text-slate-400'
                  }`}
                />
                <span
                  className={`text-[12px] uppercase tracking-wider leading-none truncate transition-colors duration-200 ${
                    isSelected ? 'font-black text-[#2F6BFF]' : 'font-bold text-slate-500'
                  }`}
                >
                  {cat.label}
                </span>
              </div>
              {isSelected && <span className="ios-active-dot mt-1" />}
            </button>
          );
        })}
      </div>

      {/* 2. Visual Daily Highlights Reel (Packwise Liquid Glass Carousel) */}
      {selectedCategory === 'all' && screenshots.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0 stroke-[2.5]" />
              <span>Visual Highlights</span>
            </span>
            <span className="text-[10px] text-[#2F6BFF] font-mono font-bold">Live Memory Reel</span>
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
              className="relative overflow-hidden rounded-[26px] ios-glass-card p-4 active:scale-[0.96] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[12px] nav-icon-pod-active text-[#2F6BFF]">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                  </span>
                  <span className="rounded-full bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 text-[9px] font-mono font-extrabold text-[#2F6BFF]">
                    Relational
                  </span>
                </div>
                <p className="text-xs font-black text-slate-900 leading-tight">Elena • WhatsApp</p>
                <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-normal font-semibold">
                  "I love you" ➔ "I love you too"
                </p>
              </div>
            </div>

            {/* Visual Reel Card 2: Game Highlight */}
            <div
              onClick={() => {
                const gameItem = screenshots.find((s) => s.category === 'game');
                if (gameItem) onSelectScreenshot(gameItem.id);
              }}
              role="button"
              tabIndex={0}
              className="relative overflow-hidden rounded-[26px] ios-glass-card p-4 active:scale-[0.96] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-amber-500/10 border border-amber-500/20 text-amber-600">
                    <Trophy className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                  </span>
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[9px] font-mono font-extrabold text-amber-700">
                    18 Kills
                  </span>
                </div>
                <p className="text-xs font-black text-slate-900 leading-tight">BGMI Winner</p>
                <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-normal font-semibold">
                  Chicken Dinner • Erangel Rank #1
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Visual Memory Analytics Strip */}
      <div className="grid grid-cols-3 gap-2 rounded-[26px] ios-glass-card p-3 text-center">
        <div className="py-1">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Total</p>
          <p className="mt-0.5 font-mono text-base font-black text-slate-900">{screenshots.length}</p>
        </div>
        <div className="py-1 border-x border-slate-200/60">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Chats</p>
          <p className="mt-0.5 font-mono text-base font-black text-[#2F6BFF]">{chatCount}</p>
        </div>
        <div className="py-1">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">Gaming</p>
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
