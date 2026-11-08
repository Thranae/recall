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
    <header className="sticky top-2 inset-x-0 z-30 pointer-events-none select-none pt-safe">
      <div className="max-w-md mx-auto px-3">
        {/* Floating Plump Liquid Glass Bar — matches BottomNav style */}
        <div className="pointer-events-auto relative w-full">
          <div className="nav-glass-bar relative rounded-[28px] px-3.5 py-2.5 flex items-center justify-between">
            {/* Top caustic specular highlight edge */}
            <div
              className="absolute top-0 left-6 right-6 h-px pointer-events-none rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 30%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 70%, transparent 100%)',
              }}
            />

            {/* Left: Plump Brand Pod */}
            <div className="flex items-center gap-2.5">
              {/* Plump Glass Camera Dome */}
              <div className="relative flex items-center justify-center h-10 w-10 rounded-[14px] nav-icon-pod-active shadow-[0_4px_14px_rgba(47,107,255,0.22)]">
                <div className="flex items-center justify-center h-8 w-8 rounded-[11px] bg-gradient-to-br from-[#4A8AFF] via-[#2F6BFF] to-[#1A56E8] shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1.5px_3px_rgba(0,20,80,0.3)]">
                  <Camera className="h-4.5 w-4.5 text-white stroke-[2.4] drop-shadow-xs" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-[15px] font-black tracking-tight text-slate-900 leading-none">
                    RECALL
                  </h1>
                  <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.2 text-[8px] font-extrabold text-[#2F6BFF] uppercase tracking-wider">
                    v1.0
                  </span>
                </div>
                <p className="text-[8.5px] text-slate-400 font-bold tracking-wider uppercase leading-none mt-1">
                  Save Once • Find Later
                </p>
              </div>
            </div>

            {/* Right: Plump Status Capsule & Plump Refresh Pod */}
            <div className="flex items-center gap-2 shrink-0">
              {isProcessing ? (
                <div className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-extrabold text-amber-700 nav-active-pill border-amber-300/80 shadow-[0_2px_8px_rgba(245,158,11,0.15)]">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                  </span>
                  <span className="whitespace-nowrap font-mono">Indexing ({processingCount})</span>
                </div>
              ) : (
                <div className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-extrabold text-emerald-700 nav-active-pill border-emerald-300/70 shadow-[0_2px_8px_rgba(16,185,129,0.12)]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                  <span className="whitespace-nowrap">Synced</span>
                </div>
              )}

              {/* Plump Refresh Action Pod */}
              <button
                type="button"
                onClick={onRefresh}
                aria-label="Refresh library"
                className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full nav-icon-pod-active text-slate-600 active:scale-90 transition-transform duration-200 cursor-pointer focus:outline-none"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 shrink-0 stroke-[2.3] transition-transform duration-500 ${
                    isRefreshing ? 'animate-spin text-[#2F6BFF]' : 'text-slate-500 hover:text-slate-800'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
