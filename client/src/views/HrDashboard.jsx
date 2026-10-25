import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  CalendarDays,
  Clock,
  AlertCircle,
  Sparkles,
  TrendingUp,
  BarChart2,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function HrDashboard({ onOpenAiChat }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryBullets, setSummaryBullets] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchDashboard();
    fetchDepartments();
  }, [selectedDept]);

  const fetchDepartments = async () => {
    try {
      const depts = await apiRequest('/setup/departments');
      setDepartments(depts);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const query = selectedDept ? `?department_id=${selectedDept}` : '';
      const res = await apiRequest(`/dashboards/hr${query}`);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!data?.kpis) return;
    setSummaryLoading(true);
    try {
      const res = await apiRequest('/ai/summarize', {
        method: 'POST',
        body: JSON.stringify({ kpis: data.kpis })
      });
      setSummaryBullets(res.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          Loading HR Operations dashboard...
        </div>
      </div>
    );
  }

  const { kpis, attendance_trend, absenteeism_by_dept, leave_utilization, top_late_comers } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            HR Operations Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily attendance status, leave utilization, absenteeism rates and approval queue.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold outline-none"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <button
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-teal-600 hover:opacity-95 text-white shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {summaryLoading ? 'Generating...' : 'AI Summary'}
          </button>
        </div>
      </div>

      {/* AI Summary Card */}
      {summaryBullets && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-indigo-500/10 border border-teal-200 dark:border-teal-800/60 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span className="font-bold text-xs text-teal-900 dark:text-teal-200 uppercase tracking-wider">
                HR Intelligence Summary (Section 4)
              </span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 uppercase">
              AI-Generated
            </span>
          </div>
          <ul className="space-y-1.5">
            {summaryBullets.map((bullet, idx) => (
              <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <span className="text-teal-500 font-bold">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Daily KPIs Grid (Matches Page 1 brief mockup) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Headcount */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Headcount</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {kpis?.headcount || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active Employees</div>
        </div>

        {/* Present Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present Today</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {kpis?.present_today || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Logged in today</div>
        </div>

        {/* On Leave Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-amber-200 dark:border-amber-900/50 shadow-xs">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">On Leave</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {kpis?.on_leave_today || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Approved leaves</div>
        </div>

        {/* Late Today */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-rose-200 dark:border-rose-900/50 shadow-xs">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Late Arrivals</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {kpis?.late_today || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">After grace cutoff</div>
        </div>

        {/* Pending Approvals */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-900/50 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Approvals Needed</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {kpis?.pending_approvals || 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Leaves & corrections</div>
        </div>
      </div>

      {/* Attendance Trend & Absenteeism Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              7-Day Attendance Trend
            </h3>
            <span className="text-[11px] text-slate-400">Present vs Late vs Absent</span>
          </div>

          <div className="space-y-3">
            {attendance_trend?.map(day => {
              const total = Math.max(1, (kpis?.headcount || 1));
              const presentPct = Math.round((day.present / total) * 100);
              const latePct = Math.round((day.late / total) * 100);

              return (
                <div key={day.date} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-slate-600 dark:text-slate-400">{day.date}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      <strong className="text-emerald-600 dark:text-emerald-400">{day.present} Present</strong> · {day.late} Late
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${presentPct}%` }}></div>
                    <div className="bg-rose-500 h-full" style={{ width: `${latePct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Absenteeism by Department */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-rose-500" />
              Absenteeism Rate by Department
            </h3>
            <span className="text-[11px] text-slate-400">Formula: absent ÷ expected days</span>
          </div>

          <div className="space-y-4">
            {absenteeism_by_dept?.map((dept, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-800 dark:text-slate-200">{dept.department_name}</span>
                  <span className={`${dept.rate > 10 ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
                    {dept.rate}% Absenteeism
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      dept.rate > 10 ? 'bg-rose-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(4, dept.rate * 3))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 Late-Comers & Leave Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Late Comers */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Top 5 Late-Comers This Month
            </h3>
            <span className="text-[10px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900">
              3 Lates = 0.5 Day Penalty
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {top_late_comers?.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">No late arrivals logged this month!</div>
            ) : (
              top_late_comers?.map((lateEmp, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">{lateEmp.name}</div>
                      <div className="text-[10px] text-slate-400">{lateEmp.department}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      {lateEmp.late_count} times
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Leave Utilization by Type */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              Leave Utilization by Category
            </h3>
            <span className="text-[11px] text-slate-400">Approved days vs Quotas</span>
          </div>

          <div className="space-y-3">
            {leave_utilization?.map((l, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{l.leave_type}</div>
                  <div className="text-[10px] text-slate-400">Total days approved: {l.days_used}</div>
                </div>
                <div className="text-right font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  Quota: {l.quota}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
