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
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentPct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(currentPct);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        setIsExiting(true);
        setTimeout(() => {
          onComplete();
        }, 650);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [durationMs, onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 300);
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
            scale: 1.03,
            filter: 'blur(10px)',
            transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 z-[9999] flex flex-col justify-between items-center bg-[#F4F7FB] text-[#0F172A] overflow-hidden select-none px-6 py-8"
        >
          {/* Subtle Ambient Refraction Aura */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
            {/* Core luminous glow behind the emblem */}
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.35, 0.55, 0.35],
              }}
              transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
              className="w-[420px] h-[420px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(186, 230, 253, 0.15) 45%, transparent 70%)',
                filter: 'blur(55px)',
              }}
            />

            {/* Subtle expanding concentric focus rings */}
            <motion.div
              animate={{
                scale: [0.85, 1.45],
                opacity: [0.3, 0],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute w-56 h-56 rounded-full border border-blue-400/25 pointer-events-none"
            />
            <motion.div
              animate={{
                scale: [0.85, 1.45],
                opacity: [0.3, 0],
              }}
              transition={{
                duration: 3.5,
                delay: 1.75,
                repeat: Infinity,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute w-56 h-56 rounded-full border border-blue-400/25 pointer-events-none"
            />
          </div>

          {/* Top Bar with Minimal Skip Action */}
          <div className="w-full flex justify-end relative z-10">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              onClick={handleSkip}
              className="flex items-center gap-1 rounded-full px-3 py-1 bg-white/60 hover:bg-white/90 border border-white/80 text-[11px] font-medium text-slate-400 hover:text-slate-700 backdrop-blur-md transition-all cursor-pointer"
            >
              <span>Skip</span>
              <ChevronRight className="h-3 w-3 stroke-[2]" />
            </motion.button>
          </div>

          {/* Central Hero Stage */}
          <div className="relative z-10 flex flex-col items-center text-center my-auto">
            {/* The Monogram Emblem */}
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
              className="relative mb-7"
            >
              {/* Outer soft shadow pod */}
              <div
                className="absolute inset-0 rounded-[28px] pointer-events-none"
                style={{
                  boxShadow: '0 12px 36px -6px rgba(37, 99, 235, 0.32)',
                }}
              />

              <RecallEmblem size={88} glow className="rounded-[24px]" />

              {/* Shimmer sweep reflection across emblem */}
              <motion.div
                initial={{ x: '-120%', opacity: 0 }}
                animate={{ x: ['120%', '-120%'], opacity: [0, 0.6, 0] }}
                transition={{
                  duration: 2.8,
                  delay: 1.5,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none"
                style={{
                  background:
                    'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.65) 50%, transparent 70%)',
                }}
              />
            </motion.div>

            {/* Typography */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-['Outfit'] text-[26px] font-bold tracking-[0.22em] text-[#0F172A] uppercase pl-[0.22em]">
                Recall
              </h1>
              <p className="mt-1.5 text-xs text-slate-500 font-normal tracking-wide">
                Search your visual memory
              </p>
            </motion.div>
          </div>

          {/* Bottom Hairline Progress Indicator */}
          <div className="w-full max-w-[200px] relative z-10 flex flex-col items-center space-y-2">
            {/* Hairline Progress Track */}
            <div className="h-[2px] w-full rounded-full bg-slate-200/80 overflow-hidden relative">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-[#2563EB] to-blue-600"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Subtle percentage readout */}
            <span className="font-mono text-[10.5px] font-medium text-slate-400">
              {Math.round(progress)}%
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
