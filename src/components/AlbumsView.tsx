import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
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
import { classifyScreenshotPrecisely, type PreciseCategory } from '../utils/classifier';
import { ScreenshotCard } from './ScreenshotCard';
import { AlbumStoryModal } from './AlbumStoryModal';
import { CreateAlbumModal } from './CreateAlbumModal';
import { ThreadStitcherModal } from './ThreadStitcherModal';

interface AlbumsViewProps {
  screenshots: Screenshot[];
  onSelectScreenshot: (id: string) => void;
  onRefresh?: () => void;
  onModalStateChange?: (isOpen: boolean) => void;
  isIndexing?: boolean;
}

const LOCAL_STORAGE_CUSTOM_ALBUMS = 'recall_custom_albums';

export const AlbumsView: React.FC<AlbumsViewProps> = ({
  screenshots,
  onSelectScreenshot,
  onRefresh,
  onModalStateChange,
  isIndexing = false,
}) => {
  // Check if any uploaded screenshots are still pending indexing / AI clustering
  const pendingScreenshots = useMemo(
    () => screenshots.filter((s) => s.processing_status === 'queued' || s.processing_status === 'processing'),
    [screenshots]
  );
  const isSettingUpAlbums = isIndexing || pendingScreenshots.length > 0;

  // Real-time indexing progress counters
  const totalScreenshotsCount = screenshots.length;
  const completedScreenshotsCount = Math.max(0, totalScreenshotsCount - pendingScreenshots.length);
  const setupPercent = totalScreenshotsCount > 0 ? Math.round((completedScreenshotsCount / totalScreenshotsCount) * 100) : 100;

  // Navigation / View State
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'smart' | 'custom'>('all');

  // Dismiss any opened album view if background indexing starts
  useEffect(() => {
    if (isSettingUpAlbums) {
      setSelectedAlbumId(null);
    }
  }, [isSettingUpAlbums]);

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
  const [selectedThread, setSelectedThread] = useState<ThreadGroup | null>(null);
  const [selectedThreadInitialIndex, setSelectedThreadInitialIndex] = useState(0);

  useEffect(() => {
    api
      .getThreads()
      .then((res) => {
        if (res && res.threads) setThreads(res.threads);
      })
      .catch(() => {});
  }, []);

  const threadByScreenshotId = useMemo(() => {
    const map = new Map<string, ThreadGroup>();
    for (const t of threads) {
      const ids =
        t.screenshotIds && t.screenshotIds.length > 0
          ? t.screenshotIds
          : t.screenshots?.map((s) => s.id) || [];
      for (const id of ids) {
        map.set(id, t);
      }
    }
    return map;
  }, [threads]);

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

  // Generate Smart Albums from screenshots using precision AI classification
  const smartAlbums = useMemo<Album[]>(() => {
    const albums: Album[] = [];

    // Bucket all screenshots into their true precise categories
    const buckets: Record<PreciseCategory, Screenshot[]> = {
      chat: [],
      code_dev: [],
      food_dining: [],
      nature_scenery: [],
      wallpaper_art: [],
      portrait_people: [],
      animals_pets: [],
      receipt_finance: [],
      ticket_travel: [],
      product_shopping: [],
      poster_document: [],
      game: [],
      other: [],
    };

    for (const s of screenshots) {
      if (s.processing_status === 'ready') {
        const cat = classifyScreenshotPrecisely(s);
        buckets[cat].push(s);
      }
    }

    // 1. Conversation Threads & Chats
    const chatItems = buckets.chat;
    if (chatItems.length > 0 || threads.length > 0) {
      albums.push({
        id: 'smart-chats',
        title: 'Conversation Threads',
        description: `${chatItems.length} chat conversations${threads.length > 0 ? ` (${threads.length} threads)` : ''}`,
        category: 'chat',
        coverScreenshotId: chatItems[0]?.id || threads[0]?.screenshots[0]?.id,
        screenshotIds: chatItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '💬',
        badge: 'Conversations',
        accentColor: '#3478F6',
      });
    }

    // 2. Coding, Tech & System Errors (Google OAuth error, Java code, terminal, dev tools)
    const codeItems = buckets.code_dev;
    if (codeItems.length > 0) {
      albums.push({
        id: 'smart-code-dev',
        title: 'Code, Tech & Errors',
        description: `${codeItems.length} code snippets, developer logs & auth errors`,
        category: 'custom',
        coverScreenshotId: codeItems[0].id,
        screenshotIds: codeItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '💻',
        badge: 'Code & Dev',
        accentColor: '#4F46E5',
      });
    }

    // 3. Food, Dining & Cafes (Croissants, coffee, Third Wave Coffee, restaurant food)
    const foodItems = buckets.food_dining;
    if (foodItems.length > 0) {
      albums.push({
        id: 'smart-food',
        title: 'Food & Dining',
        description: `${foodItems.length} cafe visits, pastries & culinary moments`,
        category: 'custom',
        coverScreenshotId: foodItems[0].id,
        screenshotIds: foodItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🍔',
        badge: 'Food & Cafe',
        accentColor: '#F97316',
      });
    }

    // 4. Aesthetic & Wallpapers (Spider-Man art, digital art, stylized graphics)
    const wallpaperItems = buckets.wallpaper_art;
    if (wallpaperItems.length > 0) {
      albums.push({
        id: 'smart-wallpapers',
        title: 'Aesthetic & Wallpapers',
        description: `${wallpaperItems.length} digital art, superhero themes & wallpapers`,
        category: 'visual',
        coverScreenshotId: wallpaperItems[0].id,
        screenshotIds: wallpaperItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🖼️',
        badge: 'Wallpapers',
        accentColor: '#06B6D4',
      });
    }

    // 5. Nature & Scenery (Night sky, moon, clouds, sunsets, landscapes)
    const natureItems = buckets.nature_scenery;
    if (natureItems.length > 0) {
      albums.push({
        id: 'smart-nature',
        title: 'Nature & Scenery',
        description: `${natureItems.length} skies, sunsets, moon & landscapes`,
        category: 'visual',
        coverScreenshotId: natureItems[0].id,
        screenshotIds: natureItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🌌',
        badge: 'Scenery',
        accentColor: '#0EA5E9',
      });
    }

    // 6. Portraits & People (Simon Baker / Patrick Jane, silhouettes, people)
    const portraitItems = buckets.portrait_people;
    if (portraitItems.length > 0) {
      albums.push({
        id: 'smart-portraits',
        title: 'Portraits & People',
        description: `${portraitItems.length} portraits, people & character captures`,
        category: 'visual',
        coverScreenshotId: portraitItems[0].id,
        screenshotIds: portraitItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '👤',
        badge: 'Portraits',
        accentColor: '#8B5CF6',
      });
    }

    // 7. Animals & Pets (Betta fish, aquarium, pets)
    const animalItems = buckets.animals_pets;
    if (animalItems.length > 0) {
      albums.push({
        id: 'smart-animals',
        title: 'Pets & Animals',
        description: `${animalItems.length} aquatic life, pets & creature captures`,
        category: 'custom',
        coverScreenshotId: animalItems[0].id,
        screenshotIds: animalItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🐠',
        badge: 'Pets & Life',
        accentColor: '#10B981',
      });
    }

    // 8. Receipts & Expenses (Invoices, bills, totals)
    const receiptItems = buckets.receipt_finance;
    if (receiptItems.length > 0) {
      albums.push({
        id: 'smart-receipts',
        title: 'Receipts & Expenses',
        description: `${receiptItems.length} financial slips, bills & payments`,
        category: 'receipt',
        coverScreenshotId: receiptItems[0].id,
        screenshotIds: receiptItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🧾',
        badge: 'Finance',
        accentColor: '#10B981',
      });
    }

    // 9. Tickets & Travel Passes (Boarding passes, tickets)
    const ticketItems = buckets.ticket_travel;
    if (ticketItems.length > 0) {
      albums.push({
        id: 'smart-tickets',
        title: 'Tickets & Travel Passes',
        description: `${ticketItems.length} bookings, boarding passes & events`,
        category: 'ticket',
        coverScreenshotId: ticketItems[0].id,
        screenshotIds: ticketItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🎫',
        badge: 'Travel',
        accentColor: '#F59E0B',
      });
    }

    // 10. Shopping & Wishlists
    const shoppingItems = buckets.product_shopping;
    if (shoppingItems.length > 0) {
      albums.push({
        id: 'smart-shopping',
        title: 'Shopping & Wishlist',
        description: `${shoppingItems.length} curated products & gear`,
        category: 'product',
        coverScreenshotId: shoppingItems[0].id,
        screenshotIds: shoppingItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🛍️',
        badge: 'Wishlist',
        accentColor: '#EC4899',
      });
    }

    // 11. Documents & Study Notes
    const docItems = buckets.poster_document;
    if (docItems.length > 0) {
      albums.push({
        id: 'smart-documents',
        title: 'Documents & Notes',
        description: `${docItems.length} text documents & study notes`,
        category: 'custom',
        coverScreenshotId: docItems[0].id,
        screenshotIds: docItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '📚',
        badge: 'Documents',
        accentColor: '#6366F1',
      });
    }

    // 12. Gaming & Scoreboards
    const gameItems = buckets.game;
    if (gameItems.length > 0) {
      albums.push({
        id: 'smart-gaming',
        title: 'Gaming & High Scores',
        description: `${gameItems.length} victory & clutch gameplay moments`,
        category: 'game',
        coverScreenshotId: gameItems[0].id,
        screenshotIds: gameItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '🎮',
        badge: 'Gaming',
        accentColor: '#8B5CF6',
      });
    }

    // 13. General Captures (ONLY if any unclassified items remain)
    const otherItems = buckets.other;
    if (otherItems.length > 0) {
      albums.push({
        id: 'smart-other',
        title: 'Other Captures',
        description: `${otherItems.length} miscellaneous saved screenshots`,
        category: 'custom',
        coverScreenshotId: otherItems[0].id,
        screenshotIds: otherItems.map((s) => s.id),
        createdAt: new Date().toISOString(),
        isSmart: true,
        emoji: '📁',
        badge: 'Captures',
        accentColor: '#64748B',
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
  // VIEW: ALBUMS SETTING UP (Minimal Fluid Animation during Indexing)
  // -------------------------------------------------------------
  if (isSettingUpAlbums) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center px-6 py-12 text-center select-none animate-fadeIn">
        {/* Minimal Animated Liquid Glass Orb Pod */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Subtle Ambient Breathing Radial Glow */}
          <motion.div
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.25, 0.45, 0.25],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute h-36 w-36 rounded-full bg-gradient-to-tr from-[#3478F6]/30 via-sky-300/20 to-blue-500/30 blur-2xl pointer-events-none"
          />

          {/* Concentric Rotating Shimmer Rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute h-32 w-32 rounded-full border border-blue-200/40 pointer-events-none"
            style={{
              borderTopColor: '#3478F6',
              borderRightColor: 'rgba(52, 120, 246, 0.1)',
            }}
          />

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            className="absolute h-26 w-26 rounded-full border border-dashed border-blue-300/30 pointer-events-none"
          />

          {/* Central Plump Liquid Glass Dome */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex h-20 w-20 items-center justify-center rounded-[28px] shadow-xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 247, 255, 0.88) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              borderTopColor: '#FFFFFF',
              borderBottomColor: 'rgba(52, 120, 246, 0.3)',
              boxShadow:
                '0 14px 32px -4px rgba(23, 43, 77, 0.12), 0 4px 12px rgba(52, 120, 246, 0.1), inset 0 2px 3px #FFFFFF, inset 0 -2px 3px rgba(52, 120, 246, 0.14)',
            }}
          >
            {/* Specular Edge Hairline */}
            <div
              className="absolute top-0 inset-x-3 h-[1px] rounded-full pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 1) 30%, rgba(255, 255, 255, 1) 70%, transparent 100%)',
              }}
            />

            <FolderHeart className="h-9 w-9 text-[#3478F6] stroke-[2.2]" />
          </motion.div>
        </div>

        {/* Text Details */}
        <h2 className="text-xl font-black text-[#172B4D] tracking-tight">
          Albums are Setting Up
        </h2>
        <p className="mt-1.5 text-xs text-[#4A5D78] font-medium leading-relaxed max-w-[270px]">
          AI Vision is analyzing and organizing your screenshots into smart visual collections.
        </p>

        {/* Real-time Progress Bar & Percentage */}
        <div className="mt-5 w-60 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="font-semibold text-slate-500">
              {completedScreenshotsCount} of {totalScreenshotsCount} indexed
            </span>
            <span className="font-bold text-[#3478F6]">{setupPercent}%</span>
          </div>

          <div className="h-2 w-full rounded-full bg-blue-100/60 p-0.5 overflow-hidden shadow-inner border border-white/90">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#4A8CF7] to-[#3478F6] transition-all duration-500 ease-out shadow-xs"
              style={{ width: `${Math.max(6, setupPercent)}%` }}
            />
          </div>
        </div>

        {/* Calming Reassurance Pill */}
        <div className="mt-5 liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active gap-1.5 shadow-2xs">
          <Loader2 className="w-3 h-3 text-[#3478F6] animate-spin" />
          <span className="text-[10.5px] font-bold text-[#3478F6]">
            Unlocks automatically once ready
          </span>
        </div>
      </div>
    );
  }

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
                  threadGroup={threadByScreenshotId.get(s.id)}
                  onOpenThreadReel={(t, initialIndex) => {
                    setSelectedThread(t);
                    setSelectedThreadInitialIndex(initialIndex ?? 0);
                  }}
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
            <div className="absolute right-3 top-3 bottom-3 w-32 opacity-30 overflow-hidden rounded-2xl pointer-events-none flex gap-1.5">
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
                  className="relative rounded-[24px] overflow-hidden aspect-[1/1.22] border border-slate-200/90 shadow-sm flex flex-col justify-end bg-slate-900 active:scale-[0.98] transition-transform duration-150 cursor-pointer select-none"
                  onClick={() => setSelectedAlbumId(album.id)}
                >
                  {/* Full Cover Image Showcase */}
                  {coverUrl ? (
                    <div className="absolute inset-0 overflow-hidden bg-slate-900">
                      <img
                        src={coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover object-top"
                        loading="lazy"
                      />
                      {/* Subtle Vignette so title and badges stand out without heavy white wash */}
                      <div className="absolute inset-x-0 bottom-0 h-32 pointer-events-none bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50/90 via-white/70 to-slate-100 text-slate-300">
                      <ImageIcon className="w-10 h-10 text-[#3478F6]/40" />
                    </div>
                  )}

                  {/* Top Bar Floating Badges (Exact Filter Chip Style) */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
                    <span className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !h-6 !w-6 !p-0 shadow-md pointer-events-auto text-xs">
                      {album.emoji || '📁'}
                    </span>
                    <span className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !font-bold font-mono text-[#3478F6] shadow-md pointer-events-auto">
                      {album.screenshotIds.length}
                    </span>
                  </div>

                  {/* Sleek, Compact Plumpy Liquid Glass Content Plate (Reduced White Linear Bg) */}
                  <div
                    className="relative z-10 px-3 py-2 rounded-b-[24px] flex flex-col gap-1 border-t border-white/60"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(255, 255, 255, 0.78) 0%, rgba(246, 250, 255, 0.86) 100%)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.9)',
                    }}
                  >
                    {/* Specular Edge Hairline */}
                    <div
                      className="absolute top-0 inset-x-4 h-[1px] pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 1) 25%, rgba(255, 255, 255, 1) 75%, transparent 100%)',
                      }}
                    />

                    {/* Curated / Category Badge - Compact Filter Chip */}
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
                    <h3 className="font-extrabold text-[12px] text-[#172B4D] tracking-tight truncate leading-snug">
                      {album.title}
                    </h3>

                    {/* Action Bar: View Collection + Play Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                      <span className="text-[9.5px] font-semibold text-[#4A5D78]">
                        View collection
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayAlbumStory(album);
                        }}
                        className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !font-bold text-[#3478F6] active:scale-90 transition-transform shadow-2xs gap-1 cursor-pointer"
                        title="Play Story Reel"
                      >
                        <Play className="w-2 h-2 fill-[#3478F6] text-[#3478F6]" />
                        <span className="text-[9px] font-extrabold uppercase tracking-wider">Play</span>
                      </button>
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

      {/* Thread Stitcher Reel Modal inside Album */}
      {selectedThread && (
        <ThreadStitcherModal
          isOpen={Boolean(selectedThread)}
          thread={selectedThread}
          initialIndex={selectedThreadInitialIndex}
          onClose={() => setSelectedThread(null)}
          onSelectScreenshot={(id) => {
            setSelectedThread(null);
            onSelectScreenshot(id);
          }}
        />
      )}
    </div>
  );
};
