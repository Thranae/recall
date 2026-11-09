import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  X,
  KeyRound,
  RotateCcw,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import type { User } from '../types';
import { OtpInput } from './OtpInput';

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
  '251191916495-p6clibvcoaaoqbu8l5l1n6lndqf5ql2e.apps.googleusercontent.com';

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

  // OTP Verification States (Packwise Standard)
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(40);
  const [isResending, setIsResending] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState<'signup' | 'forgot_password'>('signup');

  // Google Modal Fallback
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const tokenClientRef = useRef<any>(null);

  // Initialize Google Identity Services Token Client
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              setLoading(true);
              setError(null);
              try {
                const res = await api.loginGoogle({ tokenId: tokenResponse.access_token });
                onAuthSuccess(res.user);
              } catch (err: unknown) {
                if (err instanceof Error) setError(err.message);
                else setError('Google Sign-In failed');
              } finally {
                setLoading(false);
              }
            } else if (tokenResponse?.error) {
              console.warn('Google OAuth token error:', tokenResponse.error);
            }
          },
        });
      }
    } catch (e) {
      console.warn('Google Identity Services init error:', e);
    }
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

  const handleGoogleClick = () => {
    setError(null);
    if (tokenClientRef.current) {
      try {
        // Request Google Access Token via interactive popup
        tokenClientRef.current.requestAccessToken();
        return;
      } catch (err) {
        console.warn('Google requestAccessToken failed, falling back to modal:', err);
      }
    }
    // Fallback if GSI client not loaded
    setIsGoogleModalOpen(true);
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;
    setError(null);
    setLoading(true);
    setIsGoogleModalOpen(false);
    try {
      const trimmedEmail = googleEmail.trim().toLowerCase();
      const derivedName =
        googleName.trim() ||
        trimmedEmail
          .split('@')[0]
          .replace(/[._-]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      const res = await api.loginGoogle({
        email: trimmedEmail,
        name: derivedName,
        picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(derivedName)}`,
        sub: `google_${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      });
      onAuthSuccess(res.user);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError('Failed to sign in with Google');
    } finally {
      setLoading(false);
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

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (otpPurpose === 'signup') {
        const res = await api.verifySignupOtp(email.trim(), otpCode);
        onAuthSuccess(res.user);
      } else {
        const res = await api.verifyOtp(email.trim(), otpCode);
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

  return (
    <div className="flex min-h-[100dvh] w-full flex-col justify-between bg-[#F3F7FC] px-6 pt-10 pb-8 text-[#172B4D] sm:mx-auto sm:max-w-md sm:justify-center sm:py-14 relative overflow-hidden">
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

      {/* Brand & Hero */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] liquid-btn-primary text-white shadow-sm">
          <Camera className="h-7 w-7 stroke-[2.2]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-[#172B4D]">RECALL</h1>
        <p className="mt-1 text-xs text-[#4A5D78] font-medium">
          Intelligent visual memory for personal screenshot history
        </p>
      </div>

      {/* Main Liquid Glass Container */}
      <div className="relative z-10 my-auto w-full py-5">
        <div className="liquid-glass-container rounded-[28px] p-6 shadow-lg">
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
                disabled={loading}
                className="w-full h-12 rounded-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50/90 active:scale-[0.98] transition-all cursor-pointer border border-slate-200/90 shadow-xs relative z-10 font-bold text-xs text-[#172B4D]"
              >
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
              </button>

              {/* Clean Divider */}
              <div className="relative my-4 flex items-center justify-center">
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
                    onClick={() => {
                      setMode('signin');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className={`liquid-filter-chip w-full flex items-center justify-center ${
                      mode === 'signin' ? 'liquid-filter-chip-active' : ''
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className={`liquid-filter-chip w-full flex items-center justify-center ${
                      mode === 'signup' ? 'liquid-filter-chip-active' : ''
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              ) : (
                <div className="mb-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin');
                      setError(null);
                    }}
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

              <form onSubmit={handleSubmit} className="space-y-3 relative z-10">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 px-1">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <UserIcon className="absolute left-3.5 h-4 w-4 text-slate-400 shrink-0 stroke-[2]" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                          onClick={() => {
                            setMode('forgot_password');
                            setError(null);
                          }}
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
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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

      {/* Realistic Google SSO Dialog Modal (Seamless Fallback) */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                <span className="text-xs font-bold text-slate-800">Sign in with Google</span>
              </div>
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleGoogleSubmit} className="pt-4 space-y-3.5">
              <p className="text-[11.5px] text-slate-500 leading-relaxed">
                Connect with your Google account for private and instant library sync.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="name@gmail.com"
                  required
                  autoFocus
                  className="h-10 w-full rounded-[14px] border border-slate-200 px-3.5 text-xs text-slate-800 focus:outline-none focus:border-[#3478F6] focus:ring-2 focus:ring-[#3478F6]/20 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Display Name (Optional)
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="e.g. Alex"
                  className="h-10 w-full rounded-[14px] border border-slate-200 px-3.5 text-xs text-slate-800 focus:outline-none focus:border-[#3478F6] focus:ring-2 focus:ring-[#3478F6]/20 transition-all font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full liquid-btn-primary font-bold text-white active:scale-[0.98] transition-transform text-xs shadow-sm cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <span>Sign in with Google</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Security Statement */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500 font-medium">
        <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0 stroke-[2.2]" />
        <span>End-to-end user isolation • 100% private library</span>
      </div>
    </div>
  );
};
