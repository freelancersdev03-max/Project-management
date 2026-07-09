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
        } else if (name === 'phone_number') {
            // Allow only digits and limit to 10 characters
            const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
            setFormData(prev => ({ ...prev, [name]: digitsOnly }));
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
        <div className="k-backdrop z-[300]" onClick={onClose}>
            <div className="k-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-8 py-6 border-b flex justify-between items-center sticky top-0 z-10" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-white)' }}>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--k-ink)' }}>
                            Edit <span style={{ color: 'var(--k-blue)' }}>Profile</span>
                        </h2>
                        <p className="k-eyebrow mt-1">Personal Identity Management</p>
                    </div>
                    <button onClick={onClose} aria-label="Close edit profile" className="k-btn-icon">
                        <X size={22} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 k-scroll">
                    {error && (
                        <div className="p-4 rounded-2xl text-xs font-bold border" style={{ background: 'var(--k-blue-tint)', borderColor: 'var(--k-grey-200)', color: 'var(--k-ink)' }}>
                            {error}
                        </div>
                    )}

                    <form id="edit-profile-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Photo Upload */}
                        <div className="md:col-span-2 flex flex-col items-center mb-4">
                            <div className="relative group">
                                <div
                                    className="w-24 h-24 rounded-full border-4 overflow-hidden flex items-center justify-center"
                                    style={{ background: 'var(--k-band-grey)', borderColor: 'var(--k-white)', color: 'var(--k-grey-300)', boxShadow: 'var(--k-shadow-card)' }}
                                >
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera size={32} />
                                    )}
                                </div>
                                <label
                                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                    style={{ background: 'rgba(33, 33, 33, 0.45)' }}
                                >
                                    <Camera size={20} style={{ color: 'var(--k-white)' }} />
                                    <input
                                        type="file"
                                        name="photo"
                                        onChange={handleChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                </label>
                            </div>
                            <p className="k-eyebrow mt-2">Click to upload photo</p>
                        </div>

                        {/* Username */}
                        <div className="space-y-2">
                            <label className="k-label flex items-center gap-2">
                                <User size={12} style={{ color: 'var(--k-blue)' }} /> Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                readOnly
                                className="k-input cursor-not-allowed"
                                style={{ background: 'var(--k-band-grey)', color: 'var(--k-grey-500)' }}
                            />
                            <p className="text-[10px] font-medium px-1 italic" style={{ color: 'var(--k-grey-500)' }}>* Username cannot be changed</p>
                        </div>

                        {/* Email */}
                        <div className="space-y-2">
                            <label className="k-label flex items-center gap-2">
                                <Mail size={12} style={{ color: 'var(--k-blue)' }} /> Email Address
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                readOnly
                                className="k-input cursor-not-allowed"
                                style={{ background: 'var(--k-band-grey)', color: 'var(--k-grey-500)' }}
                            />
                            <p className="text-[10px] font-medium px-1 italic" style={{ color: 'var(--k-grey-500)' }}>* Email cannot be changed</p>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-2">
                            <label className="k-label flex items-center gap-2">
                                <Phone size={12} style={{ color: 'var(--k-blue)' }} /> Phone Number
                            </label>
                            <input
                                type="text"
                                name="phone_number"
                                value={formData.phone_number}
                                onChange={handleChange}
                                maxLength="10"
                                placeholder="10 digits max"
                                className="k-input"
                            />
                            <p className="text-[10px] font-medium px-1 italic" style={{ color: 'var(--k-grey-500)' }}>* Maximum 10 digits allowed</p>
                        </div>

                        {/* Experience */}
                        <div className="space-y-2">
                            <label className="k-label flex items-center gap-2">
                                <GraduationCap size={12} style={{ color: 'var(--k-blue)' }} /> Experience
                            </label>
                            <input
                                type="text"
                                name="experience"
                                value={formData.experience}
                                onChange={handleChange}
                                placeholder="e.g. 5 Years in Management"
                                className="k-input"
                            />
                        </div>

                        {/* Expertise */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="k-label flex items-center gap-2">
                                <Briefcase size={12} style={{ color: 'var(--k-blue)' }} /> Expertise
                            </label>
                            <textarea
                                name="expertise"
                                value={formData.expertise}
                                onChange={handleChange}
                                rows="3"
                                placeholder="e.g. Strategic Planning, Team Leadership, Process Optimization..."
                                className="k-textarea resize-none"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="k-label flex items-center gap-2">
                                <Briefcase size={12} style={{ color: 'var(--k-blue)' }} /> New Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Leave blank to keep current"
                                className="k-input"
                            />
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="k-label flex items-center gap-2">
                                <Briefcase size={12} style={{ color: 'var(--k-blue)' }} /> Confirm Password
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm new password"
                                className="k-input"
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 md:p-8 border-t flex gap-4" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-band-grey)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="k-btn-ghost flex-1 min-h-[44px] text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        form="edit-profile-form"
                        type="submit"
                        disabled={loading}
                        className="k-btn-primary flex-[2] min-h-[44px] text-sm flex items-center justify-center gap-2"
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
