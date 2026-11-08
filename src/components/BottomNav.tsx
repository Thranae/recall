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
    <nav className="fixed bottom-0 left-0 right-0 z-40 ios-plump-bar pb-safe overflow-visible">
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-2 relative">
        {/* Library Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('library')}
          className={`flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-[16px] py-1.5 px-3 transition-transform duration-100 ease-out active:scale-95 ${
            currentTab === 'library'
              ? 'text-white font-semibold bg-gradient-to-b from-white/[0.2] to-white/[0.06] border border-white/25 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.3)]'
              : 'text-white/50 active:text-white'
          }`}
        >
          <Layers className="h-5 w-5 shrink-0" />
          <span className="text-[10px] tracking-tight leading-none">Library</span>
        </button>

        {/* Center Plumpy Liquid Glass Dome Action Button */}
        <div className="relative -top-3 flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenUpload}
            aria-label="Upload Screenshot"
            className="flex h-13 w-13 items-center justify-center rounded-full ios-plump-primary transition-transform duration-100 ease-out active:scale-90"
          >
            <Plus className="h-6 w-6 shrink-0 stroke-[2.75] text-white drop-shadow-md" />
          </button>
        </div>

        {/* Search Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('search')}
          className={`flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-[16px] py-1.5 px-3 transition-transform duration-100 ease-out active:scale-95 ${
            currentTab === 'search'
              ? 'text-white font-semibold bg-gradient-to-b from-white/[0.2] to-white/[0.06] border border-white/25 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.3)]'
              : 'text-white/50 active:text-white'
          }`}
        >
          <Search className="h-5 w-5 shrink-0" />
          <span className="text-[10px] tracking-tight leading-none">Search</span>
        </button>

        {/* Settings Tab */}
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={`flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-[16px] py-1.5 px-3 transition-transform duration-100 ease-out active:scale-95 ${
            currentTab === 'settings'
              ? 'text-white font-semibold bg-gradient-to-b from-white/[0.2] to-white/[0.06] border border-white/25 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.5),0_4px_12px_rgba(0,0,0,0.3)]'
              : 'text-white/50 active:text-white'
          }`}
        >
          <User className="h-5 w-5 shrink-0" />
          <span className="text-[10px] tracking-tight leading-none">Settings</span>
        </button>
      </div>
    </nav>
  );
};
