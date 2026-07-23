import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Key, Briefcase, Building2, X, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

const AddStaffModal = ({ isOpen, onClose, onStaffAdded, defaultOrgId }) => {
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    shortform: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    department: '',
    organization_id: defaultOrgId || '',
  });

  const [organizations, setOrganizations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Inline Add Department State
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const newDeptInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchOrgsAndDepts();
      setFormData((prev) => ({
        ...prev,
        organization_id: defaultOrgId || prev.organization_id || '',
      }));
    }
  }, [isOpen, defaultOrgId]);

  useEffect(() => {
    if (showAddDept && newDeptInputRef.current) {
      newDeptInputRef.current.focus();
    }
  }, [showAddDept]);

  const fetchOrgsAndDepts = async () => {
    try {
      const [orgsRes, deptsRes] = await Promise.all([
        api.get('organizations/organizations/'),
        api.get('admin/departments/'),
      ]);
      const orgList = Array.isArray(orgsRes.data) ? orgsRes.data : (orgsRes.data?.results || []);
      const deptList = Array.isArray(deptsRes.data) ? deptsRes.data : [];
      setOrganizations(orgList);
      setDepartments(deptList);

      if (!formData.organization_id && orgList.length > 0) {
        setFormData((prev) => ({ ...prev, organization_id: orgList[0].id }));
      }
    } catch (err) {
      console.error('Error fetching orgs/depts:', err);
    }
  };

  const handleAddDepartment = async () => {
    const trimmed = newDeptName.trim();
    if (!trimmed) return;

    setAddingDept(true);
    try {
      const res = await api.post('admin/departments/', { name: trimmed });
      const created = res.data;
      setDepartments((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData((prev) => ({ ...prev, department: String(created.id) }));
      setNewDeptName('');
      setShowAddDept(false);
    } catch (err) {
      const msg = err?.response?.data?.name;
      if (msg) {
        alert(Array.isArray(msg) ? msg.join(', ') : String(msg));
      } else {
        alert('Failed to create department');
      }
    } finally {
      setAddingDept(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('admin/create-user/', {
        username: formData.username || formData.email.split('@')[0],
        first_name: formData.first_name,
        last_name: formData.last_name,
        shortform: formData.shortform.toUpperCase(),
        email: formData.email,
        password: formData.password,
        role: formData.role,
        department: formData.department ? parseInt(formData.department, 10) : null,
        organization_id: formData.organization_id ? parseInt(formData.organization_id, 10) : null,
      });

      if (onStaffAdded) {
        onStaffAdded();
      }
      onClose();
      setFormData({
        username: '',
        first_name: '',
        last_name: '',
        shortform: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        department: '',
        organization_id: defaultOrgId || '',
      });
    } catch (err) {
      console.error('Error creating staff member:', err);
      const resErr = err.response?.data;
      if (typeof resErr === 'object') {
        const msg = Object.entries(resErr)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' | ');
        setError(msg);
      } else {
        setError('Failed to create staff member.');
      }
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
              <User size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--k-ink)] tracking-tight">Add Staff Member</h3>
              <p className="text-xs text-[var(--k-grey-500)] font-medium">Create a new user and assign to an Organization</p>
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
          {/* Organization Dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
              Organization <span className="text-[var(--k-blue)]">*</span>
            </label>
            <div className="relative">
              <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--k-grey-500)] pointer-events-none" />
              <select
                required
                value={formData.organization_id}
                onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-bold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
              >
                <option value="">Select Organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                First Name <span className="text-[var(--k-blue)]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Arjun"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Last Name <span className="text-[var(--k-blue)]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Verma"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
              />
            </div>
          </div>

          {/* Email & Username */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Official Email <span className="text-[var(--k-blue)]">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--k-grey-500)] pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="arjun@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Shortform <span className="text-[var(--k-blue)]">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={5}
                placeholder="e.g. AV"
                value={formData.shortform}
                onChange={(e) => setFormData({ ...formData, shortform: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-bold uppercase text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
              />
            </div>
          </div>

          {/* Role & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Role <span className="text-[var(--k-blue)]">*</span>
              </label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--k-grey-500)] pointer-events-none" />
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-bold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="SGM">Project Manager (SGM)</option>
                  <option value="MLS">Team Lead (MLS)</option>
                  <option value="KAYAARA">Org Admin (Kayaara)</option>
                  <option value="CLIENT">Client Owner</option>
                  <option value="SENIOR">Client Leadership</option>
                  <option value="FREELANCER">Freelancer</option>
                  <option value="VENDOR">Vendor</option>
                </select>
              </div>
            </div>

            {/* Department Selection (Exact match with + Add New Department feature) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
                Department
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--k-grey-500)] pointer-events-none" />
                <select
                  value={formData.department}
                  onChange={(e) => {
                    if (e.target.value === '__add_new__') {
                      setShowAddDept(true);
                      return;
                    }
                    setFormData({ ...formData, department: e.target.value });
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-bold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all cursor-pointer"
                >
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                  <option value="__add_new__" style={{ color: 'var(--k-blue)', fontWeight: 700 }}>
                    + Add New Department
                  </option>
                </select>
              </div>

              {/* Inline Add Department Panel */}
              <AnimatePresence>
                {showAddDept && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div
                      className="p-3 rounded-xl flex items-center gap-2"
                      style={{
                        background: 'var(--k-blue-tint)',
                        border: '1px solid var(--k-blue)',
                      }}
                    >
                      <Building2 size={16} style={{ color: 'var(--k-blue)', flexShrink: 0 }} />
                      <input
                        ref={newDeptInputRef}
                        type="text"
                        placeholder="Enter department name"
                        className="flex-1 px-3 py-1.5 bg-white border border-[var(--k-grey-200)] rounded-lg text-xs font-bold text-[var(--k-ink)] focus:outline-none"
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddDepartment();
                          }
                          if (e.key === 'Escape') {
                            setShowAddDept(false);
                            setNewDeptName('');
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={addingDept || !newDeptName.trim()}
                        onClick={handleAddDepartment}
                        className="px-3 py-1.5 bg-[var(--k-blue)] text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-[var(--k-blue-dark)] transition-all flex items-center gap-1 shrink-0 disabled:opacity-50"
                      >
                        {addingDept ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddDept(false);
                          setNewDeptName('');
                        }}
                        className="p-1 text-[var(--k-grey-500)] hover:text-[var(--k-ink)]"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--k-grey-700)] mb-1.5">
              Password <span className="text-[var(--k-blue)]">*</span>
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--k-grey-500)] pointer-events-none" />
              <input
                type="password"
                required
                placeholder="Initial login password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--k-band-grey)] border border-[var(--k-grey-200)] rounded-xl text-sm font-semibold text-[var(--k-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--k-blue)]/20 focus:bg-white focus:border-[var(--k-blue)] transition-all"
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
              {loading ? 'Creating...' : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStaffModal;
