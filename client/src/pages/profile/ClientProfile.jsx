import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import EditProfileModal from '../../components/EditProfileModal';
import ProfileGreetingBanner from '../../components/ProfileGreetingBanner';
import LiveFeed from '../../components/LiveFeed';
import { Band } from '../../components/kayaara/Band';
import AnimatedNumber from '../../components/kayaara/AnimatedNumber';
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
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--k-band-grey)' }}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--k-blue)' }}></div>
    </div>
  );

  if (!client) return <div className="p-20 text-center font-semibold" style={{ color: 'var(--k-grey-500)' }}>Client Profile Not Found</div>;

  const profileCards = [
    { label: 'Task Management', value: 'Dashboard', icon: <LayoutGrid size={20} />, path: '/employeedashboard' },
    { label: 'Clients', value: 'Portfolio', icon: <Briefcase size={20} />, path: client?.id ? `/clients/${client.id}/` : '/clients' },
    { label: 'KPI Performance', value: 'Metrics', icon: <Target size={20} />, path: '/weekly-score' },
    { label: 'Monthly Planning', value: 'Review', icon: <Box size={20} />, path: '/ddtme' },
    { label: 'Team Members', value: `${employees.length}`, icon: <Users size={20} />, path: '/staff' },
    { label: 'Meeting Agenda', value: 'Schedule', icon: <CalendarDays size={20} />, path: '/meetingagenda' },
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
    <div className="h-screen w-screen antialiased flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <main className="flex-1 overflow-y-auto k-scroll">

        {/* BAND 1 · WHITE · Greeting */}
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="k-band-white k-band-pad border-b"
          style={{ borderColor: 'var(--k-grey-200)' }}
        >
          <ProfileGreetingBanner name={clientGreetingName} />
        </motion.header>

        {/* BAND 2 · GREY · Quick links carousel */}
        <Band tone="grey" eyebrow="Quick links">
          <div className="flex items-center gap-3 md:gap-6">
            <button
              type="button"
              onClick={handleStatsLeft}
              disabled={statsStartIndex === 0}
              className="k-btn-ghost !p-0 h-11 w-11 !rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => navigate(stat.path)}
                    className="min-w-0 shrink-0 basis-full md:basis-1/4 px-1.5 md:px-3 text-left group outline-none"
                  >
                    <div className="k-card p-4 md:p-6 h-full">
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform"
                        style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                      >
                        {stat.icon}
                      </span>
                      <p className="k-eyebrow">{stat.label}</p>
                      <p className="text-lg md:text-xl font-semibold tracking-tight mt-1" style={{ color: 'var(--k-ink)' }}>{stat.value}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStatsRight}
              disabled={statsStartIndex === maxStatsIndex}
              className="k-btn-ghost !p-0 h-11 w-11 !rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Scroll cards right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </Band>

        {/* BAND 3 · WHITE · Identity card + daily planning */}
        <Band tone="white" eyebrow="Client identity">
          <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-3xl p-5 md:p-7 lg:p-10 relative overflow-hidden h-full"
                style={{
                  background: 'radial-gradient(120% 160% at 100% 0%, var(--k-blue-dark) 0%, var(--k-blue) 55%)',
                  color: 'var(--k-white)',
                  boxShadow: 'var(--k-shadow-lift)'
                }}
              >
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                  <div className="relative shrink-0">
                    {clientPhotoSrc ? (
                      <img
                        src={clientPhotoSrc}
                        alt="Client"
                        className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/20 object-cover"
                      />
                    ) : (
                      <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center text-4xl md:text-5xl font-bold uppercase">
                        {clientInitial}
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 md:w-5 md:h-5 rounded-full border-4 animate-pulse" style={{ background: 'var(--k-white)', borderColor: 'var(--k-blue)' }}></div>
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                      <div>
                        <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                          Strategic Partner
                        </span>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-3 md:mt-4">
                          {client.company_name}
                        </h1>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-8 flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8 text-white/80 border-b border-white/15 pb-3 md:pb-4 mb-3 md:mb-4">
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-white" />
                        <span className="text-xs md:text-sm font-medium break-all">{client.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-white" />
                        <span className="text-xs md:text-sm font-medium">{client.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-white" />
                        <span className="text-xs md:text-sm font-medium">{client.address}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4">
                      <button
                        onClick={() => setIsInfoModalOpen(true)}
                        className="rounded-2xl px-5 py-3 min-h-[44px] text-xs font-semibold uppercase tracking-widest transition-all hover:-translate-y-0.5"
                        style={{ background: 'var(--k-white)', color: 'var(--k-blue)', boxShadow: 'var(--k-shadow-card)' }}
                      >
                        <span className="inline-flex items-center gap-2"><Eye size={16} /> View Information</span>
                      </button>
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="rounded-2xl px-5 py-3 min-h-[44px] text-xs font-semibold uppercase tracking-widest border border-white/40 text-white transition-all hover:bg-white/10 hover:-translate-y-0.5"
                      >
                        Edit Profile
                      </button>
                    </div>
                    <p className="text-xs font-medium text-white/80 mt-3 md:mt-4">
                      Projects: {projects.length} • Team Members: {employees.length}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-2"
            >
              <LiveFeed userId={fullUserData?.id} />
            </motion.div>
          </div>
        </Band>

        {/* Footer strip */}
        <footer className="k-band-white px-5 md:px-8 py-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
          <span className="text-[11px]" style={{ color: 'var(--k-grey-500)' }}>
            Kayaara PMS · Innovating beyond systems
          </span>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--k-blue)' }}>
            Kayaara Innovations Pvt Ltd
          </span>
        </footer>

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
          <div className="k-backdrop z-[100]" onClick={() => setIsInfoModalOpen(false)}>
            <div className="k-modal !max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b px-6 py-5 md:px-8" style={{ borderColor: 'var(--k-grey-200)' }}>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--k-ink)' }}>Client Information</h2>
                <button
                  type="button"
                  onClick={() => setIsInfoModalOpen(false)}
                  className="k-btn-icon"
                  aria-label="Close information"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="p-6 md:p-10 space-y-6 overflow-y-auto k-scroll">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="k-card-grey p-4">
                    <p className="k-eyebrow mb-1">Company</p>
                    <p className="font-semibold" style={{ color: 'var(--k-ink)' }}>{client.company_name || 'N/A'}</p>
                  </div>
                  <div className="k-card-grey p-4">
                    <p className="k-eyebrow mb-1">Contact Email</p>
                    <p className="font-semibold" style={{ color: 'var(--k-ink)' }}>{client.contact_email || fullUserData?.email || 'N/A'}</p>
                  </div>
                  <div className="k-card-grey p-4">
                    <p className="k-eyebrow mb-1">Phone</p>
                    <p className="font-semibold" style={{ color: 'var(--k-ink)' }}>{client.phone || fullUserData?.phone_number || 'N/A'}</p>
                  </div>
                  <div className="k-card-grey p-4">
                    <p className="k-eyebrow mb-1">Website</p>
                    <p className="font-semibold break-all" style={{ color: 'var(--k-ink)' }}>{client.website || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2 k-card-grey p-4">
                    <p className="k-eyebrow mb-1">Address</p>
                    <p className="font-semibold" style={{ color: 'var(--k-ink)' }}>{client.address || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="k-card-static p-4 text-center">
                    <p className="k-eyebrow">Projects</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--k-blue)' }}>
                      <AnimatedNumber value={projects.length} />
                    </p>
                  </div>
                  <div className="k-card-static p-4 text-center">
                    <p className="k-eyebrow">Team Members</p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--k-blue)' }}>
                      <AnimatedNumber value={employees.length} />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ClientProfile;
