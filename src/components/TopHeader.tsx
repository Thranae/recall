import React, { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { RecallEmblem } from './RecallEmblem';

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
  const [isLocalSpinning, setIsLocalSpinning] = useState(false);

  const handleRefreshClick = () => {
    if (isRefreshing || isLocalSpinning) return;
    setIsLocalSpinning(true);
    onRefresh();
    setTimeout(() => {
      setIsLocalSpinning(false);
    }, 750);
  };

  const isSpinning = isRefreshing || isLocalSpinning;

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
            'linear-gradient(to bottom, rgba(243, 247, 252, 0.92) 0%, rgba(235, 243, 253, 0.40) 50%, transparent 100%)',
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

          {/* Brand / Distinctive Title & Branded Screenshot Emblem */}
          <div className="flex items-center gap-2.5">
            <RecallEmblem className="h-9 w-9" />

            {/* Distinctive Recall Wordmark */}
            <div className="flex items-baseline">
              <h1 className="font-['Outfit'] text-[18.5px] font-extrabold tracking-[-0.03em] text-[#172B4D] leading-none select-none">
                {title || 'Recall'}
                <span className="text-[#3478F6] font-black ml-0.5 select-none">.</span>
              </h1>
            </div>
          </div>

          {/* Right actions: Subtle, Reduced-Prominence Synced Status & Refresh */}
          <div className="flex items-center gap-1.5">
            {isProcessing ? (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                <span>Indexing {processingCount}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#4A5D78]/80 font-medium select-none">
                <span
                  className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                    isSpinning ? 'bg-[#3478F6] scale-110 shadow-[0_0_6px_rgba(52,120,246,0.6)]' : 'bg-emerald-500/80'
                  }`}
                />
                <span className="tracking-tight">{isSpinning ? 'Updating...' : 'Synced'}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleRefreshClick}
              disabled={isSpinning}
              aria-label="Refresh library"
              className="flex h-8.5 w-8.5 items-center justify-center rounded-full liquid-glass-pill text-[#4A5D78] active:scale-90 transition-all duration-150 cursor-pointer focus:outline-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 stroke-[2] transition-colors duration-200 ${
                  isSpinning ? 'subtle-refresh-spin text-[#3478F6]' : 'text-[#4A5D78]'
                }`}
              />
            </button>
          </div>
        </header>
      </div>
    </div>
  );
};
