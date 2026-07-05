import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import EditProfileModal from '../../components/EditProfileModal';
import ProfileGreetingBanner from '../../components/ProfileGreetingBanner';
import ProfileDailyPlanningBox from '../../components/ProfileDailyPlanningBox';
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
  Phone,
  MapPin,
  Eye,
  X
} from 'lucide-react';
import api from '../../api';
import { getDisplayInitial, resolveMediaUrl } from '../../utils/media';

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statsStartIndex, setStatsStartIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullUserData, setFullUserData] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

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

        // Also fetch 'me' for the edit modal
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

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F58A4B]"></div>
    </div>
  );

  if (!client) return <div className="p-20 text-center font-bold text-slate-400">Client Profile Not Found</div>;

  const profileCards = [
    { label: 'Task Management', value: 'Dashboard', icon: <LayoutGrid size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', path: '/employeedashboard' },
    { label: 'Clients', value: 'Portfolio', icon: <Briefcase size={20} />, color: 'text-purple-600', bg: 'bg-purple-50', path: client?.id ? `/clients/${client.id}/` : '/clients' },
    { label: 'KPI Performance', value: 'Metrics', icon: <Target size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', path: '/weekly-score' },
    { label: 'DDTME', value: 'Review', icon: <Box size={20} />, color: 'text-orange-600', bg: 'bg-orange-50', path: '/ddtme' },
    { label: 'Team Members', value: `${employees.length}`, icon: <Users size={20} />, color: 'text-rose-600', bg: 'bg-rose-50', path: '/staff' },
    { label: 'Visit Agenda', value: 'Schedule', icon: <CalendarDays size={20} />, color: 'text-cyan-600', bg: 'bg-cyan-50', path: '/visitagenda' },
  ];

  const visibleCards = window.innerWidth < 768 ? 1 : 4;
  const maxStatsIndex = Math.max(0, profileCards.length - visibleCards);
  const slidePercent = visibleCards === 1 ? 100 : 25;

  const handleStatsLeft = () => {
    setStatsStartIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStatsRight = () => {
    setStatsStartIndex((prev) => Math.min(maxStatsIndex, prev + 1));
  };

  const clientGreetingName = `${fullUserData?.first_name || ''} ${fullUserData?.last_name || ''}`.trim()
    || fullUserData?.username
    || client?.company_name
    || 'Client';
  const clientPhotoSrc = resolveMediaUrl(fullUserData?.photo || client?.photo);
  const clientInitial = getDisplayInitial(client?.company_name, fullUserData?.username, 'Client');

  return (
    <div className="h-screen w-screen bg-slate-50 antialiased font-sans flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto transition-all py-4 space-y-6 md:space-y-10 animate-in fade-in duration-700">
        <div className="max-w-[1400px] xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10">

          <ProfileGreetingBanner name={clientGreetingName} />

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
                {profileCards.map((stat, index) => (
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

          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-slate-200">
            <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-5 md:p-7 lg:p-10 shadow-2xl relative overflow-hidden text-white h-full">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#F58A4B] rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>

                  <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                    <div className="relative shrink-0">
                      {clientPhotoSrc ? (
                        <img
                          src={clientPhotoSrc}
                          alt="Client"
                          className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/10 object-cover shadow-2xl"
                        />
                      ) : (
                        <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/10 bg-slate-800 flex items-center justify-center text-4xl md:text-5xl font-black shadow-2xl uppercase">
                          {clientInitial}
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-emerald-500 w-4 h-4 md:w-5 md:h-5 rounded-full border-4 border-slate-900 shadow-lg animate-pulse"></div>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                        <div>
                          <span className="bg-[#F58A4B] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg">
                            Strategic Partner
                          </span>
                          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight uppercase italic mt-3 md:mt-4">
                            {client.company_name}
                          </h1>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-8 flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8 text-slate-400 border-b border-white/5 pb-3 md:pb-4 mb-3 md:mb-4">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-[#F58A4B]" />
                          <span className="text-xs md:text-sm font-bold tracking-tight break-all">{client.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-[#F58A4B]" />
                          <span className="text-xs md:text-sm font-bold tracking-tight">{client.phone}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-[#F58A4B]" />
                          <span className="text-xs md:text-sm font-bold tracking-tight">{client.address}</span>
                        </div>
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
                      <p className="text-xs font-bold text-slate-300 mt-3 md:mt-4">
                        Projects: {projects.length} • Team Members: {employees.length}
                      </p>
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
              // Also update the client display photo if it changed
              if (updatedData.photo) {
                setClient(prev => ({ ...prev, photo: updatedData.photo }));
              }
            }}
          />

          {isInfoModalOpen && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-4xl shadow-2xl relative border border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInfoModalOpen(false)}
                  className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={22} />
                </button>

                <div className="p-8 md:p-10 space-y-6">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Client Information</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Company</p>
                      <p className="font-bold text-slate-800">{client.company_name || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Contact Email</p>
                      <p className="font-bold text-slate-800">{client.contact_email || fullUserData?.email || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Phone</p>
                      <p className="font-bold text-slate-800">{client.phone || fullUserData?.phone_number || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Website</p>
                      <p className="font-bold text-slate-800 break-all">{client.website || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2 bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Address</p>
                      <p className="font-bold text-slate-800">{client.address || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projects</p>
                      <p className="text-xl font-black text-slate-900">{projects.length}</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Team Members</p>
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

export default ClientProfile;