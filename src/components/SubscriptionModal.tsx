import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkles, Zap, Infinity as InfinityIcon, ShieldCheck, ArrowRight, Loader2, RefreshCw, CheckCircle2, ShieldAlert, CreditCard, Smartphone } from 'lucide-react';
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
      // Check if Razorpay Checkout script can be loaded for real live gateway execution
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
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white/70 shadow-2xl p-6 select-none z-10"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Top handle pill for mobile */}
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>

          {/* Header Crown & Glow */}
          <div className="text-center pt-1 pb-3">
            <div className="relative inline-flex items-center justify-center mb-3">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 blur-xl opacity-60 animate-pulse" />
              <div className="relative flex h-15 w-15 items-center justify-center rounded-[22px] bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-white shadow-lg shadow-amber-500/30 border border-white/80">
                <Crown className="h-7 w-7 stroke-[2.2]" />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 border border-emerald-200/80 mb-2">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              <span className="text-[11px] font-extrabold text-emerald-800">
                {isTrialing ? `${subscription?.days_left_in_trial || 7} Days Left in Free Trial` : '7-Day Free Trial • ₹0 Due Today'}
              </span>
            </div>

            <h2 className="font-['Outfit'] text-2xl font-black tracking-tight text-[#172B4D]">
              {isTrialing ? 'Recall Pro Trial Active' : isPro ? 'Recall Pro Active' : 'Start 7-Day Free Trial'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 font-medium px-4">
              {initialReason ||
                (isTrialing
                  ? 'Your Autopay mandate is verified. Zero deduction until trial ends.'
                  : 'Autopay starts after 7 days. Cancel anytime before trial ends with 1 tap.')}
            </p>
          </div>

          {/* Active Mandate Information Card (If user already has autopay set up) */}
          {isTrialing && subscription && (
            <div className="rounded-[20px] bg-emerald-50/80 p-4 border border-emerald-200/80 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Autopay Mandate Active</span>
                </span>
                <span className="text-[10.5px] font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  {subscription.autopay_mandate_id?.slice(0, 15)}...
                </span>
              </div>
              <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                Method: <span className="font-semibold">{subscription.autopay_method || 'UPI Autopay'}</span>
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

          {/* Billing Cycle Pill Selector */}
          {!isPro && (
            <div className="relative flex items-center justify-center mb-4">
              <div className="flex rounded-full bg-slate-100/90 p-1 border border-slate-200/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'annual'
                      ? 'bg-white text-[#172B4D] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>Annual</span>
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-extrabold text-emerald-700">
                    Save 37%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-[#172B4D] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          )}

          {/* Price & Autopay Summary Card */}
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-900 via-[#172B4D] to-slate-900 text-white p-5 shadow-xl mb-4 border border-slate-800">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-28 w-28 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                  {isTrialing ? 'Active Trial Period' : '7 Days Free Trial'}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-['Outfit'] text-3xl font-extrabold tracking-tight">₹0</span>
                  <span className="text-xs text-slate-300 font-medium">due today</span>
                </div>
                <p className="mt-1 text-[11px] text-amber-200/90 font-medium">
                  Then ₹{currentPrice} {billingCycle === 'annual' ? '/ year (₹125/mo)' : '/ month'} via Autopay
                </p>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 border border-white/15 text-[10.5px] font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>Zero Risk</span>
              </div>
            </div>

            {/* Storage Quota Bar */}
            {subscription && (
              <div className="mt-3.5 pt-3 border-t border-white/10">
                <div className="flex justify-between text-[11px] text-slate-300 mb-1.5">
                  <span>Vault Storage</span>
                  <span className="font-bold text-white">
                    {isPro
                      ? `${subscription.screenshot_count} screenshots (Unlimited)`
                      : `${subscription.screenshot_count} / 50 screenshots used`}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isPro ? 'bg-amber-400 w-full' : 'bg-[#3478F6]'
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

          {/* Autopay Mandate Form (Only shown if user hasn't set up Autopay yet) */}
          {!isPro && (
            <div className="rounded-[22px] bg-slate-50 p-4 border border-slate-200/80 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Smartphone className="h-3.5 w-3.5 text-[#3478F6]" />
                  <span>Choose Autopay Mandate Method</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  ₹0 Authorized
                </span>
              </div>

              {/* Method Toggle Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAutopayMethod('upi_autopay')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all cursor-pointer ${
                    autopayMethod === 'upi_autopay'
                      ? 'bg-white text-[#172B4D] shadow-xs border border-blue-400'
                      : 'bg-slate-200/60 text-slate-600 border border-transparent'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>UPI Autopay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAutopayMethod('card_mandate')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all cursor-pointer ${
                    autopayMethod === 'card_mandate'
                      ? 'bg-white text-[#172B4D] shadow-xs border border-blue-400'
                      : 'bg-slate-200/60 text-slate-600 border border-transparent'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Card e-Mandate</span>
                </button>
              </div>

              {autopayMethod === 'upi_autopay' ? (
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-semibold text-slate-600 block">
                    Enter UPI ID (Google Pay, PhonePe, Paytm, BHIM)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. yourname@okhdfcbank"
                    className="w-full rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 border border-slate-300 focus:border-[#3478F6] focus:outline-none select-text"
                  />
                  {/* Quick VPA Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {['@okhdfcbank', '@okaxis', '@paytm', '@ybl'].map((suffix) => (
                      <button
                        key={suffix}
                        type="button"
                        onClick={() => {
                          const prefix = upiId.includes('@') ? upiId.split('@')[0] : upiId || 'user';
                          setUpiId(`${prefix}${suffix}`);
                        }}
                        className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200 hover:border-blue-400 cursor-pointer"
                      >
                        {suffix}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="HDFC / SBI / ICICI"
                      className="w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 border border-slate-300 focus:border-[#3478F6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Card Last 4</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value)}
                      placeholder="4242"
                      className="w-full rounded-xl bg-white px-3 py-2 text-xs font-mono font-semibold text-slate-900 border border-slate-300 focus:border-[#3478F6] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <p className="text-[10px] text-slate-400 leading-tight">
                🔒 Protected by RBI e-mandate guidelines. Notification will be sent 24h before any deduction.
              </p>
            </div>
          )}

          {/* Perks Feature Comparison Checklist */}
          <div className="space-y-2 mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Included with Free Trial
            </h3>

            <div className="grid gap-2">
              {[
                {
                  icon: <InfinityIcon className="h-4 w-4 text-amber-500 shrink-0" />,
                  title: 'Unlimited Screenshot Vault',
                  desc: 'Never hit storage caps; store and search thousands of screenshots',
                },
                {
                  icon: <Zap className="h-4 w-4 text-[#3478F6] shrink-0" />,
                  title: 'Apple Visual Look-Up & Data Cards',
                  desc: 'Interactive pins and AI extraction for marks, specs, receipts',
                },
                {
                  icon: <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />,
                  title: 'Unlimited Multi-Turn AI Chat',
                  desc: 'Deep multi-screenshot conversation stitcher and Q&A',
                },
                {
                  icon: <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />,
                  title: 'AI Clutter Sweeper & Deduplication',
                  desc: 'Detect and sweep blurred, meme, and duplicate screenshots',
                },
              ].map((perk, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-[16px] bg-slate-50 p-2.5 border border-slate-100">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-2xs border border-slate-200">
                    {perk.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#172B4D] leading-tight">{perk.title}</p>
                    <p className="text-[11px] text-slate-500 leading-normal mt-0.5">{perk.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-center text-xs font-semibold text-red-600 border border-red-100 flex items-center justify-center gap-1.5">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Restore / Success Message */}
          {restoreMessage && (
            <div className="mb-4 rounded-xl bg-blue-50 p-3 text-center text-xs font-semibold text-blue-700 border border-blue-100">
              {restoreMessage}
            </div>
          )}

          {/* Action CTA */}
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
              className="relative w-full overflow-hidden rounded-full py-3.5 px-6 font-['Outfit'] text-sm font-extrabold text-white shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #172B4D 0%, #3478F6 50%, #F59E0B 100%)',
              }}
            >
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
          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 px-2 font-medium">
            <button
              type="button"
              onClick={handleRestore}
              disabled={isRestoring}
              className="hover:text-slate-600 underline flex items-center gap-1 cursor-pointer"
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
