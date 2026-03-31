import React, { useState, useEffect } from 'react';
import { X, Camera, Mail, User, Phone, Briefcase, GraduationCap, Loader2 } from 'lucide-react';
import api from '../api';

const EditProfileModal = ({ isOpen, onClose, onUpdate, initialData }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone_number: '',
        experience: '',
        expertise: '',
        photo: null,
        password: '',
        confirmPassword: ''
    });
    const [previewUrl, setPreviewUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (initialData) {
            setFormData({
                username: initialData.username || '',
                email: initialData.email || '',
                phone_number: initialData.phone_number || initialData.phone || '',
                experience: initialData.experience || '',
                expertise: initialData.expertise || '',
                photo: null, // Files shouldn't be initial data from API
                password: '',
                confirmPassword: ''
            });
            setPreviewUrl(initialData.photo || '');
        }
    }, [initialData, isOpen]);

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'photo' && files && files[0]) {
            const file = files[0];
            setFormData(prev => ({ ...prev, photo: file }));
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);

            // Use FormData for file upload
            const data = new FormData();
            data.append('username', formData.username);
            data.append('phone_number', formData.phone_number);
            data.append('experience', formData.experience);
            data.append('expertise', formData.expertise);
            if (formData.photo) {
                data.append('photo', formData.photo);
            }
            if (formData.password) {
                if (formData.password !== formData.confirmPassword) {
                    setError("Passwords do not match.");
                    setLoading(false);
                    return;
                }
                data.append('password', formData.password);
            }

            const response = await api.patch('me/', data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (onUpdate) onUpdate(response.data);
            onClose();
        } catch (err) {
            console.error("Failed to update profile:", err);
            setError(err.response?.data?.detail || "Failed to update profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Edit <span className="text-[#F58A4B]">Profile</span></h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Personal Identity Management</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
                            {error}
                        </div>
                    )}

                    <form id="edit-profile-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Photo Upload */}
                        <div className="md:col-span-2 flex flex-col items-center mb-4">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center text-slate-300">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera size={32} />
                                    )}
                                </div>
                                <label className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <Camera size={20} className="text-white" />
                                    <input
                                        type="file"
                                        name="photo"
                                        onChange={handleChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </label>
                            </div>
                            <p className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Click to upload photo</p>
                        </div>

                        {/* Username */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <User size={12} className="text-[#F58A4B]" /> Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                readOnly
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-500 focus:ring-0 outline-none transition-all cursor-not-allowed"
                            />
                            <p className="text-[9px] text-slate-400 font-bold px-1 italic">* Username cannot be changed</p>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <Mail size={12} className="text-[#F58A4B]" /> Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                readOnly
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-500 focus:ring-0 outline-none transition-all cursor-not-allowed"
                            />
                            <p className="text-[9px] text-slate-400 font-bold px-1 italic">* Email cannot be changed</p>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <Phone size={12} className="text-[#F58A4B]" /> Phone Number
                            </label>
                            <input
                                type="text"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F58A4B]/20 outline-none transition-all"
                            />
                        </div>

                        {/* Experience */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <GraduationCap size={12} className="text-[#F58A4B]" /> Experience
                            </label>
                            <input
                                type="text"
                                name="experience"
                                value={formData.experience}
                                onChange={handleChange}
                                placeholder="e.g. 5 Years in Management"
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F58A4B]/20 outline-none transition-all"
                            />
                        </div>

                        {/* Expertise */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <Briefcase size={12} className="text-[#F58A4B]" /> Expertise
                            </label>
                            <textarea
                                name="expertise"
                                value={formData.expertise}
                                onChange={handleChange}
                                rows="3"
                                placeholder="e.g. Strategic Planning, Team Leadership, Process Optimization..."
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F58A4B]/20 outline-none transition-all resize-none"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <Briefcase size={12} className="text-[#F58A4B]" /> New Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Leave blank to keep current"
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F58A4B]/20 outline-none transition-all"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                <Briefcase size={12} className="text-[#F58A4B]" /> Confirm Password
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm new password"
                                className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F58A4B]/20 outline-none transition-all"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-sans"
                    >
                        Cancel
                    </button>
                    <button
                        form="edit-profile-form"
                        type="submit"
                        disabled={loading}
                        className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#F58A4B] shadow-xl shadow-slate-900/10 transition-all flex items-center justify-center gap-2 font-sans"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Updating...
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
