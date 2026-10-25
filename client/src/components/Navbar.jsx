import React, { useState } from 'react';
import {
  Bell,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  UserCheck,
  ShieldAlert,
  Users,
  LogOut,
  KeyRound,
  CheckCircle2,
  ChevronDown,
  Building2
} from 'lucide-react';

export default function Navbar({
  currentUser,
  companyName,
  theme,
  setTheme,
  onLogout,
  onOpenPasswordModal,
  onOpenNotifications,
  unreadCount,
  onSeedDemo,
  onResetSystem,
  onSwitchUser,
  onOpenAiChat
}) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [quickSwitchOpen, setQuickSwitchOpen] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Admin</span>;
      case 'hr':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">HR Operations</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Employee</span>;
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Saylani Hackathon Top Ribbon */}
      <div className="bg-gradient-to-r from-sky-900 via-teal-900 to-slate-900 text-white text-xs px-4 py-1.5 flex flex-wrap items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-sky-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            SAYLANI HACKATHON 2026
          </div>
          <span className="hidden sm:inline text-slate-400">·</span>
          <span className="hidden sm:inline text-slate-300">Zaitoon Ashraf IT Park · 24 October 2026</span>
        </div>

        {/* Quick Testing Actions for Judges */}
        <div className="flex items-center gap-3">
          <button
            onClick={onSeedDemo}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-600/90 hover:bg-emerald-500 text-white transition shadow-xs cursor-pointer"
            title="Seed 3 Employees, Attendance & Leaves for instant testing"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            Seed Demo Data
          </button>
          <button
            onClick={onResetSystem}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-700/80 hover:bg-rose-600 text-white transition shadow-xs cursor-pointer"
            title="Wipe database back to empty First-Run state"
          >
            <RotateCcw className="w-3 h-3" />
            Fresh Install Reset
          </button>
        </div>
      </div>

      {/* Main Navbar Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Company Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-xl">
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">HCM Lite</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                AI Powered
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Building2 className="w-3 h-3 text-slate-400" />
              <span className="font-medium truncate max-w-[180px]">{companyName || 'Saylani Tech Solutions'}</span>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Judge Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setQuickSwitchOpen(!quickSwitchOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Role Switcher:</span>
              {getRoleBadge(currentUser?.role)}
              <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {quickSwitchOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                onMouseLeave={() => setQuickSwitchOpen(false)}
              >
                <div className="px-3 py-1 font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[10px]">
                  Switch Role / Test Accounts
                </div>
                <button
                  onClick={() => { onSwitchUser('admin@saylani.org'); setQuickSwitchOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between text-slate-800 dark:text-slate-200"
                >
                  <div>
                    <div className="font-semibold">Admin (Full Control)</div>
                    <div className="text-[10px] text-slate-400">admin@saylani.org</div>
                  </div>
                  {currentUser?.role === 'admin' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </button>
                <button
                  onClick={() => { onSwitchUser('hr@saylani.org'); setQuickSwitchOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between text-slate-800 dark:text-slate-200"
                >
                  <div>
                    <div className="font-semibold">HR Manager</div>
                    <div className="text-[10px] text-slate-400">hr@saylani.org</div>
                  </div>
                  {currentUser?.role === 'hr' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </button>
                <button
                  onClick={() => { onSwitchUser('ali@saylani.org'); setQuickSwitchOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between text-slate-800 dark:text-slate-200"
                >
                  <div>
                    <div className="font-semibold">Employee (M. Ali)</div>
                    <div className="text-[10px] text-slate-400">ali@saylani.org</div>
                  </div>
                  {currentUser?.email === 'ali@saylani.org' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </button>
                <button
                  onClick={() => { onSwitchUser('fatima@saylani.org'); setQuickSwitchOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center justify-between text-slate-800 dark:text-slate-200"
                >
                  <div>
                    <div className="font-semibold">Employee on Leave (Fatima)</div>
                    <div className="text-[10px] text-slate-400">fatima@saylani.org</div>
                  </div>
                  {currentUser?.email === 'fatima@saylani.org' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </button>
              </div>
            )}
          </div>

          {/* AI Assistant Quick Launcher */}
          <button
            onClick={onOpenAiChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="hidden md:inline">AI Assistant</span>
          </button>

          {/* Dark / Light Toggle (+10 Bonus) */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Toggle Dark Mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="In-app Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{currentUser?.name || 'User'}</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">{currentUser?.role}</div>
              </div>
              <img
                src={currentUser?.employee?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.name || 'user')}`}
                alt="Avatar"
                className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 object-cover"
              />
            </button>

            {profileDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs animate-in fade-in"
                onMouseLeave={() => setProfileDropdownOpen(false)}
              >
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="font-semibold text-slate-900 dark:text-white">{currentUser?.name}</div>
                  <div className="text-slate-400 truncate">{currentUser?.email}</div>
                </div>

                <button
                  onClick={() => { onOpenPasswordModal(); setProfileDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-2"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                  Change Password
                </button>

                <button
                  onClick={() => { onLogout(); setProfileDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
