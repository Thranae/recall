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
    <div
      className="fixed top-0 inset-x-0 z-30 pointer-events-none select-none"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Subtle Cloudy Header Blur under the Top Nav Bar (Expo Project reference) */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none -z-10"
        style={{
          height: 'calc(84px + env(safe-area-inset-top, 0px))',
          background:
            'linear-gradient(to bottom, rgba(248, 249, 245, 0.92) 0%, rgba(242, 246, 235, 0.40) 50%, transparent 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
        }}
      />

      <div className="max-w-md mx-auto px-4 pt-2">
        {/* Separate Floating Top Capsule like Bottom Nav Bar */}
        <header className="pointer-events-auto relative rounded-[32px] top-glass-bar px-4 h-13.5 flex items-center justify-between">
          {/* Top specular highlight hairline */}
          <div
            className="absolute top-0 left-6 right-6 h-px pointer-events-none rounded-full"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 30%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 70%, transparent 100%)',
            }}
          />

          {/* Brand / Title section with Plump Olive Liquid Pod */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8.5 w-8.5 items-center justify-center rounded-[14px] liquid-btn-primary text-white shadow-xs">
              <Camera className="h-4 w-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[17px] font-bold tracking-tight text-stone-900 leading-none">
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
              <div className="flex items-center gap-1.5 rounded-full liquid-glass-pill px-3 py-1 text-[11px] font-semibold text-stone-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
                <span>Synced</span>
              </div>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh library"
              className="flex h-8.5 w-8.5 items-center justify-center rounded-full liquid-glass-pill text-stone-600 active:scale-90 transition-all duration-150 cursor-pointer focus:outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 stroke-[2] ${
                  isRefreshing ? 'animate-spin text-[#708238]' : 'text-stone-600'
                }`}
              />
            </button>
          </div>
        </header>
      </div>
    </div>
  );
};
