import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, Briefcase, Target, Box, Users2, LogOut, CalendarRange, MapPin, CircleUser, ChevronDown, ChevronUp, Trophy, Building2, TrendingUp, CheckCircle2, FileSpreadsheet, FileBarChart, Menu, X, ShieldAlert, GraduationCap, UserCheck, Link, FolderOpen, Coins, FileStack, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import OrgWorkspaceSwitcher from './OrgWorkspaceSwitcher';
import GlobalSearchModal from './GlobalSearchModal';

const Sidebar = () => {
  const { isOpen, setIsOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clientsExpanded, setClientsExpanded] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sidebar_clientsExpanded')) || false; } catch { return false; }
  });
  const [clients, setClients] = useState([]);
  const [clientProjects, setClientProjects] = useState({});
  const [expandedClients, setExpandedClients] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sidebar_expandedClients')) || {}; } catch { return {}; }
  });
  const [pmsExpanded, setPmsExpanded] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sidebar_pmsExpanded')) !== false; } catch { return true; }
  });
  const [toastMsg, setToastMsg] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleOpenGlobalSearch = () => setIsSearchOpen(true);
    window.addEventListener('open-global-search', handleOpenGlobalSearch);
    return () => window.removeEventListener('open-global-search', handleOpenGlobalSearch);
  }, []);

  const modules = [
    { id: 'pms', label: 'Kayaara PMS', icon: <Briefcase size={18} />, isExpandable: true },
    { id: 'asset', label: 'Kayaara Asset', icon: <Building2 size={18} />, badge: 'ERP' },
    { id: 'connect', label: 'Kayaara Connect', icon: <Link size={18} /> },
    { id: 'dms', label: 'Kayaara DMS', icon: <FolderOpen size={18} /> },
    { id: 'training', label: 'Kayaara Training', icon: <GraduationCap size={18} /> },
    { id: 'visitor', label: 'Kayaara Visitor', icon: <UserCheck size={18} /> },
    { id: 'overview', label: 'Kayaara Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'quality', label: 'Kayaara Quality', icon: <CheckCircle2 size={18} /> },
    { id: 'helpdesk', label: 'Kayaara Helpdesk', icon: <ShieldAlert size={18} /> },
    { id: 'inventory', label: 'Kayaara Inventory', icon: <Box size={18} /> },
    { id: 'finance', label: 'Kayaara Finance', icon: <Coins size={18} /> },
    { id: 'analytics', label: 'Kayaara Analytics', icon: <FileBarChart size={18} /> },
  ];

  const showToast = (message) => {
    setToastMsg(message);
  };

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => {
        setToastMsg(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  useEffect(() => {
    sessionStorage.setItem('sidebar_pmsExpanded', JSON.stringify(pmsExpanded));
  }, [pmsExpanded]);

  const navRef = React.useRef(null);

  useEffect(() => {
    sessionStorage.setItem('sidebar_clientsExpanded', JSON.stringify(clientsExpanded));
  }, [clientsExpanded]);

  useEffect(() => {
    sessionStorage.setItem('sidebar_expandedClients', JSON.stringify(expandedClients));
  }, [expandedClients]);

  useEffect(() => {
    const savedScrollPos = sessionStorage.getItem('sidebar_scrollPos');
    if (savedScrollPos && navRef.current) {
      setTimeout(() => {
        if (navRef.current) {
          navRef.current.scrollTop = parseInt(savedScrollPos, 10);
        }
      }, 50);
    }
  }, [clients, expandedClients, clientsExpanded]);

  const handleScroll = (e) => {
    sessionStorage.setItem('sidebar_scrollPos', e.target.scrollTop);
  };
  const role = (localStorage.getItem('role') || '').toUpperCase();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const role = (localStorage.getItem('role') || '').toUpperCase();

        if (role === 'CLIENT') {
          const [clientResponse, projectsResponse] = await Promise.all([
            api.get('clients/me/'),
            api.get('projects/')
          ]);

          const clientData = clientResponse.data;
          const projects = Array.isArray(projectsResponse.data)
            ? projectsResponse.data
            : Array.isArray(projectsResponse.data?.results)
              ? projectsResponse.data.results
              : [];

          if (clientData?.id) {
            setClients([clientData]);
            setClientProjects((prev) => ({
              ...prev,
              [clientData.id]: projects,
            }));
          } else {
            setClients([]);
          }
          return;
        }

        let endpoint = 'clients/list/';

        if (['MANAGER_L1', 'MANAGER_L2', 'HOD_L1', 'HOD_L2', 'SGM'].includes(role)) {
          endpoint = 'sgm/clients/';
        } else if (role === 'EMPLOYEE') {
          endpoint = 'employees/clients/';
        }

        const response = await api.get(endpoint);
        const clientList = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.results)
            ? response.data.results
            : [];
        setClients(clientList);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    };

    if (clientsExpanded) {
      fetchClients();
    }
  }, [clientsExpanded]);

  const fetchClientProjects = async (clientId) => {
    if (clientProjects[clientId]) {
      return; // Already loaded
    }

    try {
      const role = (localStorage.getItem('role') || '').toUpperCase();
      let endpoint = `/clients/${clientId}/projects/`;

      if (role === 'CLIENT' || role === 'SENIOR' || role === 'EXTERNAL') {
        endpoint = '/projects/';
      } else if (role === 'EMPLOYEE') {
        endpoint = `/employees/clients/${clientId}/projects/`;
      }

      const response = await api.get(endpoint);
      let projects = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.results)
          ? response.data.results
          : [];

      // When using /projects/ endpoint, filter to only this client's projects
      if (['CLIENT', 'SENIOR', 'EXTERNAL'].includes(role)) {
        projects = projects.filter(p => String(p.client?.id || p.client) === String(clientId));
      }

      setClientProjects(prev => ({
        ...prev,
        [clientId]: projects
      }));
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setClientProjects(prev => ({
        ...prev,
        [clientId]: []
      }));
    }
  };

  const toggleClient = async (clientId) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientId]: !prev[clientId]
    }));

    if (!expandedClients[clientId]) {
      await fetchClientProjects(clientId);
    }
  };

  const menuItems = [
    {
      label: "Search (Ctrl + K)",
      icon: <Search size={19} />,
      onClick: () => setIsSearchOpen(true),
    },
    {
      label: "Profile",
      icon: <CircleUser size={19} />,
      path: (() => {
        if (role === 'ADMIN') return '/admin';
        if (['ORG_OWNER', 'ORG_ADMIN', 'KAYAARA', 'MLS'].includes(role)) return '/hqepl';
        if (['MANAGER_L1', 'MANAGER_L2', 'HOD_L1', 'HOD_L2', 'SGM'].includes(role)) return '/sgm';
        if (role === 'SENIOR') return '/senior';
        if (role === 'CLIENT') return '/client';
        return '/employee';
      })()
    },
    {
      label: "Audit Log",
      icon: <ShieldAlert size={19} />,
      path: "/admin/audit-log",
      roles: ['ADMIN', 'ORG_OWNER', 'ORG_ADMIN']
    },
    {
      label: "Roles & Permissions",
      icon: <UserCheck size={19} />,
      path: "/roles",
      roles: ['ADMIN', 'ORG_OWNER', 'ORG_ADMIN']
    },
    {
      label: "Company Dashboard",
      icon: <Building2 size={19} />,
      path: "/company-dashboard",
      roles: ['ADMIN', 'ORG_OWNER', 'ORG_ADMIN', 'KAYAARA', 'MLS']
    },
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={19} />,
      path: "/employeedashboard"
    },
    {
      label: "Clients",
      icon: <Briefcase size={19} />,
      path: '/clients'
    },
    {
      label: "Templates",
      icon: <FileStack size={19} />,
      path: "/templates",
      roles: ['ADMIN', 'ORG_OWNER', 'ORG_ADMIN', 'HOD_L1', 'HOD_L2', 'MANAGER_L1', 'MANAGER_L2', 'KAYAARA', 'MLS', 'SGM']
    },
    {
      label: "KPIs",
      icon: <Target size={19} />,
      path: "/weekly-score"
    },
    {
      label: "Weekly Score",
      icon: <TrendingUp size={19} />,
      path: "/weeklyscore"
    },
    {
      label: "Monthly Planning",
      icon: <CheckCircle2 size={19} />,
      path: "/ddtme"
    },
    {
      label: "Team Members",
      icon: <Users2 size={19} />,
      path: "/staff",
      hiddenRoles: ['EXTERNAL', 'EMPLOYEE']
    },
    {
      label: "FMS (Flow Management System)",
      icon: <FileSpreadsheet size={19} />,
      path: "/ddfms",
      hiddenRoles: ['SENIOR', 'EXTERNAL', 'MLS']
    },
    {
      label: "Calendar",
      icon: <CalendarRange size={19} />,
      path: "/calendar"
    },
    {
      label: "Weekly Plan",
      icon: <FileBarChart size={19} />,
      path: "/rc7"
    },
    {
      label: "Meeting Agenda",
      icon: <MapPin size={19} />,
      path: "/meetingagenda"
    },
    {
      label: "Achievement",
      icon: <Trophy size={19} />,
      path: "/achievement"
    }
  ];

  const handleLogout = async () => {
    try { await api.post('/logout/'); } catch { /* proceed even if call fails */ }
    localStorage.clear();
    navigate('/login');
  };

  const isMenuItemActive = (item) => {
    const path = location.pathname;

    if (item.path === '/meetingagenda') {
      return path === '/meetingagenda' || path.startsWith('/meetingagenda/');
    }

    if (item.path === '/clients') {
      return path === '/clients' || path.startsWith('/clients/') || path.startsWith('/projects/');
    }

    return path === item.path;
  };

  const isMenuItemVisible = (item) => {
    if (item.roles && !item.roles.includes(role)) {
      return false;
    }

    if (item.hiddenRoles && item.hiddenRoles.includes(role)) {
      return false;
    }

    return true;
  };

  /* Shared creative look for a nav row */
  const itemClasses = (active) =>
    `group relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all duration-300 select-none ${
      active
        ? 'text-[var(--k-blue)] bg-[var(--k-blue-tint)]/90 font-bold shadow-2xs border border-[var(--k-blue)]/20'
        : 'text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)]/70 hover:text-[var(--k-ink)]'
    }`;

  const subItemClasses = (active) =>
    `group relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-300 select-none ${
      active
        ? 'text-[var(--k-blue)] bg-[var(--k-blue-tint)]/90 font-bold shadow-2xs border border-[var(--k-blue)]/25'
        : 'text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)]/70 hover:text-[var(--k-ink)]'
    }`;

  const ActiveIndicator = () => (
    <motion.span
      layoutId="k-sidebar-active"
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="absolute left-0 top-1.5 bottom-1.5 w-[4px] rounded-r-full"
      style={{ background: 'var(--k-blue)', boxShadow: '0 0 12px 2px rgba(0,134,255,0.4)' }}
    />
  );

  const username = localStorage.getItem('username') || 'User';
  const userRole = (localStorage.getItem('role') || '').toUpperCase();

  const chevronBtnClasses = 'flex-shrink-0 p-1 rounded-lg text-[var(--k-grey-500)] hover:bg-[var(--k-blue-tint)] hover:text-[var(--k-blue)] transition-colors';

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-3 left-3 z-[200] md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-white border transition-colors"
        style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-ink)', boxShadow: 'var(--k-shadow-card)' }}
        aria-label="Open navigation menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile Fullscreen Overlay Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[250] md:hidden bg-white flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--k-grey-200)' }}>
              <div className="flex items-center gap-2.5 cursor-pointer group" onClick={() => navigate('/')} title="Go to Home Page">
                <img src="/kayaara-mark.png" alt="KAYAARA Mark" className="h-8 w-auto object-contain shrink-0 transition-transform group-hover:scale-105" />
                <div className="flex flex-col text-left">
                  <div className="flex items-center leading-none">
                    <span className="font-black text-[15px] tracking-tight text-[var(--k-ink)]">KAYAARA</span>
                  </div>
                  <div className="flex items-center gap-1 -mt-1 leading-none">
                    <span className="text-[10px] font-extrabold tracking-widest text-[var(--k-blue)] uppercase leading-none">Connect Suite</span>
                    <img src="/star.png" alt="Star" className="h-[18px] w-auto object-contain shrink-0 -mt-0.5" />
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full transition-colors hover:bg-[var(--k-grey-100)]"
                style={{ color: 'var(--k-ink)' }}
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2 k-scroll">
              {modules.map((mod) => {
                const isPMS = mod.id === 'pms';
                return (
                  <div key={mod.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (isPMS) {
                          setPmsExpanded(!pmsExpanded);
                        } else {
                          showToast(`${mod.label} is coming soon to your workspace.`);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-colors ${
                        isPMS && pmsExpanded
                          ? 'bg-[var(--k-grey-100)]/60 text-[var(--k-ink)] font-bold border border-[var(--k-grey-200)]/60'
                          : 'text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-white shadow-2xs"
                          style={
                            isPMS
                              ? { color: 'var(--k-blue)' }
                              : { color: 'var(--k-grey-600)' }
                          }
                        >
                          {mod.icon}
                        </span>
                        <span className="text-sm font-semibold">{mod.label}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {mod.badge && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-[var(--k-blue-tint)] text-[var(--k-blue)]">
                            {mod.badge}
                          </span>
                        )}
                        {isPMS && (
                          <span className="text-[var(--k-grey-500)]">
                            {pmsExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </span>
                        )}
                      </div>
                    </button>

                    {isPMS && pmsExpanded && (
                      <div className="ml-4 pl-3 border-l border-[var(--k-grey-200)] space-y-1 py-1">
                        {menuItems
                          .filter(isMenuItemVisible)
                          .map((item, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                navigate(item.path);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                                isMenuItemActive(item)
                                  ? 'bg-[var(--k-blue-tint)] text-[var(--k-blue)] font-bold border border-[var(--k-blue)]/20'
                                  : 'text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)]'
                              }`}
                            >
                              <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-white shadow-2xs text-[var(--k-blue)]">
                                {React.cloneElement(item.icon, { size: 14 })}
                              </span>
                              <span className="text-xs font-medium">{item.label}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="p-4 border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
              <div className="p-3.5 rounded-2xl bg-[#212121] text-white flex items-center justify-between shadow-md mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--k-blue)] flex items-center justify-center font-bold text-sm">
                    {username.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{username}</p>
                    <p className="text-[10px] text-[var(--k-blue-light)] uppercase font-extrabold tracking-wider">{userRole}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-[var(--k-grey-100)] text-[var(--k-ink)] hover:bg-[#212121] hover:text-white transition-all font-bold text-xs"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Creative Sidebar */}
      <aside
        className={`relative h-full bg-white transition-all duration-300 ease-in-out hidden md:flex flex-col border-r shadow-xs ${isOpen ? 'w-64' : 'w-20'}`}
        style={{ borderColor: 'var(--k-grey-200)' }}
      >
        {/* Blue accent top gradient stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-[var(--k-blue)] via-[var(--k-blue-light)] to-[var(--k-blue)]" />

        {/* Logo & Creative Status Header Section */}
        <div className={`pt-5 pb-4 border-b border-[var(--k-grey-200)]/60 bg-gradient-to-b from-[var(--k-blue-tint)]/50 via-[var(--k-blue-tint)]/15 to-transparent relative ${isOpen ? 'px-5' : 'px-3 flex flex-col items-center'}`}>
          {isOpen ? (
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => navigate('/')}
                title="Go to Home Page"
              >
                <img
                  src="/kayaara-mark.png"
                  alt="KAYAARA Mark"
                  className="h-8 w-auto object-contain shrink-0 transition-transform group-hover:scale-105"
                />
                <div className="flex flex-col text-left">
                  <div className="flex items-center leading-none">
                    <span className="font-black text-[16px] tracking-tight text-[var(--k-ink)]">
                      KAYAARA
                    </span>
                  </div>
                  <div className="flex items-center gap-1 -mt-1 leading-none">
                    <span className="text-[10px] font-extrabold tracking-widest text-[var(--k-blue)] uppercase leading-none">
                      Connect Suite
                    </span>
                    <img src="/star.png" alt="Star" className="h-[22px] w-auto object-contain shrink-0 -mt-0.5" />
                  </div>
                </div>
              </motion.div>
              {/* Floating Collapse Toggle */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-xl bg-[var(--k-white)] border border-[var(--k-grey-200)] shadow-xs text-[var(--k-grey-500)] hover:border-[var(--k-blue)] hover:text-[var(--k-blue)] transition-all hover:scale-105"
                title="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <motion.img
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                src="/kayaara-mark.png"
                alt="KAYAARA Connect Suite"
                className="h-9 w-9 object-contain cursor-pointer transition-transform hover:scale-110"
                onClick={() => navigate('/')}
                title="Go to Home Page"
              />
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-xl bg-[var(--k-white)] border border-[var(--k-grey-200)] shadow-xs text-[var(--k-grey-500)] hover:border-[var(--k-blue)] hover:text-[var(--k-blue)] transition-all hover:scale-105"
                title="Expand sidebar"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          
          {/* Version & Status */}

          {isOpen && (
            <div className="flex items-center gap-2 mt-3">
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-[#212121] text-white shadow-2xs">
                PMS v2.6
              </span>
              <span className="text-[10px] font-bold text-[var(--k-blue)] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Enterprise
              </span>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav
          ref={navRef}
          onScroll={handleScroll}
          className="px-3 space-y-1.5 flex-1 overflow-y-auto no-scrollbar py-3"
        >
          {modules.map((mod) => {
            const isPMS = mod.id === 'pms';
            
            return (
              <div key={mod.id} className="space-y-1">
                {/* Module Header Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (isPMS) {
                      if (!isOpen) {
                        setIsOpen(true);
                        setPmsExpanded(true);
                      } else {
                        setPmsExpanded(!pmsExpanded);
                      }
                    } else {
                      showToast(`${mod.label} is coming soon to your workspace.`);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-left transition-all duration-300 select-none cursor-pointer group ${
                    isPMS && isOpen && pmsExpanded
                      ? 'text-[var(--k-ink)] bg-[var(--k-grey-100)]/40 font-bold border border-[var(--k-grey-200)]/50'
                      : 'text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)]/70 hover:text-[var(--k-ink)]'
                  }`}
                  title={!isOpen ? mod.label : ''}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 shadow-2xs group-hover:scale-105"
                      style={
                        isPMS
                          ? { background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }
                          : { background: 'var(--k-grey-100)', color: 'var(--k-grey-600)' }
                      }
                    >
                      {mod.icon}
                    </span>
                    {isOpen && (
                      <span className="text-sm font-semibold tracking-tight">
                        {mod.label}
                      </span>
                    )}
                  </div>
                  
                  {isOpen && (
                    <div className="flex items-center gap-1.5">
                      {mod.badge && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-[var(--k-blue-tint)] text-[var(--k-blue)]">
                          {mod.badge}
                        </span>
                      )}
                      {isPMS && (
                        <span className="text-[var(--k-grey-500)] group-hover:text-[var(--k-ink)] transition-colors">
                          {pmsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </span>
                      )}
                    </div>
                  )}
                </button>

                {/* Submenu for Kayaara PMS */}
                {isPMS && (
                  <AnimatePresence initial={false}>
                    {pmsExpanded && isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="ml-4 mt-1 pl-2.5 border-l border-[var(--k-grey-200)] space-y-1 overflow-hidden"
                      >
                        {menuItems
                          .filter(isMenuItemVisible)
                          .map((item, index) => (
                            <div key={index} className="relative">
                              {item.label === "Clients" ? (
                                <>
                                  <div
                                    className={`${subItemClasses(isMenuItemActive(item))} justify-between cursor-pointer`}
                                    title={!isOpen ? item.label : ''}
                                  >
                                    {isMenuItemActive(item) && <ActiveIndicator />}
                                    <div
                                      className="flex-1 flex items-center gap-2.5"
                                      onClick={() => {
                                        navigate('/clients');
                                        setClientsExpanded(!clientsExpanded);
                                      }}
                                    >
                                      <span
                                        className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300 shadow-2xs group-hover:scale-105 text-[15px]"
                                        style={
                                          isMenuItemActive(item)
                                            ? { background: 'var(--k-blue)', color: '#ffffff' }
                                            : { background: 'var(--k-grey-100)', color: 'var(--k-grey-600)' }
                                        }
                                      >
                                        {React.cloneElement(item.icon, { size: 15 })}
                                      </span>
                                      <span className="text-xs font-semibold tracking-tight truncate">
                                        {item.label}
                                      </span>
                                    </div>
                                    <button
                                      className={`${chevronBtnClasses} p-0.5`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setClientsExpanded(!clientsExpanded);
                                      }}
                                    >
                                      {clientsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                    </button>
                                  </div>

                                  <AnimatePresence initial={false}>
                                    {clientsExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                        className="ml-3 mt-1 space-y-0.5 overflow-hidden border-l pl-2 py-1 bg-[var(--k-band-grey)]/40 rounded-r-xl"
                                        style={{ borderColor: 'var(--k-grey-200)' }}
                                      >
                                        {clients.map((client) => (
                                          <div key={client.id}>
                                            <div className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs text-[var(--k-grey-700)] hover:bg-[var(--k-white)] transition-all shadow-2xs">
                                              <button
                                                onClick={() => navigate(`/clients/${client.id}`)}
                                                className="flex-1 text-left truncate font-medium hover:text-[var(--k-blue)] transition-colors"
                                              >
                                                {client.company_name}
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleClient(client.id);
                                                }}
                                                className={`${chevronBtnClasses} p-0.5 ml-1`}
                                              >
                                                {expandedClients[client.id] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                              </button>
                                            </div>

                                            <AnimatePresence initial={false}>
                                              {expandedClients[client.id] && clientProjects[client.id] && (
                                                <motion.div
                                                  initial={{ height: 0, opacity: 0 }}
                                                  animate={{ height: 'auto', opacity: 1 }}
                                                  exit={{ height: 0, opacity: 0 }}
                                                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                                                  className="ml-2 mt-1 space-y-0.5 overflow-hidden border-l pl-2 border-[var(--k-grey-200)]"
                                                >
                                                  {clientProjects[client.id].map((project) => (
                                                    <button
                                                      key={project.id}
                                                      onClick={() => navigate(`/projects/${project.id}`)}
                                                      className={`w-full text-left px-2 py-1 rounded-md text-[10px] truncate transition-colors ${
                                                        location.pathname === `/projects/${project.id}`
                                                          ? 'text-[var(--k-blue)] bg-[var(--k-blue-tint)] font-bold'
                                                          : 'text-[var(--k-grey-500)] hover:bg-[var(--k-white)] hover:text-[var(--k-ink)]'
                                                      }`}
                                                    >
                                                      {project.name}
                                                    </button>
                                                  ))}
                                                  {clientProjects[client.id].length === 0 && (
                                                    <div className="px-2 py-1 text-[10px]" style={{ color: 'var(--k-grey-500)' }}>No projects</div>
                                                  )}
                                                </motion.div>
                                              )}
                                            </AnimatePresence>
                                          </div>
                                        ))}
                                        {clients.length === 0 && (
                                          <div className="px-2 py-1 text-xs" style={{ color: 'var(--k-grey-500)' }}>No clients found</div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </>
                              ) : (
                                <motion.button
                                  onClick={() => item.onClick ? item.onClick() : navigate(item.path)}
                                  className={subItemClasses(isMenuItemActive(item))}
                                  title={!isOpen ? item.label : ''}
                                  whileTap={{ scale: 0.98 }}
                                >
                                  {isMenuItemActive(item) && <ActiveIndicator />}
                                  <span
                                    className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-300 shadow-2xs group-hover:scale-105 text-[15px]"
                                    style={
                                      isMenuItemActive(item)
                                        ? { background: 'var(--k-blue)', color: '#ffffff' }
                                        : { background: 'var(--k-grey-100)', color: 'var(--k-grey-600)' }
                                    }
                                  >
                                    {React.cloneElement(item.icon, { size: 15 })}
                                  </span>
                                  <span className="text-xs font-semibold tracking-tight truncate">
                                    {item.label}
                                  </span>
                                </motion.button>
                              )}
                            </div>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            );
          })}
        </nav>

        {/* Creative Executive User Block + Logout */}
        <div className="p-3 border-t bg-gradient-to-t from-[var(--k-grey-100)]/40 to-transparent" style={{ borderColor: 'var(--k-grey-200)' }}>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="p-3.5 rounded-2xl relative overflow-hidden shadow-md border border-white/10 flex flex-col gap-3"
              style={{ background: '#212121' }}
            >
              {/* Subtle ambient blue glow inside card */}
              <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-[var(--k-blue)]/25 blur-xl pointer-events-none" />
              
              <div className="flex items-center gap-3 z-10">
                {/* Avatar with blue glow ring */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--k-blue)] to-[var(--k-blue-dark)] flex items-center justify-center text-white font-black text-sm shadow-md shrink-0 border border-white/20">
                  {username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate tracking-tight">{username}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-black tracking-wider uppercase text-[var(--k-blue-light)]">
                      {userRole || 'USER'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Integrated Power Logout Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/10 hover:bg-[var(--k-blue)] text-white/90 hover:text-white transition-all duration-300 text-xs font-bold shadow-xs z-10 group"
              >
                <LogOut size={15} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>Sign Out</span>
              </motion.button>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl bg-[#212121] flex items-center justify-center text-[var(--k-blue)] font-black text-xs shadow-md border border-[var(--k-blue)]/30 cursor-pointer hover:scale-105 transition-transform"
                title={`${username} (${userRole})`}
                onClick={() => setIsOpen(true)}
              >
                {username.slice(0, 2).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-[#212121] text-white/80 hover:text-white hover:bg-[var(--k-blue)] transition-all shadow-sm"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Brand-aligned Toast notification for coming-soon modules */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[300] px-4 py-3 bg-[#212121] text-white rounded-2xl shadow-xl flex items-center gap-2.5 border border-white/10"
          >
            <div className="w-5 h-5 rounded-lg bg-[var(--k-blue)] flex items-center justify-center text-[10px] font-black text-white">
              K
            </div>
            <span className="text-xs font-semibold">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Sidebar;
