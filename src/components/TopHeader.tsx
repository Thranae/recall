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
    <header className="top-liquid-nav pt-safe">
      <div className="max-w-md mx-auto px-4 h-15 flex items-center justify-between">
        {/* Brand / Title section with 3D Plump Liquid Pod */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[18px] liquid-btn-primary text-white shadow-md">
            <Camera className="h-5 w-5 stroke-[2.4]" />
          </div>
          <div>
            <span className="text-[20px] font-black tracking-tight text-slate-900 leading-none">
              {title || 'Recall'}
            </span>
          </div>
        </div>

        {/* Right actions: Status indicator & Refresh with Plump Liquid Pills */}
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-1.5 rounded-full liquid-glass-pill px-3.5 py-1.5 text-[11px] font-extrabold text-amber-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
              <span>Indexing {processingCount}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full liquid-glass-pill px-3.5 py-1.5 text-[11px] font-extrabold text-slate-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
              <span>Synced</span>
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh library"
            className="flex h-10 w-10 items-center justify-center rounded-full liquid-glass-pill text-slate-800 active:scale-90 transition-all duration-150 cursor-pointer focus:outline-none"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <RefreshCw
              className={`h-4 w-4 stroke-[2.4] ${
                isRefreshing ? 'animate-spin text-[#2F6BFF]' : 'text-slate-700'
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
