import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RecallEmblem } from './RecallEmblem';
import {
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import type { User } from '../types';
import { OtpInput } from './OtpInput';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '600516818739-fso5raspscqlsmcmt7r27o6l6kltjoov.apps.googleusercontent.com';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
}

type AuthMode = 'signin' | 'signup' | 'otp_verify' | 'forgot_password';

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleTimeoutRef = useRef<any>(null);

  // OTP Verification States (Packwise Standard)
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(40);
  const [isResending, setIsResending] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'forgot_password'>('signup');

  const tokenClientRef = useRef<any>(null);

  // Initialize official Google OAuth Token Client and One-Tap/Credential Client
  const initGoogleClient = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        if (!tokenClientRef.current) {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: async (tokenResponse: any) => {
              if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
              if (tokenResponse?.access_token) {
                setIsGoogleLoading(true);
                setError(null);
                try {
                  const res = await api.loginGoogle({ tokenId: tokenResponse.access_token });
                  onAuthSuccess(res.user);
                } catch (err: unknown) {
                  if (err instanceof Error) setError(err.message);
                  else setError('Google Sign-In failed');
                } finally {
                  setIsGoogleLoading(false);
                }
              } else {
                setIsGoogleLoading(false);
                if (tokenResponse?.error && tokenResponse.error !== 'popup_closed_by_user') {
                  setError(`Google Sign-In: ${tokenResponse.error}`);
                }
              }
            },
            error_callback: (nonOAuthErr: any) => {
              if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
              setIsGoogleLoading(false);
              console.warn('Google Token Client init error:', nonOAuthErr);
              setError('Google Sign-In could not be opened. Please verify popups are allowed.');
            },
          });
        }
      }

      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            auto_select: false,
            callback: async (credentialResponse: any) => {
              if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
              if (credentialResponse?.credential) {
                setIsGoogleLoading(true);
                setError(null);
                try {
                  const res = await api.loginGoogle({ credential: credentialResponse.credential });
                  onAuthSuccess(res.user);
                } catch (err: unknown) {
                  if (err instanceof Error) setError(err.message);
                  else setError('Google Sign-In failed');
                } finally {
                  setIsGoogleLoading(false);
                }
              } else {
                setIsGoogleLoading(false);
              }
            },
          });
        } catch (idErr) {
          console.warn('Google accounts.id init warning:', idErr);
        }
      }

      return Boolean(tokenClientRef.current || (typeof window !== 'undefined' && window.google?.accounts?.id));
    } catch (e) {
      console.warn('Google Identity Services setup warning:', e);
    }
    return false;
  }, [onAuthSuccess]);

  useEffect(() => {
    initGoogleClient();
    const interval = setInterval(() => {
      if (initGoogleClient()) clearInterval(interval);
    }, 400);
    return () => clearInterval(interval);
  }, [initGoogleClient]);

  // Initialize native Google Sign-In for Capacitor Android
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleSignIn.initialize({
        clientId: GOOGLE_CLIENT_ID,
      }).catch((err) => {
        console.warn('Native GoogleSignIn initialize warning:', err);
      });
    }
  }, []);

  // Clean up any pending Google timeout
  useEffect(() => {
    return () => {
      if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
    };
  }, []);

  // 40-second Countdown Timer for OTP Resend
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (mode === 'otp_verify' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, resendTimer]);

  const handleGoogleClick = async () => {
    setError(null);
    setIsGoogleLoading(true);

    // 1. Native Android: display device Google accounts in system bottom sheet
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await GoogleSignIn.signIn();
        if (result?.idToken) {
          const res = await api.loginGoogle({
            credential: result.idToken,
            email: result.email || undefined,
            name: result.displayName || undefined,
            picture: result.imageUrl || undefined,
            sub: result.userId || undefined,
          });
          onAuthSuccess(res.user);
          return;
        }
      } catch (nativeErr: any) {
        console.warn('Native Google Sign-In attempt:', nativeErr);
        const msg = (nativeErr?.message || String(nativeErr)).toLowerCase();
        // If user cancelled, closed, or backed out of the account chooser
        if (msg.includes('cancel') || msg.includes('16') || msg.includes('abort') || msg.includes('dismiss')) {
          setIsGoogleLoading(false);
          return;
        }
        console.info('Native accounts chooser fell back, checking web client...');
      }
    }

    // 2. Web Desktop / Browser Fallback
    if (!initGoogleClient() || !tokenClientRef.current) {
      setIsGoogleLoading(false);
      setError('Connecting to Google services... Please tap again in a moment.');
      return;
    }

    if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
    // 60-second safety timeout so button never gets stuck in loading state
    googleTimeoutRef.current = setTimeout(() => {
      setIsGoogleLoading(false);
    }, 60000);

    try {
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
      setIsGoogleLoading(false);
      console.error('Google requestAccessToken failed:', err);
      setError('Could not open Google Sign-In popup. Please ensure popups are allowed for this site.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!email.trim()) throw new Error('Please enter your email address');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');

        const res = await api.signup(email.trim(), password, name.trim());
        setOtpPurpose('signup');
        setOtpCode('');
        setResendTimer(40);
        setMode('otp_verify');
        setSuccessMessage(res.message || 'Verification code sent to your email.');
      } else if (mode === 'signin') {
        if (!email.trim() || !password) throw new Error('Please enter your email and password');
        try {
          const res = await api.login(email.trim(), password);
          onAuthSuccess(res.user);
        } catch (loginErr: any) {
          // If backend returns that email needs verification
          if (loginErr.message?.toLowerCase().includes('not verified')) {
            setOtpPurpose('signup');
            setOtpCode('');
            setResendTimer(40);
            setMode('otp_verify');
            setSuccessMessage('Please enter the 6-digit verification code sent to your email.');
            return;
          }
          throw loginErr;
        }
      } else if (mode === 'forgot_password') {
        if (!email.trim()) throw new Error('Please enter your email address');
        const res = await api.forgotPassword(email.trim());
        setOtpPurpose('forgot_password');
        setOtpCode('');
        setResendTimer(40);
        setMode('otp_verify');
        setSuccessMessage(res.message || 'Password reset code sent to your email.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication request failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpCode = async (codeToVerify: string) => {
    if (!codeToVerify || codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (otpPurpose === 'signup') {
        const res = await api.verifySignupOtp(email.trim(), codeToVerify);
        onAuthSuccess(res.user);
      } else {
        const res = await api.verifyOtp(email.trim(), codeToVerify);
        onAuthSuccess(res.user);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Verification failed. Please check the code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await verifyOtpCode(otpCode);
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    try {
      if (otpPurpose === 'signup') {
        await api.resendOtp(email.trim());
      } else {
        await api.forgotPassword(email.trim());
      }
      setResendTimer(40);
      setSuccessMessage('A fresh verification code has been dispatched to your email.');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to resend verification code');
      }
    } finally {
      setIsResending(false);
    }
  };

  const switchAuthMode = (nextMode: 'signin' | 'signup' | 'forgot_password') => {
    if (nextMode === mode) return;
    setMode(nextMode);
    if (nextMode === 'signin' || nextMode === 'signup') {
      setEmail('');
      setPassword('');
      setName('');
      setShowPassword(false);
    }
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden bg-[#F3F7FC] px-6 py-8 text-[#172B4D]">
      {/* Subtle Ambient Arctic Blue Light */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="vision-blob"
          style={{
            background: 'radial-gradient(circle, rgba(52, 120, 246, 0.12) 0%, transparent 70%)',
            width: '65vw',
            height: '65vw',
            top: '-10%',
            left: '-10%',
            animation: 'floatWide1 24s ease-in-out infinite',
          }}
        />
        <div
          className="vision-blob"
          style={{
            background: 'radial-gradient(circle, rgba(185, 217, 255, 0.35) 0%, transparent 70%)',
            width: '60vw',
            height: '60vw',
            bottom: '15%',
            right: '-10%',
            animation: 'floatWide3 28s ease-in-out infinite',
          }}
        />
      </div>

      {/* Unified Centered Content Stack — keeps Brand & Slogan consistently anchored above forms */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        {/* Brand & Hero */}
        <div
          className="mb-5 flex flex-col items-center text-center"
          style={{
            animation: 'splashPhaseEnter 520ms cubic-bezier(0.16, 1, 0.3, 1) both',
            willChange: 'transform, opacity',
          }}
        >
          <div className="relative mb-3 flex items-center justify-center">
            <div
              className="pointer-events-none absolute h-24 w-24 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(52, 120, 246, 0.24) 0%, rgba(185, 217, 255, 0.12) 48%, transparent 72%)',
                animation: 'splashAuraPulse 6s ease-in-out infinite',
              }}
            />
            <div className="relative rounded-[22px] shadow-[0_12px_30px_-6px_rgba(37,99,235,0.34)] transition-transform duration-200 ease-out hover:scale-[1.03] active:scale-[0.97]">
              <RecallEmblem className="h-15 w-15 rounded-[22px]" />
            </div>
          </div>

          <h1 className="font-['Outfit'] text-2xl font-extrabold tracking-[0.14em] text-[#172B4D] pl-[0.14em]">
            RECALL
          </h1>
          <p className="mt-1 max-w-[260px] text-xs leading-relaxed text-[#4A5D78] font-medium">
            Intelligent visual memory for personal screenshot history
          </p>
        </div>

        {/* Main Liquid Glass Container */}
        <div
          className="w-full"
          style={{
            animation: 'splashPhaseEnter 580ms cubic-bezier(0.16, 1, 0.3, 1) 70ms both',
            willChange: 'transform, opacity',
          }}
        >
          <div className="liquid-glass-container rounded-[28px] p-5 sm:p-6 shadow-lg">
          {mode === 'otp_verify' ? (
            /* --- OTP Verification Mode (Packwise standard) --- */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setMode(otpPurpose === 'signup' ? 'signup' : 'signin');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer mb-2"
              >
                <ChevronLeft className="h-4 w-4 stroke-[2]" />
                <span>Back to {otpPurpose === 'signup' ? 'sign up' : 'sign in'}</span>
              </button>

              <div className="text-center">
                <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#208AEF]/10 text-[#208AEF]">
                  <KeyRound className="h-5 w-5 stroke-[2.2]" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Enter Verification Code</h2>
                <p className="mt-1 text-xs text-slate-500">
                  We sent a 6-digit code to{' '}
                  <span className="font-semibold text-slate-800">{email}</span>
                </p>
              </div>

              {error && (
                <div className="rounded-[16px] border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-700 font-semibold shadow-2xs backdrop-blur-md">
                  {error}
                </div>
              )}

              {successMessage && !error && (
                <div className="flex items-center gap-2 rounded-[16px] border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800 font-semibold shadow-2xs backdrop-blur-md">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <OtpInput
                  length={6}
                  value={otpCode}
                  onChange={(val) => {
                    setOtpCode(val);
                    if (val.length === 6) {
                      setError(null);
                      verifyOtpCode(val);
                    }
                  }}
                  disabled={loading}
                />

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full liquid-btn-primary font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-50 text-xs shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <>
                      <span>Verify & Continue</span>
                      <ArrowRight className="h-4 w-4 shrink-0 stroke-[2.2]" />
                    </>
                  )}
                </button>

                {/* 40-Second Resend Countdown */}
                <div className="text-center pt-2">
                  {resendTimer > 0 ? (
                    <span className="text-[11.5px] font-medium text-slate-400">
                      Resend code in <strong className="text-slate-700">{resendTimer}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isResending}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#208AEF] hover:underline cursor-pointer disabled:opacity-50"
                    >
                      {isResending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5 stroke-[2]" />
                      )}
                      <span>Resend Code</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            /* --- Normal Auth Mode (Sign In / Sign Up / Forgot Password) --- */
            <>
              {/* Packwise-style Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading || isGoogleLoading}
                className="w-full h-12 rounded-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50/90 active:scale-[0.98] transition-all cursor-pointer border border-slate-200/90 shadow-xs relative z-10 font-bold text-xs text-[#172B4D] disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-[#208AEF] shrink-0" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              {/* Clean Divider */}
              <div className="relative my-3.5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80" />
                </div>
                <span className="relative bg-[#FFFFFF] px-2.5 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider rounded-full">
                  or with email
                </span>
              </div>

              {/* Mode Toggle Chips */}
              {mode !== 'forgot_password' ? (
                <div className="mb-4 grid grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => switchAuthMode('signin')}
                    className={`liquid-filter-chip w-full flex items-center justify-center transition-[transform,box-shadow,background-color] duration-200 ease-out cursor-pointer ${
                      mode === 'signin' ? 'liquid-filter-chip-active text-[#172B4D] font-bold' : 'text-slate-600 font-semibold'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => switchAuthMode('signup')}
                    className={`liquid-filter-chip w-full flex items-center justify-center transition-[transform,box-shadow,background-color] duration-200 ease-out cursor-pointer ${
                      mode === 'signup' ? 'liquid-filter-chip-active text-[#172B4D] font-bold' : 'text-slate-600 font-semibold'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              ) : (
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => switchAuthMode('signin')}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4 stroke-[2]" />
                    <span>Back to Sign In</span>
                  </button>
                  <span className="text-xs font-bold text-slate-700">Reset Password</span>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-[16px] border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-700 font-semibold shadow-2xs backdrop-blur-md relative z-10">
                  {error}
                </div>
              )}

              {successMessage && !error && (
                <div className="mb-4 flex items-center gap-2 rounded-[16px] border border-emerald-200 bg-emerald-50/90 p-3 text-xs text-emerald-800 font-semibold shadow-2xs backdrop-blur-md relative z-10">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{successMessage}</span>
                </div>
              )}

              <form
                key={mode}
                onSubmit={handleSubmit}
                className="space-y-3 relative z-10"
                style={{
                  animation: 'splashPhaseEnter 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
                }}
              >
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 px-1">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <UserIcon className="absolute left-3.5 h-4 w-4 text-slate-400 shrink-0 stroke-[2]" />
                      <input
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="Alex Mercer"
                        required
                        className="liquid-glass-input h-11 w-full pl-10 pr-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 px-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 shrink-0 stroke-[2]" />
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="name@example.com"
                      required
                      className="liquid-glass-input h-11 w-full pl-10 pr-3.5 text-xs font-semibold text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                {mode !== 'forgot_password' && (
                  <div>
                    <div className="flex items-center justify-between mb-1 px-1">
                      <label className="text-[11px] font-bold text-slate-600">Password</label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          onClick={() => switchAuthMode('forgot_password')}
                          className="text-[11px] font-medium text-[#208AEF] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 shrink-0 stroke-[2]" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        placeholder="••••••••"
                        required
                        minLength={6}
                        className="liquid-glass-input h-11 w-full pl-10 pr-10 text-xs font-semibold text-slate-800 placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-slate-400 active:text-slate-700 p-1 cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 shrink-0 stroke-[2]" />
                        ) : (
                          <Eye className="h-4 w-4 shrink-0 stroke-[2]" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full liquid-btn-primary font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-60 text-xs shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <>
                      <span>
                        {mode === 'signup'
                          ? 'Send 6-Digit Verification Code'
                          : mode === 'forgot_password'
                          ? 'Send Reset Code'
                          : 'Sign In'}
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 stroke-[2.2]" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
          </div>
        </div>

        {/* Security Statement */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500 font-medium">
          <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.2]" />
          <span>End-to-end user isolation • 100% private library</span>
        </div>
      </div>
    </div>
  );
};
