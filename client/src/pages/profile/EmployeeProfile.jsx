import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import EditProfileModal from '../../components/EditProfileModal';
import ProfileGreetingBanner from '../../components/ProfileGreetingBanner';
import LiveFeed from '../../components/LiveFeed';
import { Band } from '../../components/kayaara/Band';
import api from '../../api';
import { getDisplayInitial, resolveMediaUrl } from '../../utils/media';
import { formatDateTimeDDMMYYYY } from '../../utils/dateFormat';
import {
  LayoutGrid, ClipboardList, TrendingUp, Box, Eye, X,
  MapPin, Phone, Mail, Briefcase, GraduationCap, ShieldCheck,
  ChevronLeft, ChevronRight, Target, Calendar
} from 'lucide-react';

const EmployeeProfile = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [fullUserData, setFullUserData] = useState(null);

  // Dynamic User State
  const [userProfile, setUserProfile] = useState({
    name: "Employee User",
    email: "",
    role: "Employee Access",
    photo: null
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('me/');
        setFullUserData(data);

        // Use First+Last name if available, else Username, else extract from Email
        let displayName = data.username;
        if (data.first_name || data.last_name) {
          displayName = `${data.first_name} ${data.last_name}`.trim();
        } else if (data.email) {
          // Fallback for old users
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
        // Fallback to localStorage if API fails
        const storedEmail = localStorage.getItem("email") || "";
        const storedRole = localStorage.getItem("role") || "Employee";
        if (storedEmail) {
          const namePart = storedEmail.split('@')[0];
          const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
          setUserProfile(prev => ({ ...prev, name: formattedName, email: storedEmail, role: `${storedRole} Access` }));
        }
      }
    };

    fetchProfile();
  }, []);

  const [statsStartIndex, setStatsStartIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(4);

  useEffect(() => {
    const updateVisible = () => setVisibleCards(window.innerWidth < 768 ? 1 : 4);
    updateVisible();
    window.addEventListener('resize', updateVisible);
    return () => window.removeEventListener('resize', updateVisible);
  }, []);

  const stats = [
    { label: "Task Management", value: "Dashboard", icon: <LayoutGrid size={20} />, path: "/employeedashboard" },
    { label: "Clients", value: "Portfolio", icon: <ClipboardList size={20} />, path: "/clients" },
    { label: "KPI Performance", value: "Metrics", icon: <TrendingUp size={20} />, path: "/performance" },
    { label: "Weekly Score", value: "Track", icon: <Target size={20} />, path: "/weeklyscore" },
    { label: "Monthly Planning", value: "Review", icon: <Box size={20} />, path: "/ddtme" },
    { label: "MCTC", value: "Overview", icon: <Calendar size={20} />, path: "/mctc" },
    { label: "Meeting Agenda", value: "Schedule", icon: <MapPin size={20} />, path: "/meetingagenda" },
  ];

  const maxStatsIndex = Math.max(0, stats.length - visibleCards);
  const slidePercent = visibleCards === 1 ? 100 : 25;

  const handleStatsLeft = () => {
    setStatsStartIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStatsRight = () => {
    setStatsStartIndex((prev) => Math.min(maxStatsIndex, prev + 1));
  };

  const employeePhotoSrc = resolveMediaUrl(fullUserData?.photo || userProfile.photo);
  const employeeInitial = getDisplayInitial(userProfile.name, userProfile.email, 'Employee');
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
          <ProfileGreetingBanner name={userProfile.name} />
        </motion.header>

        {/* BAND 2 · GREY · Executive overview carousel */}
        <Band tone="grey" eyebrow="Executive overview">
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
                {stats.map((stat, index) => (
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
        <Band tone="white" eyebrow="Identity">
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
                    {employeePhotoSrc ? (
                      <img
                        src={employeePhotoSrc}
                        alt="Employee"
                        className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/20 object-cover"
                      />
                    ) : (
                      <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full border-4 border-white/20 bg-white/10 flex items-center justify-center text-4xl md:text-5xl font-bold uppercase">
                        {employeeInitial}
                      </div>
                    )}
                    <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 w-4 h-4 md:w-5 md:h-5 rounded-full border-4 animate-pulse" style={{ background: 'var(--k-white)', borderColor: 'var(--k-blue)' }}></div>
                  </div>

                  <div className="flex-1 text-center md:text-left">
                    <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                      {userProfile.role}
                    </span>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mt-3 md:mt-4">
                      {userProfile.name}
                    </h1>
                    <div className="mt-3 md:mt-4 flex items-center justify-center md:justify-start gap-4 text-white/80">
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-white" />
                        <span className="text-xs md:text-sm font-medium break-all">{userProfile.email}</span>
                      </div>
                    </div>

                    <div className="mt-5 md:mt-8 flex flex-wrap items-center justify-center md:justify-start gap-3 md:gap-4">
                      <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 rounded-2xl px-5 py-3 min-h-[44px] text-xs font-semibold uppercase tracking-widest transition-all hover:-translate-y-0.5"
                        style={{ background: 'var(--k-white)', color: 'var(--k-blue)', boxShadow: 'var(--k-shadow-card)' }}
                      >
                        <Eye size={16} /> View Detailed Bio
                      </button>
                      <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="rounded-2xl px-5 py-3 min-h-[44px] text-xs font-semibold uppercase tracking-widest border border-white/40 text-white transition-all hover:bg-white/10 hover:-translate-y-0.5"
                      >
                        Edit Profile
                      </button>
                    </div>
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
            // Update display name if it changed
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

        

      </main>

      {/* --- BIO MODAL --- */}
      {showModal && (
        <div className="k-backdrop z-[300]" onClick={() => setShowModal(false)}>
          <div className="k-modal !max-w-2xl" onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between border-b px-6 py-5 md:px-8" style={{ borderColor: 'var(--k-grey-200)' }}>
              <p className="k-eyebrow">Detailed Bio</p>
              <button onClick={() => setShowModal(false)} aria-label="Close bio" className="k-btn-icon">
                <X size={22} />
              </button>
            </div>

            <div className="p-6 md:p-10 overflow-y-auto k-scroll">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start border-b pb-8 mb-8" style={{ borderColor: 'var(--k-grey-100)' }}>
                {employeePhotoSrc ? (
                  <img src={employeePhotoSrc} className="w-28 h-28 rounded-3xl object-cover border-2" style={{ borderColor: 'var(--k-grey-200)', boxShadow: 'var(--k-shadow-card)' }} alt="Avatar" />
                ) : (
                  <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-3xl font-bold border-2 uppercase" style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)', borderColor: 'var(--k-grey-200)' }}>
                    {employeeInitial}
                  </div>
                )}
                <div className="text-center md:text-left">
                  <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--k-ink)' }}>{userProfile.name}</h2>
                  <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    <ShieldCheck size={16} style={{ color: 'var(--k-blue)' }} />
                    <p className="k-eyebrow !text-[10px]" style={{ color: 'var(--k-blue)' }}>ID: HQ-2026-084</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div>
                    <h3 className="k-eyebrow mb-4">Digital Identity</h3>
                    <div className="space-y-4 text-sm font-medium" style={{ color: 'var(--k-grey-700)' }}>
                      <div className="flex items-center gap-4"><Mail size={18} style={{ color: 'var(--k-blue)' }} /> {userProfile.email}</div>
                      <div className="flex items-center gap-4"><Phone size={18} style={{ color: 'var(--k-blue)' }} /> {userProfile.phone || 'N/A'}</div>
                      <div className="flex items-center gap-4"><MapPin size={18} style={{ color: 'var(--k-blue)' }} /> Vadodara, Gujarat</div>
                    </div>
                  </div>
                  <div>
                    <h3 className="k-eyebrow mb-4">Career Stats</h3>
                    <div className="space-y-4 text-sm font-medium" style={{ color: 'var(--k-grey-700)' }}>
                      <div className="flex items-center gap-4"><Briefcase size={18} style={{ color: 'var(--k-blue)' }} /> {userProfile.role}</div>
                      <div className="flex items-center gap-4"><GraduationCap size={18} style={{ color: 'var(--k-blue)' }} /> {userProfile.experience || 'Experience Info N/A'}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="k-eyebrow">Core Expertise</h3>
                  <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--k-grey-700)' }}>
                    {userProfile.expertise || 'Expertise details not provided.'}
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t" style={{ borderColor: 'var(--k-grey-100)' }}>
                <button
                  onClick={() => navigate('/employeedashboard')}
                  className="k-btn-primary w-full min-h-[48px] text-sm flex items-center justify-center gap-3"
                >
                  Enter Full Dashboard <LayoutGrid size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeProfile;
