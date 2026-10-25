import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Clock,
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  XCircle,
  RotateCcw,
  Calendar,
  Filter,
  Check,
  X,
  MessageSquare
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import CameraAttendanceModal from '../components/CameraAttendanceModal';

export default function AttendanceView({ currentRole }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [boardRecords, setBoardRecords] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Correction Request Form
  const [corrForm, setCorrForm] = useState({
    date: new Date().toISOString().split('T')[0],
    requested_check_in: '09:00',
    requested_check_out: '17:00',
    reason: ''
  });

  useEffect(() => {
    fetchBoard();
    if (currentRole === 'admin' || currentRole === 'hr') {
      fetchCorrections();
    }
  }, [date]);

  const fetchBoard = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/attendance/today?date=${date}`);
      setBoardRecords(res.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrections = async () => {
    try {
      const res = await apiRequest('/attendance/corrections');
      setCorrections(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleWebCheckIn = async () => {
    setActionMessage(null);
    try {
      const res = await apiRequest('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ source: 'web' })
      });
      setActionMessage({ type: 'success', text: res.message || 'Checked in successfully' });
      fetchBoard();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Check-in failed' });
    }
  };

  const handleWebCheckOut = async () => {
    setActionMessage(null);
    try {
      const res = await apiRequest('/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({})
      });
      setActionMessage({ type: 'success', text: res.message || 'Checked out successfully' });
      fetchBoard();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Check-out failed' });
    }
  };

  const handleSubmitCorrection = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/attendance/correction-request', {
        method: 'POST',
        body: JSON.stringify(corrForm)
      });
      setActionMessage({ type: 'success', text: 'Attendance correction submitted to HR for approval' });
      setIsCorrectionModalOpen(false);
      fetchBoard();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to submit correction' });
    }
  };

  const handleCorrectionAction = async (id, action, comment = '') => {
    try {
      await apiRequest(`/attendance/corrections/${id}/action`, {
        method: 'POST',
        body: JSON.stringify({ action, comment })
      });
      fetchCorrections();
      fetchBoard();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'present':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Present</span>;
      case 'late':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">Late</span>;
      case 'half_day':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">Half Day (&lt;5h)</span>;
      case 'on_leave':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">On Leave</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Absent</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Daily Attendance Board
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time biometric & web check-ins, office geofence verification and corrections workflow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Check-In Controls */}
          <button
            onClick={handleWebCheckIn}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer"
          >
            Web Check In
          </button>
          <button
            onClick={handleWebCheckOut}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white shadow-xs cursor-pointer"
          >
            Check Out
          </button>
          <button
            onClick={() => setIsCameraModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            Camera Check In
          </button>
          <button
            onClick={() => setIsCorrectionModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Request Correction
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

      {/* Date Filter & Summary */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="font-bold text-slate-700 dark:text-slate-300">Select Date:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold outline-none"
          />
        </div>

        <div className="text-xs text-slate-500">
          Total Employees Logged: <strong className="text-slate-900 dark:text-white">{boardRecords.length}</strong>
        </div>
      </div>

      {/* Pending Attendance Corrections Queue (HR & Admin) */}
      {(currentRole === 'admin' || currentRole === 'hr') && corrections.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              Pending Attendance Corrections ({corrections.length})
            </h3>
            <span className="text-[11px] text-amber-700 dark:text-amber-400">Requires HR Approval</span>
          </div>

          <div className="divide-y divide-amber-100 dark:divide-amber-900/40">
            {corrections.map(corr => (
              <div key={corr.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    {corr.employee_name} ({corr.employee_code}) · {corr.department_name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    Date: <strong>{corr.date}</strong> · Reason: <em>"{corr.correction_reason}"</em>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCorrectionAction(corr.id, 'approve')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleCorrectionAction(corr.id, 'reject')}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Board Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Employee</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Check In Time</th>
                <th className="p-3.5">Check Out Time</th>
                <th className="p-3.5">Total Hours</th>
                <th className="p-3.5">Verification Source</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {boardRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No attendance records for this date.
                  </td>
                </tr>
              ) : (
                boardRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {r.employee_name} <span className="text-slate-400 text-[10px]">({r.employee_code})</span>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{r.department_name}</td>
                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">{r.check_in_time || '--:--'}</td>
                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">{r.check_out_time || '--:--'}</td>
                    <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">{r.total_hours || 0} hrs</td>
                    <td className="p-3.5">
                      {r.source === 'camera' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 flex items-center gap-1 w-max">
                          <Camera className="w-3 h-3" /> Camera Face
                        </span>
                      ) : r.source === 'correction' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 w-max">
                          HR Correction
                        </span>
                      ) : r.check_in_time ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 w-max">
                          Web App
                        </span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {getStatusBadge(r.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Camera Attendance Modal */}
      <CameraAttendanceModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSuccess={(msg) => {
          setActionMessage({ type: 'success', text: msg });
          fetchBoard();
        }}
      />

      {/* Attendance Correction Modal */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Request Attendance Correction</h3>
              <button onClick={() => setIsCorrectionModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={corrForm.date}
                  onChange={(e) => setCorrForm({ ...corrForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Check In Time</label>
                  <input
                    type="time"
                    required
                    value={corrForm.requested_check_in}
                    onChange={(e) => setCorrForm({ ...corrForm, requested_check_in: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Check Out Time</label>
                  <input
                    type="time"
                    required
                    value={corrForm.requested_check_out}
                    onChange={(e) => setCorrForm({ ...corrForm, requested_check_out: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason / Explanation</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. System glitch, offsite client meeting, forgot checkout..."
                  value={corrForm.reason}
                  onChange={(e) => setCorrForm({ ...corrForm, reason: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Submit Correction Request to HR
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
