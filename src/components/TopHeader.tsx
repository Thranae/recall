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
    <header className="sticky top-0 z-30 w-full border-b border-black/[0.06] bg-white/75 backdrop-blur-2xl pt-safe shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2.5">
        {/* iOS Light Liquid Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ios-plump-primary">
            <Camera className="h-4.5 w-4.5 text-white drop-shadow-sm shrink-0 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-slate-900 leading-none">RECALL</h1>
            <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase leading-tight mt-1">
              Save Once • Find Later
            </p>
          </div>
        </div>

        {/* Sync Status Badge & Refresh Pill */}
        <div className="flex items-center gap-2 shrink-0">
          {isProcessing ? (
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 px-3 text-[11px] font-bold text-amber-700 shadow-sm">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="whitespace-nowrap">Indexing ({processingCount})</span>
            </div>
          ) : (
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-50 px-3 text-[11px] font-bold text-emerald-700 shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
              <span className="whitespace-nowrap">Synced</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh library"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white/90 text-slate-700 shadow-[inset_0_1px_1px_rgba(255,255,255,1),0_2px_6px_rgba(0,0,0,0.05)] active:scale-90 active:bg-slate-100 transition-transform"
          >
            <RefreshCw className={`h-3.5 w-3.5 shrink-0 stroke-[2.2] ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
