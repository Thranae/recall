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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-xl pb-safe">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2">
        {/* Library Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('library')}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-all active:scale-95 ${
            currentTab === 'library' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Layers className="h-5 w-5" />
          </div>
          <span>Library</span>
        </button>

        {/* Center Upload Button */}
        <button
          type="button"
          onClick={onOpenUpload}
          aria-label="Upload Screenshot"
          className="relative -top-2 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 ring-4 ring-slate-950 transition-transform active:scale-90"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>

        {/* Search Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('search')}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-all active:scale-95 ${
            currentTab === 'search' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="h-5 w-5" />
          <span>Search</span>
        </button>

        {/* Profile & Settings Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium transition-all active:scale-95 ${
            currentTab === 'settings' ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <User className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
};
