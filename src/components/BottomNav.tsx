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

const TAB_ITEMS: (TabItem | null)[] = [
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
      className="fixed bottom-3 inset-x-3 z-40 max-w-md mx-auto pointer-events-none select-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="pointer-events-auto relative w-full rounded-[34px]"
        style={{
          boxShadow: '0 12px 40px -8px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
        }}
      >
        {/* Frosted glass body — neutral tint, heavy blur */}
        <div
          className="relative rounded-[34px] overflow-hidden px-1 py-0.5"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.92), rgba(248,250,252,0.88), rgba(241,245,249,0.85))',
            backdropFilter: 'blur(48px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(48px) saturate(1.6)',
            border: '1px solid rgba(255,255,255,0.8)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -1px 2px rgba(0,0,0,0.03)',
          }}
        >
          {/* Top specular edge */}
          <div
            className="absolute top-0 left-4 right-4 h-[1px] pointer-events-none"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)' }}
          />

          <div className="relative z-10 grid grid-cols-5 items-end h-14">
            {TAB_ITEMS.map((item) => {
              if (item === null) {
                return (
                  <div key="orb" className="relative flex flex-col items-center justify-end h-14">
                    <button
                      type="button"
                      onClick={onOpenUpload}
                      aria-label="Upload Screenshot"
                      className="absolute -top-5 flex items-center justify-center transition-transform duration-200 active:scale-90 group cursor-pointer focus:outline-none"
                    >
                      {/* Outer frosted halo */}
                      <div
                        className="flex h-[56px] w-[56px] items-center justify-center rounded-full"
                        style={{
                          background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(241,245,249,0.7))',
                          backdropFilter: 'blur(24px)',
                          WebkitBackdropFilter: 'blur(24px)',
                          border: '1.5px solid rgba(255,255,255,0.9)',
                          boxShadow: '0 6px 20px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
                        }}
                      >
                        {/* Inner dome */}
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-full text-white"
                          style={{
                            background: 'linear-gradient(135deg, #4A8AFF 0%, #2F6BFF 50%, #1A56E8 100%)',
                            boxShadow: '0 6px 18px rgba(47,107,255,0.40), inset 0 1.5px 2px rgba(255,255,255,0.7), inset 0 -1.5px 3px rgba(0,20,80,0.3)',
                            border: '1.5px solid rgba(255,255,255,0.5)',
                          }}
                        >
                          <Plus className="h-5.5 w-5.5 stroke-[2.8] text-white drop-shadow-sm transition-transform duration-200 group-active:rotate-90" />
                        </div>
                      </div>
                    </button>
                    <span className="mb-1.5 text-[8px] font-bold uppercase tracking-widest text-slate-400 leading-none">
                      Add
                    </span>
                  </div>
                );
              }

              const active = isActive(item.key, item.category);
              const { Icon } = item;

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onSelectTab(item.key, item.category)}
                  className="group relative flex flex-col items-center justify-end h-14 w-full transition-all duration-200 active:scale-95"
                >
                  {active && (
                    <div
                      className="absolute inset-x-1 top-1 bottom-1 rounded-2xl"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(241,245,249,0.8))',
                        border: '1px solid rgba(255,255,255,0.9)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,0.9)',
                      }}
                    />
                  )}

                  <div className={`relative z-10 flex items-center justify-center h-5 transition-transform duration-200 ${active ? '-translate-y-0.5 scale-110' : ''}`}>
                    <Icon
                      className={`h-[20px] w-[20px] shrink-0 ${
                        active
                          ? 'text-[#2F6BFF] stroke-[2.4] drop-shadow-[0_1px_4px_rgba(47,107,255,0.35)]'
                          : 'text-slate-400 stroke-[2] group-hover:text-slate-600'
                      }`}
                    />
                  </div>

                  <span
                    className={`relative z-10 mt-1 mb-1.5 text-[9px] uppercase tracking-wider leading-none ${
                      active ? 'font-extrabold text-slate-800' : 'font-semibold text-slate-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
