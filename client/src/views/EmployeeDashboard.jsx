import React, { useState, useEffect } from 'react';
import {
  Clock,
  CalendarCheck,
  CalendarDays,
  Receipt,
  Sparkles,
  Camera,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  Download,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import { downloadPayslipPDF } from '../utils/pdfGenerator';

export default function EmployeeDashboard({ onOpenAiChat, onOpenCameraCheckIn }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingInOut, setCheckingInOut] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/dashboards/employee');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleWebCheckIn = async () => {
    setCheckingInOut(true);
    setActionMessage(null);
    try {
      const res = await apiRequest('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ source: 'web' })
      });
      setActionMessage({ type: 'success', text: res.message || 'Checked in successfully' });
      fetchDashboard();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Check-in failed' });
    } finally {
      setCheckingInOut(false);
    }
  };

  const handleWebCheckOut = async () => {
    setCheckingInOut(true);
    setActionMessage(null);
    try {
      const res = await apiRequest('/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({})
      });
      setActionMessage({ type: 'success', text: res.message || 'Checked out successfully' });
      fetchDashboard();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Check-out failed' });
    } finally {
      setCheckingInOut(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          Loading your self-service portal...
        </div>
      </div>
    );
  }

  const {
    employee,
    today_attendance,
    hours_this_week,
    weekly_target_hours = 40,
    late_count_this_month,
    leave_balances,
    last_payslip,
    recent_announcements
  } = data || {};

  const hoursProgress = Math.min(100, Math.round(((hours_this_week || 0) / weekly_target_hours) * 100));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={employee?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=employee'}
            alt="Profile"
            className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/40 object-cover shadow-inner"
          />
          <div>
            <div className="text-xs uppercase tracking-wider text-blue-200 font-bold">
              {employee?.department} · {employee?.code}
            </div>
            <h1 className="text-2xl font-black tracking-tight">{employee?.name}</h1>
            <div className="text-xs text-blue-100">{employee?.designation}</div>
          </div>
        </div>

        <button
          onClick={onOpenAiChat}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white font-bold text-xs transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          Ask My AI Assistant
        </button>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {actionMessage.text}
        </div>
      )}

      {/* Main Grid: Check-In Widget & Weekly Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check-In Widget (Section 7) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Widget</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                today_attendance
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {today_attendance ? (today_attendance.check_out_time ? 'Completed Today' : 'Checked In') : 'Not Checked In'}
              </span>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Check In Time:</span>
                <strong className="text-slate-800 dark:text-slate-200">{today_attendance?.check_in_time || '--:--'}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Check Out Time:</span>
                <strong className="text-slate-800 dark:text-slate-200">{today_attendance?.check_out_time || '--:--'}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Today Status:</span>
                <span className="capitalize font-bold text-blue-600 dark:text-blue-400">{today_attendance?.status || 'Pending'}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {!today_attendance ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleWebCheckIn}
                  disabled={checkingInOut}
                  className="py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  {checkingInOut ? 'Marking...' : 'Web Check In'}
                </button>
                <button
                  onClick={onOpenCameraCheckIn}
                  className="py-3 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Camera Check In
                </button>
              </div>
            ) : !today_attendance.check_out_time ? (
              <button
                onClick={handleWebCheckOut}
                disabled={checkingInOut}
                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition cursor-pointer"
              >
                {checkingInOut ? 'Checking Out...' : 'Check Out Now'}
              </button>
            ) : (
              <div className="py-2.5 text-center text-xs text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900 rounded-xl">
                Attendance finalized for today
              </div>
            )}
          </div>
        </div>

        {/* Work Hours & Late Counts */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Weekly Work Hours</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">{hours_this_week || 0} hrs</span>
              <span className="text-xs text-slate-400">/ {weekly_target_hours} hrs target</span>
            </div>

            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400">
                <span>Progress</span>
                <span>{hoursProgress}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${hoursProgress}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-200">Late Arrivals This Month</div>
              <div className="text-[11px] text-slate-400">After 09:15 grace limit</div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black ${
              late_count_this_month > 0
                ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
            }`}>
              {late_count_this_month || 0} Lates
            </span>
          </div>
        </div>

        {/* Last Payslip Quick Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Latest Payslip</span>
              <Receipt className="w-4 h-4 text-blue-500" />
            </div>

            {last_payslip ? (
              <div className="mt-2 space-y-2">
                <div className="text-xs text-slate-500">Period: {last_payslip.month}/{last_payslip.year}</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  Rs. {last_payslip.net_salary.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                  Net salary disbursed
                </div>
              </div>
            ) : (
              <div className="py-6 text-xs text-slate-400 text-center">
                No finalized payslips available yet.
              </div>
            )}
          </div>

          {last_payslip && (
            <button
              onClick={() => downloadPayslipPDF(last_payslip, employee, null)}
              className="mt-4 w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Download Payslip PDF
            </button>
          )}
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div>
        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-500" />
          My Leave Balances (Statutory Quotas)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {leave_balances?.map(lb => (
            <div key={lb.leave_type.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{lb.leave_type.name}</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {lb.remaining} <span className="text-xs font-normal text-slate-400">days left</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Used: {lb.used} · Quota: {lb.quota}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-blue-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Company Announcements</h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
          {recent_announcements?.length === 0 ? (
            <div className="text-xs text-slate-400 py-4 text-center">No announcements posted.</div>
          ) : (
            recent_announcements?.map(ann => (
              <div key={ann.id} className="py-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                    ann.priority === 'urgent' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {ann.priority}
                  </span>
                  <span className="font-bold text-xs text-slate-900 dark:text-white">{ann.title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{ann.content}</p>
                <div className="text-[10px] text-slate-400 mt-1">
                  Posted by {ann.author_name} · {new Date(ann.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
