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
  Cpu,
  Check,
  Eye,
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [razorpayKey, setRazorpayKey] = useState<string | null>(null);

  const isPro = user?.subscription_tier === 'pro';

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

  const currentPrice = billingCycle === 'annual' ? 1499 : 199;
  const currentPriceFormatted = billingCycle === 'annual' ? '₹1,499 / year' : '₹199 / month';

  const handleRazorpayCheckout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);

    const planToSet: SubscriptionPlan = billingCycle === 'annual' ? 'pro_annual' : 'pro_monthly';
    const amountInPaise = billingCycle === 'annual' ? 149900 : 19900;

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
        description: billingCycle === 'annual' ? 'Recall Pro (Annual - ₹1,499/yr)' : 'Recall Pro (Monthly - ₹199/mo)',
        image: logoUrl,
        order_id: orderData.order_id,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
        },
        notes: {
          user_id: user?.id || '',
          plan: planToSet,
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
      setSubscription((prev) => (prev ? { ...prev, tier: 'free', status: 'canceled', is_pro: false } : null));
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
      if (res.tier === 'pro') {
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
          paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Soft Ambient Refraction Background */}
        <div
          className="fixed inset-0 pointer-events-none -z-10"
          style={{
            background:
              'radial-gradient(circle at 15% 10%, rgba(52, 120, 246, 0.08) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(185, 217, 255, 0.22) 0%, transparent 50%)',
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
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-700 px-2 py-0.5 text-[9.5px] font-black border border-amber-400/40">
                  <Crown className="h-2.5 w-2.5 text-amber-600 fill-amber-500" />
                  <span>PRO</span>
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
        <main className="w-full max-w-lg mx-auto px-4 pt-5 pb-16 space-y-5 flex-1">
          {/* Hero Header */}
          <div className="text-center pt-1 pb-1">
            <div className="relative inline-flex items-center justify-center mb-3">
              <div className="absolute inset-0 rounded-full bg-[#3478F6]/20 blur-2xl animate-pulse" />
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-[24px] text-white border border-white/95 shadow-[0_12px_28px_rgba(52,120,246,0.25)]"
                style={{
                  background: 'linear-gradient(145deg, #5392FF 0%, #3478F6 100%)',
                }}
              >
                <Crown className="h-8 w-8 stroke-[2.2] text-white fill-white/20" />
              </div>
            </div>

            <h1 className="font-['Outfit'] text-[24px] font-black tracking-tight text-[#172B4D] leading-tight">
              {isPro ? 'You are on Recall Pro' : 'Unlock Recall Pro'}
            </h1>
            <p className="mt-1.5 text-[13px] text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
              {initialReason ||
                (isPro
                  ? 'Your Pro subscription is fully active. Enjoy unlimited screenshot search and AI memory.'
                  : 'Get unlimited vault memory, neural OCR search, and AI clutter cleaner.')}
            </p>
          </div>

          {/* Butter-Smooth Billing Cycle Selector (Zero Lag Segmented Pill) */}
          {!isPro && (
            <div className="flex justify-center">
              <div className="relative flex w-full max-w-xs rounded-full bg-slate-200/70 p-1 border border-white/90 shadow-inner">
                <button
                  type="button"
                  onClick={() => setBillingCycle('annual')}
                  className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-extrabold transition-all duration-150 cursor-pointer ${
                    billingCycle === 'annual'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>Annual</span>
                  <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9.5px] font-black text-emerald-700">
                    Save 37%
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`relative z-10 flex-1 flex items-center justify-center py-2 rounded-full text-xs font-extrabold transition-all duration-150 cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>
          )}

          {/* Pricing Pass Card */}
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0A192F] text-white p-6 shadow-[0_20px_40px_-10px_rgba(15,23,42,0.40)] border border-white/15">
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              }}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#5392FF] block">
                  {isPro ? 'Active Membership' : 'Recall Pro Membership'}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-['Outfit'] text-[38px] font-black tracking-tight text-white leading-none">
                    ₹{currentPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-sm text-slate-300 font-semibold">
                    {billingCycle === 'annual' ? '/ year (~₹125/mo)' : '/ month'}
                  </span>
                </div>
                <p className="text-[12px] text-slate-300 font-medium leading-normal pt-1">
                  {billingCycle === 'annual'
                    ? 'Billed annually at ₹1,499. Includes 37% discount.'
                    : 'Billed monthly at ₹199. Cancel anytime.'}
                </p>
              </div>

              <div className="rounded-full bg-white/12 backdrop-blur-md px-3.5 py-1.5 border border-white/20 text-[11px] font-bold text-white flex items-center gap-1.5 shadow-sm shrink-0">
                <Lock className="h-3.5 w-3.5 text-emerald-400 stroke-[2.4]" />
                <span>Verified</span>
              </div>
            </div>

            {/* Storage Progress Gauge */}
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
                    className={`h-full rounded-full transition-all duration-300 ${
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

          {/* Features Checklist */}
          <div className="space-y-3">
            <h3 className="text-xs font-black tracking-wider uppercase text-slate-500 px-1">
              What Recall Pro Unlocks
            </h3>

            <div className="space-y-2.5">
              {[
                {
                  icon: <Zap className="h-5 w-5 text-amber-500 stroke-[2.2]" />,
                  podBg: 'bg-amber-50 border-amber-200/60',
                  title: 'Unlimited Screenshot Cloud Vault',
                  desc: 'Store tens of thousands of screenshots safely without the 50-item limit.',
                },
                {
                  icon: <Eye className="h-5 w-5 text-[#3478F6] stroke-[2.2]" />,
                  podBg: 'bg-blue-50 border-blue-200/60',
                  title: 'Apple Visual Look-Up & Spec Cards',
                  desc: 'Interactive object pins, spec extraction for receipts, tickets, and products.',
                },
                {
                  icon: <Cpu className="h-5 w-5 text-indigo-500 stroke-[2.2]" />,
                  podBg: 'bg-indigo-50 border-indigo-200/60',
                  title: 'Unlimited Neural AI Vision Chat',
                  desc: 'Ask questions across screenshots with deep multi-screenshot context.',
                },
                {
                  icon: <ShieldCheck className="h-5 w-5 text-emerald-600 stroke-[2.2]" />,
                  podBg: 'bg-emerald-50 border-emerald-200/60',
                  title: 'Memory Broom & Clutter Cleaner',
                  desc: 'One-tap cleanup for duplicate captures, blurry images, and expired promos.',
                },
              ].map((perk, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 rounded-[22px] bg-white/85 p-3.5 border border-white shadow-[0_4px_16px_rgba(23,43,77,0.03)]"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border ${perk.podBg} shadow-2xs`}>
                    {perk.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-[#172B4D] leading-tight truncate">{perk.title}</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5 font-normal line-clamp-2">{perk.desc}</p>
                  </div>
                  <div className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80">
                    <Check className="h-3 w-3 stroke-[3]" />
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

          {/* Primary Action Buttons */}
          <div className="pt-2">
            {isSuccess ? (
              <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-4 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="h-5 w-5" />
                <span>Payment Successful! Recall Pro Activated.</span>
              </div>
            ) : isPro ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-50 py-3.5 text-xs font-extrabold text-emerald-800 border border-emerald-200 shadow-xs">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Recall Pro is Active on your Account</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                  className="w-full text-center text-xs font-bold text-slate-400 hover:text-red-600 py-1.5 transition-colors cursor-pointer"
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
                  className="plump-liquid-cta w-full cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2 py-4"
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
                <p className="text-center text-[11px] text-slate-400 font-medium">
                  Instant activation via UPI, Cards, or NetBanking. Safe &amp; encrypted.
                </p>
              </div>
            )}

            {/* Bottom Restore & Guarantee */}
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
