import React, { useState, useEffect, useRef } from 'react';
import { RecallEmblem } from './RecallEmblem';
import { ChevronRight } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
  variant?: 'launch' | 'login';
  userName?: string | null;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs,
  variant = 'launch',
  userName,
}) => {
  const effectiveDuration = durationMs ?? (variant === 'launch' ? 7000 : 3600);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [isExiting, setIsExiting] = useState(false);
  const [exitDurationMs, setExitDurationMs] = useState(variant === 'launch' ? 550 : 450);

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

    if (variant === 'launch') {
      const exitDuration = 550;
      const exitLead = Math.max(0, effectiveDuration - exitDuration);
      const t2 = window.setTimeout(() => setPhase(2), 2200);
      const t3 = window.setTimeout(() => setPhase(3), 4400);
      const tExit = window.setTimeout(() => {
        setExitDurationMs(exitDuration);
        setIsExiting(true);
        const tDone = window.setTimeout(finishOnce, exitDuration + 20);
        timersRef.current.push(tDone);
      }, exitLead);
      timersRef.current.push(t2, t3, tExit);
    } else {
      const exitDuration = 450;
      const exitLead = Math.max(800, effectiveDuration - exitDuration);
      const midBeatTime = Math.round(exitLead * 0.48);
      const tBeat2 = window.setTimeout(() => setPhase(2), midBeatTime);
      const tExit = window.setTimeout(() => {
        setExitDurationMs(exitDuration);
        setIsExiting(true);
        const tDone = window.setTimeout(finishOnce, exitDuration + 20);
        timersRef.current.push(tDone);
      }, exitLead);
      timersRef.current.push(tBeat2, tExit);
    }

    return clearAllTimers;
  }, [effectiveDuration, variant]);

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

  const getLaunchSlotStyle = (slot: 1 | 2 | 3): React.CSSProperties => {
    const isActive = phase === slot;
    const isPast = phase > slot;
    const yOffset = isActive ? '0px' : isPast ? '-12px' : '12px';
    const scale = slot === 3 && !isActive ? 0.94 : 1;

    return {
      opacity: isActive ? 1 : 0,
      transform: `translate3d(0, ${yOffset}, 0) scale(${scale})`,
      transitionProperty: 'opacity, transform',
      transitionDuration: isActive ? '540ms' : '300ms',
      transitionDelay: isActive && slot > 1 ? '150ms' : '0ms',
      transitionTimingFunction: isActive
        ? 'cubic-bezier(0.16, 1, 0.3, 1)'
        : 'cubic-bezier(0.22, 1, 0.36, 1)',
      willChange: 'transform, opacity',
      backfaceVisibility: 'hidden',
      pointerEvents: isActive ? 'auto' : 'none',
    };
  };

  const getLoginCaptionStyle = (slot: 1 | 2): React.CSSProperties => {
    const isActive = phase === slot;
    const isPast = phase > slot;
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

  const firstName = userName?.trim().split(/\s+/)[0];
  const greetingText =
    firstName && firstName.toLowerCase() !== 'user'
      ? `Welcome back, ${firstName}`
      : 'Welcome to Recall';

  const progressDurationMs = Math.max(1200, effectiveDuration - 450);

  return (
    <div
      style={{
        opacity: isExiting ? 0 : 1,
        transform: isExiting
          ? 'translate3d(0, 0, 0) scale(1.015)'
          : 'translate3d(0, 0, 0) scale(1)',
        transitionProperty: 'opacity, transform',
        transitionDuration: `${exitDurationMs}ms`,
        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
      }}
      className="fixed inset-0 z-[9999] flex flex-col justify-between items-center bg-[#F4F7FB] text-[#0F172A] overflow-hidden select-none px-6 py-8"
    >
      {/* Ambient Ethereal Breathing Aura */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div
          className="w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle, rgba(37, 99, 235, 0.15) 0%, rgba(186, 230, 253, 0.17) 38%, rgba(244, 247, 251, 0) 70%)',
            animation: 'splashAuraPulse 6s ease-in-out infinite',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
          }}
        />
        <div
          className="absolute w-60 h-60 rounded-full border border-blue-400/20 pointer-events-none"
          style={{
            animation: 'splashRippleExpand 3.6s cubic-bezier(0.23, 1, 0.32, 1) infinite',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
          }}
        />
        {variant === 'launch' && (
          <div
            className="absolute w-64 h-64 rounded-full border border-blue-400/15 pointer-events-none"
            style={{
              animation: 'splashRippleExpand 3.6s cubic-bezier(0.23, 1, 0.32, 1) 1.8s infinite',
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
            }}
          />
        )}
      </div>

      {/* Top Subtle Skip Action */}
      <div className="w-full flex justify-end relative z-10">
        <button
          type="button"
          onClick={handleSkip}
          className="flex items-center gap-1 rounded-full px-3 py-1 bg-white/80 hover:bg-white border border-white/90 text-[11px] font-medium text-slate-500 hover:text-slate-800 shadow-2xs transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] cursor-pointer"
        >
          <span>Skip</span>
          <ChevronRight className="h-3 w-3 stroke-[2]" />
        </button>
      </div>

      {/* Center Stage */}
      {variant === 'launch' ? (
        <div className="relative z-10 grid place-items-center text-center my-auto px-4 max-w-sm w-full min-h-[190px]">
          <div className="col-start-1 row-start-1 w-full" style={getLaunchSlotStyle(1)}>
            <div
              className="space-y-2"
              style={{
                animation: 'splashPhaseEnter 600ms cubic-bezier(0.23, 1, 0.32, 1) both',
                willChange: 'transform, opacity',
              }}
            >
              <p className="font-['Outfit'] text-2xl font-light tracking-[0.08em] text-slate-400">
                Never lose
              </p>
              <h2 className="font-['Outfit'] text-3xl font-bold tracking-tight text-[#0F172A]">
                a single screenshot.
              </h2>
            </div>
          </div>

          <div
            className="col-start-1 row-start-1 w-full space-y-2"
            style={getLaunchSlotStyle(2)}
          >
            <p className="font-['Outfit'] text-2xl font-light tracking-[0.08em] text-slate-400">
              Find any message,
            </p>
            <h2 className="font-['Outfit'] text-3xl font-bold tracking-tight text-[#0F172A]">
              stat, or price in seconds.
            </h2>
          </div>

          <div
            className="col-start-1 row-start-1 w-full flex flex-col items-center"
            style={getLaunchSlotStyle(3)}
          >
            <div
              className="mb-6 rounded-[24px]"
              style={{
                boxShadow: '0 14px 36px -6px rgba(37, 99, 235, 0.38)',
              }}
            >
              <RecallEmblem size={88} className="rounded-[24px]" />
            </div>

            <h1 className="font-['Outfit'] text-3xl font-extrabold tracking-[0.24em] text-[#0F172A] uppercase pl-[0.24em]">
              Recall
            </h1>
            <p className="mt-2 text-xs text-slate-500 font-normal tracking-wider">
              Instant Visual Search Engine
            </p>
          </div>
        </div>
      ) : (
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
              style={getLoginCaptionStyle(1)}
            >
              {greetingText}
            </p>
            <p
              className="col-start-1 row-start-1 text-[13px] font-medium text-slate-400 tracking-wide"
              style={getLoginCaptionStyle(2)}
            >
              Every screenshot, ready.
            </p>
          </div>
        </div>
      )}

      {/* Bottom Indicator */}
      <div className="h-8 relative z-10 flex items-center justify-center w-full">
        {variant === 'launch' ? (
          <div
            className="h-1.5 w-1.5 rounded-full bg-blue-500/45"
            style={{
              animation: 'splashDotBreath 2.2s ease-in-out infinite',
              willChange: 'transform, opacity',
            }}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
};
