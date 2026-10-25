import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users2,
  CalendarCheck,
  CalendarDays,
  Receipt,
  Megaphone,
  ShieldAlert,
  UserCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function Sidebar({ currentRole, activeTab, onSelectTab }) {
  const getNavItems = () => {
    switch (currentRole) {
      case 'admin':
        return [
          { id: 'dashboard', label: 'Company Dashboard', icon: LayoutDashboard },
          { id: 'org_setup', label: 'Organization Setup', icon: Building2 },
          { id: 'users', label: 'User & Access Control', icon: Users2 },
          { id: 'employees', label: 'Employee Directory', icon: UserCircle },
          { id: 'attendance', label: 'Attendance Board', icon: CalendarCheck },
          { id: 'leave', label: 'Leave Overview', icon: CalendarDays },
          { id: 'payroll', label: 'Monthly Payroll', icon: Receipt },
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'audit', label: 'System Audit Logs', icon: ShieldAlert }
        ];

      case 'hr':
        return [
          { id: 'dashboard', label: 'HR Dashboard', icon: LayoutDashboard },
          { id: 'employees', label: 'Employee Operations', icon: Users2 },
          { id: 'attendance', label: 'Daily Attendance & Corrections', icon: CalendarCheck },
          { id: 'leave', label: 'Leave Approval Inbox', icon: CalendarDays },
          { id: 'payroll', label: 'Payroll Preparation', icon: Receipt },
          { id: 'announcements', label: 'Announcements', icon: Megaphone }
        ];

      case 'employee':
      default:
        return [
          { id: 'dashboard', label: 'Self-Service Home', icon: LayoutDashboard },
          { id: 'attendance', label: 'Attendance & Camera Check-in', icon: CalendarCheck },
          { id: 'leave', label: 'My Leaves & Apply', icon: CalendarDays },
          { id: 'payroll', label: 'My Payslips', icon: Receipt },
          { id: 'profile', label: 'My 360 Profile', icon: UserCircle }
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-4 hidden md:flex transition-colors">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {currentRole === 'admin' ? 'Company Level Menu' : currentRole === 'hr' ? 'HR Operations Menu' : 'Employee Self-Service'}
          </div>
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Module Architecture Quick Footnote */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          HCM Lite System
        </div>
        <div className="text-[10px] leading-relaxed">
          9 Modules · Server Enforced RBAC · Real-time Tool Calling AI
        </div>
      </div>
    </aside>
  );
}
