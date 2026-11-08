import React from 'react';
import { MessageSquare, Trophy, ShoppingBag, FileText, Layers, Clock, AlertCircle } from 'lucide-react';
import type { Screenshot, SearchResultItem } from '../types';
import { api } from '../services/api';

interface ScreenshotCardProps {
  screenshot: Screenshot;
  searchResult?: SearchResultItem;
  onClick: () => void;
}

export const ScreenshotCard: React.FC<ScreenshotCardProps> = ({
  screenshot,
  searchResult,
  onClick,
}) => {
  const imageUrl = api.getImageUrl(screenshot.id);

  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case 'chat':
        return {
          label: 'Chat',
          icon: MessageSquare,
          color: 'bg-gradient-to-b from-blue-500/45 to-blue-700/35 text-blue-100 border-white/30',
        };
      case 'game':
        return {
          label: 'Game Stats',
          icon: Trophy,
          color: 'bg-gradient-to-b from-amber-500/45 to-amber-700/35 text-amber-100 border-white/30',
        };
      case 'product':
        return {
          label: 'Product',
          icon: ShoppingBag,
          color: 'bg-gradient-to-b from-purple-500/45 to-purple-700/35 text-purple-100 border-white/30',
        };
      case 'poster_document':
        return {
          label: 'Document',
          icon: FileText,
          color: 'bg-gradient-to-b from-emerald-500/45 to-emerald-700/35 text-emerald-100 border-white/30',
        };
      default:
        return {
          label: 'Screenshot',
          icon: Layers,
          color: 'bg-gradient-to-b from-white/25 to-white/10 text-white border-white/30',
        };
    }
  };

  const { label, icon: CatIcon, color } = getCategoryDetails(screenshot.category);
  const tags = screenshot.tags || [];

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="relative flex flex-col overflow-hidden rounded-[24px] ios-plump-card transition-transform duration-100 ease-out active:scale-[0.97] select-none cursor-pointer"
    >
      {/* Thumbnail Aspect Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/50">
        <img
          src={imageUrl}
          alt={screenshot.original_filename}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        {/* Plumpy Liquid Glass Category & Status Badges (Zero Clipping Design) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
          {/* Category Chip */}
          <span className={`h-6 max-w-[calc(100%-36px)] shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 text-[9px] font-bold backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.45),0_3px_8px_rgba(0,0,0,0.35)] ${color}`}>
            <CatIcon className="h-3 w-3 shrink-0 drop-shadow-sm" />
            <span className="leading-none pt-0.5 truncate">{label}</span>
          </span>

          {/* Compact Unclipped Status Pod */}
          {screenshot.processing_status !== 'ready' && (
            <span
              title={`Status: ${screenshot.processing_status}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-gradient-to-b from-amber-500/40 to-amber-700/30 text-amber-200 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,0,0,0.35)]"
            >
              {screenshot.processing_status === 'processing' ? (
                <Clock className="h-3.5 w-3.5 shrink-0 animate-spin" />
              ) : screenshot.processing_status === 'queued' ? (
                <Clock className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              )}
            </span>
          )}
        </div>

        {/* Liquid Glass Search match overlay */}
        {searchResult && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-3 pt-8 backdrop-blur-[3px]">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-blue-200 truncate max-w-[70%] drop-shadow-sm">
                {searchResult.match_type.replace('_', ' ')}
              </span>
              <span className="font-mono text-[9px] text-white font-bold bg-blue-500/50 border border-blue-400/50 px-2 py-0.5 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
                {Math.round(searchResult.match_score * 100)}%
              </span>
            </div>
            {searchResult.match_explanation && (
              <p className="mt-1 text-[9px] text-white/85 line-clamp-1 font-medium leading-tight">
                {searchResult.match_explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      {!searchResult && (
        <div className="p-3 border-t border-white/[0.08] bg-white/[0.02]">
          <p className="truncate text-[11px] font-semibold text-white/90 leading-tight">
            {screenshot.original_filename}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-white/50">
            <span>{new Date(screenshot.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            {tags.length > 0 && (
              <span className="truncate max-w-[50%] text-white/45 font-medium">
                #{tags[0]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
