import React, { useState } from 'react';
import { Camera, Lock, Mail, User as UserIcon, Shield, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import type { User } from '../types';

interface AuthViewProps {
  onAuthSuccess: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onAuthSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (!email.trim()) throw new Error('Please enter your email address');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        const res = await api.register(email.trim(), password, name.trim());
        onAuthSuccess(res.user);
      } else {
        if (!email.trim() || !password) throw new Error('Please enter your email and password');
        const res = await api.login(email.trim(), password);
        onAuthSuccess(res.user);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login('alex@example.com', 'password123');
      onAuthSuccess(res.user);
    } catch {
      try {
        const regRes = await api.register('alex@example.com', 'password123', 'Alex Mercer');
        onAuthSuccess(regRes.user);
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col justify-between bg-black px-6 pt-12 pb-8 text-white sm:mx-auto sm:max-w-md sm:justify-center sm:py-16 relative overflow-hidden">
      {/* Background ambient lighting for liquid glass refraction */}
      <div className="pointer-events-none fixed top-[-10%] left-[-15%] w-[380px] h-[380px] rounded-full bg-blue-600/15 blur-[100px]" />
      <div className="pointer-events-none fixed bottom-[5%] right-[-15%] w-[380px] h-[380px] rounded-full bg-purple-600/15 blur-[100px]" />

      {/* Brand & Hero */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.55),0_8px_24px_rgba(0,122,255,0.45)] border border-white/30">
          <Camera className="h-8 w-8 text-white drop-shadow-md" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">RECALL</h1>
        <p className="mt-1.5 text-xs font-semibold tracking-wider text-blue-300 uppercase">
          Save Once • Find Later
        </p>
        <p className="mt-2 text-xs text-white/60 max-w-xs leading-relaxed">
          A private search engine for your screenshot history. Find chat conversations, game stats, and visual objects instantly.
        </p>
      </div>

      {/* Main Liquid Glass Form Container */}
      <div className="relative z-10 my-auto w-full py-6">
        <div className="rounded-[28px] border border-white/12 bg-white/[0.06] backdrop-blur-3xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.5)]">
          {/* iOS Liquid Segmented Switcher */}
          <div className="mb-5 grid grid-cols-2 rounded-full bg-white/[0.08] backdrop-blur-2xl p-1 border border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`rounded-full py-2 text-xs font-semibold transition-all active:scale-95 ${
                !isSignUp
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,122,255,0.3)]'
                  : 'text-white/60 active:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
              }}
              className={`rounded-full py-2 text-xs font-semibold transition-all active:scale-95 ${
                isSignUp
                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_8px_rgba(0,122,255,0.3)]'
                  : 'text-white/60 active:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-[16px] border border-red-400/30 bg-red-500/15 backdrop-blur-xl p-3 text-xs text-red-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-medium text-white/70 mb-1 px-1">Full Name</label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3.5 h-4 w-4 text-white/40" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Mercer"
                    required
                    className="w-full rounded-[16px] border border-white/12 bg-white/[0.06] backdrop-blur-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] focus:border-blue-400/50 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1 px-1">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-[16px] border border-white/12 bg-white/[0.06] backdrop-blur-xl py-3 pl-10 pr-4 text-xs text-white placeholder-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] focus:border-blue-400/50 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-white/70 mb-1 px-1">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-[16px] border border-white/12 bg-white/[0.06] backdrop-blur-xl py-3 pl-10 pr-10 text-xs text-white placeholder-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] focus:border-blue-400/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-white/40 active:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 font-semibold text-white border border-white/25 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.45),0_6px_20px_rgba(0,122,255,0.4)] active:scale-[0.98] transition-transform disabled:opacity-60 text-xs"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Sign-In Option */}
          <div className="mt-4 pt-3.5 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={handleQuickSignIn}
              disabled={loading}
              className="w-full py-2.5 rounded-full border border-white/12 bg-white/[0.06] backdrop-blur-xl text-xs font-medium text-white/80 active:scale-[0.98] active:bg-white/15 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
            >
              Quick Sign In with Default Account
            </button>
          </div>
        </div>
      </div>

      {/* Security Statement */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/50">
        <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span>End-to-end user isolation • 100% private library</span>
      </div>
    </div>
  );
};
