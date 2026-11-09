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
      className="group relative flex flex-col overflow-hidden rounded-[18px] bg-white border border-black/[0.06] shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all duration-200 active:scale-[0.97] select-none cursor-pointer"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Thumbnail Aspect Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
        <img
          src={imageUrl}
          alt={screenshot.original_filename}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Floating Category & Processing Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/45 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white border border-white/20 shadow-xs">
            <CatIcon className="h-3 w-3 shrink-0 stroke-[2.2]" />
            <span className="leading-none pt-0.5 truncate">{label}</span>
          </span>

          {screenshot.processing_status !== 'ready' && (
            <span
              title={`Status: ${screenshot.processing_status}`}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/90 text-white shadow-xs backdrop-blur-xs"
            >
              {screenshot.processing_status === 'processing' ? (
                <Clock className="h-3 w-3 animate-spin stroke-[2.5]" />
              ) : screenshot.processing_status === 'queued' ? (
                <Clock className="h-3 w-3 stroke-[2.5]" />
              ) : (
                <AlertCircle className="h-3 w-3 text-white stroke-[2.5]" />
              )}
            </span>
          )}
        </div>

        {/* Search match explanation overlay */}
        {searchResult && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2.5 pt-6 backdrop-blur-[2px] z-10">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-white truncate max-w-[75%]">
                {searchResult.match_type.replace('_', ' ')}
              </span>
              <span className="font-mono text-[9px] text-white font-bold bg-[#2F6BFF] px-1.5 py-0.2 rounded-full">
                {Math.round(searchResult.match_score * 100)}%
              </span>
            </div>
            {searchResult.match_explanation && (
              <p className="mt-0.5 text-[9px] text-white/80 line-clamp-1 font-normal leading-tight">
                {searchResult.match_explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card Info Footer */}
      {!searchResult && (
        <div className="p-2.5 border-t border-slate-100 bg-white">
          <p className="truncate text-[12px] font-semibold text-slate-800 leading-tight">
            {screenshot.original_filename}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {new Date(screenshot.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {tags.length > 0 && (
              <span className="truncate max-w-[50%] font-medium text-slate-500">
                #{tags[0]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
