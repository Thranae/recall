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

const EXAMPLE_QUERIES = [
  {
    label: 'I said "I love you" and she replied "I love you too"',
    category: 'Conversation Flow',
  },
  {
    label: 'BGMI match with kills > 15',
    category: 'Game Statistics',
  },
  {
    label: 'black shirt',
    category: 'Visual Object',
  },
  {
    label: 'Coimbatore fest address',
    category: 'Text & Address',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: SlidersHorizontal },
  { id: 'chat', label: 'Chats', icon: MessageSquare },
  { id: 'game', label: 'Gaming', icon: Trophy },
  { id: 'product', label: 'Products', icon: ShoppingBag },
  { id: 'poster_document', label: 'Docs', icon: FileText },
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
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-32">
      {/* iOS 27 Plumpy Liquid Glass Search Input Bar */}
      <form onSubmit={onSubmitSearch} className="relative mb-3">
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
            className="h-9 shrink-0 rounded-full px-4 text-xs font-semibold text-white ios-plump-primary active:scale-95 transition-transform disabled:opacity-60"
          >
            Search
          </button>
        </div>
      </form>

      {/* iOS 27 Unclipped Filter Chips Carousel */}
      <div className="-mx-4 px-4 py-2 mb-2 overflow-x-auto no-scrollbar scroll-pl-4 flex items-center gap-2.5">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`h-9 shrink-0 whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold transition-transform duration-100 ease-out active:scale-95 ${
                isSelected
                  ? 'ios-plump-primary text-white'
                  : 'ios-plump-pill text-white/80 active:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 drop-shadow-sm" />
              <span className="leading-none pt-0.5">{cat.label}</span>
            </button>
          );
        })}
        <div className="w-1 shrink-0" aria-hidden="true" />
      </div>

      {/* Suggested Searches if query is empty */}
      {!searchResults && !query.trim() && (
        <div className="mt-2 space-y-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45 px-1">
            Suggested Searches
          </span>
          <div className="grid grid-cols-1 gap-2.5">
            {EXAMPLE_QUERIES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onChangeQuery(ex.label);
                }}
                className="flex items-center justify-between rounded-[20px] ios-plump-card p-3.5 text-left transition-transform duration-100 ease-out active:scale-[0.98]"
              >
                <span className="text-xs text-white/90 line-clamp-1 font-medium">{ex.label}</span>
                <span className="rounded-full ios-plump-pill px-2.5 py-1 text-[9px] font-mono text-blue-300 shrink-0 ml-2">
                  {ex.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results Display */}
      {searchResults && (
        <div className="mt-2">
          {/* Active Intent Badges */}
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white">
                {searchResults.total_results} Result{searchResults.total_results !== 1 ? 's' : ''}
              </span>

              {searchResults.parsed_intent.is_conversation_sequence && (
                <span className="rounded-full border border-blue-400/40 bg-gradient-to-b from-blue-500/25 to-blue-700/20 px-3 py-1 text-[10px] font-mono text-blue-200 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35)]">
                  Chat Flow • Sequence Verified
                </span>
              )}

              {searchResults.parsed_intent.is_game_stat_query && (
                <span className="rounded-full border border-amber-400/40 bg-gradient-to-b from-amber-500/25 to-amber-700/20 px-3 py-1 text-[10px] font-mono text-amber-200 backdrop-blur-2xl shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35)]">
                  Match Filter • Exact Statistics
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClearSearch}
              className="text-[11px] font-medium text-white/50 active:text-white"
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
