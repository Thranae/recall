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
      <div className="pointer-events-none fixed top-[-10%] left-[-15%] w-[400px] h-[400px] rounded-full bg-blue-600/15 blur-[120px]" />
      <div className="pointer-events-none fixed bottom-[5%] right-[-15%] w-[400px] h-[400px] rounded-full bg-indigo-600/15 blur-[120px]" />

      {/* Brand & Hero */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-4 flex h-17 w-17 items-center justify-center rounded-[22px] ios-plump-primary">
          <Camera className="h-8 w-8 text-white drop-shadow-md shrink-0" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">RECALL</h1>
        <p className="mt-1.5 text-xs font-bold tracking-wider text-blue-300 uppercase">
          Save Once • Find Later
        </p>
        <p className="mt-2 text-xs text-white/60 max-w-xs leading-relaxed">
          A private search engine for your screenshot history. Find chat conversations, game stats, and visual objects instantly.
        </p>
      </div>

      {/* Main Liquid Glass Form Container */}
      <div className="relative z-10 my-auto w-full py-6">
        <div className="rounded-[32px] ios-plump-card p-6">
          {/* iOS 27 Plumpy Segmented Switcher */}
          <div className="mb-6 grid grid-cols-2 rounded-full ios-plump-pill p-1">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`h-10 rounded-full text-xs font-bold transition-transform duration-100 ease-out active:scale-95 flex items-center justify-center ${
                !isSignUp
                  ? 'ios-plump-primary text-white'
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
              className={`h-10 rounded-full text-xs font-bold transition-transform duration-100 ease-out active:scale-95 flex items-center justify-center ${
                isSignUp
                  ? 'ios-plump-primary text-white'
                  : 'text-white/60 active:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-[18px] border border-red-400/40 bg-gradient-to-b from-red-500/25 to-red-700/20 p-3.5 text-xs text-red-200 shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.35)]">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-semibold text-white/70 mb-1.5 px-1">Full Name</label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3.5 h-4 w-4 text-white/45 shrink-0" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Mercer"
                    required
                    className="h-12 w-full rounded-[18px] ios-plump-pill pl-10 pr-4 text-xs text-white placeholder-white/35 focus:outline-none font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-white/70 mb-1.5 px-1">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-white/45 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="h-12 w-full rounded-[18px] ios-plump-pill pl-10 pr-4 text-xs text-white placeholder-white/35 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-white/70 mb-1.5 px-1">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-white/45 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="h-12 w-full rounded-[18px] ios-plump-pill pl-10 pr-10 text-xs text-white placeholder-white/35 focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-white/40 active:text-white p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4 shrink-0" /> : <Eye className="h-4 w-4 shrink-0" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-full ios-plump-primary font-bold text-white active:scale-[0.98] transition-transform disabled:opacity-60 text-xs"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </>
              )}
            </button>
          </form>

          {/* Quick Sign-In Option */}
          <div className="mt-4 pt-4 border-t border-white/[0.12] text-center">
            <button
              type="button"
              onClick={handleQuickSignIn}
              disabled={loading}
              className="h-11 w-full rounded-full ios-plump-pill text-xs font-semibold text-white/85 active:scale-[0.98] transition-transform flex items-center justify-center"
            >
              Quick Sign In with Default Account
            </button>
          </div>
        </div>
      </div>

      {/* Security Statement */}
      <div className="relative z-10 flex items-center justify-center gap-2 text-center text-[11px] text-white/50">
        <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span>End-to-end user isolation • 100% private library</span>
      </div>
    </div>
  );
};
