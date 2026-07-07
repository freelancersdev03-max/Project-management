import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import EditProfileModal from '../../components/EditProfileModal';
import ProfileGreetingBanner from '../../components/ProfileGreetingBanner';
import ProfileDailyPlanningBox from '../../components/ProfileDailyPlanningBox';
import AnimatedNumber from '../../components/kayaara/AnimatedNumber';
import { Band } from '../../components/kayaara/Band';
import { formatDateTimeDDMMYYYY } from '../../utils/dateFormat';
import {
  Users,
  Briefcase,
  Box,
  LayoutGrid,
  Target,
  Mail,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Phone,
  Eye,
  X,
  Award
} from 'lucide-react';
import api from '../../api';
import { getDisplayInitial, resolveMediaUrl } from '../../utils/media';

const KAYAARAProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullUserData, setFullUserData] = useState(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);

  const [adminProfile, setAdminProfile] = useState({
    name: "KAYAARA User",
    email: "admin@kayaara.com",
    role: "Top Management"
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const storedEmail = localStorage.getItem('email') || '';

        if (storedEmail) {
          const namePart = storedEmail.split('@')[0];
          setAdminProfile(prev => ({
            ...prev,
            name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
            email: storedEmail,
            role: 'Top Management'
          }));
        }

        try {
          const meRes = await api.get('me/');
          setFullUserData(meRes.data);
          const u = meRes.data;
          let displayName = u.username || 'KAYAARA User';

          if (u.first_name || u.last_name) {
            displayName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
          } else if (u.email) {
            const emailName = u.email.split('@')[0];
            displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          }

          setAdminProfile({
            name: displayName,
            email: u.email || storedEmail || 'admin@kayaara.com',
            role: 'Top Management'
          });
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
        console.error('Failed to load achievements:', error);
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

  const kayaaraStats = [
    { label: 'Task Management', value: 'Dashboard', icon: <LayoutGrid size={20} />, path: '/employeedashboard' },
    { label: 'Clients', value: 'Portfolio', icon: <Briefcase size={20} />, path: '/clients' },
    { label: 'KPI Performance', value: 'Metrics', icon: <Target size={20} />, path: '/weekly-score' },
    { label: 'Monthly Planning', value: 'Review', icon: <Box size={20} />, path: '/ddtme' },
    { label: 'MCTC', value: 'Overview', icon: <Users size={20} />, path: '/mctc' },
    { label: 'Visit Agenda', value: 'Schedule', icon: <CalendarDays size={20} />, path: '/visitagenda' },
  ];

  const maxStatsIndex = Math.max(0, kayaaraStats.length - visibleCards);
  const slidePercent = visibleCards === 1 ? 100 : 25;

  const handleStatsLeft = () => {
    setStatsStartIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStatsRight = () => {
    setStatsStartIndex((prev) => Math.min(maxStatsIndex, prev + 1));
  };
  const kayaaraPhotoSrc = resolveMediaUrl(fullUserData?.photo);
  const kayaaraInitial = getDisplayInitial(adminProfile.name, adminProfile.email, 'KAYAARA');
  const sortedAchievements = [...achievements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
          <ProfileGreetingBanner name={adminProfile.name} />
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
                {kayaaraStats.map((stat, index) => (
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
        <Band tone="white" eyebrow="Executive identity">
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
                    {kayaaraPhotoSrc ? (
                      <img
                        src={kayaaraPhotoSrc}
                        alt="KAYAARA"
                        className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/20 object-cover"
                      />
                    ) : (
                      <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center text-4xl md:text-5xl font-bold">
                        {kayaaraInitial}
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 md:w-5 md:h-5 rounded-full border-4 animate-pulse" style={{ background: 'var(--k-white)', borderColor: 'var(--k-blue)' }}></div>
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                      <div>
                        <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                          {loading ? 'Loading...' : adminProfile.role}
                        </span>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-3 md:mt-4">
                          {loading ? 'Loading...' : adminProfile.name}
                        </h1>
                      </div>
                    </div>
                    <div className="mt-4 md:mt-6 flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-white/80 border-b border-white/15 pb-3 md:pb-4 mb-3 md:mb-4">
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-white" />
                        <span className="text-xs md:text-sm font-medium break-all">{adminProfile.email}</span>
                      </div>
                      {fullUserData?.phone_number && (
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-white" />
                          <span className="text-xs md:text-sm font-medium">{fullUserData.phone_number}</span>
                        </div>
                      )}
                      <div className="hidden md:flex items-center gap-2">
                        <ShieldCheck size={16} className="text-white" />
                        <span className="text-xs md:text-sm font-medium">HQ-2026-084</span>
                      </div>
                    </div>

                    {!loading && (
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4">
                        <button
                          type="button"
                          onClick={() => setIsAchievementModalOpen(true)}
                          className="flex items-center gap-3 rounded-2xl px-4 py-3 min-h-[44px] text-left transition-all hover:-translate-y-0.5"
                          style={{ background: 'var(--k-white)', color: 'var(--k-ink)', boxShadow: 'var(--k-shadow-card)' }}
                          aria-label="View achievements"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
                            <Award size={20} />
                          </span>
                          <span className="flex flex-col items-start">
                            <span className="k-eyebrow">Achievements</span>
                            <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--k-ink)' }}>
                              <AnimatedNumber value={achievements.length} /> Total
                            </span>
                          </span>
                        </button>
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
                    )}
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
              <ProfileDailyPlanningBox userId={fullUserData?.id} />
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
            // Update display name if it changed
            let displayName = updatedData.username;
            if (updatedData.first_name || updatedData.last_name) {
              displayName = `${updatedData.first_name || ''} ${updatedData.last_name || ''}`.trim();
            }
            setAdminProfile(prev => ({
              ...prev,
              name: displayName,
              email: updatedData.email
            }));
          }}
        />

        {isInfoModalOpen && (
          <div className="k-backdrop z-[100]" onClick={() => setIsInfoModalOpen(false)}>
            <div className="k-modal !max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b px-6 py-5 md:px-8" style={{ borderColor: 'var(--k-grey-200)' }}>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--k-ink)' }}>KAYAARA Information</h2>
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
                    <p className="k-eyebrow mb-1">Name</p>
                    <p className="font-semibold" style={{ color: 'var(--k-ink)' }}>{adminProfile.name || 'N/A'}</p>
                  </div>
                  <div className="k-card-grey p-4">
                    <p className="k-eyebrow mb-1">Role</p>
                    <p className="font-semibold" style={{ color: 'var(--k-ink)' }}>{adminProfile.role || 'N/A'}</p>
                  </div>
                  <div className="k-card-grey p-4">
                    <p className="k-eyebrow mb-1">Email</p>
                    <p className="font-semibold break-all" style={{ color: 'var(--k-ink)' }}>{adminProfile.email || 'N/A'}</p>
                  </div>
                  <div className="k-card-grey p-4">
                    <p className="k-eyebrow mb-1">Phone</p>
                    <p className="font-semibold" style={{ color: 'var(--k-ink)' }}>{fullUserData?.phone_number || 'N/A'}</p>
                  </div>
                  <div className="k-card-grey p-4">
                    <p className="k-eyebrow mb-1">Experience</p>
                    <p className="font-semibold" style={{ color: 'var(--k-ink)' }}>{fullUserData?.experience || 'N/A'}</p>
                  </div>
                  <div className="k-card-grey p-4">
                    <p className="k-eyebrow mb-1">Expertise</p>
                    <p className="font-semibold whitespace-pre-wrap" style={{ color: 'var(--k-ink)' }}>{fullUserData?.expertise || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isAchievementModalOpen && (
          <div className="k-backdrop z-[320]" onClick={() => setIsAchievementModalOpen(false)}>
            <div className="k-modal !max-w-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-4 border-b px-6 py-5 md:px-8 md:py-6" style={{ borderColor: 'var(--k-grey-200)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
                    <Award size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--k-ink)' }}>Achievements</h2>
                    <p className="text-sm" style={{ color: 'var(--k-grey-500)' }}>Total achievements and previous records</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAchievementModalOpen(false)}
                  className="k-btn-icon"
                  aria-label="Close achievements popup"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 py-5 md:px-8 md:py-6 space-y-5 overflow-y-auto k-scroll">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border p-4" style={{ background: 'var(--k-blue-tint)', borderColor: 'var(--k-grey-200)' }}>
                    <p className="k-eyebrow">Total Achievements</p>
                    <p className="mt-1 text-3xl font-bold tabular-nums" style={{ color: 'var(--k-blue)' }}>
                      <AnimatedNumber value={achievements.length} />
                    </p>
                  </div>
                  <div className="k-card-grey p-4">
                    <p className="k-eyebrow">Status</p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: 'var(--k-grey-700)' }}>
                      {loadingAchievements ? 'Loading achievement history...' : 'Previous achievements listed below'}
                    </p>
                  </div>
                </div>

                {loadingAchievements ? (
                  <div className="space-y-3">
                    <div className="k-skeleton h-20" />
                    <div className="k-skeleton h-20" />
                  </div>
                ) : sortedAchievements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed px-4 py-8 text-center" style={{ borderColor: 'var(--k-grey-300)', background: 'var(--k-band-grey)' }}>
                    <img src="/kayaara-mark.png" alt="" className="mx-auto mb-3 h-10 w-10 opacity-60 k-float" />
                    <p className="text-sm" style={{ color: 'var(--k-grey-500)' }}>No achievements found yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedAchievements.map((item, index) => (
                      <motion.article
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.4 }}
                        className="k-card-static p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <h3 className="text-base font-bold" style={{ color: 'var(--k-ink)' }}>{item.title}</h3>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--k-grey-700)' }}>{item.description}</p>
                          </div>
                          <span className={item.tokenShared ? 'k-pill' : 'k-pill-grey'}>
                            {item.tokenShared ? 'Token Shared' : 'Token Not Shared'}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold" style={{ color: 'var(--k-grey-500)' }}>
                          <span>Assigned by {item.assignedBy || 'N/A'}</span>
                          <span>•</span>
                          <span>{formatDateTimeDDMMYYYY(item.createdAt)}</span>
                        </div>
                      </motion.article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default KAYAARAProfile;
