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
      {/* Subtle Cloudy Footer Blur under the Bottom Nav Bar (Expo project reference) */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none -z-10"
        style={{
          height: 'calc(88px + env(safe-area-inset-bottom, 0px))',
          background:
            'linear-gradient(to top, rgba(250, 247, 245, 0.90) 0%, rgba(247, 235, 230, 0.40) 45%, transparent 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          maskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
        }}
      />

      <div className="max-w-md mx-auto px-4 pb-3">
        {/* Outer container allows elevated orb to extend upward cleanly */}
        <div className="pointer-events-auto relative w-full">
          {/* Main Floating Plump Liquid Glass Bar Body */}
          <div className="relative rounded-[40px] nav-glass-bar px-1.5">
            {/* Top specular highlight hairline */}
            <div
              className="absolute top-0 left-6 right-6 h-px pointer-events-none rounded-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 30%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 70%, transparent 100%)',
              }}
            />

            {/* 5-Column Symmetrical Grid */}
            <div className="relative z-10 grid grid-cols-5 h-17 items-center">
              {TABS.map((item, idx) => {
                if (item === null) {
                  return (
                    <div key="center-add-orb" className="relative flex flex-col items-center justify-center h-full">
                      {/* Packwise Elevated Center Add Orb */}
                      <button
                        type="button"
                        onClick={onOpenUpload}
                        aria-label="Upload Screenshot"
                        className="absolute -top-5 flex items-center justify-center cursor-pointer focus:outline-none active:scale-90 transition-transform duration-200"
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        {/* Outer Frosted Halo Ring */}
                        <div className="flex h-14 w-14 items-center justify-center rounded-full nav-orb-halo">
                          {/* Inner Slate-Blue Liquid Dome with Glossy Crest */}
                          <div className="flex h-11 w-11 items-center justify-center rounded-full nav-orb-dome text-white">
                            <Plus className="h-5 w-5 stroke-[2.8]" />
                          </div>
                        </div>
                      </button>
                      <span className="mt-8 text-[9.5px] font-bold text-stone-600 uppercase tracking-wider leading-none">
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
                    className="relative flex flex-col items-center justify-center h-full w-full cursor-pointer focus:outline-none transition-all duration-200 active:scale-95 py-1"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {/* Plumpy Liquid Glass Icon Pod (Expo Style) */}
                    <div className="relative z-10 flex items-center justify-center">
                      {active ? (
                        <div className="nav-selected-icon-pod">
                          <Icon className="h-5 w-5 stroke-[2.4] text-[#7D2820]" />
                        </div>
                      ) : (
                        <div className="nav-unselected-icon-pod">
                          <Icon className="h-4.5 w-4.5 stroke-[2.4] text-stone-800" />
                        </div>
                      )}
                    </div>

                    <span
                      className={`relative z-10 text-[9.5px] uppercase tracking-wider leading-none transition-all duration-200 ${
                        active
                          ? 'mt-0.5 font-extrabold text-[#7D2820]'
                          : 'mt-1 font-bold text-stone-600'
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
