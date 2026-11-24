import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Sparkles, Zap, Infinity as InfinityIcon, ShieldCheck, ArrowRight, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  const isPro = user?.subscription_tier === 'pro';

  // Prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, [isOpen]);

  // Load current subscription state
  useEffect(() => {
    if (!isOpen) {
      setIsSuccess(false);
      setErrorMessage(null);
      setRestoreMessage(null);
      return;
    }

    api.getSubscription()
      .then((res) => setSubscription(res.subscription))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const planToSet: SubscriptionPlan = billingCycle === 'annual' ? 'pro_annual' : 'pro_monthly';
      const res = await api.upgradeSubscription(planToSet);
      setIsSuccess(true);
      onSubscriptionUpdated(res.user);
      setSubscription(res.subscription);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment simulation failed. Please try again.');
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

  const handleCancelSubscription = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const res = await api.cancelSubscription();
      onSubscriptionUpdated(res.user);
      setSubscription((prev) => prev ? { ...prev, status: 'canceled' } : null);
      setRestoreMessage('Subscription set to cancel at the end of billing cycle.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel plan.');
    } finally {
      setIsLoading(false);
    }
  };

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
            className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>

          {/* Header Crown & Glow */}
          <div className="text-center pt-1 pb-4">
            <div className="relative inline-flex items-center justify-center mb-3">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 blur-xl opacity-60 animate-pulse" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-white shadow-lg shadow-amber-500/30 border border-white/80">
                <Crown className="h-8 w-8 stroke-[2.2]" />
              </div>
            </div>

            <h2 className="font-['Outfit'] text-2xl font-black tracking-tight text-[#172B4D]">
              {isPro ? 'Recall Pro Active' : 'Unlock Recall Pro'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 font-medium px-4">
              {initialReason ||
                (isPro
                  ? 'Your visual memory is running at maximum velocity with unlimited cloud storage.'
                  : 'Unlimited screenshot vault storage, real-time Apple Visual Look-Up, and multi-turn AI chat.')}
            </p>
          </div>

          {/* Billing Cycle Pill Selector */}
          {!isPro && (
            <div className="relative flex items-center justify-center mb-5">
              <div className="flex rounded-full bg-slate-100/90 p-1 border border-slate-200/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`relative flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                    billingCycle === 'annual'
                      ? 'bg-white text-[#172B4D] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>Annual</span>
                  <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-extrabold text-emerald-700">
                    Save 33%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
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

          {/* Price Card */}
          <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-slate-900 via-[#172B4D] to-slate-900 text-white p-5 shadow-xl mb-5 border border-slate-800">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-28 w-28 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  {isPro ? 'Current Membership' : (billingCycle === 'annual' ? 'Billed Annually' : 'Billed Monthly')}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-['Outfit'] text-3xl font-extrabold tracking-tight">
                    {billingCycle === 'annual' ? '$39.99' : '$4.99'}
                  </span>
                  <span className="text-xs text-slate-300 font-medium">
                    {billingCycle === 'annual' ? '/ year ($3.33/mo)' : '/ month'}
                  </span>
                </div>
              </div>
              <div className="rounded-full bg-white/10 px-3 py-1 border border-white/15 text-[11px] font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-300" />
                <span>{isPro ? 'Pro Member' : 'All Perks Included'}</span>
              </div>
            </div>

            {/* Storage Quota Bar */}
            {subscription && (
              <div className="mt-4 pt-3.5 border-t border-white/10">
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

          {/* Perks Feature Comparison Checklist */}
          <div className="space-y-2.5 mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Included with Recall Pro
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
                <div key={i} className="flex items-start gap-3 rounded-[16px] bg-slate-50 p-2.5 border border-slate-100">
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
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-center text-xs font-semibold text-red-600 border border-red-100">
              {errorMessage}
            </div>
          )}

          {/* Restore Message */}
          {restoreMessage && (
            <div className="mb-4 rounded-xl bg-blue-50 p-3 text-center text-xs font-semibold text-blue-600 border border-blue-100">
              {restoreMessage}
            </div>
          )}

          {/* Action CTA */}
          {isSuccess ? (
            <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/30">
              <CheckCircle2 className="h-5 w-5" />
              <span>Welcome to Recall Pro!</span>
            </div>
          ) : isPro ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 rounded-full bg-slate-100 py-3 text-xs font-bold text-slate-700 border border-slate-200">
                <Crown className="h-4 w-4 text-amber-500" />
                <span>You are on Recall Pro ({user?.subscription_plan === 'pro_annual' ? 'Annual' : 'Monthly'})</span>
              </div>
              {subscription?.status !== 'canceled' && (
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                  className="w-full text-center text-[11px] font-semibold text-slate-400 hover:text-red-500 py-1 transition-colors"
                >
                  Cancel auto-renewal
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={isLoading}
              className="relative w-full overflow-hidden rounded-full py-3.5 px-6 font-['Outfit'] text-sm font-extrabold text-white shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-transform cursor-pointer flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #172B4D 0%, #3478F6 50%, #F59E0B 100%)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Activating Pro...</span>
                </>
              ) : (
                <>
                  <span>Upgrade to Recall Pro</span>
                  <span className="opacity-90 font-normal">
                    — {billingCycle === 'annual' ? '$39.99/yr' : '$4.99/mo'}
                  </span>
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
              className="hover:text-slate-600 underline flex items-center gap-1"
            >
              {isRestoring && <RefreshCw className="h-3 w-3 animate-spin" />}
              <span>Restore Purchases</span>
            </button>
            <span>Cancel anytime in Settings</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
