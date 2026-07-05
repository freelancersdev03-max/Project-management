import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import {
  Users, Briefcase, Building2, HardDrive,
  Activity, Clock, ShieldAlert, Plus,
  ChevronRight, CheckCircle2, AlertCircle,
  MoreVertical, Calendar, Bell
} from 'lucide-react';
import api from '../../api';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [username, setUsername] = useState('Admin');
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    users: 0,
    organizations: 0,
    projects: 0,
    pendingTasks: 24, // Mocked until API supports it
    activeSessions: 12, // Mocked
    storageUsed: 64 // Mocked percentage
  });

  const [recentOrgs, setRecentOrgs] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch User Info
        const userRes = await api.get('me/');
        const fullName = `${userRes.data.first_name || ''} ${userRes.data.last_name || ''}`.trim();
        setUsername(fullName || userRes.data.username || 'Administrator');

        // Fetch Stats
        const [usersReq, projectsReq, orgsReq] = await Promise.allSettled([
          api.get('admin/users/'),
          api.get('projects/count/'),
          api.get('clients/list/')
        ]);

        let userCount = 0;
        let orgCount = 0;
        let projectCount = 0;
        let orgList = [];

        if (usersReq.status === 'fulfilled') {
          userCount = usersReq.value.data.length || 0;
        }
        
        if (orgsReq.status === 'fulfilled') {
          const data = orgsReq.value.data?.results || orgsReq.value.data || [];
          orgCount = data.length || 0;
          orgList = data.slice(0, 5); // Take top 5 for recent
        }

        if (projectsReq.status === 'fulfilled') {
          projectCount = projectsReq.value.data.count || 0;
        }

        setStats(prev => ({
          ...prev,
          users: userCount,
          organizations: orgCount,
          projects: projectCount
        }));
        
        setRecentOrgs(orgList);
      } catch (error) {
        console.error("Dashboard Sync Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const kpis = [
    { label: "Organizations", value: stats.organizations, icon: <Building2 size={20} />, color: "text-blue-600", bg: "bg-blue-50", trend: "+12%" },
    { label: "Active Projects", value: stats.projects, icon: <Briefcase size={20} />, color: "text-indigo-600", bg: "bg-indigo-50", trend: "+5%" },
    { label: "Total Users", value: stats.users, icon: <Users size={20} />, color: "text-emerald-600", bg: "bg-emerald-50", trend: "+18%" },
    { label: "Pending Tasks", value: stats.pendingTasks, icon: <Clock size={20} />, color: "text-amber-600", bg: "bg-amber-50", trend: "-2%" },
    { label: "Active Sessions", value: stats.activeSessions, icon: <Activity size={20} />, color: "text-rose-600", bg: "bg-rose-50", trend: "+4%" },
    { label: "Storage Usage", value: `${stats.storageUsed}%`, icon: <HardDrive size={20} />, color: "text-slate-600", bg: "bg-slate-100", trend: "Normal" },
  ];

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Executive Dashboard</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span>Admin Portal</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-medium">Overview</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold shadow-sm">
                {username.charAt(0)}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{username}</p>
                <p className="text-xs text-slate-500 font-medium">System Administrator</p>
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
                <span className="text-xs font-semibold">System Operational</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/admin/createuser')} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
                <Users size={16} />
                Invite User
              </button>
              <button onClick={() => navigate('/clients')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                <Plus size={16} />
                New Organization
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
                  <span className={`text-xs font-medium ${kpi.trend.startsWith('+') ? 'text-emerald-600' : kpi.trend.startsWith('-') ? 'text-rose-600' : 'text-slate-500'}`}>
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

          {/* Widgets Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recent Organizations */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">Recent Organizations</h2>
                <button onClick={() => navigate('/clients')} className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
              </div>
              <div className="flex-1 p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Organization Name</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Added</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                       <tr><td colSpan="4" className="px-6 py-8 text-center text-sm text-slate-400">Loading organizations...</td></tr>
                    ) : recentOrgs.length > 0 ? (
                      recentOrgs.map((org, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                {org.company_name?.charAt(0) || 'O'}
                              </div>
                              <span className="font-medium text-slate-800">{org.company_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">Recently</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => navigate(`/clients/${org.id}`)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors">
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" className="px-6 py-8 text-center text-sm text-slate-400">No organizations found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800">System Health</h2>
              </div>
              <div className="p-6 space-y-6 flex-1">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700 flex items-center gap-2"><HardDrive size={16} className="text-slate-400"/> Database Storage</span>
                    <span className="text-slate-500">64%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '64%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700 flex items-center gap-2"><Activity size={16} className="text-slate-400"/> API Processing</span>
                    <span className="text-slate-500">28%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '28%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700 flex items-center gap-2"><Users size={16} className="text-slate-400"/> Memory Allocation</span>
                    <span className="text-slate-500">42%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 text-amber-800">
                    <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">Update Available</p>
                      <p className="mt-1 opacity-90">Kayaara Server v2.4.1 is ready to install.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Widgets Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Activity Timeline */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800">Recent Activity</h2>
              </div>
              <div className="p-6">
                <div className="relative border-l-2 border-slate-100 ml-3 space-y-8">
                  
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-500"></div>
                    <p className="text-sm font-medium text-slate-800">New Organization Registered</p>
                    <p className="text-sm text-slate-500 mt-1">Acme Corp was added by Administrator.</p>
                    <p className="text-xs font-semibold text-slate-400 mt-2">2 hours ago</p>
                  </div>
                  
                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-emerald-500"></div>
                    <p className="text-sm font-medium text-slate-800">Milestone Completed</p>
                    <p className="text-sm text-slate-500 mt-1">Q3 Deliverables marked complete in Project Alpha.</p>
                    <p className="text-xs font-semibold text-slate-400 mt-2">5 hours ago</p>
                  </div>

                  <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-indigo-500"></div>
                    <p className="text-sm font-medium text-slate-800">System Backup</p>
                    <p className="text-sm text-slate-500 mt-1">Automated database snapshot completed successfully.</p>
                    <p className="text-xs font-semibold text-slate-400 mt-2">12 hours ago</p>
                  </div>

                </div>
              </div>
            </div>

            {/* Approvals */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-base font-semibold text-slate-800">Pending Approvals</h2>
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full">3</span>
              </div>
              <div className="divide-y divide-slate-100">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Access Request</p>
                        <p className="text-sm text-slate-500 mt-0.5">John Doe requested access to Alpha Project.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50">Deny</button>
                      <button className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 shadow-sm">Approve</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminProfile;