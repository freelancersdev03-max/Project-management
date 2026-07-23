import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Flag, CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';
import api from '../api';
import { formatDateDDMMYYYY } from '../utils/dateFormat';

const STATUS_ICONS = {
  PENDING: <Circle size={14} />,
  IN_PROGRESS: <Clock size={14} />,
  COMPLETED: <CheckCircle2 size={14} />,
  OVERDUE: <AlertCircle size={14} />,
};

const STATUS_COLORS = {
  PENDING: 'var(--k-grey-500)',
  IN_PROGRESS: 'var(--k-blue)',
  COMPLETED: '#10b981',
  OVERDUE: '#ef4444',
};

const STATUS_BG = {
  PENDING: 'var(--k-grey-100)',
  IN_PROGRESS: 'var(--k-blue-tint)',
  COMPLETED: '#ecfdf5',
  OVERDUE: '#fef2f2',
};

const Milestones = ({ projectId }) => {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', due_date: '', status: 'PENDING' });

  const fetchMilestones = async () => {
    if (!projectId) return;
    try {
      const res = await api.get(`projects/${projectId}/milestones/`);
      setMilestones(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load milestones', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMilestones(); }, [projectId]);

  const resetForm = () => {
    setForm({ name: '', description: '', due_date: '', status: 'PENDING' });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (m) => {
    setForm({
      name: m.name || '',
      description: m.description || '',
      due_date: m.due_date || '',
      status: m.status || 'PENDING',
    });
    setEditing(m.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editing) {
        await api.patch(`projects/${projectId}/milestones/${editing}/`, form);
      } else {
        await api.post(`projects/${projectId}/milestones/`, form);
      }
      resetForm();
      fetchMilestones();
    } catch (err) {
      console.error('Failed to save milestone', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this milestone?')) return;
    try {
      await api.delete(`projects/${projectId}/milestones/${id}/`);
      fetchMilestones();
    } catch (err) {
      console.error('Failed to delete milestone', err);
    }
  };

  const handleStatusToggle = async (m) => {
    const nextStatus = m.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.patch(`projects/${projectId}/milestones/${m.id}/`, { status: nextStatus });
      fetchMilestones();
    } catch (err) {
      console.error('Failed to update milestone', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="k-skeleton h-[52px] rounded-xl" />)}
      </div>
    );
  }

  const sorted = [...milestones].sort((a, b) => {
    if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
    if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
    if (a.due_date && b.due_date) return new Date(a.due_date) - new Date(b.due_date);
    return 0;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="k-section-title">
          <Flag size={16} style={{ color: 'var(--k-blue)' }} /> Milestones
        </h3>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="k-btn-icon" title="Add milestone">
          <Plus size={16} />
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--k-grey-500)' }}>No milestones yet. Click + to add one.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group"
              style={{
                background: STATUS_BG[m.status] || 'var(--k-band-grey)',
                border: '1px solid var(--k-grey-200)',
              }}
              onClick={() => handleStatusToggle(m)}
            >
              <span style={{ color: STATUS_COLORS[m.status] || 'var(--k-grey-500)' }}>
                {STATUS_ICONS[m.status] || <Circle size={14} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--k-ink)' }}>
                  {m.name}
                </p>
                {m.description && (
                  <p className="text-[11px] truncate" style={{ color: 'var(--k-grey-500)' }}>{m.description}</p>
                )}
              </div>
              {m.due_date && (
                <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: 'var(--k-grey-500)' }}>
                  {formatDateDDMMYYYY(m.due_date)}
                </span>
              )}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                  className="k-btn-icon !w-7 !h-7"
                  title="Edit"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                  className="k-btn-icon !w-7 !h-7"
                  title="Delete"
                >
                  <X size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 p-4 rounded-xl"
            style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}
          >
            <div className="space-y-3">
              <input
                className="k-input w-full"
                placeholder="Milestone name *"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <textarea
                className="k-textarea w-full"
                placeholder="Description (optional)"
                rows={2}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
              <div className="flex gap-3">
                <input
                  type="date"
                  className="k-input flex-1"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
                <select
                  className="k-select flex-1"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={resetForm} className="k-btn-ghost flex-1 text-sm">Cancel</button>
              <button onClick={handleSave} className="k-btn-primary flex-1 text-sm">
                {editing ? 'Update' : 'Add milestone'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Milestones;
