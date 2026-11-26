import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Image as ImageIcon, FolderPlus, Lock, Crown, ShieldCheck } from 'lucide-react';
import type { Screenshot, Album } from '../types';
import { api } from '../services/api';
import { AlbumPinModal } from './AlbumPinModal';

interface CreateAlbumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAlbum: (album: Omit<Album, 'id' | 'createdAt'>) => void;
  allScreenshots: Screenshot[];
  isPro?: boolean;
  onOpenSubscription?: () => void;
}

const EMOJI_OPTIONS = ['📁', '🔒', '❤️', '🎮', '💬', '🧾', '✈️', '🛍️', '🎨', '🎵', '💡', '🏆', '🏖️'];
const ACCENT_COLORS = [
  { name: 'Blue', hex: '#3478F6' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Sunset', hex: '#F59E0B' },
  { name: 'Rose', hex: '#EC4899' },
  { name: 'Cyan', hex: '#06B6D4' },
];

export const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({
  isOpen,
  onClose,
  onCreateAlbum,
  allScreenshots,
  isPro = false,
  onOpenSubscription,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📁');
  const [selectedColor, setSelectedColor] = useState(ACCENT_COLORS[0].hex);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLocked, setIsLocked] = useState(false);
  const [pinHash, setPinHash] = useState<string | undefined>(undefined);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === allScreenshots.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allScreenshots.map((s) => s.id)));
    }
  };

  const handleToggleLock = () => {
    if (!isPro) {
      onOpenSubscription?.();
      return;
    }

    if (isLocked) {
      setIsLocked(false);
      setPinHash(undefined);
    } else {
      setIsPinModalOpen(true);
    }
  };

  const handlePinSuccess = (newHash?: string) => {
    if (newHash) {
      setPinHash(newHash);
      setIsLocked(true);
      if (selectedEmoji === '📁') {
        setSelectedEmoji('🔒');
      }
    }
    setIsPinModalOpen(false);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle || selectedIds.size === 0) return;

    const screenshotIds = Array.from(selectedIds);
    onCreateAlbum({
      title: cleanTitle,
      description: description.trim() || undefined,
      category: 'custom',
      coverScreenshotId: screenshotIds[0],
      screenshotIds,
      emoji: selectedEmoji,
      accentColor: selectedColor,
      badge: isLocked ? 'Private Secret Vault' : 'Custom Album',
      isSmart: false,
      isLocked,
      pinHash,
    });

    // Reset and close
    setTitle('');
    setDescription('');
    setSelectedIds(new Set());
    setIsLocked(false);
    setPinHash(undefined);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-[#F3F7FC]/95 border border-white/60 shadow-2xl overflow-hidden backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-200/50">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: selectedColor }}
            >
              <FolderPlus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="font-bold text-[#172B4D] text-lg tracking-tight">New Custom Album</h2>
              <p className="text-xs text-[#4A5D78]">Create a curated collection of screenshots</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200/50 text-[#4A5D78] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Title & Emoji Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
              Album Title
            </label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  type="button"
                  className="h-11 w-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-xs"
                >
                  {selectedEmoji}
                </button>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Travel Plans, Wishlist, Tech Inspiration"
                className="flex-1 h-11 px-3.5 rounded-2xl bg-white border border-slate-200 text-sm text-[#172B4D] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6]/30 shadow-xs"
                autoFocus
              />
            </div>
          </div>

          {/* Emoji Picker Row */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#4A5D78]">Choose Icon</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-lg transition-transform active:scale-95 ${
                    selectedEmoji === emoji
                      ? 'bg-white shadow-md border-2 border-[#3478F6] scale-105'
                      : 'bg-white/60 hover:bg-white border border-slate-200/60'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color Palette */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#4A5D78]">Accent Color</label>
            <div className="flex items-center gap-2.5">
              {ACCENT_COLORS.map((col) => (
                <button
                  key={col.hex}
                  type="button"
                  onClick={() => setSelectedColor(col.hex)}
                  className={`w-7 h-7 rounded-full transition-transform active:scale-90 flex items-center justify-center ${
                    selectedColor === col.hex ? 'ring-2 ring-offset-2 ring-slate-400 scale-110 shadow-sm' : ''
                  }`}
                  style={{ backgroundColor: col.hex }}
                >
                  {selectedColor === col.hex && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description (Optional) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#4A5D78]">
              Description <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a brief note about this album..."
              className="w-full h-9 px-3 rounded-xl bg-white border border-slate-200 text-xs text-[#172B4D] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6]/30 shadow-xs"
            />
          </div>

          {/* Pro PIN Lock & Vault Protection Card - Plumpy iOS Liquid Glass */}
          <div
            className="rounded-[22px] p-3.5 transition-all"
            style={{
              background: 'linear-gradient(155deg, rgba(255, 255, 255, 0.96) 0%, rgba(246, 250, 255, 0.90) 50%, rgba(235, 244, 255, 0.85) 100%)',
              border: '1.5px solid rgba(255, 255, 255, 0.95)',
              borderTopColor: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(23, 43, 77, 0.05), inset 0 1.5px 2px #FFFFFF, inset 0 -1px 1.5px rgba(52, 120, 246, 0.06)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[14px] text-white"
                  style={{
                    background: 'linear-gradient(145deg, #5392FF 0%, #3478F6 50%, #1E5CD1 100%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.95)',
                    borderTopColor: '#FFFFFF',
                    borderBottomColor: 'rgba(23, 43, 77, 0.35)',
                    boxShadow: '0 3px 10px rgba(52, 120, 246, 0.32), inset 0 1.5px 2px rgba(255, 255, 255, 0.85)',
                  }}
                >
                  <Lock className="h-4.5 w-4.5 stroke-[2.4]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-[#172B4D]">4-Digit PIN Lock</span>
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-950 text-[10px] font-black border border-amber-500/25 shadow-2xs">
                      <Crown className="h-3 w-3 text-amber-600 fill-amber-500" />
                      Pro
                    </span>
                  </div>
                  <p className="text-[11px] text-[#4A5D78] font-medium">
                    {isLocked ? 'Passcode enabled • Secret vault protected' : 'Require 4-digit PIN & biometrics to view'}
                  </p>
                </div>
              </div>

              {/* Plumpy Liquid Toggle switch */}
              <button
                type="button"
                onClick={handleToggleLock}
                className={`relative inline-flex h-6.5 w-11.5 items-center rounded-full transition-all cursor-pointer p-0.5 ${
                  isLocked ? 'bg-[#3478F6]' : 'bg-slate-300'
                }`}
                style={{
                  boxShadow: isLocked
                    ? '0 2px 8px rgba(52, 120, 246, 0.4), inset 0 1px 1.5px rgba(255, 255, 255, 0.6)'
                    : 'inset 0 1px 2px rgba(0, 0, 0, 0.1)',
                }}
                aria-label="Toggle PIN Lock"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                    isLocked ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                  style={{
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 1px #FFFFFF',
                  }}
                />
              </button>
            </div>

            {isLocked && (
              <div className="mt-2.5 pt-2 border-t border-blue-100/70 flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-black flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Passcode Configured
                </span>
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(true)}
                  className="plump-glass-pill !h-6 !px-2.5 !rounded-full !text-[10px] !font-bold text-[#3478F6] cursor-pointer"
                >
                  Change PIN
                </button>
              </div>
            )}
          </div>

          {/* Screenshot Selector */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                  Select Photos
                </label>
                <p className="text-[11px] text-[#4A5D78]">
                  {selectedIds.size} of {allScreenshots.length} selected
                </p>
              </div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs font-semibold text-[#3478F6] hover:underline"
              >
                {selectedIds.size === allScreenshots.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {allScreenshots.length === 0 ? (
              <div className="p-8 text-center bg-white/50 rounded-2xl border border-dashed border-slate-300">
                <ImageIcon className="w-8 h-8 mx-auto text-slate-300" />
                <p className="mt-2 text-xs text-slate-500 font-medium">No screenshots available to add.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 rounded-2xl p-1">
                {allScreenshots.map((s) => {
                  const isSelected = selectedIds.has(s.id);
                  const imgUrl = api.getImageUrl(s.id);

                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleSelect(s.id)}
                      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-150 ${
                        isSelected
                          ? 'border-[#3478F6] shadow-md ring-2 ring-[#3478F6]/20'
                          : 'border-transparent hover:border-slate-300 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={s.original_filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#3478F6] flex items-center justify-center text-white shadow-sm">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200/50 bg-white/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4A5D78] hover:bg-slate-200/50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!title.trim() || selectedIds.size === 0}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#3478F6] to-[#2563EB] text-white text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Create Album ({selectedIds.size})
          </button>
        </div>
      </div>

      {/* PIN Setup Modal */}
      <AlbumPinModal
        isOpen={isPinModalOpen}
        mode="set"
        albumTitle={title.trim() || 'New Album'}
        onSuccess={handlePinSuccess}
        onClose={() => setIsPinModalOpen(false)}
      />
    </div>,
    document.body
  );
};
