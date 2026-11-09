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
    <div className="mx-auto w-full max-w-md px-4 pt-2 pb-36 space-y-4">
      {/* 1. User Profile Card */}
      <div className="liquid-glass-card flex items-center gap-3.5 rounded-[22px] p-4.5">
        <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] liquid-icon-pod text-slate-700">
          <UserIcon className="h-6 w-6 stroke-[2]" />
        </div>
        <div className="flex-1 overflow-hidden">
          <h2 className="text-[15px] font-bold text-slate-800 truncate tracking-tight">{user.name}</h2>
          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{user.email}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.2]" />
            <span>Encrypted Session</span>
          </div>
        </div>
      </div>

      {/* 2. Library Storage Summary (No nested boxes) */}
      <div className="liquid-glass-card rounded-[22px] p-4.5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Database className="h-4 w-4 text-[#708238] stroke-[2]" />
          <span>Library Storage</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center pt-1">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Screenshots</span>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-800 leading-none">{screenshots.length}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Indexed</span>
            <p className="mt-1 font-mono text-2xl font-bold text-[#708238] leading-none">{readyCount}</p>
          </div>
        </div>
      </div>

      {/* 3. Security & Isolation Inset Group (No nested boxes) */}
      <div className="liquid-glass-card rounded-[22px] p-4.5 space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Shield className="h-4 w-4 text-emerald-700 stroke-[2]" />
          <span>Security & Privacy Architecture</span>
        </div>

        <div className="space-y-3.5 text-xs">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] liquid-icon-pod text-slate-600 mt-0.5">
              <Lock className="h-3.5 w-3.5 stroke-[2]" />
            </div>
            <div>
              <p className="font-bold text-slate-800 leading-snug">Isolated Tenant Architecture</p>
              <p className="text-[11.5px] text-slate-500 leading-relaxed mt-0.5 font-normal">
                Your images, OCR text, and relational data are scoped strictly by your user ID.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] liquid-icon-pod text-emerald-700 mt-0.5">
              <Shield className="h-3.5 w-3.5 stroke-[2]" />
            </div>
            <div>
              <p className="font-bold text-slate-800 leading-snug">Zero AI Model Training</p>
              <p className="text-[11.5px] text-slate-500 leading-relaxed mt-0.5 font-normal">
                Screenshots are indexed for your personal search only. Data is never used to train public models.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] liquid-icon-pod text-purple-700 mt-0.5">
              <Database className="h-3.5 w-3.5 stroke-[2]" />
            </div>
            <div>
              <p className="font-bold text-slate-800 leading-snug">Cascading Deletion</p>
              <p className="text-[11.5px] text-slate-500 leading-relaxed mt-0.5 font-normal">
                Deleting a screenshot immediately purges the disk file, OCR text, chat nodes, and vector indices.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sign Out Button */}
      <button
        type="button"
        onClick={onLogout}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full liquid-glass-pill border-rose-200 text-xs font-semibold text-rose-600 active:bg-rose-50 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
      >
        <LogOut className="h-4 w-4 stroke-[2]" />
        <span>Sign Out</span>
      </button>

      <div className="text-center pt-2 text-[11px] text-slate-400 font-mono">
        RECALL for iOS & Web • v1.0.0
      </div>
    </div>
  );
};
