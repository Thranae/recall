import React from 'react';
import {
  SlidersHorizontal,
  MessageSquare,
  Trophy,
  Plus,
  Sparkles,
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
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-36 space-y-4">
      {/* 1. Packwise Expo Plump Liquid Glass Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const count = cat.id === 'all' ? screenshots.length : cat.id === 'chat' ? chatCount : gameCount;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`liquid-filter-chip ${
                isSelected ? 'liquid-filter-chip-active' : ''
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 stroke-[2.4] ${isSelected ? 'text-white' : 'text-[#2F6BFF]'}`} />
              <span>{cat.label}</span>
              <span
                className={`chip-count-badge ${
                  isSelected ? 'chip-count-badge-active' : 'chip-count-badge-inactive'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Library Status & Sort Strip */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-black text-slate-900 text-sm">
          {selectedCategory === 'all'
            ? 'All Screenshots'
            : selectedCategory === 'chat'
              ? 'Conversation History'
              : 'Match Summaries'}
        </span>
        <span className="text-xs text-slate-700 font-bold">
          {filteredScreenshots.length} {filteredScreenshots.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* 3. Screenshots Gallery Grid */}
      {filteredScreenshots.length === 0 ? (
        <div className="liquid-glass-card flex flex-col items-center justify-center rounded-[28px] p-8 text-center my-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] liquid-icon-pod mb-3 text-[#2F6BFF]">
            <Sparkles className="h-8 w-8 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-black text-slate-900 tracking-tight">No screenshots in this view</h3>
          <p className="mt-1 text-xs text-slate-600 max-w-xs leading-relaxed font-semibold">
            Upload conversation captures, game victory screens, or receipts to index them automatically.
          </p>
          <button
            type="button"
            onClick={onOpenUpload}
            className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full px-6 text-xs font-black text-white liquid-btn-primary active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.8]" />
            <span>Upload Screenshot</span>
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
