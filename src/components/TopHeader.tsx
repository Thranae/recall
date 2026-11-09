import React from 'react';
import { Camera, RefreshCw, Loader2 } from 'lucide-react';

interface TopHeaderProps {
  title?: string;
  isProcessing: boolean;
  processingCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  isProcessing,
  processingCount,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 inset-x-0 z-30 w-full select-none pt-safe bg-white/80 backdrop-blur-2xl border-b border-black/[0.05] transition-all duration-200">
      <div className="max-w-md mx-auto px-4 h-13 flex items-center justify-between">
        {/* Brand / Title section */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8.5 w-8.5 items-center justify-center rounded-[11px] bg-gradient-to-tr from-[#2F6BFF] to-[#5AA9FF] text-white shadow-[0_2px_8px_rgba(47,107,255,0.28)]">
            <Camera className="h-4.5 w-4.5 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-[17px] font-bold tracking-tight text-slate-900 leading-none">
              {title || 'Recall'}
            </span>
          </div>
        </div>

        {/* Right actions: Status indicator & Refresh */}
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50/90 border border-amber-200/70 px-2.5 py-1 text-[11px] font-medium text-amber-700">
              <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
              <span>Indexing {processingCount}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              <span>Synced</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh library"
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-slate-100/90 hover:bg-slate-200/90 text-slate-600 active:scale-95 transition-all duration-150 cursor-pointer focus:outline-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 stroke-[2] ${
                isRefreshing ? 'animate-spin text-[#2F6BFF]' : 'text-slate-600'
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
