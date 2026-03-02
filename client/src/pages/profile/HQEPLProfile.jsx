import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import {
  Users,
  Briefcase,
  Box,
  LayoutGrid,
  Target,
  ChevronRight,
  Mail,
  ShieldCheck,
  ChevronLeft,
  CalendarDays
} from 'lucide-react';
import api from '../../api';

const HQEPLProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [statsStartIndex, setStatsStartIndex] = useState(0);

  const [adminProfile, setAdminProfile] = useState({
    name: "HQEPL User",
    email: "admin@hqepl.com",
    role: "Top Management"
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const storedEmail = localStorage.getItem('email') || '';

        if (storedEmail) {
          const namePart = storedEmail.split('.')[0];
          setAdminProfile(prev => ({
            ...prev,
            name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
            email: storedEmail,
            role: 'Top Management'
          }));
        }

        try {
          const meRes = await api.get('me/');
          if (meRes.data) {
            const u = meRes.data;
            let displayName = u.username || 'HQEPL User';

            if (u.first_name || u.last_name) {
              displayName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
            } else if (u.email) {
              const emailName = u.email.split('.')[0];
              displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
            }

            setAdminProfile({
              name: displayName,
              email: u.email || storedEmail || 'admin@hqepl.com',
              role: 'Top Management'
            });
          }
        } catch (e) {
          console.error('Failed profile fetch', e);
        }

      } catch (error) {
        console.error('Failed to fetch profile details', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const hqeplStats = [
    { label: 'Task Manage', value: 'Dashboard', icon: <LayoutGrid size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', path: '/admin/dashboard' },
    { label: 'Clients / Project', value: 'Portfolio', icon: <Briefcase size={20} />, color: 'text-purple-600', bg: 'bg-purple-50', path: '/clients' },
    { label: 'KPI Performance', value: 'Metrics', icon: <Target size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/weekly-score' },
    { label: 'DDTME Approval', value: 'Review', icon: <Box size={20} />, color: 'text-orange-600', bg: 'bg-orange-50', path: '/ddtme' },
    { label: 'MCTC', value: 'Overview', icon: <Users size={20} />, color: 'text-rose-600', bg: 'bg-rose-50', path: '/mctc' },
    { label: 'Visit Agenda', value: 'Schedule', icon: <CalendarDays size={20} />, color: 'text-cyan-600', bg: 'bg-cyan-50', path: '/visitagenda' },
  ];

  const visibleCards = 4;
  const maxStatsIndex = Math.max(0, hqeplStats.length - visibleCards);

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
                {hqeplStats.map((stat, index) => (
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
                  <div className="w-40 h-40 rounded-full border-4 border-white/10 bg-slate-800 flex items-center justify-center text-5xl font-black shadow-2xl">
                    {adminProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute bottom-4 right-4 bg-emerald-500 w-5 h-5 rounded-full border-4 border-slate-900 shadow-lg animate-pulse"></div>
                </div>

                <div className="flex-1 text-center md:text-left">
                  <span className="bg-[#F58A4B] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg">
                    {loading ? 'Loading...' : adminProfile.role}
                  </span>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase italic mt-4">
                    {loading ? 'Loading...' : adminProfile.name}
                  </h1>
                  <div className="mt-4 flex items-center justify-center md:justify-start gap-4 text-slate-400">
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-[#F58A4B]" />
                      <span className="text-sm font-bold">{adminProfile.email}</span>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-400" />
                      <span className="text-sm font-bold">HQEPL Profile Page</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default HQEPLProfile;