import React, { useState } from 'react';
import { Building2, X, Plus, Globe, Briefcase, Users, Clock, Calendar } from 'lucide-react';
import api from '../api';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Mon' },
  { id: 1, label: 'Tue' },
  { id: 2, label: 'Wed' },
  { id: 3, label: 'Thu' },
  { id: 4, label: 'Fri' },
  { id: 5, label: 'Sat' },
  { id: 6, label: 'Sun' },
];

const CreateOrganizationModal = ({ isOpen, onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    country: '',
    company_size: '',
    timezone: 'Asia/Kolkata',
    working_days: [0, 1, 2, 3, 4],
    working_hours_start: '09:00',
    working_hours_end: '18:00',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const toggleDay = (dayId) => {
    setFormData((prev) => {
      const exists = prev.working_days.includes(dayId);
      const nextDays = exists
        ? prev.working_days.filter((d) => d !== dayId)
        : [...prev.working_days, dayId].sort();
      return { ...prev, working_days: nextDays };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/organizations/organizations/', {
        ...formData,
        company_size: formData.company_size ? parseInt(formData.company_size, 10) : null,
      });

      if (onCreated) {
        onCreated(res.data);
      }
      onClose();
      setFormData({
        name: '',
        industry: '',
        country: '',
        company_size: '',
        timezone: 'Asia/Kolkata',
        working_days: [0, 1, 2, 3, 4],
        working_hours_start: '09:00',
        working_hours_end: '18:00',
      });
    } catch (err) {
      console.error('Error creating organization:', err);
      setError(err.response?.data?.detail || err.response?.data?.name?.[0] || 'Failed to create organization.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[var(--k-ink)]/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[var(--k-grey-200)] rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--k-grey-200)] flex items-center justify-between bg-gradient-to-r from-[var(--k-blue-tint)]/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--k-blue)] text-white flex items-center justify-center font-bold shadow-md shadow-[var(--k-blue)]/20">
              <Building2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--k-ink)] tracking-tight">Add New Organization</h3>
              <p className="text-xs text-[var(--k-grey-500)] font-medium">Create a new isolated multi-tenant entity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--k-grey-500)] hover:bg-[var(--k-grey-200)]/60 hover:text-[var(--k-ink)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold">
            {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
              Organization Name <span className="text-[var(--k-blue)]">*</span>
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--k-grey-500)]" />
              <input
                type="text"
                required
                placeholder="e.g. Acme Corp, Kayaara Digital"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Industry
              </label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--k-grey-500)]" />
                <input
                  type="text"
                  placeholder="e.g. Technology, Pharma"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Country
              </label>
              <div className="relative">
                <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--k-grey-500)]" />
                <input
                  type="text"
                  placeholder="e.g. India, United States"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Employee Count
              </label>
              <div className="relative">
                <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--k-grey-500)]" />
                <input
                  type="number"
                  placeholder="e.g. 50"
                  value={formData.company_size}
                  onChange={(e) => setFormData({ ...formData, company_size: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Timezone
              </label>
              <div className="relative">
                <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--k-grey-500)]" />
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Working Days Config */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-[var(--k-blue)]" /> Working Days
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {DAYS_OF_WEEK.map((day) => {
                const active = formData.working_days.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      active
                        ? 'bg-[var(--k-blue)] text-white shadow-xs'
                        : 'bg-[var(--k-band-grey)] text-[var(--k-grey-500)] hover:bg-[var(--k-grey-200)]'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Working Hours Config */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Working Hours Start
              </label>
              <input
                type="time"
                value={formData.working_hours_start}
                onChange={(e) => setFormData({ ...formData, working_hours_start: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Working Hours End
              </label>
              <input
                type="time"
                value={formData.working_hours_end}
                onChange={(e) => setFormData({ ...formData, working_hours_end: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--k-grey-200)]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider text-[var(--k-grey-700)] hover:bg-[var(--k-grey-200)]/60 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-[var(--k-blue)] text-white text-xs font-black uppercase tracking-wider hover:bg-[var(--k-blue-dark)] transition-all shadow-md shadow-[var(--k-blue)]/25 flex items-center gap-2 disabled:opacity-50"
            >
              <Plus size={16} />
              {loading ? 'Creating...' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrganizationModal;
