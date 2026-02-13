import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../api';
import {
  LayoutGrid, ClipboardList, TrendingUp, Box, Eye, X,
  MapPin, Phone, Mail, Briefcase, GraduationCap, ShieldCheck
} from 'lucide-react';

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  // Dynamic User State
  const [userProfile, setUserProfile] = useState({
    name: "Employee User",
    email: "",
    role: "Employee Access"
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('me/');

        // Use First+Last name if available, else Username, else extract from Email
        let displayName = data.username;
        if (data.first_name || data.last_name) {
          displayName = `${data.first_name} ${data.last_name}`.trim();
        } else if (data.email) {
          // Fallback for old users
          const namePart = data.email.split('.')[0];
          displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }

        setUserProfile({
          name: displayName,
          email: data.email,
          role: data.role === "ADMIN" ? "System Administrator" : `${data.role} Access`,
          // Store other details if needed later
          first_name: data.first_name,
          last_name: data.last_name
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        // Fallback to localStorage if API fails
        const storedEmail = localStorage.getItem("email") || "";
        const storedRole = localStorage.getItem("role") || "Employee";
        if (storedEmail) {
          const namePart = storedEmail.split('.')[0];
          const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          setUserProfile(prev => ({ ...prev, name: formattedName, email: storedEmail, role: `${storedRole} Access` }));
        }
      }
    };

    fetchProfile();
  }, []);

  const stats = [
    { label: "Dashboard", value: "Active Views", icon: <LayoutGrid size={20} />, color: "text-blue-600", bg: "bg-blue-50", path: "/employeedashboard" },
    { label: "Project / Client", value: "12 Pending", icon: <ClipboardList size={20} />, color: "text-[#F58A4B]", bg: "bg-orange-50", path: "/clients" },
    { label: "KPI's", value: "94% Target", icon: <TrendingUp size={20} />, color: "text-emerald-600", bg: "bg-emerald-50", path: "/performance" },
    { label: "DDTME", value: "8 Metrics", icon: <Box size={20} />, color: "text-slate-600", bg: "bg-slate-100", path: "/metrics" },
  ];

  const skills = [
    { name: "React / Next.js", level: 95 },
    { name: "Cloud Architecture", level: 88 },
    { name: "Project Management", level: 82 },
    { name: "System Design", level: 90 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans">
      <Navbar hideLogin={true} />

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-10 animate-in fade-in duration-700">

        {/* 1. METRIC CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <button
              key={index}
              onClick={() => navigate(stat.path)}
              className="text-left bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:border-[#F58A4B]/30 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-slate-900 tracking-tight mt-1">{stat.value}</p>
            </button>
          ))}
        </div>

        {/* 2. MAIN PROFILE CARD */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>

          <div className="relative group shrink-0">
            <div className="absolute inset-0 bg-[#F58A4B] rounded-full translate-x-2 translate-y-2 opacity-10 transition-transform group-hover:scale-110"></div>
            <img
              src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=256"
              alt="Profile"
              className="w-40 h-40 md:w-44 md:h-44 rounded-full border-4 border-white object-cover shadow-2xl relative z-10"
            />
          </div>

          <div className="flex-1 text-center md:text-left z-10">
            <span className="bg-orange-50 text-[#F58A4B] text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg border border-orange-100">
              {userProfile.role}
            </span>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mt-4 italic uppercase">
              {userProfile.name}
            </h1>
            <div className="mt-3 flex items-center justify-center md:justify-start gap-2 text-slate-400 font-medium">
              <Mail size={16} className="text-[#F58A4B]" />
              <span className="text-sm">{userProfile.email}</span>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center md:justify-start gap-4">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#F58A4B] transition-all shadow-xl shadow-slate-200 group"
              >
                <Eye size={18} /> View Detailed Bio
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="bg-white border border-slate-200 text-slate-600 px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* --- BIO MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 relative border border-slate-100">

            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
              <X size={24} />
            </button>

            <div className="p-8 md:p-14">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-slate-50 pb-10 mb-10">
                <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=256" className="w-28 h-28 rounded-3xl object-cover shadow-lg border-2 border-slate-50" alt="Avatar" />
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">{userProfile.name}</h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    <ShieldCheck size={16} className="text-[#F58A4B]" />
                    <p className="text-[#F58A4B] font-black uppercase text-[10px] tracking-widest">ID: HQ-2026-084</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-10">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Digital Identity</h3>
                    <div className="space-y-4 text-sm font-semibold text-slate-600">
                      <div className="flex items-center gap-4"><Mail size={18} className="text-[#F58A4B] opacity-70" /> {userProfile.email}</div>
                      <div className="flex items-center gap-4"><Phone size={18} className="text-[#F58A4B] opacity-70" /> +91 98765 43210</div>
                      <div className="flex items-center gap-4"><MapPin size={18} className="text-[#F58A4B] opacity-70" /> Vadodara, Gujarat</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Career Stats</h3>
                    <div className="space-y-4 text-sm font-semibold text-slate-600">
                      <div className="flex items-center gap-4"><Briefcase size={18} className="text-[#F58A4B] opacity-70" /> Senior Architect</div>
                      <div className="flex items-center gap-4"><GraduationCap size={18} className="text-[#F58A4B] opacity-70" /> M.Tech Systems</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Expertise</h3>
                  <div className="space-y-6">
                    {skills.map((skill) => (
                      <div key={skill.name}>
                        <div className="flex justify-between mb-2">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter">{skill.name}</span>
                          <span className="text-[11px] font-black text-[#F58A4B]">{skill.level}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full transition-all duration-1000" style={{ width: `${skill.level}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-slate-50">
                <button
                  onClick={() => navigate('/employeedashboard')}
                  className="w-full bg-[#F58A4B] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-orange-100"
                >
                  Enter Full Dashboard <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;