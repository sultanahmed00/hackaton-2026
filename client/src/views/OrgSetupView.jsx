import React, { useState, useEffect } from 'react';
import {
  Building2,
  Clock,
  MapPin,
  CalendarDays,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  Users
} from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function OrgSetupView({ currentRole }) {
  const [activeSubTab, setActiveSubTab] = useState('settings');
  const [settings, setSettings] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  // New item modal states
  const [newDeptName, setNewDeptName] = useState('');
  const [newDesigTitle, setNewDesigTitle] = useState('');
  const [newDesigDeptId, setNewDesigDeptId] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [sRes, dRes, desRes, ltRes, hRes] = await Promise.all([
        apiRequest('/setup/settings'),
        apiRequest('/setup/departments'),
        apiRequest('/setup/designations'),
        apiRequest('/setup/leave-types'),
        apiRequest('/setup/holidays')
      ]);
      setSettings(sRes);
      setDepartments(dRes || []);
      setDesignations(desRes || []);
      setLeaveTypes(ltRes || []);
      setHolidays(hRes || []);
      if (dRes?.length > 0 && !newDesigDeptId) {
        setNewDesigDeptId(dRes[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await apiRequest('/setup/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setMessage({ type: 'success', text: 'Company rules & location saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await apiRequest('/setup/departments', {
        method: 'POST',
        body: JSON.stringify({ name: newDeptName.trim() })
      });
      setNewDeptName('');
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to add department');
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await apiRequest(`/setup/departments/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleAddDesignation = async (e) => {
    e.preventDefault();
    if (!newDesigTitle.trim()) return;
    try {
      await apiRequest('/setup/designations', {
        method: 'POST',
        body: JSON.stringify({ title: newDesigTitle.trim(), department_id: newDesigDeptId })
      });
      setNewDesigTitle('');
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to add designation');
    }
  };

  const handleDeleteDesignation = async (id) => {
    if (!confirm('Are you sure you want to delete this designation?')) return;
    try {
      await apiRequest(`/setup/designations/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayDate) return;
    try {
      await apiRequest('/setup/holidays', {
        method: 'POST',
        body: JSON.stringify({ name: newHolidayName.trim(), date: newHolidayDate })
      });
      setNewHolidayName('');
      setNewHolidayDate('');
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    try {
      await apiRequest(`/setup/holidays/${id}`, { method: 'DELETE' });
      fetchAll();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Organization Setup & Rules (M2)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Office schedule, geofence radius, departments, job titles, leave quotas and public holidays.
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeSubTab === 'settings' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Company Rules & Geofence
        </button>
        <button
          onClick={() => setActiveSubTab('departments')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeSubTab === 'departments' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Departments ({departments.length})
        </button>
        <button
          onClick={() => setActiveSubTab('designations')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeSubTab === 'designations' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Designations ({designations.length})
        </button>
        <button
          onClick={() => setActiveSubTab('holidays')}
          className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
            activeSubTab === 'holidays' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Public Holidays ({holidays.length})
        </button>
      </div>

      {/* Tab 1: Company Rules & Geofence Settings */}
      {activeSubTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Office Start Time</label>
              <input
                type="time"
                value={settings.office_start || '09:00'}
                onChange={(e) => setSettings({ ...settings, office_start: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Grace Period (Minutes)</label>
              <input
                type="number"
                value={settings.grace_minutes || 15}
                onChange={(e) => setSettings({ ...settings, grace_minutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Half Day Under (Hours)</label>
              <input
                type="number"
                value={settings.half_day_hours || 5}
                onChange={(e) => setSettings({ ...settings, half_day_hours: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Office Location (Lat, Lng)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="any"
                  value={settings.office_lat || 24.8607}
                  onChange={(e) => setSettings({ ...settings, office_lat: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                />
                <input
                  type="number"
                  step="any"
                  value={settings.office_lng || 67.0011}
                  onChange={(e) => setSettings({ ...settings, office_lng: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Geofence Radius (Meters)</label>
              <input
                type="number"
                value={settings.office_radius_meters || 150}
                onChange={(e) => setSettings({ ...settings, office_radius_meters: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {currentRole === 'admin' && (
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Update Organization Rules'}
            </button>
          )}
        </form>
      )}

      {/* Tab 2: Departments */}
      {activeSubTab === 'departments' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          {currentRole === 'admin' && (
            <form onSubmit={handleAddDepartment} className="flex gap-2">
              <input
                type="text"
                placeholder="New Department Name (e.g. Finance, Quality Assurance)"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {departments.map(d => (
              <div key={d.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{d.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">Code: {d.code}</div>
                </div>
                {currentRole === 'admin' && (
                  <button
                    onClick={() => handleDeleteDepartment(d.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Designations */}
      {activeSubTab === 'designations' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          {currentRole === 'admin' && (
            <form onSubmit={handleAddDesignation} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Designation Title (e.g. Senior Frontend Engineer)"
                value={newDesigTitle}
                onChange={(e) => setNewDesigTitle(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
              <select
                value={newDesigDeptId}
                onChange={(e) => setNewDesigDeptId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none font-semibold"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Designation
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {designations.map(des => {
              const dept = departments.find(d => d.id === des.department_id);
              return (
                <div key={des.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">{des.title}</div>
                    <div className="text-[10px] text-slate-400">{dept?.name || 'Unassigned'}</div>
                  </div>
                  {currentRole === 'admin' && (
                    <button
                      onClick={() => handleDeleteDesignation(des.id)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Public Holidays */}
      {activeSubTab === 'holidays' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          {currentRole === 'admin' && (
            <form onSubmit={handleAddHoliday} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Holiday Name (e.g. Eid-ul-Fitr, Independence Day)"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
              <input
                type="date"
                required
                value={newHolidayDate}
                onChange={(e) => setNewHolidayDate(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Holiday
              </button>
            </form>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {holidays.map(h => (
              <div key={h.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">{h.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{h.date}</div>
                </div>
                {currentRole === 'admin' && (
                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
