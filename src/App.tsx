import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SearchBar } from './components/SearchBar';
import { ScreenshotCard } from './components/ScreenshotCard';
import { ScreenshotDetailModal } from './components/ScreenshotDetailModal';
import { UploadModal } from './components/UploadModal';
import { PrivacyModal } from './components/PrivacyModal';
import { AuthModal } from './components/AuthModal';
import { api } from './services/api';
import type { User, Screenshot, SearchResponse, SearchResultItem } from './types';
import { Sparkles, Image as ImageIcon, SearchX, UploadCloud, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loadingScreenshots, setLoadingScreenshots] = useState(false);

  // Search state
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedScreenshotId, setSelectedScreenshotId] = useState<string | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResultItem | undefined>(undefined);
  const [isSeeding, setIsSeeding] = useState(false);

  // Load user on mount or auto-login with demo
  useEffect(() => {
    api.getCurrentUser().then((u) => {
      if (u) {
        setUser(u);
      } else {
        // Auto-initialize with demo account for instant out-of-the-box exploration
        api.loginDemo().then((res) => {
          setUser(res.user);
        }).catch(() => {});
      }
    });
  }, []);

  // Fetch screenshots
  const fetchScreenshots = useCallback(async () => {
    if (!user) return;
    setLoadingScreenshots(true);
    try {
      const res = await api.getScreenshots(selectedCategory);
      setScreenshots(res.screenshots);
    } catch (err) {
      console.error('Failed to fetch screenshots:', err);
    } finally {
      setLoadingScreenshots(false);
    }
  }, [user, selectedCategory]);

  useEffect(() => {
    if (user) {
      fetchScreenshots();
    } else {
      setScreenshots([]);
    }
  }, [user, fetchScreenshots]);

  // Periodic poll for processing jobs
  useEffect(() => {
    const hasPending = screenshots.some(s => s.processing_status === 'queued' || s.processing_status === 'processing');
    if (!hasPending || !user) return;

    const interval = setInterval(() => {
      api.getScreenshots(selectedCategory).then(res => {
        setScreenshots(res.screenshots);
      }).catch(() => {});
    }, 3500);

    return () => clearInterval(interval);
  }, [screenshots, selectedCategory, user]);

  // Handle Search Submission
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.search(query, selectedCategory);
      setSearchResults(res);
    } catch (err) {
      console.error('Search failed:', err);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced auto-search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 450);

    return () => clearTimeout(timer);
  }, [query, selectedCategory]);

  const handleClearSearch = () => {
    setQuery('');
    setSearchResults(null);
  };

  const handleSeedBenchmark = async () => {
    setIsSeeding(true);
    try {
      await api.seedBenchmarkData();
      await fetchScreenshots();
      setQuery('I said "I love you" and she replied "I love you too"');
    } catch (err) {
      console.error('Seeding benchmark failed:', err);
      alert('Failed to seed benchmark data.');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleOpenDetail = (id: string, searchItem?: SearchResultItem) => {
    setSelectedScreenshotId(id);
    setSelectedSearchResult(searchItem);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        user={user}
        totalCount={screenshots.length}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => {
          api.logout();
          setUser(null);
        }}
        onSeedBenchmark={handleSeedBenchmark}
        isSeeding={isSeeding}
      />

      {/* Main Body */}
      <main className="flex-1 pb-16">
        {/* Prominent Search Bar */}
        <SearchBar
          query={query}
          onChangeQuery={setQuery}
          onSubmitSearch={handleSearch}
          onClearSearch={handleClearSearch}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          isSearching={isSearching}
          totalScreenshots={screenshots.length}
        />

        {/* Gallery / Results Content Area */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* SEARCH RESULTS VIEW */}
          {searchResults ? (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">Search Results</span>
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-300">
                    {searchResults.total_results} matches
                  </span>

                  {searchResults.parsed_intent.is_conversation_sequence && (
                    <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[11px] font-mono text-purple-300">
                      ⚡ Conversation Sequence Active
                    </span>
                  )}

                  {searchResults.parsed_intent.is_game_stat_query && (
                    <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-mono text-amber-300">
                      🎯 Structured Game Stats Filter
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="text-xs text-slate-400 hover:text-white font-mono"
                >
                  Clear filter & show all
                </button>
              </div>

              {searchResults.total_results === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center my-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-500 mb-3">
                    <SearchX className="h-7 w-7" />
                  </div>
                  <h4 className="text-base font-bold text-white">No matching screenshots found</h4>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm">
                    No screenshots matched your query "{query}". For conversation searches, make sure both messages appear in the same image in chronological order.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    View All Screenshots
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {searchResults.results.map((res) => (
                    <ScreenshotCard
                      key={res.screenshot.id}
                      screenshot={res.screenshot}
                      searchResult={res}
                      onClick={() => handleOpenDetail(res.screenshot.id, res)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ALL SCREENSHOTS GALLERY VIEW */
            <div>
              <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {selectedCategory === 'all' ? 'All Screenshots' : `${selectedCategory.toUpperCase()} Gallery`}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-400">
                    {screenshots.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={fetchScreenshots}
                  title="Refresh library"
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white font-mono"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingScreenshots ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {screenshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800/80 bg-slate-900/30 p-12 text-center my-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Your screenshot library is empty</h4>
                  <p className="mt-1 text-xs text-slate-400 max-w-md leading-relaxed">
                    Import your chat screenshots, game results, and shopping images to make them instantly searchable in natural language.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all"
                    >
                      <UploadCloud className="h-4 w-4" />
                      <span>Upload Your First Screenshot</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSeedBenchmark}
                      disabled={isSeeding}
                      className="inline-flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 active:scale-95 transition-all"
                    >
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      <span>{isSeeding ? 'Seeding...' : 'Load Benchmark Test Suite'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {screenshots.map((sc) => (
                    <ScreenshotCard
                      key={sc.id}
                      screenshot={sc}
                      onClick={() => handleOpenDetail(sc.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <ScreenshotDetailModal
        screenshotId={selectedScreenshotId}
        searchResult={selectedSearchResult}
        onClose={() => {
          setSelectedScreenshotId(null);
          setSelectedSearchResult(undefined);
        }}
        onDeleted={() => {
          fetchScreenshots();
          if (searchResults) handleSearch();
        }}
        onUpdated={() => {
          fetchScreenshots();
          if (searchResults) handleSearch();
        }}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchScreenshots();
        }}
      />

      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(u) => {
          setUser(u);
        }}
      />
    </div>
  );
};

export default App;
