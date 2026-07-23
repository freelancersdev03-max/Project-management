import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Search, Filter, X, FolderOpen, ChevronRight, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, Band, Bands } from '../components/kayaara/Band';
import Sidebar from '../components/Sidebar';
import api from '../api';
import TemplatePickerModal from '../components/TemplatePickerModal';

export default function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const categories = [
    'all', 'GENERAL', 'PHARMA', 'IT', 'MANUFACTURING',
    'CONSTRUCTION', 'HEALTHCARE', 'FINANCE', 'EDUCATION', 'OTHER'
  ];

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.get('projects/templates/');
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (templateId) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    try {
      await api.delete(`projects/templates/${templateId}/`);
      fetchTemplates();
    } catch (err) {
      alert('Failed to delete template');
    }
  };

  const handleCreate = async (data) => {
    try {
      await api.post('projects/templates/', data);
      fetchTemplates();
      setIsCreateOpen(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create template');
    }
  };

  const handleUpdate = async (templateId, data) => {
    try {
      await api.patch(`projects/templates/${templateId}/`, data);
      fetchTemplates();
      setEditingTemplate(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update template');
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name?.toLowerCase().includes(filterQuery.toLowerCase()) ||
                          t.description?.toLowerCase().includes(filterQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryColors = {
    GENERAL: 'bg-blue-100 text-blue-700',
    PHARMA: 'bg-emerald-100 text-emerald-700',
    IT: 'bg-violet-100 text-violet-700',
    MANUFACTURING: 'bg-amber-100 text-amber-700',
    CONSTRUCTION: 'bg-orange-100 text-orange-700',
    HEALTHCARE: 'bg-rose-100 text-rose-700',
    FINANCE: 'bg-green-100 text-green-700',
    EDUCATION: 'bg-indigo-100 text-indigo-700',
    OTHER: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Templates"
          accent="Project Templates"
          subtitle="Create, manage, and use project templates"
          backTo="/clients"
          actions={
            <button onClick={() => setIsCreateOpen(true)} className="k-btn-primary flex items-center gap-2 text-sm">
              <Plus size={16} /> New Template
            </button>
          }
        />

        <main className="flex-1 overflow-y-auto k-scroll">
          <Bands>
            <Band tone="grey">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between mb-6">
                <div className="relative w-full max-w-md xl:max-w-xs">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--k-grey-500)' }} size={16} />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    className="k-input"
                    style={{ paddingLeft: '2.75rem' }}
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="k-btn-ghost flex items-center gap-2 text-sm"
                  >
                    <Filter size={15} style={{ color: 'var(--k-blue)' }} />
                    {categoryFilter === 'all' ? 'All Categories' : categoryFilter}
                    <ChevronDown size={13} />
                  </button>

                  <AnimatePresence>
                    {isCategoryOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 top-full mt-2 w-48 rounded-2xl overflow-hidden z-50 p-1 bg-white border border-[var(--k-grey-200)] shadow-lg"
                      >
                        {categories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => { setCategoryFilter(cat); setIsCategoryOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-xl transition-colors ${
                              categoryFilter === cat
                                ? 'bg-[var(--k-blue-tint)] text-[var(--k-blue)] font-bold'
                                : 'text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)]'
                            }`}
                          >
                            {cat === 'all' ? 'All Categories' : cat}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="k-skeleton h-56 rounded-xl" />
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="k-card flex flex-col items-center justify-center py-20 text-center gap-3">
                  <FolderOpen size={48} className="text-[var(--k-grey-300)]" />
                  <h3 className="text-base font-bold" style={{ color: 'var(--k-ink)' }}>
                    {filterQuery || categoryFilter !== 'all' ? 'No templates match your filters' : 'No templates yet'}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--k-grey-500)' }}>
                    {filterQuery || categoryFilter !== 'all'
                      ? 'Try adjusting your search or filters.'
                      : 'Create your first template to get started.'}
                  </p>
                  <button onClick={() => setIsCreateOpen(true)} className="k-btn-primary mt-2 flex items-center gap-2 text-sm">
                    <Plus size={16} /> Create Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template, index) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      className="k-card p-5 flex flex-col h-full transition-all hover:shadow-xl hover:border-[var(--k-blue)]/40 border border-[var(--k-grey-200)]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
                            <FolderOpen size={22} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[var(--k-ink)]">{template.name}</h3>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${categoryColors[template.category] || categoryColors.GENERAL}`}>
                              {template.category}
                            </span>
                          </div>
                        </div>
                        {!template.is_public && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                            Private
                          </span>
                        )}
                      </div>

                      {template.description && (
                        <p className="text-sm text-[var(--k-grey-600)] mb-3 line-clamp-2 flex-1">{template.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-[var(--k-grey-500)] mb-4 pt-3 border-t border-[var(--k-grey-100)]">
                        <span className="flex items-center gap-1">
                          <ChevronRight size={12} />
                          {template.milestones_count || 0} milestones
                        </span>
                        <span className="flex items-center gap-1">
                          <ChevronRight size={12} />
                          {template.tasks_count || 0} tasks
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[var(--k-grey-100)]">
                        <div className="flex items-center gap-2 text-[11px] text-[var(--k-grey-500)]">
                          {template.created_by_details && (
                            <span>by {template.created_by_details.username || template.created_by_details.email}</span>
                          )}
                          <span>•</span>
                          <span>{new Date(template.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingTemplate(template)}
                            className="k-btn-icon hover:bg-[var(--k-grey-100)] text-[var(--k-grey-500)] hover:text-[var(--k-blue)]"
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="k-btn-icon hover:bg-red-50 text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Band>
          </Bands>
        </main>

        {/* Create/Edit Modal */}
        {(isCreateOpen || editingTemplate) && (
          <TemplateFormModal
            isOpen={isCreateOpen || !!editingTemplate}
            onClose={() => { setIsCreateOpen(false); setEditingTemplate(null); }}
            template={editingTemplate}
            onSubmit={editingTemplate ? handleUpdate : handleCreate}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}

const TemplateFormModal = ({ isOpen, onClose, template, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'GENERAL',
    is_public: true,
    default_budget: '',
    budget_unit: 'LAKH',
    default_priority: 'MEDIUM',
    estimated_duration_days: '',
  });

  const categories = [
    'GENERAL', 'PHARMA', 'IT', 'MANUFACTURING',
    'CONSTRUCTION', 'HEALTHCARE', 'FINANCE', 'EDUCATION', 'OTHER'
  ];

  const budgetUnits = ['THOUSAND', 'LAKH', 'CRORE'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        category: template.category,
        is_public: template.is_public,
        default_budget: template.default_budget || '',
        budget_unit: template.budget_unit || 'LAKH',
        default_priority: template.default_priority || 'MEDIUM',
        estimated_duration_days: template.estimated_duration_days || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: 'GENERAL',
        is_public: true,
        default_budget: '',
        budget_unit: 'LAKH',
        default_priority: 'MEDIUM',
        estimated_duration_days: '',
      });
    }
  }, [template, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      default_budget: formData.default_budget ? parseFloat(formData.default_budget) : null,
      estimated_duration_days: formData.estimated_duration_days ? parseInt(formData.estimated_duration_days) : null,
    };
    onSubmit(template?.id, payload);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--k-grey-200)]">
          <h2 className="text-lg font-bold text-[var(--k-ink)]">
            {template ? 'Edit Template' : 'Create Template'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--k-grey-100)] text-[var(--k-grey-500)] hover:text-[var(--k-ink)] transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="k-label">Template Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="k-input"
              placeholder="e.g. Pharma Project Template"
              required
            />
          </div>

          <div>
            <label className="k-label">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="k-input min-h-[80px] resize-y"
              placeholder="Brief description..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="k-label">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="k-input"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="k-label">Budget Unit</label>
              <select
                value={formData.budget_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, budget_unit: e.target.value }))}
                className="k-input"
              >
                {budgetUnits.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="k-label">Default Budget</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.default_budget}
                onChange={(e) => setFormData(prev => ({ ...prev, default_budget: e.target.value }))}
                className="k-input"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="k-label">Default Priority</label>
              <select
                value={formData.default_priority}
                onChange={(e) => setFormData(prev => ({ ...prev, default_priority: e.target.value }))}
                className="k-input"
              >
                {priorities.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="k-label">Estimated Duration (days)</label>
            <input
              type="number"
              min="1"
              value={formData.estimated_duration_days}
              onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_days: e.target.value }))}
              className="k-input"
              placeholder="Optional"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
              className="w-4 h-4 rounded border-[var(--k-grey-300)] text-[var(--k-blue)] focus:ring-[var(--k-blue)]"
            />
            <label htmlFor="is_public" className="text-sm text-[var(--k-grey-700)] cursor-pointer">
              Make this template public (visible to all users)
            </label>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-[var(--k-grey-200)] flex justify-end gap-3">
          <button type="button" onClick={onClose} className="k-btn-ghost text-sm">
            Cancel
          </button>
          <button type="submit" form={loading ? undefined : (template ? 'edit-template-form' : 'create-template-form')} className="k-btn-primary text-sm flex items-center gap-2" disabled={loading || !formData.name.trim()}>
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus size={16} />
                {template ? 'Update' : 'Create'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};