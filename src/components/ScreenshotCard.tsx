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
        return { label: 'Chat', icon: MessageSquare };
      case 'game':
        return { label: 'Game Stats', icon: Trophy };
      case 'product':
        return { label: 'Product', icon: ShoppingBag };
      case 'poster_document':
        return { label: 'Document', icon: FileText };
      default:
        return { label: 'Image', icon: Layers };
    }
  };

  const { label, icon: CatIcon } = getCategoryDetails(screenshot.category);
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
      className="ios-glass-card group relative flex flex-col overflow-hidden rounded-[24px] transition-all duration-200 active:scale-[0.97] select-none cursor-pointer"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Thumbnail Aspect Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100/40">
        <img
          src={imageUrl}
          alt={screenshot.original_filename}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Floating Category & Processing Badges (Packwise TripCard Style) */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-md px-2.5 py-1 text-[10px] font-extrabold text-white border border-white/25 shadow-md">
            <CatIcon className="h-3 w-3 shrink-0 stroke-[2.6] text-blue-400" />
            <span className="leading-none pt-0.5 truncate">{label}</span>
          </span>

          {screenshot.processing_status !== 'ready' && (
            <span
              title={`Status: ${screenshot.processing_status}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-md backdrop-blur-xs border border-white/30"
            >
              {screenshot.processing_status === 'processing' ? (
                <Clock className="h-3.5 w-3.5 animate-spin stroke-[2.5]" />
              ) : screenshot.processing_status === 'queued' ? (
                <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-white stroke-[2.5]" />
              )}
            </span>
          )}
        </div>

        {/* Search match explanation overlay */}
        {searchResult && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 pt-6 backdrop-blur-[2px] z-10">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-extrabold text-white truncate max-w-[75%]">
                {searchResult.match_type.replace('_', ' ')}
              </span>
              <span className="font-mono text-[9px] text-white font-black bg-[#2F6BFF] px-2 py-0.5 rounded-full shadow-xs">
                {Math.round(searchResult.match_score * 100)}%
              </span>
            </div>
            {searchResult.match_explanation && (
              <p className="mt-1 text-[10px] text-white/90 line-clamp-1 font-medium leading-tight">
                {searchResult.match_explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card Info Footer */}
      {!searchResult && (
        <div className="p-3.5 border-t border-white/80 bg-white/60 backdrop-blur-md">
          <p className="truncate text-xs font-black text-slate-900 leading-tight">
            {screenshot.original_filename}
          </p>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-700 font-bold">
            <span>
              {new Date(screenshot.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {tags.length > 0 && (
              <span className="truncate max-w-[50%] font-black text-[#2F6BFF]">
                #{tags[0]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
