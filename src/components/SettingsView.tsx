import React from 'react';
import { User as UserIcon, Shield, Database, Lock, LogOut, CheckCircle2 } from 'lucide-react';
import type { User, Screenshot } from '../types';

interface SettingsViewProps {
  user: User;
  screenshots: Screenshot[];
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  screenshots,
  onLogout,
}) => {
  const readyCount = screenshots.filter((s) => s.processing_status === 'ready').length;

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-4 pb-28 space-y-4">
      {/* User Profile Card */}
      <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
          <UserIcon className="h-6 w-6" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h2 className="text-sm font-bold text-white truncate">{user.name}</h2>
          <p className="text-xs text-slate-400 truncate">{user.email}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>Active Session • Encrypted</span>
          </div>
        </div>
      </div>

      {/* Storage & Indexing Stats */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <Database className="h-3.5 w-3.5 text-indigo-400" />
          <span>Library Storage</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800/80">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Screenshots</span>
            <p className="mt-0.5 font-mono text-xl font-bold text-white">{screenshots.length}</p>
          </div>
          <div className="rounded-xl bg-slate-950/80 p-3 border border-slate-800/80">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">Indexed</span>
            <p className="mt-0.5 font-mono text-xl font-bold text-indigo-400">{readyCount}</p>
          </div>
        </div>
      </div>

      {/* Privacy & Security Guarantees */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span>Security & Privacy</span>
        </div>

        <div className="space-y-2.5 text-xs text-slate-300">
          <div className="flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Isolated Tenant Architecture</p>
              <p className="text-[11px] text-slate-400 leading-normal">
                Your images and extracted metadata are scoped strictly by your user ID. No other account can query or stream your files.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">No Public AI Training</p>
              <p className="text-[11px] text-slate-400 leading-normal">
                Screenshots are indexed for personal search only. Data is never used to train public foundational models.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Database className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Complete Cascading Deletion</p>
              <p className="text-[11px] text-slate-400 leading-normal">
                Deleting an image completely purges the disk file, OCR text records, chat sequence rows, game stats, and vector embeddings immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 active:scale-[0.98] transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="text-center pt-2 text-[10px] text-slate-600 font-mono">
        RECALL Mobile • Build 1.0.0 (Production)
      </div>
    </div>
  );
};
