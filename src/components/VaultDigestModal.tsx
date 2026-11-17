import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Tag,
  Calendar,
  CreditCard,
  Copy,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  BellRing,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { VaultDigestResponse, DigestEventItem } from '../types';
import { api } from '../services/api';
import { triggerCalendarDownload } from '../utils/smartActions';

interface VaultDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScreenshot: (id: string) => void;
}

export const VaultDigestModal: React.FC<VaultDigestModalProps> = ({
  isOpen,
  onClose,
  onSelectScreenshot,
}) => {
  const [data, setData] = useState<VaultDigestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'discounts' | 'events' | 'bills'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api
      .getVaultDigest()
      .then((res) => setData(res))
      .catch((err) => console.error('Failed to load digest:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = (id: string, code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddToCalendar = (item: DigestEventItem, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerCalendarDownload(item.title, item.dateStr, item.location || 'See Screenshot');
  };

  const discounts = data?.discounts || [];
  const events = data?.events || [];
  const bills = data?.bills || [];
  const totalCount = discounts.length + events.length + bills.length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-md sm:items-center sm:justify-center sm:p-4 touch-none overscroll-none">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: '100%', opacity: 0.8 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="liquid-glass-container relative z-10 flex h-[92dvh] w-full flex-col rounded-t-[32px] sm:max-w-xl sm:h-[84vh] sm:rounded-[32px] shadow-2xl overflow-hidden touch-auto overscroll-contain"
      >
        {/* Drag handle */}
        <div className="flex w-full justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/70 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 shrink-0 shadow-2xs">
              <BellRing className="h-4.5 w-4.5 stroke-[2.3]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#172B4D]">
                  Vault Digest
                </h3>
                <span className="liquid-category-badge px-2 py-0.5 text-[9.5px] font-bold text-amber-700">
                  PROACTIVE AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Things you saved to remember before they expire
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-500 active:scale-90 transition-all cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[2]" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="border-b border-white/60 bg-white/40 px-4 py-2 backdrop-blur-sm">
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-full py-1.5 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'all'
                  ? 'bg-[#3478F6] text-white shadow-xs'
                  : 'liquid-glass-pill text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>All</span>
              <span className="text-[9.5px] opacity-80">({totalCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('discounts')}
              className={`rounded-full py-1.5 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'discounts'
                  ? 'bg-[#3478F6] text-white shadow-xs'
                  : 'liquid-glass-pill text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Promos</span>
              <span className="text-[9.5px] opacity-80">({discounts.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`rounded-full py-1.5 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'events'
                  ? 'bg-[#3478F6] text-white shadow-xs'
                  : 'liquid-glass-pill text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Events</span>
              <span className="text-[9.5px] opacity-80">({events.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bills')}
              className={`rounded-full py-1.5 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'bills'
                  ? 'bg-[#3478F6] text-white shadow-xs'
                  : 'liquid-glass-pill text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Bills</span>
              <span className="text-[9.5px] opacity-80">({bills.length})</span>
            </button>
          </div>
        </div>

        {/* Content Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#3478F6]" />
              <p className="text-xs font-bold text-slate-500">Scanning screenshot memories...</p>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-[#3478F6] border border-blue-100 shadow-xs">
                <Layers className="h-6 w-6 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">No active deadlines detected</h4>
                <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">
                  As you import screenshots of discount codes, flight tickets, and bills, Recall surfaces them here proactively before they expire!
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Discounts & Coupons Stream */}
              {(activeTab === 'all' || activeTab === 'discounts') && discounts.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5 px-1 text-xs font-bold text-slate-600">
                    <Tag className="h-3.5 w-3.5 text-amber-500" />
                    <span>Discounts & Promo Codes ({discounts.length})</span>
                  </div>

                  {discounts.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectScreenshot(item.screenshotId);
                        onClose();
                      }}
                      className="liquid-glass-card rounded-[22px] p-3.5 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-all border border-white/80 hover:border-amber-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={api.getImageUrl(item.screenshotId)}
                          alt={item.originalFilename}
                          className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-[#172B4D] truncate">
                              {item.brand}
                            </span>
                            <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-2 py-0.2 text-[9.5px] font-bold text-emerald-700">
                              {item.discountText}
                            </span>
                            {item.urgency === 'urgent' && (
                              <span className="rounded-full bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[9px] font-bold text-rose-600 flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                <span>Urgent</span>
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#3478F6] bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100">
                              {item.code}
                            </span>
                            {item.expiryHint && (
                              <span className="text-[10.5px] text-slate-400 font-medium truncate">
                                {item.expiryHint}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleCopyCode(item.id, item.code, e)}
                        className={`flex h-8.5 items-center gap-1 rounded-full px-3 text-[11px] font-bold transition-all cursor-pointer shadow-xs shrink-0 ${
                          copiedId === item.id
                            ? 'bg-emerald-600 text-white'
                            : 'liquid-btn-primary text-white active:scale-95'
                        }`}
                      >
                        {copiedId === item.id ? (
                          <>
                            <Check className="h-3 w-3 stroke-[2.4]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 stroke-[2.2]" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 2. Events & Bookings Stream */}
              {(activeTab === 'all' || activeTab === 'events') && events.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-1.5 px-1 text-xs font-bold text-slate-600">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>Upcoming Events & Passes ({events.length})</span>
                  </div>

                  {events.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectScreenshot(item.screenshotId);
                        onClose();
                      }}
                      className="liquid-glass-card rounded-[22px] p-3.5 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-all border border-white/80 hover:border-blue-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={api.getImageUrl(item.screenshotId)}
                          alt={item.originalFilename}
                          className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#172B4D] truncate">
                            {item.title}
                          </h4>
                          <p className="mt-0.5 text-[11px] text-[#3478F6] font-bold flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{item.dateStr}</span>
                          </p>
                          {item.bookingRef && (
                            <p className="text-[10px] text-slate-400 font-mono">
                              Ref: {item.bookingRef}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleAddToCalendar(item, e)}
                        className="flex h-8.5 items-center gap-1 rounded-full px-3 text-[11px] font-bold liquid-glass-pill text-[#3478F6] hover:bg-blue-50 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
                      >
                        <Calendar className="h-3 w-3 stroke-[2.2]" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Bills & Pending Payments Stream */}
              {(activeTab === 'all' || activeTab === 'bills') && bills.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-1.5 px-1 text-xs font-bold text-slate-600">
                    <CreditCard className="h-3.5 w-3.5 text-rose-500" />
                    <span>Pending Bills & Invoices ({bills.length})</span>
                  </div>

                  {bills.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelectScreenshot(item.screenshotId);
                        onClose();
                      }}
                      className="liquid-glass-card rounded-[22px] p-3.5 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-all border border-white/80 hover:border-rose-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={api.getImageUrl(item.screenshotId)}
                          alt={item.originalFilename}
                          className="h-12 w-12 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#172B4D] truncate">
                            {item.biller}
                          </h4>
                          <p className="mt-0.5 text-xs font-bold text-rose-600">
                            {item.amount}
                          </p>
                          {item.dueDate && (
                            <p className="text-[10px] text-slate-400 font-medium">
                              Due: {item.dueDate}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 shrink-0">
                        <span>View</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
