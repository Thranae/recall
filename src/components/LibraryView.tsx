import React from 'react';
import {
  SlidersHorizontal,
  MessageSquare,
  Layers,
  Plus,
  Images,
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
  { id: 'other', label: 'Other', icon: Layers },
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  screenshots,
  selectedCategory,
  onSelectCategory,
  onSelectScreenshot,
  onOpenUpload,
}) => {
  const chatCount = screenshots.filter((s) => s.category === 'chat').length;
  const otherCount = screenshots.filter((s) => s.category !== 'chat').length;

  const filteredScreenshots = screenshots.filter((s) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'chat') return s.category === 'chat';
    if (selectedCategory === 'other') return s.category !== 'chat';
    return true;
  });

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
        <span className="text-xs text-slate-500 font-medium font-mono">
          {filteredScreenshots.length} {filteredScreenshots.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* 3. Screenshots Gallery Grid */}
      {filteredScreenshots.length === 0 ? (
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
