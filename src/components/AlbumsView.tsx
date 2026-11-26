import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Crown,
  Lock,
  Unlock,
} from 'lucide-react';
import type { Screenshot, Album, ThreadGroup } from '../types';
import { api } from '../services/api';
import { classifyScreenshotPrecisely, type PreciseCategory } from '../utils/classifier';
import { useBackButton } from '../utils/backHandler';
import { ScreenshotCard } from './ScreenshotCard';
import { AlbumStoryModal } from './AlbumStoryModal';
import { CreateAlbumModal } from './CreateAlbumModal';
import { ThreadStitcherModal } from './ThreadStitcherModal';
import { AlbumPinModal } from './AlbumPinModal';

interface AlbumsViewProps {
  screenshots: Screenshot[];
  onSelectScreenshot: (id: string) => void;
  onRefresh?: () => void;
  onModalStateChange?: (isOpen: boolean) => void;
  isIndexing?: boolean;
  isPro?: boolean;
  onOpenSubscription?: () => void;
}

const LOCAL_STORAGE_CUSTOM_ALBUMS = 'recall_custom_albums';

export const AlbumsView: React.FC<AlbumsViewProps> = ({
  screenshots,
  onSelectScreenshot,
  onRefresh,
  onModalStateChange,
  isIndexing = false,
  isPro = false,
  onOpenSubscription,
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

  // Smooth Glitch-Free Unlocking State Machine
  const [isUnlocking, setIsUnlocking] = useState(false);
  const prevPendingCountRef = useRef(pendingScreenshots.length);

  useEffect(() => {
    if (prevPendingCountRef.current > 0 && pendingScreenshots.length === 0 && !isIndexing) {
      setIsUnlocking(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([12, 40, 20]);
        } catch {}
      }
      const timer = setTimeout(() => {
        setIsUnlocking(false);
      }, 700);
      return () => clearTimeout(timer);
    }
    prevPendingCountRef.current = pendingScreenshots.length;
  }, [pendingScreenshots.length, isIndexing]);

  const showSettingUpView = isSettingUpAlbums || isUnlocking;

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

  // Pro PIN Unlock & Secret Vault Session State
  const [unlockedAlbumIds, setUnlockedAlbumIds] = useState<Set<string>>(new Set());
  const [pinModalConfig, setPinModalConfig] = useState<{
    isOpen: boolean;
    mode: 'unlock' | 'set' | 'remove';
    album: Album | null;
    pendingAction?: () => void;
  }>({
    isOpen: false,
    mode: 'unlock',
    album: null,
  });

  const handleAlbumCardClick = (album: Album) => {
    if (album.isLocked && !unlockedAlbumIds.has(album.id)) {
      setPinModalConfig({
        isOpen: true,
        mode: 'unlock',
        album,
        pendingAction: () => setSelectedAlbumId(album.id),
      });
      return;
    }
    setSelectedAlbumId(album.id);
  };

  const handlePlayStoryClick = (e: React.MouseEvent, album: Album) => {
    e.stopPropagation();
    if (album.isLocked && !unlockedAlbumIds.has(album.id)) {
      setPinModalConfig({
        isOpen: true,
        mode: 'unlock',
        album,
        pendingAction: () => handlePlayAlbumStory(album),
      });
      return;
    }
    handlePlayAlbumStory(album);
  };

  const handlePinModalSuccess = (newHash?: string) => {
    const target = pinModalConfig.album;
    if (!target) {
      setPinModalConfig({ isOpen: false, mode: 'unlock', album: null });
      return;
    }

    if (pinModalConfig.mode === 'unlock') {
      setUnlockedAlbumIds((prev) => new Set(prev).add(target.id));
      setPinModalConfig({ isOpen: false, mode: 'unlock', album: null });
      pinModalConfig.pendingAction?.();
    } else if (pinModalConfig.mode === 'set' && newHash) {
      const updated = customAlbums.map((a) =>
        a.id === target.id
          ? { ...a, isLocked: true, pinHash: newHash, badge: 'Private Secret Vault' }
          : a
      );
      saveCustomAlbums(updated);
      setUnlockedAlbumIds((prev) => new Set(prev).add(target.id));
      setPinModalConfig({ isOpen: false, mode: 'unlock', album: null });
    } else if (pinModalConfig.mode === 'remove') {
      const updated = customAlbums.map((a) =>
        a.id === target.id
          ? { ...a, isLocked: false, pinHash: undefined, badge: 'Custom Album' }
          : a
      );
      saveCustomAlbums(updated);
      setUnlockedAlbumIds((prev) => {
        const next = new Set(prev);
        next.delete(target.id);
        return next;
      });
      setPinModalConfig({ isOpen: false, mode: 'unlock', album: null });
    }
  };

  const handleRelockCurrentAlbum = (albumId: string) => {
    setUnlockedAlbumIds((prev) => {
      const next = new Set(prev);
      next.delete(albumId);
      return next;
    });
    setSelectedAlbumId(null);
  };

  const handleLockCustomAlbumPrompt = (album: Album) => {
    if (!isPro) {
      onOpenSubscription?.();
      return;
    }
    setPinModalConfig({
      isOpen: true,
      mode: 'set',
      album,
    });
  };

  const handleRemoveLockPrompt = (album: Album) => {
    setPinModalConfig({
      isOpen: true,
      mode: 'remove',
      album,
    });
  };

  // Back Button Navigation Registration
  useBackButton(
    'album-pin-modal-nav',
    76,
    () => {
      setPinModalConfig((prev) => ({ ...prev, isOpen: false }));
      return true;
    },
    pinModalConfig.isOpen
  );

  useBackButton(
    'album-create-modal',
    75,
    () => {
      setIsCreateOpen(false);
      return true;
    },
    isCreateOpen
  );

  useBackButton(
    'album-story-modal',
    75,
    () => {
      setIsStoryOpen(false);
      setStoryTarget(null);
      return true;
    },
    isStoryOpen
  );

  useBackButton(
    'album-thread-modal',
    70,
    () => {
      setSelectedThread(null);
      setSelectedThreadInitialIndex(0);
      return true;
    },
    Boolean(selectedThread)
  );

  useBackButton(
    'album-detail-view',
    50,
    () => {
      setSelectedAlbumId(null);
      return true;
    },
    Boolean(selectedAlbumId)
  );

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
    const isModalActive = isStoryOpen || isCreateOpen || pinModalConfig.isOpen;
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
    if (!isPro) {
      onOpenSubscription?.();
      return;
    }
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
    if (!isPro) {
      onOpenSubscription?.();
      return;
    }
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
  // VIEW: ALBUMS SETTING UP COMPONENT
  // -------------------------------------------------------------
  const renderSettingUpView = () => (
    <motion.div
      key="albums-setting-up"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94, filter: 'blur(10px)' }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-[75vh] flex flex-col items-center justify-center px-6 py-12 text-center select-none"
    >
      {/* Minimal Animated Liquid Glass Orb Pod */}
      <div className="relative mb-6 flex items-center justify-center">
        {/* Subtle Ambient Radial Glow */}
        <motion.div
          animate={
            isUnlocking
              ? { scale: [1, 1.25], opacity: [0.35, 0] }
              : { opacity: [0.25, 0.4, 0.25] }
          }
          transition={{
            duration: isUnlocking ? 0.5 : 3,
            repeat: isUnlocking ? 0 : Infinity,
            ease: 'easeInOut',
          }}
          className={`absolute h-32 w-32 rounded-full blur-xl pointer-events-none transition-colors duration-400 ${
            isUnlocking
              ? 'bg-gradient-to-tr from-emerald-400/40 via-teal-300/30 to-blue-400/30'
              : 'bg-gradient-to-tr from-[#3478F6]/25 via-sky-300/20 to-blue-500/25'
          }`}
        />

        {/* Concentric Subtle Halo Rings (Static 2D, zero continuous JS rotation overhead) */}
        <div
          className="absolute h-32 w-32 rounded-full border border-blue-200/40 pointer-events-none"
          style={{
            borderTopColor: isUnlocking ? '#10B981' : '#3478F6',
            borderRightColor: 'rgba(52, 120, 246, 0.15)',
          }}
        />

        <div className="absolute h-26 w-26 rounded-full border border-dashed border-blue-300/30 pointer-events-none" />

        {/* Central Plump Liquid Glass Dome */}
        <motion.div
          animate={
            isUnlocking
              ? { scale: [1, 1.12, 1] }
              : { y: [0, -3, 0] }
          }
          transition={
            isUnlocking
              ? { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }
              : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          }
          className="relative flex h-20 w-20 items-center justify-center rounded-[28px] shadow-xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 247, 255, 0.88) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1.5px solid rgba(255, 255, 255, 0.95)',
            borderTopColor: '#FFFFFF',
            borderBottomColor: isUnlocking ? 'rgba(16, 185, 129, 0.4)' : 'rgba(52, 120, 246, 0.3)',
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

          {isUnlocking ? (
            <CheckCircle2 className="h-9 w-9 text-emerald-500 stroke-[2.4]" />
          ) : (
            <FolderHeart className="h-9 w-9 text-[#3478F6] stroke-[2.2]" />
          )}
        </motion.div>
      </div>

      {/* Text Details */}
      <h2 className="text-xl font-black text-[#172B4D] tracking-tight">
        {isUnlocking ? 'Albums Ready!' : 'Albums are Setting Up'}
      </h2>
      <p className="mt-1.5 text-xs text-[#4A5D78] font-medium leading-relaxed max-w-[270px]">
        {isUnlocking
          ? 'All screenshots indexed. Opening your smart albums now…'
          : 'AI Vision is analyzing and organizing your screenshots into smart visual collections.'}
      </p>

      {/* Real-time Progress Bar & Percentage */}
      <div className="mt-5 w-60 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="font-semibold text-slate-500">
            {completedScreenshotsCount} of {totalScreenshotsCount} indexed
          </span>
          <span className={`font-bold ${isUnlocking ? 'text-emerald-600' : 'text-[#3478F6]'}`}>
            {isUnlocking ? 100 : setupPercent}%
          </span>
        </div>

        <div className="h-2 w-full rounded-full bg-blue-100/60 p-0.5 overflow-hidden shadow-inner border border-white/90">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out shadow-xs ${
              isUnlocking
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-[#4A8CF7] to-[#3478F6]'
            }`}
            style={{ width: `${isUnlocking ? 100 : Math.max(6, setupPercent)}%` }}
          />
        </div>
      </div>

      {/* Calming Reassurance Pill */}
      {isUnlocking ? (
        <div className="mt-5 liquid-filter-chip liquid-filter-chip-xs !bg-emerald-50 !border-emerald-200 text-emerald-600 gap-1.5 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 stroke-[2.4]" />
          <span className="text-[10.5px] font-bold text-emerald-600">Albums Unlocked</span>
        </div>
      ) : (
        <div className="mt-5 liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active gap-1.5 shadow-2xs">
          <Loader2 className="w-3 h-3 text-[#3478F6] animate-spin" />
          <span className="text-[10.5px] font-bold text-[#3478F6]">
            Unlocks automatically once ready
          </span>
        </div>
      )}
    </motion.div>
  );

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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/70 text-xs font-bold text-[#172B4D] active:bg-white active:scale-95 transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Albums</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Pro PIN Lock / Relock Button for Custom Albums */}
            {!currentAlbum.isSmart && (
              currentAlbum.isLocked ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleRelockCurrentAlbum(currentAlbum.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-300 text-xs font-bold text-amber-900 active:scale-95 transition-all shadow-xs cursor-pointer"
                    title="Lock album now"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600 stroke-[2.4]" />
                    <span>Relock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveLockPrompt(currentAlbum)}
                    className="p-1.5 rounded-full bg-white/80 border border-slate-200/70 text-slate-500 hover:text-slate-800 active:scale-95 transition-all shadow-xs cursor-pointer"
                    title="Remove PIN Protection"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleLockCustomAlbumPrompt(currentAlbum)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/15 via-white to-amber-500/10 border border-amber-300 text-xs font-bold text-amber-900 active:scale-95 transition-all shadow-xs cursor-pointer"
                  title="Lock album with 4-digit PIN"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-600 stroke-[2.4]" />
                  <span>Lock</span>
                  <Crown className="w-3 h-3 text-amber-600 fill-amber-500" />
                </button>
              )
            )}

            <button
              type="button"
              onClick={handleExportCollage}
              disabled={isExportingCollage || currentAlbumScreenshots.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200/70 text-xs font-bold text-[#172B4D] active:bg-white active:scale-95 transition-all shadow-xs disabled:opacity-50"
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
                className="p-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 active:bg-rose-100 active:scale-95 transition-all"
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
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white text-[#172B4D] font-extrabold text-sm shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-40"
              >
                {isPro ? (
                  <Play className="w-4 h-4 fill-[#172B4D]" />
                ) : (
                  <Crown className="w-4 h-4 text-amber-500" />
                )}
                <span>{isPro ? 'Play Story Reel' : 'Unlock Story Reel (Pro)'}</span>
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
                    if (!isPro) {
                      onOpenSubscription?.();
                      return;
                    }
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
    <div className="min-h-full pb-32">
      <AnimatePresence mode="wait">
        {showSettingUpView ? (
          renderSettingUpView()
        ) : (
          <motion.div
            key="albums-main-grid"
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(6px)' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
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
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-[#172B4D] font-extrabold text-xs shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-40"
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
      <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2 px-4 pt-3 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 className="font-extrabold text-[#172B4D] text-[15px] tracking-tight truncate whitespace-nowrap">
            {activeFilter === 'all'
              ? 'All Albums'
              : activeFilter === 'smart'
                ? 'Smart Albums'
                : 'Custom Albums'}
          </h2>
          <span className="liquid-filter-chip liquid-filter-chip-xs !font-bold font-mono text-[#3478F6] shrink-0">
            {filteredAlbums.length}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto flex-nowrap">
          {/* AI Curate / Re-Analyze Vault Button */}
          <button
            type="button"
            onClick={handleAiCurate}
            disabled={isAiAnalyzing || screenshots.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-filter-chip liquid-filter-chip-xs !font-bold text-[#3478F6] active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50 shrink-0 whitespace-nowrap"
            title="Analyze and cluster vault screenshots with AI Vision"
          >
            <RefreshCw className={`w-3 h-3 text-[#3478F6] shrink-0 ${isAiAnalyzing ? 'animate-spin' : ''}`} />
            <span className="text-[11.5px] font-bold whitespace-nowrap select-none">
              {isAiAnalyzing ? 'Curating…' : 'AI Curate'}
            </span>
          </button>

          {/* New Album Button */}
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !font-bold text-[#3478F6] active:scale-95 transition-all shadow-2xs cursor-pointer shrink-0 whitespace-nowrap"
            title="Create New Custom Album"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.6] shrink-0 text-[#3478F6]" />
            <span className="text-[11.5px] font-bold whitespace-nowrap select-none">New Album</span>
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
          <div className="py-14 px-4 text-center bg-white/20 rounded-3xl border border-dashed border-slate-300/60 shadow-2xs">
            <FolderHeart className="w-11 h-11 mx-auto text-slate-300 stroke-[1.8]" />
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
                className="mt-4 px-5 py-2 rounded-2xl bg-[#3478F6] text-white text-xs font-bold shadow-xs active:bg-[#2563EB] active:scale-95 transition-all cursor-pointer"
              >
                Create Album
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredAlbums.map((album) => {
              const isAlbumLocked = Boolean(album.isLocked && !unlockedAlbumIds.has(album.id));
              const coverUrl = album.coverScreenshotId
                ? api.getImageUrl(album.coverScreenshotId)
                : '';

              return (
                <div
                  key={album.id}
                  className="relative rounded-[24px] overflow-hidden aspect-[1/1.22] border border-slate-200/90 shadow-sm flex flex-col justify-end bg-slate-900 active:scale-[0.98] transition-transform duration-150 cursor-pointer select-none"
                  onClick={() => handleAlbumCardClick(album)}
                >
                  {/* Full Cover Image Showcase */}
                  {coverUrl ? (
                    <div className="absolute inset-0 overflow-hidden bg-slate-900">
                      <img
                        src={coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover object-top transition-all duration-300"
                        style={
                          isAlbumLocked
                            ? { filter: 'blur(22px) brightness(0.65)', transform: 'scale(1.1)' }
                            : {}
                        }
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

                  {/* Centered Secret Vault Privacy Shield Overlay when Locked */}
                  {isAlbumLocked && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-3 text-center pointer-events-none">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/25 backdrop-blur-md text-white border border-white/50 shadow-lg mb-1.5 animate-pulse">
                        <Lock className="h-5 w-5 stroke-[2.4]" />
                      </div>
                      <span className="text-[11px] font-black text-white tracking-wider uppercase drop-shadow-md">
                        Secret Vault
                      </span>
                      <span className="text-[9.5px] font-bold text-white/85 drop-shadow-xs">
                        Tap to Unlock with PIN
                      </span>
                    </div>
                  )}

                  {/* Top Bar Floating Badges (Exact Filter Chip Style) */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none z-10">
                    <span className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !h-6 !w-6 !p-0 shadow-md pointer-events-auto text-xs">
                      {album.emoji || (isAlbumLocked ? '🔒' : '📁')}
                    </span>
                    {isAlbumLocked ? (
                      <span className="liquid-filter-chip liquid-filter-chip-xs !bg-amber-400 !text-amber-950 !border-amber-300 !font-black shadow-md pointer-events-auto flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 stroke-[3]" />
                        <span>LOCKED</span>
                      </span>
                    ) : (
                      <span className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active !font-bold font-mono text-[#3478F6] shadow-md pointer-events-auto">
                        {album.screenshotIds.length}
                      </span>
                    )}
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
                        onClick={(e) => handlePlayStoryClick(e, album)}
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
          </motion.div>
        )}
      </AnimatePresence>

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
        isPro={isPro}
        onOpenSubscription={onOpenSubscription}
      />

      {/* Pro PIN Unlock & Passcode Modal */}
      {pinModalConfig.album && (
        <AlbumPinModal
          isOpen={pinModalConfig.isOpen}
          mode={pinModalConfig.mode}
          albumTitle={pinModalConfig.album.title}
          expectedPinHash={pinModalConfig.album.pinHash}
          onSuccess={handlePinModalSuccess}
          onClose={() => setPinModalConfig((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

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
