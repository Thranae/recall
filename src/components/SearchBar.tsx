import React from 'react';
import { Search, X, MessageSquare, Trophy, ShoppingBag, FileText, Sparkles, SlidersHorizontal } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onChangeQuery: (q: string) => void;
  onSubmitSearch: (e?: React.FormEvent) => void;
  onClearSearch: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  isSearching: boolean;
  totalScreenshots: number;
}

const EXAMPLE_QUERIES = [
  {
    label: 'I said "I love you" and she replied "I love you too"',
    tag: 'Conversation Sequence',
    color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  },
  {
    label: 'BGMI match with more than 15 kills',
    tag: 'Structured Stats',
    color: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  },
  {
    label: 'black shirt',
    tag: 'Visual Search',
    color: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  },
  {
    label: 'Coimbatore fest address',
    tag: 'OCR & Text',
    color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Screenshots', icon: SlidersHorizontal },
  { id: 'chat', label: 'Chats', icon: MessageSquare },
  { id: 'game', label: 'Game Stats', icon: Trophy },
  { id: 'product', label: 'Products', icon: ShoppingBag },
  { id: 'poster_document', label: 'Posters & Docs', icon: FileText },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChangeQuery,
  onSubmitSearch,
  onClearSearch,
  selectedCategory,
  onSelectCategory,
  isSearching,
  totalScreenshots,
}) => {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-8 pb-4">
      {/* Search Input Container */}
      <form onSubmit={onSubmitSearch} className="relative">
        <div className="relative flex items-center rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl shadow-indigo-950/30 backdrop-blur-xl transition-all focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
          <div className="pl-4 text-slate-400">
            <Search className={`h-5 w-5 ${isSearching ? 'animate-pulse text-indigo-400' : ''}`} />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Search in natural language: e.g. I said 'I love you' and she replied 'I love you too', or BGMI kills > 15..."
            className="w-full bg-transparent px-3 py-4 text-sm font-normal text-white placeholder-slate-400 focus:outline-none sm:text-base"
          />

          {query && (
            <button
              type="button"
              onClick={onClearSearch}
              title="Clear search"
              className="mr-2 rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="submit"
            disabled={isSearching}
            className="mr-2 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/25 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {isSearching ? <Sparkles className="h-4 w-4 animate-spin" /> : <span>Search</span>}
          </button>
        </div>
      </form>

      {/* Suggested Flagship Prompts */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Try Natural Queries:
        </span>
        {EXAMPLE_QUERIES.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              onChangeQuery(item.label);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all hover:brightness-125 active:scale-95 ${item.color}`}
          >
            <span className="font-mono text-[9px] uppercase font-bold opacity-75">
              {item.tag}
            </span>
            <span className="truncate max-w-[240px] sm:max-w-none">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Category Filter Pills */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800/60'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-mono">
          {totalScreenshots} screenshots indexed
        </div>
      </div>
    </div>
  );
};
