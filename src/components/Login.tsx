import React, { useState } from 'react';
import { Lock, User, LogIn, Eye, EyeOff, Cloud } from 'lucide-react';
import { handleLocalApiFallback } from '../utils/vercelApiFallback';
import { signInWithGoogleCloud } from '../firebase';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const performLogin = async (rawUser: string, rawPass: string) => {
    setError('');
    setLoading(true);

    const cleanUser = rawUser.trim();
    const cleanPass = rawPass.trim();

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      if (res.ok) {
        const user = await res.json();
        onLogin(user);
        return;
      }

      // Fallback to local auth handler (for Vercel static hosting or offline mode)
      const fallbackRes = await handleLocalApiFallback('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      if (fallbackRes.ok) {
        const user = await fallbackRes.json();
        onLogin(user);
        return;
      }

      setError(
        'Username သို့မဟုတ် Password မှားယွင်းနေပါသည်။ (Invalid username or password)'
      );
    } catch {
      // Offline / static fallback
      const fallbackRes = await handleLocalApiFallback('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });
      if (fallbackRes.ok) {
        const user = await fallbackRes.json();
        onLogin(user);
        return;
      }
      setError('Username သို့မဟုတ် Password မှားယွင်းနေပါသည်။ (Invalid username or password)');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(username, password);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const fbUser = await signInWithGoogleCloud();
      const isAdminEmail = fbUser.email === 'satshwe36@gmail.com';
      onLogin({
        id: 1,
        username: fbUser.displayName || fbUser.email?.split('@')[0] || 'Admin',
        role: isAdminEmail ? 'admin' : 'manager',
        email: fbUser.email,
      });
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-lg p-4">
            <img
              src="/logo.svg"
              alt="A_Yaung POS System"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '/icon.svg';
              }}
            />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          A_Yaung POS System
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to access your dashboard (အကောင့်ဝင်ရန်)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs sm:text-sm leading-relaxed">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Username (အသုံးပြုသူအမည်)
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors bg-slate-50 focus:bg-white"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password (စကားဝှက်)
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors bg-slate-50 focus:bg-white"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  'Signing in...'
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign in (ဝင်မည်)</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-slate-500">
                  Firebase Cloud Sync (Google အကောင့်ဖြင့် ချိတ်ဆက်ဝင်ရန်)
                </span>
              </div>
            </div>
            <div className="mt-4">
              <button
                type="button"
                disabled={loading || googleLoading}
                onClick={handleGoogleLogin}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-slate-300 rounded-xl shadow-2xs text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>
                  {googleLoading
                    ? 'Connecting to Firebase...'
                    : 'Sign in with Google (Cloud DB)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
