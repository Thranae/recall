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
      {/* iOS Liquid Glass User Profile Card */}
      <div className="flex items-center gap-3.5 rounded-[24px] border border-white/12 bg-white/[0.06] backdrop-blur-2xl p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_24px_rgba(0,0,0,0.3)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-blue-500/20 border border-blue-400/30 text-blue-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
          <UserIcon className="h-6 w-6" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h2 className="text-sm font-bold text-white truncate">{user.name}</h2>
          <p className="text-xs text-white/50 truncate">{user.email}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>Active Session • Encrypted</span>
          </div>
        </div>
      </div>

      {/* Storage & Indexing Stats */}
      <div className="rounded-[24px] border border-white/12 bg-white/[0.05] backdrop-blur-2xl p-4 space-y-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wider px-0.5">
          <Database className="h-3.5 w-3.5 text-blue-400" />
          <span>Library Storage</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-center">
          <div className="rounded-[18px] bg-white/[0.06] backdrop-blur-xl p-3.5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Screenshots</span>
            <p className="mt-0.5 font-mono text-xl font-bold text-white">{screenshots.length}</p>
          </div>
          <div className="rounded-[18px] bg-white/[0.06] backdrop-blur-xl p-3.5 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <span className="text-[10px] uppercase tracking-wider text-white/40">Indexed</span>
            <p className="mt-0.5 font-mono text-xl font-bold text-blue-400">{readyCount}</p>
          </div>
        </div>
      </div>

      {/* Privacy & Security Guarantees */}
      <div className="rounded-[24px] border border-white/12 bg-white/[0.05] backdrop-blur-2xl p-4 space-y-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
        <div className="flex items-center gap-2 text-xs font-semibold text-white/60 uppercase tracking-wider px-0.5">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span>Security & Privacy</span>
        </div>

        <div className="space-y-3 text-xs text-white/80">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-500/20 border border-blue-400/30 text-blue-300 shrink-0 mt-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-white">Isolated Tenant Architecture</p>
              <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
                Your images and extracted metadata are scoped strictly by your user ID. No other account can query or stream your files.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 shrink-0 mt-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-white">No Public AI Training</p>
              <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
                Screenshots are indexed for personal search only. Data is never used to train public foundational models.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-purple-500/20 border border-purple-400/30 text-purple-300 shrink-0 mt-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-white">Complete Cascading Deletion</p>
              <p className="text-[11px] text-white/50 leading-relaxed mt-0.5">
                Deleting an image completely purges the disk file, OCR text records, chat sequence rows, game stats, and vector embeddings immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Liquid Glass Sign Out Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-red-500/30 bg-red-500/15 text-xs font-semibold text-red-300 active:scale-[0.98] active:bg-red-500/25 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="text-center pt-2 text-[10px] text-white/30 font-mono">
        RECALL Mobile • iOS Liquid Glass Edition
      </div>
    </div>
  );
};
