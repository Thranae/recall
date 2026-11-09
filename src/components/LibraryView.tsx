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
      {/* 1. iOS Native Unified Segmented Control */}
      <div className="ios-segmented-control w-full">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          const count = cat.id === 'all' ? screenshots.length : cat.id === 'chat' ? chatCount : gameCount;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`ios-segment-btn ${isSelected ? 'ios-segment-btn-active' : ''}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
              <span>{cat.label}</span>
              <span
                className={`text-[11px] font-mono px-1.5 py-0.2 rounded-full leading-none ${
                  isSelected
                    ? 'bg-slate-100 text-slate-700 font-bold'
                    : 'text-slate-400 font-medium'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Clean Library Status & Sort Strip */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-semibold text-slate-800">
          {selectedCategory === 'all'
            ? 'All Screenshots'
            : selectedCategory === 'chat'
            ? 'Conversation History'
            : 'Match Summaries'}
        </span>
        <span className="text-[12px] text-slate-500 font-medium">
          {filteredScreenshots.length} {filteredScreenshots.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* 3. Screenshots Gallery Grid */}
      {filteredScreenshots.length === 0 ? (
        <div className="ios-glass-card flex flex-col items-center justify-center rounded-[28px] p-8 text-center my-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl ios-glass-icon-pod mb-3 text-[#2F6BFF]">
            <Sparkles className="h-7 w-7 stroke-[2.2]" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">No screenshots in this view</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-xs leading-relaxed font-medium">
            Upload conversation captures, game victory screens, or receipts to index them automatically.
          </p>
          <button
            type="button"
            onClick={onOpenUpload}
            className="mt-5 flex h-11 items-center justify-center gap-2 rounded-full px-6 text-xs font-black text-white ios-liquid-primary active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.8]" />
            <span>Upload Screenshot</span>
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
