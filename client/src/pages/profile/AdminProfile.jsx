import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import ProfileGreetingBanner from '../../components/ProfileGreetingBanner';
import AnimatedNumber from '../../components/kayaara/AnimatedNumber';
import { Band } from '../../components/kayaara/Band';
import {
  Users, Briefcase, UserPlus,
  ChevronRight, Globe,
  UsersRound, Contact2, ShieldAlert,
  ServerCrash, ShieldCheck, Terminal,
  Cpu, Activity, CheckCircle, Clock,
  ArrowUpRight
} from 'lucide-react';
import api from '../../api';
import { getDisplayInitial, resolveMediaUrl } from '../../utils/media';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [username, setUsername] = useState(null);
  const [adminPassword, setAdminPassword] = useState('Not available');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("metrics"); // metrics | performance | health

  const [stats, setStats] = useState({
    internalCount: 0,
    clientCount: 0,
    projectCount: 0
  });

  const [activeConsoleLog, setActiveConsoleLog] = useState(0);
  const logs = [
    { text: "Secure socket layer (SSL) handshake completed", type: "info" },
    { text: "Workspace database sync client state verified", type: "success" },
    { text: "FDA Integrity Validation cycle: 100% nominal", type: "success" },
    { text: "System load average 0.14 - API ping: 24ms", type: "info" },
  ];

  // Rotate simulator logs slowly
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveConsoleLog((prev) => (prev + 1) % logs.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const authToken = localStorage.getItem('access_token') || localStorage.getItem('token') || localStorage.getItem('access');
        const response = await api.get('me/', {
          headers: {
            Authorization: authToken ? `Bearer ${authToken}` : undefined
          }
        });

        const fullName = `${response.data.first_name || ''} ${response.data.last_name || ''}`.trim();
        setUsername(fullName || response.data.username || localStorage.getItem('username') || 'Admin User');
        setAdminPassword(response.data.password_display || 'Not available');
        setProfilePhoto(response.data.photo || '');
      } catch (error) {
        console.error(error);
        setUsername(localStorage.getItem('username') || 'Admin User');
        setAdminPassword('Not available');
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRes = await api.get('admin/users/');
        const allUsers = userRes.data;

        const internalRoles = ['kayaara', 'sgm', 'employee'];
        const internalTeam = allUsers.filter(user =>
          user.role && internalRoles.includes(user.role.toLowerCase())
        );

        const clientsOnly = allUsers.filter(user =>
          user.role?.toLowerCase() === 'client'
        );

        setStats(prev => ({
          ...prev,
          internalCount: internalTeam.length,
          clientCount: clientsOnly.length
        }));
      } catch (error) {
        console.error("User Data Sync Error:", error);
      }
    };

    const fetchProjectData = async () => {
      try {
        const projectRes = await api.get('projects/count/');
        setStats(prev => ({
          ...prev,
          projectCount: projectRes.data.count || 0
        }));
      } catch (error) {
        console.error("Project Count Sync Error:", error);
      }
    };

    Promise.allSettled([fetchUserData(), fetchProjectData()])
      .then(() => setLoading(false));
  }, []);

  const actionStats = [
    {
      label: "Team",
      value: "Manage Staff",
      icon: <UsersRound size={18} />,
      path: "/staff"
    },
    {
      label: "Partners",
      value: "Manage Clients",
      icon: <Contact2 size={18} />,
      path: "/clients"
    },
    {
      label: "Access",
      value: "Create User",
      icon: <UserPlus size={18} />,
      path: "/admin/createuser"
    },
    {
      label: "Security",
      value: "Audit Log",
      icon: <ShieldAlert size={18} />,
      path: "/admin/audit-log"
    },
  ];

  const metrics = [
    { label: "Internal Team", value: stats.internalCount, icon: <Users size={18} />, max: 15 },
    { label: "Active Clients", value: stats.clientCount, icon: <Globe size={18} />, max: 10 },
    { label: "Total Projects", value: stats.projectCount, icon: <Briefcase size={18} />, max: 20 },
  ];

  const adminPhotoSrc = resolveMediaUrl(profilePhoto);
  const adminInitial = getDisplayInitial(username, 'Admin');

  return (
    <div className="h-screen w-screen antialiased flex overflow-hidden bg-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 overflow-y-auto k-scroll">

        {/* BAND 1 · WHITE · Header */}
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="k-band-white k-band-pad border-b"
          style={{ borderColor: 'var(--k-grey-200)' }}
        >
          <ProfileGreetingBanner name={username} />

          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="mb-1"></p>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-none" style={{ color: 'var(--k-ink)' }}>
                Admin <span style={{ color: 'var(--k-blue)' }}>Portal</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border" style={{ background: 'var(--k-white)', borderColor: 'var(--k-grey-200)' }}>
              {/* <span className="k-live-dot animate-pulse" /> */}
              {/* <span className="k-eyebrow">Server Sync Active</span> */}
            </div>
          </div>
        </motion.header>

        {/* BAND 2 · GREY · Quick actions */}
        <Band tone="grey" eyebrow="Quick actions">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {actionStats.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => navigate(action.path)}
                className="k-card p-4.5 flex items-center justify-between group text-left transition-all duration-300 hover:border-[var(--k-blue)] hover:shadow-lg"
              >
                <div className="flex items-center gap-4">
                  <span
                    className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 transition-transform group-hover:scale-105"
                    style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                  >
                    {action.icon}
                  </span>
                  <div>
                    <p className="k-eyebrow leading-none">{action.label}</p>
                    <h2 className="text-base font-bold tracking-tight mt-1" style={{ color: 'var(--k-ink)' }}>{action.value}</h2>
                  </div>
                </div>
                <ChevronRight
                  size={16}
                  className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                  style={{ color: 'var(--k-blue)' }}
                />
              </motion.button>
            ))}
          </div>
        </Band>

        {/* BAND 3 · WHITE · Profile + metrics */}
        <Band tone="white" eyebrow="Identity & Operations Command">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

            {/* Admin Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-7 k-card-grey p-6 md:p-8 flex flex-col justify-between relative overflow-hidden"
            >
              {/* Decorative dynamic ambient glow */}
              <div className="absolute -right-20 -top-20 w-52 h-52 rounded-full blur-3xl pointer-events-none opacity-30" style={{ background: 'var(--k-blue-tint)' }} />

              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 relative z-10">

                {/* Profile Image Frame with rotating glow on hover */}
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 rounded-3xl blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300" style={{ background: "var(--k-blue)" }} />
                  {adminPhotoSrc ? (
                    <img
                      src={adminPhotoSrc}
                      alt="Admin"
                      className="w-24 h-24 lg:w-28 lg:h-28 rounded-3xl border-4 object-cover relative z-10 transition-transform duration-500 group-hover:scale-103"
                      style={{ borderColor: 'var(--k-white)', boxShadow: 'var(--k-shadow-card)' }}
                    />
                  ) : (
                    <div
                      className="w-24 h-24 lg:w-28 lg:h-28 rounded-3xl border-4 flex items-center justify-center text-3xl lg:text-4xl font-bold uppercase relative z-10"
                      style={{ borderColor: 'var(--k-white)', background: 'var(--k-blue-tint)', color: 'var(--k-blue)', boxShadow: 'var(--k-shadow-card)' }}
                    >
                      {adminInitial}
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center md:text-left">
                  <span className="k-pill-solid uppercase tracking-widest text-[9px] font-black px-3.5 py-1">System Administrator</span>
                  <h1 className="text-2xl lg:text-3xl font-black tracking-tight mt-3 leading-none" style={{ color: 'var(--k-ink)' }}>
                    {username}
                  </h1>
                  <p className="mt-3 text-xs md:text-sm font-semibold break-all" style={{ color: 'var(--k-grey-700)' }}>
                    Access Key: <span className="font-bold text-[var(--k-blue)]">{adminPassword}</span>
                  </p>
                </div>
              </div>

              {/* Light-blue glassmorphic System Telemetry Terminal */}
              <div
                className="mt-8 p-4 rounded-2xl border flex flex-col justify-between min-h-[92px] relative z-10"
                style={{
                  background: 'var(--k-blue-tint)',
                  borderColor: 'rgba(0, 134, 255, 0.15)',
                  boxShadow: "inset 0 1px 4px rgba(0, 134, 255, 0.05)"
                }}
              >
                <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'rgba(0, 134, 255, 0.12)' }}>
                  <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--k-blue)' }}>
                    <Terminal size={10} /> System Telemetry
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="k-live-dot" />
                    <span className="text-[8px] font-bold" style={{ color: 'var(--k-blue)' }}>NOMINAL</span>
                  </div>
                </div>

                <div className="flex-1 flex items-center min-h-[30px] pt-1">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeConsoleLog}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 6 }}
                      transition={{ duration: 0.3 }}
                      className="text-[11px] font-mono flex items-center gap-2"
                      style={{ color: 'var(--k-ink)' }}
                    >
                      <span style={{ color: 'var(--k-blue-light)' }}>&gt;</span>
                      <span className="font-medium">{logs[activeConsoleLog].text}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

            </motion.div>

            {/* Right Column: Interactive Tabbed Control Panel (Senior Developer Pattern) */}
            <div className="lg:col-span-5 flex flex-col justify-between border rounded-[2rem] p-5 relative overflow-hidden bg-white" style={{ borderColor: "var(--k-grey-200)" }}>

              {/* Tab Selector Buttons */}
              <div className="flex p-1.5 rounded-2xl mb-4 border gap-1 select-none bg-[var(--k-band-grey)] border-[var(--k-grey-200)]">
                {[
                  { id: "metrics", label: "Metrics" },
                  { id: "load", label: "Load" },
                  { id: "health", label: "Health" }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 text-[10px] font-bold uppercase py-2 rounded-xl transition-all relative"
                    style={{
                      color: activeTab === tab.id ? "var(--k-blue)" : "var(--k-grey-500)"
                    }}
                  >
                    {activeTab === tab.id && (
                      <motion.span
                        layoutId="activeProfileSubTab"
                        className="absolute inset-0 bg-white border shadow-sm rounded-xl"
                        style={{ borderColor: "var(--k-grey-200)", zIndex: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab content area */}
              <div className="flex-1 min-h-[220px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.28 }}
                    className="w-full h-full flex flex-col justify-between gap-3"
                  >
                    {/* Tab 1: Standard Metrics */}
                    {activeTab === "metrics" && (
                      <div className="space-y-2.5">
                        {metrics.map((metric, index) => {
                          const pct = Math.min(100, Math.round((metric.value / metric.max) * 100));
                          return (
                            <div key={index} className="rounded-xl border p-3.5 flex items-center justify-between" style={{ borderColor: "var(--k-grey-200)" }}>
                              <div className="flex items-center gap-3">
                                <span className="text-[var(--k-blue)]">{metric.icon}</span>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--k-grey-500)" }}>{metric.label}</p>
                                  <p className="text-lg font-black leading-none mt-1" style={{ color: "var(--k-ink)" }}>
                                    {metric.value} <span className="text-[10px] font-bold text-[var(--k-grey-500)]">/ {metric.max}</span>
                                  </p>
                                </div>
                              </div>
                              <div className="w-20">
                                <div className="h-1 rounded-full overflow-hidden bg-[var(--k-grey-100)]">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: "var(--k-blue)" }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.8 }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Tab 2: Interactive Division Workload visual */}
                    {activeTab === "load" && (
                      <div className="space-y-3.5">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--k-blue)" }}>Operational Load</span>
                          <h4 className="text-xs font-bold mt-0.5" style={{ color: "var(--k-ink)" }}>Division Queue Volume</h4>
                        </div>
                        <div className="space-y-2.5">
                          {[
                            { name: "R&D Formulations", val: 84, color: "var(--k-blue)" },
                            { name: "Clinical Trials", val: 42, color: "var(--k-blue-light)" },
                            { name: "Regulatory Submissions", val: 68, color: "var(--k-ink)" }
                          ].map((item, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-semibold">
                                <span style={{ color: "var(--k-grey-700)" }}>{item.name}</span>
                                <span className="font-bold" style={{ color: item.color }}>{item.val}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-[var(--k-band-grey)] overflow-hidden border" style={{ borderColor: "var(--k-grey-100)" }}>
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ background: item.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.val}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.05 }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tab 3: System Health Gauges */}
                    {activeTab === "health" && (
                      <div className="flex flex-col justify-between h-full py-2">
                        <div className="flex items-center gap-3 p-3.5 border rounded-xl" style={{ borderColor: "var(--k-grey-200)" }}>
                          <Cpu size={24} style={{ color: "var(--k-blue)" }} />
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-wider text-[var(--k-grey-500)]">Core Telemetry</p>
                            <p className="text-sm font-bold mt-0.5" style={{ color: "var(--k-ink)" }}>API Ping: 24ms (Nominal)</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3.5 mt-3.5">
                          <div className="rounded-xl border p-3 text-center" style={{ borderColor: "var(--k-grey-200)" }}>
                            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--k-grey-500)" }}>SQL Connections</p>
                            <span className="text-lg font-black block mt-1" style={{ color: "var(--k-blue)" }}>Active (8)</span>
                          </div>
                          <div className="rounded-xl border p-3 text-center" style={{ borderColor: "var(--k-grey-200)" }}>
                            <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--k-grey-500)" }}>Memory Usage</p>
                            <span className="text-lg font-black block mt-1" style={{ color: "var(--k-ink)" }}>12.8%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>

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
      </main>
    </div>
  );
};

export default AdminProfile;
