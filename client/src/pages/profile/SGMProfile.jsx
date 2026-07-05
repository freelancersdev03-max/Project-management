import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import ProfileDailyPlanningBox from '../../components/ProfileDailyPlanningBox';
import EditProfileModal from '../../components/EditProfileModal';
import api from '../../api';
import {
  Users, Briefcase, Box, LayoutGrid, AlertCircle,
  Target, ChevronRight, Activity, CalendarDays,
  Bell, ShieldCheck, Mail, Phone, MapPin
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';

const SGMProfile = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [fullUserData, setFullUserData] = useState(null);
  
  const [userProfile, setUserProfile] = useState({
    name: "SGM User",
    email: "",
    role: "Senior General Manager",
    photo: null
  });

  const [stats, setStats] = useState({
    assignedProjects: 12, // Mocked
    teamUtilization: 85, // Mocked percentage
    pendingReviews: 8, // Mocked
    riskAlerts: 1 // Mocked
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('me/');
        setFullUserData(data);

        let displayName = data.username;
        if (data.first_name || data.last_name) {
          displayName = `${data.first_name} ${data.last_name}`.trim();
        } else if (data.email) {
          const namePart = data.email.split('@')[0];
          displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }

        setUserProfile({
          name: displayName,
          email: data.email,
          role: data.role === "SGM" ? "Senior General Manager" : data.role,
          photo: data.photo,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone_number,
          experience: data.experience,
          expertise: data.expertise
        });

      } catch (error) {
        console.error("Failed to fetch profile:", error);
        const storedEmail = localStorage.getItem("email") || "";
        const storedRole = localStorage.getItem("role") || "SGM";
        if (storedEmail) {
          const namePart = storedEmail.split('@')[0];
          const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          setUserProfile(prev => ({ ...prev, name: formattedName, email: storedEmail, role: storedRole === "SGM" ? "System Guarantee Manager" : storedRole }));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const kpis = [
    { label: "Assigned Projects", value: stats.assignedProjects, icon: <Briefcase size={20} />, color: "text-blue-600", bg: "bg-blue-50", trend: "Active" },
    { label: "Team Utilization", value: `${stats.teamUtilization}%`, icon: <Users size={20} />, color: "text-emerald-600", bg: "bg-emerald-50", trend: "+3%" },
    { label: "Pending Reviews", value: stats.pendingReviews, icon: <Box size={20} />, color: "text-amber-600", bg: "bg-amber-50", trend: "Action Req" },
    { label: "Risk Alerts", value: stats.riskAlerts, icon: <AlertCircle size={20} />, color: "text-rose-600", bg: "bg-rose-50", trend: "Monitor" },
    { label: "KPI Performance", value: "92%", icon: <Target size={20} />, color: "text-indigo-600", bg: "bg-indigo-50", trend: "+1.5%" },
    { label: "Upcoming Agendas", value: "4", icon: <CalendarDays size={20} />, color: "text-slate-600", bg: "bg-slate-100", trend: "Scheduled" },
  ];

  const profilePhotoSrc = resolveMediaUrl(fullUserData?.photo || userProfile.photo);
  const profileInitial = userProfile.name.charAt(0).toUpperCase();

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">SGM Operations Dashboard</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span>Operations</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-medium">Overview</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative">
              <Bell size={20} />
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              {profilePhotoSrc ? (
                 <img src={profilePhotoSrc} alt="Profile" className="w-9 h-9 rounded-lg object-cover shadow-sm border border-slate-200" />
              ) : (
                <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold shadow-sm">
                  {profileInitial}
                </div>
              )}
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{loading ? 'Loading...' : userProfile.name}</p>
                <p className="text-xs text-slate-500 font-medium">{loading ? '...' : userProfile.role}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
          
          {/* Quick Actions & Sync Status */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-md border border-emerald-100 shadow-sm">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-semibold">Live Monitoring</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                Edit Profile
              </button>
              <button onClick={() => navigate('/ddtme')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                <Box size={16} />
                DDTME Approvals
              </button>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpis.map((kpi, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color}`}>
                    {kpi.icon}
                  </div>
                  <span className={`text-xs font-medium ${kpi.trend.startsWith('+') || kpi.trend === 'Active' ? 'text-emerald-600' : kpi.trend === 'Action Req' ? 'text-amber-600' : kpi.trend === 'Monitor' ? 'text-rose-600' : 'text-slate-500'}`}>
                    {kpi.trend}
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-bold text-slate-800">
                    {loading ? <div className="h-8 w-16 bg-slate-100 rounded animate-pulse"></div> : kpi.value}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">{kpi.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Widgets Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Profile Overview Card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800">SGM Digital Identity</h2>
              </div>
              <div className="p-6 flex-1 space-y-6">
                
                <div className="flex items-center gap-4">
                  {profilePhotoSrc ? (
                    <img src={profilePhotoSrc} className="w-20 h-20 rounded-xl object-cover shadow-sm border border-slate-200" alt="Avatar" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold shadow-sm border border-blue-100">
                      {profileInitial}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{loading ? 'Loading...' : userProfile.name}</h3>
                    <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 mt-1 bg-blue-50 px-2 py-0.5 rounded-md inline-flex border border-blue-100">
                       <ShieldCheck size={12} /> {loading ? '...' : userProfile.role}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                   <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                         <Mail size={16} />
                      </div>
                      <span className="truncate">{userProfile.email}</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                         <Phone size={16} />
                      </div>
                      <span>{userProfile.phone || 'Not provided'}</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                         <Activity size={16} />
                      </div>
                      <span className="truncate">SGM-Tier Access</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Daily Planning Box */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <ProfileDailyPlanningBox userId={fullUserData?.id} />
            </div>

          </div>
          
          {/* Pending Approvals Table (Mocked) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-base font-semibold text-slate-800">Pending Reviews</h2>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">{stats.pendingReviews}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0 border border-amber-100">
                        <Box size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">DDTME Submission #{1024 + item}</p>
                        <p className="text-sm text-slate-500 mt-0.5">Submitted by Employee User for Project Delta.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50">View Details</button>
                    </div>
                  </div>
                ))}
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
  );
};

export default SGMProfile;