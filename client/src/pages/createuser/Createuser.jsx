import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../api';
import emailjs from '@emailjs/browser';
import {
  UserPlus, Mail, Lock, User,
  Shield, Send, Loader2,
  ShieldCheck, Fingerprint, Building2, Plus, X, Crown, Users, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader, Band, Bands } from '../../components/kayaara/Band';

const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;

const DEPARTMENT_ROLES = [
  { value: 'HOD', label: 'HOD', icon: Crown, desc: 'Head of Department' },
  { value: 'MANAGER', label: 'Manager', icon: Briefcase, desc: 'Department Manager' },
  { value: 'EMPLOYEE', label: 'Employee', icon: Users, desc: 'Team Member' },
];

const CreateUser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    shortform: '',
    email: '',
    password: '',
    department: '',
  });

  // Combined UI Selected Role state (HOD, MANAGER, EMPLOYEE, SGM, KAYAARA, MLS)
  const [uiRole, setUiRole] = useState('EMPLOYEE');

  // Department state
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [showAddDept, setShowAddDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const newDeptInputRef = useRef(null);

  // Fetch departments on mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setDeptLoading(true);
    try {
      const res = await api.get('/admin/departments/');
      setDepartments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setDeptLoading(false);
    }
  };

  const handleAddDepartment = async () => {
    const trimmed = newDeptName.trim();
    if (!trimmed) return;

    setAddingDept(true);
    try {
      const res = await api.post('/admin/departments/', { name: trimmed });
      const created = res.data;
      setDepartments(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setFormData(prev => ({ ...prev, department: String(created.id) }));
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

  // Focus input when "Add New" panel opens
  useEffect(() => {
    if (showAddDept && newDeptInputRef.current) {
      newDeptInputRef.current.focus();
    }
  }, [showAddDept]);

  const handleCreateAndEmail = async (e) => {
    e.preventDefault();
    setLoading(true);

    const normalizedShortform = String(formData.shortform || '').trim().toUpperCase();

    // Validate department is selected only for department-based roles
    const isDeptRequired = ['HOD', 'MANAGER', 'EMPLOYEE'].includes(uiRole);
    if (isDeptRequired && !formData.department) {
      alert('Please select a department');
      setLoading(false);
      return;
    }

    // Map combined uiRole to API fields
    const apiRole = ['HOD', 'MANAGER', 'EMPLOYEE'].includes(uiRole) ? 'EMPLOYEE' : uiRole.toUpperCase();
    const apiDeptRole = ['HOD', 'MANAGER', 'EMPLOYEE'].includes(uiRole) ? uiRole : 'EMPLOYEE';
    const apiDept = isDeptRequired ? parseInt(formData.department) : null;

    try {
      const res = await api.post("/admin/create-user/", {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        shortform: normalizedShortform,
        email: formData.email,
        password: formData.password,
        role: apiRole,
        department: apiDept,
        department_role: apiDeptRole,
      });

      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: formData.email,
            to_name: `${formData.first_name} ${formData.last_name} `.trim(),
            username: formData.username,
            first_name: formData.first_name,
            last_name: formData.last_name,
            shortform: normalizedShortform,
            role: formData.role,
            password: formData.password,
          },
          EMAILJS_PUBLIC_KEY
        );

        alert(`User ${res.data.username || formData.username} created successfully and email sent.`);
      } catch (emailErr) {
        console.error('EmailJS Error:', emailErr);
        alert(`User ${res.data.username || formData.username} created successfully, but email could not be sent.`);
      }

      navigate('/admin/');

    } catch (err) {
      console.error("Create User Error:", err);

      let errorMessage = "User creation failed";

      if (err.response && err.response.data) {
        const data = err.response.data;

        // Handle common DRF error formats
        if (data.detail) {
          errorMessage = data.detail;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === 'object') {
          // Flatten field errors: {"email": ["Exists"], "username": ["Required"]} -> "email: Exists\nusername: Required"
          const messages = Object.entries(data).map(([key, value]) => {
            const val = Array.isArray(value) ? value.join(", ") : value;
            return `${key}: ${val} `;
          });
          if (messages.length > 0) errorMessage = messages.join("\n");
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      const shortformError = err?.response?.data?.shortform;
      if (shortformError) {
        const message = Array.isArray(shortformError) ? shortformError.join(', ') : String(shortformError);
        if (message.toLowerCase().includes('shortform already taken')) {
          alert('Shortform already taken');
          setLoading(false);
          return;
        }
      }

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedDeptName = departments.find(d => String(d.id) === String(formData.department))?.name;

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Onboard"
          accent="New User"
          subtitle="Configure system access and security roles"
          actions={
            <span className="k-pill">
              <ShieldCheck size={13} /> Secure protocol
            </span>
          }
        />

        <main className="flex-1 overflow-y-auto k-scroll">
          <Bands>
            <Band tone="grey">
              <motion.div
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="k-card-static max-w-3xl mx-auto overflow-hidden"
              >
                {/* Header Section */}
                <div className="px-5 py-6 md:px-8 md:py-8" style={{ borderBottom: '1px solid var(--k-grey-200)' }}>
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                    >
                      <UserPlus size={22} />
                    </div>
                    <div>
                      <h2 className="k-section-title">Account details</h2>
                      <p className="text-xs mt-1" style={{ color: 'var(--k-grey-500)' }}>
                        The new user receives their credentials by email
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Section */}
                <div className="p-5 md:p-8">
                  <form onSubmit={handleCreateAndEmail} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                      {/* Username */}
                      <div>
                        <label className="k-label">Username</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--k-grey-300)' }} size={16} />
                          <input
                            type="text"
                            required
                            placeholder="e.g. john_doe"
                            className="k-input"
                            style={{ paddingLeft: '2.4rem' }}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Role selection */}
                      <div>
                        <label className="k-label">Account role</label>
                        <div className="relative">
                          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--k-grey-300)' }} size={16} />
                          <select
                            className="k-select cursor-pointer"
                            style={{ paddingLeft: '2.4rem' }}
                            value={uiRole}
                            onChange={(e) => setUiRole(e.target.value)}
                          >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="HOD">HOD</option>
                            <option value="MANAGER">Manager</option>
                            <option value="SGM">SGM</option>
                            <option value="KAYAARA">KAYAARA</option>
                            <option value="MLS">MLS</option>
                          </select>
                        </div>
                      </div>

                      {/* Department Selection */}
                      <div className="md:col-span-2">
                        <label className="k-label">Department *</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--k-grey-300)' }} size={16} />
                          <select
                            className="k-select cursor-pointer"
                            style={{ paddingLeft: '2.4rem' }}
                            required={['HOD', 'MANAGER', 'EMPLOYEE'].includes(uiRole)}
                            value={formData.department}
                            onChange={(e) => {
                              if (e.target.value === '__add_new__') {
                                setShowAddDept(true);
                                return;
                              }
                              setFormData({ ...formData, department: e.target.value });
                            }}
                          >
                            <option value="">Select department</option>
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
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
                                className="p-4 rounded-xl flex items-center gap-3"
                                style={{
                                  background: 'var(--k-blue-tint)',
                                  border: '1px solid var(--k-blue)',
                                }}
                              >
                                <Building2 size={18} style={{ color: 'var(--k-blue)', flexShrink: 0 }} />
                                <input
                                  ref={newDeptInputRef}
                                  type="text"
                                  placeholder="Enter department name"
                                  className="k-input flex-1"
                                  style={{ background: 'var(--k-white)', minHeight: '38px' }}
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
                                  className="k-btn-primary shrink-0 flex items-center gap-1.5 text-xs px-4 py-2"
                                  style={{ minHeight: '38px' }}
                                >
                                  {addingDept ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setShowAddDept(false); setNewDeptName(''); }}
                                  className="k-btn-icon shrink-0"
                                  style={{ minHeight: '38px', minWidth: '38px' }}
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* First Name, Last Name & Short Form */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:col-span-2">
                        <div>
                          <label className="k-label">First name</label>
                          <input
                            type="text"
                            required
                            placeholder="John"
                            className="k-input"
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="k-label">Last name</label>
                          <input
                            type="text"
                            required
                            placeholder="Doe"
                            className="k-input"
                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="k-label">Short form</label>
                          <input
                            type="text"
                            placeholder="JD"
                            className="k-input"
                            onChange={(e) => setFormData({ ...formData, shortform: e.target.value.toUpperCase() })}
                          />
                        </div>
                      </div>

                      {/* Email Address */}
                      <div>
                        <label className="k-label">Corporate email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--k-grey-300)' }} size={16} />
                          <input
                            type="email"
                            required
                            placeholder="user@isoconsultancy.com"
                            className="k-input"
                            style={{ paddingLeft: '2.4rem' }}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                      </div>

                      {/* Password Input */}
                      <div>
                        <label className="k-label">Initial password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--k-grey-300)' }} size={16} />
                          <input
                            type="text"
                            required
                            placeholder="Create temporary password"
                            className="k-input"
                            style={{ paddingLeft: '2.4rem' }}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Information Note */}
                    <div className="k-card-grey p-4 flex items-start gap-3">
                      <Fingerprint size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--k-blue)' }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--k-grey-700)' }}>
                        Note: The temporary password should be shared securely with the user. They will be required to update their credentials upon first login.
                      </p>
                    </div>

                    {/* Selected Summary */}
                    {(formData.department || uiRole) && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-xl flex items-center gap-3 flex-wrap"
                        style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}
                      >
                        <Building2 size={14} style={{ color: 'var(--k-blue)' }} />
                        <span className="text-[11px] font-bold" style={{ color: 'var(--k-grey-700)' }}>
                          {['HOD', 'MANAGER', 'EMPLOYEE'].includes(uiRole) ? (selectedDeptName || 'No department') : 'No department'} {uiRole ? `• ${uiRole}` : ''}
                        </span>
                      </motion.div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="k-btn-primary w-full min-h-[44px] flex items-center justify-center gap-3 text-sm"
                    >
                      {loading ? (
                        <>Initializing account... <Loader2 size={16} className="animate-spin" /></>
                      ) : (
                        <>Finalize onboarding <Send size={14} /></>
                      )}
                    </button>
                  </form>
                </div>
              </motion.div>

              <div className="flex justify-center mt-8">
                <p className="k-eyebrow flex items-center gap-2">
                  <Shield size={12} /> Secure encrypted onboarding environment
                </p>
              </div>
            </Band>
          </Bands>
        </main>
      </div>
    </div>
  );
};

export default CreateUser;

