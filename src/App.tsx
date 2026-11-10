import React, { useState, useEffect, useCallback } from 'react';
import { AuthView } from './components/AuthView';
import { TopHeader } from './components/TopHeader';
import { BottomNav, type TabType } from './components/BottomNav';
import { LibraryView } from './components/LibraryView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';
import { ScreenshotDetailSheet } from './components/ScreenshotDetailSheet';
import { UploadSheet } from './components/UploadSheet';
import { api } from './services/api';
import type { User, Screenshot, SearchResponse, SearchResultItem } from './types';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Active Mobile Tab
  const [currentTab, setCurrentTab] = useState<TabType>('library');

  // Library State
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search State
  const [query, setQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);

  // Modals / Sheets
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedScreenshotId, setSelectedScreenshotId] = useState<string | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<SearchResultItem | undefined>(undefined);

  // Check existing session on launch
  useEffect(() => {
    api
      .getCurrentUser()
      .then((u) => {
        if (u) setUser(u);
      })
      .catch(() => {})
      .finally(() => {
        setIsInitializing(false);
      });
  }, []);

  // Fetch screenshots
  const fetchScreenshots = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);
    const minDelay = new Promise((resolve) => setTimeout(resolve, 650));
    try {
      const [res] = await Promise.all([
        api.getScreenshots(selectedCategory),
        minDelay,
      ]);
      setScreenshots(res.screenshots);
    } catch (err) {
      console.error('Failed to fetch screenshots:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [user, selectedCategory]);

  useEffect(() => {
    if (user) {
      fetchScreenshots();
    } else {
      setScreenshots([]);
    }
  }, [user, fetchScreenshots]);

  // Periodic poll while items are actively processing
  useEffect(() => {
    const hasPending = screenshots.some(
      (s) => s.processing_status === 'queued' || s.processing_status === 'processing'
    );
    if (!hasPending || !user) return;

    const interval = setInterval(() => {
      api
        .getScreenshots(selectedCategory)
        .then((res) => setScreenshots(res.screenshots))
        .catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, [screenshots, selectedCategory, user]);

  // Execute Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    try {
      const res = await api.search(query, searchCategory);
      setSearchResults(res);
    } catch (err) {
      console.error('Search failed:', err);
      alert('Search request failed. Please check connectivity.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced live search when query or searchCategory updates
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 400);

    return () => clearTimeout(timer);
  }, [query, searchCategory]);

  const handleClearSearch = () => {
    setQuery('');
    setSearchResults(null);
  };

  const handleOpenDetail = (id: string, searchItem?: SearchResultItem) => {
    setSelectedScreenshotId(id);
    setSelectedSearchResult(searchItem);
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setScreenshots([]);
    setSearchResults(null);
  };

  // Splash loading during token verification
  if (isInitializing) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#F3F7FC] text-[#172B4D]">
        <Loader2 className="h-8 w-8 animate-spin text-[#3478F6]" />
      </div>
    );
  }

  // If unauthenticated, show mobile iOS Light Liquid Glass sign-in screen
  if (!user) {
    return <AuthView onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)} />;
  }

  const processingCount = screenshots.filter(
    (s) => s.processing_status === 'queued' || s.processing_status === 'processing'
  ).length;

  return (
    <div className="relative min-h-[100dvh] bg-[#F3F7FC] text-[#172B4D] flex flex-col antialiased selection:bg-[#B9D9FF] selection:text-[#172B4D] overflow-x-hidden">
      {/* Ambient Aurora Light for Liquid Glass Refraction (Arctic Blue palette) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="vision-blob"
          style={{
            background: 'radial-gradient(circle, rgba(52, 120, 246, 0.12) 0%, transparent 70%)',
            width: '65vw',
            height: '65vw',
            top: '-10%',
            left: '-10%',
            animation: 'floatWide1 24s ease-in-out infinite',
          }}
        />
        <div
          className="vision-blob"
          style={{
            background: 'radial-gradient(circle, rgba(185, 217, 255, 0.35) 0%, transparent 70%)',
            width: '60vw',
            height: '60vw',
            bottom: '15%',
            right: '-10%',
            animation: 'floatWide3 28s ease-in-out infinite',
          }}
        />
        <div
          className="vision-blob"
          style={{
            background: 'radial-gradient(circle, rgba(74, 140, 247, 0.09) 0%, transparent 70%)',
            width: '70vw',
            height: '70vw',
            top: '30%',
            left: '15%',
            animation: 'floatWide2 26s ease-in-out infinite',
          }}
        />
        <div
          className="vision-blob"
          style={{
            background: 'radial-gradient(circle, rgba(185, 217, 255, 0.28) 0%, transparent 70%)',
            width: '60vw',
            height: '60vw',
            bottom: '-10%',
            left: '-10%',
            animation: 'floatWide4 30s ease-in-out infinite',
          }}
        />
      </div>

      {/* Top Mobile iOS Light Header (Statically Fixed) */}
      <TopHeader
        title="Recall"
        isProcessing={processingCount > 0}
        processingCount={processingCount}
        onRefresh={fetchScreenshots}
        isRefreshing={isRefreshing}
      />

      {/* Main Tab Views with Top Padding for Fixed Static Top Navbar */}
      <main
        className="relative z-10 flex-1 w-full"
        style={{ paddingTop: 'calc(70px + env(safe-area-inset-top, 0px))' }}
      >
        {currentTab === 'library' && (
          <LibraryView
            screenshots={screenshots}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onSelectScreenshot={(id) => handleOpenDetail(id)}
            onOpenUpload={() => setIsUploadOpen(true)}
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
            onSelectScreenshot={(id, res) => handleOpenDetail(id, res)}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            user={user}
            screenshots={screenshots}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Packwise Expo Floating 3D Liquid Glass Bottom Navigation Bar */}
      <BottomNav
        currentTab={currentTab}
        selectedCategory={selectedCategory}
        onSelectTab={(tab, category) => {
          setCurrentTab(tab);
          if (category) {
            setSelectedCategory(category);
          }
        }}
        onOpenUpload={() => setIsUploadOpen(true)}
        screenshotCount={screenshots.length}
      />

      {/* Upload Mobile Sheet */}
      <UploadSheet
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          fetchScreenshots();
        }}
      />

      {/* Screenshot Detail Mobile Sheet */}
      <ScreenshotDetailSheet
        screenshotId={selectedScreenshotId}
        searchResult={selectedSearchResult}
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
      />
    </div>
  );
};

export default App;
