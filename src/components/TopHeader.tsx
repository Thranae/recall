import React from 'react';
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react';

interface TopHeaderProps {
  title?: string;
  isProcessing: boolean;
  processingCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  isProcessing,
  processingCount,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full ios-glass-header pt-safe">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
        {/* Packwise Style Liquid Brand Pod */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ios-liquid-primary shadow-[0_4px_12px_rgba(47,107,255,0.35)]">
            <Camera className="h-4.5 w-4.5 text-white drop-shadow-sm shrink-0 stroke-[2.4]" />
          </div>
          <div>
            <h1 className="text-[15px] font-black tracking-tight text-slate-900 leading-none">RECALL</h1>
            <p className="text-[9px] text-slate-500 font-bold tracking-wider uppercase leading-tight mt-1">
              Save Once • Find Later
            </p>
          </div>
        </div>

        {/* Sync Status Badge & Refresh Pill */}
        <div className="flex items-center gap-2 shrink-0">
          {isProcessing ? (
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50/90 px-3 text-[11px] font-extrabold text-amber-700 shadow-sm backdrop-blur-md">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="whitespace-nowrap">Indexing ({processingCount})</span>
            </div>
          ) : (
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50/90 px-3 text-[11px] font-extrabold text-emerald-700 shadow-sm backdrop-blur-md">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span className="whitespace-nowrap">Synced</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh library"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ios-glass-pill text-slate-700 active:scale-90 active:bg-white transition-transform"
          >
            <RefreshCw className={`h-3.5 w-3.5 shrink-0 stroke-[2.4] ${isRefreshing ? 'animate-spin text-[#2F6BFF]' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
