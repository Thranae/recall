import React from 'react';
import {
  SlidersHorizontal,
  MessageSquare,
  Trophy,
  Plus,
  Sparkles as VisualSpark,
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

// Exactly 3 filter chips as requested
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
  // Filter screenshots based on selected category
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
      {/* 1. iOS 27 Exactly 3 Filter Chips (Symmetrical 3-Column Grid, Zero Clipping) */}
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
                  ? 'ios-plump-primary text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),0_4px_16px_rgba(0,122,255,0.5)]'
                  : 'ios-plump-pill text-white/75 active:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 drop-shadow-sm" />
              <span className="leading-none pt-0.5 truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Visual Daily Highlights Reel (Apple Photos Style Visual Carousel) */}
      {selectedCategory === 'all' && screenshots.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Visual Highlights</span>
            </span>
            <span className="text-[10px] text-white/40 font-mono">Live Memory Reel</span>
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
              className="relative overflow-hidden rounded-[22px] border border-blue-400/30 bg-gradient-to-b from-blue-600/25 via-indigo-900/30 to-black/70 p-3.5 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35),0_6px_20px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-blue-500/30 text-blue-200 border border-blue-400/40">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                </span>
                <span className="rounded-full bg-blue-500/25 px-2 py-0.5 text-[9px] font-mono text-blue-200 border border-blue-400/30">
                  Relational
                </span>
              </div>
              <p className="text-xs font-bold text-white leading-tight">Elena • WhatsApp</p>
              <p className="text-[10px] text-white/70 line-clamp-2 mt-1 leading-normal">
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
              className="relative overflow-hidden rounded-[22px] border border-amber-400/30 bg-gradient-to-b from-amber-600/25 via-orange-950/30 to-black/70 p-3.5 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35),0_6px_20px_rgba(0,0,0,0.4)] active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-amber-500/30 text-amber-200 border border-amber-400/40">
                  <Trophy className="h-3.5 w-3.5 shrink-0" />
                </span>
                <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[9px] font-mono text-amber-200 border border-amber-400/30 font-bold">
                  18 Kills
                </span>
              </div>
              <p className="text-xs font-bold text-white leading-tight">BGMI Winner</p>
              <p className="text-[10px] text-white/70 line-clamp-2 mt-1 leading-normal">
                Chicken Dinner • Erangel Rank #1
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Visual Memory Strip / Analytics Pills */}
      <div className="grid grid-cols-3 gap-2 rounded-[22px] ios-plump-card p-2 text-center">
        <div className="py-1">
          <p className="text-[9px] uppercase tracking-wider text-white/45 font-bold">Total</p>
          <p className="mt-0.5 font-mono text-base font-black text-white">{screenshots.length}</p>
        </div>
        <div className="py-1 border-x border-white/10">
          <p className="text-[9px] uppercase tracking-wider text-white/45 font-bold">Chats</p>
          <p className="mt-0.5 font-mono text-base font-black text-blue-400">{chatCount}</p>
        </div>
        <div className="py-1">
          <p className="text-[9px] uppercase tracking-wider text-white/45 font-bold">Gaming</p>
          <p className="mt-0.5 font-mono text-base font-black text-amber-400">{gameCount}</p>
        </div>
      </div>

      {/* 4. Subheader with item count */}
      <div className="flex items-center justify-between py-1 text-xs text-white/50 px-1">
        <span className="font-bold text-white/85">
          {selectedCategory === 'all'
            ? 'All Screenshots'
            : `${selectedCategory.toUpperCase()} Gallery`}
        </span>
        <span className="font-mono text-[11px] text-white/45">
          {filteredScreenshots.length} item{filteredScreenshots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* 5. Screenshots Grid or Visual Showcase Hub */}
      {filteredScreenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] ios-plump-card p-8 text-center my-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] ios-plump-icon-pod text-blue-400 mb-3">
            <VisualSpark className="h-7 w-7 shrink-0 drop-shadow-sm" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">No screenshots in this category</h3>
          <p className="mt-1.5 text-xs text-white/55 max-w-xs leading-relaxed">
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
