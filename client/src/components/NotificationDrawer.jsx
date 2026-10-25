import React from 'react';
import { Bell, X, Check, CalendarDays, Receipt, Clock, Sparkles } from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function NotificationDrawer({ isOpen, onClose, notifications, onRefresh }) {
  if (!isOpen) return null;

  const handleMarkRead = async (id) => {
    try {
      await apiRequest(`/comms/notifications/${id}/read`, { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiRequest('/comms/notifications/mark-all-read', { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'leave':
        return <CalendarDays className="w-4 h-4 text-emerald-500" />;
      case 'payroll':
        return <Receipt className="w-4 h-4 text-blue-500" />;
      case 'attendance':
        return <Clock className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose}></div>

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-sm bg-white dark:bg-slate-800 shadow-2xl border-l border-slate-200 dark:border-slate-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Notifications</h3>
            </div>
            <div className="flex items-center gap-2">
              {notifications.some(n => !n.is_read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No notifications right now.
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                    n.is_read
                      ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-70'
                      : 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900/60 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{n.title}</span>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1.5 block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
