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
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl pt-safe">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 shadow-md shadow-indigo-600/30 ring-1 ring-white/10">
            <Camera className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">RECALL</h1>
            <p className="text-[10px] text-slate-400 font-mono leading-tight mt-0.5">SAVE ONCE • FIND LATER</p>
          </div>
        </div>

        {/* Sync Status Badge & Refresh */}
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[11px] font-medium text-amber-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Indexing ({processingCount})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>Synced</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh library"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white active:scale-95 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
