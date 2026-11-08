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
          color: 'bg-gradient-to-b from-blue-600 to-blue-700 text-white border-white/40',
        };
      case 'game':
        return {
          label: 'Game Stats',
          icon: Trophy,
          color: 'bg-gradient-to-b from-amber-500 to-amber-600 text-white border-white/40',
        };
      case 'product':
        return {
          label: 'Product',
          icon: ShoppingBag,
          color: 'bg-gradient-to-b from-purple-600 to-purple-700 text-white border-white/40',
        };
      case 'poster_document':
        return {
          label: 'Document',
          icon: FileText,
          color: 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white border-white/40',
        };
      default:
        return {
          label: 'Screenshot',
          icon: Layers,
          color: 'bg-gradient-to-b from-slate-700 to-slate-800 text-white border-white/40',
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
      className="relative flex flex-col overflow-hidden rounded-[24px] ios-plump-card border border-black/[0.06] shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-transform duration-100 ease-out active:scale-[0.97] select-none cursor-pointer"
    >
      {/* Thumbnail Aspect Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
        <img
          src={imageUrl}
          alt={screenshot.original_filename}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        {/* Plumpy Liquid Glass Category & Status Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 pointer-events-none">
          {/* Category Chip */}
          <span className={`h-6 max-w-[calc(100%-36px)] shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 text-[9px] font-bold shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,0,0,0.15)] ${color}`}>
            <CatIcon className="h-3 w-3 shrink-0 stroke-[2.2] drop-shadow-xs" />
            <span className="leading-none pt-0.5 truncate">{label}</span>
          </span>

          {/* Compact Status Pod */}
          {screenshot.processing_status !== 'ready' && (
            <span
              title={`Status: ${screenshot.processing_status}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-800 shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_2px_6px_rgba(245,158,11,0.2)]"
            >
              {screenshot.processing_status === 'processing' ? (
                <Clock className="h-3.5 w-3.5 shrink-0 animate-spin stroke-[2.2]" />
              ) : screenshot.processing_status === 'queued' ? (
                <Clock className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 stroke-[2.2]" />
              )}
            </span>
          )}
        </div>

        {/* Search match overlay */}
        {searchResult && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/60 to-transparent p-3 pt-8 backdrop-blur-xs">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-white truncate max-w-[70%] drop-shadow-xs">
                {searchResult.match_type.replace('_', ' ')}
              </span>
              <span className="font-mono text-[9px] text-white font-bold bg-blue-600 px-2 py-0.5 rounded-full shadow-xs">
                {Math.round(searchResult.match_score * 100)}%
              </span>
            </div>
            {searchResult.match_explanation && (
              <p className="mt-1 text-[9px] text-white/90 line-clamp-1 font-semibold leading-tight">
                {searchResult.match_explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      {!searchResult && (
        <div className="p-3 border-t border-black/[0.04] bg-white/75">
          <p className="truncate text-[11px] font-bold text-slate-900 leading-tight">
            {screenshot.original_filename}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600">
            <span className="font-medium">{new Date(screenshot.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            {tags.length > 0 && (
              <span className="truncate max-w-[50%] text-blue-600 font-bold">
                #{tags[0]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
