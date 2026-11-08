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

  // Quick fill default tester account for instant product access
  const handleQuickSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.login('alex@example.com', 'password123');
      onAuthSuccess(res.user);
    } catch {
      // If user doesn't exist yet, register
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
    <div className="flex min-h-[100dvh] w-full flex-col justify-between bg-slate-950 px-6 pt-12 pb-8 text-slate-100 sm:mx-auto sm:max-w-md sm:justify-center sm:py-16">
      {/* Brand & Hero */}
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/30 ring-1 ring-white/20">
          <Camera className="h-8 w-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">RECALL</h1>
        <p className="mt-1.5 text-xs font-medium tracking-wide text-indigo-400 uppercase">
          Save Once • Find Later
        </p>
        <p className="mt-2 text-sm text-slate-400 max-w-xs">
          A private search engine for your screenshot history. Find chat conversations, game stats, and visual objects instantly.
        </p>
      </div>

      {/* Main Auth Form Container */}
      <div className="my-auto w-full py-6">
        {/* Tab Switcher */}
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`rounded-lg py-2.5 text-xs font-semibold transition-all ${
              !isSignUp ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
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
            className={`rounded-lg py-2.5 text-xs font-semibold transition-all ${
              isSignUp ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative flex items-center">
                <UserIcon className="absolute left-3.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Mercer"
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 font-semibold text-white shadow-lg shadow-indigo-600/30 transition-transform active:scale-[0.98] disabled:opacity-60"
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

        {/* Quick Sign-In Option for immediate testing */}
        <div className="mt-4 pt-4 border-t border-slate-900 text-center">
          <button
            type="button"
            onClick={handleQuickSignIn}
            disabled={loading}
            className="w-full py-2.5 rounded-xl border border-slate-800 bg-slate-900/70 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            Quick Sign In with Default Account
          </button>
        </div>
      </div>

      {/* Security Statement */}
      <div className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">
        <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span>End-to-end user isolation • 100% private library</span>
      </div>
    </div>
  );
};
