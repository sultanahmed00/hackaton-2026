import React, { useState } from 'react';
import { Lock, Mail, ShieldAlert, Sparkles, CheckCircle2, UserCheck } from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function LoginModal({ onLoginSuccess, onSeedDemo }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      onLoginSuccess(res.token, res.user);
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail, quickPassword = 'Password@123') => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setLoading(true);
    setError(null);

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: quickEmail, password: quickPassword })
      });
      onLoginSuccess(res.token, res.user);
    } catch (err) {
      setError(err.message || 'Account not found. Please click "Seed Demo Data" first.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Decorative Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-blue-600/15 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-400 mx-auto flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/25 mb-3">
            H
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Sign In to HCM Lite</h2>
          <p className="text-slate-400 text-xs mt-1">Saylani Hackathon · Role-Based HR Management</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-blue-500 text-white text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-blue-500 text-white text-xs outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Demo Credentials for Judges */}
        <div className="mt-6 pt-6 border-t border-slate-700/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3 flex items-center justify-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
            1-Click Demo Logins for Judges
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('admin@saylani.org')}
              className="px-2 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-purple-300 transition text-center cursor-pointer"
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickLogin('hr@saylani.org')}
              className="px-2 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-emerald-300 transition text-center cursor-pointer"
            >
              HR Ops
            </button>
            <button
              onClick={() => handleQuickLogin('ali@saylani.org')}
              className="px-2 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-amber-300 transition text-center cursor-pointer"
            >
              Employee
            </button>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={onSeedDemo}
              className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Not seeded yet? Click to seed demo data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
