import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
  Check,
  MessageSquare,
  Sparkles,
  Calendar
} from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function LeaveView({ currentRole, onOpenAiChat }) {
  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Apply Form
  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  });
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState(null);

  // Review comment modal
  const [reviewModalData, setReviewModalData] = useState(null); // { id, action: 'approve'|'reject' }
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const [balRes, reqRes, typesRes] = await Promise.all([
        apiRequest('/leave/balances').catch(() => []),
        apiRequest('/leave/requests'),
        apiRequest('/setup/leave-types')
      ]);
      setBalances(balRes || []);
      setRequests(reqRes || []);
      setLeaveTypes(typesRes || []);
      if (typesRes.length > 0 && !form.leave_type_id) {
        setForm(prev => ({ ...prev, leave_type_id: typesRes[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setApplyLoading(true);
    setApplyError(null);

    try {
      const res = await apiRequest('/leave/apply', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setActionMessage({ type: 'success', text: `Leave application submitted (${res.working_days} working days)` });
      setIsApplyModalOpen(false);
      fetchLeaveData();
    } catch (err) {
      setApplyError(err.message || 'Leave application failed');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleCancelRequest = async (id) => {
    if (!confirm('Are you sure you want to cancel this pending leave request?')) return;
    try {
      await apiRequest(`/leave/${id}/cancel`, { method: 'POST' });
      setActionMessage({ type: 'success', text: 'Leave request cancelled' });
      fetchLeaveData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to cancel leave' });
    }
  };

  const handleExecuteReview = async () => {
    if (!reviewModalData) return;
    try {
      await apiRequest(`/leave/${reviewModalData.id}/action`, {
        method: 'POST',
        body: JSON.stringify({
          action: reviewModalData.action,
          comment: reviewComment
        })
      });
      setActionMessage({ type: 'success', text: `Leave request ${reviewModalData.action}d successfully` });
      setReviewModalData(null);
      setReviewComment('');
      fetchLeaveData();
    } catch (err) {
      alert(err.message || 'Failed to review leave');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Leave Management & Entitlements
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Statutory leave quotas, holiday and weekend skip calculations, and approval workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAiChat}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Smart Leave via AI
          </button>
          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Apply For Leave
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {actionMessage.text}
        </div>
      )}

      {/* Leave Balances Cards (Section 3: Annual 14, Sick 8, Casual 10, Unpaid unlimited) */}
      {balances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {balances.map(b => (
            <div key={b.leave_type_id} className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{b.name}</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {b.remaining} <span className="text-xs font-normal text-slate-400">days left</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Used: {b.used} · Yearly Quota: {b.quota}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending Approvals Inbox (for HR & Admin) */}
      {(currentRole === 'admin' || currentRole === 'hr') && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Leave Approval Inbox (Pending Review)
            </h3>
            <span className="text-xs text-slate-400">
              {requests.filter(r => r.status === 'pending').length} pending requests
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {requests.filter(r => r.status === 'pending').length === 0 ? (
              <div className="text-xs text-slate-400 py-6 text-center">
                All leave requests are up to date. No pending approvals!
              </div>
            ) : (
              requests.filter(r => r.status === 'pending').map(req => (
                <div key={req.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {req.employee_name} ({req.employee_code})
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                        {req.leave_type_name}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {req.working_days} Working Day(s)
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Dates: <strong>{req.start_date}</strong> to <strong>{req.end_date}</strong> (skips weekends & public holidays)
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 italic">
                      "{req.reason || 'No reason specified'}"
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setReviewModalData({ id: req.id, action: 'approve' })}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => setReviewModalData({ id: req.id, action: 'reject' })}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Leave History Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-bold text-xs uppercase tracking-wider text-slate-400">
          Leave History Records
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Employee</th>
                <th className="p-3.5">Leave Type</th>
                <th className="p-3.5">Date Range</th>
                <th className="p-3.5">Working Days</th>
                <th className="p-3.5">Reason</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">No leave requests found.</td>
                </tr>
              ) : (
                requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {req.employee_name} <span className="text-slate-400 text-[10px]">({req.employee_code})</span>
                    </td>
                    <td className="p-3.5 font-medium">{req.leave_type_name}</td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {req.start_date} → {req.end_date}
                    </td>
                    <td className="p-3.5 font-bold">{req.working_days} days</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{req.reason}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        req.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : req.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : req.status === 'pending'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {req.status === 'pending' && currentRole === 'employee' && (
                        <button
                          onClick={() => handleCancelRequest(req.id)}
                          className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Apply For Leave</h3>
              <button onClick={() => setIsApplyModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {applyError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
                {applyError}
              </div>
            )}

            <form onSubmit={handleApplySubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Leave Type</label>
                <select
                  required
                  value={form.leave_type_id}
                  onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-none"
                >
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} (Quota: {lt.yearly_quota || 'Unlimited'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Attending sister's wedding, medical recovery, personal errand..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>

              <div className="text-[11px] text-slate-400">
                ⚡ System will automatically exclude weekends and official public holidays from deduction.
              </div>

              <button
                type="submit"
                disabled={applyLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                {applyLoading ? 'Submitting Leave...' : 'Submit Leave Application'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Review Comment Modal */}
      {reviewModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-2 capitalize">
              {reviewModalData.action} Leave Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter an optional comment or note for the employee:
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Approved. Enjoy your time off! or Rejected due to team deliverables."
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none mb-4"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={handleExecuteReview}
                className={`flex-1 py-2 rounded-xl text-white font-bold text-xs transition cursor-pointer ${
                  reviewModalData.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                Confirm {reviewModalData.action}
              </button>
              <button
                onClick={() => setReviewModalData(null)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
