import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import EditProfileModal from '../../components/EditProfileModal';
import ProfileGreetingBanner from '../../components/ProfileGreetingBanner';
import ProfileDailyPlanningBox from '../../components/ProfileDailyPlanningBox';
import api from '../../api'; // Assuming you use the api instance we set up
import {
  Users, Briefcase, Box, Eye, LayoutGrid,
  Target, ChevronRight, Mail, ShieldCheck, UserPlus, TrendingUp, ChevronLeft, CalendarDays,
  Phone, X
} from 'lucide-react';
import { getDisplayInitial, resolveMediaUrl } from '../../utils/media';

const SGMProfile = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullUserData, setFullUserData] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const [userProfile, setUserProfile] = useState({
    name: "SGM User",
    email: "",
    role: "System Guarantee Manager"
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Profile Setup
        const storedEmail = localStorage.getItem("email") || "";
        const storedRole = localStorage.getItem("role") || "SGM";
        if (storedEmail) {
          const namePart = storedEmail.split('@')[0];
          setUserProfile({
            name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
            email: storedEmail,
            role: storedRole === "SGM" ? "System Guarantee Manager" : storedRole
          });
        }

        // 2. Parallel API calls to your new endpoints
        const [projectsRes, employeesRes, meRes] = await Promise.all([
          api.get("sgm/projects/"),
          api.get("sgm/employees/"),
          api.get("me/")
        ]);

        const meData = meRes.data;
        setFullUserData(meData);
        let displayName = meData.username;
        if (meData.first_name || meData.last_name) {
          displayName = `${meData.first_name} ${meData.last_name}`.trim();
        } else if (meData.email) {
          const namePart = meData.email.split('@')[0];
          displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }

        setUserProfile({
          name: displayName,
          email: meData.email,
          role: meData.role === "SGM" ? "System Guarantee Manager" : meData.role
        });

        setProjects(projectsRes.data);
        setEmployees(employeesRes.data);
      } catch (err) {
        console.error("Dashboard Load Error:", err);
        setError("Failed to synchronize with central server.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Function to handle team assignment (logic for your assign-team/ endpoint)
  const handleAssignTeam = (projectId) => {
    // This would typically open a modal to select employees and then:
    // api.post(`sgm/projects/${projectId}/assign-team/`, { employee_ids: [...] })
    navigate(`/clients`);
  };

  const [statsStartIndex, setStatsStartIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(4);

  useEffect(() => {
    const updateVisible = () => setVisibleCards(window.innerWidth < 768 ? 1 : 4);
    updateVisible();
    window.addEventListener('resize', updateVisible);
    return () => window.removeEventListener('resize', updateVisible);
  }, []);

  const sgmStats = [
    { label: "Task Management", value: "Dashboard", icon: <LayoutGrid size={20} />, color: "text-blue-600", bg: "bg-blue-50", path: "/employeedashboard" },
    { label: "Clients", value: "Portfolio", icon: <Briefcase size={20} />, color: "text-purple-600", bg: "bg-purple-50", path: "/clients" },
    { label: "KPI Performance", value: "Metrics", icon: <Target size={20} />, color: "text-emerald-600", bg: "bg-emerald-50", path: "/weekly-score" },
    { label: "DDTME", value: "Review", icon: <Box size={20} />, color: "text-orange-600", bg: "bg-orange-50", path: "/ddtme" },
    { label: "MCTC", value: "Overview", icon: <Users size={20} />, color: "text-rose-600", bg: "bg-rose-50", path: "/mctc" },
    { label: "Visit Agenda", value: "Schedule", icon: <CalendarDays size={20} />, color: "text-cyan-600", bg: "bg-cyan-50", path: "/visitagenda" },
  ];

  const maxStatsIndex = Math.max(0, sgmStats.length - visibleCards);
  const slidePercent = visibleCards === 1 ? 100 : 25;

  const handleStatsLeft = () => {
    setStatsStartIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStatsRight = () => {
    setStatsStartIndex((prev) => Math.min(maxStatsIndex, prev + 1));
  };
  const sgmPhotoSrc = resolveMediaUrl(fullUserData?.photo || userProfile.photo);
  const sgmInitial = getDisplayInitial(userProfile.name, userProfile.email, 'SGM');

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
                {sgmStats.map((stat, index) => (
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

          {/* 2. SGM IDENTITY CARD */}
          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-200">
            <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-5 md:p-7 lg:p-10 shadow-2xl relative overflow-hidden text-white h-full">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#F58A4B] rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>

                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                    <div className="relative shrink-0">
                      {sgmPhotoSrc ? (
                        <img
                          src={sgmPhotoSrc}
                          alt="SGM"
                          className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/10 object-cover shadow-2xl"
                        />
                      ) : (
                        <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/10 bg-slate-800 flex items-center justify-center text-4xl md:text-5xl font-black shadow-2xl uppercase">
                          {sgmInitial}
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-emerald-500 w-4 h-4 md:w-5 md:h-5 rounded-full border-4 border-slate-900 shadow-lg animate-pulse"></div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                        <div>
                          <span className="bg-[#F58A4B] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg">
                            {userProfile.role}
                          </span>
                          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight uppercase italic mt-3 md:mt-4">
                            {userProfile.name}
                          </h1>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-6 flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-slate-400 border-b border-white/5 pb-3 md:pb-4 mb-3 md:mb-4">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-[#F58A4B]" />
                          <span className="text-xs md:text-sm font-bold tracking-tight break-all">{userProfile.email}</span>
                        </div>
                        {fullUserData?.phone_number && (
                          <div className="flex items-center gap-2">
                            <Phone size={16} className="text-[#F58A4B]" />
                            <span className="text-xs md:text-sm font-bold tracking-tight">{fullUserData.phone_number}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4">
                        <button
                          onClick={() => setIsInfoModalOpen(true)}
                          className="px-5 py-3 md:px-8 md:py-3.5 bg-white text-slate-900 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl border border-slate-100"
                        >
                          <span className="inline-flex items-center gap-2"><Eye size={16} /> View Information</span>
                        </button>
                        <button
                          onClick={() => setIsEditModalOpen(true)}
                          className="px-5 py-3 md:px-8 md:py-3.5 bg-[#F58A4B] text-white rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-white hover:text-[#F58A4B] transition-all shadow-xl shadow-[#F58A4B]/20"
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
                role: updatedData.role === "SGM" ? "System Guarantee Manager" : (updatedData.role || prev.role),
                photo: updatedData.photo || prev.photo
              }));
            }}
          />

          {isInfoModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl relative border border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInfoModalOpen(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={22} />
                </button>

                <div className="p-8 md:p-10 space-y-6">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">SGM Information</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Name</p>
                      <p className="font-bold text-slate-800">{userProfile.name || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Role</p>
                      <p className="font-bold text-slate-800">{userProfile.role || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email</p>
                      <p className="font-bold text-slate-800 break-all">{userProfile.email || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Phone</p>
                      <p className="font-bold text-slate-800">{fullUserData?.phone_number || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Experience</p>
                      <p className="font-bold text-slate-800">{fullUserData?.experience || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Expertise</p>
                      <p className="font-bold text-slate-800 whitespace-pre-wrap">{fullUserData?.expertise || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projects</p>
                      <p className="text-xl font-black text-slate-900">{projects.length}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employees</p>
                      <p className="text-xl font-black text-slate-900">{employees.length}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default SGMProfile;