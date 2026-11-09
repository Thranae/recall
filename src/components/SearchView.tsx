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
      {/* 1. Plump Liquid Glass Search Bar */}
      <form onSubmit={onSubmitSearch} className="relative">
        <div className="flex h-14 items-center rounded-[22px] liquid-glass-input px-4 shadow-[0_6px_20px_rgba(47,107,255,0.08)] transition-all duration-150">
          <div className="text-slate-400 shrink-0">
            {isSearching ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#2F6BFF]" />
            ) : (
              <Search className="h-5 w-5 stroke-[2.4] text-[#2F6BFF]" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Search conversations, stats, text..."
            className="w-full bg-transparent px-3 text-xs font-black text-slate-900 placeholder:text-slate-500 placeholder:font-semibold focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="p-1 text-slate-600 hover:text-slate-900 active:scale-90 transition-transform cursor-pointer mr-1"
            >
              <X className="h-4 w-4 stroke-[2.6]" />
            </button>
          )}

          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="h-10 shrink-0 rounded-full px-5 text-xs font-black text-white liquid-btn-primary active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-md"
          >
            Search
          </button>
        </div>
      </form>

      {/* 2. Plump Liquid Glass Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`liquid-filter-chip ${
                isSelected ? 'liquid-filter-chip-active' : ''
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 stroke-[2.4] ${isSelected ? 'text-white' : 'text-[#2F6BFF]'}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Search Discovery Mode (When no active results) */}
      {!searchResults && !query.trim() && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#2F6BFF]" />
              <span>Suggested Queries</span>
            </span>
          </div>

          {/* 2x2 Clean Plump Liquid Glass Card Grid */}
          <div className="grid grid-cols-2 gap-3">
            {SUGGESTED_QUERIES.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChangeQuery(item.query)}
                  className="liquid-glass-card flex flex-col justify-between rounded-[24px] p-4 text-left active:scale-[0.97] transition-all duration-200 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[16px] liquid-icon-pod text-[#2F6BFF]">
                        <Icon className="h-4.5 w-4.5 stroke-[2.4]" />
                      </div>
                      <span className="text-[10px] font-black text-slate-900 bg-white/80 border border-white px-2 py-0.5 rounded-full shadow-2xs">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs font-black text-slate-900 leading-tight">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[11.5px] text-slate-700 line-clamp-2 leading-relaxed font-bold">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-[10.5px] font-mono text-[#2F6BFF] truncate font-black">
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
              <span className="text-xs font-bold text-slate-900">
                {searchResults.total_results} {searchResults.total_results === 1 ? 'result' : 'results'}
              </span>

              {searchResults.parsed_intent.is_conversation_sequence && (
                <span className="rounded-full liquid-glass-pill px-3 py-1 text-[10px] font-black text-[#2F6BFF]">
                  Chat Sequence
                </span>
              )}
              {searchResults.parsed_intent.is_game_stat_query && (
                <span className="rounded-full liquid-glass-pill px-3 py-1 text-[10px] font-black text-amber-600">
                  Game Filter
                </span>
              )}
            </div>
          </div>

          {searchResults.results.length === 0 ? (
            <div className="liquid-glass-card flex flex-col items-center justify-center rounded-[28px] p-8 text-center my-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] liquid-icon-pod mb-3 text-slate-400">
                <SearchX className="h-8 w-8 stroke-[2.2]" />
              </div>
              <h3 className="text-sm font-black text-slate-900">No matching screenshots</h3>
              <p className="mt-1 text-xs text-slate-600 max-w-xs font-semibold">
                Try searching by what was said in the chat, who replied, or game stats like 'kills &gt; 10'.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5">
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
