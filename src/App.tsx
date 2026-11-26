import React, { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthView } from './components/AuthView';
import { TopHeader } from './components/TopHeader';
import { BottomNav, type TabType } from './components/BottomNav';
import { LibraryView } from './components/LibraryView';
import { SearchView } from './components/SearchView';
import { AlbumsView } from './components/AlbumsView';
import { SettingsView } from './components/SettingsView';
import { ScreenshotDetailSheet } from './components/ScreenshotDetailSheet';
import { UploadSheet } from './components/UploadSheet';
import { SubscriptionView } from './components/SubscriptionView';
import { SplashScreen } from './components/SplashScreen';
import { SignOutTransition } from './components/SignOutTransition';
import { api } from './services/api';
import { backHandler, useBackButton } from './utils/backHandler';
import type { User, Screenshot, SearchResponse, SearchResultItem } from './types';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashVariant, setSplashVariant] = useState<'launch' | 'login'>('launch');
  const [splashRunId, setSplashRunId] = useState(0);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Active Mobile Tab
  const [currentTab, setCurrentTab] = useState<TabType>('library');

  // Library State
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [libraryFilterQuery, setLibraryFilterQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [hasActiveUndo, setHasActiveUndo] = useState(false);

  // Search State
  const [query, setQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Modals / Sheets
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedScreenshotId, setSelectedScreenshotId] = useState<string | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResultItem | undefined>(undefined);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [isAlbumsModalOpen, setIsAlbumsModalOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);

  const isAnyModalActive = isLibraryModalOpen || isAlbumsModalOpen || Boolean(selectedScreenshotId) || isUploadOpen || isSubscriptionOpen;

  // Back Button Navigation Management
  const [exitToast, setExitToast] = useState<string | null>(null);

  useEffect(() => {
    backHandler.setExitToastCallback(setExitToast);
  }, []);

  useBackButton(
    'app-screenshot-detail',
    80,
    () => {
      setSelectedScreenshotId(null);
      setSelectedSearchResult(undefined);
      return true;
    },
    Boolean(selectedScreenshotId)
  );

  useBackButton(
    'app-subscription-modal',
    60,
    () => {
      setIsSubscriptionOpen(false);
      return true;
    },
    isSubscriptionOpen
  );

  useBackButton(
    'app-upload-sheet',
    40,
    () => {
      setIsUploadOpen(false);
      return true;
    },
    isUploadOpen
  );

  useBackButton(
    'app-tab-navigation',
    10,
    () => {
      if (currentTab !== 'library') {
        setCurrentTab('library');
        return true;
      }
      return false;
    },
    currentTab !== 'library'
  );

  // Check existing session on launch & listen for auth invalidation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    const handleUnauthorized = () => {
      setUser(null);
      setScreenshots([]);
      setSearchResults(null);
      setSelectedScreenshotId(null);
    };

    window.addEventListener('recall:unauthorized', handleUnauthorized);

    api
      .getCurrentUser()
      .then((u) => {
        if (u) setUser(u);
      })
      .catch(() => {})
      .finally(() => {
        setIsInitializing(false);
      });

    return () => {
      window.removeEventListener('recall:unauthorized', handleUnauthorized);
    };
  }, []);

  // Instantly reset scroll to top whenever switching modules
  useLayoutEffect(() => {
    const resetScrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    resetScrollToTop();

    // Additional raf guarantees mobile browsers (Chromium/WebKit) do not restore stale scroll after DOM layout
    const rafId = requestAnimationFrame(resetScrollToTop);
    return () => cancelAnimationFrame(rafId);
  }, [currentTab]);

  // Fetch screenshots (Always fetch full library so category chip counts and tabs remain 100% accurate)
  const fetchScreenshots = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 650));
    try {
      const [res] = await Promise.all([
        api.getScreenshots(),
        minDelay,
      ]);
      setScreenshots(res.screenshots);
    } catch (err) {
      console.error('Failed to fetch screenshots:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchScreenshots();
    } else {
      setScreenshots([]);
    }
  }, [user, fetchScreenshots]);

  // Fast background AI indexing loop while newly uploaded items are queued or processing
  useEffect(() => {
    const hasPending = screenshots.some(
      (s) => s.processing_status === 'queued' || s.processing_status === 'processing'
    );
    if (!hasPending || !user) return;

    let cancelled = false;
    let isTicking = false;

    const drainNext = async () => {
      if (cancelled || isTicking) return;
      isTicking = true;
      try {
        while (!cancelled) {
          const res = await api.processPendingScreenshots();
          if (cancelled) break;
          await fetchScreenshots();
          if (!res.processed) break;
        }
      } catch {
        if (!cancelled) {
          api
            .getScreenshots()
            .then((res) => {
              if (!cancelled) setScreenshots(res.screenshots);
            })
            .catch(() => {});
        }
      } finally {
        isTicking = false;
      }
    };

    void drainNext();
    const interval = setInterval(() => {
      void drainNext();
    }, 1800);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [screenshots, user, fetchScreenshots]);

  // Execute Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await api.search(query, searchCategory);
      setSearchResults(res);
      setSearchError(null);
    } catch (err: any) {
      console.warn('Search failed:', err);
      setSearchError(err?.message || 'Search request failed. Please check connectivity.');
      setSearchResults({
        query,
        parsed_intent: {
          is_conversation_sequence: false,
          is_game_stat_query: false,
          is_visual_query: false,
        },
        total_results: 0,
        results: [],
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced live search when query or searchCategory updates
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 400);

    return () => clearTimeout(timer);
  }, [query, searchCategory]);

  // Auto-retry search when reconnecting to network
  useEffect(() => {
    const handleOnline = () => {
      if (searchError && query.trim()) {
        handleSearch();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [searchError, query]);

  const handleClearSearch = () => {
    setQuery('');
    setSearchResults(null);
    setSearchError(null);
  };

  const handleOpenDetail = (id: string, searchItem?: SearchResultItem) => {
    setSelectedScreenshotId(id);
    setSelectedSearchResult(searchItem);
  };

  const resetWorkspaceState = useCallback(() => {
    setCurrentTab('library');
    setSelectedCategory('all');
    setLibraryFilterQuery('');
    setQuery('');
    setSearchCategory('all');
    setSearchResults(null);
    setIsUploadOpen(false);
    setSelectedScreenshotId(null);
    setSelectedSearchResult(undefined);
    window.scrollTo({ top: 0 });
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    resetWorkspaceState();
    setUser(authenticatedUser);
    setSplashVariant('login');
    setSplashRunId((n) => n + 1);
    setShowSplash(true);
  };

  const completeLogoutReset = useCallback(() => {
    api.logout();
    setUser(null);
    setScreenshots([]);
    resetWorkspaceState();
  }, [resetWorkspaceState]);

  const handleLogout = () => {
    if (isSigningOut) return;
    setShowSplash(false);
    setIsSigningOut(true);
  };

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, []);

  const processingCount = screenshots.filter(
    (s) => s.processing_status === 'queued' || s.processing_status === 'processing'
  ).length;

  return (
    <>
      {showSplash && (
        <SplashScreen
          key={`${splashVariant}-${splashRunId}`}
          variant={splashVariant}
          userName={user?.name}
          onComplete={handleSplashComplete}
          durationMs={splashVariant === 'launch' ? 5600 : 2400}
        />
      )}

      {isSigningOut && (
        <SignOutTransition
          onSessionCleared={completeLogoutReset}
          onComplete={() => setIsSigningOut(false)}
        />
      )}

      {isInitializing ? (
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#F3F7FC] text-[#172B4D]">
          <Loader2 className="h-8 w-8 animate-spin text-[#3478F6]" />
        </div>
      ) : !user ? (
        <AuthView onAuthSuccess={handleAuthSuccess} />
      ) : (
        <div className="relative min-h-[100dvh] bg-[#F3F7FC] text-[#172B4D] flex flex-col antialiased selection:bg-[#B9D9FF] selection:text-[#172B4D] overflow-x-clip">
      {/* Ambient Soft Light for Liquid Glass Refraction (Arctic Blue palette, hardware-accelerated static gradient) */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 12% 5%, rgba(52, 120, 246, 0.08) 0%, transparent 48%), radial-gradient(circle at 88% 85%, rgba(185, 217, 255, 0.22) 0%, transparent 52%)',
        }}
      />

      {/* Top Mobile iOS Light Header (Statically Fixed) */}
      <TopHeader
        title="Recall"
        isProcessing={processingCount > 0}
        processingCount={processingCount}
        onRefresh={fetchScreenshots}
        isRefreshing={isRefreshing}
        showSearch={currentTab !== 'search'}
        searchQuery={libraryFilterQuery}
        visible={!isAnyModalActive}
        isBasic={user?.subscription_tier === 'basic'}
        isPro={user?.subscription_tier === 'pro'}
        onOpenSubscription={() => setIsSubscriptionOpen(true)}
        onSearchChange={(q) => {
          setLibraryFilterQuery(q);
          if (q.trim() && currentTab !== 'library') {
            setCurrentTab('library');
          }
        }}
        onSearchSubmit={(q) => {
          setSearchCategory('all');
          setQuery(q);
          setCurrentTab('search');
        }}
      />

      {/* Main Tab Views with Top Padding for Fixed Static Top Navbar */}
      <main
        className="relative z-10 flex-1 w-full"
        style={{ paddingTop: 'calc(74px + max(env(safe-area-inset-top, 0px), 28px))' }}
      >
        {currentTab === 'library' && (
          <LibraryView
            screenshots={screenshots}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onSelectScreenshot={(id) => handleOpenDetail(id)}
            onOpenUpload={() => setIsUploadOpen(true)}
            onRefresh={fetchScreenshots}
            filterQuery={libraryFilterQuery}
            onFilterChange={setLibraryFilterQuery}
            onSelectionModeChange={setIsSelectionMode}
            onActiveUndoChange={setHasActiveUndo}
            onModalStateChange={setIsLibraryModalOpen}
            isPro={user?.subscription_tier === 'pro'}
            onOpenSubscription={() => setIsSubscriptionOpen(true)}
            onQuickSearch={(q) => {
              setSearchCategory('all');
              setQuery(q);
              setCurrentTab('search');
            }}
          />
        )}

        {currentTab === 'search' && (
          <SearchView
            query={query}
            onChangeQuery={setQuery}
            onSubmitSearch={handleSearch}
            onClearSearch={handleClearSearch}
            selectedCategory={searchCategory}
            onSelectCategory={setSearchCategory}
            isSearching={isSearching}
            searchResults={searchResults}
            searchError={searchError}
            onRetrySearch={() => handleSearch()}
            onSelectScreenshot={(id, res) => handleOpenDetail(id, res)}
          />
        )}

        {currentTab === 'albums' && (
          <AlbumsView
            screenshots={screenshots}
            onSelectScreenshot={(id) => handleOpenDetail(id)}
            onRefresh={fetchScreenshots}
            onModalStateChange={setIsAlbumsModalOpen}
            isIndexing={processingCount > 0}
            isPro={user?.subscription_tier === 'pro'}
            onOpenSubscription={() => setIsSubscriptionOpen(true)}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            user={user}
            screenshots={screenshots}
            onLogout={handleLogout}
            onRefresh={fetchScreenshots}
            onOpenSubscription={() => setIsSubscriptionOpen(true)}
          />
        )}
      </main>

      {/* Packwise Expo Floating 3D Liquid Glass Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        selectedCategory={selectedCategory}
        onSelectTab={(tab, category) => {
          setIsSelectionMode(false);
          setHasActiveUndo(false);

          // Re-tapping active module smoothly scrolls back to top (native iOS/Android feel)
          if (currentTab === tab && (!category || selectedCategory === category)) {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            return;
          }

          setCurrentTab(tab);
          if (category) {
            setSelectedCategory(category);
          }
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          if (document.documentElement) document.documentElement.scrollTop = 0;
          if (document.body) document.body.scrollTop = 0;
        }}
        onOpenUpload={() => setIsUploadOpen(true)}
        screenshotCount={screenshots.length}
        visible={!isSelectionMode && !hasActiveUndo && !isAnyModalActive}
        isIndexing={processingCount > 0}
      />

      {/* Upload Mobile Sheet */}
      <UploadSheet
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        user={user}
        currentScreenshotCount={screenshots.length}
        onOpenSubscription={() => setIsSubscriptionOpen(true)}
        onUploadSuccess={() => {
          fetchScreenshots();
        }}
      />

      {/* Subscription & Cloud Membership Dedicated View */}
      <SubscriptionView
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        user={user}
        onSubscriptionUpdated={(updatedUser) => {
          setUser(updatedUser);
          fetchScreenshots();
        }}
      />

      {/* Screenshot Detail Mobile Sheet */}
      <ScreenshotDetailSheet
        screenshotId={selectedScreenshotId}
        initialScreenshot={screenshots.find((s) => s.id === selectedScreenshotId)}
        searchResult={selectedSearchResult}
        isPro={user?.subscription_tier === 'pro'}
        onOpenSubscription={() => setIsSubscriptionOpen(true)}
        onClose={() => {
          setSelectedScreenshotId(null);
          setSelectedSearchResult(undefined);
        }}
        onDeleted={() => {
          fetchScreenshots();
        }}
        onUpdated={() => {
          fetchScreenshots();
        }}
        onSelectTag={(tag) => {
          setSelectedScreenshotId(null);
          setSelectedSearchResult(undefined);
          setSearchCategory('all');
          setQuery(tag);
          setCurrentTab('search');
        }}
        onSelectRelated={(id) => {
          setSelectedSearchResult(undefined);
          setSelectedScreenshotId(id);
        }}
      />

      {/* Android Hardware Back Press Exit Toast */}
      <AnimatePresence>
        {exitToast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-x-0 z-[120] flex justify-center pointer-events-none px-4"
            style={{ bottom: 'calc(5.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="rounded-full bg-[#172B4D]/90 backdrop-blur-md border border-white/25 text-white text-[12px] font-semibold px-4 py-2 shadow-lg shadow-black/15">
              {exitToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      )}
    </>
  );
};

export default App;
