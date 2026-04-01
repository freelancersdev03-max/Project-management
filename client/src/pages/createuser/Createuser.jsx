import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import api from '../../api';
import emailjs from '@emailjs/browser';
import {
  UserPlus, Mail, Lock, User,
  Shield, ArrowLeft, Send, Loader2,
  ShieldCheck, Fingerprint
} from 'lucide-react';

const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;

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
    role: 'Employee'
  });

  const handleCreateAndEmail = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/admin/create-user/", {
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        shortform: formData.shortform,
        email: formData.email,
        password: formData.password,
        role: formData.role.toUpperCase(),
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
            shortform: formData.shortform,
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

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#FBFBFB] antialiased font-sans flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto transition-all duration-300 pb-20">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-12">

          {/* Navigation Header */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-[10px] uppercase tracking-[0.2em] mb-8 transition-all group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </button>

          <div className="bg-white border border-slate-200 rounded-xl md:rounded-3xl shadow-sm overflow-hidden">
            {/* Header Section */}
            <div className="bg-white px-5 py-6 md:px-8 md:py-10 border-b border-slate-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                      Onboard New User
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Configure system access and security roles
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck size={14} /> Secure Protocol
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div className="p-5 md:p-8 lg:p-12">
              <form onSubmit={handleCreateAndEmail} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Username</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                      <input
                        type="text"
                        required
                        placeholder="e.g. john_doe"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-700"
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Role selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Account Role</label>
                    <div className="relative group">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                      <select
                        className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-700 appearance-none cursor-pointer"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      >
                        <option value="Employee">Employee</option>
                        <option value="SGM">SGM</option>
                        <option value="Hqepl">HQEPL</option>
                        <option value="Mls">MLS</option>
                      </select>
                    </div>
                  </div>

                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                      <input
                        type="text"
                        required
                        placeholder="John"
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-700"
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Doe"
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-700"
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Short Form</label>
                      <input
                        type="text"
                        placeholder="JD"
                        className="w-full px-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-700"
                        onChange={(e) => setFormData({ ...formData, shortform: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Corporate Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                      <input
                        type="email"
                        required
                        placeholder="user@isoconsultancy.com"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-700"
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Initial Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={18} />
                      <input
                        type="text"
                        required
                        placeholder="Create temporary password"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-xl focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-semibold text-slate-700"
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Information Note */}
                <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3 border border-slate-100">
                  <Fingerprint size={16} className="text-slate-400 mt-0.5" />
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    Note: The temporary password should be shared securely with the user. They will be required to update their credentials upon first login.
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 hover:bg-black transition-all shadow-sm mt-4 disabled:opacity-50 group"
                >
                  {loading ? (
                    <>Initializing Account... <Loader2 size={16} className="animate-spin text-blue-400" /></>
                  ) : (
                    <>Finalize Onboarding <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] flex items-center gap-2">
              <Shield size={12} /> Secure encrypted onboarding environment
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateUser;