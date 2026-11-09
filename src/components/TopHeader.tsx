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
    <div className="sticky top-0 inset-x-0 z-30 pointer-events-none select-none">
      {/* Subtle Cloudy Header Blur under the Top Nav Bar (Expo Project reference) */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none -z-10"
        style={{
          height: 'calc(80px + env(safe-area-inset-top, 0px))',
          background:
            'linear-gradient(to bottom, rgba(242, 245, 249, 0.82) 0%, rgba(220, 235, 255, 0.35) 45%, transparent 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
        }}
      />

      <header className="top-liquid-nav pt-safe pointer-events-auto">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          {/* Brand / Title section with 3D Plump Liquid Pod */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[16px] liquid-btn-primary text-white shadow-xs">
              <Camera className="h-4.5 w-4.5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[18px] font-bold tracking-tight text-slate-800 leading-none">
                {title || 'Recall'}
              </span>
            </div>
          </div>

          {/* Right actions: Status indicator & Refresh with Plump Liquid Pills */}
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <div className="flex items-center gap-1.5 rounded-full liquid-glass-pill px-3 py-1 text-[11px] font-semibold text-amber-700">
                <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                <span>Indexing {processingCount}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full liquid-glass-pill px-3 py-1 text-[11px] font-semibold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
                <span>Synced</span>
              </div>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh library"
              className="flex h-9 w-9 items-center justify-center rounded-full liquid-glass-pill text-slate-600 active:scale-90 transition-all duration-150 cursor-pointer focus:outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 stroke-[2] ${
                  isRefreshing ? 'animate-spin text-[#3A628B]' : 'text-slate-600'
                }`}
              />
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};
