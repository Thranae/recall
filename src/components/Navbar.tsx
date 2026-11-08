import React from 'react';
import { Camera, Upload, ShieldCheck, Sparkles, LogOut, User as UserIcon } from 'lucide-react';
import type { User } from '../types';

interface NavbarProps {
  user: User | null;
  totalCount: number;
  onOpenUpload: () => void;
  onOpenPrivacy: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onSeedBenchmark: () => void;
  isSeeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  totalCount,
  onOpenUpload,
  onOpenPrivacy,
  onOpenAuth,
  onLogout,
  onSeedBenchmark,
  isSeeding,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
            <Camera className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-sans text-xl font-black tracking-tight text-white">RECALL</span>
              <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-indigo-400 border border-indigo-500/30">
                PROMISE: SAVE ONCE • FIND LATER
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              A private search engine for your screenshot history
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PRD Benchmark Seeder Button */}
          <button
            type="button"
            onClick={onSeedBenchmark}
            disabled={isSeeding}
            title="Load the official PRD acceptance test dataset (ordered chats, BGMI 18 kills, products)"
            className="hidden items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 transition-all hover:bg-purple-500/20 active:scale-95 sm:inline-flex"
          >
            <Sparkles className={`h-3.5 w-3.5 ${isSeeding ? 'animate-spin' : 'text-purple-400'}`} />
            <span>{isSeeding ? 'Seeding Benchmark...' : 'Load Test Suite'}</span>
          </button>

          {/* Privacy & Architecture Disclosure */}
          <button
            type="button"
            onClick={onOpenPrivacy}
            title="Privacy and Security Standards"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-all hover:border-slate-700 hover:text-white"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">Privacy</span>
          </button>

          {/* Upload Button */}
          {user && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all hover:bg-indigo-500 active:scale-95"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
          )}

          {/* User Profile or Sign In */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden text-right lg:block">
                <p className="text-xs font-medium text-slate-200">{user.name}</p>
                <p className="font-mono text-[10px] text-slate-500">{totalCount} screenshots</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                title="Log Out"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-all hover:border-red-500/40 hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-slate-700 active:scale-95"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
