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
      const res = await api.loginDemo();
      onAuthSuccess(res.user);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full flex-col justify-between bg-[#EEF4FB] px-6 pt-12 pb-8 text-slate-900 sm:mx-auto sm:max-w-md sm:justify-center sm:py-16 relative overflow-hidden font-sans">
      {/* Packwise Expo VisionOS Style Aurora Mesh */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div
          className="vision-blob"
          style={{
            background: 'radial-gradient(circle, rgba(90, 169, 255, 0.55) 0%, transparent 70%)',
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
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.50) 0%, transparent 70%)',
            width: '60vw',
            height: '60vw',
            bottom: '15%',
            right: '-10%',
            animation: 'floatWide3 28s ease-in-out infinite',
          }}
        />
        <div
          className="vision-blob"
          style={{
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.45) 0%, transparent 70%)',
            width: '70vw',
            height: '70vw',
            top: '30%',
            left: '15%',
            animation: 'floatWide2 26s ease-in-out infinite',
          }}
        />
        <div
          className="vision-blob"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.38) 0%, transparent 70%)',
            width: '60vw',
            height: '60vw',
            bottom: '-10%',
            left: '-10%',
            animation: 'floatWide4 30s ease-in-out infinite',
          }}
        />
      </div>

      {/* Brand & Hero with Plump 3D Liquid Pod */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-3.5 flex h-18 w-18 items-center justify-center rounded-[26px] liquid-btn-primary text-white shadow-xl">
          <Camera className="h-9 w-9 stroke-[2.4]" />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-slate-900">RECALL</h1>
        <p className="mt-1 text-xs text-slate-600 font-bold">
          Private search engine for personal screenshot history
        </p>
      </div>

      {/* Main Plump Liquid Glass Form Container */}
      <div className="relative z-10 my-auto w-full py-6">
        <div className="liquid-glass-container rounded-[34px] p-7 shadow-2xl">
          {/* Plump Filter Chips for Auth Mode Switcher */}
          <div className="mb-5 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`liquid-filter-chip flex-1 ${!isSignUp ? 'liquid-filter-chip-active' : ''}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
              }}
              className={`liquid-filter-chip flex-1 ${isSignUp ? 'liquid-filter-chip-active' : ''}`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-[20px] border-2 border-rose-300 bg-rose-50/95 p-3.5 text-xs text-rose-700 font-black shadow-2xs backdrop-blur-md relative z-10">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-black text-slate-800 mb-1.5 px-1 uppercase tracking-wide">Full Name</label>
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-4 h-4.5 w-4.5 text-slate-400 shrink-0 stroke-[2.4]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Mercer"
                    required
                    className="liquid-glass-input h-13 w-full pl-11 pr-4 text-xs font-black text-slate-900 placeholder-slate-400"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-black text-slate-800 mb-1.5 px-1 uppercase tracking-wide">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 h-4.5 w-4.5 text-slate-400 shrink-0 stroke-[2.4]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="liquid-glass-input h-13 w-full pl-11 pr-4 text-xs font-black text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-800 mb-1.5 px-1 uppercase tracking-wide">Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 h-4.5 w-4.5 text-slate-400 shrink-0 stroke-[2.4]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="liquid-glass-input h-13 w-full pl-11 pr-11 text-xs font-black text-slate-900 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 active:text-slate-800 p-1.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5 shrink-0 stroke-[2.4]" /> : <Eye className="h-4.5 w-4.5 shrink-0 stroke-[2.4]" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex h-13 w-full items-center justify-center gap-2 rounded-full liquid-btn-primary font-black text-white active:scale-[0.98] transition-transform disabled:opacity-60 text-xs shadow-lg cursor-pointer"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 stroke-[2.6]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Sign-In Option */}
          <div className="mt-4 pt-4 border-t border-slate-200/80 text-center relative z-10">
            <button
              type="button"
              onClick={handleQuickSignIn}
              disabled={loading}
              className="h-12 w-full rounded-full liquid-glass-pill text-xs font-black text-[#2F6BFF] active:scale-[0.98] transition-transform flex items-center justify-center shadow-xs cursor-pointer"
            >
              Quick Sign In with Default Account
            </button>
          </div>
        </div>
      </div>

      {/* Security Statement */}
      <div className="relative z-10 flex items-center justify-center gap-2 text-center text-[11px] text-slate-700 font-bold">
        <Shield className="h-4 w-4 text-emerald-600 shrink-0 stroke-[2.6]" />
        <span>End-to-end user isolation • 100% private library</span>
      </div>
    </div>
  );
};
