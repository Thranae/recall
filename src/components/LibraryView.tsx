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
  { id: 'poster_document', label: 'Docs', icon: FileText },
];

export const LibraryView: React.FC<LibraryViewProps> = ({
  screenshots,
  selectedCategory,
  onSelectCategory,
  onSelectScreenshot,
  onOpenUpload,
}) => {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-32">
      {/* iOS 27 Unclipped Filter Chips (Clean Multi-Chip Wrap, Zero Clipping) */}
      <div className="flex flex-wrap items-center gap-2 mb-3 px-0.5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`h-9 shrink-0 inline-flex items-center justify-center gap-2 rounded-full px-3.5 text-xs font-semibold transition-transform duration-100 ease-out active:scale-95 ${
                isSelected
                  ? 'ios-plump-primary text-white'
                  : 'ios-plump-pill text-white/80 active:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 drop-shadow-sm" />
              <span className="leading-none pt-0.5 whitespace-nowrap">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid Subheader */}
      <div className="flex items-center justify-between py-1 text-xs text-white/50 mb-3 px-1">
        <span className="font-semibold text-white/85">
          {selectedCategory === 'all'
            ? 'All Screenshots'
            : `${selectedCategory.toUpperCase()} Gallery`}
        </span>
        <span className="font-mono text-[11px] text-white/45">
          {screenshots.length} item{screenshots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Screenshots Grid or iOS Glass Empty State */}
      {screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[28px] ios-plump-card p-10 text-center my-6">
          <div className="flex h-15 w-15 items-center justify-center rounded-[20px] ios-plump-icon-pod text-blue-400 mb-3.5">
            <ImageIcon className="h-7 w-7 shrink-0 drop-shadow-sm" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Your library is empty</h3>
          <p className="mt-1.5 text-xs text-white/55 max-w-xs leading-relaxed">
            Capture or import screenshots to begin indexing chat threads, gaming stats, and visual objects.
          </p>
          <button
            type="button"
            onClick={onOpenUpload}
            className="mt-6 flex h-11 items-center justify-center gap-2 rounded-full px-5 text-xs font-semibold text-white ios-plump-primary active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
            <span>Import Screenshots</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
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
