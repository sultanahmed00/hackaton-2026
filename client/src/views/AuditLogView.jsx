import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Filter, Eye, X, RefreshCw } from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function AuditLogView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(entityFilter ? { entity: entityFilter } : {}),
        ...(actionFilter ? { action: actionFilter } : {})
      });
      const res = await apiRequest(`/comms/audit-logs?${params.toString()}`);
      setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            System Audit Trail (M9)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cryptographically logged immutable records of all create, update, approve, and finalize actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none"
          >
            <option value="">All Entities</option>
            <option value="Employee">Employee</option>
            <option value="Attendance">Attendance</option>
            <option value="Leave">Leave</option>
            <option value="Payroll">Payroll</option>
            <option value="Company">Company</option>
            <option value="User">User</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold outline-none"
          >
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="APPROVE_LEAVE">APPROVE_LEAVE</option>
            <option value="FINALIZE_PAYROLL">FINALIZE_PAYROLL</option>
            <option value="CHECK_IN">CHECK_IN</option>
          </select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Actor</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5">IP Address</th>
                <th className="p-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit records matching query.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{log.actor_name}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">{log.actor_role}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {log.entity} {log.entity_id ? `(#${log.entity_id.substring(0, 8)})` : ''}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                      {log.ip_address}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* State Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Audit Entry State Snapshot
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedLog.action} on {selectedLog.entity} by {selectedLog.actor_name} ({selectedLog.actor_role})
                </p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 font-mono text-xs">
              {selectedLog.before_state && (
                <div>
                  <div className="font-sans font-bold text-slate-400 uppercase text-[10px] mb-1">
                    Before State (Previous):
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 overflow-x-auto">
                    {JSON.stringify(selectedLog.before_state, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <div className="font-sans font-bold text-slate-400 uppercase text-[10px] mb-1">
                  After State (Committed):
                </div>
                <pre className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 overflow-x-auto">
                  {JSON.stringify(selectedLog.after_state, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
