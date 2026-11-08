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
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-36 space-y-3.5">
      {/* Packwise Style Liquid Glass User Profile Card */}
      <div className="flex items-center gap-3.5 rounded-[28px] ios-glass-card p-4.5">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] ios-glass-icon-pod text-[#2F6BFF] relative z-10">
          <UserIcon className="h-6 w-6 shrink-0 stroke-[2.2]" />
        </div>
        <div className="flex-1 overflow-hidden relative z-10">
          <h2 className="text-sm font-black text-slate-900 truncate tracking-tight">{user.name}</h2>
          <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">{user.email}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 stroke-[2.5]" />
            <span>Active Session • Encrypted</span>
          </div>
        </div>
      </div>

      {/* Storage & Indexing Stats */}
      <div className="rounded-[28px] ios-glass-card p-4.5 space-y-3.5">
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider px-1 relative z-10">
          <Database className="h-4 w-4 shrink-0 text-[#2F6BFF] stroke-[2.2]" />
          <span>Library Storage</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-center relative z-10">
          <div className="rounded-[20px] ios-glass-pill p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold relative z-10 block">Screenshots</span>
            <p className="mt-1 font-mono text-2xl font-black text-slate-900 leading-none relative z-10">{screenshots.length}</p>
          </div>
          <div className="rounded-[20px] ios-glass-pill p-3.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-extrabold relative z-10 block">Indexed</span>
            <p className="mt-1 font-mono text-2xl font-black text-[#2F6BFF] leading-none relative z-10">{readyCount}</p>
          </div>
        </div>
      </div>

      {/* Privacy & Security Guarantees */}
      <div className="rounded-[28px] ios-glass-card p-4.5 space-y-3.5">
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider px-1 relative z-10">
          <Shield className="h-4 w-4 shrink-0 text-emerald-600 stroke-[2.2]" />
          <span>Security & Privacy</span>
        </div>

        <div className="space-y-3 text-xs relative z-10">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ios-glass-icon-pod text-[#2F6BFF] mt-0.5">
              <Lock className="h-4 w-4 shrink-0 stroke-[2.2]" />
            </div>
            <div>
              <p className="font-black text-slate-900 leading-tight">Isolated Tenant Architecture</p>
              <p className="text-[11px] text-slate-600 font-semibold leading-relaxed mt-0.5">
                Your images and extracted metadata are scoped strictly by your user ID. No other account can query or stream your files.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ios-glass-icon-pod text-emerald-600 mt-0.5">
              <Shield className="h-4 w-4 shrink-0 stroke-[2.2]" />
            </div>
            <div>
              <p className="font-black text-slate-900 leading-tight">No Public AI Training</p>
              <p className="text-[11px] text-slate-600 font-semibold leading-relaxed mt-0.5">
                Screenshots are indexed for personal search only. Data is never used to train public foundational models.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[13px] ios-glass-icon-pod text-purple-600 mt-0.5">
              <Database className="h-4 w-4 shrink-0 stroke-[2.2]" />
            </div>
            <div>
              <p className="font-black text-slate-900 leading-tight">Complete Cascading Deletion</p>
              <p className="text-[11px] text-slate-600 font-semibold leading-relaxed mt-0.5">
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
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-rose-300 bg-rose-50/90 text-xs font-black text-rose-600 active:scale-[0.98] transition-transform shadow-sm backdrop-blur-md"
        >
          <LogOut className="h-4 w-4 shrink-0 stroke-[2.2]" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="text-center pt-2 text-[10px] text-slate-400 font-mono">
        RECALL Mobile • Packwise 3D Liquid Glass System
      </div>
    </div>
  );
};
