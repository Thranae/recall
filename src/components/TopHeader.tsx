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
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.12] bg-black/70 backdrop-blur-3xl pt-safe shadow-[0_6px_24px_rgba(0,0,0,0.4)]">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        {/* iOS 27 Plumpy Liquid Brand Pod */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.7),inset_0_-1.5px_2px_rgba(0,35,110,0.4),0_4px_14px_rgba(0,122,255,0.4)] border border-white/30">
            <Camera className="h-4.5 w-4.5 text-white drop-shadow-sm shrink-0" />
          </div>
          <div>
            <h1 className="text-[16px] font-bold tracking-tight text-white leading-none">RECALL</h1>
            <p className="text-[9px] text-white/55 font-medium tracking-wider uppercase leading-tight mt-1">
              Save Once • Find Later
            </p>
          </div>
        </div>

        {/* Sync Status Badge & Refresh Pill */}
        <div className="flex items-center gap-2 shrink-0">
          {isProcessing ? (
            <div className="flex h-8 items-center gap-2 rounded-full border border-amber-400/35 bg-gradient-to-b from-amber-400/20 to-amber-600/20 px-3 text-[11px] font-semibold text-amber-200 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35),0_4px_12px_rgba(245,158,11,0.25)]">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span className="whitespace-nowrap">Indexing ({processingCount})</span>
            </div>
          ) : (
            <div className="flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-gradient-to-b from-white/[0.14] to-white/[0.04] px-3 text-[11px] font-semibold text-emerald-300 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35),0_4px_12px_rgba(0,0,0,0.3)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="whitespace-nowrap">Synced</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh library"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-gradient-to-b from-white/[0.15] to-white/[0.05] text-white/80 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_4px_12px_rgba(0,0,0,0.3)] active:scale-90 active:bg-white/20 transition-transform"
          >
            <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
