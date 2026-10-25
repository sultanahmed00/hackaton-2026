import React, { useState, useEffect } from 'react';
import {
  Users2,
  UserPlus,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Power
} from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function UserManagementView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [message, setMessage] = useState(null);

  // Create HR Form
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: 'Password@123',
    role: 'hr'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/auth/users');
      setUsers(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/auth/users', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });
      setMessage({ type: 'success', text: res.message });
      setIsCreateModalOpen(false);
      setCreateForm({ name: '', email: '', password: 'Password@123', role: 'hr' });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm('Reset password for this user? They will receive a temporary password and must change it upon next login.')) return;
    try {
      const res = await apiRequest(`/auth/users/${userId}/reset-password`, { method: 'POST' });
      setMessage({
        type: 'success',
        text: `Password reset. New Temporary Password: ${res.temporary_password}`
      });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to reset password');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await apiRequest(`/auth/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus })
      });
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to change status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            User Accounts & Access Control (M1/M2)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Admin master control: Create HR operations logins, reset credentials, deactivate accounts.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Create HR Login
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-3.5">User</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">Force Password Change</th>
              <th className="p-3.5">Account Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/60 transition">
                <td className="p-3.5">
                  <div className="font-bold text-slate-900 dark:text-white">{u.name}</div>
                  <div className="text-[10px] text-slate-400">{u.email}</div>
                </td>
                <td className="p-3.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    u.role === 'admin'
                      ? 'bg-purple-100 text-purple-700 border border-purple-200'
                      : u.role === 'hr'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-3.5">
                  {u.must_change_password ? (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                      Required on next login
                    </span>
                  ) : (
                    <span className="text-slate-400">Normal</span>
                  )}
                </td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {u.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="p-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleResetPassword(u.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                      title="Reset Password to temporary"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" /> Reset
                    </button>
                    {u.role !== 'admin' && (
                      <button
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                          u.is_active ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create HR Login Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Create HR Login Account</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Khan"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="hr@company.com"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Create HR Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
