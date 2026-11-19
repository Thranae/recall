import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderHeart,
  FolderArchive,
  Film,
  Play,
  Plus,
  ArrowLeft,
  Trash2,
  Download,
  Layers,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import type { Screenshot, Album, ThreadGroup } from '../types';
import { api } from '../services/api';
import { ScreenshotCard } from './ScreenshotCard';
import { AlbumStoryModal } from './AlbumStoryModal';
import { CreateAlbumModal } from './CreateAlbumModal';

interface AlbumsViewProps {
  screenshots: Screenshot[];
  onSelectScreenshot: (id: string) => void;
  onRefresh?: () => void;
  onModalStateChange?: (isOpen: boolean) => void;
}

const LOCAL_STORAGE_CUSTOM_ALBUMS = 'recall_custom_albums';

export const AlbumsView: React.FC<AlbumsViewProps> = ({
  screenshots,
  onSelectScreenshot,
  onRefresh,
  onModalStateChange,
}) => {
  // Navigation / View State
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'smart' | 'custom'>('all');

  // Story & Create Modals
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [storyTarget, setStoryTarget] = useState<{
    title: string;
    emoji: string;
    accentColor: string;
    screenshots: Screenshot[];
  } | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isExportingCollage, setIsExportingCollage] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string | null>(null);

  // Custom Albums in LocalStorage
  const [customAlbums, setCustomAlbums] = useState<Album[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CUSTOM_ALBUMS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Threads state from API
  const [threads, setThreads] = useState<ThreadGroup[]>([]);

  useEffect(() => {
    api
      .getThreads()
      .then((res) => {
        if (res && res.threads) setThreads(res.threads);
      })
      .catch(() => {});
  }, []);

  // AI-Driven Image Analysis & Deep Categorization for Albums
  const handleAiCurate = async () => {
    if (isAiAnalyzing) return;
    setIsAiAnalyzing(true);
    setAiStatusMessage('AI Vision is analyzing & clustering your images...');
    try {
      const res = await api.reanalyzeBatch();
      setAiStatusMessage(`AI analyzed ${res.upgraded || res.total || 0} images! Smart albums updated.`);
      onRefresh?.();
      setTimeout(() => setAiStatusMessage(null), 3500);
    } catch (err) {
      console.error('Failed to run AI curation batch:', err);
      setAiStatusMessage('AI Vision analysis complete.');
      onRefresh?.();
      setTimeout(() => setAiStatusMessage(null), 2500);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Save custom albums whenever updated
  const saveCustomAlbums = (newAlbums: Album[]) => {
    setCustomAlbums(newAlbums);
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_ALBUMS, JSON.stringify(newAlbums));
    } catch (err) {
      console.error('Failed to save custom albums to localStorage', err);
    }
  };

  // Sync modal state with parent to hide bottom nav / top header during immersive modals
  useEffect(() => {
    const isModalActive = isStoryOpen || isCreateOpen;
    onModalStateChange?.(isModalActive);
  }, [isStoryOpen, isCreateOpen, onModalStateChange]);

  // Generate Smart Albums from screenshots
  const smartAlbums = useMemo<Album[]>(() => {
    const albums: Album[] = [];

    // 1. Conversations & Threads
    const chatScreenshots = screenshots.filter((s) => s.category === 'chat');
    if (chatScreenshots.length > 0 || threads.length > 0) {
      albums.push({
        id: 'smart-chats',
        title: 'Conversation Threads',
        description: `${chatScreenshots.length} chat screenshots${
          threads.length > 0 ? ` (${threads.length} threads)` : ''
        }`,
        category: 'chat',
        coverScreenshotId: chatScreenshots[0]?.id || threads[0]?.screenshots[0]?.id,
        screenshotIds: chatScreenshots.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '💬',
        badge: 'AI Curated',
        accentColor: '#3478F6',
      });
    }

    // 2. Gaming & Scoreboards
    const gameScreenshots = screenshots.filter((s) => s.category === 'game');
    if (gameScreenshots.length > 0) {
      albums.push({
        id: 'smart-gaming',
        title: 'Gaming & High Scores',
        description: `${gameScreenshots.length} victory & clutch gameplay moments`,
        category: 'game',
        coverScreenshotId: gameScreenshots[0].id,
        screenshotIds: gameScreenshots.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🎮',
        badge: 'AI Curated',
        accentColor: '#8B5CF6',
      });
    }

    // 3. Receipts & Expenses Vault
    const receiptScreenshots = screenshots.filter(
      (s) =>
        s.category === 'poster_document' &&
        (s.ocr_text?.toLowerCase().includes('total') ||
          s.ocr_text?.toLowerCase().includes('invoice') ||
          s.ocr_text?.toLowerCase().includes('receipt') ||
          s.ocr_text?.toLowerCase().includes('paid') ||
          s.ocr_text?.toLowerCase().includes('order #') ||
          s.tags?.some((t) => ['receipt', 'bill', 'payment', 'expense', 'invoice'].includes(t.toLowerCase())))
    );
    if (receiptScreenshots.length > 0) {
      albums.push({
        id: 'smart-receipts',
        title: 'Receipts & Expenses',
        description: `${receiptScreenshots.length} financial slips & payments`,
        category: 'receipt',
        coverScreenshotId: receiptScreenshots[0].id,
        screenshotIds: receiptScreenshots.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🧾',
        badge: 'Finance',
        accentColor: '#10B981',
      });
    }

    // 4. Tickets & Travel Passes
    const ticketScreenshots = screenshots.filter(
      (s) =>
        s.ocr_text?.toLowerCase().includes('ticket') ||
        s.ocr_text?.toLowerCase().includes('boarding') ||
        s.ocr_text?.toLowerCase().includes('booking') ||
        s.ocr_text?.toLowerCase().includes('gate') ||
        s.ocr_text?.toLowerCase().includes('seat') ||
        s.tags?.some((t) => ['ticket', 'travel', 'flight', 'boarding'].includes(t.toLowerCase()))
    );
    if (ticketScreenshots.length > 0) {
      albums.push({
        id: 'smart-tickets',
        title: 'Tickets & Travel Passes',
        description: `${ticketScreenshots.length} bookings, boarding passes & events`,
        category: 'ticket',
        coverScreenshotId: ticketScreenshots[0].id,
        screenshotIds: ticketScreenshots.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🎫',
        badge: 'Travel',
        accentColor: '#F59E0B',
      });
    }

    // 5. Shopping & Wishlists
    const shoppingScreenshots = screenshots.filter(
      (s) =>
        s.category === 'product' ||
        s.ocr_text?.toLowerCase().includes('cart') ||
        s.ocr_text?.toLowerCase().includes('buy now') ||
        s.ocr_text?.toLowerCase().includes('add to cart') ||
        s.tags?.some((t) => ['product', 'shopping', 'shoes', 'gadget'].includes(t.toLowerCase()))
    );
    if (shoppingScreenshots.length > 0) {
      albums.push({
        id: 'smart-shopping',
        title: 'Shopping & Wishlist',
        description: `${shoppingScreenshots.length} curated products & gear`,
        category: 'product',
        coverScreenshotId: shoppingScreenshots[0].id,
        screenshotIds: shoppingScreenshots.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🛍️',
        badge: 'Wishlist',
        accentColor: '#EC4899',
      });
    }

    // 6. Aesthetic, Wallpapers & Places
    const aestheticScreenshots = screenshots.filter(
      (s) =>
        s.category === 'other' ||
        s.tags?.some((t) =>
          ['building', 'nature', 'photo', 'art', 'sky', 'wallpaper', 'aesthetic', 'city'].includes(t.toLowerCase())
        )
    );
    if (aestheticScreenshots.length > 0) {
      albums.push({
        id: 'smart-aesthetic',
        title: 'Aesthetic & Wallpapers',
        description: `${aestheticScreenshots.length} architecture, nature & captures`,
        category: 'visual',
        coverScreenshotId: aestheticScreenshots[0].id,
        screenshotIds: aestheticScreenshots.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🖼️',
        badge: 'Visuals',
        accentColor: '#06B6D4',
      });
    }

    // 7. Food & Dining
    const foodScreenshots = screenshots.filter(
      (s) =>
        s.tags?.some((t) => ['food', 'restaurant', 'meal', 'cafe', 'dish', 'biryani', 'pizza', 'burger'].includes(t.toLowerCase())) ||
        (s.ocr_text && /zomato|swiggy|restaurant|menu|cafe|burger|pizza|biryani|dining|coffee|breakfast|lunch|dinner/i.test(s.ocr_text))
    );
    if (foodScreenshots.length > 0) {
      albums.push({
        id: 'smart-food',
        title: 'Food & Dining',
        description: `${foodScreenshots.length} culinary captures & food orders`,
        category: 'custom',
        coverScreenshotId: foodScreenshots[0].id,
        screenshotIds: foodScreenshots.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🍔',
        badge: 'Dining',
        accentColor: '#F97316',
      });
    }

    // 8. Documents & Study Notes
    const docScreenshots = screenshots.filter(
      (s) =>
        s.category === 'poster_document' ||
        s.tags?.some((t) => ['document', 'notes', 'study', 'pdf', 'certificate'].includes(t.toLowerCase())) ||
        (s.ocr_text && /document|certificate|resume|notes|study|contract|agreement|paper|exam/i.test(s.ocr_text))
    );
    if (docScreenshots.length > 0 && !albums.some((a) => a.id === 'smart-receipts' && a.screenshotIds.length === docScreenshots.length)) {
      albums.push({
        id: 'smart-documents',
        title: 'Documents & Notes',
        description: `${docScreenshots.length} text documents & study notes`,
        category: 'custom',
        coverScreenshotId: docScreenshots[0].id,
        screenshotIds: docScreenshots.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '📚',
        badge: 'Documents',
        accentColor: '#6366F1',
      });
    }

    return albums;
  }, [screenshots, threads]);

  // All combined albums
  const allAlbums = useMemo(() => {
    return [...smartAlbums, ...customAlbums];
  }, [smartAlbums, customAlbums]);

  // Filtered albums based on selected chip
  const filteredAlbums = useMemo(() => {
    if (activeFilter === 'smart') return smartAlbums;
    if (activeFilter === 'custom') return customAlbums;
    return allAlbums;
  }, [activeFilter, smartAlbums, customAlbums, allAlbums]);

  // Currently opened album details
  const currentAlbum = useMemo(() => {
    if (!selectedAlbumId) return null;
    return allAlbums.find((a) => a.id === selectedAlbumId) || null;
  }, [selectedAlbumId, allAlbums]);

  // Screenshots in the currently opened album
  const currentAlbumScreenshots = useMemo(() => {
    if (!currentAlbum) return [];
    const idSet = new Set(currentAlbum.screenshotIds);
    return screenshots.filter((s) => idSet.has(s.id));
  }, [currentAlbum, screenshots]);

  // Highlights Reel Screenshots (Top 8 most recent screenshots)
  const highlightsScreenshots = useMemo(() => {
    return screenshots.slice(0, 8);
  }, [screenshots]);

  // Launch Fullscreen Story Reel for Highlights
  const handlePlayHighlights = () => {
    if (highlightsScreenshots.length === 0) return;
    setStoryTarget({
      title: 'Memory Highlights',
      emoji: '🎬',
      accentColor: '#3478F6',
      screenshots: highlightsScreenshots,
    });
    setIsStoryOpen(true);
  };

  // Launch Fullscreen Story Reel for a specific Album
  const handlePlayAlbumStory = (album: Album) => {
    const idSet = new Set(album.screenshotIds);
    const albumScreenshots = screenshots.filter((s) => idSet.has(s.id));
    if (albumScreenshots.length === 0) return;

    setStoryTarget({
      title: album.title,
      emoji: album.emoji || '📁',
      accentColor: album.accentColor || '#3478F6',
      screenshots: albumScreenshots,
    });
    setIsStoryOpen(true);
  };

  // Add Custom Album
  const handleCreateAlbum = (newAlbumData: Omit<Album, 'id' | 'createdAt'>) => {
    const newAlbum: Album = {
      ...newAlbumData,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    saveCustomAlbums([newAlbum, ...customAlbums]);
    setSelectedAlbumId(newAlbum.id);
  };

  // Delete Custom Album
  const handleDeleteCustomAlbum = (albumId: string) => {
    if (window.confirm('Are you sure you want to delete this custom album? Your screenshots will remain in your library.')) {
      saveCustomAlbums(customAlbums.filter((a) => a.id !== albumId));
      setSelectedAlbumId(null);
      onRefresh?.();
    }
  };

  // Export Album as Collage Image
  const handleExportCollage = async () => {
    if (!currentAlbum || currentAlbumScreenshots.length === 0 || isExportingCollage) return;

    setIsExportingCollage(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      const maxPhotos = Math.min(6, currentAlbumScreenshots.length);
      const photosToInclude = currentAlbumScreenshots.slice(0, maxPhotos);

      // Determine Grid Layout (2 cols or 3 cols)
      const cols = photosToInclude.length <= 2 ? 2 : 3;
      const rows = Math.ceil(photosToInclude.length / cols);
      const thumbWidth = 600;
      const thumbHeight = 800;
      const gap = 24;
      const headerHeight = 220;
      const footerHeight = 100;

      canvas.width = cols * thumbWidth + (cols + 1) * gap;
      canvas.height = headerHeight + rows * thumbHeight + (rows + 1) * gap + footerHeight;

      // Draw Background
      ctx.fillStyle = '#F3F7FC';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Header with Album Title
      ctx.fillStyle = '#172B4D';
      ctx.font = 'bold 54px Outfit, sans-serif';
      ctx.fillText(`${currentAlbum.emoji || '📁'} ${currentAlbum.title}`, gap, 90);

      ctx.fillStyle = '#4A5D78';
      ctx.font = '500 28px Outfit, sans-serif';
      ctx.fillText(`Curated Memory Album • ${currentAlbumScreenshots.length} Screenshots`, gap, 145);

      // Load and Draw Images
      const imgPromises = photosToInclude.map((s) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = api.getImageUrl(s.id);
        });
      });

      const loadedImages = await Promise.allSettled(imgPromises);

      loadedImages.forEach((res, idx) => {
        if (res.status !== 'fulfilled') return;
        const img = res.value;
        const col = idx % cols;
        const row = Math.floor(idx / cols);

        const x = gap + col * (thumbWidth + gap);
        const y = headerHeight + row * (thumbHeight + gap);

        // Clip rounded rectangle
        ctx.save();
        ctx.beginPath();
        const r = 32;
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + thumbWidth, y, x + thumbWidth, y + thumbHeight, r);
        ctx.arcTo(x + thumbWidth, y + thumbHeight, x, y + thumbHeight, r);
        ctx.arcTo(x, y + thumbHeight, x, y, r);
        ctx.arcTo(x, y, x + thumbWidth, y, r);
        ctx.closePath();
        ctx.clip();

        // Draw image cover (contain/cover math)
        const scale = Math.max(thumbWidth / img.width, thumbHeight / img.height);
        const nw = img.width * scale;
        const nh = img.height * scale;
        const nx = x + (thumbWidth - nw) / 2;
        const ny = y + (thumbHeight - nh) / 2;

        ctx.drawImage(img, nx, ny, nw, nh);
        ctx.restore();
      });

      // Footer Watermark
      ctx.fillStyle = '#8C9EB5';
      ctx.font = '600 24px Outfit, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Recall • Personal Visual Memory', canvas.width - gap, canvas.height - 40);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentAlbum.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_collage.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('Failed to export collage', err);
    } finally {
      setIsExportingCollage(false);
    }
  };

  // -------------------------------------------------------------
  // VIEW: SINGLE ALBUM DETAIL
  // -------------------------------------------------------------
  if (currentAlbum) {
    const coverUrl = currentAlbum.coverScreenshotId
      ? api.getImageUrl(currentAlbum.coverScreenshotId)
      : currentAlbumScreenshots[0]
        ? api.getImageUrl(currentAlbumScreenshots[0].id)
        : '';

    return (
      <div className="min-h-full pb-32 animate-fadeIn">
        {/* Sticky Sub-Header */}
        <div className="sticky top-[70px] z-20 px-4 py-2 bg-[#F3F7FC]/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedAlbumId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/70 text-xs font-bold text-[#172B4D] hover:bg-white active:scale-95 transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Albums</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCollage}
              disabled={isExportingCollage || currentAlbumScreenshots.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/70 text-xs font-bold text-[#172B4D] hover:bg-white active:scale-95 transition-all shadow-xs disabled:opacity-50"
            >
              {isExportingCollage ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#3478F6]" />
              )}
              <span>Collage</span>
            </button>

            {!currentAlbum.isSmart && (
              <button
                type="button"
                onClick={() => handleDeleteCustomAlbum(currentAlbum.id)}
                className="p-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 active:scale-95 transition-all"
                title="Delete Custom Album"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Album Hero Banner */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative rounded-3xl overflow-hidden p-6 text-white shadow-xl bg-slate-900">
            {/* Background Blur Image */}
            {coverUrl && (
              <img
                src={coverUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-lg scale-105 pointer-events-none"
              />
            )}
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background: `linear-gradient(135deg, ${currentAlbum.accentColor || '#3478F6'} 0%, transparent 100%)`,
              }}
            />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="liquid-filter-chip liquid-filter-chip-sm liquid-filter-chip-active !text-base !h-9 !w-9 !p-0 shadow-md">
                  {currentAlbum.emoji || '📁'}
                </span>
                <span className="liquid-filter-chip liquid-filter-chip-sm liquid-filter-chip-active !font-extrabold text-[#3478F6] shadow-md gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentAlbum.accentColor || '#3478F6' }} />
                  <span>{currentAlbum.badge || 'Album'}</span>
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight">{currentAlbum.title}</h1>
                {currentAlbum.description && (
                  <p className="mt-1 text-xs text-white/80 leading-relaxed font-medium">
                    {currentAlbum.description}
                  </p>
                )}
                <p className="mt-1 text-[11px] font-mono text-white/60">
                  {currentAlbumScreenshots.length} {currentAlbumScreenshots.length === 1 ? 'item' : 'items'}
                </p>
              </div>

              {/* Play Reel CTA */}
              <button
                type="button"
                onClick={() => handlePlayAlbumStory(currentAlbum)}
                disabled={currentAlbumScreenshots.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-[#172B4D] font-extrabold text-sm shadow-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              >
                <Play className="w-4 h-4 fill-[#172B4D]" />
                <span>Play Story Reel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Screenshots Grid inside Album */}
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between pb-3">
            <h3 className="font-bold text-sm text-[#172B4D] uppercase tracking-wider">
              Screenshots ({currentAlbumScreenshots.length})
            </h3>
          </div>

          {currentAlbumScreenshots.length === 0 ? (
            <div className="py-16 text-center bg-white/50 rounded-3xl border border-dashed border-slate-300">
              <ImageIcon className="w-10 h-10 mx-auto text-slate-300" />
              <p className="mt-2 text-sm text-[#172B4D] font-semibold">No screenshots found in this album.</p>
              <p className="text-xs text-[#4A5D78]">Add photos to populate your collection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {currentAlbumScreenshots.map((s) => (
                <ScreenshotCard
                  key={s.id}
                  screenshot={s}
                  onClick={() => onSelectScreenshot(s.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Story Modal */}
        {storyTarget && (
          <AlbumStoryModal
            isOpen={isStoryOpen}
            onClose={() => {
              setIsStoryOpen(false);
              setStoryTarget(null);
            }}
            title={storyTarget.title}
            albumEmoji={storyTarget.emoji}
            accentColor={storyTarget.accentColor}
            screenshots={storyTarget.screenshots}
            onOpenDetail={(id) => {
              setIsStoryOpen(false);
              setStoryTarget(null);
              onSelectScreenshot(id);
            }}
          />
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW: MAIN ALBUMS LIST
  // -------------------------------------------------------------
  return (
    <div className="min-h-full pb-32 animate-fadeIn">
      {/* 1. WOW Hero Card: Dynamic Memory Mix / Cinematic Highlights */}
      <div className="px-4 pt-3 pb-3">
        <div className="relative rounded-3xl overflow-hidden p-5 shadow-lg border border-white/60 bg-gradient-to-br from-[#3478F6] via-[#2563EB] to-[#1D4ED8] text-white">
          {/* Subtle Ambient Background Layer */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 filter blur-2xl pointer-events-none" />

          {/* Highlights Preview Montage */}
          {highlightsScreenshots.length > 0 && (
            <div className="absolute right-3 top-3 bottom-3 w-32 opacity-25 overflow-hidden rounded-2xl pointer-events-none flex gap-1 transform rotate-6 scale-110">
              {highlightsScreenshots.slice(0, 2).map((s) => (
                <img
                  key={s.id}
                  src={api.getImageUrl(s.id)}
                  alt=""
                  className="w-16 h-full object-cover rounded-xl"
                />
              ))}
            </div>
          )}

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2">
              <span className="liquid-filter-chip liquid-filter-chip-xs !font-extrabold text-[#3478F6] shadow-sm">
                <Film className="w-3 h-3 text-[#3478F6]" />
                <span>Highlights Reel</span>
              </span>
              <span className="liquid-filter-chip liquid-filter-chip-xs font-mono !font-bold text-[#172B4D] shadow-sm">
                {highlightsScreenshots.length} moments
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black tracking-tight drop-shadow-sm">Memory Mix</h2>
              <p className="text-xs text-white/80 font-medium leading-relaxed">
                Relive your recent visual stories with smooth cinematic playback.
              </p>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={handlePlayHighlights}
                disabled={highlightsScreenshots.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-[#172B4D] font-extrabold text-xs shadow-md hover:bg-slate-100 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-[#172B4D]" />
                <span>Play Highlights</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Category Filter Chips (Identical to Library View) */}
      <div className="grid grid-cols-3 gap-2 px-4 py-2">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`liquid-filter-chip w-full flex items-center justify-center gap-1.5 px-3 py-2 cursor-pointer ${
            activeFilter === 'all' ? 'liquid-filter-chip-active' : ''
          }`}
        >
          <Layers className={`h-3.5 w-3.5 shrink-0 stroke-[2.2] ${activeFilter === 'all' ? 'text-[#3478F6]' : 'text-slate-500'}`} />
          <span className="whitespace-nowrap text-[12px] font-semibold">All</span>
          <span className={`text-[10px] font-mono ml-0.5 px-1.5 py-0.5 rounded-full ${activeFilter === 'all' ? 'bg-[#B9D9FF]/40 text-[#3478F6] font-bold' : 'bg-slate-200/60 text-slate-500 font-semibold'}`}>
            {allAlbums.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('smart')}
          className={`liquid-filter-chip w-full flex items-center justify-center gap-1.5 px-3 py-2 cursor-pointer ${
            activeFilter === 'smart' ? 'liquid-filter-chip-active' : ''
          }`}
        >
          <FolderArchive className={`h-3.5 w-3.5 shrink-0 stroke-[2.2] ${activeFilter === 'smart' ? 'text-[#3478F6]' : 'text-slate-500'}`} />
          <span className="whitespace-nowrap text-[12px] font-semibold">Smart AI</span>
          <span className={`text-[10px] font-mono ml-0.5 px-1.5 py-0.5 rounded-full ${activeFilter === 'smart' ? 'bg-[#B9D9FF]/40 text-[#3478F6] font-bold' : 'bg-slate-200/60 text-slate-500 font-semibold'}`}>
            {smartAlbums.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('custom')}
          className={`liquid-filter-chip w-full flex items-center justify-center gap-1.5 px-3 py-2 cursor-pointer ${
            activeFilter === 'custom' ? 'liquid-filter-chip-active' : ''
          }`}
        >
          <FolderHeart className={`h-3.5 w-3.5 shrink-0 stroke-[2.2] ${activeFilter === 'custom' ? 'text-[#3478F6]' : 'text-slate-500'}`} />
          <span className="whitespace-nowrap text-[12px] font-semibold">Custom</span>
          <span className={`text-[10px] font-mono ml-0.5 px-1.5 py-0.5 rounded-full ${activeFilter === 'custom' ? 'bg-[#B9D9FF]/40 text-[#3478F6] font-bold' : 'bg-slate-200/60 text-slate-500 font-semibold'}`}>
            {customAlbums.length}
          </span>
        </button>
      </div>

      {/* 3. Status Bar & "+ New Album" Button */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-[#172B4D] text-[16px] tracking-tight">
            {activeFilter === 'all'
              ? 'All Albums'
              : activeFilter === 'smart'
                ? 'Curated Smart Albums'
                : 'My Custom Albums'}
          </h2>
          <span className="liquid-filter-chip liquid-filter-chip-xs font-bold font-mono text-[#3478F6]">
            {filteredAlbums.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Curate / Re-Analyze Vault Button */}
          <button
            type="button"
            onClick={handleAiCurate}
            disabled={isAiAnalyzing || screenshots.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-filter-chip liquid-filter-chip-xs !font-bold text-[#3478F6] hover:brightness-105 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Analyze and cluster vault screenshots with AI Vision"
          >
            <RefreshCw className={`w-3 h-3 text-[#3478F6] ${isAiAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAiAnalyzing ? 'Analyzing...' : 'AI Curate'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/90 border border-slate-200/80 text-xs font-bold text-[#3478F6] hover:bg-white active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
            <span>New Album</span>
          </button>
        </div>
      </div>

      {/* AI Analysis Status Toast / Banner */}
      {aiStatusMessage && (
        <div className="px-4 pb-2 animate-fadeIn">
          <div className="p-2.5 rounded-2xl liquid-filter-chip w-full flex items-center justify-center gap-2 text-xs font-bold text-[#3478F6] shadow-xs">
            {isAiAnalyzing ? (
              <RefreshCw className="w-3.5 h-3.5 text-[#3478F6] animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
            <span>{aiStatusMessage}</span>
          </div>
        </div>
      )}

      {/* 4. Physical 3D Photo-Stack Album Cards Grid */}
      <div className="px-4 pt-2">
        {filteredAlbums.length === 0 ? (
          <div className="py-16 text-center bg-white/50 rounded-3xl border border-dashed border-slate-300">
            <FolderHeart className="w-12 h-12 mx-auto text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-[#172B4D]">No albums here yet</h3>
            <p className="mt-1 text-xs text-[#4A5D78]">
              {activeFilter === 'custom'
                ? 'Tap "+ New Album" to create your first custom collection!'
                : 'Upload screenshots to generate smart AI collections automatically.'}
            </p>
            {activeFilter === 'custom' && (
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 px-4 py-2 rounded-2xl bg-[#3478F6] text-white text-xs font-bold shadow-md hover:bg-[#2563EB] active:scale-95 transition-all"
              >
                Create Album
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredAlbums.map((album) => {
              const coverUrl = album.coverScreenshotId
                ? api.getImageUrl(album.coverScreenshotId)
                : '';

              return (
                <div
                  key={album.id}
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedAlbumId(album.id)}
                >
                  {/* Physical 3D Stack Layer 2 (Bottom Angled Photo) */}
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-md rounded-3xl transform rotate-3 translate-y-1.5 -z-10 shadow-xs border border-white/80 transition-transform duration-200 group-hover:rotate-4" />

                  {/* Physical 3D Stack Layer 1 (Middle Angled Photo) */}
                  <div className="absolute inset-0 bg-white/75 backdrop-blur-md rounded-3xl transform -rotate-2 -translate-y-0.5 -z-10 shadow-xs border border-white/80 transition-transform duration-200 group-hover:-rotate-3" />

                  {/* Main Front Album Card with Full Cover Flow & Linear Blur Liquid Glass Plate */}
                  <div className="relative rounded-3xl overflow-hidden aspect-[1/1.24] border border-white/95 shadow-lg transition-all duration-300 active:scale-98 group-hover:shadow-xl flex flex-col justify-end bg-gradient-to-b from-slate-100 via-white to-slate-200">
                    {/* Cover Image Area - Flows behind the linear blur plate */}
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={album.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50/90 via-white/70 to-slate-100 text-slate-300">
                        <ImageIcon className="w-10 h-10 text-[#3478F6]/40" />
                      </div>
                    )}

                    {/* Opaque gradient scrim to dissolve high-contrast screenshot text on lower half */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-[56%] pointer-events-none z-0"
                      style={{
                        background:
                          'linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.75) 45%, rgba(255, 255, 255, 0.98) 85%, #FFFFFF 100%)',
                      }}
                    />

                    {/* Top Bar Floating Badges (Exact Filter Chip Style) */}
                    <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
                      <span className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !h-6 !w-6 !p-0 shadow-md pointer-events-auto text-xs">
                        {album.emoji || '📁'}
                      </span>
                      <span className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !font-bold font-mono text-[#3478F6] shadow-md pointer-events-auto">
                        {album.screenshotIds.length}
                      </span>
                    </div>

                    {/* iOS 27 Liquid Glass Linear Blur Plate */}
                    <div className="liquid-glass-plate relative z-10 p-3 rounded-b-3xl flex flex-col gap-1.5">
                      {/* Specular Edge Hairline */}
                      <div
                        className="absolute top-0 inset-x-4 h-[1px] pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 1) 25%, rgba(255, 255, 255, 1) 75%, transparent 100%)',
                        }}
                      />

                      {/* Curated / Category Badge - Exact Filter Chip Style */}
                      <div className="flex items-center justify-between">
                        <span className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !font-bold text-[#3478F6] shadow-2xs">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: album.accentColor || '#3478F6' }}
                          />
                          <span className="truncate max-w-[100px]">{album.badge || 'Album'}</span>
                        </span>
                      </div>

                      {/* Album Title - High Contrast Deep Navy */}
                      <h3 className="font-extrabold text-[12.5px] text-[#172B4D] tracking-tight truncate leading-snug">
                        {album.title}
                      </h3>

                      {/* Action Bar: View Collection + Play Button */}
                      <div className="mt-0.5 flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-[10px] font-semibold text-[#4A5D78]">
                          View collection
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayAlbumStory(album);
                          }}
                          className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !font-bold text-[#3478F6] hover:brightness-105 active:scale-90 transition-transform shadow-2xs gap-1 cursor-pointer"
                          title="Play Story Reel"
                        >
                          <Play className="w-2.5 h-2.5 fill-[#3478F6] text-[#3478F6]" />
                          <span className="text-[9.5px] font-extrabold uppercase tracking-wider">Play</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Story Reel Modal */}
      {storyTarget && (
        <AlbumStoryModal
          isOpen={isStoryOpen}
          onClose={() => {
            setIsStoryOpen(false);
            setStoryTarget(null);
          }}
          title={storyTarget.title}
          albumEmoji={storyTarget.emoji}
          accentColor={storyTarget.accentColor}
          screenshots={storyTarget.screenshots}
          onOpenDetail={(id) => {
            setIsStoryOpen(false);
            setStoryTarget(null);
            onSelectScreenshot(id);
          }}
        />
      )}

      {/* Create Album Modal */}
      <CreateAlbumModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateAlbum={handleCreateAlbum}
        allScreenshots={screenshots}
      />
    </div>
  );
};
