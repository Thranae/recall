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
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-36 space-y-4">
      {/* 1. iOS User Profile Card */}
      <div className="flex items-center gap-3.5 rounded-2xl bg-white border border-black/[0.06] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[#2F6BFF] border border-slate-200/80">
          <UserIcon className="h-6 w-6 stroke-[2]" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h2 className="text-sm font-bold text-slate-900 truncate tracking-tight">{user.name}</h2>
          <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.2]" />
            <span>Encrypted Session</span>
          </div>
        </div>
      </div>

      {/* 2. Library Statistics Inset Group */}
      <div className="rounded-2xl bg-white border border-black/[0.06] p-4 space-y-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Database className="h-3.5 w-3.5 text-[#2F6BFF] stroke-[2.2]" />
          <span>Library Storage</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-center">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <span className="text-[11px] font-medium text-slate-400 block">Screenshots</span>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900 leading-none">{screenshots.length}</p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <span className="text-[11px] font-medium text-slate-400 block">Indexed</span>
            <p className="mt-1 font-mono text-2xl font-bold text-[#2F6BFF] leading-none">{readyCount}</p>
          </div>
        </div>
      </div>

      {/* 3. Security & Isolation Inset Group */}
      <div className="rounded-2xl bg-white border border-black/[0.06] p-4 space-y-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Shield className="h-3.5 w-3.5 text-emerald-600 stroke-[2.2]" />
          <span>Security & Privacy Architecture</span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#2F6BFF] mt-0.5">
              <Lock className="h-3.5 w-3.5 stroke-[2]" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 leading-tight">Isolated Tenant Architecture</p>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Your images, OCR text, and relational data are scoped strictly by your user ID.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 mt-0.5">
              <Shield className="h-3.5 w-3.5 stroke-[2]" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 leading-tight">Zero AI Model Training</p>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Screenshots are indexed for your personal search only. Data is never used to train public models.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 mt-0.5">
              <Database className="h-3.5 w-3.5 stroke-[2]" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 leading-tight">Cascading Deletion</p>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                Deleting a screenshot immediately purges the disk file, OCR text, chat nodes, and vector indices.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Apple Destructive Sign Out Button */}
      <button
        type="button"
        onClick={onLogout}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50/50 active:scale-[0.98] transition-all shadow-[0_1px_4px_rgba(0,0,0,0.02)] cursor-pointer"
      >
        <LogOut className="h-4 w-4 stroke-[2]" />
        <span>Sign Out</span>
      </button>

      <div className="text-center pt-2 text-[11px] text-slate-400">
        RECALL for iOS & Web • Production Build
      </div>
    </div>
  );
};
