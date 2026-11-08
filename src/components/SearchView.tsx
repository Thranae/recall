import React from 'react';
import {
  Search,
  X,
  MessageSquare,
  Trophy,
  ShoppingBag,
  FileText,
  SlidersHorizontal,
  SearchX,
  Loader2,
  Compass,
} from 'lucide-react';
import type { SearchResponse, SearchResultItem } from '../types';
import { ScreenshotCard } from './ScreenshotCard';

interface SearchViewProps {
  query: string;
  onChangeQuery: (q: string) => void;
  onSubmitSearch: (e?: React.FormEvent) => void;
  onClearSearch: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  isSearching: boolean;
  searchResults: SearchResponse | null;
  onSelectScreenshot: (id: string, searchResult?: SearchResultItem) => void;
}

// Exactly 3 filter chips
const CATEGORIES = [
  { id: 'all', label: 'All', icon: SlidersHorizontal },
  { id: 'chat', label: 'Chats', icon: MessageSquare },
  { id: 'game', label: 'Gaming', icon: Trophy },
];

const VISUAL_TOPICS = [
  {
    title: 'Chat Sequence',
    subtitle: 'Ordered message flow in 1 screenshot',
    query: 'I said "I love you" and she replied "I love you too"',
    icon: MessageSquare,
    badge: 'Relational',
    gradient: 'from-white via-blue-50/70 to-indigo-50/40',
    border: 'border-blue-200/80',
    iconColor: 'text-blue-700 bg-blue-100/90 border-blue-200',
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    title: 'Match Stats',
    subtitle: 'Filter BGMI matches by exact kills > 15',
    query: 'BGMI match with kills > 15',
    icon: Trophy,
    badge: 'Stats Filter',
    gradient: 'from-white via-amber-50/70 to-orange-50/40',
    border: 'border-amber-200/80',
    iconColor: 'text-amber-800 bg-amber-100/90 border-amber-200',
    badgeColor: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  {
    title: 'Visual Items',
    subtitle: 'Search black shirt, sneakers & apparel',
    query: 'black shirt',
    icon: ShoppingBag,
    badge: 'Visual Search',
    gradient: 'from-white via-purple-50/70 to-fuchsia-50/40',
    border: 'border-purple-200/80',
    iconColor: 'text-purple-700 bg-purple-100/90 border-purple-200',
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    title: 'Posters & OCR',
    subtitle: 'Extract fest dates, addresses & venue text',
    query: 'Coimbatore fest address',
    icon: FileText,
    badge: 'Address OCR',
    gradient: 'from-white via-emerald-50/70 to-teal-50/40',
    border: 'border-emerald-200/80',
    iconColor: 'text-emerald-700 bg-emerald-100/90 border-emerald-200',
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
];

export const SearchView: React.FC<SearchViewProps> = ({
  query,
  onChangeQuery,
  onSubmitSearch,
  onClearSearch,
  selectedCategory,
  onSelectCategory,
  isSearching,
  searchResults,
  onSelectScreenshot,
}) => {
  return (
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-36 space-y-3.5">
      {/* 1. Packwise Style Liquid Glass Search Bar */}
      <form onSubmit={onSubmitSearch} className="relative">
        <div className="flex h-13 items-center rounded-full ios-glass-card px-3.5 shadow-[0_8px_24px_rgba(47,107,255,0.08)]">
          <div className="pl-1 text-slate-500 shrink-0 relative z-10">
            {isSearching ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin text-[#2F6BFF] shrink-0" />
            ) : (
              <Search className="h-4.5 w-4.5 shrink-0 stroke-[2.4] text-slate-500" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Search chats, game stats, items..."
            className="w-full bg-transparent px-3 py-2 text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none relative z-10"
          />

          {query && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="mr-1.5 p-1 text-slate-400 active:text-slate-800 shrink-0 relative z-10"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isSearching}
            className="h-10 shrink-0 rounded-full px-5 text-xs font-black text-white ios-liquid-primary active:scale-95 transition-transform disabled:opacity-60 relative z-10"
          >
            Search
          </button>
        </div>
      </form>

      {/* 2. Packwise Expo Style 3D Liquid Glass Filter Chips (From TripsFilterTabs.tsx) */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`h-11 w-full rounded-[22px] inline-flex flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
                isSelected
                  ? 'ios-filter-chip-active'
                  : 'ios-filter-chip-inactive active:bg-white/60'
              }`}
            >
              <div className="inline-flex items-center justify-center gap-1.5 px-2">
                <Icon
                  className={`h-4 w-4 shrink-0 stroke-[2.4] ${
                    isSelected ? 'text-[#2F6BFF] drop-shadow-[0_2px_6px_rgba(47,107,255,0.4)]' : 'text-[#56647D]'
                  }`}
                />
                <span
                  className={`text-[12.5px] tracking-tight leading-none truncate ${
                    isSelected ? 'font-black text-[#2F6BFF]' : 'font-bold text-[#56647D]'
                  }`}
                >
                  {cat.label}
                </span>
              </div>
              {isSelected && <span className="ios-active-dot mt-1" />}
            </button>
          );
        })}
      </div>

      {/* 3. Visual Discovery Studio (When no search query is typed) */}
      {!searchResults && !query.trim() && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
              <span>Explore Visual Search Topics</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono font-semibold">1-Tap Query</span>
          </div>

          {/* 2x2 Rich Visual Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {VISUAL_TOPICS.map((topic, i) => {
              const Icon = topic.icon;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onChangeQuery(topic.query)}
                  className={`flex flex-col justify-between rounded-[22px] border ${topic.border} bg-gradient-to-b ${topic.gradient} p-3.5 text-left backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,1),0_4px_16px_rgba(0,0,0,0.04)] active:scale-[0.97] transition-transform`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-[10px] border ${topic.iconColor}`}>
                        <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-bold border ${topic.badgeColor}`}>
                        {topic.badge}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 tracking-tight leading-snug">
                      {topic.title}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-600 line-clamp-2 leading-relaxed font-medium">
                      {topic.subtitle}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[9px] font-mono text-blue-600">
                    <span className="truncate max-w-[85%] font-semibold">"{topic.query}"</span>
                    <span className="text-slate-400 font-bold">➔</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Smart Suggestion Chips */}
          <div className="rounded-[22px] ios-plump-card p-3.5 space-y-2 border border-black/[0.06]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Quick Intent Filters
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onChangeQuery('BGMI match with kills > 15')}
                className="h-7 px-3 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-mono font-bold text-amber-800 active:scale-95 shadow-2xs"
              >
                kills &gt; 15
              </button>
              <button
                type="button"
                onClick={() => onChangeQuery('I said "I love you" and she replied "I love you too"')}
                className="h-7 px-3 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-mono font-bold text-blue-700 active:scale-95 shadow-2xs"
              >
                sequence: elena
              </button>
              <button
                type="button"
                onClick={() => onChangeQuery('black shirt')}
                className="h-7 px-3 rounded-full bg-purple-50 border border-purple-200 text-[10px] font-mono font-bold text-purple-700 active:scale-95 shadow-2xs"
              >
                object: shirt
              </button>
              <button
                type="button"
                onClick={() => onChangeQuery('Coimbatore fest address')}
                className="h-7 px-3 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold text-emerald-800 active:scale-95 shadow-2xs"
              >
                venue: cit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Search Results Display */}
      {searchResults && (
        <div className="space-y-3">
          {/* Active Intent Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                {searchResults.total_results} Result{searchResults.total_results !== 1 ? 's' : ''}
              </span>

              {searchResults.parsed_intent.is_conversation_sequence && (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-mono font-bold text-blue-700 shadow-2xs shrink-0">
                  Chat Flow • Sequence Verified
                </span>
              )}

              {searchResults.parsed_intent.is_game_stat_query && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-mono font-bold text-amber-800 shadow-2xs shrink-0">
                  Match Filter • Exact Statistics
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClearSearch}
              className="text-[11px] font-bold text-slate-500 active:text-slate-900"
            >
              Clear
            </button>
          </div>

          {searchResults.total_results === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] ios-plump-card p-8 text-center my-4 border border-black/[0.06]">
              <SearchX className="h-10 w-10 text-slate-400 mb-2 shrink-0" />
              <p className="text-xs font-bold text-slate-900">No matching screenshots</p>
              <p className="mt-1 text-[11px] text-slate-500 max-w-xs leading-relaxed font-medium">
                For conversation queries, verify that both messages appear in the same screenshot in the exact chronological order.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {searchResults.results.map((res) => (
                <ScreenshotCard
                  key={res.screenshot.id}
                  screenshot={res.screenshot}
                  searchResult={res}
                  onClick={() => onSelectScreenshot(res.screenshot.id, res)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
