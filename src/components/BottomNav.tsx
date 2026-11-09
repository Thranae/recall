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

type TabItem = {
  key: TabType;
  label: string;
  Icon: typeof Layers;
  category?: string;
};

const TABS: (TabItem | null)[] = [
  { key: 'library', label: 'Library', Icon: Layers, category: 'all' },
  { key: 'search', label: 'Search', Icon: Search },
  null,
  { key: 'library', label: 'Chats', Icon: MessageSquare, category: 'chat' },
  { key: 'settings', label: 'Settings', Icon: User },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  selectedCategory = 'all',
  onSelectTab,
  onOpenUpload,
}) => {
  const isActive = (key: string, category?: string) => {
    if (key === 'library' && category === 'chat')
      return currentTab === 'library' && selectedCategory === 'chat';
    if (key === 'library')
      return currentTab === 'library' && selectedCategory !== 'chat';
    return currentTab === key;
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 pointer-events-none select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-md mx-auto px-4 pb-3">
        {/* Outer container allows elevated orb to extend upward cleanly */}
        <div className="pointer-events-auto relative w-full">
          {/* Main Floating Glass Bar Body */}
          <div className="relative rounded-[28px] bg-white/85 backdrop-blur-2xl border border-white/90 shadow-[0_12px_40px_-8px_rgba(15,23,42,0.12),0_4px_16px_rgba(0,0,0,0.04)] px-1">
            {/* Top specular highlight hairline */}
            <div
              className="absolute top-0 left-6 right-6 h-px pointer-events-none rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 30%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 70%, transparent 100%)',
              }}
            />

            {/* 5-Column Symmetrical Grid */}
            <div className="relative z-10 grid grid-cols-5 h-15 items-center">
              {TABS.map((item, idx) => {
                if (item === null) {
                  return (
                    <div key="center-add-orb" className="relative flex flex-col items-center justify-center h-full">
                      {/* Packwise Elevated Center Add Orb */}
                      <button
                        type="button"
                        onClick={onOpenUpload}
                        aria-label="Upload Screenshot"
                        className="absolute -top-5.5 flex items-center justify-center cursor-pointer focus:outline-none active:scale-90 transition-transform duration-200"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        {/* Outer Frosted Halo Ring */}
                        <div className="flex h-13.5 w-13.5 items-center justify-center rounded-full bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                          {/* Inner Royal Blue Dome */}
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#2F6BFF] via-[#3876FF] to-[#5AA9FF] text-white shadow-[0_4px_14px_rgba(47,107,255,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.65)]">
                            <Plus className="h-5 w-5 stroke-[2.8]" />
                          </div>
                        </div>
                      </button>
                      <span className="mt-8 text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                        Add
                      </span>
                    </div>
                  );
                }

                const active = isActive(item.key, item.category);
                const { Icon, label } = item;

                return (
                  <button
                    key={`${item.key}-${label}-${idx}`}
                    type="button"
                    onClick={() => onSelectTab(item.key, item.category)}
                    className="relative flex flex-col items-center justify-center h-full w-full cursor-pointer focus:outline-none transition-all duration-200 active:scale-95"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {/* Active Tab Background Pill */}
                    {active && (
                      <div className="absolute inset-x-1.5 inset-y-1.5 rounded-[20px] bg-white border border-white shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]" />
                    )}

                    <div
                      className={`relative z-10 flex items-center justify-center transition-transform duration-200 ${
                        active ? '-translate-y-0.5 scale-105' : ''
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 shrink-0 stroke-[2.2] transition-colors duration-200 ${
                          active
                            ? 'text-[#2F6BFF]'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      />
                    </div>

                    <span
                      className={`relative z-10 mt-1 text-[10px] leading-none transition-colors duration-200 ${
                        active
                          ? 'font-bold text-slate-900'
                          : 'font-medium text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
