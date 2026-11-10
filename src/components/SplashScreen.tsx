import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RecallEmblem } from './RecallEmblem';
import { MessageSquare, Trophy, Tag, ChevronRight } from 'lucide-react';

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
        }, 700);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [durationMs, onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 350);
  };

  const getStatusText = (pct: number) => {
    if (pct < 22) return 'Powering multimodal vision engines...';
    if (pct < 48) return 'Connecting personal screenshot vault...';
    if (pct < 74) return 'Synthesizing threads, scores & prices...';
    if (pct < 94) return 'Finalizing instant search index...';
    return 'Your visual memory is ready.';
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
            scale: 1.05,
            filter: 'blur(14px)',
            transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
          }}
          className="fixed inset-0 z-[9999] flex flex-col justify-between items-center bg-[#F3F7FC] text-[#172B4D] overflow-hidden select-none px-6 py-8"
        >
          {/* Ambient Liquid Glow Orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                opacity: [0.25, 0.45, 0.25],
                x: [0, 20, 0],
                y: [0, -30, 0],
              }}
              transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
              className="absolute -top-[10%] -left-[10%] w-[80vw] h-[80vw] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(52, 120, 246, 0.28) 0%, transparent 65%)',
                filter: 'blur(45px)',
              }}
            />
            <motion.div
              animate={{
                scale: [1.2, 1, 1.2],
                opacity: [0.35, 0.2, 0.35],
                x: [0, -25, 0],
                y: [0, 20, 0],
              }}
              transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
              className="absolute -bottom-[10%] -right-[10%] w-[85vw] h-[85vw] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(185, 217, 255, 0.60) 0%, transparent 70%)',
                filter: 'blur(50px)',
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage:
                  'radial-gradient(#172B4D 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
          </div>

          {/* Top Skip Pill */}
          <div className="w-full flex justify-end relative z-10">
            <motion.button
              type="button"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              onClick={handleSkip}
              className="flex items-center gap-1 rounded-full px-3.5 py-1.5 bg-white/70 border border-white/90 text-xs font-semibold text-slate-500 backdrop-blur-md shadow-2xs hover:text-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              <span>Skip</span>
              <ChevronRight className="h-3 w-3 stroke-[2.5]" />
            </motion.button>
          </div>

          {/* Central Emblem & Liquid Choreography */}
          <div className="relative z-10 flex flex-col items-center text-center my-auto">
            {/* Glowing Pulse Rings */}
            <div className="relative mb-6">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [1, 1.45, 1.7], opacity: [0.5, 0.2, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-[28px] bg-blue-500/25 pointer-events-none"
              />
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.25, 1.4], opacity: [0.6, 0.3, 0] }}
                transition={{ duration: 2.4, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-[28px] bg-sky-400/20 pointer-events-none"
              />

              {/* Main App Emblem */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10"
              >
                <RecallEmblem size={84} glow className="rounded-[26px]" />
              </motion.div>

              {/* Orbiting Memory Pill 1: Chat Threads */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, x: -30, y: -20 }}
                animate={{
                  opacity: progress > 15 ? 1 : 0,
                  scale: progress > 15 ? 1 : 0.6,
                  x: [-45, -50, -45],
                  y: [-35, -40, -35],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  opacity: { duration: 0.6 },
                }}
                className="absolute top-0 left-0 -translate-x-full -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-white/95 shadow-sm backdrop-blur-md"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[#3478F6]">
                  <MessageSquare className="h-3 w-3 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 whitespace-nowrap">
                  Chat Threads
                </span>
              </motion.div>

              {/* Orbiting Memory Pill 2: Game Stats */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, x: 30, y: -15 }}
                animate={{
                  opacity: progress > 28 ? 1 : 0,
                  scale: progress > 28 ? 1 : 0.6,
                  x: [45, 50, 45],
                  y: [-25, -20, -25],
                }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3,
                  opacity: { duration: 0.6 },
                }}
                className="absolute top-1/4 right-0 translate-x-full flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-white/95 shadow-sm backdrop-blur-md"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                  <Trophy className="h-3 w-3 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 whitespace-nowrap">
                  Game Stats
                </span>
              </motion.div>

              {/* Orbiting Memory Pill 3: Receipts & Prices */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, x: -25, y: 30 }}
                animate={{
                  opacity: progress > 42 ? 1 : 0,
                  scale: progress > 42 ? 1 : 0.6,
                  x: [-35, -40, -35],
                  y: [40, 45, 40],
                }}
                transition={{
                  duration: 4.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.6,
                  opacity: { duration: 0.6 },
                }}
                className="absolute bottom-0 left-0 -translate-x-full translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-white/95 shadow-sm backdrop-blur-md"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Tag className="h-3 w-3 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 whitespace-nowrap">
                  Receipts & Prices
                </span>
              </motion.div>
            </div>

            {/* Brand Title */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-['Outfit'] text-3xl font-extrabold tracking-tight text-[#172B4D] flex items-center justify-center">
                <span>RECALL</span>
                <span className="text-[#3478F6] ml-0.5">.</span>
              </h1>
              <p className="mt-1.5 text-xs text-slate-500 font-medium tracking-wide">
                Intelligent Personal Screenshot Vault
              </p>
            </motion.div>
          </div>

          {/* Bottom Progress Capsule */}
          <div className="w-full max-w-xs relative z-10 space-y-2.5">
            <div className="flex items-center justify-between text-[11.5px] px-0.5 font-medium">
              <motion.span
                key={getStatusText(progress)}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-slate-600 truncate max-w-[210px]"
              >
                {getStatusText(progress)}
              </motion.span>
              <span className="font-mono font-bold text-[#3478F6]">
                {Math.round(progress)}%
              </span>
            </div>

            {/* Liquid Glass Progress Bar */}
            <div className="h-2 w-full rounded-full bg-white/80 border border-white/90 p-0.5 shadow-inner overflow-hidden backdrop-blur-md">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#4F93FF] via-[#3478F6] to-[#1856CB] relative"
                style={{ width: `${progress}%` }}
              >
                {/* Gloss sweep highlight */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
                    animation: 'floatWide1 2s ease-in-out infinite',
                  }}
                />
              </motion.div>
            </div>

            <p className="text-center text-[10px] text-slate-400 font-mono">
              Powered by Multi-Provider Vision AI
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
