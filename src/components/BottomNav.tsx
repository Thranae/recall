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
    <nav className="fixed bottom-0 left-0 right-0 z-40 ios-plump-bar pb-safe">
      <div className="mx-auto grid max-w-md grid-cols-4 items-center px-3 py-2">
        {/* Tab 1: Library */}
        <button
          type="button"
          onClick={() => onSelectTab('library')}
          className={`group flex flex-col items-center justify-center py-1 transition-transform duration-100 ease-out active:scale-95 ${
            currentTab === 'library' ? 'text-white' : 'text-white/50 active:text-white'
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 ${
              currentTab === 'library'
                ? 'bg-gradient-to-b from-white/[0.22] to-white/[0.08] border border-white/30 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.6),0_4px_14px_rgba(0,0,0,0.35)]'
                : 'hover:bg-white/5'
            }`}
          >
            <Layers className="h-5 w-5 shrink-0 drop-shadow-sm" />
          </div>
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none text-center ${
              currentTab === 'library' ? 'font-bold text-white' : 'font-medium text-white/55'
            }`}
          >
            Library
          </span>
        </button>

        {/* Tab 2: Search */}
        <button
          type="button"
          onClick={() => onSelectTab('search')}
          className={`group flex flex-col items-center justify-center py-1 transition-transform duration-100 ease-out active:scale-95 ${
            currentTab === 'search' ? 'text-white' : 'text-white/50 active:text-white'
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 ${
              currentTab === 'search'
                ? 'bg-gradient-to-b from-white/[0.22] to-white/[0.08] border border-white/30 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.6),0_4px_14px_rgba(0,0,0,0.35)]'
                : 'hover:bg-white/5'
            }`}
          >
            <Search className="h-5 w-5 shrink-0 drop-shadow-sm" />
          </div>
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none text-center ${
              currentTab === 'search' ? 'font-bold text-white' : 'font-medium text-white/55'
            }`}
          >
            Search
          </span>
        </button>

        {/* Tab 3: Add / Import (Center Liquid Dome Pebble) */}
        <button
          type="button"
          onClick={onOpenUpload}
          aria-label="Upload Screenshot"
          className="group flex flex-col items-center justify-center py-1 transition-transform duration-100 ease-out active:scale-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full ios-plump-primary text-white shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.8),0_6px_18px_rgba(0,122,255,0.5)]">
            <Plus className="h-5 w-5 shrink-0 stroke-[3] drop-shadow-md text-white" />
          </div>
          <span className="mt-1 text-[10px] font-bold text-blue-300 tracking-tight leading-none text-center">
            Add
          </span>
        </button>

        {/* Tab 4: Settings */}
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={`group flex flex-col items-center justify-center py-1 transition-transform duration-100 ease-out active:scale-95 ${
            currentTab === 'settings' ? 'text-white' : 'text-white/50 active:text-white'
          }`}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 ${
              currentTab === 'settings'
                ? 'bg-gradient-to-b from-white/[0.22] to-white/[0.08] border border-white/30 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.6),0_4px_14px_rgba(0,0,0,0.35)]'
                : 'hover:bg-white/5'
            }`}
          >
            <User className="h-5 w-5 shrink-0 drop-shadow-sm" />
          </div>
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none text-center ${
              currentTab === 'settings' ? 'font-bold text-white' : 'font-medium text-white/55'
            }`}
          >
            Settings
          </span>
        </button>
      </div>
    </nav>
  );
};
