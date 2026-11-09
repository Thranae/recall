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
    <header className="sticky top-0 inset-x-0 z-30 w-full select-none pt-safe bg-white/65 backdrop-blur-2xl border-b border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.03),inset_0_-1px_0_rgba(255,255,255,0.9)] transition-all duration-200">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand / Title section */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#2F6BFF] via-[#3B82F6] to-[#5AA9FF] text-white shadow-[0_4px_14px_rgba(47,107,255,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.7)]">
            <Camera className="h-4.5 w-4.5 stroke-[2.4]" />
          </div>
          <div>
            <span className="text-[18px] font-black tracking-tight text-slate-900 leading-none">
              {title || 'Recall'}
            </span>
          </div>
        </div>

        {/* Right actions: Status indicator & Refresh */}
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 rounded-full ios-glass-pill px-3 py-1 text-[11px] font-bold text-amber-700">
              <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
              <span>Indexing {processingCount}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full ios-glass-pill px-3 py-1 text-[11px] font-bold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span>Synced</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh library"
            className="flex h-9 w-9 items-center justify-center rounded-full ios-glass-pill text-slate-700 active:scale-90 transition-all duration-150 cursor-pointer focus:outline-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 stroke-[2.2] ${
                isRefreshing ? 'animate-spin text-[#2F6BFF]' : 'text-slate-600'
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
