import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
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
import type { User, SubscriptionInfo, SubscriptionPlan } from '../types';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSubscriptionUpdated: (updatedUser: User) => void;
  initialReason?: string;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
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

  // Prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isOpen]);

  // Load plans & subscription state
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
      // Real live Razorpay checkout loader if gateway keys exist
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
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* iOS Frosted Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl transition-all"
        />

        {/* Liquid Glass Modal Card */}
        <motion.div
          initial={{ y: '100%', opacity: 0.9 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-[36px] sm:rounded-[32px] bg-white/90 backdrop-blur-3xl border border-white/90 shadow-[0_32px_80px_-16px_rgba(15,23,42,0.35)] p-6 select-none z-10"
          style={{ paddingBottom: 'calc(1.75rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Top Specular Hairline */}
          <div
            className="absolute top-0 left-8 right-8 h-px pointer-events-none rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 50%, transparent 100%)',
            }}
          />

          {/* iOS Grabber Pill */}
          <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-slate-300/80 shadow-2xs" />

          {/* iOS Liquid Glass Close Button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 border border-white shadow-2xs active:scale-90 transition-all cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[2.4]" />
          </button>

          {/* Header Crown & Status */}
          <div className="text-center pt-1 pb-4">
            <div className="relative inline-flex items-center justify-center mb-3.5">
              <div className="absolute inset-0 rounded-full bg-amber-400/30 blur-xl animate-pulse" />
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-[24px] text-white border border-white/90 shadow-[0_12px_28px_rgba(245,158,11,0.28)]"
                style={{
                  background: 'linear-gradient(145deg, #F59E0B 0%, #D97706 100%)',
                  boxShadow: 'inset 0 1.5px 2px rgba(255,255,255,0.7), 0 10px 24px rgba(217,119,6,0.3)',
                }}
              >
                <Crown className="h-8 w-8 stroke-[2.2] text-amber-50" />
              </div>
            </div>

            {/* Status Pill with ShieldCheck (No Sparkle Icon) */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3.5 py-1 border border-emerald-500/25 mb-2.5 backdrop-blur-md shadow-2xs">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.4]" />
              <span className="text-[11px] font-extrabold tracking-wide text-emerald-800">
                {isTrialing
                  ? `${subscription?.days_left_in_trial || 7} Days Left in Free Trial`
                  : '7-Day Free Trial • ₹0 Due Today'}
              </span>
            </div>

            <h2 className="font-['Outfit'] text-[24px] font-black tracking-tight text-[#172B4D] leading-tight">
              {isTrialing ? 'Recall Pro Trial Active' : isPro ? 'Recall Pro Active' : 'Start 7-Day Free Trial'}
            </h2>
            <p className="mt-1.5 text-xs text-slate-500 font-medium px-4 leading-relaxed">
              {initialReason ||
                (isTrialing
                  ? 'Your Autopay mandate is active. No money is deducted until trial completes.'
                  : 'Autopay starts after 7 days. Cancel anytime before trial ends with 1 tap.')}
            </p>
          </div>

          {/* Active Mandate Information Card */}
          {isTrialing && subscription && (
            <div className="rounded-[22px] bg-emerald-50/70 p-4 border border-emerald-200/80 mb-4.5 space-y-2 backdrop-blur-md shadow-2xs">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Autopay Mandate Active</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-white/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {subscription.autopay_mandate_id?.slice(0, 14)}...
                </span>
              </div>
              <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                Method: <span className="font-bold">{subscription.autopay_method || 'UPI Autopay'}</span>
                <br />
                Next automated deduction:{' '}
                <span className="font-bold">
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
          )}

          {/* iOS Segmented Billing Cycle Selector */}
          {!isPro && (
            <div className="relative flex items-center justify-center mb-4.5">
              <div className="flex w-full max-w-xs rounded-full bg-slate-200/60 p-1 border border-white/80 shadow-inner backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'annual'
                      ? 'bg-white text-[#172B4D] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-white/90'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>Annual</span>
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-extrabold text-emerald-700 border border-emerald-500/20">
                    Save 37%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`flex flex-1 items-center justify-center rounded-full py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-[#172B4D] shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-white/90'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          )}

          {/* Premium iOS Liquid Glass Price Pass Card */}
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A192F] text-white p-5 shadow-[0_16px_36px_-8px_rgba(15,23,42,0.45)] mb-4.5 border border-white/15">
            {/* Specular Edge & Backlight Glow */}
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              }}
            />
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-32 w-32 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 block">
                  {isTrialing ? 'Active Trial Period' : '7 Days Free Trial'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-['Outfit'] text-[34px] font-black tracking-tight text-white leading-none">
                    ₹0
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">due today</span>
                </div>
                <p className="text-[11.5px] text-amber-200/95 font-medium leading-normal pt-0.5">
                  Then ₹{currentPrice.toLocaleString('en-IN')}{' '}
                  {billingCycle === 'annual' ? '/ year (₹125/mo)' : '/ month'} via Autopay
                </p>
              </div>

              {/* Zero Risk iOS Glass Badge (Replaced Sparkle with Lock) */}
              <div className="rounded-full bg-white/10 backdrop-blur-md px-3 py-1 border border-white/20 text-[10.5px] font-bold text-white flex items-center gap-1.5 shadow-2xs shrink-0">
                <Lock className="h-3 w-3 text-amber-300 stroke-[2.4]" />
                <span>Zero Risk</span>
              </div>
            </div>

            {/* Storage Quota Inset Glass Bar */}
            {subscription && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1.5">
                  <span className="font-medium">Vault Storage</span>
                  <span className="font-bold text-white">
                    {isPro
                      ? `${subscription.screenshot_count} screenshots (Unlimited)`
                      : `${subscription.screenshot_count} / 50 screenshots used`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden p-[1px] border border-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPro
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-300 w-full'
                        : 'bg-gradient-to-r from-[#4A8CF7] to-[#3478F6]'
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

          {/* Autopay Mandate Form */}
          {!isPro && (
            <div className="liquid-glass-card rounded-[24px] p-4.5 border border-white/90 shadow-[0_8px_24px_rgba(23,43,77,0.04)] mb-4.5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#172B4D] flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-[#3478F6] stroke-[2.2]" />
                  <span>Choose Autopay Mandate Method</span>
                </span>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  ₹0 Authorized
                </span>
              </div>

              {/* Liquid Glass Method Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAutopayMethod('upi_autopay')}
                  className={`flex items-center justify-center gap-1.5 rounded-[16px] py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
                    autopayMethod === 'upi_autopay'
                      ? 'bg-white text-[#172B4D] shadow-[0_2px_8px_rgba(52,120,246,0.15)] border border-[#3478F6]/40'
                      : 'bg-slate-100/70 text-slate-500 hover:text-slate-700 border border-slate-200/50'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5 text-[#3478F6] shrink-0" />
                  <span>UPI Autopay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAutopayMethod('card_mandate')}
                  className={`flex items-center justify-center gap-1.5 rounded-[16px] py-2.5 px-3 text-xs font-bold transition-all cursor-pointer ${
                    autopayMethod === 'card_mandate'
                      ? 'bg-white text-[#172B4D] shadow-[0_2px_8px_rgba(52,120,246,0.15)] border border-[#3478F6]/40'
                      : 'bg-slate-100/70 text-slate-500 hover:text-slate-700 border border-slate-200/50'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5 text-[#3478F6] shrink-0" />
                  <span>Card e-Mandate</span>
                </button>
              </div>

              {autopayMethod === 'upi_autopay' ? (
                <div className="space-y-2 pt-0.5">
                  <label className="text-[11px] font-bold text-slate-600 block">
                    Enter UPI ID (Google Pay, PhonePe, Paytm, BHIM)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourname@okhdfcbank"
                    className="w-full rounded-[16px] bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 border border-slate-200 focus:border-[#3478F6] focus:ring-2 focus:ring-[#3478F6]/15 focus:outline-none shadow-2xs select-text transition-all"
                  />
                  {/* Quick VPA Chips with Clean Spacing */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {['@okhdfcbank', '@okaxis', '@paytm', '@ybl'].map((suffix) => (
                      <button
                        key={suffix}
                        type="button"
                        onClick={() => {
                          const prefix = upiId.includes('@') ? upiId.split('@')[0] : upiId || 'user';
                          setUpiId(`${prefix}${suffix}`);
                        }}
                        className="rounded-full bg-slate-100 hover:bg-blue-50 px-2.5 py-0.5 text-[10.5px] font-semibold text-slate-600 hover:text-[#3478F6] border border-slate-200/80 hover:border-blue-300 transition-colors cursor-pointer"
                      >
                        {suffix}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="HDFC / SBI / ICICI"
                      className="w-full rounded-[16px] bg-white px-3 py-2.5 text-xs font-semibold text-slate-900 border border-slate-200 focus:border-[#3478F6] focus:outline-none shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">Card Last 4</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      placeholder="4242"
                      className="w-full rounded-[16px] bg-white px-3 py-2.5 text-xs font-mono font-bold text-slate-900 border border-slate-200 focus:border-[#3478F6] focus:outline-none shadow-2xs"
                    />
                  </div>
                </div>
              )}

              {/* RBI Safe Mandate Notice */}
              <div className="flex items-start gap-2 rounded-[14px] bg-slate-100/70 p-2.5 border border-slate-200/60">
                <Lock className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-slate-500 leading-snug">
                  Protected by RBI e-mandate rules. Pre-debit SMS sent 24h prior. Cancel anytime in 1 tap.
                </p>
              </div>
            </div>
          )}

          {/* Perks Feature Comparison Checklist (All Sparkles Replaced with Clean Apple Icons) */}
          <div className="space-y-2 mb-5">
            <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
              Included with Free Trial
            </h3>

            <div className="grid gap-2">
              {[
                {
                  icon: <InfinityIcon className="h-4 w-4 text-amber-500 stroke-[2.2]" />,
                  podBg: 'bg-amber-50 border-amber-200/50',
                  title: 'Unlimited Screenshot Vault',
                  desc: 'Never hit storage caps; store and search thousands of screenshots',
                },
                {
                  icon: <Zap className="h-4 w-4 text-[#3478F6] stroke-[2.2]" />,
                  podBg: 'bg-blue-50 border-blue-200/50',
                  title: 'Apple Visual Look-Up & Data Cards',
                  desc: 'Interactive pins and AI extraction for marks, specs, receipts',
                },
                {
                  icon: <Cpu className="h-4 w-4 text-indigo-500 stroke-[2.2]" />,
                  podBg: 'bg-indigo-50 border-indigo-200/50',
                  title: 'Unlimited Multi-Turn AI Chat',
                  desc: 'Deep multi-screenshot conversation stitcher and Q&A',
                },
                {
                  icon: <ShieldCheck className="h-4 w-4 text-emerald-600 stroke-[2.2]" />,
                  podBg: 'bg-emerald-50 border-emerald-200/50',
                  title: 'AI Clutter Sweeper & Deduplication',
                  desc: 'Detect and sweep blurred, meme, and duplicate screenshots',
                },
              ].map((perk, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-[18px] bg-white/70 hover:bg-white/90 backdrop-blur-md p-3 border border-white shadow-[0_2px_8px_rgba(23,43,77,0.03)] transition-all"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border ${perk.podBg} shadow-2xs`}>
                    {perk.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-bold text-[#172B4D] leading-tight truncate">{perk.title}</p>
                    <p className="text-[11px] text-slate-500 leading-normal mt-0.5 truncate">{perk.desc}</p>
                  </div>
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 rounded-[16px] bg-red-50 p-3.5 text-center text-xs font-semibold text-red-600 border border-red-100 flex items-center justify-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Restore / Status Message */}
          {restoreMessage && (
            <div className="mb-4 rounded-[16px] bg-blue-50 p-3.5 text-center text-xs font-semibold text-blue-700 border border-blue-100">
              {restoreMessage}
            </div>
          )}

          {/* Primary Action Button */}
          {isSuccess ? (
            <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30">
              <CheckCircle2 className="h-5 w-5" />
              <span>7-Day Free Trial & Autopay Activated!</span>
            </div>
          ) : isTrialing ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCancelAutopay}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-red-50 hover:bg-red-100 py-3 text-xs font-bold text-red-600 border border-red-200 transition-colors cursor-pointer"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Cancel Autopay Mandate (₹0 Deducted)</span>}
              </button>
              <p className="text-center text-[10.5px] text-slate-400">
                Revoking mandate cancels all future automatic deductions immediately.
              </p>
            </div>
          ) : isPro ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 rounded-full bg-slate-100 py-3 text-xs font-bold text-slate-700 border border-slate-200">
                <Crown className="h-4 w-4 text-amber-500" />
                <span>You are on Recall Pro ({user?.subscription_plan === 'pro_annual' ? '₹1,499/yr' : '₹199/mo'})</span>
              </div>
              <button
                type="button"
                onClick={handleCancelAutopay}
                disabled={isLoading}
                className="w-full text-center text-[11px] font-semibold text-slate-400 hover:text-red-500 py-1 transition-colors cursor-pointer"
              >
                Cancel auto-renewal mandate
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartTrial}
              disabled={isLoading}
              className="relative w-full overflow-hidden rounded-full py-3.5 px-6 font-['Outfit'] text-[14px] font-extrabold text-white shadow-[0_12px_28px_-4px_rgba(52,120,246,0.45)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/35"
              style={{
                background: 'linear-gradient(145deg, #4A8CF7 0%, #3478F6 50%, #2060DC 100%)',
              }}
            >
              {/* Specular button top gloss */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent pointer-events-none rounded-t-full" />

              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Setting up Autopay Mandate...</span>
                </>
              ) : (
                <>
                  <span>Start 7-Day Free Trial (₹0 Today)</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.4]" />
                </>
              )}
            </button>
          )}

          {/* Footer Restore & Terms */}
          <div className="mt-4.5 flex items-center justify-between text-[11px] text-slate-400 px-2 font-medium">
            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring}
              className="hover:text-slate-600 underline flex items-center gap-1 cursor-pointer transition-colors"
            >
              {isRestoring && <RefreshCw className="h-3 w-3 animate-spin" />}
              <span>Restore Purchases</span>
            </button>
            <span>Cancel anytime with 1 tap</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
