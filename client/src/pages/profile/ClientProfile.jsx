import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import ProfileDailyPlanningBox from '../../components/ProfileDailyPlanningBox';
import EditProfileModal from '../../components/EditProfileModal';
import api from '../../api';
import {
  Users, Briefcase, LayoutGrid, AlertCircle,
  Target, ChevronRight, CheckCircle2, Building2,
  Bell, Mail, Phone, MapPin
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/media';

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [fullUserData, setFullUserData] = useState(null);

  const [stats, setStats] = useState({
    activeProjects: 0,
    teamMembers: 0,
    completedTasks: 18, // Mocked
    openSupportTickets: 1 // Mocked
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');

        let clientUrl = `clients/me/`;
        let projectsUrl = `projects/`;

        if (clientId) {
          clientUrl = `clients/${clientId}/`;
          projectsUrl = `clients/${clientId}/projects/`;
        }

        const [clientRes, projectsRes] = await Promise.all([
          api.get(clientUrl, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(projectsUrl, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const clientData = clientRes.data;
        const projectsData = projectsRes.data;
        const employeesData = clientData.employees || [];

        setClient(clientData);
        setProjects(projectsData);
        setEmployees(employeesData);

        setStats(prev => ({
          ...prev,
          activeProjects: projectsData.length || 0,
          teamMembers: employeesData.length || 0
        }));

        try {
          const meRes = await api.get('me/');
          setFullUserData(meRes.data);
        } catch (e) {
          console.error("Failed to fetch self info", e);
        }

      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (clientId || localStorage.getItem('access_token')) {
      fetchProfileData();
    }
  }, [clientId, navigate]);

  const kpis = [
    { label: "Active Projects", value: stats.activeProjects, icon: <Briefcase size={20} />, color: "text-blue-600", bg: "bg-blue-50", trend: "+1" },
    { label: "Team Members", value: stats.teamMembers, icon: <Users size={20} />, color: "text-emerald-600", bg: "bg-emerald-50", trend: "Stable" },
    { label: "Tasks Completed", value: stats.completedTasks, icon: <CheckCircle2 size={20} />, color: "text-indigo-600", bg: "bg-indigo-50", trend: "+12%" },
    { label: "Open Tickets", value: stats.openSupportTickets, icon: <AlertCircle size={20} />, color: "text-amber-600", bg: "bg-amber-50", trend: "In Progress" },
    { label: "Overall Progress", value: "68%", icon: <Target size={20} />, color: "text-purple-600", bg: "bg-purple-50", trend: "+4.5%" },
    { label: "Client Satisfaction", value: "4.8/5", icon: <Building2 size={20} />, color: "text-slate-600", bg: "bg-slate-100", trend: "Excellent" },
  ];

  const clientGreetingName = `${fullUserData?.first_name || ''} ${fullUserData?.last_name || ''}`.trim()
    || fullUserData?.username
    || client?.company_name
    || 'Client';
    
  const clientPhotoSrc = resolveMediaUrl(fullUserData?.photo || client?.photo);
  const clientInitial = clientGreetingName.charAt(0).toUpperCase();

  if (loading && !client) return (
    <div className="h-screen w-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Client Dashboard</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span>Partnership</span>
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
              {clientPhotoSrc ? (
                 <img src={clientPhotoSrc} alt="Profile" className="w-9 h-9 rounded-lg object-cover shadow-sm border border-slate-200" />
              ) : (
                <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold shadow-sm">
                  {clientInitial}
                </div>
              )}
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{clientGreetingName}</p>
                <p className="text-xs text-slate-500 font-medium">Strategic Partner</p>
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
                <span className="text-xs font-semibold">Active Partnership</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                Edit Information
              </button>
              <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                <LayoutGrid size={16} />
                View Project Board
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
                  <span className={`text-xs font-medium ${kpi.trend.startsWith('+') || kpi.trend === 'Stable' || kpi.trend === 'Excellent' ? 'text-emerald-600' : 'text-slate-500'}`}>
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
                <h2 className="text-base font-semibold text-slate-800">Company Information</h2>
              </div>
              <div className="p-6 flex-1 space-y-6">
                
                <div className="flex items-center gap-4">
                  {clientPhotoSrc ? (
                    <img src={clientPhotoSrc} className="w-20 h-20 rounded-xl object-cover shadow-sm border border-slate-200" alt="Avatar" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-bold shadow-sm border border-blue-100">
                      {clientInitial}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{client?.company_name || 'N/A'}</h3>
                    <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 mt-1 bg-emerald-50 px-2 py-0.5 rounded-md inline-flex border border-emerald-100">
                       Strategic Partner
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                   <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                         <Mail size={16} />
                      </div>
                      <span className="truncate">{client?.contact_email || fullUserData?.email || 'N/A'}</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                         <Phone size={16} />
                      </div>
                      <span>{client?.phone || fullUserData?.phone_number || 'N/A'}</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                         <MapPin size={16} />
                      </div>
                      <span className="truncate">{client?.address || 'N/A'}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Daily Planning Box */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <ProfileDailyPlanningBox userId={fullUserData?.id} />
            </div>

          </div>
          
          {/* Projects Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-base font-semibold text-slate-800">Recent Projects</h2>
                <button onClick={() => navigate(client?.id ? `/clients/${client.id}/` : '/clients')} className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
              </div>
              <div className="divide-y divide-slate-100">
                {projects.length === 0 ? (
                   <div className="p-6 text-center text-sm text-slate-500">No active projects found.</div>
                ) : (
                  projects.slice(0, 3).map((project) => (
                    <div key={project.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100">
                          <Briefcase size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{project.name}</p>
                          <p className="text-sm text-slate-500 mt-0.5">{project.description || 'No description provided.'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"><ChevronRight size={18} /></button>
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
          if (updatedData.photo) {
            setClient(prev => ({ ...prev, photo: updatedData.photo }));
          }
        }}
      />
    </div>
  );
};

export default ClientProfile;