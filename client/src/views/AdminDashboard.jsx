import React, { useState, useEffect } from 'react';
import {
  Users,
  TrendingDown,
  Receipt,
  DollarSign,
  Sparkles,
  ShieldAlert,
  PieChart,
  BarChart3,
  Calendar,
  Building2,
  RefreshCw
} from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function AdminDashboard({ onOpenAiChat }) {
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
      const res = await apiRequest(`/dashboards/admin${query}`);
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
          Loading company metrics...
        </div>
      </div>
    );
  }

  const { kpis, headcount_by_department, gender_distribution, tenure_distribution, recent_audit_feed } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Company Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time organizational health, workforce analytics and financial commitments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold outline-none focus:border-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* AI Summarize Button */}
          <button
            onClick={handleGenerateSummary}
            disabled={summaryLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {summaryLoading ? 'Generating...' : 'AI Summary'}
          </button>
        </div>
      </div>

      {/* AI Summary Card (Section 4 & 7) */}
      {summaryBullets && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 border border-blue-200 dark:border-blue-800/60 shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-bold text-xs text-blue-900 dark:text-blue-200 uppercase tracking-wider">
                AI Executive Insights (Derived from live DB numbers)
              </span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 uppercase">
              AI-Generated
            </span>
          </div>
          <ul className="space-y-1.5">
            {summaryBullets.map((bullet, idx) => (
              <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <span className="text-blue-500 font-bold">•</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Headcount */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Headcount</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {kpis?.headcount || 0}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              Active & probation workforce
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Attrition YTD */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attrition Rate YTD</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {kpis?.attrition_ytd || 0}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Exits ÷ Average Headcount
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        {/* Monthly Payroll Cost */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Payroll Cost</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Rs. {((kpis?.monthly_payroll_cost || 0) / 1000).toFixed(0)}k
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Rs. {(kpis?.monthly_payroll_cost || 0).toLocaleString()}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        {/* Average Salary */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Gross Salary</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              Rs. {(kpis?.average_salary || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Per active employee
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Department Breakdown & Diversity Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount & Payroll Cost by Department */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Department Breakdown & Payroll Weight
            </h3>
          </div>

          <div className="space-y-4">
            {headcount_by_department?.length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">No departments created yet.</div>
            ) : (
              headcount_by_department?.map(dept => {
                const totalEmps = kpis?.headcount || 1;
                const percent = Math.round((dept.count / totalEmps) * 100);
                return (
                  <div key={dept.department_id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{dept.department_name}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {dept.count} employees ({percent}%) · Rs. {dept.payroll_cost.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, percent)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Workforce Demographics & Tenure */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-500" />
              Gender Balance & Tenure Distribution
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Gender */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gender Balance</div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Male</span>
                <span>{gender_distribution?.male || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Female</span>
                <span>{gender_distribution?.female || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>Other</span>
                <span>{gender_distribution?.other || 0}</span>
              </div>
            </div>

            {/* Tenure */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tenure Distribution</div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>&lt; 1 Year</span>
                <span>{tenure_distribution?.under1Year || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>1 - 2 Years</span>
                <span>{tenure_distribution?.oneToTwoYears || 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>&gt; 2 Years</span>
                <span>{tenure_distribution?.overTwoYears || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live System Audit Feed */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Live System Audit Feed</h3>
          </div>
          <span className="text-[11px] text-slate-400">Strictly immutable logging</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-2">Time</th>
                <th className="pb-2">Actor</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Entity</th>
                <th className="pb-2">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {recent_audit_feed?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-400">No audit events recorded yet.</td>
                </tr>
              ) : (
                recent_audit_feed?.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      {log.actor_name} <span className="text-[10px] text-slate-400">({log.actor_role})</span>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 font-medium text-slate-600 dark:text-slate-300">
                      {log.entity} {log.entity_id ? `(#${log.entity_id})` : ''}
                    </td>
                    <td className="py-2.5 font-mono text-[10px] text-slate-400">
                      {log.ip_address}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
