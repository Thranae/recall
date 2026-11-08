import React from 'react';
import { MessageSquare, Trophy, ShoppingBag, FileText, Sparkles, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
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

  // Category Icon & Color
  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'chat':
        return {
          label: 'Chat Conversation',
          icon: MessageSquare,
          color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        };
      case 'game':
        return {
          label: 'Game Stats',
          icon: Trophy,
          color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        };
      case 'product':
        return {
          label: 'Product / Shopping',
          icon: ShoppingBag,
          color: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        };
      case 'poster_document':
        return {
          label: 'Poster / Document',
          icon: FileText,
          color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        };
      default:
        return {
          label: 'Screenshot',
          icon: Sparkles,
          color: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
        };
    }
  };

  const catBadge = getCategoryBadge(screenshot.category);
  const CatIcon = catBadge.icon;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-2xl hover:shadow-indigo-950/20 cursor-pointer"
    >
      {/* Thumbnail Aspect Frame */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-950/80">
        <img
          src={imageUrl}
          alt={screenshot.original_filename}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Top Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md ${catBadge.color}`}
          >
            <CatIcon className="h-3 w-3" />
            <span>{catBadge.label}</span>
          </span>

          {screenshot.processing_status !== 'ready' && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-200 backdrop-blur-md">
              {screenshot.processing_status === 'processing' ? (
                <>
                  <Clock className="h-3 w-3 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : screenshot.processing_status === 'queued' ? (
                <>
                  <Clock className="h-3 w-3" />
                  <span>Queued</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                  <span>Failed</span>
                </>
              )}
            </span>
          )}
        </div>

        {/* Search Result Relevance Match Ribbon */}
        {searchResult && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent p-3 pt-6">
            <div className="rounded-lg border border-indigo-500/40 bg-indigo-950/80 p-2 backdrop-blur-md shadow-md">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                  {searchResult.match_type.replace('_', ' ')}
                </span>
                <span className="font-mono text-[10px] font-semibold text-emerald-400">
                  {Math.round(searchResult.match_score * 100)}% match
                </span>
              </div>
              <p className="line-clamp-2 text-[11px] font-medium text-slate-200 leading-snug">
                {searchResult.match_explanation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Card Info Details */}
      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          <h4 className="truncate text-xs font-semibold text-slate-200 group-hover:text-indigo-300">
            {screenshot.original_filename}
          </h4>

          {screenshot.visual_description && (
            <p className="mt-1 line-clamp-2 text-[11px] text-slate-400 leading-relaxed">
              {screenshot.visual_description}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2 text-[10px] text-slate-500 font-mono">
          <span>{new Date(screenshot.uploaded_at).toLocaleDateString()}</span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>Indexed</span>
          </span>
        </div>
      </div>
    </div>
  );
};
