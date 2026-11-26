import React, { useState, useEffect } from 'react';
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

  const isPro = user?.subscription_tier === 'pro';
  const isBasic = user?.subscription_tier === 'basic';
  const isCurrentTierActive = (selectedTier === 'pro' && isPro) || (selectedTier === 'basic' && isBasic);

  // Hardware Back Button integration (Android & PWA swipe)
  useBackButton(
    'app-subscription-view',
    80,
    () => {
      onClose();
      return true;
    },
    isOpen
  );

  // Prevent background scrolling while subscription view is open
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // Load plans & current subscription state
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setErrorMessage(null);
      setRestoreMessage(null);
      return;
    }

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

  if (!isOpen) return null;

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
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Ensure Razorpay checkout.js script is loaded safely without race conditions
      if (typeof window !== 'undefined' && !(window as any).Razorpay) {
        let loaded = false;
        const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
        if (existingScript) {
          for (let i = 0; i < 20; i++) {
            if ((window as any).Razorpay) {
              loaded = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 100));
          }
        }
        if (!loaded && !(window as any).Razorpay) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve(true);
            script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
            document.head.appendChild(script);
          });
        }
      }

      // 2. Call backend create-order endpoint bound to current user
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
        throw new Error('Could not initialize Razorpay order from server');
      }

      const effectiveKey = orderData.key_id || razorpayKey || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || 'rzp_live_U3ynRYRPdpX5Mq';
      const logoUrl = 'https://recall-pro.vercel.app/favicon.svg';

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: effectiveKey,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Recall',
        description: selectedTier === 'pro'
          ? (isAnnual ? 'Recall Pro (Annual - ₹700/yr)' : 'Recall Pro (Monthly - ₹77/mo)')
          : (isAnnual ? 'Recall Basic (Annual - ₹349/yr)' : 'Recall Basic (Monthly - ₹39/mo)'),
        image: logoUrl,
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
          backdrop_color: 'rgba(15, 23, 42, 0.75)',
        },
        modal: {
          backdropclose: false,
          escape: true,
          handleback: true,
          confirm_close: true,
          ondismiss: () => {
            setIsLoading(false);
            setErrorMessage('Payment cancelled. Your account was not charged.');
          },
        },
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
          }
        },
      };

      const rzpInstance = new (window as any).Razorpay(options);
      rzpInstance.on('payment.failed', (failResp: any) => {
        setIsLoading(false);
        setErrorMessage(failResp?.error?.description || 'Payment was declined or cancelled.');
      });
      rzpInstance.open();
    } catch (err: any) {
      setErrorMessage(err.message || 'Razorpay checkout failed to launch.');
      setIsLoading(false);
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
      <motion.div
        initial={{ opacity: 0, x: '100%' }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-0 z-50 min-h-[100dvh] w-full bg-[#F3F7FC] text-[#172B4D] flex flex-col overflow-y-auto overflow-x-hidden select-none"
        style={{
          touchAction: 'pan-y',
          overscrollBehaviorX: 'none',
          paddingBottom: 'calc(3rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Soft Ambient Refraction Background */}
        <div
          className="fixed inset-0 pointer-events-none -z-10"
          style={{
            background:
              selectedTier === 'pro'
                ? 'radial-gradient(circle at 15% 10%, rgba(245, 158, 11, 0.12) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(52, 120, 246, 0.15) 0%, transparent 50%)'
                : 'radial-gradient(circle at 15% 10%, rgba(52, 120, 246, 0.12) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(185, 217, 255, 0.22) 0%, transparent 50%)',
          }}
        />

        {/* Top iOS Sticky Navigation Bar */}
        <header
          className="sticky top-0 z-30 w-full backdrop-blur-2xl bg-white/85 border-b border-white/90 shadow-[0_4px_20px_-4px_rgba(23,43,77,0.06)]"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
        >
          <div className="max-w-lg mx-auto px-4 h-13 flex items-center justify-between">
            {/* Plump Glass Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="plump-glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#172B4D] active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              <ChevronLeft className="h-4.5 w-4.5 text-[#3478F6] stroke-[2.4]" />
              <span>Back</span>
            </button>

            {/* Title & Tier Badge */}
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

            {/* Restore Button */}
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
        <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-16 space-y-4 flex-1">
          {/* Hero Header */}
          <div className="text-center pt-1 pb-0.5">
            <div className="relative inline-flex items-center justify-center mb-2.5">
              <div
                className={`absolute inset-0 rounded-full blur-2xl animate-pulse ${
                  selectedTier === 'pro' ? 'bg-amber-400/30' : 'bg-[#3478F6]/25'
                }`}
              />
              <div
                className="relative flex h-14 w-14 items-center justify-center rounded-[22px] text-white border border-white/95 shadow-[0_10px_24px_rgba(52,120,246,0.22)]"
                style={{
                  background:
                    selectedTier === 'pro'
                      ? 'linear-gradient(145deg, #F59E0B 0%, #D97706 100%)'
                      : 'linear-gradient(145deg, #5392FF 0%, #3478F6 100%)',
                }}
              >
                {selectedTier === 'pro' ? (
                  <Crown className="h-7 w-7 stroke-[2.2] text-white fill-white/20" />
                ) : (
                  <Zap className="h-7 w-7 stroke-[2.2] text-white fill-white/20" />
                )}
              </div>
            </div>

            <h1 className="font-['Outfit'] text-[23px] font-black tracking-tight text-[#172B4D] leading-tight">
              {isPro
                ? 'You are on Recall Pro'
                : isBasic
                ? 'You are on Recall Basic'
                : 'Choose Your Recall Plan'}
            </h1>
            <p className="mt-1 text-[12.5px] text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
              {initialReason ||
                (isPro
                  ? 'Your Pro subscription is fully active. Enjoy unlimited screenshot search and AI memory.'
                  : isBasic
                  ? 'Your Basic plan is active with 500 screenshots & 25 daily AI searches.'
                  : 'Upgrade from Free to unlock expansive storage and powerful screenshot AI.')}
            </p>
          </div>

          {/* 1. TIER SELECTOR: BASIC vs PRO */}
          <div className="flex justify-center pt-0.5">
            <div className="grid grid-cols-2 gap-1.5 w-full rounded-2xl bg-slate-200/65 p-1 border border-white/90 shadow-inner">
              {/* Basic Tier Tab */}
              <button
                type="button"
                onClick={() => setSelectedTier('basic')}
                className={`flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-150 cursor-pointer ${
                  selectedTier === 'basic'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Zap className={`h-3.5 w-3.5 ${selectedTier === 'basic' ? 'text-blue-600 fill-blue-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-black tracking-tight">Recall Basic</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                  ₹39/mo • 500 Vault
                </span>
              </button>

              {/* Pro Tier Tab */}
              <button
                type="button"
                onClick={() => setSelectedTier('pro')}
                className={`relative flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-150 cursor-pointer ${
                  selectedTier === 'pro'
                    ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md border border-slate-700'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="absolute -top-2 right-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-[8px] font-black uppercase text-white px-1.5 py-0.2 shadow-2xs">
                  Popular
                </span>
                <div className="flex items-center gap-1.5">
                  <Crown className={`h-3.5 w-3.5 ${selectedTier === 'pro' ? 'text-amber-400 fill-amber-300' : 'text-slate-400'}`} />
                  <span className={`text-xs font-black tracking-tight ${selectedTier === 'pro' ? 'text-amber-300' : ''}`}>
                    Recall Pro
                  </span>
                </div>
                <span className={`text-[10px] font-semibold mt-0.5 ${selectedTier === 'pro' ? 'text-slate-300' : 'text-slate-500'}`}>
                  ₹77/mo • Unlimited
                </span>
              </button>
            </div>
          </div>

          {/* 2. BILLING CYCLE SELECTOR: Annual vs Monthly */}
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
                <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-black text-emerald-700">
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
            className={`relative overflow-hidden rounded-[26px] p-5 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.35)] border ${
              selectedTier === 'pro'
                ? 'bg-gradient-to-br from-[#0B132B] via-[#1C2541] to-[#0A1128] text-white border-white/15'
                : 'bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#172554] text-white border-blue-400/30'
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
              <div className="space-y-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-widest block ${
                    selectedTier === 'pro' ? 'text-amber-400' : 'text-blue-300'
                  }`}
                >
                  {isCurrentTierActive
                    ? `Active Membership (${selectedTier.toUpperCase()})`
                    : `Recall ${selectedTier === 'pro' ? 'Pro Plan' : 'Basic Plan'}`}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-['Outfit'] text-[36px] font-black tracking-tight text-white leading-none">
                    ₹{currentPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">
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

              <div className="rounded-full bg-white/12 backdrop-blur-md px-3 py-1 border border-white/20 text-[10.5px] font-bold text-white flex items-center gap-1.5 shadow-sm shrink-0">
                <Lock className="h-3 w-3 text-emerald-400 stroke-[2.4]" />
                <span>Encrypted</span>
              </div>
            </div>

            {/* Storage Progress Gauge for Selected Plan */}
            {subscription && (
              <div className="mt-4 pt-3.5 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
                  <span className="font-medium">Vault Storage Allotment</span>
                  <span className="font-bold text-white">
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

          {/* 4. PRIMARY ACTION BUTTON: PLACED DIRECTLY UNDER THE PLAN CARD */}
          <div className="space-y-2 pt-0.5">
            {isSuccess ? (
              <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>Payment Successful! Recall {selectedTier === 'pro' ? 'Pro' : 'Basic'} Activated.</span>
              </div>
            ) : isCurrentTierActive ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-50 py-3 text-xs font-extrabold text-emerald-800 border border-emerald-200 shadow-xs">
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
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleRazorpayCheckout}
                  disabled={isLoading}
                  className={`plump-liquid-cta w-full cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2 py-3.5 shadow-md ${
                    selectedTier === 'pro'
                      ? 'bg-gradient-to-r from-[#F59E0B] via-[#EAB308] to-[#D97706] text-slate-950 font-black'
                      : ''
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      <span>Opening Secure Razorpay Checkout...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay with Razorpay ({currentPriceFormatted})</span>
                      <ArrowRight className="h-4.5 w-4.5 stroke-[2.4]" />
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-2 text-[10.5px] text-slate-500 font-medium">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>UPI (GPay, PhonePe, Paytm), Cards, NetBanking • Instant activation</span>
                </div>
              </div>
            )}

            {/* Error or Notice messages right next to CTA */}
            {errorMessage && (
              <div className="rounded-[16px] bg-red-50 p-3 text-center text-xs font-bold text-red-600 border border-red-200 flex items-center justify-center gap-2 shadow-xs">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {restoreMessage && (
              <div className="rounded-[16px] bg-blue-50 p-3 text-center text-xs font-bold text-blue-700 border border-blue-200 shadow-xs">
                {restoreMessage}
              </div>
            )}
          </div>

          {/* 5. TIER COMPARISON: What Pro & Basic Give You */}
          <div className="space-y-3 pt-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-600">
                Plan Comparison: Free vs Basic vs Pro
              </h3>
              <span className="text-[10.5px] font-bold text-[#3478F6]">Detailed Breakdown</span>
            </div>

            {/* Comparison Cards Matrix */}
            <div className="rounded-[22px] bg-white/90 border border-white shadow-[0_4px_16px_rgba(23,43,77,0.04)] overflow-hidden divide-y divide-slate-100 text-xs">
              {/* Row 1: Cloud Storage */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Screenshot Cloud Storage</p>
                  <p className="text-[10.5px] text-slate-500">Total screenshots in vault</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-extrabold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Pro: Unlimited
                  </span>
                  <div className="text-[10px] text-slate-500 mt-0.5">Basic: 500 • Free: 50</div>
                </div>
              </div>

              {/* Row 2: AI Queries */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">AI Vision & Conversational Chat</p>
                  <p className="text-[10.5px] text-slate-500">Ask questions across screenshots</p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-extrabold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                    Pro: Unlimited
                  </span>
                  <div className="text-[10px] text-slate-500 mt-0.5">Basic: 25/day • Free: 5/day</div>
                </div>
              </div>

              {/* Row 3: Conversation Stitcher */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Conversation Thread Stitcher</p>
                  <p className="text-[10.5px] text-slate-500">Auto-stitch multi-screenshot chats</p>
                </div>
                <div className="text-right">
                  <span className="text-[10.5px] font-black text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    👑 Pro Exclusive
                  </span>
                </div>
              </div>

              {/* Row 4: Clutter Sweeper */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">1-Tap Memory Broom & Clutter Cleaner</p>
                  <p className="text-[10.5px] text-slate-500">Wipe duplicate & blurry captures</p>
                </div>
                <div className="text-right">
                  <span className="text-[10.5px] font-black text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    👑 Pro Exclusive
                  </span>
                </div>
              </div>

              {/* Row 5: Proactive Vault Digest */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Proactive Vault Digest</p>
                  <p className="text-[10.5px] text-slate-500">Auto-surface expiring coupons, events & bills</p>
                </div>
                <div className="text-right">
                  <span className="text-[10.5px] font-black text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    👑 Pro Exclusive
                  </span>
                </div>
              </div>

              {/* Row 6: Secret Biometric Albums */}
              <div className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Biometric &amp; PIN-Locked Secret Albums</p>
                  <p className="text-[10.5px] text-slate-500">Hardware-level secure visual storage</p>
                </div>
                <div className="text-right">
                  <span className="text-[10.5px] font-black text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    👑 Pro Exclusive
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. WHAT PRO UNLOCKS: Detailed Superpower Cards */}
          <div className="space-y-2.5 pt-2">
            <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 px-1">
              Recall Pro Exclusive Superpowers
            </h3>

            <div className="space-y-2.5">
              {[
                {
                  icon: <Zap className="h-5 w-5 text-amber-500 stroke-[2.2]" />,
                  podBg: 'bg-amber-50 border-amber-200/60',
                  title: 'Unlimited Screenshot Vault Storage',
                  desc: 'Save tens of thousands of screenshots in cloud memory with zero storage caps.',
                },
                {
                  icon: <Eye className="h-5 w-5 text-[#3478F6] stroke-[2.2]" />,
                  podBg: 'bg-blue-50 border-blue-200/60',
                  title: 'Apple Visual Look-Up & Spec Extraction',
                  desc: 'Interactive object pins, currency conversions, tracking numbers and spec cards.',
                },
                {
                  icon: <Layers className="h-5 w-5 text-indigo-500 stroke-[2.2]" />,
                  podBg: 'bg-indigo-50 border-indigo-200/60',
                  title: 'Auto Conversation Thread Stitcher',
                  desc: 'Chronologically stitches WhatsApp, Instagram and Telegram long chats into readable stories.',
                },
                {
                  icon: <Trash2 className="h-5 w-5 text-rose-500 stroke-[2.2]" />,
                  podBg: 'bg-rose-50 border-rose-200/60',
                  title: 'Memory Broom & Clutter Sweeper',
                  desc: 'One-tap AI cleanup for duplicate screenshots, accidental memes, and expired deals.',
                },
                {
                  icon: <FileSpreadsheet className="h-5 w-5 text-emerald-600 stroke-[2.2]" />,
                  podBg: 'bg-emerald-50 border-emerald-200/60',
                  title: 'Proactive Vault Digest & Calendar Sync',
                  desc: 'Finds upcoming tickets, bills, and discount codes and syncs them to Google Calendar.',
                },
              ].map((perk, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-[20px] bg-white/85 p-3 border border-white shadow-[0_4px_14px_rgba(23,43,77,0.03)]"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border ${perk.podBg} shadow-2xs`}>
                    {perk.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-bold text-[#172B4D] leading-tight truncate">{perk.title}</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5 font-normal line-clamp-2">{perk.desc}</p>
                  </div>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </div>
                </div>
              ))}
            </div>
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
    </AnimatePresence>
  );
};
