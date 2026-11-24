import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  Crown,
  Zap,
  Infinity as InfinityIcon,
  ShieldCheck,
  ArrowRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  ShieldAlert,
  CreditCard,
  Smartphone,
  Lock,
  Cpu,
  Check,
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
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
  const [autopayMethod, setAutopayMethod] = useState<'upi_autopay' | 'card_mandate'>('upi_autopay');
  const [upiId, setUpiId] = useState('');
  const [cardLast4, setCardLast4] = useState('4242');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string | null>(null);

  const isPro = user?.subscription_tier === 'pro';
  const isTrialing = subscription?.is_trialing || user?.subscription_status === 'trialing';

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
    const origHtml = document.documentElement.style.overflow;
    const origBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = origHtml;
      document.body.style.overflow = origBody;
    };
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
        if (res.subscription.autopay_vpa) {
          setUpiId(res.subscription.autopay_vpa);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate 7-day trial date
  const trialEndFormatted = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  })();

  const handleStartTrial = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    const planToSet: SubscriptionPlan = billingCycle === 'annual' ? 'pro_annual' : 'pro_monthly';

    if (autopayMethod === 'upi_autopay') {
      const cleanVpa = upiId.trim().toLowerCase();
      if (!cleanVpa || !cleanVpa.includes('@')) {
        setErrorMessage('Please enter a valid UPI ID (e.g. name@okhdfcbank or mobile@paytm)');
        setIsLoading(false);
        return;
      }
    }

    try {
      // Razorpay Checkout loader if gateway keys are present
      if (razorpayKey && typeof window !== 'undefined') {
        const loadScript = () => {
          return new Promise((resolve) => {
            if ((window as any).Razorpay) return resolve(true);
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };
        await loadScript();
      }

      const res = await api.startFreeTrial({
        plan: planToSet,
        autopay_method: autopayMethod,
        vpa: upiId.trim(),
        bank_name: bankName,
        card_last4: cardLast4,
      });

      setIsSuccess(true);
      onSubscriptionUpdated(res.user);
      setSubscription(res.subscription);

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Autopay setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelAutopay = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.cancelAutopay();
      onSubscriptionUpdated(res.user);
      setSubscription((prev) => (prev ? { ...prev, status: 'canceled', next_billing_at: null, autopay_mandate_id: null } : null));
      setRestoreMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel Autopay mandate.');
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
      if (res.tier === 'pro') {
        const freshUser = await api.getCurrentUser();
        if (freshUser) onSubscriptionUpdated(freshUser);
      }
    } catch (err: any) {
      setRestoreMessage(err.message || 'Failed to restore purchases.');
    } finally {
      setIsRestoring(false);
    }
  };

  const currentPrice = billingCycle === 'annual' ? 1499 : 199;

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
          paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Soft Ambient Refraction Background */}
        <div
          className="fixed inset-0 pointer-events-none -z-10"
          style={{
            background:
              'radial-gradient(circle at 15% 10%, rgba(52, 120, 246, 0.09) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(185, 217, 255, 0.25) 0%, transparent 50%)',
          }}
        />

        {/* Top iOS Sticky Navigation Bar */}
        <header
          className="sticky top-0 z-30 w-full backdrop-blur-2xl bg-white/80 border-b border-white/80 shadow-[0_4px_20px_-4px_rgba(23,43,77,0.06)]"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
        >
          <div className="max-w-lg mx-auto px-4 h-13.5 flex items-center justify-between">
            {/* Plump Liquid Glass Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="plump-glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-[#172B4D] active:scale-95 transition-all cursor-pointer shadow-xs"
            >
              <ChevronLeft className="h-4.5 w-4.5 text-[#3478F6] stroke-[2.4]" />
              <span>Back</span>
            </button>

            {/* Title */}
            <div className="flex items-center gap-1.5">
              <span className="font-['Outfit'] text-[15.5px] font-extrabold tracking-tight text-[#172B4D]">
                Membership & Perks
              </span>
              {isPro && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 text-amber-700 px-2 py-0.5 text-[9.5px] font-black border border-amber-400/30">
                  PRO
                </span>
              )}
            </div>

            {/* Plump Liquid Glass Restore Button */}
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

        {/* Dedicated Page Body Content (Spacious & Uncongested) */}
        <main className="w-full max-w-lg mx-auto px-4 pt-5 pb-16 space-y-5 flex-1 overflow-x-hidden">
          {/* 1. Hero Plan Status Banner */}
          <div className="text-center pt-2 pb-2">
            <div className="relative inline-flex items-center justify-center mb-3.5">
              <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-2xl animate-pulse" />
              <div
                className="relative flex h-18 w-18 items-center justify-center rounded-[26px] text-white border border-white/90 shadow-[0_12px_32px_rgba(245,158,11,0.32)]"
                style={{
                  background: 'linear-gradient(145deg, #F59E0B 0%, #D97706 100%)',
                  boxShadow: 'inset 0 2px 2.5px rgba(255,255,255,0.8), 0 12px 28px rgba(217,119,6,0.3)',
                }}
              >
                <Crown className="h-9 w-9 stroke-[2.2] text-amber-50" />
              </div>
            </div>

            {/* Plump Status Capsule */}
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-4 py-1.5 border border-emerald-500/25 mb-3 backdrop-blur-md shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 stroke-[2.4]" />
                <span className="text-xs font-black tracking-wide text-emerald-800">
                  {isTrialing
                    ? `${subscription?.days_left_in_trial || 7} Days Left in Free Trial • ₹0 Today`
                    : isPro
                    ? 'Recall Pro Active'
                    : '7-Day Free Trial • ₹0 Due Today'}
                </span>
              </div>
            </div>

            <h1 className="font-['Outfit'] text-[26px] font-black tracking-tight text-[#172B4D] leading-tight">
              {isTrialing ? 'Recall Pro Trial Active' : isPro ? 'Recall Pro Membership' : 'Start 7-Day Free Trial'}
            </h1>
            <p className="mt-2 text-[13px] text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
              {initialReason ||
                (isTrialing
                  ? 'Your Autopay mandate is verified and active. Zero deduction until your trial ends.'
                  : 'Experience unlimited cloud memory and neural search with ₹0 due today. Cancel anytime with 1 tap.')}
            </p>
          </div>

          {/* 2. Active Mandate Card (If trialing or subscribed) */}
          {isTrialing && subscription && (
            <div className="rounded-[24px] bg-emerald-50/80 p-5 border border-emerald-200/90 shadow-[0_8px_24px_rgba(16,185,129,0.08)] space-y-2.5 backdrop-blur-md overflow-hidden">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 gap-2">
                <span className="flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <span>Autopay Mandate Active</span>
                </span>
                <span className="text-[10.5px] font-mono font-bold text-emerald-800 bg-white/90 px-2.5 py-1 rounded-full border border-emerald-200/90 truncate max-w-[150px]">
                  {subscription.autopay_mandate_id?.slice(0, 16)}...
                </span>
              </div>
              <div className="text-[12px] text-emerald-900/90 leading-relaxed pt-1 border-t border-emerald-200/60 space-y-1">
                <p>
                  Payment Method: <span className="font-bold text-emerald-950">{subscription.autopay_method || 'UPI Autopay'}</span>
                </p>
                <p>
                  Next scheduled deduction:{' '}
                  <span className="font-bold text-emerald-950">
                    ₹{subscription.plan === 'pro_annual' ? '1,499' : '199'} on{' '}
                    {subscription.next_billing_at
                      ? new Date(subscription.next_billing_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : trialEndFormatted}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* 3. Plump Billing Cycle Selector (Annual vs Monthly) */}
          {!isPro && (
            <div className="flex justify-center">
              <div className="flex w-full max-w-sm rounded-full bg-slate-200/60 p-1.5 border border-white/90 shadow-inner backdrop-blur-md gap-1">
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'annual'
                      ? 'plump-toggle-active shadow-[0_4px_12px_rgba(0,0,0,0.08)]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Annual</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-500/20">
                    Save 37%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex flex-1 items-center justify-center rounded-full py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'plump-toggle-active shadow-[0_4px_12px_rgba(0,0,0,0.08)]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          )}

          {/* 4. Plump Obsidian Titanium Price Pass Card */}
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A192F] text-white p-6 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.45)] border border-white/15">
            {/* Top specular hairline edge */}
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
              }}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <span className="text-[10.5px] font-black uppercase tracking-widest text-amber-400 block">
                  {isTrialing ? 'Active Trial Period' : '7 Days Free Trial'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-['Outfit'] text-[40px] font-black tracking-tight text-white leading-none">
                    ₹0
                  </span>
                  <span className="text-sm text-slate-300 font-semibold">due today</span>
                </div>
                <p className="text-[12px] text-amber-200/95 font-medium leading-normal pt-1">
                  Then ₹{currentPrice.toLocaleString('en-IN')}{' '}
                  {billingCycle === 'annual' ? '/ year (₹125/mo)' : '/ month'} via Autopay
                </p>
              </div>

              {/* Zero Risk Plump Liquid Badge */}
              <div className="rounded-full bg-white/12 backdrop-blur-md px-3.5 py-1.5 border border-white/25 text-[11px] font-bold text-white flex items-center gap-1.5 shadow-sm shrink-0">
                <Lock className="h-3.5 w-3.5 text-amber-300 stroke-[2.4]" />
                <span>Zero Risk</span>
              </div>
            </div>

            {/* Inset Liquid Glass Storage Gauge */}
            {subscription && (
              <div className="mt-5 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                  <span className="font-medium">Vault Storage</span>
                  <span className="font-bold text-white">
                    {isPro
                      ? `${subscription.screenshot_count} screenshots (Unlimited)`
                      : `${subscription.screenshot_count} / 50 screenshots used`}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden p-[1px] border border-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPro
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 w-full'
                        : 'bg-gradient-to-r from-[#5392FF] to-[#3478F6]'
                    }`}
                    style={{
                      width: isPro
                        ? '100%'
                        : `${Math.min(100, (subscription.screenshot_count / 50) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. Autopay Mandate Form Card (Only shown if starting trial) */}
          {!isPro && (
            <div className="liquid-glass-card rounded-[26px] p-5 border border-white/90 shadow-[0_10px_28px_rgba(23,43,77,0.05)] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#172B4D] flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#3478F6] stroke-[2.4]" />
                  <span>Choose Autopay Mandate Method</span>
                </span>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  ₹0 Authorized Today
                </span>
              </div>

              {/* Plump Method Toggle Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setAutopayMethod('upi_autopay')}
                  className={`flex items-center justify-center gap-2 rounded-[18px] py-3 px-3 text-xs font-bold transition-all cursor-pointer ${
                    autopayMethod === 'upi_autopay'
                      ? 'bg-white text-[#172B4D] shadow-[0_4px_14px_rgba(52,120,246,0.18)] border border-[#3478F6]/40'
                      : 'bg-slate-100/70 text-slate-500 hover:text-slate-800 border border-slate-200/50'
                  }`}
                >
                  <Smartphone className="h-4 w-4 text-[#3478F6] shrink-0" />
                  <span>UPI Autopay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAutopayMethod('card_mandate')}
                  className={`flex items-center justify-center gap-2 rounded-[18px] py-3 px-3 text-xs font-bold transition-all cursor-pointer ${
                    autopayMethod === 'card_mandate'
                      ? 'bg-white text-[#172B4D] shadow-[0_4px_14px_rgba(52,120,246,0.18)] border border-[#3478F6]/40'
                      : 'bg-slate-100/70 text-slate-500 hover:text-slate-800 border border-slate-200/50'
                  }`}
                >
                  <CreditCard className="h-4 w-4 text-[#3478F6] shrink-0" />
                  <span>Card e-Mandate</span>
                </button>
              </div>

              {autopayMethod === 'upi_autopay' ? (
                <div className="space-y-2.5 pt-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Enter UPI ID (Google Pay, PhonePe, Paytm, BHIM)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourname@okhdfcbank"
                    className="w-full rounded-[18px] bg-white px-4 py-3 text-xs font-semibold text-slate-900 border border-slate-200 focus:border-[#3478F6] focus:ring-2 focus:ring-[#3478F6]/20 focus:outline-none shadow-2xs select-text transition-all"
                  />
                  {/* Quick VPA Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    {['@okhdfcbank', '@okaxis', '@paytm', '@ybl'].map((suffix) => (
                      <button
                        key={suffix}
                        type="button"
                        onClick={() => {
                          const prefix = upiId.includes('@') ? upiId.split('@')[0] : upiId || 'user';
                          setUpiId(`${prefix}${suffix}`);
                        }}
                        className="rounded-full bg-slate-100 hover:bg-blue-50 px-3 py-1 text-[11px] font-bold text-slate-600 hover:text-[#3478F6] border border-slate-200/80 hover:border-blue-300 transition-colors cursor-pointer"
                      >
                        {suffix}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="HDFC / SBI / ICICI"
                      className="w-full rounded-[18px] bg-white px-3.5 py-3 text-xs font-semibold text-slate-900 border border-slate-200 focus:border-[#3478F6] focus:outline-none shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Card Last 4</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      placeholder="4242"
                      className="w-full rounded-[18px] bg-white px-3.5 py-3 text-xs font-mono font-bold text-slate-900 border border-slate-200 focus:border-[#3478F6] focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* RBI Safe Mandate Notice */}
              <div className="flex items-start gap-2.5 rounded-[16px] bg-slate-100/70 p-3 border border-slate-200/60">
                <Lock className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-snug font-medium">
                  Protected by RBI e-mandate rules. Pre-debit SMS sent 24h prior. Cancel anytime in 1 tap.
                </p>
              </div>
            </div>
          )}

          {/* 6. Included Pro Perks (Spacious Individual Cards) */}
          <div className="space-y-3">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">
              Included Pro Superpowers
            </h2>

            <div className="grid gap-2.5">
              {[
                {
                  icon: <InfinityIcon className="h-5 w-5 text-amber-500 stroke-[2.2]" />,
                  podBg: 'bg-amber-50 border-amber-200/60',
                  title: 'Unlimited Screenshot Vault',
                  desc: 'Never hit storage caps; store and search thousands of screenshots with zero limits.',
                },
                {
                  icon: <Zap className="h-5 w-5 text-[#3478F6] stroke-[2.2]" />,
                  podBg: 'bg-blue-50 border-blue-200/60',
                  title: 'Apple Visual Look-Up & Data Cards',
                  desc: 'Interactive object pins, OCR extraction for specs, receipts, flight tickets, and marks.',
                },
                {
                  icon: <Cpu className="h-5 w-5 text-indigo-500 stroke-[2.2]" />,
                  podBg: 'bg-indigo-50 border-indigo-200/60',
                  title: 'Unlimited Neural AI Vision Chat',
                  desc: 'Multi-screenshot reasoning, semantic conversation stitcher, and conversational Q&A.',
                },
                {
                  icon: <ShieldCheck className="h-5 w-5 text-emerald-600 stroke-[2.2]" />,
                  podBg: 'bg-emerald-50 border-emerald-200/60',
                  title: 'AI Clutter Sweeper & Deduplication',
                  desc: 'Detect and sweep blurred images, expired promos, memes, and duplicate captures.',
                },
              ].map((perk, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 rounded-[22px] bg-white/85 hover:bg-white backdrop-blur-xl p-4 border border-white shadow-[0_4px_16px_rgba(23,43,77,0.04)] transition-all"
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border ${perk.podBg} shadow-2xs`}>
                    {perk.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-bold text-[#172B4D] leading-tight truncate">{perk.title}</p>
                    <p className="text-[11.5px] text-slate-500 leading-snug mt-1 font-normal line-clamp-2">{perk.desc}</p>
                  </div>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback & Error Messages */}
          {errorMessage && (
            <div className="rounded-[18px] bg-red-50 p-4 text-center text-xs font-bold text-red-600 border border-red-200 flex items-center justify-center gap-2 shadow-xs">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {restoreMessage && (
            <div className="rounded-[18px] bg-blue-50 p-4 text-center text-xs font-bold text-blue-700 border border-blue-200 shadow-xs">
              {restoreMessage}
            </div>
          )}

          {/* 7. Plumpy Liquid CTA Actions */}
          <div className="pt-2">
            {isSuccess ? (
              <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="h-5 w-5" />
                <span>7-Day Free Trial & Autopay Activated!</span>
              </div>
            ) : isTrialing ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCancelAutopay}
                  disabled={isLoading}
                  className="plump-liquid-rose-cta w-full cursor-pointer active:scale-95 transition-transform"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Cancel Autopay Mandate (₹0 Deducted)</span>}
                </button>
                <p className="text-center text-[11px] text-slate-400 font-medium">
                  Revoking mandate cancels all future automatic deductions immediately.
                </p>
              </div>
            ) : isPro ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 rounded-full bg-slate-100 py-3.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-xs">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span>You are on Recall Pro ({user?.subscription_plan === 'pro_annual' ? '₹1,499/yr' : '₹199/mo'})</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelAutopay}
                  disabled={isLoading}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-red-500 py-1 transition-colors cursor-pointer"
                >
                  Cancel auto-renewal mandate
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartTrial}
                disabled={isLoading}
                className="plump-liquid-cta w-full cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                    <span>Setting up Autopay Mandate...</span>
                  </>
                ) : (
                  <>
                    <span>Start 7-Day Free Trial (₹0 Today)</span>
                    <ArrowRight className="h-4.5 w-4.5 stroke-[2.4]" />
                  </>
                )}
              </button>
            )}

            {/* Bottom Terms & Disclosure */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 px-2 font-medium">
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
          </div>
        </main>
      </motion.div>
    </AnimatePresence>
  );
};

