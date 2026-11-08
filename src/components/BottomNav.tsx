import React from 'react';
import { Layers, Search, Plus, User } from 'lucide-react';

export type TabType = 'library' | 'search' | 'settings';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenUpload: () => void;
  screenshotCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenUpload,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/12 bg-black/65 backdrop-blur-3xl pb-safe shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_-8px_32px_rgba(0,0,0,0.6)]">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        {/* Library Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('library')}
          className={`flex flex-col items-center gap-1 rounded-2xl py-1.5 px-4 text-[11px] font-medium transition-all active:scale-95 ${
            currentTab === 'library'
              ? 'text-white font-semibold bg-white/12 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
              : 'text-white/50 active:bg-white/5'
          }`}
        >
          <Layers className="h-5 w-5" />
          <span>Library</span>
        </button>

        {/* Center Liquid Glass Plus Button */}
        <button
          type="button"
          onClick={onOpenUpload}
          aria-label="Upload Screenshot"
          className="relative -top-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.55),0_6px_20px_rgba(0,122,255,0.45)] border border-white/30 transition-transform active:scale-90"
        >
          <Plus className="h-6 w-6 stroke-[2.5] drop-shadow-sm" />
        </button>

        {/* Search Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('search')}
          className={`flex flex-col items-center gap-1 rounded-2xl py-1.5 px-4 text-[11px] font-medium transition-all active:scale-95 ${
            currentTab === 'search'
              ? 'text-white font-semibold bg-white/12 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
              : 'text-white/50 active:bg-white/5'
          }`}
        >
          <Search className="h-5 w-5" />
          <span>Search</span>
        </button>

        {/* Settings Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center gap-1 rounded-2xl py-1.5 px-4 text-[11px] font-medium transition-all active:scale-95 ${
            currentTab === 'settings'
              ? 'text-white font-semibold bg-white/12 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
              : 'text-white/50 active:bg-white/5'
          }`}
        >
          <User className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
};
