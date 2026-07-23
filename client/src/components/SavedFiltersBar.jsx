import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Trash2, Check, X } from 'lucide-react';
import api from '../api';

export default function SavedFiltersBar({ activeFilters = {}, onApplyFilter }) {
  const [savedFilters, setSavedFilters] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchSavedFilters = async () => {
    try {
      const res = await api.get('tasks/saved_filters/');
      setSavedFilters(Array.isArray(res.data) ? res.data : (res.data.results || []));
    } catch (err) {
      console.warn('Failed to fetch saved filters', err);
    }
  };

  useEffect(() => {
    fetchSavedFilters();
  }, []);

  const handleSaveFilter = async (e) => {
    e.preventDefault();
    if (!filterName.trim()) return;

    setLoading(true);
    try {
      await api.post('tasks/saved_filters/', {
        name: filterName.trim(),
        entity_type: 'TASK',
        filter_params: activeFilters,
      });
      setFilterName('');
      setShowSaveModal(false);
      fetchSavedFilters();
      alert('Filter preset saved successfully!');
    } catch (err) {
      console.error('Failed to save filter:', err);
      alert('Failed to save filter preset.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFilter = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this saved filter preset?')) return;

    try {
      await api.delete(`tasks/saved_filters/${id}/`);
      fetchSavedFilters();
    } catch (err) {
      console.error('Failed to delete saved filter:', err);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-white border border-[var(--k-grey-200)] text-[var(--k-grey-700)] hover:border-[var(--k-blue)] hover:text-[var(--k-blue)] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
        >
          <Bookmark size={13} className="text-[var(--k-blue)]" />
          <span>Saved Presets ({savedFilters.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSaveModal(true)}
          className="px-3.5 py-1.5 rounded-full text-[11px] font-bold bg-[var(--k-blue-tint)] text-[var(--k-blue)] border border-[var(--k-blue)]/30 hover:bg-[var(--k-blue)] hover:text-white transition-all flex items-center gap-1 cursor-pointer"
          title="Save active filter settings as a reusable preset"
        >
          <Plus size={13} /> Save Filter
        </button>
      </div>

      {/* Saved Filters Dropdown List */}
      {showDropdown && (
        <div className="absolute top-full mt-2 left-0 w-64 bg-white border border-[var(--k-grey-200)] rounded-2xl p-2 z-50 shadow-xl">
          <div className="px-3 py-1.5 border-b border-[var(--k-grey-100)] mb-1 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--k-grey-500)]">
              Saved Filter Presets
            </span>
            <button onClick={() => setShowDropdown(false)} className="text-[var(--k-grey-500)] hover:text-[var(--k-ink)]">
              <X size={14} />
            </button>
          </div>

          {savedFilters.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-[var(--k-grey-500)]">
              No saved filter presets yet.
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto k-scroll">
              {savedFilters.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => {
                    onApplyFilter?.(preset.filter_params);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--k-blue-tint)] hover:text-[var(--k-blue)] transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <span className="truncate pr-2">{preset.name}</span>
                  <button
                    onClick={(e) => handleDeleteFilter(preset.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded-md transition-all shrink-0"
                    title="Delete preset"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save Filter Modal */}
      {showSaveModal && (
        <div className="k-backdrop !z-[350]">
          <div className="k-modal !max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--k-ink)] flex items-center gap-2">
                <Bookmark size={18} className="text-[var(--k-blue)]" />
                Save Filter Preset
              </h3>
              <button onClick={() => setShowSaveModal(false)} className="p-1 rounded-full text-[var(--k-grey-500)] hover:text-[var(--k-ink)]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFilter} className="space-y-4">
              <div>
                <label className="k-label">Preset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High Priority Overdue Tasks"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="k-input"
                />
              </div>

              <div className="p-3 rounded-xl bg-[var(--k-band-grey)] text-xs text-[var(--k-grey-700)]">
                <p className="font-bold mb-1 text-[var(--k-ink)]">Active Parameters to Save:</p>
                <pre className="text-[10px] overflow-x-auto no-scrollbar font-mono bg-white p-2 rounded border border-[var(--k-grey-200)]">
                  {JSON.stringify(activeFilters, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="k-btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="k-btn-primary text-xs flex items-center gap-1.5"
                >
                  <Check size={14} /> {loading ? 'Saving...' : 'Save Preset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
