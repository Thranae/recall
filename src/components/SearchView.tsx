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
  { id: 'poster_document', label: 'Documents', icon: FileText },
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
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-24">
      {/* Sticky Search Input */}
      <form onSubmit={onSubmitSearch} className="relative mb-3">
        <div className="flex items-center rounded-2xl border border-slate-800 bg-slate-900/90 shadow-md backdrop-blur-md focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
          <div className="pl-3.5 text-slate-500">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Search conversation flow, stats, items..."
            className="w-full bg-transparent px-3 py-3.5 text-xs text-white placeholder-slate-500 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="mr-2 p-1 text-slate-500 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isSearching}
            className="mr-2 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm active:scale-95 disabled:opacity-60"
          >
            Search
          </button>
        </div>
      </form>

      {/* Horizontally scrollable category pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-2">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Suggested Queries if no search active */}
      {!searchResults && !query.trim() && (
        <div className="mt-2 space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-left transition-all active:scale-[0.98] hover:border-slate-700"
              >
                <span className="text-xs text-slate-200 line-clamp-1">{ex.label}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 border border-slate-700 shrink-0 ml-2">
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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-white">
                {searchResults.total_results} Result{searchResults.total_results !== 1 ? 's' : ''}
              </span>

              {searchResults.parsed_intent.is_conversation_sequence && (
                <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                  Chat Flow • Sequence Verified
                </span>
              )}

              {searchResults.parsed_intent.is_game_stat_query && (
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                  Match Filter • Exact Statistics
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClearSearch}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              Clear
            </button>
          </div>

          {searchResults.total_results === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center my-4">
              <SearchX className="h-10 w-10 text-slate-500 mb-2" />
              <p className="text-xs font-semibold text-white">No matching screenshots</p>
              <p className="mt-1 text-[11px] text-slate-400 max-w-xs">
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
