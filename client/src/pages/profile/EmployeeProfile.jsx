import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import EditProfileModal from '../../components/EditProfileModal';
import ProfileGreetingBanner from '../../components/ProfileGreetingBanner';
import ProfileDailyPlanningBox from '../../components/ProfileDailyPlanningBox';
import api from '../../api';
import { getDisplayInitial, resolveMediaUrl } from '../../utils/media';
import {
  LayoutGrid, ClipboardList, TrendingUp, Box, Eye, X,
  MapPin, Phone, Mail, Briefcase, GraduationCap, ShieldCheck,
  ChevronLeft, ChevronRight, Target, BarChart3, Calendar
} from 'lucide-react';

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullUserData, setFullUserData] = useState(null);

  // Dynamic User State
  const [userProfile, setUserProfile] = useState({
    name: "Employee User",
    email: "",
    role: "Employee Access",
    photo: null
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('me/');
        setFullUserData(data);

        // Use First+Last name if available, else Username, else extract from Email
        let displayName = data.username;
        if (data.first_name || data.last_name) {
          displayName = `${data.first_name} ${data.last_name}`.trim();
        } else if (data.email) {
          // Fallback for old users
          const namePart = data.email.split('@')[0];
          displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
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
        // Fallback to localStorage if API fails
        const storedEmail = localStorage.getItem("email") || "";
        const storedRole = localStorage.getItem("role") || "Employee";
        if (storedEmail) {
          const namePart = storedEmail.split('@')[0];
          const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          setUserProfile(prev => ({ ...prev, name: formattedName, email: storedEmail, role: `${storedRole} Access` }));
        }
      }
    };

    fetchProfile();
  }, []);

  const [statsStartIndex, setStatsStartIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(4);

  useEffect(() => {
    const updateVisible = () => setVisibleCards(window.innerWidth < 768 ? 1 : 4);
    updateVisible();
    window.addEventListener('resize', updateVisible);
    return () => window.removeEventListener('resize', updateVisible);
  }, []);

  const stats = [
    { label: "Task Management", value: "Dashboard", icon: <LayoutGrid size={20} />, color: "text-blue-600", bg: "bg-blue-50", path: "/employeedashboard" },
    { label: "Clients / Project", value: "Portfolio", icon: <ClipboardList size={20} />, color: "text-[#F58A4B]", bg: "bg-orange-50", path: "/clients" },
    { label: "KPI Performance", value: "Metrics", icon: <TrendingUp size={20} />, color: "text-emerald-600", bg: "bg-emerald-50", path: "/performance" },
    { label: "Weekly Score", value: "Track", icon: <Target size={20} />, color: "text-indigo-600", bg: "bg-indigo-50", path: "/weeklyscore" },
    { label: "DDTME", value: "Review", icon: <Box size={20} />, color: "text-slate-600", bg: "bg-slate-100", path: "/ddtme" },
    { label: "MCTC", value: "Overview", icon: <Calendar size={20} />, color: "text-purple-600", bg: "bg-purple-50", path: "/mctc" },
    { label: "Visit Agenda", value: "Schedule", icon: <MapPin size={20} />, color: "text-pink-600", bg: "bg-pink-50", path: "/visitagenda" },
  ];

  const maxStatsIndex = Math.max(0, stats.length - visibleCards);
  const slidePercent = visibleCards === 1 ? 100 : 25;

  const handleStatsLeft = () => {
    setStatsStartIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStatsRight = () => {
    setStatsStartIndex((prev) => Math.min(maxStatsIndex, prev + 1));
  };

  const skills = [
    { name: "React / Next.js", level: 95 },
    { name: "Cloud Architecture", level: 88 },
    { name: "Project Management", level: 82 },
    { name: "System Design", level: 90 }
  ];
  const employeePhotoSrc = resolveMediaUrl(fullUserData?.photo || userProfile.photo);
  const employeeInitial = getDisplayInitial(userProfile.name, userProfile.email, 'Employee');

  return (
    <div className="h-screen w-screen bg-slate-50 antialiased font-sans flex overflow-hidden">
      <Sidebar />

      <main className={`flex-1 overflow-y-auto transition-all duration-300 py-4 space-y-6 md:space-y-10 animate-in fade-in duration-700`}>
        <div className="max-w-[1400px] xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10">

          <ProfileGreetingBanner name={userProfile.name} />


          {/* 1. EXECUTIVE OVERVIEW */}
          <div className="mt-6 md:mt-8 flex items-center gap-3 md:gap-6 lg:gap-8">
            <button
              type="button"
              onClick={handleStatsLeft}
              disabled={statsStartIndex === 0}
              className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm flex items-center justify-center transition-all duration-300 hover:border-[#F58A4B]/40 hover:text-[#F58A4B] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Scroll cards left"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex-1 overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${statsStartIndex * slidePercent}%)` }}
              >
                {stats.map((stat, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(stat.path)}
                    className="min-w-0 shrink-0 basis-full md:basis-1/4 px-1.5 md:px-3 text-left transition-all duration-300 group outline-none"
                  >
                    <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] shadow-sm hover:shadow-xl hover:border-[#F58A4B]/30 group-hover:-translate-y-1 transition-all duration-300 p-4 md:p-6 h-full">
                      <div className={`w-8 h-8 md:w-10 md:h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform`}>
                        {stat.icon}
                      </div>
                      <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <p className="text-lg md:text-xl font-black text-slate-900 tracking-tight mt-1">{stat.value}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStatsRight}
              disabled={statsStartIndex === maxStatsIndex}
              className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm flex items-center justify-center transition-all duration-300 hover:border-[#F58A4B]/40 hover:text-[#F58A4B] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Scroll cards right"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* 2. EMPLOYEE IDENTITY CARD */}
          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-200">
            <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-5 md:p-7 lg:p-10 shadow-2xl relative overflow-hidden text-white h-full">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#F58A4B] rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>

                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                    <div className="relative shrink-0">
                      {employeePhotoSrc ? (
                        <img
                          src={employeePhotoSrc}
                          alt="Employee"
                          className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/10 object-cover shadow-2xl"
                        />
                      ) : (
                        <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/10 bg-slate-800 flex items-center justify-center text-4xl md:text-5xl font-black shadow-2xl uppercase">
                          {employeeInitial}
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-emerald-500 w-4 h-4 md:w-5 md:h-5 rounded-full border-4 border-slate-900 shadow-lg animate-pulse"></div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <span className="bg-[#F58A4B] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg">
                        {userProfile.role}
                      </span>
                      <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight uppercase italic mt-3 md:mt-4">
                        {userProfile.name}
                      </h1>
                      <div className="mt-3 md:mt-4 flex items-center justify-center md:justify-start gap-4 text-slate-400">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-[#F58A4B]" />
                          <span className="text-xs md:text-sm font-bold break-all">{userProfile.email}</span>
                        </div>
                      </div>

                      <div className="mt-5 md:mt-8 flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4">
                        <button
                          onClick={() => setShowModal(true)}
                          className="flex items-center gap-2 md:gap-3 bg-white text-slate-900 px-5 py-3 md:px-8 md:py-3.5 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl group border border-slate-100"
                        >
                          <Eye size={16} /> View Detailed Bio
                        </button>
                        <button
                          onClick={() => setIsEditModalOpen(true)}
                          className="flex items-center gap-2 md:gap-3 bg-[#F58A4B] text-white px-5 py-3 md:px-8 md:py-3.5 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-white hover:text-[#F58A4B] transition-all shadow-xl shadow-[#F58A4B]/20"
                        >
                          Edit Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <ProfileDailyPlanningBox userId={fullUserData?.id} />
              </div>
            </div>
          </div>

          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            initialData={fullUserData}
            onUpdate={(updatedData) => {
              setFullUserData(updatedData);
              // Update display name if it changed
              let displayName = updatedData.username;
              if (updatedData.first_name || updatedData.last_name) {
                displayName = `${updatedData.first_name || ''} ${updatedData.last_name || ''}`.trim();
              }
              setUserProfile(prev => ({
                ...prev,
                name: displayName,
                email: updatedData.email,
                role: updatedData.role
                  ? (updatedData.role === "ADMIN" ? "System Administrator" : `${updatedData.role} Access`)
                  : prev.role,
                photo: updatedData.photo || prev.photo,
                first_name: updatedData.first_name ?? prev.first_name,
                last_name: updatedData.last_name ?? prev.last_name,
                phone: updatedData.phone_number ?? prev.phone,
                experience: updatedData.experience ?? prev.experience,
                expertise: updatedData.expertise ?? prev.expertise
              }));
            }}
          />

        </div>
      </main >

      {/* --- BIO MODAL --- */}
      {
        showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-300 relative border border-slate-100">

              <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <X size={24} />
              </button>

              <div className="p-8 md:p-14">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-slate-50 pb-10 mb-10">
                  {employeePhotoSrc ? (
                    <img src={employeePhotoSrc} className="w-28 h-28 rounded-3xl object-cover shadow-lg border-2 border-slate-50" alt="Avatar" />
                  ) : (
                    <div className="w-28 h-28 rounded-3xl bg-slate-100 text-slate-700 flex items-center justify-center text-3xl font-black shadow-lg border-2 border-slate-50 uppercase">
                      {employeeInitial}
                    </div>
                  )}
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
                        <div className="flex items-center gap-4"><Phone size={18} className="text-[#F58A4B] opacity-70" /> {userProfile.phone || 'N/A'}</div>
                        <div className="flex items-center gap-4"><MapPin size={18} className="text-[#F58A4B] opacity-70" /> Vadodara, Gujarat</div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-5">Career Stats</h3>
                      <div className="space-y-4 text-sm font-semibold text-slate-600">
                        <div className="flex items-center gap-4"><Briefcase size={18} className="text-[#F58A4B] opacity-70" /> {userProfile.role}</div>
                        <div className="flex items-center gap-4"><GraduationCap size={18} className="text-[#F58A4B] opacity-70" /> {userProfile.experience || 'Experience Info N/A'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Core Expertise</h3>
                    <div className="text-sm font-bold text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {userProfile.expertise || 'Expertise details not provided.'}
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
        )
      }
    </div >
  );
};

export default EmployeeProfile;