import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import ProfileGreetingBanner from '../../components/ProfileGreetingBanner';
import {
  Users, Briefcase, UserPlus,
  ChevronRight, Globe, ShieldCheck,
  Settings, UsersRound, Contact2, Loader2
} from 'lucide-react';
import api from '../../api';
import { getDisplayInitial, resolveMediaUrl } from '../../utils/media';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [username, setUsername] = useState(null);
  const [adminPassword, setAdminPassword] = useState('Not available');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    internalCount: 0,
    clientCount: 0,
    projectCount: 0 // Defaulting to 0 since the endpoint is missing
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const authToken = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('access');
        const response = await api.get('me/',
          {
            headers: {
              Authorization: authToken ? `Bearer ${authToken}` : undefined
            }
          }
        );

        const fullName = `${response.data.first_name || ''} ${response.data.last_name || ''}`.trim();
        setUsername(fullName || response.data.username || localStorage.getItem('username') || 'Admin User');
        setAdminPassword(response.data.password_display || 'Not available');
        setProfilePhoto(response.data.photo || '');
      } catch (error) {
        console.error(error);
        setUsername(localStorage.getItem('username') || 'Admin User');
        setAdminPassword('Not available');
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRes = await api.get('admin/users/');
        const allUsers = userRes.data;

        const internalRoles = ['hqepl', 'sgm', 'employee'];
        const internalTeam = allUsers.filter(user =>
          user.role && internalRoles.includes(user.role.toLowerCase())
        );

        const clientsOnly = allUsers.filter(user =>
          user.role?.toLowerCase() === 'client'
        );

        setStats(prev => ({
          ...prev,
          internalCount: internalTeam.length,
          clientCount: clientsOnly.length
        }));
      } catch (error) {
        console.error("User Data Sync Error:", error);
      }
    };

    const fetchProjectData = async () => {
      try {
        const projectRes = await api.get('projects/count/');
        setStats(prev => ({
          ...prev,
          projectCount: projectRes.data.count || 0
        }));
      } catch (error) {
        console.error("Project Count Sync Error:", error);
      }
    };

    // Execute both but don't fail if one fails
    Promise.allSettled([fetchUserData(), fetchProjectData()])
      .then(() => setLoading(false));
  }, []);

  const actionStats = [
    {
      label: "Team",
      value: "Manage Staff",
      icon: <UsersRound size={18} />,
      path: "/staff",
      color: "bg-slate-900"
    },
    {
      label: "Partners",
      value: "Manage Clients",
      icon: <Contact2 size={18} />,
      path: "/clients",
      color: "bg-[#F58A4B]"
    },
    {
      label: "Access",
      value: "Create User",
      icon: <UserPlus size={18} />,
      path: "/admin/createuser",
      color: "bg-indigo-600"
    },
  ];

  const metrics = [
    { label: "Internal Team", value: stats.internalCount, icon: <Users size={18} />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Clients", value: stats.clientCount, icon: <Globe size={18} />, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Projects", value: stats.projectCount, icon: <Briefcase size={18} />, color: "text-purple-600", bg: "bg-purple-50" },
  ];
  const adminPhotoSrc = resolveMediaUrl(profilePhoto);
  const adminInitial = getDisplayInitial(username, 'Admin');

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-6 md:space-y-8">

          <ProfileGreetingBanner name={username} />

          {/* HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6 md:pb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                Admin <span className="text-[#F58A4B]">Portal</span>
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Operational Integrity Verified</p>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Server Sync Active</span>
            </div>
          </div>

          {/* 1. COMPACT ACTION BUTTONS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {actionStats.map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className={`${action.color} p-3 md:p-4 rounded-[1.5rem] text-white flex items-center justify-between group transition-all hover:translate-y-[-2px] shadow-lg active:scale-95`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white/10 rounded-xl group-hover:bg-white group-hover:text-slate-900 transition-all">
                    {action.icon}
                  </div>
                  <div className="text-left">
                    <p className="text-[8px] font-bold uppercase tracking-widest opacity-50 leading-none">{action.label}</p>
                    <h2 className="text-base font-black tracking-tight mt-1">{action.value}</h2>
                  </div>
                </div>
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>

          {/* 2. PROFILE & METRICS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Admin Info */}
            <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 shadow-sm flex flex-col md:flex-row items-center gap-5 md:gap-8 group">
              <div className="relative">
                <div className="absolute inset-0 bg-[#F58A4B] opacity-0 group-hover:opacity-20 rounded-[2rem] blur-xl transition-all" />
                {adminPhotoSrc ? (
                  <img
                    src={adminPhotoSrc}
                    alt="Admin"
                    className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-[1.5rem] lg:rounded-[2rem] border-4 border-slate-50 object-cover shadow-xl grayscale hover:grayscale-0 transition-all duration-500"
                  />
                ) : (
                  <div className="relative w-24 h-24 lg:w-32 lg:h-32 rounded-[1.5rem] lg:rounded-[2rem] border-4 border-slate-50 bg-slate-100 text-slate-700 flex items-center justify-center text-3xl lg:text-4xl font-black shadow-xl uppercase">
                    {adminInitial}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <span className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg shadow-sm">
                  System Administrator
                </span>
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tighter mt-3 md:mt-4 italic uppercase leading-none">{username}</h1>
                <p className="mt-3 text-sm font-bold text-slate-600 break-all">
                  Password: <span className="text-slate-900">{adminPassword}</span>
                </p>
                {/* <p className="text-slate-400 text-xs font-bold mt-2 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" /> Authentication Level 10
              </p> */}

                {/* <div className="mt-6 flex gap-2">
                <button className="px-5 py-2.5 bg-slate-50 border border-slate-100 text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                  Profile Settings
                </button>
                <button className="p-2.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-xl hover:text-slate-900 transition-all">
                  <Settings size={16} />
                </button>
              </div> */}
              </div>
            </div>

            {/* Metric Cards */}
            <div className="lg:col-span-5 space-y-3">
              {loading ? (
                <div className="h-full flex items-center justify-center bg-white rounded-[2.5rem] border border-slate-100 py-12">
                  <Loader2 className="animate-spin text-[#F58A4B]" size={24} />
                </div>
              ) : (
                metrics.map((metric, index) => (
                  <div
                    key={index}
                    className="bg-white border border-slate-100 p-4 md:p-5 rounded-[1.5rem] shadow-sm flex items-center justify-between group hover:border-[#F58A4B]/40 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${metric.bg} ${metric.color} rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                        {metric.icon}
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{metric.label}</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{metric.value}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 opacity-20">
                      <div className="w-8 h-1 bg-slate-200 rounded-full" />
                      <div className="w-5 h-1 bg-slate-200 rounded-full" />
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminProfile;