import React, { useState } from 'react';
import { X, User, Mail, Key, Eye, EyeOff, Briefcase, ShieldCheck } from 'lucide-react';
import api from '../api';

const CreateTeamMemberModal = ({ isOpen, onClose, onMemberAdded, clientId }) => {
    const [formData, setFormData] = useState({
        username: '',
        shortform: '',
        email: '',
        password: '',
        role: 'EXTERNAL'
    });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');
            // Payload structure matches backend expectation
            // Status will be default (active) and credential_access default (false) handled by backend
            const payload = { ...formData };

            await api.post(`clients/${clientId}/members/`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onMemberAdded();
            onClose();
            setFormData({ username: '', shortform: '', email: '', password: '', role: 'EXTERNAL' });
        } catch (error) {
            console.error("Error creating team member:", error);
            alert(error.response?.data?.error || "Failed to add member.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="k-backdrop z-[300]" onClick={onClose}>
            <div className="k-modal !max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="p-8 overflow-y-auto k-scroll">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold tracking-tight" style={{ color: 'var(--k-ink)' }}>
                            Add <span style={{ color: 'var(--k-blue)' }}>External Member</span>
                        </h3>
                        <button onClick={onClose} aria-label="Close add member" className="k-btn-icon">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="k-label ml-1">Member Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 z-10" size={16} style={{ color: 'var(--k-grey-300)' }} />
                                <input required className="k-input !pl-11 !py-3" placeholder="e.g. Michael Chen" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="k-label ml-1">Shortform</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 z-10" size={16} style={{ color: 'var(--k-grey-300)' }} />
                                <input
                                    required
                                    maxLength={50}
                                    className="k-input !pl-11 !py-3 uppercase"
                                    placeholder="e.g. MC"
                                    value={formData.shortform}
                                    onChange={(e) => setFormData({ ...formData, shortform: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        {/* Role Selection - Expandable if more roles needed */}
                        <div className="space-y-1.5">
                            <label className="k-label ml-1">Role</label>
                            <div className="relative group">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 z-10" size={16} style={{ color: 'var(--k-grey-300)' }} />
                                <select
                                    className="k-select !pl-11 !py-3 appearance-none"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="EXTERNAL">External User</option>
                                    <option value="SENIOR">Senior (Manager)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="k-label ml-1">Official Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 z-10" size={16} style={{ color: 'var(--k-grey-300)' }} />
                                <input required type="email" className="k-input !pl-11 !py-3" placeholder="michael@client.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="k-label ml-1">Access Password</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 z-10" size={16} style={{ color: 'var(--k-grey-300)' }} />
                                <input required type={showPassword ? "text" : "password"} className="k-input !pl-11 !pr-12 !py-3" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--k-grey-500)' }}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <div className="p-3 rounded-xl border flex gap-3 items-start" style={{ background: 'var(--k-blue-tint)', borderColor: 'var(--k-grey-200)' }}>
                                <ShieldCheck size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--k-blue)' }} />
                                <p className="text-[10px] leading-relaxed font-medium" style={{ color: 'var(--k-grey-700)' }}>
                                    <strong>Note:</strong> New users are created with <span className="uppercase">Inactive</span> credentials by default.
                                    You must explicitly grant <strong>Credential Access</strong> in the Team List after creation.
                                </p>
                            </div>
                        </div>

                        <button disabled={loading} className="k-btn-primary w-full min-h-[44px] text-sm mt-2">
                            {loading ? 'Processing...' : 'Create External Member'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateTeamMemberModal;
