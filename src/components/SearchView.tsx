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
  },
  {
    title: 'Match Stats',
    description: 'Find matches with high kill count',
    query: 'BGMI match with kills > 15',
    icon: Trophy,
  },
  {
    title: 'Visual Object',
    description: 'Clothing, sneakers, and apparel',
    query: 'black shirt',
    icon: ShoppingBag,
  },
  {
    title: 'Document & OCR',
    description: 'Event dates, addresses, text',
    query: 'Coimbatore fest address',
    icon: FileText,
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
    <div className="mx-auto w-full max-w-md px-4 pt-2 pb-36 space-y-4">
      {/* 1. Plump Liquid Glass Search Bar */}
      <form onSubmit={onSubmitSearch} className="relative">
        <div className="flex h-13 items-center rounded-[20px] liquid-glass-input px-3.5 transition-all duration-150">
          <div className="shrink-0 relative z-10 flex items-center justify-center">
            {isSearching ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin text-[#3478F6]" />
            ) : (
              <Search className="h-4.5 w-4.5 stroke-[2.3] text-[#3478F6]" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Search conversations, stats, text..."
            className="w-full bg-transparent px-3 text-[13px] font-semibold text-[#172B4D] placeholder:text-[#4A5D78]/70 focus:outline-none relative z-10"
          />

          {query && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="p-1 text-[#4A5D78] hover:text-[#172B4D] active:scale-90 transition-transform cursor-pointer mr-1 relative z-10"
            >
              <X className="h-4 w-4 stroke-[2.2]" />
            </button>
          )}

          <button
            type="submit"
            disabled={isSearching}
            className={`h-9 shrink-0 rounded-full px-4 text-xs font-bold relative z-10 transition-all cursor-pointer shadow-xs flex items-center justify-center ${
              query.trim()
                ? 'liquid-btn-primary text-white active:scale-95'
                : 'liquid-glass-pill text-[#3478F6] active:scale-95'
            }`}
          >
            Search
          </button>
        </div>
      </form>

      {/* 2. Symmetrical Liquid Glass Filter Chips (Aligned Full Width, No Box Wrappers) */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`liquid-filter-chip w-full flex items-center justify-center gap-1.5 px-2 ${
                isSelected ? 'liquid-filter-chip-active' : ''
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 stroke-[2.2] ${isSelected ? 'text-[#3478F6]' : 'text-slate-500'}`} />
              <span className="truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Search Discovery Mode (When no active results) */}
      {!searchResults && !query.trim() && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-bold text-[#172B4D] flex items-center gap-1.5 tracking-tight">
              <Sparkles className="h-4 w-4 text-[#3478F6]" />
              <span>Suggested Explorations</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">Tap to search</span>
          </div>

          {/* 2x2 Clean Plump Liquid Glass Card Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {SUGGESTED_QUERIES.map((item, idx) => {
              const Icon = item.icon;
              const iconColors = [
                'bg-blue-50 text-[#3478F6] border border-blue-100',
                'bg-sky-50 text-sky-700 border border-sky-100',
                'bg-indigo-50 text-indigo-700 border border-indigo-100',
                'bg-cyan-50 text-cyan-700 border border-cyan-100',
              ][idx % 4];

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChangeQuery(item.query)}
                  className="liquid-glass-card flex flex-col justify-between rounded-[22px] p-4 text-left active:scale-[0.97] transition-all duration-200 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-[14px] shadow-2xs ${iconColors}`}>
                        <Icon className="h-4 w-4 stroke-[2.2]" />
                      </div>
                    </div>
                    <p className="text-[13px] font-bold text-[#172B4D] leading-tight">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 text-[10.5px] font-mono text-[#3478F6] truncate font-semibold">
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
              <span className="text-xs font-semibold text-slate-800 font-mono">
                {searchResults.total_results} {searchResults.total_results === 1 ? 'result' : 'results'}
              </span>

              {searchResults.parsed_intent.is_conversation_sequence && (
                <span className="liquid-category-badge px-2.5 py-0.5 text-[10px]">
                  Chat Sequence
                </span>
              )}
              {searchResults.parsed_intent.is_game_stat_query && (
                <span className="liquid-category-badge px-2.5 py-0.5 text-[10px] text-amber-700">
                  Game Filter
                </span>
              )}
            </div>
          </div>

          {searchResults.results.length === 0 ? (
            <div className="liquid-glass-card flex flex-col items-center justify-center rounded-[24px] p-8 text-center my-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] liquid-icon-pod mb-3 text-slate-400">
                <SearchX className="h-7 w-7 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No matching screenshots</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs font-normal">
                Try searching by words spoken in a chat, victory rank, or game stats like 'kills &gt; 10'.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {searchResults.results.map((item) => (
                <ScreenshotCard
                  key={item.screenshot.id}
                  screenshot={item.screenshot}
                  searchResult={item}
                  onClick={() => onSelectScreenshot(item.screenshot.id, item)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
