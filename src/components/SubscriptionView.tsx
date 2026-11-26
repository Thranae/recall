import React, { useState, useEffect, useRef } from 'react';
import { lockBodyScroll } from '../utils/scrollLock';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Crown,
  Zap,
  ShieldCheck,
  ArrowRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  Lock,
  Check,
  Eye,
  Layers,
  Trash2,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useBackButton } from '../utils/backHandler';
import type { User, SubscriptionInfo, SubscriptionPlan } from '../types';

interface SubscriptionViewProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSubscriptionUpdated: (updatedUser: User) => void;
  initialReason?: string;
}

// Zero-latency helper to ensure Razorpay checkout script is loaded without delay
const ensureRazorpayLoaded = (): Promise<boolean> => {
  if (typeof window !== 'undefined' && (window as any).Razorpay) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(false);
    const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existing) {
      if ((window as any).Razorpay) return resolve(true);
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      setTimeout(() => resolve(Boolean((window as any).Razorpay)), 500);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
};

interface ComparisonRow {
  name: string;
  hint: string;
  basic: string;
  basicType: 'value' | 'check' | 'cross';
  pro: string;
  proType: 'value' | 'check';
}

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    name: 'Vault Storage',
    hint: 'Total screenshot capacity',
    basic: '500',
    basicType: 'value',
    pro: 'Unlimited',
    proType: 'value',
  },
  {
    name: 'AI Visual Search',
    hint: 'Ask questions across screenshots',
    basic: '25 / day',
    basicType: 'value',
    pro: 'Unlimited',
    proType: 'value',
  },
  {
    name: 'High-Res OCR Engine',
    hint: 'Instant text & code extraction',
    basic: 'Included',
    basicType: 'check',
    pro: 'Included',
    proType: 'check',
  },
  {
    name: 'Conversation Stitcher',
    hint: 'Stitch multi-screenshot chats',
    basic: '—',
    basicType: 'cross',
    pro: 'Included',
    proType: 'check',
  },
  {
    name: 'Memory Broom Cleaner',
    hint: 'Wipe duplicate & blurry captures',
    basic: '—',
    basicType: 'cross',
    pro: 'Included',
    proType: 'check',
  },
  {
    name: 'Proactive Calendar Sync',
    hint: 'Surface bills, tickets & events',
    basic: '—',
    basicType: 'cross',
    pro: 'Included',
    proType: 'check',
  },
  {
    name: 'Biometric Secret Vault',
    hint: 'PIN & FaceID protected albums',
    basic: '—',
    basicType: 'cross',
    pro: 'Included',
    proType: 'check',
  },
  {
    name: 'Cloud Backup & Sync',
    hint: 'Encrypted multi-device sync',
    basic: 'Included',
    basicType: 'check',
    pro: 'Included',
    proType: 'check',
  },
];

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  isOpen,
  onClose,
  user,
  onSubscriptionUpdated,
  initialReason,
}) => {
  const [selectedTier, setSelectedTier] = useState<'basic' | 'pro'>('pro');
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string | null>(null);
  const isOpeningCheckoutRef = useRef(false);

  const isPro = user?.subscription_tier === 'pro';
  const isBasic = user?.subscription_tier === 'basic';
  const isCurrentTierActive = (selectedTier === 'pro' && isPro) || (selectedTier === 'basic' && isBasic);

  // Hardware Back Button integration
  useBackButton(
    'app-subscription-view',
    80,
    () => {
      onClose();
      return true;
    },
    isOpen
  );

  // Lock background scroll while view is open
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // Pre-warm plans & Razorpay SDK as soon as view is opened
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setErrorMessage(null);
      setRestoreMessage(null);
      isOpeningCheckoutRef.current = false;
      return;
    }

    ensureRazorpayLoaded();

    api.getSubscriptionPlans()
      .then((res) => {
        if (res.razorpay_key_id) setRazorpayKey(res.razorpay_key_id);
      })
      .catch(() => {});

    api.getSubscription()
      .then((res) => {
        setSubscription(res.subscription);
      })
      .catch(() => {});
  }, [isOpen]);

  const isAnnual = billingCycle === 'annual';
  const currentPrice = selectedTier === 'pro'
    ? (isAnnual ? 700 : 77)
    : (isAnnual ? 349 : 39);

  const currentPriceFormatted = selectedTier === 'pro'
    ? (isAnnual ? '₹700 / year' : '₹77 / month')
    : (isAnnual ? '₹349 / year' : '₹39 / month');

  const amountInPaise = selectedTier === 'pro'
    ? (isAnnual ? 70000 : 7700)
    : (isAnnual ? 34900 : 3900);

  const planToSet: SubscriptionPlan = selectedTier === 'pro'
    ? (isAnnual ? 'pro_annual' : 'pro_monthly')
    : (isAnnual ? 'basic_annual' : 'basic_monthly');

  const handleRazorpayCheckout = async () => {
    if (isLoading || isOpeningCheckoutRef.current) return;
    isOpeningCheckoutRef.current = true;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const isSdkReady = await ensureRazorpayLoaded();
      if (!isSdkReady && !(window as any).Razorpay) {
        throw new Error('Unable to connect to Razorpay secure checkout. Please check your internet connection.');
      }

      const orderData = await api.createRazorpayOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        plan: planToSet,
        user_id: user?.id,
        email: user?.email,
        name: user?.name,
      });

      if (!orderData || !orderData.order_id) {
        throw new Error('Could not initialize checkout order from server.');
      }

      const effectiveKey = orderData.key_id || razorpayKey || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_live_U3ynRYRPdpX5Mq';

      const options = {
        key: effectiveKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'RECALL',
        description: selectedTier === 'pro'
          ? (isAnnual ? 'Recall Pro (Annual - ₹700/yr)' : 'Recall Pro (Monthly - ₹77/mo)')
          : (isAnnual ? 'Recall Basic (Annual - ₹349/yr)' : 'Recall Basic (Monthly - ₹39/mo)'),
        image: `${window.location.origin}/favicon.svg`,
        order_id: orderData.order_id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        notes: {
          user_id: user?.id || '',
          plan: planToSet,
          tier: selectedTier,
        },
        theme: {
          color: '#3478F6',
          hide_topbar: false,
        },
        modal: {
          backdropclose: false,
          escape: true,
          handleback: true,
          confirm_close: true,
          animation: true,
          ondismiss: () => {
            setIsLoading(false);
            isOpeningCheckoutRef.current = false;
            setErrorMessage('Payment cancelled. Your account was not charged.');
          },
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI (Instant & 0% Fee)',
                instruments: [
                  {
                    method: 'upi',
                    flows: ['intent', 'qr', 'collect'],
                    apps: ['google_pay', 'phonepe', 'paytm', 'bhim', 'cred'],
                  },
                ],
              },
              other: {
                name: 'Cards, NetBanking & Wallets',
                instruments: [
                  { method: 'card' },
                  { method: 'netbanking' },
                  { method: 'wallet' },
                ],
              },
            },
            sequence: ['block.upi', 'block.other'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
        retry: {
          enabled: true,
          max_count: 2,
        },
        timeout: 300,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setIsLoading(true);
            const verifyRes = await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planToSet,
              user_id: user?.id,
              email: user?.email,
            });

            if (verifyRes.success) {
              setIsSuccess(true);
              if (verifyRes.user) {
                onSubscriptionUpdated(verifyRes.user);
              }
              const freshUser = await api.getCurrentUser();
              if (freshUser) onSubscriptionUpdated(freshUser);
              const freshSub = await api.getSubscription();
              if (freshSub) setSubscription(freshSub.subscription);

              setTimeout(() => {
                setIsSuccess(false);
                onClose();
              }, 2000);
            } else {
              setErrorMessage(verifyRes.message || 'Payment signature verification failed.');
            }
          } catch (verifyErr: any) {
            setErrorMessage(verifyErr.message || 'Payment verification failed.');
          } finally {
            setIsLoading(false);
            isOpeningCheckoutRef.current = false;
          }
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.on('payment.failed', (failResp: any) => {
        setIsLoading(false);
        isOpeningCheckoutRef.current = false;
        setErrorMessage(failResp?.error?.description || 'Payment was declined or cancelled.');
      });

      rzpInstance.open();
    } catch (err: any) {
      setErrorMessage(err.message || 'Razorpay checkout failed to launch.');
      setIsLoading(false);
      isOpeningCheckoutRef.current = false;
    }
  };

  const handleCancelSubscription = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.cancelAutopay();
      onSubscriptionUpdated(res.user);
      setSubscription((prev) => (prev ? { ...prev, tier: 'free', status: 'canceled', is_pro: false, is_basic: false } : null));
      setRestoreMessage('Your subscription has been canceled and reverted to Free tier.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel subscription.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (isRestoring) return;
    setIsRestoring(true);
    setRestoreMessage(null);
    try {
      const res = await api.restoreSubscription();
      setRestoreMessage(res.message);
      if (res.user) {
        onSubscriptionUpdated(res.user);
      }
      if (res.tier === 'pro' || res.tier === 'basic') {
        const freshUser = await api.getCurrentUser();
        if (freshUser) onSubscriptionUpdated(freshUser);
        const freshSub = await api.getSubscription();
        if (freshSub) setSubscription(freshSub.subscription);
      }
    } catch (err: any) {
      setRestoreMessage(err.message || 'Failed to restore purchases.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="recall-subscription-modal"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 min-h-[100dvh] w-full bg-[#F3F7FC] text-[#172B4D] flex flex-col overflow-y-auto overflow-x-hidden select-none"
          style={{
            touchAction: 'pan-y',
            overscrollBehaviorX: 'none',
            paddingBottom: 'calc(3rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Subtle Ambient Refraction Background */}
          <div
            className="fixed inset-0 pointer-events-none -z-10 transition-colors duration-500"
            style={{
              background:
                selectedTier === 'pro'
                  ? 'radial-gradient(circle at 20% 10%, rgba(245, 158, 11, 0.10) 0%, transparent 45%), radial-gradient(circle at 80% 85%, rgba(52, 120, 246, 0.08) 0%, transparent 50%)'
                  : 'radial-gradient(circle at 20% 10%, rgba(52, 120, 246, 0.12) 0%, transparent 45%), radial-gradient(circle at 80% 85%, rgba(185, 217, 255, 0.20) 0%, transparent 50%)',
            }}
          />

          {/* Sticky iOS Navigation Header */}
          <header
            className="sticky top-0 z-30 w-full backdrop-blur-2xl bg-white/85 border-b border-white/90 shadow-[0_4px_20px_-4px_rgba(23,43,77,0.06)]"
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
          >
            <div className="max-w-lg mx-auto px-4 h-13 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="plump-glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#172B4D] active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                <ChevronLeft className="h-4.5 w-4.5 text-[#3478F6] stroke-[2.4]" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="font-['Outfit'] text-[15.5px] font-extrabold tracking-tight text-[#172B4D]">
                  Subscription Plans
                </span>
                {isPro ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-400/20 text-amber-800 px-2 py-0.5 text-[9.5px] font-black border border-amber-400/40">
                    <Crown className="h-2.5 w-2.5 text-amber-600 fill-amber-500" />
                    <span>PRO</span>
                  </span>
                ) : isBasic ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 text-blue-700 px-2 py-0.5 text-[9.5px] font-black border border-blue-400/30">
                    <Zap className="h-2.5 w-2.5 text-blue-600 fill-blue-500" />
                    <span>BASIC</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-200/70 text-slate-600 px-2 py-0.5 text-[9.5px] font-bold">
                    FREE TIER
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleRestore}
                disabled={isRestoring}
                className="plump-glass-pill flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-600 hover:text-slate-900 active:scale-95 transition-all cursor-pointer shadow-xs"
              >
                {isRestoring ? (
                  <RefreshCw className="h-3 w-3 animate-spin text-[#3478F6]" />
                ) : (
                  <span>Restore</span>
                )}
              </button>
            </div>
          </header>

          {/* Main Content Body */}
          <main className="w-full max-w-lg mx-auto px-4 pt-3 pb-16 space-y-4 flex-1">
            {/* Hero Header */}
            <div className="text-center pt-1 pb-0.5">
              <div className="relative inline-flex items-center justify-center mb-2.5">
                <div
                  className="relative flex h-13 w-13 items-center justify-center rounded-[20px] text-white border border-white/95 shadow-[0_10px_24px_rgba(52,120,246,0.22)] transition-all duration-300"
                  style={{
                    background:
                      selectedTier === 'pro'
                        ? 'linear-gradient(145deg, #F59E0B 0%, #D97706 100%)'
                        : 'linear-gradient(145deg, #5392FF 0%, #3478F6 100%)',
                  }}
                >
                  {selectedTier === 'pro' ? (
                    <Crown className="h-6.5 w-6.5 stroke-[2.2] text-white fill-white/20" />
                  ) : (
                    <Zap className="h-6.5 w-6.5 stroke-[2.2] text-white fill-white/20" />
                  )}
                </div>
              </div>

              <h1 className="font-['Outfit'] text-[22px] font-black tracking-tight text-[#172B4D] leading-tight">
                {isPro
                  ? 'You are on Recall Pro'
                  : isBasic
                  ? 'You are on Recall Basic'
                  : 'Upgrade Your Visual Memory'}
              </h1>
              <p className="mt-1 text-[12.5px] text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                {initialReason ||
                  (isPro
                    ? 'Your Pro membership is active. Enjoy unlimited screenshots & conversational AI.'
                    : isBasic
                    ? 'Your Basic plan is active with 500 vault slots & daily AI visual search.'
                    : 'Choose the plan that fits your vault. Upgrade or cancel anytime.')}
              </p>
            </div>

            {/* 1. TIER SWITCHER (Basic vs Pro) */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              {/* Basic Option */}
              <button
                type="button"
                onClick={() => setSelectedTier('basic')}
                className={`relative flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer text-left border ${
                  selectedTier === 'basic'
                    ? 'bg-white text-slate-900 border-[#3478F6] shadow-[0_4px_16px_rgba(52,120,246,0.14)] ring-2 ring-[#3478F6]/20'
                    : 'bg-white/70 text-slate-500 border-slate-200/80 hover:bg-white hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 w-full justify-center">
                  <Zap className={`h-3.5 w-3.5 shrink-0 ${selectedTier === 'basic' ? 'text-[#3478F6] fill-[#3478F6]' : 'text-slate-400'}`} />
                  <span className="text-xs font-black tracking-tight">Recall Basic</span>
                </div>
                <div className="mt-1 text-center">
                  <span className="text-xs font-extrabold text-slate-800 tabular-nums">
                    {isAnnual ? '₹29' : '₹39'}
                    <span className="text-[10px] font-normal text-slate-500">/mo</span>
                  </span>
                  <span className="block text-[9.5px] font-semibold text-slate-400 mt-0.5">
                    500 Vault Storage
                  </span>
                </div>
              </button>

              {/* Pro Option */}
              <button
                type="button"
                onClick={() => setSelectedTier('pro')}
                className={`relative flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer text-left border ${
                  selectedTier === 'pro'
                    ? 'bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0A1128] text-white border-amber-400/50 shadow-[0_6px_20px_rgba(245,158,11,0.20)] ring-2 ring-amber-400/30'
                    : 'bg-white/70 text-slate-500 border-slate-200/80 hover:bg-white hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 w-full justify-center">
                  <Crown className={`h-3.5 w-3.5 shrink-0 ${selectedTier === 'pro' ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                  <span className={`text-xs font-black tracking-tight ${selectedTier === 'pro' ? 'text-amber-300' : ''}`}>
                    Recall Pro
                  </span>
                  <span className="rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-[8px] font-black uppercase text-white px-1.5 py-0.2 shrink-0">
                    Popular
                  </span>
                </div>
                <div className="mt-1 text-center">
                  <span className={`text-xs font-extrabold tabular-nums ${selectedTier === 'pro' ? 'text-white' : 'text-slate-800'}`}>
                    {isAnnual ? '₹58' : '₹77'}
                    <span className={`text-[10px] font-normal ${selectedTier === 'pro' ? 'text-slate-300' : 'text-slate-500'}`}>/mo</span>
                  </span>
                  <span className={`block text-[9.5px] font-semibold mt-0.5 ${selectedTier === 'pro' ? 'text-amber-200/80' : 'text-slate-400'}`}>
                    Unlimited Vault
                  </span>
                </div>
              </button>
            </div>

            {/* 2. BILLING CYCLE SELECTOR (Annual vs Monthly) */}
            <div className="flex justify-center">
              <div className="relative flex w-full max-w-xs rounded-full bg-slate-200/60 p-1 border border-white/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-extrabold transition-all duration-150 cursor-pointer ${
                    billingCycle === 'annual'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>Annual Pass</span>
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">
                    {selectedTier === 'pro' ? 'Save 24%' : 'Save 25%'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`relative z-10 flex-1 flex items-center justify-center py-1.5 rounded-full text-xs font-extrabold transition-all duration-150 cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* 3. ACTIVE PLAN CARD */}
            <div
              className={`relative overflow-hidden rounded-[24px] p-5 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.35)] border transition-all duration-300 ${
                selectedTier === 'pro'
                  ? 'bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0A1128] text-white border-white/15'
                  : 'bg-gradient-to-br from-[#0E1E38] via-[#1E3A8A] to-[#172554] text-white border-blue-400/30'
              }`}
            >
              <div
                className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                style={{
                  background:
                    selectedTier === 'pro'
                      ? 'linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.6) 50%, transparent 100%)'
                      : 'linear-gradient(90deg, transparent 0%, rgba(96,165,250,0.6) 50%, transparent 100%)',
                }}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest block ${
                      selectedTier === 'pro' ? 'text-amber-400' : 'text-blue-300'
                    }`}
                  >
                    {isCurrentTierActive
                      ? `Active Membership (${selectedTier.toUpperCase()})`
                      : `Recall ${selectedTier === 'pro' ? 'Pro Membership' : 'Basic Membership'}`}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-['Outfit'] text-[34px] font-black tracking-tight text-white leading-none tabular-nums">
                      ₹{currentPrice.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-300 font-semibold tabular-nums">
                      {billingCycle === 'annual'
                        ? selectedTier === 'pro'
                          ? '/ year (~₹58/mo)'
                          : '/ year (~₹29/mo)'
                        : '/ month'}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-300 font-medium leading-normal pt-0.5">
                    {billingCycle === 'annual'
                      ? `Billed annually at ₹${currentPrice}. Includes 7-day risk-free access.`
                      : `Billed monthly at ₹${currentPrice}. Cancel anytime with 1 tap.`}
                  </p>
                </div>

                <div className="rounded-full bg-white/12 backdrop-blur-md px-2.5 py-1 border border-white/20 text-[10px] font-bold text-white flex items-center gap-1.5 shadow-sm shrink-0">
                  <Lock className="h-3 w-3 text-emerald-400 stroke-[2.4]" />
                  <span>Secure</span>
                </div>
              </div>

              {/* Storage Progress Gauge */}
              {subscription && (
                <div className="mt-4 pt-3.5 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                    <span className="font-medium">Vault Storage Allotment</span>
                    <span className="font-bold text-white tabular-nums">
                      {selectedTier === 'pro'
                        ? `${subscription.screenshot_count} screenshots (Unlimited Vault)`
                        : `${subscription.screenshot_count} / 500 screenshots`}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden p-[1px] border border-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        selectedTier === 'pro'
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-300 w-full'
                          : 'bg-gradient-to-r from-[#5392FF] to-[#3478F6]'
                      }`}
                      style={{
                        width:
                          selectedTier === 'pro'
                            ? '100%'
                            : `${Math.min(100, (subscription.screenshot_count / 500) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. PRIMARY ACTION BUTTON */}
            <div className="space-y-2 pt-0.5">
              {isSuccess ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 className="h-4.5 w-4.5" />
                  <span>Payment Successful! Recall {selectedTier === 'pro' ? 'Pro' : 'Basic'} Activated.</span>
                </div>
              ) : isCurrentTierActive ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-3 text-xs font-extrabold text-emerald-800 border border-emerald-200 shadow-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Recall {selectedTier.toUpperCase()} is Active on your Account</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelSubscription}
                    disabled={isLoading}
                    className="w-full text-center text-xs font-bold text-slate-400 hover:text-red-600 py-1 transition-colors cursor-pointer"
                  >
                    {isLoading ? 'Cancelling...' : 'Cancel Subscription (Revert to Free)'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleRazorpayCheckout}
                    disabled={isLoading}
                    className={`w-full py-3.5 px-4 rounded-2xl cursor-pointer active:scale-[0.985] transition-all flex items-center justify-center gap-2 text-sm font-black shadow-lg ${
                      selectedTier === 'pro'
                        ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-amber-500/25 hover:brightness-105'
                        : 'bg-gradient-to-r from-[#3478F6] to-[#2563EB] text-white shadow-blue-500/25 hover:brightness-105'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        <span>Opening Secure Razorpay Checkout...</span>
                      </>
                    ) : (
                      <>
                        <span className="tabular-nums">Pay with Razorpay ({currentPriceFormatted})</span>
                        <ArrowRight className="h-4.5 w-4.5 stroke-[2.4]" />
                      </>
                    )}
                  </button>

                  {/* Payment Methods & Guarantee */}
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-600 font-semibold">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Instant UPI (GPay, PhonePe, Paytm), Cards & NetBanking</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
                      <span>• 7-Day Money Back Guarantee</span>
                      <span>• 256-Bit SSL Secured</span>
                      <span>• 1-Tap Cancel</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Error & Status Banners */}
              {errorMessage && (
                <div className="rounded-2xl bg-red-50 p-3 text-center text-xs font-bold text-red-600 border border-red-200 flex items-center justify-center gap-2 shadow-xs">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {restoreMessage && (
                <div className="rounded-2xl bg-blue-50 p-3 text-center text-xs font-bold text-blue-700 border border-blue-200 shadow-xs">
                  {restoreMessage}
                </div>
              )}
            </div>

            {/* 5. SIDE-BY-SIDE TIER COMPARISON MATRIX (Apple & Linear Grade) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <h3 className="text-xs font-black tracking-wider uppercase text-slate-700">
                    Plan Comparison: Basic vs Pro
                  </h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  Tap tier to select
                </span>
              </div>

              <div className="rounded-[22px] bg-white border border-slate-200/80 shadow-[0_4px_16px_rgba(23,43,77,0.04)] overflow-hidden">
                {/* Clean Column Headers */}
                <div className="grid grid-cols-12 bg-slate-50/90 px-3.5 py-2.5 border-b border-slate-100 text-[11px] font-bold text-slate-500">
                  <div className="col-span-6 flex items-center">
                    <span>Feature</span>
                  </div>
                  <div
                    onClick={() => setSelectedTier('basic')}
                    className={`col-span-3 text-center cursor-pointer transition-all py-1 px-1 rounded-xl ${
                      selectedTier === 'basic'
                        ? 'bg-blue-100/70 text-blue-800 font-extrabold ring-1 ring-blue-300'
                        : 'hover:text-slate-800'
                    }`}
                  >
                    <span className="block leading-tight">Basic</span>
                    <span className="block text-[9px] font-semibold text-slate-400 tabular-nums">
                      {billingCycle === 'annual' ? '₹29/mo' : '₹39/mo'}
                    </span>
                  </div>
                  <div
                    onClick={() => setSelectedTier('pro')}
                    className={`col-span-3 text-center cursor-pointer transition-all py-1 px-1 rounded-xl ${
                      selectedTier === 'pro'
                        ? 'bg-amber-100/70 text-amber-900 font-extrabold ring-1 ring-amber-300'
                        : 'hover:text-slate-800'
                    }`}
                  >
                    <span className="inline-flex items-center gap-0.5 leading-tight">
                      <Crown className="h-2.5 w-2.5 text-amber-600 fill-amber-500" />
                      <span>Pro</span>
                    </span>
                    <span className="block text-[9px] font-semibold text-slate-400 tabular-nums">
                      {billingCycle === 'annual' ? '₹58/mo' : '₹77/mo'}
                    </span>
                  </div>
                </div>

                {/* Structured Feature Rows */}
                <div className="divide-y divide-slate-100/90">
                  {COMPARISON_ROWS.map((row, idx) => (
                    <div
                      key={idx}
                      className={`grid grid-cols-12 px-3.5 py-2.5 items-center transition-colors ${
                        idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      }`}
                    >
                      <div className="col-span-6 min-w-0 pr-2">
                        <p className="font-bold text-slate-800 text-[11.5px] leading-tight truncate">
                          {row.name}
                        </p>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                          {row.hint}
                        </p>
                      </div>

                      {/* Basic Column */}
                      <div
                        className={`col-span-3 text-center flex items-center justify-center ${
                          selectedTier === 'basic' ? 'bg-blue-50/40 py-1 rounded-lg' : ''
                        }`}
                      >
                        {row.basicType === 'check' ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                            <Check className="h-3 w-3 stroke-[2.8]" />
                          </div>
                        ) : row.basicType === 'cross' ? (
                          <span className="text-slate-300 font-bold text-sm leading-none select-none">—</span>
                        ) : (
                          <span className="tabular-nums px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                            {row.basic}
                          </span>
                        )}
                      </div>

                      {/* Pro Column */}
                      <div
                        className={`col-span-3 text-center flex items-center justify-center ${
                          selectedTier === 'pro' ? 'bg-amber-50/50 py-1 rounded-lg' : ''
                        }`}
                      >
                        {row.proType === 'check' ? (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 border border-amber-400/40">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        ) : (
                          <span className="tabular-nums px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 to-yellow-400/15 text-amber-800 border border-amber-400/40 font-black text-[10px]">
                            {row.pro}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtle Table Footer */}
                <div className="bg-slate-50/80 px-3.5 py-2 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-400">
                  <span>Free plan includes 50 vault items &amp; 5 AI searches/day</span>
                  <span className="font-bold text-[#3478F6]">Zero Risk</span>
                </div>
              </div>
            </div>

            {/* 6. DYNAMIC TIER HIGHLIGHTS (Clean & Concise Apple-Style Cards) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-black tracking-wider uppercase text-slate-600">
                  {selectedTier === 'pro'
                    ? 'Included with Recall Pro'
                    : 'Included with Recall Basic'}
                </h3>
                <span className="text-[10px] font-semibold text-slate-400">
                  {selectedTier === 'pro' ? '5 Superpowers' : 'Core Essentials'}
                </span>
              </div>

              {selectedTier === 'pro' ? (
                <div className="space-y-2">
                  {[
                    {
                      icon: <Zap className="h-4 w-4 text-amber-600 stroke-[2.4]" />,
                      podBg: 'bg-amber-50 border-amber-200/70',
                      title: 'Unlimited Screenshot Vault Storage',
                      desc: 'Store tens of thousands of screenshots in cloud memory with zero limits.',
                    },
                    {
                      icon: <Eye className="h-4 w-4 text-[#3478F6] stroke-[2.4]" />,
                      podBg: 'bg-blue-50 border-blue-200/70',
                      title: 'Conversational AI Visual Memory',
                      desc: 'Ask questions, find objects, convert currencies and search specs across all captures.',
                    },
                    {
                      icon: <Layers className="h-4 w-4 text-indigo-600 stroke-[2.4]" />,
                      podBg: 'bg-indigo-50 border-indigo-200/70',
                      title: 'Auto Conversation Thread Stitcher',
                      desc: 'Chronologically stitches WhatsApp, IG & Telegram screenshots into continuous chats.',
                    },
                    {
                      icon: <Trash2 className="h-4 w-4 text-rose-600 stroke-[2.4]" />,
                      podBg: 'bg-rose-50 border-rose-200/70',
                      title: 'Memory Broom & Clutter Cleaner',
                      desc: 'One-tap AI purge for duplicate screenshots, accidental memes, and expired deals.',
                    },
                    {
                      icon: <FileSpreadsheet className="h-4 w-4 text-emerald-600 stroke-[2.4]" />,
                      podBg: 'bg-emerald-50 border-emerald-200/70',
                      title: 'Proactive Calendar Sync & Secret Vault',
                      desc: 'Sync bills & tickets to Google Calendar, plus biometric & PIN-locked albums.',
                    },
                  ].map((perk, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-2xl bg-white/90 p-3 border border-white shadow-[0_2px_8px_rgba(23,43,77,0.03)]"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${perk.podBg} shadow-2xs`}>
                        {perk.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#172B4D] leading-tight truncate">{perk.title}</p>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5 font-normal truncate">{perk.desc}</p>
                      </div>
                      <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    {
                      icon: <Zap className="h-4 w-4 text-[#3478F6] stroke-[2.4]" />,
                      podBg: 'bg-blue-50 border-blue-200/70',
                      title: '500 Vault Storage Capacity',
                      desc: '10x more storage than the free tier for your essential screenshots.',
                    },
                    {
                      icon: <Eye className="h-4 w-4 text-indigo-600 stroke-[2.4]" />,
                      podBg: 'bg-indigo-50 border-indigo-200/70',
                      title: '25 Daily AI Visual Searches',
                      desc: 'Fast AI queries across receipts, handwritten notes, and documents.',
                    },
                    {
                      icon: <FileSpreadsheet className="h-4 w-4 text-emerald-600 stroke-[2.4]" />,
                      podBg: 'bg-emerald-50 border-emerald-200/70',
                      title: 'High-Resolution OCR Text Engine',
                      desc: 'Instant text, number, and tracking code extraction from any capture.',
                    },
                    {
                      icon: <ShieldCheck className="h-4 w-4 text-blue-600 stroke-[2.4]" />,
                      podBg: 'bg-blue-50 border-blue-200/70',
                      title: 'Encrypted Multi-Device Cloud Sync',
                      desc: 'Automatic backup with safe cloud sync across all your phones & devices.',
                    },
                  ].map((perk, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-2xl bg-white/90 p-3 border border-white shadow-[0_2px_8px_rgba(23,43,77,0.03)]"
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${perk.podBg} shadow-2xs`}>
                        {perk.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#172B4D] leading-tight truncate">{perk.title}</p>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5 font-normal truncate">{perk.desc}</p>
                      </div>
                      <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </div>
                    </div>
                  ))}

                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-blue-900 font-medium">
                      Need unlimited vault &amp; auto conversation stitcher?
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTier('pro')}
                      className="text-xs font-black text-[#3478F6] hover:underline cursor-pointer shrink-0 ml-2"
                    >
                      Switch to Pro →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Restore & Guarantee */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400 px-2 font-medium">
              <button
                type="button"
                onClick={handleRestore}
                disabled={isRestoring}
                className="hover:text-slate-700 underline flex items-center gap-1 cursor-pointer transition-colors"
              >
                {isRestoring && <RefreshCw className="h-3 w-3 animate-spin" />}
                <span>Restore Purchases</span>
              </button>
              <span>Cancel anytime with 1 tap</span>
            </div>
          </main>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
