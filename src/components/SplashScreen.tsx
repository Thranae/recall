import React, { useState, useEffect, useRef } from 'react';
import { RecallEmblem } from './RecallEmblem';
import { ChevronRight } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
  userName?: string | null;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 3600,
  userName,
}) => {
  const [beat, setBeat] = useState<1 | 2>(1);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDurationMs, setExitDurationMs] = useState(450);

  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const clearAllTimers = () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };

    const finishOnce = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current();
    };

    const exitDuration = 450;
    const exitLead = Math.max(800, durationMs - exitDuration);
    const midBeatTime = Math.round(exitLead * 0.48);

    const tBeat2 = window.setTimeout(() => setBeat(2), midBeatTime);
    const tExit = window.setTimeout(() => {
      setExitDurationMs(exitDuration);
      setIsExiting(true);
      const tDone = window.setTimeout(finishOnce, exitDuration + 20);
      timersRef.current.push(tDone);
    }, exitLead);

    timersRef.current.push(tBeat2, tExit);

    return clearAllTimers;
  }, [durationMs]);

  const handleSkip = () => {
    if (isExiting || completedRef.current) return;
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setExitDurationMs(220);
    setIsExiting(true);
    const tDone = window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onCompleteRef.current();
    }, 230);
    timersRef.current.push(tDone);
  };

  const firstName = userName?.trim().split(/\s+/)[0];
  const greetingText = firstName && firstName.toLowerCase() !== 'user'
    ? `Welcome back, ${firstName}`
    : 'Welcome to Recall';

  const getCaptionStyle = (slot: 1 | 2): React.CSSProperties => {
    const isActive = beat === slot;
    const isPast = beat > slot;
    const yOffset = isActive ? '0px' : isPast ? '-8px' : '8px';

    return {
      opacity: isActive ? 1 : 0,
      transform: `translate3d(0, ${yOffset}, 0)`,
      transitionProperty: 'opacity, transform',
      transitionDuration: isActive ? '460ms' : '260ms',
      transitionDelay: isActive && slot === 2 ? '110ms' : '0ms',
      transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
      willChange: 'transform, opacity',
      backfaceVisibility: 'hidden',
    };
  };

  const progressDurationMs = Math.max(1200, durationMs - 450);

  return (
    <div
      style={{
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'translate3d(0, 0, 0) scale(1.015)' : 'translate3d(0, 0, 0) scale(1)',
        transitionProperty: 'opacity, transform',
        transitionDuration: `${exitDurationMs}ms`,
        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
      }}
      className="fixed inset-0 z-[9999] flex flex-col justify-between items-center bg-[#F4F7FB] text-[#0F172A] overflow-hidden select-none px-6 py-8"
    >
      {/* Calm Ambient Radial Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div
          className="w-[460px] h-[460px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(37, 99, 235, 0.14) 0%, rgba(186, 230, 253, 0.16) 40%, rgba(244, 247, 251, 0) 72%)',
            animation: 'splashAuraPulse 4.8s ease-in-out infinite',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
          }}
        />
        <div
          className="absolute w-56 h-56 rounded-full border border-blue-400/20 pointer-events-none"
          style={{
            animation: 'splashRippleExpand 3.4s cubic-bezier(0.23, 1, 0.32, 1) infinite',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
          }}
        />
      </div>

      {/* Top Subtle Skip Action */}
      <div className="w-full flex justify-end relative z-10">
        <button
          type="button"
          onClick={handleSkip}
          className="flex items-center gap-1 rounded-full px-3 py-1 bg-white/75 hover:bg-white border border-white/90 text-[11px] font-medium text-slate-500 hover:text-slate-800 shadow-2xs transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] cursor-pointer"
        >
          <span>Skip</span>
          <ChevronRight className="h-3 w-3 stroke-[2]" />
        </button>
      </div>

      {/* Centered Minimal Brand Lockup */}
      <div className="relative z-10 flex flex-col items-center text-center my-auto max-w-xs w-full">
        <div
          className="mb-6 rounded-[24px]"
          style={{
            animation: 'splashEmblemArrive 640ms cubic-bezier(0.23, 1, 0.32, 1) both',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
          }}
        >
          <RecallEmblem size={82} glow className="rounded-[24px]" />
        </div>

        <h1
          className="font-['Outfit'] text-[26px] font-extrabold tracking-[0.26em] text-[#0F172A] uppercase pl-[0.26em]"
          style={{
            animation: 'splashPhaseEnter 580ms cubic-bezier(0.23, 1, 0.32, 1) 110ms both',
            willChange: 'transform, opacity',
          }}
        >
          Recall
        </h1>

        <div
          className="relative grid place-items-center mt-2.5 h-6 w-full"
          style={{
            animation: 'splashPhaseEnter 580ms cubic-bezier(0.23, 1, 0.32, 1) 190ms both',
            willChange: 'transform, opacity',
          }}
        >
          <p
            className="col-start-1 row-start-1 text-[13px] font-medium text-slate-500 tracking-wide"
            style={getCaptionStyle(1)}
          >
            {greetingText}
          </p>
          <p
            className="col-start-1 row-start-1 text-[13px] font-medium text-slate-400 tracking-wide"
            style={getCaptionStyle(2)}
          >
            Every screenshot, ready.
          </p>
        </div>
      </div>

      {/* Hairline Progress Bar */}
      <div className="h-8 relative z-10 flex items-center justify-center w-full">
        <div className="w-24 h-[2px] rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className="h-full w-full rounded-full bg-gradient-to-r from-[#60A5FA] to-[#2563EB]"
            style={{
              transformOrigin: 'left center',
              animation: `splashProgressSweep ${progressDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1) both`,
              willChange: 'transform',
            }}
          />
        </div>
      </div>
    </div>
  );
};
