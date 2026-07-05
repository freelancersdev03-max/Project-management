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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">
                            Add <span className="text-[#f5914e]">External Member</span>
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Member Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0086FF]" size={16} />
                                <input required className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="e.g. Michael Chen" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Shortform</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0086FF]" size={16} />
                                <input
                                    required
                                    maxLength={50}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase"
                                    placeholder="e.g. MC"
                                    value={formData.shortform}
                                    onChange={(e) => setFormData({ ...formData, shortform: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        {/* Role Selection - Expandable if more roles needed */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Role</label>
                            <div className="relative group">
                                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0086FF]" size={16} />
                                <select
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="EXTERNAL">External User</option>
                                    <option value="SENIOR">Senior (Manager)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Official Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0086FF]" size={16} />
                                <input required type="email" className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="michael@client.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Access Password</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#0086FF]" size={16} />
                                <input required type={showPassword ? "text" : "password"} className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex gap-3 items-start">
                                <ShieldCheck size={16} className="text-amber-500 mt-0.5" />
                                <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                    <strong>Note:</strong> New users are created with <span className="uppercase">Inactive</span> credentials by default.
                                    You must explicitly grant <strong>Credential Access</strong> in the Team List after creation.
                                </p>
                            </div>
                        </div>

                        <button disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#0086FF] transition-all shadow-lg mt-2">
                            {loading ? 'Processing...' : 'Create External Member'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateTeamMemberModal;
