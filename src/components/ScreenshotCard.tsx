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
        return { label: 'Chat', icon: MessageSquare, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' };
      case 'game':
        return { label: 'Game Stats', icon: Trophy, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'product':
        return { label: 'Product', icon: ShoppingBag, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'poster_document':
        return { label: 'Doc/Poster', icon: FileText, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      default:
        return { label: 'Screenshot', icon: Layers, color: 'bg-slate-700/50 text-slate-300 border-slate-600/40' };
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-sm transition-all duration-150 active:scale-[0.97] hover:border-slate-700 select-none cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950">
        <img
          src={imageUrl}
          alt={screenshot.original_filename}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
          <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold backdrop-blur-md ${color}`}>
            <CatIcon className="h-2.5 w-2.5" />
            <span>{label}</span>
          </span>

          {screenshot.processing_status !== 'ready' && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md">
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

        {/* Search match badge if applicable */}
        {searchResult && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-2 pt-6">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-semibold text-indigo-300 truncate max-w-[70%]">
                {searchResult.match_type.replace('_', ' ')}
              </span>
              <span className="font-mono text-[9px] text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                {Math.round(searchResult.match_score * 100)}%
              </span>
            </div>
            {searchResult.match_explanation && (
              <p className="mt-0.5 text-[9px] text-slate-300 line-clamp-1">
                {searchResult.match_explanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      {!searchResult && (
        <div className="p-2 border-t border-slate-800/80 bg-slate-900/80">
          <p className="truncate text-[11px] font-medium text-slate-200">
            {screenshot.original_filename}
          </p>
          <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-400">
            <span>{new Date(screenshot.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            {tags.length > 0 && (
              <span className="truncate max-w-[50%] text-slate-400">
                #{tags[0]}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
