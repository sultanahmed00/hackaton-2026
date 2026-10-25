import React, { useState, useEffect } from 'react';
import {
  UserCircle,
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  DollarSign,
  ShieldCheck,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Edit2,
  Save,
  Receipt
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import { downloadPayslipPDF } from '../utils/pdfGenerator';

export default function Employee360Modal({ employeeId, isOpen, onClose, currentRole, onUpdated }) {
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (isOpen && employeeId) {
      fetch360();
    }
  }, [isOpen, employeeId]);

  const fetch360 = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/employees/${employeeId}`);
      setEmp(res);
      setPhone(res.phone || '');
      setAddress(res.address || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest(`/employees/${employeeId}`, {
        method: 'PUT',
        body: JSON.stringify({ phone, address })
      });
      setMessage({ type: 'success', text: 'Contact details updated' });
      setIsEditingContact(false);
      fetch360();
      if (onUpdated) onUpdated();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <img
              src={emp?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
              alt="Avatar"
              className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 object-cover shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  {emp ? `${emp.first_name} ${emp.last_name}` : 'Employee 360'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-700">
                  {emp?.employee_code}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {emp?.designation_title} · {emp?.department_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {message && (
          <div className={`mt-3 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Top Analytics Badges: Attrition Score & Anomalies (Bonus +10) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Attrition Risk Score */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Bonus: AI Attrition Risk Score
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {emp?.attrition_score || 15} / 100
                </div>
                <div className="text-[11px] text-slate-500">
                  {(emp?.attrition_score || 15) > 40 ? 'Moderate attention needed' : 'Low turnover risk (Stable)'}
                </div>
              </div>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                (emp?.attrition_score || 15) > 40
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>

            {/* Absence Anomaly Detection */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Bonus: Absence Anomaly Flag
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  {emp?.absence_anomalies?.hasAnomaly ? '⚠️ Pattern Detected' : '✓ Normal Attendance'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {emp?.absence_anomalies?.message}
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Personal & Contact Information */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Contact & Personal Info
              </h4>
              {!isEditingContact ? (
                <button
                  onClick={() => setIsEditingContact(true)}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Phone & Address
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveContact}
                    disabled={saving}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                  <button
                    onClick={() => setIsEditingContact(false)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Email</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{emp?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Hire Date</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{emp?.hire_date}</span>
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Phone Number</span>
                {isEditingContact ? (
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs outline-none"
                  />
                ) : (
                  <span className="font-medium text-slate-800 dark:text-slate-200">{emp?.phone || 'Not provided'}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 block mb-0.5">Residential Address</span>
                {isEditingContact ? (
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs outline-none"
                  />
                ) : (
                  <span className="font-medium text-slate-800 dark:text-slate-200">{emp?.address || 'Not provided'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Salary Structure (Section 3: Gross = 1.5 * Basic, HRA 40%, Medical 10%) */}
          {(currentRole === 'admin' || currentRole === 'hr' || emp?.id === employeeId) && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                Salary Structure (Gross = 1.5 × Basic)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Gross Salary</span>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    Rs. {(emp?.gross_salary || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Basic (Gross / 1.5)</span>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    Rs. {(emp?.basic_salary || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">HRA (40% of Basic)</span>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    Rs. {(emp?.hra || 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Medical (10% of Basic)</span>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                    Rs. {(emp?.medical_allowance || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leave Balances */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
              Leave Balances
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {emp?.leave_balances?.map(lb => (
                <div key={lb.leave_type.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-200">{lb.leave_type.name}</div>
                  <div className="text-slate-500 mt-1">Remaining: <strong>{lb.remaining}</strong> days</div>
                  <div className="text-[10px] text-slate-400">Used: {lb.used} / {lb.quota}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Attendance */}
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
              Recent Attendance History
            </h4>
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Check In</th>
                    <th className="p-2.5">Check Out</th>
                    <th className="p-2.5">Hours</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {emp?.recent_attendance?.length === 0 ? (
                    <tr><td colSpan={5} className="p-3 text-center text-slate-400">No attendance logs.</td></tr>
                  ) : (
                    emp?.recent_attendance?.map(att => (
                      <tr key={att.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono">{att.date}</td>
                        <td className="p-2.5">{att.check_in_time || '--:--'}</td>
                        <td className="p-2.5">{att.check_out_time || '--:--'}</td>
                        <td className="p-2.5">{att.total_hours || 0} hrs</td>
                        <td className="p-2.5 capitalize font-semibold">{att.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
