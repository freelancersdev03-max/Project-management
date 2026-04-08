import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import EditProfileModal from '../../components/EditProfileModal';
import ProfileGreetingBanner from '../../components/ProfileGreetingBanner';
import ProfileDailyPlanningBox from '../../components/ProfileDailyPlanningBox';
import api from '../../api';
import { getDisplayInitial, resolveMediaUrl } from '../../utils/media';
import { formatDateTimeDDMMYYYY } from '../../utils/dateFormat';
import {
  LayoutGrid, ClipboardList, TrendingUp, Box, Eye, X,
  MapPin, Phone, Mail, Briefcase, GraduationCap, ShieldCheck,
  ChevronLeft, ChevronRight, Target, BarChart3, Calendar, Award
} from 'lucide-react';

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullUserData, setFullUserData] = useState(null);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);

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

  useEffect(() => {
    const loadAchievements = async () => {
      if (!fullUserData?.id) return;

      try {
        setLoadingAchievements(true);
        const response = await api.get('achievement/achievements/');
        const records = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.results)
            ? response.data.results
            : [];

        setAchievements(
          records.filter((item) => String(item.employeeId) === String(fullUserData.id))
        );
      } catch (error) {
        console.error('Failed to load achievements for profile:', error);
        setAchievements([]);
      } finally {
        setLoadingAchievements(false);
      }
    };

    loadAchievements();
  }, [fullUserData?.id]);

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
    { label: "Clients", value: "Portfolio", icon: <ClipboardList size={20} />, color: "text-[#F58A4B]", bg: "bg-orange-50", path: "/clients" },
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
  const sortedAchievements = [...achievements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
                          type="button"
                          onClick={() => setIsAchievementModalOpen(true)}
                          className="group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white px-4 py-3 text-left text-slate-900 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-slate-50"
                          aria-label="View achievements"
                        >
                          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-amber-200 bg-amber-50 text-amber-600 shadow-inner">
                            <Award size={22} />
                          </span>
                          <span className="flex flex-col items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Achievements</span>
                            <span className="text-sm font-black text-slate-900">{achievements.length} Total</span>
                          </span>
                        </button>
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

          {isAchievementModalOpen && (
            <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-slate-100 bg-white shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 md:px-8 md:py-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-200 bg-amber-50 text-amber-600 shadow-inner">
                      <Award size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900">Achievements</h2>
                      <p className="text-sm text-slate-500">Total achievements and previous records</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAchievementModalOpen(false)}
                    className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Close achievements popup"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="px-6 py-5 md:px-8 md:py-6 space-y-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Total Achievements</p>
                      <p className="mt-1 text-3xl font-black text-amber-700">{achievements.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {loadingAchievements ? 'Loading achievement history...' : 'Previous achievements listed below'}
                      </p>
                    </div>
                  </div>

                  {loadingAchievements ? (
                    <p className="text-sm font-medium text-slate-500">Loading achievements...</p>
                  ) : sortedAchievements.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      No achievements found yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sortedAchievements.map((item) => (
                        <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                              <h3 className="text-base font-black text-slate-900">{item.title}</h3>
                              <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
                            </div>
                            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                              {item.tokenShared ? 'Token Shared' : 'Token Not Shared'}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                            <span>Assigned by {item.assignedBy || 'N/A'}</span>
                            <span>•</span>
                            <span>{formatDateTimeDDMMYYYY(item.createdAt)}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main >

      {/* --- BIO MODAL --- */}
      {
        showModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
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