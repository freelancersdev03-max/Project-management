import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import emailjs from '@emailjs/browser'; // Commented out for now
import Navbar from '../../components/Navbar';
import api from '../../api';
import { 
  UserPlus, Mail, Lock, User, 
  Shield, ArrowLeft, Send, Loader2, Sparkles 
} from 'lucide-react';

const CreateUser = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Employee'
  });

  const handleCreateAndEmail = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1️⃣ CREATE USER IN BACKEND
      const res = await api.post("admin/create-user/", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role.toUpperCase(), 
      });

      /* // 2️⃣ EMAILJS FUNCTIONALITY (DISABLED FOR NOW)
      const SERVICE_ID = 'service_oczgldo';
      const TEMPLATE_ID = 'template_e5223pj';
      const PUBLIC_KEY = 'GmA-Cd5MqIElqmX5b';

      const templateParams = {
        to_name: formData.username,
        user_email: formData.email,
        user_password: formData.password,
        user_role: formData.role,
      };

      await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
      */

      alert(`User ${res.data.username} created successfully!`);
      navigate('/admin/');

    } catch (err) {
      console.error(err);
      alert(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "User creation failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans">
      <Navbar hideLogin={true} />

      <main className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Navigation Header */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-[#F58A4B] font-bold text-xs uppercase tracking-widest mb-10 transition-all group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Admin Directory
        </button>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden relative">
          {/* Brand Accent Bar */}
          <div className="h-2 w-full bg-[#F58A4B]"></div>
          
          <div className="p-8 md:p-16">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-slate-900 text-[#F58A4B] rounded-2xl shadow-lg shadow-slate-200">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    Onboard <span className="text-[#F58A4B]">New User</span>
                  </h1>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-1">
                    System Access Configuration
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-full text-[#F58A4B] text-[10px] font-black uppercase tracking-tighter">
                <Sparkles size={14} /> Secure Protocol Active
              </div>
            </div>

            <form onSubmit={handleCreateAndEmail} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Username */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Username</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#F58A4B] transition-colors" size={18} />
                    <input 
                      type="text"
                      required
                      placeholder="Enter username"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#F58A4B] focus:bg-white outline-none transition-all font-semibold text-slate-900"
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                </div>

                {/* Role selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Account Role</label>
                  <div className="relative group">
                    <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#F58A4B] transition-colors" size={18} />
                    <select 
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#F58A4B] focus:bg-white outline-none transition-all font-semibold text-slate-900 appearance-none cursor-pointer"
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="Employee">Employee</option>
                      <option value="SGM">SGM</option>
                      <option value="Hqepl">HQEPL</option>
                     
                    </select>
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Corporate Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#F58A4B] transition-colors" size={18} />
                    <input 
                      type="email"
                      required
                      placeholder="user@company.com"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#F58A4B] focus:bg-white outline-none transition-all font-semibold text-slate-900"
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 ml-1">Temporary Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#F58A4B] transition-colors" size={18} />
                    <input 
                      type="text"
                      required
                      placeholder="Set initial password"
                      className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:border-[#F58A4B] focus:bg-white outline-none transition-all font-semibold text-slate-900"
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg shadow-slate-200 mt-6 disabled:opacity-50 group"
              >
                {loading ? (
                  <>Initializing System... <Loader2 size={18} className="animate-spin text-[#F58A4B]" /></>
                ) : (
                  <>Finalize User Onboarding <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                )}
              </button>
            </form>
          </div>
        </div>
        
        <p className="text-center mt-10 text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] leading-relaxed">
          Security audit logged for this action <br />
          Data encryption active for secure onboarding
        </p>
      </main>
    </div>
  );
};

export default CreateUser;