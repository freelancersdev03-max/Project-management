import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import EditProfileModal from '../../components/EditProfileModal';
import {
  Users, Briefcase, UserPlus,
  ChevronRight, Globe, ShieldCheck,
  Settings, UsersRound, Contact2, Loader2,

  Eye, X, MapPin, Phone, Mail, GraduationCap,
  LayoutGrid
} from 'lucide-react';
import api from '../../api';
import defaultAvatar from '../../assets/dashboard.jpg';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || api.defaults.baseURL || '').replace(/\/+$/, '');

const resolveProfilePhotoUrl = (photoPath) => {
  if (!photoPath) return defaultAvatar;

  if (/^(https?:)?\/\//i.test(photoPath) || photoPath.startsWith('data:') || photoPath.startsWith('blob:')) {
    return photoPath;
  }

  const normalizedPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return API_ORIGIN ? `${API_ORIGIN}${normalizedPath}` : normalizedPath;
};

const AdminProfile = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullUserData, setFullUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [userProfile, setUserProfile] = useState({
    name: "Admin User",
    email: "",
    role: "System Administrator",
    photo: null
  });

  const [stats, setStats] = useState({
    internalCount: 0,
    clientCount: 0,
    projectCount: 0
  });

  const profilePhotoSrc = resolveProfilePhotoUrl(userProfile.photo);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('me/');
        setFullUserData(data);

        let displayName = data.username;
        if (data.first_name || data.last_name) {
          displayName = `${data.first_name} ${data.last_name}`.trim();
        }

        setUserProfile({
          name: displayName,
          email: data.email,
          role: data.role === "ADMIN" ? "System Administrator" : `${data.role} Access`,
          photo: data.photo,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone_number,
          experience: data.experience,
          expertise: data.expertise
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    fetchProfile();
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

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

          {/* HEADER */}
          <div className="flex justify-between items-center border-b border-slate-200 pb-8">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
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
                className={`${action.color} p-4 rounded-[1.5rem] text-white flex items-center justify-between group transition-all hover:translate-y-[-2px] shadow-lg active:scale-95`}
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
            <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm flex items-center gap-8 group">
              <div className="relative">
                <div className="absolute inset-0 bg-[#F58A4B] opacity-0 group-hover:opacity-20 rounded-[2rem] blur-xl transition-all" />
                <img
                  src={profilePhotoSrc}
                  alt="Admin"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = defaultAvatar;
                  }}
                  className="relative w-32 h-32 rounded-[2rem] border-4 border-slate-50 object-cover shadow-xl grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>

              <div className="flex-1">
                <span className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg shadow-sm">
                  {userProfile.role}
                </span>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mt-4 italic uppercase leading-none">{userProfile.name}</h1>
                <p className="text-slate-400 text-[10px] font-bold mt-2 flex items-center gap-2">
                  <Mail size={14} className="text-[#F58A4B]" /> {userProfile.email}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-3 bg-white text-slate-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm group border border-slate-100"
                  >
                    <Eye size={16} /> View Detailed Bio
                  </button>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center gap-3 bg-[#F58A4B] text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-[#F58A4B] transition-all shadow-sm shadow-[#F58A4B]/20"
                  >
                    Edit Profile
                  </button>
                </div>
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
                    className="bg-white border border-slate-100 p-5 rounded-[1.5rem] shadow-sm flex items-center justify-between group hover:border-[#F58A4B]/40 transition-all"
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

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={fullUserData}
        onUpdate={(updatedData) => {
          setFullUserData(updatedData);
          let displayName = updatedData.username;
          if (updatedData.first_name || updatedData.last_name) {
            displayName = `${updatedData.first_name || ''} ${updatedData.last_name || ''}`.trim();
          }
          setUserProfile(prev => ({
            ...prev,
            name: displayName,
            email: updatedData.email,
            photo: updatedData.photo,
            phone: updatedData.phone_number,
            experience: updatedData.experience,
            expertise: updatedData.expertise
          }));
        }}
      />

      {/* --- BIO MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 relative border border-slate-100">

            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
              <X size={24} />
            </button>

            <div className="p-8 md:p-14">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-slate-50 pb-10 mb-10">
                <div className="relative">
                  <img
                    src={profilePhotoSrc}
                    className="w-28 h-28 rounded-3xl object-cover shadow-lg border-2 border-slate-50"
                    alt="Avatar"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = defaultAvatar;
                    }}
                  />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-6 h-6 rounded-full border-4 border-white shadow-lg"></div>
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-tight">{userProfile.name}</h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    <ShieldCheck size={16} className="text-[#F58A4B]" />
                    <p className="text-[#F58A4B] font-black uppercase text-[10px] tracking-widest">{userProfile.role}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-10">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Digital Identity</h3>
                    <div className="space-y-4 text-sm font-semibold text-slate-600">
                      <div className="flex items-center gap-4"><Mail size={18} className="text-[#F58A4B] opacity-70" /> {userProfile.email}</div>
                      <div className="flex items-center gap-4"><Phone size={18} className="text-[#F58A4B] opacity-70" /> {userProfile.phone || 'N/A'}</div>
                      <div className="flex items-center gap-4"><MapPin size={18} className="text-[#F58A4B] opacity-70" /> Vadodara, Gujarat</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Professional Info</h3>
                    <div className="space-y-4 text-sm font-semibold text-slate-600">
                      <div className="flex items-center gap-4"><GraduationCap size={18} className="text-[#F58A4B] opacity-70" /> {userProfile.experience || 'Experience Info N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Expertise</h3>
                  <div className="text-sm font-bold text-slate-600 leading-relaxed whitespace-pre-wrap italic bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                    {userProfile.expertise || 'Expertise details not provided.'}
                  </div>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-slate-50">
                <button
                  onClick={() => navigate('/employeedashboard')}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl"
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

export default AdminProfile;