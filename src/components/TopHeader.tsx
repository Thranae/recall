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
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-black/60 backdrop-blur-2xl pt-safe shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
        {/* iOS Liquid Glass Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-b from-blue-500/90 to-blue-600/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_10px_rgba(0,122,255,0.35)] border border-white/20">
            <Camera className="h-4 w-4 text-white drop-shadow-sm" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-white leading-none">RECALL</h1>
            <p className="text-[9px] text-white/50 font-medium tracking-wider uppercase leading-tight mt-0.5">
              SAVE ONCE • FIND LATER
            </p>
          </div>
        </div>

        {/* Sync Status Badge & Refresh Pill */}
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 text-[11px] font-medium text-amber-200 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span>Indexing ({processingCount})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>Synced</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh library"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white/70 backdrop-blur-xl active:scale-90 active:bg-white/20 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
