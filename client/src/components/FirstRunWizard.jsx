import React, { useState } from 'react';
import { Building2, ShieldCheck, Clock, MapPin, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function FirstRunWizard({ onComplete, onSeedDemo }) {
  const [formData, setFormData] = useState({
    company_name: 'Saylani Tech Solutions',
    office_start: '09:00',
    grace_minutes: 15,
    half_day_hours: 5,
    office_lat: 24.8607,
    office_lng: 67.0011,
    office_radius_meters: 150,
    admin_name: 'Saylani Admin',
    admin_email: 'admin@saylani.org',
    admin_password: 'Password@123'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiRequest('/setup/initialize', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      // Auto login as the newly created Admin
      const loginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.admin_email,
          password: formData.admin_password
        })
      });
      onComplete(loginRes.token, loginRes.user);
    } catch (err) {
      setError(err.message || 'Failed to complete initial setup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-8">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-2xl w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl">
        {/* Saylani Hackathon Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Saylani Hackathon · HCM Lite Initial Setup
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Welcome to <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">HCM Lite</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
            The system starts clean and empty. Set up your company profile and master Admin account to begin, or seed instant demo data.
          </p>
        </div>

        {/* Quick Seed Action Banner */}
        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 to-teal-900/40 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <div className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Judging Shortcut: 1-Click Showcase
            </div>
            <div className="text-[11px] text-slate-300">
              Instantly create Admin, HR, 3 employees, attendance records, leaves & payroll draft.
            </div>
          </div>
          <button
            type="button"
            onClick={onSeedDemo}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 transition shadow-lg shadow-teal-500/20 cursor-pointer flex items-center gap-1.5"
          >
            Load Full Demo Data
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Company Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200 border-b border-slate-700 pb-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              1. Company Profile & Attendance Rules
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-blue-500 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Office Start Time</label>
                <input
                  type="time"
                  required
                  value={formData.office_start}
                  onChange={(e) => setFormData({ ...formData, office_start: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-blue-500 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  required
                  value={formData.grace_minutes}
                  onChange={(e) => setFormData({ ...formData, grace_minutes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-blue-500 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Half Day Threshold (Hours)</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  required
                  value={formData.half_day_hours}
                  onChange={(e) => setFormData({ ...formData, half_day_hours: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-blue-500 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Office Coordinates (Lat, Lng)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    value={formData.office_lat}
                    onChange={(e) => setFormData({ ...formData, office_lat: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs outline-none"
                    placeholder="Lat"
                  />
                  <input
                    type="number"
                    step="any"
                    value={formData.office_lng}
                    onChange={(e) => setFormData({ ...formData, office_lng: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs outline-none"
                    placeholder="Lng"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Camera Geofence Radius (Meters)</label>
                <input
                  type="number"
                  min="50"
                  max="5000"
                  required
                  value={formData.office_radius_meters}
                  onChange={(e) => setFormData({ ...formData, office_radius_meters: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 focus:border-blue-500 text-white text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Admin Account */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-200 border-b border-slate-700 pb-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              2. Master Administrator Account
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Admin Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Admin Email</label>
                <input
                  type="email"
                  required
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Admin Password</label>
                <input
                  type="password"
                  required
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-white text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">Initializing System...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Initialize Company & Launch HCM Lite
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
