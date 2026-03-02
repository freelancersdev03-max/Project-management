import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import {
  Mail,
  LayoutGrid,
  Briefcase,
  Target,
  Box,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../../api';

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [statsStartIndex, setStatsStartIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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

        setClient(clientRes.data);
        setProjects(projectsRes.data);

        setEmployees(clientRes.data.employees || []);

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

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F58A4B]"></div>
    </div>
  );

  if (!client) return <div className="p-20 text-center font-bold text-slate-400">Client Profile Not Found</div>;

  const profileCards = [
    { label: 'Task Manage', value: 'Dashboard', icon: <LayoutGrid size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', path: '/employeedashboard' },
    { label: 'Clients / Project', value: 'Portfolio', icon: <Briefcase size={20} />, color: 'text-purple-600', bg: 'bg-purple-50', path: client?.id ? `/clients/${client.id}/` : '/clients' },
    { label: 'KPI Performance', value: 'Metrics', icon: <Target size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/weekly-score' },
    { label: 'DDTME', value: 'Review', icon: <Box size={20} />, color: 'text-orange-600', bg: 'bg-orange-50', path: '/ddtme' },
    { label: 'Team Members', value: `${employees.length}`, icon: <Users size={20} />, color: 'text-rose-600', bg: 'bg-rose-50', path: '/staff' },
    { label: 'Visit Agenda', value: 'Schedule', icon: <CalendarDays size={20} />, color: 'text-cyan-600', bg: 'bg-cyan-50', path: '/visitagenda' },
  ];

  const visibleCards = 4;
  const maxStatsIndex = Math.max(0, profileCards.length - visibleCards);

  const handleStatsLeft = () => {
    setStatsStartIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStatsRight = () => {
    setStatsStartIndex((prev) => Math.min(maxStatsIndex, prev + 1));
  };

  return (
    <div className="h-screen w-screen bg-slate-50 antialiased font-sans flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 overflow-y-auto transition-all py-8 space-y-16 animate-in fade-in duration-700">
        <div className="max-w-400 mx-auto px-6 md:px-10">

          <div className="mt-14 flex items-center gap-6 md:gap-8">
            <button
              type="button"
              onClick={handleStatsLeft}
              disabled={statsStartIndex === 0}
              className="h-12 w-12 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm flex items-center justify-center transition-all duration-300 hover:border-[#F58A4B]/40 hover:text-[#F58A4B] disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Scroll cards left"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex-1 overflow-hidden">
              <div
                className="flex -mx-3 md:-mx-4 transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${statsStartIndex * 25}%)` }}
              >
                {profileCards.map((stat, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(stat.path)}
                    className="min-w-0 shrink-0 basis-1/4 px-3 md:px-4 text-left bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:border-[#F58A4B]/30 hover:-translate-y-1 transition-all duration-300 group"
                  >
                    <div className="p-6">
                      <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        {stat.icon}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                      <p className="text-xl font-black text-slate-900 tracking-tight mt-1">{stat.value}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStatsRight}
              disabled={statsStartIndex === maxStatsIndex}
              className="h-12 w-12 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm flex items-center justify-center transition-all duration-300 hover:border-[#F58A4B]/40 hover:text-[#F58A4B] disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Scroll cards right"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="mt-12 pt-12 border-t border-slate-200">
            <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden text-white">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#F58A4B] rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>

              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                <div className="relative shrink-0">
                  <div className="w-40 h-40 rounded-full border-4 border-white/10 bg-slate-800 flex items-center justify-center text-5xl font-black shadow-2xl uppercase">
                    {(client.company_name || 'C').charAt(0)}
                  </div>
                  <div className="absolute bottom-4 right-4 bg-emerald-500 w-5 h-5 rounded-full border-4 border-slate-900 shadow-lg animate-pulse"></div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <span className="bg-[#F58A4B] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg">
                    Client Organization
                  </span>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase italic mt-4">
                    {client.company_name || 'Client Profile'}
                  </h1>
                  <div className="mt-4 flex items-center justify-center md:justify-start gap-4 text-slate-400">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-[#F58A4B]" />
                      <span className="text-sm font-bold">{client.contact_email || 'N/A'}</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-300 mt-4">
                    Projects: {projects.length} • Team Members: {employees.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ClientProfile;