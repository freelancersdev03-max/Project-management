import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle, CheckSquare2, Calendar, ClipboardCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

const SaveTemplateModal = ({ isOpen, onClose, projectId, projectName }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'GENERAL',
    is_public: true,
    include_milestones: true,
    include_tasks: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const categories = [
    'GENERAL', 'PHARMA', 'IT', 'MANUFACTURING',
    'CONSTRUCTION', 'HEALTHCARE', 'FINANCE', 'EDUCATION', 'OTHER'
  ];

  // Pre-fill name when modal opens
  useEffect(() => {
    if (isOpen && projectName) {
      setFormData(prev => ({
        ...prev,
        name: `${projectName} Template`,
      }));
    }
  }, [isOpen, projectName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        is_public: formData.is_public,
        include_milestones: formData.include_milestones,
        include_tasks: formData.include_tasks,
      };

      const res = await api.post(`projects/${projectId}/save_as_template/`, payload);

      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Navigate to templates page
        window.location.href = '/templates';
      }, 1000);
    } catch (err) {
      console.error('Failed to save template:', err);
      setError(err.response?.data?.detail || 'Failed to save template. Please try again.');
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
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--k-grey-200)]">
            <div>
              <h2 className="text-lg font-bold text-[var(--k-ink)]">Save as Template</h2>
              <p className="text-xs text-[var(--k-grey-500)] mt-0.5">
                Create a reusable template from <span className="font-medium">{projectName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading || success}
              className="p-2 rounded-xl hover:bg-[var(--k-grey-100)] text-[var(--k-grey-500)] hover:text-[var(--k-ink)] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700"
              >
                <Save size={20} className="flex-shrink-0" />
                <div>
                  <p className="font-semibold">Template created!</p>
                  <p className="text-sm">Redirecting to template manager...</p>
                </div>
              </motion.div>
            )}

            {!success && (
              <>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700"
                  >
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </motion.div>
                )}

                <div>
                  <label className="k-label">Template Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="k-input"
                    placeholder="e.g. Pharma Project Template"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="k-label">Description (optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="k-input min-h-[80px] resize-y"
                    placeholder="Brief description of what this template covers..."
                    rows={3}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="k-label">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="k-input"
                    disabled={loading}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="w-4 h-4 rounded border-[var(--k-grey-300)] text-[var(--k-blue)] focus:ring-[var(--k-blue)]"
                    disabled={loading}
                  />
                  <label htmlFor="is_public" className="text-sm text-[var(--k-grey-700)] cursor-pointer">
                    Make this template public (visible to all users)
                  </label>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--k-grey-100)]">
                  <label className="k-label text-xs">Include in Template</label>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="include_milestones"
                      checked={formData.include_milestones}
                      onChange={(e) => setFormData(prev => ({ ...prev, include_milestones: e.target.checked }))}
                      className="w-4 h-4 rounded border-[var(--k-grey-300)] text-[var(--k-blue)] focus:ring-[var(--k-blue)]"
                      disabled={loading}
                    />
                    <label htmlFor="include_milestones" className="text-sm text-[var(--k-grey-700)] cursor-pointer flex items-center gap-1.5">
                      <Calendar size={14} />
                      Milestones
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="include_tasks"
                      checked={formData.include_tasks}
                      onChange={(e) => setFormData(prev => ({ ...prev, include_tasks: e.target.checked }))}
                      className="w-4 h-4 rounded border-[var(--k-grey-300)] text-[var(--k-blue)] focus:ring-[var(--k-blue)]"
                      disabled={loading}
                    />
                    <label htmlFor="include_tasks" className="text-sm text-[var(--k-grey-700)] cursor-pointer flex items-center gap-1.5">
                      <ClipboardCheck size={14} />
                      Tasks
                    </label>
                  </div>
                </div>
              </>
            )}
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--k-grey-200)] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || success}
              className="k-btn-ghost text-sm"
            >
              Cancel
            </button>
            {!success && (
              <button
                type="submit"
                form={loading ? undefined : 'save-template-form'}
                onClick={(e) => { e.preventDefault(); document.getElementById('save-template-form')?.dispatchEvent(new Event('submit')); }}
                className="k-btn-primary text-sm flex items-center gap-2"
                disabled={loading || !formData.name.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save Template
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SaveTemplateModal;