import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import ProfileDailyPlanningBox from '../../components/ProfileDailyPlanningBox';
import EditProfileModal from '../../components/EditProfileModal';
import api from '../../api';
import {
  Users, Briefcase, Box, LayoutGrid,
  Target, ChevronRight, CheckCircle2,
  Calendar, Bell, ShieldCheck, Mail, Phone, GraduationCap, MapPin, Activity
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [fullUserData, setFullUserData] = useState(null);
  
  const [userProfile, setUserProfile] = useState({
    name: "Employee User",
    email: "",
    role: "Employee Access",
    photo: null
  });

  const [stats, setStats] = useState({
    pendingTasks: 12, // Mocked
    completedTasks: 45, // Mocked
    weeklyScore: 88, // Mocked
    productivity: 94 // Mocked percentage
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
        const storedEmail = localStorage.getItem("email") || "";
        const storedRole = localStorage.getItem("role") || "Employee";
        if (storedEmail) {
          const namePart = storedEmail.split('@')[0];
          const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          setUserProfile(prev => ({ ...prev, name: formattedName, email: storedEmail, role: `${storedRole} Access` }));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const kpis = [
    { label: "Pending Tasks", value: stats.pendingTasks, icon: <LayoutGrid size={20} />, color: "text-amber-600", bg: "bg-amber-50", trend: "+2" },
    { label: "Completed Tasks", value: stats.completedTasks, icon: <CheckCircle2 size={20} />, color: "text-emerald-600", bg: "bg-emerald-50", trend: "+12%" },
    { label: "Weekly Score", value: `${stats.weeklyScore}/100`, icon: <Target size={20} />, color: "text-blue-600", bg: "bg-blue-50", trend: "+4%" },
    { label: "Productivity", value: `${stats.productivity}%`, icon: <Activity size={20} />, color: "text-indigo-600", bg: "bg-indigo-50", trend: "High" },
    { label: "Assigned Clients", value: "3", icon: <Users size={20} />, color: "text-purple-600", bg: "bg-purple-50", trend: "Stable" },
    { label: "DDTME Submissions", value: "8", icon: <Box size={20} />, color: "text-slate-600", bg: "bg-slate-100", trend: "+1" },
  ];

  const employeePhotoSrc = resolveMediaUrl(fullUserData?.photo || userProfile.photo);
  const employeeInitial = userProfile.name.charAt(0).toUpperCase();

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Employee Workspace</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span>Execution</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-medium">Dashboard</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative">
              <Bell size={20} />
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              {employeePhotoSrc ? (
                 <img src={employeePhotoSrc} alt="Profile" className="w-9 h-9 rounded-lg object-cover shadow-sm border border-slate-200" />
              ) : (
                <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold shadow-sm">
                  {employeeInitial}
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
                <span className="text-xs font-semibold">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                Edit Profile
              </button>
              <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                <LayoutGrid size={16} />
                Open Task Board
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
                  <span className={`text-xs font-medium ${kpi.trend.startsWith('+') || kpi.trend === 'High' ? 'text-emerald-600' : 'text-slate-500'}`}>
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
                <h2 className="text-base font-semibold text-slate-800">Digital Identity</h2>
              </div>
              <div className="p-6 flex-1 space-y-6">
                
                <div className="flex items-center gap-4">
                  {employeePhotoSrc ? (
                    <img src={employeePhotoSrc} className="w-20 h-20 rounded-xl object-cover shadow-sm border border-slate-200" alt="Avatar" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold shadow-sm border border-blue-100">
                      {employeeInitial}
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
                         <GraduationCap size={16} />
                      </div>
                      <span>{userProfile.experience || 'Experience Info N/A'}</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                         <MapPin size={16} />
                      </div>
                      <span>Vadodara, Gujarat</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Daily Planning Box */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <ProfileDailyPlanningBox userId={fullUserData?.id} />
            </div>

          </div>
          
          {/* Recent Activity (Optional) */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800">Recent Task Activity</h2>
              </div>
              <div className="p-6">
                <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                  
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-emerald-500"></div>
                    <p className="text-sm font-medium text-slate-800">Task Completed</p>
                    <p className="text-sm text-slate-500 mt-1">You marked "Prepare Monthly Report" as done.</p>
                    <p className="text-xs font-semibold text-slate-400 mt-2">2 hours ago</p>
                  </div>
                  
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                    <p className="text-sm font-medium text-slate-800">New Assignment</p>
                    <p className="text-sm text-slate-500 mt-1">HQEPL assigned you to "Project Beta Execution".</p>
                    <p className="text-xs font-semibold text-slate-400 mt-2">Yesterday</p>
                  </div>
                  
                </div>
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
  );
};

export default EmployeeProfile;