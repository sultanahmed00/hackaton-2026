import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function AnnouncementsView({ currentRole }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'normal',
    target_role: 'all'
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/comms/announcements');
      setAnnouncements(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/comms/announcements', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setIsPostModalOpen(false);
      setForm({ title: '', content: '', priority: 'normal', target_role: 'all' });
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || 'Failed to post announcement');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await apiRequest(`/comms/announcements/${id}`, { method: 'DELETE' });
      fetchAnnouncements();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Company Communications & Noticeboard (M9)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Broadcast official circulars, policy updates, and hackathon milestones.
          </p>
        </div>

        {(currentRole === 'admin' || currentRole === 'hr') && (
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Post Announcement
          </button>
        )}
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcements.length === 0 ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
            No announcements broadcasted yet.
          </div>
        ) : (
          announcements.map(ann => (
            <div
              key={ann.id}
              className={`p-5 rounded-3xl bg-white dark:bg-slate-800/80 border shadow-xs flex flex-col justify-between ${
                ann.priority === 'urgent'
                  ? 'border-rose-300 dark:border-rose-900/60'
                  : ann.priority === 'high'
                  ? 'border-amber-300 dark:border-amber-900/60'
                  : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    ann.priority === 'urgent'
                      ? 'bg-rose-100 text-rose-700'
                      : ann.priority === 'high'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {ann.priority} Priority
                  </span>

                  {(currentRole === 'admin' || currentRole === 'hr') && (
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
                  {ann.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {ann.content}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>By {ann.author_name} ({ann.author_role})</span>
                <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Modal */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Broadcast Announcement</h3>
              <button onClick={() => setIsPostModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saylani Hackathon Evaluation Milestone"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Audience</label>
                  <select
                    value={form.target_role}
                    onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-semibold outline-none"
                  >
                    <option value="all">All Employees</option>
                    <option value="hr">HR Staff</option>
                    <option value="employee">Employees Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Type the announcement details..."
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Post to Noticeboard
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
