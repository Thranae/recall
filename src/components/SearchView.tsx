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
  Sparkles,
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

const CATEGORIES = [
  { id: 'all', label: 'All', icon: SlidersHorizontal },
  { id: 'chat', label: 'Chats', icon: MessageSquare },
  { id: 'game', label: 'Gaming', icon: Trophy },
];

const SUGGESTED_QUERIES = [
  {
    title: 'Chat Sequence',
    description: 'Find replies in conversation flow',
    query: 'I said "I love you" and she replied "I love you too"',
    icon: MessageSquare,
    badge: 'Relational',
  },
  {
    title: 'Match Stats',
    description: 'Find matches with high kill count',
    query: 'BGMI match with kills > 15',
    icon: Trophy,
    badge: 'Stats',
  },
  {
    title: 'Visual Object',
    description: 'Clothing, sneakers, and apparel',
    query: 'black shirt',
    icon: ShoppingBag,
    badge: 'Visual',
  },
  {
    title: 'Document & OCR',
    description: 'Event dates, addresses, text',
    query: 'Coimbatore fest address',
    icon: FileText,
    badge: 'Text',
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
    <div className="mx-auto w-full max-w-md px-4 pt-3 pb-36 space-y-4">
      {/* 1. iOS Search Bar */}
      <form onSubmit={onSubmitSearch} className="relative">
        <div className="flex h-11.5 items-center rounded-2xl bg-white border border-black/[0.08] px-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] focus-within:border-[#2F6BFF] focus-within:ring-2 focus-within:ring-[#2F6BFF]/20 transition-all duration-150">
          <div className="text-slate-400 shrink-0">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#2F6BFF]" />
            ) : (
              <Search className="h-4 w-4 stroke-[2.2]" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Search conversations, stats, text..."
            className="w-full bg-transparent px-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="p-1 text-slate-400 hover:text-slate-700 active:scale-90 transition-transform cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="h-8 shrink-0 rounded-xl px-3.5 text-xs font-semibold text-white bg-[#2F6BFF] hover:bg-[#1A56E8] active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            Search
          </button>
        </div>
      </form>

      {/* 2. Unified Segmented Category Filter */}
      <div className="ios-segmented-control w-full">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`ios-segment-btn ${isSelected ? 'ios-segment-btn-active' : ''}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Search Discovery Mode (When no active results) */}
      {!searchResults && !query.trim() && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#2F6BFF]" />
              <span>Suggested Queries</span>
            </span>
          </div>

          {/* 2x2 Clean Minimalist Card Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {SUGGESTED_QUERIES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChangeQuery(item.query)}
                  className="flex flex-col justify-between rounded-2xl bg-white border border-black/[0.06] p-3.5 text-left shadow-[0_1px_4px_rgba(0,0,0,0.02)] hover:border-slate-300 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Icon className="h-3.5 w-3.5 stroke-[2]" />
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200/60">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 leading-tight">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] font-mono text-[#2F6BFF] truncate font-medium">
                    "{item.query}"
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Active Search Results */}
      {searchResults && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-900">
                {searchResults.total_results} {searchResults.total_results === 1 ? 'result' : 'results'}
              </span>

              {searchResults.parsed_intent.is_conversation_sequence && (
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-medium text-[#2F6BFF]">
                  Chat Sequence
                </span>
              )}

              {searchResults.parsed_intent.is_game_stat_query && (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  Stats Match
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClearSearch}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              Clear
            </button>
          </div>

          {searchResults.total_results === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl bg-white border border-black/[0.06] p-8 text-center my-4">
              <SearchX className="h-8 w-8 text-slate-400 mb-2" />
              <p className="text-xs font-semibold text-slate-900">No matching screenshots</p>
              <p className="mt-1 text-[11px] text-slate-500 max-w-xs leading-relaxed">
                Try searching for specific message quotes, game scores, or OCR text keywords.
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
