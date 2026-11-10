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
      className="liquid-glass-card relative flex flex-col overflow-hidden rounded-[22px] transition-all duration-200 active:scale-[0.97] select-none cursor-pointer"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Full Card Plump Liquid Glass Inner Stroke Overlay */}
      <div className="liquid-card-inner-stroke" />

      {/* Thumbnail Aspect Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100/50">
        <img
          src={imageUrl}
          alt={screenshot.original_filename}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        {/* Minimal Liquid Glass Inner Stroke on Image */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.60)',
            boxShadow:
              'inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.85), inset 0 0 0 1px rgba(255, 255, 255, 0.30), inset 0 -1.5px 3px 0 rgba(23, 43, 77, 0.06)',
          }}
        />

        {/* Top Specular Hairline Highlight */}
        <div
          className="pointer-events-none absolute top-0 left-3 right-3 h-px z-20 rounded-full"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 25%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 75%, transparent 100%)',
          }}
        />

        {/* Floating Liquid Glass Category Badge */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none z-10">
          <span className="liquid-category-badge shadow-xs">
            <CatIcon className="h-3 w-3 shrink-0 stroke-[2.2] text-[#3478F6]" />
            <span className="leading-none truncate text-[#172B4D]">{label}</span>
          </span>

          {screenshot.processing_status !== 'ready' && (
            <span
              title={`Status: ${screenshot.processing_status}`}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full liquid-glass-badge p-0 shadow-xs text-amber-600"
            >
              {screenshot.processing_status === 'processing' ? (
                <Clock className="h-2.5 w-2.5 animate-spin stroke-[2.2]" />
              ) : screenshot.processing_status === 'queued' ? (
                <Clock className="h-2.5 w-2.5 stroke-[2.2]" />
              ) : (
                <AlertCircle className="h-2.5 w-2.5 text-rose-500 stroke-[2.2]" />
              )}
            </span>
          )}
        </div>

        {/* Search match percentage pill on thumbnail */}
        {searchResult && (
          <div className="absolute bottom-2 right-2 z-10">
            <span className="liquid-category-badge px-2 py-0.5 font-mono text-[9.5px] font-bold text-[#3478F6] shadow-xs">
              {Math.round(searchResult.match_score * 100)}% match
            </span>
          </div>
        )}
      </div>

      {/* Card Info Details / Precise Answer Presentation */}
      {searchResult ? (
        <div className="p-3 bg-white/75 backdrop-blur-xs border-t border-white/80 space-y-1">
          {searchResult.precise_value ? (
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                {searchResult.precise_value.badge && (
                  <span className="liquid-category-badge px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#3478F6]">
                    {searchResult.precise_value.badge}
                  </span>
                )}
                <span className="text-[9.5px] font-semibold text-slate-400 capitalize">
                  {searchResult.match_type.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[12.5px] font-bold text-[#172B4D] leading-snug line-clamp-2">
                {searchResult.precise_value.headline}
              </p>
              <p className="mt-0.5 text-[10.5px] text-slate-500 line-clamp-1 font-normal">
                {searchResult.precise_value.detail}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[9.5px] font-bold text-[#3478F6] uppercase">
                  {searchResult.match_type.replace('_', ' ')}
                </span>
              </div>
              <p className="truncate text-[12.5px] font-bold text-[#172B4D]">
                {screenshot.original_filename}
              </p>
              <p className="text-[10.5px] text-slate-500 line-clamp-1 font-normal">
                {searchResult.match_explanation}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3">
          <p className="truncate text-[12.5px] font-bold text-[#172B4D] leading-snug">
            {screenshot.original_filename}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono">
              {new Date(screenshot.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {tags.length > 0 && (
              <span className="truncate max-w-[50%] font-semibold text-[#3478F6]">
                #{tags[0]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
