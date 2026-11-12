import React, { useState, useEffect, useRef } from 'react';
import { RecallEmblem } from './RecallEmblem';
import { Lock } from 'lucide-react';

interface SignOutTransitionProps {
  onSessionCleared: () => void;
  onComplete: () => void;
}

export const SignOutTransition: React.FC<SignOutTransitionProps> = ({
  onSessionCleared,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'clearing' | 'locked' | 'exiting'>('clearing');

  const clearedRef = useRef(onSessionCleared);
  const completedRef = useRef(onComplete);

  useEffect(() => {
    clearedRef.current = onSessionCleared;
  }, [onSessionCleared]);

  useEffect(() => {
    completedRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const tClear = window.setTimeout(() => {
      clearedRef.current();
      setPhase('locked');
    }, 520);

    const tExit = window.setTimeout(() => {
      setPhase('exiting');
    }, 1150);

    const tDone = window.setTimeout(() => {
      completedRef.current();
    }, 1450);

    return () => {
      window.clearTimeout(tClear);
      window.clearTimeout(tExit);
      window.clearTimeout(tDone);
    };
  }, []);

  return (
    <div
      style={{
        opacity: phase === 'exiting' ? 0 : 1,
        transform:
          phase === 'exiting'
            ? 'translate3d(0, -6px, 0) scale(1.012)'
            : 'translate3d(0, 0, 0) scale(1)',
        transitionProperty: 'opacity, transform',
        transitionDuration: '280ms',
        transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        animation: 'signOutVeilEnter 260ms cubic-bezier(0.23, 1, 0.32, 1) both',
      }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F4F7FB]/95 backdrop-blur-xl text-[#0F172A] select-none px-6"
    >
      <div className="relative flex flex-col items-center text-center">
        <div
          className="relative mb-5"
          style={{
            animation: 'splashEmblemArrive 460ms cubic-bezier(0.23, 1, 0.32, 1) both',
            willChange: 'transform, opacity',
          }}
        >
          <RecallEmblem size={72} glow className="rounded-[22px]" />
          <div
            className={`absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#F4F7FB] shadow-sm transition-colors duration-300 ${
              phase === 'locked' || phase === 'exiting'
                ? 'bg-emerald-500 text-white'
                : 'bg-[#172B4D] text-white'
            }`}
          >
            <Lock className="h-3.5 w-3.5 stroke-[2.3]" />
          </div>
        </div>

        <div className="relative grid place-items-center h-6 w-56">
          <p
            style={{
              opacity: phase === 'clearing' ? 1 : 0,
              transform: `translate3d(0, ${phase === 'clearing' ? '0px' : '-6px'}, 0)`,
              transitionProperty: 'opacity, transform',
              transitionDuration: '260ms',
              transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
            }}
            className="col-start-1 row-start-1 text-[13px] font-semibold text-slate-600 tracking-wide"
          >
            Signing out…
          </p>
          <p
            style={{
              opacity: phase !== 'clearing' ? 1 : 0,
              transform: `translate3d(0, ${phase !== 'clearing' ? '0px' : '6px'}, 0)`,
              transitionProperty: 'opacity, transform',
              transitionDuration: '300ms',
              transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
            }}
            className="col-start-1 row-start-1 text-[13px] font-semibold text-[#0F172A] tracking-wide"
          >
            Signed out safely
          </p>
        </div>

        <div className="mt-4 w-20 h-[2px] rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className="h-full w-full rounded-full bg-gradient-to-r from-[#60A5FA] to-[#2563EB]"
            style={{
              transformOrigin: 'left center',
              animation: 'splashProgressSweep 1150ms cubic-bezier(0.22, 1, 0.36, 1) both',
              willChange: 'transform',
            }}
          />
        </div>
      </div>
    </div>
  );
};

