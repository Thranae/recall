import React from 'react';
import { Layers, Search, Plus, MessageSquare, User } from 'lucide-react';

export type TabType = 'library' | 'search' | 'settings';

interface BottomNavProps {
  currentTab: TabType;
  selectedCategory?: string;
  onSelectTab: (tab: TabType, category?: string) => void;
  onOpenUpload: () => void;
  screenshotCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  selectedCategory = 'all',
  onSelectTab,
  onOpenUpload,
}) => {
  const isLibraryActive = currentTab === 'library' && selectedCategory !== 'chat';
  const isSearchActive = currentTab === 'search';
  const isChatsActive = currentTab === 'library' && selectedCategory === 'chat';
  const isSettingsActive = currentTab === 'settings';

  return (
    <div className="fixed bottom-3 inset-x-3 sm:bottom-6 sm:inset-x-0 z-40 max-w-md mx-auto pointer-events-none select-none">
      {/* Packwise Expo Style Floating Liquid Glass Tab Bar */}
      <div className="pointer-events-auto relative w-full rounded-[38px] shadow-[0_20px_48px_-6px_rgba(15,23,42,0.22),0_8px_24px_rgba(47,107,255,0.18)]">
        {/* Main Frosted Glass Body */}
        <div className="relative rounded-[38px] overflow-hidden border-[1.5px] border-white/95 border-t-[2px] border-t-white border-b-[2px] border-b-[#2F6BFF]/25 bg-gradient-to-b from-white/95 via-blue-50/75 to-blue-100/40 backdrop-blur-3xl px-2 py-1.5 shadow-[inset_0_2px_2px_rgba(255,255,255,1),inset_0_-2px_4px_rgba(47,107,255,0.08)]">
          {/* Subtle Top Caustic Light Sheen */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-black/[0.03] pointer-events-none" />

          {/* Symmetrical 5-Column Navigation Grid with Center Elevated Orb */}
          <div className="relative z-10 grid grid-cols-5 items-center">
            {/* Tab 1: Library (All Screenshots) */}
            <button
              type="button"
              onClick={() => onSelectTab('library', 'all')}
              className="group relative flex flex-col items-center justify-center h-12 w-full transition-all duration-200 active:scale-95"
            >
              {isLibraryActive && (
                <div className="absolute inset-0 rounded-[22px] bg-gradient-to-b from-white/95 via-blue-50/85 to-blue-100/60 border-[1.5px] border-white border-b-blue-500/25 shadow-[0_4px_14px_rgba(47,107,255,0.2),inset_0_1.5px_1.5px_rgba(255,255,255,1)]" />
              )}
              <div className={`relative z-10 transition-transform duration-200 ${isLibraryActive ? '-translate-y-0.5 scale-110' : ''}`}>
                <Layers
                  className={`h-5 w-5 shrink-0 stroke-[2.3] ${
                    isLibraryActive
                      ? 'text-[#2F6BFF] drop-shadow-[0_2px_6px_rgba(47,107,255,0.45)]'
                      : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                />
              </div>
              <span
                className={`relative z-10 mt-0.5 text-[9px] uppercase tracking-wider leading-none truncate ${
                  isLibraryActive ? 'font-black text-slate-900' : 'font-bold text-slate-500'
                }`}
              >
                Library
              </span>
            </button>

            {/* Tab 2: Search Engine */}
            <button
              type="button"
              onClick={() => onSelectTab('search')}
              className="group relative flex flex-col items-center justify-center h-12 w-full transition-all duration-200 active:scale-95"
            >
              {isSearchActive && (
                <div className="absolute inset-0 rounded-[22px] bg-gradient-to-b from-white/95 via-blue-50/85 to-blue-100/60 border-[1.5px] border-white border-b-blue-500/25 shadow-[0_4px_14px_rgba(47,107,255,0.2),inset_0_1.5px_1.5px_rgba(255,255,255,1)]" />
              )}
              <div className={`relative z-10 transition-transform duration-200 ${isSearchActive ? '-translate-y-0.5 scale-110' : ''}`}>
                <Search
                  className={`h-5 w-5 shrink-0 stroke-[2.3] ${
                    isSearchActive
                      ? 'text-[#2F6BFF] drop-shadow-[0_2px_6px_rgba(47,107,255,0.45)]'
                      : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                />
              </div>
              <span
                className={`relative z-10 mt-0.5 text-[9px] uppercase tracking-wider leading-none truncate ${
                  isSearchActive ? 'font-black text-slate-900' : 'font-bold text-slate-500'
                }`}
              >
                Search
              </span>
            </button>

            {/* Center Tab 3: Packwise Elevated Liquid Glass Add Orb */}
            <div className="relative flex items-center justify-center h-12">
              <button
                type="button"
                onClick={onOpenUpload}
                aria-label="Upload Screenshot"
                className="absolute -top-6 flex items-center justify-center transition-transform duration-200 active:scale-90 group cursor-pointer focus:outline-none"
              >
                {/* Packwise Outer Liquid Glass Halo Backdrop */}
                <div className="flex h-15 w-15 items-center justify-center rounded-full bg-gradient-to-b from-white/95 via-white/50 to-blue-200/30 border-[1.5px] border-white shadow-[0_8px_24px_rgba(47,107,255,0.3)] backdrop-blur-2xl">
                  {/* Packwise Inner Elevated Liquid Dome Button */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-full ios-liquid-primary text-white shadow-[0_8px_20px_rgba(47,107,255,0.55),inset_0_2px_3px_rgba(255,255,255,0.85),inset_0_-2px_4px_rgba(0,25,90,0.35)] border-[1.5px] border-white/60">
                    <Plus className="h-6 w-6 stroke-[3] text-white drop-shadow-sm transition-transform duration-200 group-active:rotate-90" />
                  </div>
                </div>
              </button>
              <span className="mt-7 text-[8px] font-black uppercase tracking-wider text-[#2F6BFF] leading-none">
                Add
              </span>
            </div>

            {/* Tab 4: Chats (Direct Conversation Flow Filter) */}
            <button
              type="button"
              onClick={() => onSelectTab('library', 'chat')}
              className="group relative flex flex-col items-center justify-center h-12 w-full transition-all duration-200 active:scale-95"
            >
              {isChatsActive && (
                <div className="absolute inset-0 rounded-[22px] bg-gradient-to-b from-white/95 via-blue-50/85 to-blue-100/60 border-[1.5px] border-white border-b-blue-500/25 shadow-[0_4px_14px_rgba(47,107,255,0.2),inset_0_1.5px_1.5px_rgba(255,255,255,1)]" />
              )}
              <div className={`relative z-10 transition-transform duration-200 ${isChatsActive ? '-translate-y-0.5 scale-110' : ''}`}>
                <MessageSquare
                  className={`h-5 w-5 shrink-0 stroke-[2.3] ${
                    isChatsActive
                      ? 'text-[#2F6BFF] drop-shadow-[0_2px_6px_rgba(47,107,255,0.45)]'
                      : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                />
              </div>
              <span
                className={`relative z-10 mt-0.5 text-[9px] uppercase tracking-wider leading-none truncate ${
                  isChatsActive ? 'font-black text-slate-900' : 'font-bold text-slate-500'
                }`}
              >
                Chats
              </span>
            </button>

            {/* Tab 5: Settings */}
            <button
              type="button"
              onClick={() => onSelectTab('settings')}
              className="group relative flex flex-col items-center justify-center h-12 w-full transition-all duration-200 active:scale-95"
            >
              {isSettingsActive && (
                <div className="absolute inset-0 rounded-[22px] bg-gradient-to-b from-white/95 via-blue-50/85 to-blue-100/60 border-[1.5px] border-white border-b-blue-500/25 shadow-[0_4px_14px_rgba(47,107,255,0.2),inset_0_1.5px_1.5px_rgba(255,255,255,1)]" />
              )}
              <div className={`relative z-10 transition-transform duration-200 ${isSettingsActive ? '-translate-y-0.5 scale-110' : ''}`}>
                <User
                  className={`h-5 w-5 shrink-0 stroke-[2.3] ${
                    isSettingsActive
                      ? 'text-[#2F6BFF] drop-shadow-[0_2px_6px_rgba(47,107,255,0.45)]'
                      : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                />
              </div>
              <span
                className={`relative z-10 mt-0.5 text-[9px] uppercase tracking-wider leading-none truncate ${
                  isSettingsActive ? 'font-black text-slate-900' : 'font-bold text-slate-500'
                }`}
              >
                Settings
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
