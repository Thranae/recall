import React, { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

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

          {/* Brand / Distinctive Title & Branded Camera Icon Emblem */}
          <div className="flex items-center gap-2.5">
            {/* Branded Jewel Aperture Pod */}
            <div
              className="relative flex h-9 w-9 items-center justify-center rounded-[13px] overflow-hidden select-none"
              style={{
                background: 'linear-gradient(135deg, #4F93FF 0%, #3478F6 52%, #1C58D0 100%)',
                boxShadow:
                  '0 3.5px 12px -1px rgba(52, 120, 246, 0.38), inset 0 1.5px 1.5px rgba(255, 255, 255, 0.70), inset 0 -1.5px 2px rgba(15, 45, 115, 0.35)',
              }}
            >
              {/* Top gloss curve reflection */}
              <div
                className="absolute top-0 inset-x-0 h-[45%] pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.35) 0%, transparent 100%)',
                  borderTopLeftRadius: 'inherit',
                  borderTopRightRadius: 'inherit',
                }}
              />

              {/* Bespoke Optics Emblem */}
              <svg viewBox="0 0 24 24" className="h-5 w-5 relative z-10" fill="none">
                <path
                  d="M4.75 8.25C4.75 7.14543 5.64543 6.25 6.75 6.25H8.2C8.7 6.25 9.15 5.95 9.4 5.5L9.9 4.6C10.2 4.1 10.7 3.75 11.3 3.75H12.7C13.3 3.75 13.8 4.1 14.1 4.6L14.6 5.5C14.85 5.95 15.3 6.25 15.8 6.25H17.25C18.3546 6.25 19.25 7.14543 19.25 8.25V16.75C19.25 17.8546 18.3546 18.75 17.25 18.75H6.75C5.64543 18.75 4.75 17.8546 4.75 16.75V8.25Z"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12.5" r="3.6" stroke="white" strokeWidth="1.7" />
                <circle cx="12" cy="12.5" r="2.1" fill="#B9D9FF" />
                <circle cx="12" cy="12.5" r="1.1" fill="#1C58D0" />
                <circle cx="11.2" cy="11.7" r="0.55" fill="white" />
                <circle cx="16.4" cy="8.75" r="0.75" fill="#B9D9FF" />
              </svg>
            </div>

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
