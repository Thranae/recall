import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RecallEmblem } from './RecallEmblem';
import { ChevronRight } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 7000,
}) => {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Phase 1: 0 - 2.2s ("Every screenshot.")
    // Phase 2: 2.2s - 4.4s ("Every conversation. Every memory.")
    // Phase 3: 4.4s - 6.4s (RECALL Emblem & Brand reveal)
    // Exit: 6.4s - 7.0s (Cinematic blur-scale dissolve into app)
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => setPhase(3), 4400);

    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onComplete();
      }, 600);
    }, durationMs - 600);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(exitTimer);
    };
  }, [durationMs, onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 250);
  };

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(12px)',
            transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 z-[9999] flex flex-col justify-between items-center bg-[#F4F7FB] text-[#0F172A] overflow-hidden select-none px-6 py-8"
        >
          {/* Ambient Ethereal Breathing Aura */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            {/* Luminous sapphire halo */}
            <motion.div
              animate={{
                scale: [0.95, 1.2, 0.95],
                opacity: [0.25, 0.5, 0.25],
              }}
              transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
              className="w-[460px] h-[460px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, rgba(186, 230, 253, 0.18) 50%, transparent 72%)',
                filter: 'blur(60px)',
              }}
            />

            {/* Subtle concentric focal ripples */}
            <motion.div
              animate={{
                scale: [0.8, 1.6],
                opacity: [0.25, 0],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute w-64 h-64 rounded-full border border-blue-400/20 pointer-events-none"
            />
            <motion.div
              animate={{
                scale: [0.8, 1.6],
                opacity: [0.25, 0],
              }}
              transition={{
                duration: 3.5,
                delay: 1.75,
                repeat: Infinity,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute w-64 h-64 rounded-full border border-blue-400/20 pointer-events-none"
            />
          </div>

          {/* Top Bar with Minimal Skip Action */}
          <div className="w-full flex justify-end relative z-10">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              onClick={handleSkip}
              className="flex items-center gap-1 rounded-full px-3 py-1 bg-white/60 hover:bg-white/90 border border-white/80 text-[11px] font-medium text-slate-400 hover:text-slate-700 backdrop-blur-md transition-all cursor-pointer"
            >
              <span>Skip</span>
              <ChevronRight className="h-3 w-3 stroke-[2]" />
            </motion.button>
          </div>

          {/* Central Poetic Narrative Theater (Zero Loading Bars) */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto px-4 max-w-sm">
            <AnimatePresence mode="wait">
              {phase === 1 && (
                <motion.div
                  key="phase1"
                  initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2"
                >
                  <p className="font-['Outfit'] text-2xl font-light tracking-[0.08em] text-slate-400">
                    Never lose
                  </p>
                  <h2 className="font-['Outfit'] text-3xl font-bold tracking-tight text-[#0F172A]">
                    a single screenshot.
                  </h2>
                </motion.div>
              )}

              {phase === 2 && (
                <motion.div
                  key="phase2"
                  initial={{ opacity: 0, y: 12, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-2"
                >
                  <p className="font-['Outfit'] text-2xl font-light tracking-[0.08em] text-slate-400">
                    Find any message,
                  </p>
                  <h2 className="font-['Outfit'] text-3xl font-bold tracking-tight text-[#0F172A]">
                    stat, or price in seconds.
                  </h2>
                </motion.div>
              )}

              {phase === 3 && (
                <motion.div
                  key="phase3"
                  initial={{ opacity: 0, scale: 0.88, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center"
                >
                  {/* Glowing Jewel Emblem */}
                  <div className="relative mb-6">
                    <div
                      className="absolute inset-0 rounded-[28px] pointer-events-none"
                      style={{
                        boxShadow: '0 14px 40px -6px rgba(37, 99, 235, 0.40)',
                      }}
                    />
                    <RecallEmblem size={88} glow className="rounded-[24px]" />
                  </div>

                  {/* Brand Typography */}
                  <h1 className="font-['Outfit'] text-3xl font-extrabold tracking-[0.24em] text-[#0F172A] uppercase pl-[0.24em]">
                    Recall
                  </h1>
                  <p className="mt-2 text-xs text-slate-500 font-normal tracking-wider">
                    Instant Visual Search Engine
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Silent Ambient Spacer (Zero Loading Bars) */}
          <div className="h-8 relative z-10 flex items-center justify-center">
            {/* Subtle serene breath dot */}
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="h-1.5 w-1.5 rounded-full bg-blue-500/40"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
