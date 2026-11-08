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
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-28">
      {/* iOS Liquid Glass Search Input Bar */}
      <form onSubmit={onSubmitSearch} className="relative mb-3">
        <div className="flex items-center rounded-full border border-white/15 bg-white/[0.08] backdrop-blur-2xl px-1.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_24px_rgba(0,0,0,0.35)] focus-within:border-blue-400/50">
          <div className="pl-3 text-white/50">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Search chats, game stats, objects..."
            className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder-white/40 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="mr-1.5 p-1 text-white/40 active:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isSearching}
            className="rounded-full bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,122,255,0.3)] border border-white/25 active:scale-95 transition-transform disabled:opacity-60"
          >
            Search
          </button>
        </div>
      </form>

      {/* iOS Liquid Glass Category Pills Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-transform duration-100 ease-out active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white font-semibold border border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_3px_12px_rgba(0,122,255,0.4)]'
                  : 'bg-white/[0.08] backdrop-blur-2xl border border-white/12 text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] active:bg-white/15'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Suggested Searches if query is empty */}
      {!searchResults && !query.trim() && (
        <div className="mt-2 space-y-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40 px-1">
            Suggested Searches
          </span>
          <div className="grid grid-cols-1 gap-2">
            {EXAMPLE_QUERIES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onChangeQuery(ex.label);
                }}
                className="flex items-center justify-between rounded-[18px] border border-white/10 bg-white/[0.05] backdrop-blur-xl p-3.5 text-left transition-transform duration-100 ease-out active:scale-[0.98] active:bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
              >
                <span className="text-xs text-white/90 line-clamp-1 font-medium">{ex.label}</span>
                <span className="rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[9px] font-mono text-blue-300 shrink-0 ml-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5 px-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-white">
                {searchResults.total_results} Result{searchResults.total_results !== 1 ? 's' : ''}
              </span>

              {searchResults.parsed_intent.is_conversation_sequence && (
                <span className="rounded-full bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 text-[10px] font-mono text-blue-200 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  Chat Flow • Sequence Verified
                </span>
              )}

              {searchResults.parsed_intent.is_game_stat_query && (
                <span className="rounded-full bg-amber-500/20 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-mono text-amber-200 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                  Match Filter • Exact Statistics
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClearSearch}
              className="text-[11px] text-white/50 active:text-white"
            >
              Clear
            </button>
          </div>

          {searchResults.total_results === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-8 text-center my-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              <SearchX className="h-10 w-10 text-white/40 mb-2" />
              <p className="text-xs font-semibold text-white">No matching screenshots</p>
              <p className="mt-1 text-[11px] text-white/50 max-w-xs leading-relaxed">
                For conversation queries, verify that both messages appear in the same screenshot in the exact chronological order.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
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
