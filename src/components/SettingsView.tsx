import React, { useState } from 'react';
import { RefreshCw, Cpu, Loader2, User as UserIcon, Shield, Database, Lock, LogOut, CheckCircle2, Trash2, CopyCheck } from 'lucide-react';
import { api } from '../services/api';
import type { User, Screenshot, VaultInsightsSummary } from '../types';

interface SettingsViewProps {
  user: User;
  screenshots: Screenshot[];
  onLogout: () => void;
  onRefresh?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  screenshots,
  onLogout,
  onRefresh,
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeNote, setUpgradeNote] = useState<string | null>(null);
  const [isScanningDups, setIsScanningDups] = useState(false);
  const [dupSummary, setDupSummary] = useState<VaultInsightsSummary | null>(null);
  const [isCleaningDups, setIsCleaningDups] = useState(false);

  const handleUpgradeVisionIndex = async () => {
    if (isUpgrading) return;
    setIsUpgrading(true);
    setUpgradeNote(null);
    try {
      const res = await api.reanalyzeBatch();
      setUpgradeNote(res.message);
      onRefresh?.();
    } catch (err: any) {
      setUpgradeNote(err.message || 'Vision index upgrade failed.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleScanDuplicates = async () => {
    if (isScanningDups) return;
    setIsScanningDups(true);
    try {
      const res = await api.getVaultInsights();
      setDupSummary(res);
    } catch (err) {
      console.error('Duplicate scan failed:', err);
    } finally {
      setIsScanningDups(false);
    }
  };

  const handleDeleteDuplicates = async () => {
    if (!dupSummary || dupSummary.duplicate_groups.length === 0 || isCleaningDups) return;
    setIsCleaningDups(true);
    try {
      const ids = dupSummary.duplicate_groups.flatMap((g) => g.duplicates.map((d) => d.id));
      await api.cleanDuplicates(ids);
      const res = await api.getVaultInsights();
      setDupSummary(res);
      onRefresh?.();
    } catch (err) {
      console.error('Clean duplicates failed:', err);
    } finally {
      setIsCleaningDups(false);
    }
  };
  const readyCount = screenshots.filter((s) => s.processing_status === 'ready').length;

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-2 pb-36 space-y-4">
      {/* 1. User Profile Card */}
      <div className="liquid-glass-card flex items-center gap-3.5 rounded-[22px] p-4.5">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            className="h-13 w-13 shrink-0 rounded-[18px] object-cover border border-white shadow-2xs"
          />
        ) : (
          <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] liquid-icon-pod text-slate-700">
            <UserIcon className="h-6 w-6 stroke-[2]" />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-[#172B4D] truncate tracking-tight">{user.name}</h2>
            {(user.google_id || user.email.includes('@gmail.com')) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9.5px] font-bold text-[#3478F6] border border-blue-100">
                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{user.email}</p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.2]" />
            <span>Encrypted Session Active</span>
          </div>
        </div>
      </div>

      {/* 2. Library Storage Summary (No nested boxes) */}
      <div className="liquid-glass-card rounded-[22px] p-4.5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Database className="h-4 w-4 text-[#3478F6] stroke-[2]" />
          <span>Library Storage</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center pt-1">
          <div>
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Screenshots</span>
            <p className="mt-1 font-mono text-2xl font-bold text-[#172B4D] leading-none">{screenshots.length}</p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">Indexed</span>
            <p className="mt-1 font-mono text-2xl font-bold text-[#3478F6] leading-none">{readyCount}</p>
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

      {/* Vision Index Upgrade Card */}
      <div className="liquid-glass-card rounded-[24px] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] liquid-icon-pod text-[#3478F6]">
            <Cpu className="h-4.5 w-4.5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#172B4D]">Upgrade Visual Search Index</p>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 font-normal">
              Re-analyze existing photos and screenshots so older uploads detect people, clothing colors, and objects.
            </p>
          </div>
        </div>

        {upgradeNote && (
          <div className="rounded-[14px] bg-blue-50/80 border border-blue-100 px-3 py-2 text-[11px] font-medium text-[#172B4D]">
            {upgradeNote}
          </div>
        )}

        <button
          type="button"
          onClick={handleUpgradeVisionIndex}
          disabled={isUpgrading || screenshots.length === 0}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full liquid-glass-pill text-xs font-semibold text-[#3478F6] disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
        >
          {isUpgrading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Upgrading Vision Index...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5 stroke-[2.2]" />
              <span>Re-analyze Existing Library ({screenshots.length})</span>
            </>
          )}
        </button>
      </div>

      {/* Near-Duplicate Cleanup Radar Card */}
      <div className="liquid-glass-card rounded-[24px] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] liquid-icon-pod text-amber-600">
            <CopyCheck className="h-4.5 w-4.5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-[#172B4D]">Duplicate Screenshot Radar</p>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5 font-normal">
              Find identical or near-duplicate burst screenshots using vector & size matching so your gallery stays clean.
            </p>
          </div>
        </div>

        {dupSummary && (
          <div className="rounded-[14px] bg-white/80 border border-white p-3 space-y-2 text-[11px]">
            {dupSummary.duplicate_count === 0 ? (
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Your vault has zero near-duplicate screenshots.</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-800">
                    Found {dupSummary.duplicate_count} duplicate{dupSummary.duplicate_count === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteDuplicates}
                    disabled={isCleaningDups}
                    className="inline-flex items-center gap-1 rounded-full bg-rose-500 text-white px-2.5 py-1 text-[10px] font-bold active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>{isCleaningDups ? 'Removing...' : 'Clean All'}</span>
                  </button>
                </div>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {dupSummary.duplicate_groups.map((grp) =>
                    grp.duplicates.map((d) => (
                      <p key={d.id} className="text-[10.5px] text-slate-600 truncate">
                        • {d.original_filename} ({d.reason})
                      </p>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleScanDuplicates}
          disabled={isScanningDups || screenshots.length < 2}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-full liquid-glass-pill text-xs font-semibold text-slate-700 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
        >
          {isScanningDups ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3478F6]" />
              <span>Scanning Vault...</span>
            </>
          ) : (
            <span>Scan for Near-Duplicates</span>
          )}
        </button>
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
