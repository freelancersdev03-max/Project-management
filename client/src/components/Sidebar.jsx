import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, Briefcase, Target, Box, Users2, LogOut, CalendarRange, MapPin, CircleUser, ChevronDown, ChevronUp, Trophy, Building2, ClipboardCheck, TrendingUp, CheckCircle2, FileSpreadsheet, FileBarChart, Menu, X } from 'lucide-react';
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
      label: "DDTME",
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
      label: "DDFMS",
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
      label: "RC7",
      icon: <FileBarChart size={19} />,
      path: "/rc7"
    },
    {
      label: "Mandays Planning",
      icon: <ClipboardCheck size={19} />,
      path: "/mandays-planning"
    },
    {
      label: "Visit Agenda",
      icon: <MapPin size={19} />,
      path: "/visitagenda"
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

    if (item.path === '/visitagenda') {
      return path === '/visitagenda' || path.startsWith('/visitagenda/');
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

  /* Shared look for a nav row — white sidebar, blue-tint active, sliding indicator */
  const itemClasses = (active) =>
    `relative w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-left transition-all duration-200 ${
      active
        ? 'text-[var(--k-blue)] bg-[var(--k-blue-tint)] font-semibold'
        : 'text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)] hover:text-[var(--k-ink)]'
    }`;

  const ActiveIndicator = () => (
    <motion.span
      layoutId="k-sidebar-active"
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[4px] rounded-full"
      style={{ background: 'var(--k-blue)', boxShadow: '0 0 8px 1px var(--k-blue-glow)' }}
    />
  );

  const username = localStorage.getItem('username') || 'User';
  const userRole = (localStorage.getItem('role') || '').toUpperCase();

  const chevronBtnClasses = 'flex-shrink-0 p-1 rounded-md text-[var(--k-grey-500)] hover:bg-[var(--k-blue-tint)] hover:text-[var(--k-blue)] transition-colors';

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
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-colors ${isMenuItemActive(item)
                      ? 'bg-[var(--k-blue-tint)] text-[var(--k-blue)] font-semibold'
                      : 'text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)]'
                      }`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}
            </nav>

            <div className="px-4 pb-6 pt-2 border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)] hover:text-[var(--k-ink)] transition-colors"
              >
                <LogOut size={20} />
                <span className="text-sm font-semibold">Logout</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside
        className={`relative h-full bg-white transition-all duration-300 ease-in-out hidden md:flex flex-col border-r ${isOpen ? 'w-64' : 'w-20'}`}
        style={{ borderColor: 'var(--k-grey-200)' }}
      >
        {/* Blue accent top stripe */}
        <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, var(--k-blue) 0%, var(--k-blue-light) 100%)' }} />

        {/* Logo Section */}
        <div className={`flex items-center justify-center pt-5 pb-4 ${isOpen ? 'px-5' : 'px-3'}`}>
          {isOpen ? (
            <motion.img
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              src="/kayaara-logo.png"
              alt="KAYAARA Innovations"
              className="w-full max-w-[196px] h-auto object-contain"
            />
          ) : (
            <motion.img
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              src="/kayaara-mark.png"
              alt="KAYAARA Innovations"
              className="h-9 w-9 object-contain"
            />
          )}
        </div>

        {/* Toggle Button */}
        <div className={`pb-2 flex ${isOpen ? 'justify-end px-4' : 'justify-center px-2'}`}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg transition-colors text-[var(--k-grey-500)] hover:bg-[var(--k-blue-tint)] hover:text-[var(--k-blue)]"
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? (
              <ChevronLeft size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav
          ref={navRef}
          onScroll={handleScroll}
          className="px-3 space-y-0.5 flex-1 overflow-y-auto no-scrollbar py-2"
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
                        className="flex-1 flex items-center gap-3.5"
                        onClick={() => {
                          navigate('/clients');
                          setClientsExpanded(!clientsExpanded);
                        }}
                      >
                        <span className="flex-shrink-0">{item.icon}</span>
                        {isOpen && (
                          <span className="text-sm">{item.label}</span>
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

                    {/* Clients Dropdown */}
                    <AnimatePresence initial={false}>
                      {clientsExpanded && isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="ml-7 mt-1 space-y-0.5 overflow-hidden border-l pl-2"
                          style={{ borderColor: 'var(--k-grey-200)' }}
                        >
                          {clients.map((client) => (
                            <div key={client.id}>
                              <div className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)] transition-colors">
                                <button
                                  onClick={() => navigate(`/clients/${client.id}`)}
                                  className="flex-1 text-left truncate hover:text-[var(--k-blue)] transition-colors"
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
                                    className="ml-3 mt-0.5 space-y-0.5 overflow-hidden"
                                  >
                                    {clientProjects[client.id].map((project) => (
                                      <button
                                        key={project.id}
                                        onClick={() => navigate(`/projects/${project.id}`)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition-colors ${location.pathname === `/projects/${project.id}`
                                          ? 'text-[var(--k-blue)] bg-[var(--k-blue-tint)] font-medium'
                                          : 'text-[var(--k-grey-500)] hover:bg-[var(--k-grey-100)] hover:text-[var(--k-ink)]'
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
                        className="flex-1 flex items-center gap-3.5"
                        onClick={() => {
                          setActionPlanExpanded((prev) => !prev);
                          if (clientsExpanded) {
                            setClientsExpanded(false);
                          }
                        }}
                      >
                        <span className="flex-shrink-0">{item.icon}</span>
                        {isOpen && (
                          <span className="text-sm">{item.label}</span>
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

                    {/* Action Plan Clients Dropdown */}
                    <AnimatePresence initial={false}>
                      {actionPlanExpanded && isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="ml-7 mt-1 space-y-0.5 overflow-hidden border-l pl-2"
                          style={{ borderColor: 'var(--k-grey-200)' }}
                        >
                          {clients.map((client) => (
                            <div key={client.id}>
                              <button
                                onClick={() => navigate(`/clients/${client.id}/actionplan`)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm truncate transition-colors ${location.pathname === `/clients/${client.id}/actionplan`
                                  ? 'text-[var(--k-blue)] bg-[var(--k-blue-tint)] font-semibold'
                                  : 'text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)] hover:text-[var(--k-ink)]'
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
                      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors duration-200"
                      style={isMenuItemActive(item) ? { background: 'rgba(0,134,255,0.12)', color: 'var(--k-blue)' } : {}}
                    >
                      {item.icon}
                    </span>
                    {isOpen && (
                      <span className="text-sm">{item.label}</span>
                    )}
                  </motion.button>
                )}
              </div>
            ))}
        </nav>

        {/* User Info Strip + Logout */}
        <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-2 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--k-band-grey)' }}
            >
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--k-ink)' }}>{username}</p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--k-blue)' }}>{userRole}</p>
            </motion.div>
          )}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-colors text-[var(--k-grey-700)] hover:bg-[var(--k-grey-100)] hover:text-[var(--k-ink)]"
            title={!isOpen ? 'Logout' : ''}
          >
            <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg">
              <LogOut size={19} />
            </span>
            {isOpen && (
              <span className="text-sm font-medium">
                Logout
              </span>
            )}
          </motion.button>
        </div>
      </aside>

    </>
  );
};

export default Sidebar;
