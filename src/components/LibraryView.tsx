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
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-28">
      {/* iOS Liquid Glass Category Pills Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-transform duration-100 ease-out active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white font-semibold border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_3px_12px_rgba(0,122,255,0.4)]'
                  : 'bg-white/[0.08] backdrop-blur-2xl border border-white/12 text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] active:bg-white/15'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Grid Subheader */}
      <div className="flex items-center justify-between py-1 text-xs text-white/50 mb-2.5 px-0.5">
        <span className="font-semibold text-white/80">
          {selectedCategory === 'all'
            ? 'All Screenshots'
            : `${selectedCategory.toUpperCase()} Gallery`}
        </span>
        <span className="font-mono text-[11px] text-white/40">
          {screenshots.length} item{screenshots.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Screenshots Grid or iOS Glass Empty State */}
      {screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-10 text-center my-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
          <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-white/[0.08] backdrop-blur-xl text-white/60 mb-3 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <ImageIcon className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="text-sm font-bold text-white">Your library is empty</h3>
          <p className="mt-1 text-xs text-white/50 max-w-xs leading-relaxed">
            Capture or import screenshots to begin indexing chat threads, gaming stats, and visual objects.
          </p>
          <button
            type="button"
            onClick={onOpenUpload}
            className="mt-5 flex items-center gap-2 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 px-5 py-2.5 text-xs font-semibold text-white border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_16px_rgba(0,122,255,0.4)] active:scale-95 transition-transform"
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
