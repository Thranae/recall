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
        return { label: 'Chat', icon: MessageSquare, color: 'bg-blue-500/25 text-blue-200 border-white/20' };
      case 'game':
        return { label: 'Game Stats', icon: Trophy, color: 'bg-amber-500/25 text-amber-200 border-white/20' };
      case 'product':
        return { label: 'Product', icon: ShoppingBag, color: 'bg-purple-500/25 text-purple-200 border-white/20' };
      case 'poster_document':
        return { label: 'Document', icon: FileText, color: 'bg-emerald-500/25 text-emerald-200 border-white/20' };
      default:
        return { label: 'Screenshot', icon: Layers, color: 'bg-white/15 text-white/90 border-white/20' };
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
      className="relative flex flex-col overflow-hidden rounded-[20px] border border-white/12 bg-white/[0.06] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_20px_rgba(0,0,0,0.3)] transition-transform duration-100 ease-out active:scale-[0.97] select-none cursor-pointer"
    >
      {/* Thumbnail Aspect Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-black/40">
        <img
          src={imageUrl}
          alt={screenshot.original_filename}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        {/* Liquid Glass Category & Status Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ${color}`}>
            <CatIcon className="h-2.5 w-2.5" />
            <span>{label}</span>
          </span>

          {screenshot.processing_status !== 'ready' && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/20 px-2 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              {screenshot.processing_status === 'processing' ? (
                <>
                  <Clock className="h-2.5 w-2.5 animate-spin" />
                  <span>Indexing</span>
                </>
              ) : screenshot.processing_status === 'queued' ? (
                <>
                  <Clock className="h-2.5 w-2.5" />
                  <span>Queued</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-2.5 w-2.5 text-red-400" />
                  <span>Error</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Liquid Glass Search match overlay */}
        {searchResult && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-2.5 pt-8 backdrop-blur-[2px]">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-blue-300 truncate max-w-[70%]">
                {searchResult.match_type.replace('_', ' ')}
              </span>
              <span className="font-mono text-[9px] text-white font-bold bg-blue-500/40 border border-blue-400/40 px-1.5 py-0.5 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                {Math.round(searchResult.match_score * 100)}%
              </span>
            </div>
            {searchResult.match_explanation && (
              <p className="mt-0.5 text-[9px] text-white/80 line-clamp-1 font-medium">
                {searchResult.match_explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      {!searchResult && (
        <div className="p-2.5 border-t border-white/10 bg-white/[0.03]">
          <p className="truncate text-[11px] font-medium text-white/90">
            {screenshot.original_filename}
          </p>
          <div className="mt-0.5 flex items-center justify-between text-[10px] text-white/50">
            <span>{new Date(screenshot.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            {tags.length > 0 && (
              <span className="truncate max-w-[50%] text-white/40">
                #{tags[0]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
