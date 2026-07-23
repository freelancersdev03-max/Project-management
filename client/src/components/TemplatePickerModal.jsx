import React, { useState, useEffect } from 'react';
import { X, ChevronRight, FolderOpen, Calendar, CheckCircle2, Clock, Users, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

const TemplatePickerModal = ({ isOpen, onClose, onSelectTemplate, clientId }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, clientId]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const role = (localStorage.getItem('role') || '').toUpperCase();
      // All users can see public templates; admins/creators can see their own private ones
      const res = await api.get('projects/templates/');
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);

      // Filter: public templates OR user's own private templates
      const userId = parseInt(localStorage.getItem('user_id') || '0', 10);
      const filtered = data.filter(t => t.is_public || t.created_by === userId);

      setTemplates(filtered);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--k-grey-200)]">
            <div>
              <h2 className="text-lg font-bold text-[var(--k-ink)]">Select a Project Template</h2>
              <p className="text-xs text-[var(--k-grey-500)] mt-0.5">
                Choose a template to pre-fill project details, milestones, and tasks
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[var(--k-grey-100)] text-[var(--k-grey-500)] hover:text-[var(--k-ink)] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="text-center py-12 text-[var(--k-grey-500)]">
                <FolderOpen size={48} className="mx-auto mb-3 text-[var(--k-grey-300)]" />
                <p>{error}</p>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="k-skeleton h-48 rounded-xl" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen size={48} className="mx-auto mb-3 text-[var(--k-grey-300)]" />
                <h3 className="font-semibold text-[var(--k-ink)]">No templates available</h3>
                <p className="text-sm text-[var(--k-grey-500)] mt-1">
                  Create templates from existing projects or ask an admin to set some up.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isSelected={selectedTemplate?.id === template.id}
                    onSelect={() => setSelectedTemplate(template)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--k-grey-200)] flex justify-end gap-3">
            <button
              onClick={onClose}
              className="k-btn-ghost text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedTemplate) {
                  onSelectTemplate(selectedTemplate);
                  onClose();
                }
              }}
              disabled={!selectedTemplate}
              className="k-btn-primary text-sm flex items-center gap-2"
            >
              Use Template
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const TemplateCard = ({ template, isSelected, onSelect }) => {
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
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      className={`relative p-4 rounded-2xl border-2 transition-all duration-200 ${
        isSelected
          ? 'border-[var(--k-blue)] bg-[var(--k-blue-tint)]/50 shadow-[0_0_0_2px_var(--k-blue-tint)]'
          : 'border-[var(--k-grey-200)] hover:border-[var(--k-grey-300)] hover:bg-[var(--k-grey-50)]'
      }`}
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--k-blue)] flex items-center justify-center"
        >
          <CheckCircle2 size={14} className="text-white" />
        </motion.div>
      )}

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
          <FolderOpen size={24} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-[var(--k-ink)] truncate">{template.name}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${categoryColors[template.category] || categoryColors.GENERAL}`}>
              {template.category}
            </span>
          </div>

          {template.description && (
            <p className="text-sm text-[var(--k-grey-600)] mt-1 line-clamp-2">{template.description}</p>
          )}

          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[var(--k-grey-500)]">
              <Calendar size={13} />
              <span>{template.milestones_count || 0} milestones</span>
              <span className="w-px h-3 bg-[var(--k-grey-300)] mx-1" />
              <Clock size={13} />
              <span>{template.estimated_duration_days || '?'} days est.</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-[var(--k-grey-500)]">
              <Users size={13} />
              <span>{template.tasks_count || 0} tasks</span>
              {template.default_budget && (
                <>
                  <span className="w-px h-3 bg-[var(--k-grey-300)] mx-1" />
                  <DollarSign size={13} />
                  <span>{template.default_budget} {template.budget_unit || 'LAKH'}</span>
                </>
              )}
            </div>
          </div>

          {template.created_by_details && (
            <div className="mt-2 pt-2 border-t border-[var(--k-grey-100)] flex items-center gap-1.5 text-[11px] text-[var(--k-grey-500)]">
              Created by {template.created_by_details.username || template.created_by_details.email}
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
};

export default TemplatePickerModal;