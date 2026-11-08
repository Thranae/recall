import React from 'react';
import {
  SlidersHorizontal,
  MessageSquare,
  Trophy,
  ShoppingBag,
  FileText,
  Image as ImageIcon,
  Plus,
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
  { id: 'product', label: 'Products', icon: ShoppingBag },
  { id: 'poster_document', label: 'Documents', icon: FileText },
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  screenshots,
  selectedCategory,
  onSelectCategory,
  onSelectScreenshot,
  onOpenUpload,
}) => {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-28">
      {/* Horizontally scrollable category pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid Subheader */}
      <div className="flex items-center justify-between py-1 text-xs text-slate-400 mb-2">
        <span className="font-semibold text-slate-200">
          {selectedCategory === 'all'
            ? 'All Screenshots'
            : `${selectedCategory.toUpperCase()} Gallery`}
        </span>
        <span className="font-mono text-[11px] text-slate-500">
          {screenshots.length} item{screenshots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Screenshots Grid or Empty State */}
      {screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center my-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-slate-500 mb-3 border border-slate-800">
            <ImageIcon className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-white">Your library is empty</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-xs">
            Capture or import screenshots to begin indexing chat threads, gaming stats, and visual objects.
          </p>
          <button
            type="button"
            onClick={onOpenUpload}
            className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Import Screenshots</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {screenshots.map((s) => (
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
