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
          className="group flex flex-col items-center justify-center py-1 transition-transform duration-100 ease-out active:scale-95"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 ${
              currentTab === 'library'
                ? 'bg-blue-50/90 border border-blue-500/25 text-blue-600 shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_2px_8px_rgba(37,99,235,0.15)]'
                : 'text-slate-600 hover:text-slate-900 active:bg-slate-100/50'
            }`}
          >
            <Layers className="h-5 w-5 shrink-0 stroke-[2.2] drop-shadow-xs" />
          </div>
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none text-center ${
              currentTab === 'library' ? 'font-bold text-blue-600' : 'font-medium text-slate-600'
            }`}
          >
            Library
          </span>
        </button>

        {/* Tab 2: Search */}
        <button
          type="button"
          onClick={() => onSelectTab('search')}
          className="group flex flex-col items-center justify-center py-1 transition-transform duration-100 ease-out active:scale-95"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 ${
              currentTab === 'search'
                ? 'bg-blue-50/90 border border-blue-500/25 text-blue-600 shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_2px_8px_rgba(37,99,235,0.15)]'
                : 'text-slate-600 hover:text-slate-900 active:bg-slate-100/50'
            }`}
          >
            <Search className="h-5 w-5 shrink-0 stroke-[2.2] drop-shadow-xs" />
          </div>
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none text-center ${
              currentTab === 'search' ? 'font-bold text-blue-600' : 'font-medium text-slate-600'
            }`}
          >
            Search
          </span>
        </button>

        {/* Tab 3: Add (Apple iOS Blue Liquid Dome) */}
        <button
          type="button"
          onClick={onOpenUpload}
          aria-label="Upload Screenshot"
          className="group flex flex-col items-center justify-center py-1 transition-transform duration-100 ease-out active:scale-90"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full ios-plump-primary text-white shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.85),0_6px_16px_rgba(37,99,235,0.35)]">
            <Plus className="h-5 w-5 shrink-0 stroke-[3] drop-shadow-sm text-white" />
          </div>
          <span className="mt-1 text-[10px] font-bold text-blue-600 tracking-tight leading-none text-center">
            Add
          </span>
        </button>

        {/* Tab 4: Settings */}
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className="group flex flex-col items-center justify-center py-1 transition-transform duration-100 ease-out active:scale-95"
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-150 ${
              currentTab === 'settings'
                ? 'bg-blue-50/90 border border-blue-500/25 text-blue-600 shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_2px_8px_rgba(37,99,235,0.15)]'
                : 'text-slate-600 hover:text-slate-900 active:bg-slate-100/50'
            }`}
          >
            <User className="h-5 w-5 shrink-0 stroke-[2.2] drop-shadow-xs" />
          </div>
          <span
            className={`mt-1 text-[10px] tracking-tight leading-none text-center ${
              currentTab === 'settings' ? 'font-bold text-blue-600' : 'font-medium text-slate-600'
            }`}
          >
            Settings
          </span>
        </button>
      </div>
    </nav>
  );
};
