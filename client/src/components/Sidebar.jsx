import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, LayoutDashboard, Briefcase, Target, Box, Users2, LogOut, CalendarRange, MapPin, CircleUser, ChevronDown, ChevronUp, Trophy, Building2, ClipboardCheck, TrendingUp, CheckCircle2, FileSpreadsheet, FileBarChart, Menu, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import api from '../api';

const Sidebar = () => {
  const { isOpen, setIsOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
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
      icon: <CircleUser size={20} />,
      path: (() => {
        if (role === 'ADMIN') return '/admin';
        if (role === 'HQEPL') return '/hqepl';
        if (role === 'SGM') return '/sgm';
        if (role === 'SENIOR') return '/senior';
        if (role === 'CLIENT') return '/client';
        return '/employee';
      })(),
      color: "hover:text-slate-200"
    },
    {
      label: "Company Dashboard",
      icon: <Building2 size={20} />,
      path: "/company-dashboard",
      color: "hover:text-blue-400",
      roles: ['HQEPL']
    },
    {
      label: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      path: "/employeedashboard",
      color: "hover:text-blue-600"
    },
    {
      label: "Clients",
      icon: <Briefcase size={20} />,
      path: '/clients',
      color: "hover:text-purple-600"
    },
    {
      label: "KPIs",
      icon: <Target size={20} />,
      path: "/weekly-score",
      color: "hover:text-emerald-600"
    },
    {
      label: "Action Plan",
      icon: <Box size={20} />,
      path: "/actionplan",
      color: "hover:text-teal-400"
    },
    {
      label: "Weekly Score",
      icon: <TrendingUp size={20} />,
      path: "/weeklyscore",
      color: "hover:text-indigo-600"
    },
    {
      label: "DDTME",
      icon: <CheckCircle2 size={20} />,
      path: "/ddtme",
      color: "hover:text-orange-600"
    },
    {
      label: "Team Members",
      icon: <Users2 size={20} />,
      path: "/staff",
      color: "hover:text-indigo-600",
      hiddenRoles: ['EXTERNAL', 'EMPLOYEE']
    },
    {
      label: "DDFMS",
      icon: <FileSpreadsheet size={20} />,
      path: "/ddfms",
      color: "hover:text-orange-600",
      hiddenRoles: ['SENIOR', 'EXTERNAL']
    },
    {
      label: "MCTC",
      icon: <CalendarRange size={20} />,
      path: "/mctc",
      color: "hover:text-rose-400"
    },
    {
      label: "RC7",
      icon: <FileBarChart size={20} />,
      path: "/rc7",
      color: "hover:text-rose-400"
    },
    {
      label: "Mandays Planning",
      icon: <ClipboardCheck size={20} />,
      path: "/mandays-planning",
      color: "hover:text-fuchsia-300"
    },
    {
      label: "Visit Agenda",
      icon: <MapPin size={20} />,
      path: "/visitagenda",
      color: "hover:text-cyan-400"
    },
    {
      label: "Achievement",
      icon: <Trophy size={20} />,
      path: "/achievement",
      color: "hover:text-amber-400"
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

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        type="button"
        className="fixed top-3 left-3 z-[200] md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-[#1e293b] text-white shadow-lg"
        aria-label="Open navigation menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile Fullscreen Overlay Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[250] md:hidden bg-[#1e293b]/98 backdrop-blur-md flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <img src="/WhiteLogo.png" alt="HQEPL Logo" className="h-10 object-contain" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-full hover:bg-white/10 text-white"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
            {menuItems
              .filter(isMenuItemVisible)
              .map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all ${isMenuItemActive(item)
                    ? 'bg-[#F58A4B] text-white font-bold'
                    : 'text-white/80 hover:bg-white/10'
                    }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </button>
              ))}
          </nav>

          <div className="px-5 pb-6">
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/10 text-white/90 hover:bg-red-500/20 hover:text-red-100 transition-all"
            >
              <LogOut size={20} />
              <span className="text-sm font-semibold">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`relative h-full bg-[#1e293b] text-white shadow-lg transition-all duration-300 ease-in-out hidden md:flex flex-col ${isOpen ? 'w-64' : 'w-20'
          }`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-center p-4 border-b border-white/50">
          <img
            src="/WhiteLogo.png"
            alt="HQEPL Logo"
            className={`object-contain ${isOpen ? 'h-20' : 'h-12'
              } transition-all duration-300`}
          />
        </div>

        {/* Toggle Button */}
        <div className="p-4 flex justify-end">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? (
              <ChevronLeft size={20} />
            ) : (
              <ChevronRight size={20} />
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav
          ref={navRef}
          onScroll={handleScroll}
          className="px-4 space-y-2 flex-1 overflow-y-auto no-scrollbar"
        >
          {menuItems
            .filter(isMenuItemVisible)
            .map((item, index) => (
              <div key={index}>
                {item.label === "Clients" ? (
                  <>
                    <div
                      onMouseEnter={() => setHoveredItem(index)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${isMenuItemActive(item) || hoveredItem === index
                        ? 'bg-white/15 backdrop-blur'
                        : 'hover:bg-white/10'
                        }`}
                      title={!isOpen ? item.label : ''}
                    >
                      <div
                        className="flex-1 flex items-center gap-4 cursor-pointer"
                        onClick={() => {
                          setActionPlanExpanded((prev) => !prev);
                          if (clientsExpanded) {
                            setClientsExpanded(false);
                          }
                        }}
                      >
                        <span className={`flex-shrink-0 ${item.color}`}>
                          {item.icon}
                        </span>
                        {isOpen && (
                          <span className="text-sm font-medium text-white/90">
                            {item.label}
                          </span>
                        )}
                      </div>
                      {isOpen && (
                        <button
                          className="flex-shrink-0 p-1 hover:bg-white/20 rounded-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientsExpanded(!clientsExpanded);
                          }}
                        >
                          {clientsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>

                    {/* Clients Dropdown */}
                    {clientsExpanded && isOpen && (
                      <div className="ml-8 mt-1 space-y-1">
                        {clients.map((client) => (
                          <div key={client.id}>
                            <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 text-sm">
                              <button
                                onClick={() => navigate(`/clients/${client.id}`)}
                                className="flex-1 text-left truncate hover:text-white"
                              >
                                {client.company_name}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleClient(client.id);
                                }}
                                className="p-1 hover:bg-white/20 rounded ml-2"
                              >
                                {expandedClients[client.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>

                            {/* Projects under client */}
                            {expandedClients[client.id] && clientProjects[client.id] && (
                              <div className="ml-4 mt-1 space-y-1">
                                {clientProjects[client.id].map((project) => (
                                  <button
                                    key={project.id}
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                    className="w-full text-left px-3 py-1.5 rounded-lg text-white/70 hover:bg-white hover:text-white/90 text-xs truncate transition-colors"
                                  >
                                    • {project.name}
                                  </button>
                                ))}
                                {clientProjects[client.id].length === 0 && (
                                  <div className="px-3 py-1.5 text-white/50 text-xs">No projects</div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        {clients.length === 0 && (
                          <div className="px-3 py-2 text-white/50 text-sm">No clients found</div>
                        )}
                      </div>
                    )}
                  </>
                ) : item.label === "Action Plan" ? (
                  <>
                    <div
                      onMouseEnter={() => setHoveredItem(index)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${location.pathname.includes('/actionplan') || hoveredItem === index
                        ? 'bg-white/15 backdrop-blur'
                        : 'hover:bg-white/10'
                        }`}
                      title={!isOpen ? item.label : ''}
                    >
                      <div
                        className="flex-1 flex items-center gap-4 cursor-pointer"
                        onClick={() => {
                          setActionPlanExpanded((prev) => !prev);
                          if (clientsExpanded) {
                            setClientsExpanded(false);
                          }
                        }}
                      >
                        <span className={`flex-shrink-0 ${item.color}`}>
                          {item.icon}
                        </span>
                        {isOpen && (
                          <span className="text-sm font-medium text-white/90">
                            {item.label}
                          </span>
                        )}
                      </div>
                      {isOpen && (
                        <button
                          className="flex-shrink-0 p-1 hover:bg-white/20 rounded-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionPlanExpanded(!actionPlanExpanded);
                          }}
                        >
                          {actionPlanExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>

                    {/* Action Plan Clients Dropdown */}
                    {actionPlanExpanded && isOpen && (
                      <div className="ml-8 mt-1 space-y-1">
                        {clients.map((client) => (
                          <div key={client.id}>
                            <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 text-sm">
                              <button
                                onClick={() => navigate(`/clients/${client.id}/actionplan`)}
                                className={`flex-1 text-left truncate text-white hover:text-white transition-colors ${location.pathname === `/clients/${client.id}/actionplan` ? 'font-bold text-[#F58A4B]' : ''}`}
                              >
                                {client.company_name}
                              </button>
                            </div>
                          </div>
                        ))}
                        {clients.length === 0 && (
                          <div className="px-3 py-2 text-white/50 text-sm">No clients found</div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => navigate(item.path)}
                    onMouseEnter={() => setHoveredItem(index)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${isMenuItemActive(item) || hoveredItem === index
                      ? 'bg-white/15 backdrop-blur'
                      : 'hover:bg-white/10'
                      }`}
                    title={!isOpen ? item.label : ''}
                  >
                    <span className={`flex-shrink-0 ${item.color}`}>
                      {item.icon}
                    </span>
                    {isOpen && (
                      <span className="text-sm font-medium text-white/90">
                        {item.label}
                      </span>
                    )}
                  </button>
                )}
              </div>
            ))}
        </nav>

        {/* Logout Button - Fixed at Bottom */}
        <div className="px-4 pb-4">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 bg-white/10 hover:bg-red-500/20 text-white/90 hover:text-red-100`}
            title={!isOpen ? 'Logout' : ''}
          >
            <span className="flex-shrink-0">
              <LogOut size={20} />
            </span>
            {isOpen && (
              <span className="text-sm font-medium">
                Logout
              </span>
            )}
          </button>
        </div>
      </aside>

    </>
  );
};

export default Sidebar;
