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
    <div className="mx-auto w-full max-w-md px-4 pt-4 pb-32 space-y-4">
      {/* iOS 27 Plumpy Liquid Glass User Profile Card */}
      <div className="flex items-center gap-3.5 rounded-[28px] ios-plump-card p-4.5">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] ios-plump-icon-pod text-blue-300">
          <UserIcon className="h-6 w-6 shrink-0 drop-shadow-sm" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h2 className="text-sm font-bold text-white truncate tracking-tight">{user.name}</h2>
          <p className="text-xs text-white/55 truncate mt-0.5">{user.email}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-300 font-semibold">
            <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
            <span>Active Session • Encrypted</span>
          </div>
        </div>
      </div>

      {/* Storage & Indexing Stats */}
      <div className="rounded-[28px] ios-plump-card p-4.5 space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-white/60 uppercase tracking-wider px-1">
          <Database className="h-4 w-4 shrink-0 text-blue-400" />
          <span>Library Storage</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-[20px] ios-plump-pill p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">Screenshots</span>
            <p className="mt-1 font-mono text-2xl font-black text-white leading-none">{screenshots.length}</p>
          </div>
          <div className="rounded-[20px] ios-plump-pill p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">Indexed</span>
            <p className="mt-1 font-mono text-2xl font-black text-blue-400 leading-none">{readyCount}</p>
          </div>
        </div>
      </div>

      {/* Privacy & Security Guarantees */}
      <div className="rounded-[28px] ios-plump-card p-4.5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-white/60 uppercase tracking-wider px-1">
          <Shield className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>Security & Privacy</span>
        </div>

        <div className="space-y-3.5 text-xs text-white/85">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ios-plump-icon-pod text-blue-300 mt-0.5">
              <Lock className="h-4 w-4 shrink-0" />
            </div>
            <div>
              <p className="font-bold text-white leading-tight">Isolated Tenant Architecture</p>
              <p className="text-[11px] text-white/55 leading-relaxed mt-1">
                Your images and extracted metadata are scoped strictly by your user ID. No other account can query or stream your files.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ios-plump-icon-pod text-emerald-300 mt-0.5">
              <Shield className="h-4 w-4 shrink-0" />
            </div>
            <div>
              <p className="font-bold text-white leading-tight">No Public AI Training</p>
              <p className="text-[11px] text-white/55 leading-relaxed mt-1">
                Screenshots are indexed for personal search only. Data is never used to train public foundational models.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ios-plump-icon-pod text-purple-300 mt-0.5">
              <Database className="h-4 w-4 shrink-0" />
            </div>
            <div>
              <p className="font-bold text-white leading-tight">Complete Cascading Deletion</p>
              <p className="text-[11px] text-white/55 leading-relaxed mt-1">
                Deleting an image completely purges the disk file, OCR text records, chat sequence rows, game stats, and vector embeddings immediately.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Plumpy Sign Out Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-red-500/40 bg-gradient-to-b from-red-500/25 to-red-700/25 text-xs font-bold text-red-200 active:scale-[0.98] transition-transform shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35),0_6px_20px_rgba(239,68,68,0.3)]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="text-center pt-2 text-[10px] text-white/35 font-mono">
        RECALL Mobile • iOS 27 Plumpy Liquid Glass
      </div>
    </div>
  );
};
