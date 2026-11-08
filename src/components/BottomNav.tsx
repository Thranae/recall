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
      <div className="max-w-md mx-auto px-3 pb-2.5">
        {/* Outer wrapper — NO overflow hidden so center orb can poke out */}
        <div className="pointer-events-auto relative w-full">

          {/* Glass bar body — the visible rounded bar */}
          <div className="nav-glass-bar relative rounded-[32px] px-1.5">

            {/* Top caustic specular edge */}
            <div
              className="absolute top-0 left-6 right-6 h-px pointer-events-none rounded-full"
              style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.9) 70%, transparent 100%)' }}
            />

            {/* 5-column grid */}
            <div className="relative z-10 grid grid-cols-5 h-16">

              {TABS.map((item) => {
                if (item === null) {
                  return (
                    <div key="center-orb" className="relative flex flex-col items-center justify-end h-16 pb-1.5">
                      {/* Center floating orb — positioned above the bar */}
                      <button
                        type="button"
                        onClick={onOpenUpload}
                        aria-label="Add Screenshot"
                        className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center justify-center cursor-pointer focus:outline-none nav-orb-bounce"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        {/* Outer frosted glass halo ring */}
                        <div className="nav-orb-halo flex items-center justify-center h-14 w-14 rounded-full">
                          {/* Inner blue dome */}
                          <div className="nav-orb-dome flex items-center justify-center h-11 w-11 rounded-full">
                            <Plus className="h-5 w-5 stroke-[2.8] text-white" />
                          </div>
                        </div>
                      </button>
                      <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400/80 leading-none">
                        Add
                      </span>
                    </div>
                  );
                }

                const active = isActive(item.key, item.category);
                const { Icon, label } = item;

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onSelectTab(item.key, item.category)}
                    className="relative flex flex-col items-center justify-center h-16 w-full cursor-pointer focus:outline-none"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {/* Active glass pill backdrop */}
                    <div
                      className={`absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-[18px] nav-active-pill transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                        active ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                      }`}
                    />

                    {/* Icon in glass pod */}
                    <div
                      className={`relative z-10 flex items-center justify-center w-9 h-9 rounded-[14px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                        active
                          ? 'nav-icon-pod-active -translate-y-0.5 scale-105'
                          : 'nav-icon-pod-idle scale-100 translate-y-0'
                      }`}
                    >
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 transition-all duration-300 ${
                          active
                            ? 'text-[#2F6BFF] stroke-[2.3]'
                            : 'text-slate-400 stroke-[1.8]'
                        }`}
                      />
                    </div>

                    {/* Label */}
                    <span
                      className={`relative z-10 mt-0.5 text-[8.5px] uppercase tracking-[0.06em] leading-none transition-all duration-300 ${
                        active
                          ? 'font-extrabold text-slate-700 translate-y-0 opacity-100'
                          : 'font-semibold text-slate-400 translate-y-0 opacity-70'
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
