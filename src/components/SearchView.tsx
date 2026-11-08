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

// Exactly 3 filter chips as requested
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
    gradient: 'from-blue-600/30 via-indigo-900/30 to-black/80',
    border: 'border-blue-400/30',
    iconColor: 'text-blue-300 bg-blue-500/20 border-blue-400/40',
  },
  {
    title: 'Match Stats',
    subtitle: 'Filter BGMI matches by exact kills > 15',
    query: 'BGMI match with kills > 15',
    icon: Trophy,
    badge: 'Stats Filter',
    gradient: 'from-amber-600/30 via-orange-950/30 to-black/80',
    border: 'border-amber-400/30',
    iconColor: 'text-amber-300 bg-amber-500/20 border-amber-400/40',
  },
  {
    title: 'Visual Items',
    subtitle: 'Search black shirt, sneakers & apparel',
    query: 'black shirt',
    icon: ShoppingBag,
    badge: 'Visual Search',
    gradient: 'from-purple-600/30 via-fuchsia-950/30 to-black/80',
    border: 'border-purple-400/30',
    iconColor: 'text-purple-300 bg-purple-500/20 border-purple-400/40',
  },
  {
    title: 'Posters & OCR',
    subtitle: 'Extract fest dates, addresses & venue text',
    query: 'Coimbatore fest address',
    icon: FileText,
    badge: 'Address OCR',
    gradient: 'from-emerald-600/30 via-teal-950/30 to-black/80',
    border: 'border-emerald-400/30',
    iconColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-400/40',
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
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-32 space-y-3.5">
      {/* 1. iOS 27 Plumpy Liquid Glass Search Input Bar */}
      <form onSubmit={onSubmitSearch} className="relative">
        <div className="flex h-13 items-center rounded-full ios-plump-card px-2.5 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.4),0_8px_24px_rgba(0,0,0,0.4)]">
          <div className="pl-2 text-white/50 shrink-0">
            {isSearching ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin text-blue-400 shrink-0" />
            ) : (
              <Search className="h-4.5 w-4.5 shrink-0" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Search chats, game stats, items..."
            className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="mr-1.5 p-1 text-white/40 active:text-white shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isSearching}
            className="h-9 shrink-0 rounded-full px-4 text-xs font-bold text-white ios-plump-primary active:scale-95 transition-transform disabled:opacity-60"
          >
            Search
          </button>
        </div>
      </form>

      {/* 2. iOS 27 Exactly 3 Filter Chips (Symmetrical 3-Column Grid, Zero Clipping) */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`h-9 w-full rounded-full inline-flex items-center justify-center gap-1.5 px-2 text-xs font-bold transition-transform duration-100 ease-out active:scale-95 ${
                isSelected
                  ? 'ios-plump-primary text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.7),0_4px_16px_rgba(0,122,255,0.5)]'
                  : 'ios-plump-pill text-white/75 active:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 drop-shadow-sm" />
              <span className="leading-none pt-0.5 truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Visual Discovery Studio (When no search query is typed) */}
      {!searchResults && !query.trim() && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
              <Compass className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>Explore Visual Search Topics</span>
            </span>
            <span className="text-[10px] text-white/40 font-mono">1-Tap Query</span>
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
                  className={`flex flex-col justify-between rounded-[22px] border ${topic.border} bg-gradient-to-b ${topic.gradient} p-3.5 text-left backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.3),0_6px_20px_rgba(0,0,0,0.4)] active:scale-[0.97] transition-transform`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-[10px] border ${topic.iconColor}`}>
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                      </span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-mono text-white/80 border border-white/15">
                        {topic.badge}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white tracking-tight leading-snug">
                      {topic.title}
                    </p>
                    <p className="mt-1 text-[10px] text-white/65 line-clamp-2 leading-relaxed">
                      {topic.subtitle}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-blue-300">
                    <span className="truncate max-w-[85%] font-medium">"{topic.query}"</span>
                    <span className="text-white/40">➔</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Smart Suggestion Chips */}
          <div className="rounded-[22px] ios-plump-card p-3.5 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 block">
              Quick Intent Filters
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onChangeQuery('BGMI match with kills > 15')}
                className="h-7 px-3 rounded-full ios-plump-pill text-[10px] font-mono text-amber-200 active:scale-95"
              >
                kills &gt; 15
              </button>
              <button
                type="button"
                onClick={() => onChangeQuery('I said "I love you" and she replied "I love you too"')}
                className="h-7 px-3 rounded-full ios-plump-pill text-[10px] font-mono text-blue-200 active:scale-95"
              >
                sequence: elena
              </button>
              <button
                type="button"
                onClick={() => onChangeQuery('black shirt')}
                className="h-7 px-3 rounded-full ios-plump-pill text-[10px] font-mono text-purple-200 active:scale-95"
              >
                object: shirt
              </button>
              <button
                type="button"
                onClick={() => onChangeQuery('Coimbatore fest address')}
                className="h-7 px-3 rounded-full ios-plump-pill text-[10px] font-mono text-emerald-200 active:scale-95"
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
              <span className="text-xs font-bold text-white">
                {searchResults.total_results} Result{searchResults.total_results !== 1 ? 's' : ''}
              </span>

              {searchResults.parsed_intent.is_conversation_sequence && (
                <span className="rounded-full border border-blue-400/40 bg-gradient-to-b from-blue-500/25 to-blue-700/20 px-3 py-1 text-[10px] font-mono text-blue-200 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35)] shrink-0">
                  Chat Flow • Sequence Verified
                </span>
              )}

              {searchResults.parsed_intent.is_game_stat_query && (
                <span className="rounded-full border border-amber-400/40 bg-gradient-to-b from-amber-500/25 to-amber-700/20 px-3 py-1 text-[10px] font-mono text-amber-200 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35)] shrink-0">
                  Match Filter • Exact Statistics
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClearSearch}
              className="text-[11px] font-bold text-white/50 active:text-white"
            >
              Clear
            </button>
          </div>

          {searchResults.total_results === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[28px] ios-plump-card p-8 text-center my-4">
              <SearchX className="h-10 w-10 text-white/40 mb-2 shrink-0" />
              <p className="text-xs font-bold text-white">No matching screenshots</p>
              <p className="mt-1 text-[11px] text-white/55 max-w-xs leading-relaxed">
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
