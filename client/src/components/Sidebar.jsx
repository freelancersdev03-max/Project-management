import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, Briefcase, Target, Box, Users2, LogOut, CalendarRange, MapPin, CircleUser, ChevronDown, ChevronUp, Trophy, Building2, TrendingUp, CheckCircle2, FileSpreadsheet, FileBarChart, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import api from '../api';

const Sidebar = () => {
  const { isOpen, setIsOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clientsExpanded, setClientsExpanded] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sidebar_clientsExpanded')) || false; } catch { return false; }
  });
  const [actionPlanExpanded, setActionPlanExpanded] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sidebar_actionPlanExpanded')) || false; } catch { return false; }
  });
  const [clients, setClients] = useState([]);
  const [clientProjects, setClientProjects] = useState({});
  const [expandedClients, setExpandedClients] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sidebar_expandedClients')) || {}; } catch { return {}; }
  });

  const navRef = React.useRef(null);

  useEffect(() => {
    sessionStorage.setItem('sidebar_clientsExpanded', JSON.stringify(clientsExpanded));
  }, [clientsExpanded]);

  useEffect(() => {
    sessionStorage.setItem('sidebar_actionPlanExpanded', JSON.stringify(actionPlanExpanded));
  }, [actionPlanExpanded]);

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
  }, [clients, expandedClients, clientsExpanded, actionPlanExpanded]);

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

        if (role === 'SGM') {
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

    if (clientsExpanded || actionPlanExpanded) {
      fetchClients();
    }
  }, [clientsExpanded, actionPlanExpanded]);

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
      label: "Profile",
      icon: <CircleUser size={19} />,
      path: (() => {
        if (role === 'ADMIN') return '/admin';
        if (role === 'KAYAARA' || role === 'MLS') return '/hqepl'; // KAYAARA users profile page
        if (role === 'SGM') return '/sgm';
        if (role === 'SENIOR') return '/senior';
        if (role === 'CLIENT') return '/client';
        return '/employee';
      })()
    },
    {
      label: "Company Dashboard",
      icon: <Building2 size={19} />,
      path: "/company-dashboard",
      roles: ['KAYAARA', 'MLS']
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
      label: "KPIs",
      icon: <Target size={19} />,
      path: "/weekly-score"
    },
    {
      label: "Action Plan",
      icon: <Box size={19} />,
      path: "/actionplan"
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
      label: "MCTC",
      icon: <CalendarRange size={19} />,
      path: "/mctc"
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

  const handleLogout = () => {
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
              <img src="/kayaara-logo.png" alt="KAYAARA Innovations" className="h-9 w-auto object-contain" />
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

            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 k-scroll">
              {menuItems
                .filter(isMenuItemVisible)
                .map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-colors ${isMenuItemActive(item)
                      ? 'bg-[var(--k-blue-tint)] text-[var(--k-blue)] font-bold shadow-xs border border-[var(--k-blue)]/20'
                      : 'text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)]'
                      }`}
                  >
                    <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--k-white)] shadow-2xs text-[var(--k-blue)]">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
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
              <motion.img
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                src="/kayaara-logo.png"
                alt="KAYAARA Innovations"
                className="w-full max-w-[165px] h-auto object-contain"
              />
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
                alt="KAYAARA Innovations"
                className="h-9 w-9 object-contain"
              />
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-xl bg-[var(--k-white)] border border-[var(--k-grey-200)] shadow-xs text-[var(--k-grey-500)] hover:border-[var(--k-blue)] hover:text-[var(--k-blue)] transition-all hover:scale-105"
                title="Expand sidebar"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
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
          className="px-3 space-y-1 flex-1 overflow-y-auto no-scrollbar py-3"
        >
          {menuItems
            .filter(isMenuItemVisible)
            .map((item, index) => (
              <div key={index}>
                {item.label === "Clients" ? (
                  <>
                    <div
                      className={`${itemClasses(isMenuItemActive(item))} justify-between cursor-pointer`}
                      title={!isOpen ? item.label : ''}
                    >
                      {isMenuItemActive(item) && <ActiveIndicator />}
                      <div
                        className="flex-1 flex items-center gap-3"
                        onClick={() => {
                          navigate('/clients');
                          setClientsExpanded(!clientsExpanded);
                        }}
                      >
                        <span
                          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 shadow-2xs group-hover:scale-105"
                          style={
                            isMenuItemActive(item)
                              ? { background: 'var(--k-blue)', color: '#ffffff', boxShadow: '0 4px 12px -2px rgba(0,134,255,0.4)' }
                              : { background: 'var(--k-grey-100)', color: 'var(--k-grey-600)' }
                          }
                        >
                          {item.icon}
                        </span>
                        {isOpen && (
                          <span className="text-sm font-medium tracking-tight group-hover:translate-x-0.5 transition-transform">
                            {item.label}
                          </span>
                        )}
                      </div>
                      {isOpen && (
                        <button
                          className={chevronBtnClasses}
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientsExpanded(!clientsExpanded);
                          }}
                        >
                          {clientsExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      )}
                    </div>

                    {/* Creative Clients Dropdown */}
                    <AnimatePresence initial={false}>
                      {clientsExpanded && isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="ml-5 mt-1 space-y-0.5 overflow-hidden border-l-2 pl-3 py-1.5 rounded-r-2xl bg-[var(--k-band-grey)]/40"
                          style={{ borderColor: 'var(--k-blue)' }}
                        >
                          {clients.map((client) => (
                            <div key={client.id}>
                              <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-sm text-[var(--k-grey-700)] hover:bg-[var(--k-white)] transition-all shadow-2xs">
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
                                  className={`${chevronBtnClasses} ml-2`}
                                >
                                  {expandedClients[client.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              </div>

                              {/* Projects under client */}
                              <AnimatePresence initial={false}>
                                {expandedClients[client.id] && clientProjects[client.id] && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                                    className="ml-3 mt-1 space-y-0.5 overflow-hidden border-l pl-2 border-[var(--k-grey-200)]"
                                  >
                                    {clientProjects[client.id].map((project) => (
                                      <button
                                        key={project.id}
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors ${location.pathname === `/projects/${project.id}`
                                          ? 'text-[var(--k-blue)] bg-[var(--k-blue-tint)] font-bold'
                                          : 'text-[var(--k-grey-500)] hover:bg-[var(--k-white)] hover:text-[var(--k-ink)]'
                                          }`}
                                      >
                                        {project.name}
                                      </button>
                                    ))}
                                    {clientProjects[client.id].length === 0 && (
                                      <div className="px-2.5 py-1.5 text-xs" style={{ color: 'var(--k-grey-500)' }}>No projects</div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                          {clients.length === 0 && (
                            <div className="px-2.5 py-2 text-sm" style={{ color: 'var(--k-grey-500)' }}>No clients found</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : item.label === "Action Plan" ? (
                  <>
                    <div
                      className={`${itemClasses(location.pathname.includes('/actionplan'))} justify-between cursor-pointer`}
                      title={!isOpen ? item.label : ''}
                    >
                      {location.pathname.includes('/actionplan') && <ActiveIndicator />}
                      <div
                        className="flex-1 flex items-center gap-3"
                        onClick={() => {
                          setActionPlanExpanded((prev) => !prev);
                          if (clientsExpanded) {
                            setClientsExpanded(false);
                          }
                        }}
                      >
                        <span
                          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 shadow-2xs group-hover:scale-105"
                          style={
                            location.pathname.includes('/actionplan')
                              ? { background: 'var(--k-blue)', color: '#ffffff', boxShadow: '0 4px 12px -2px rgba(0,134,255,0.4)' }
                              : { background: 'var(--k-grey-100)', color: 'var(--k-grey-600)' }
                          }
                        >
                          {item.icon}
                        </span>
                        {isOpen && (
                          <span className="text-sm font-medium tracking-tight group-hover:translate-x-0.5 transition-transform">
                            {item.label}
                          </span>
                        )}
                      </div>
                      {isOpen && (
                        <button
                          className={chevronBtnClasses}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionPlanExpanded(!actionPlanExpanded);
                          }}
                        >
                          {actionPlanExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      )}
                    </div>

                    {/* Creative Action Plan Dropdown */}
                    <AnimatePresence initial={false}>
                      {actionPlanExpanded && isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="ml-5 mt-1 space-y-0.5 overflow-hidden border-l-2 pl-3 py-1.5 rounded-r-2xl bg-[var(--k-band-grey)]/40"
                          style={{ borderColor: 'var(--k-blue)' }}
                        >
                          {clients.map((client) => (
                            <div key={client.id}>
                              <button
                                onClick={() => navigate(`/clients/${client.id}/actionplan`)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-sm truncate transition-all ${location.pathname === `/clients/${client.id}/actionplan`
                                  ? 'text-[var(--k-blue)] bg-[var(--k-blue-tint)] font-bold shadow-2xs'
                                  : 'text-[var(--k-grey-700)] hover:bg-[var(--k-white)] hover:text-[var(--k-ink)]'
                                  }`}
                              >
                                {client.company_name}
                              </button>
                            </div>
                          ))}
                          {clients.length === 0 && (
                            <div className="px-2.5 py-2 text-sm" style={{ color: 'var(--k-grey-500)' }}>No clients found</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <motion.button
                    onClick={() => navigate(item.path)}
                    className={itemClasses(isMenuItemActive(item))}
                    title={!isOpen ? item.label : ''}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {isMenuItemActive(item) && <ActiveIndicator />}
                    <span
                      className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 shadow-2xs group-hover:scale-105"
                      style={
                        isMenuItemActive(item)
                          ? { background: 'var(--k-blue)', color: '#ffffff', boxShadow: '0 4px 12px -2px rgba(0,134,255,0.4)' }
                          : { background: 'var(--k-grey-100)', color: 'var(--k-grey-600)' }
                      }
                    >
                      {item.icon}
                    </span>
                    {isOpen && (
                      <span className="text-sm font-medium tracking-tight group-hover:translate-x-0.5 transition-transform">
                        {item.label}
                      </span>
                    )}
                  </motion.button>
                )}
              </div>
            ))}
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

    </>
  );
};

export default Sidebar;
