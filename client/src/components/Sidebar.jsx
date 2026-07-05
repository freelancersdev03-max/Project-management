import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, LayoutDashboard, Briefcase, 
  Users2, LogOut, CalendarRange, MapPin, 
  CircleUser, ChevronDown, ChevronUp, Trophy, Building2, 
  ClipboardCheck, TrendingUp, CheckCircle2, FileSpreadsheet, 
  FileBarChart, Menu, X, ShieldCheck, Settings, ClipboardList, Calendar 
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import api from '../api';

const Sidebar = () => {
  const { isOpen, setIsOpen } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for dropdowns
  const [clientsExpanded, setClientsExpanded] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sidebar_clientsExpanded')) || false; } catch { return false; }
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
        if (role === 'CLIENT') {
          const [clientResponse, projectsResponse] = await Promise.all([
            api.get('clients/me/'),
            api.get('projects/')
          ]);
          const clientData = clientResponse.data;
          const projects = Array.isArray(projectsResponse.data) ? projectsResponse.data : projectsResponse.data?.results || [];
          if (clientData?.id) {
            setClients([clientData]);
            setClientProjects(prev => ({ ...prev, [clientData.id]: projects }));
          } else {
            setClients([]);
          }
          return;
        }

        let endpoint = 'clients/list/';
        if (role === 'SGM') endpoint = 'sgm/clients/';
        else if (role === 'EMPLOYEE') endpoint = 'employees/clients/';

        const response = await api.get(endpoint);
        const clientList = Array.isArray(response.data) ? response.data : response.data?.results || [];
        setClients(clientList);
      } catch (error) {
        console.error('Failed to fetch clients:', error);
      }
    };

    if (clientsExpanded) {
      fetchClients();
    }
  }, [clientsExpanded, role]);

  const fetchClientProjects = async (clientId) => {
    if (clientProjects[clientId]) return;

    try {
      let endpoint = `/clients/${clientId}/projects/`;
      if (['CLIENT', 'SENIOR', 'EXTERNAL'].includes(role)) {
        endpoint = '/projects/';
      } else if (role === 'EMPLOYEE') {
        endpoint = `/employees/clients/${clientId}/projects/`;
      }

      const response = await api.get(endpoint);
      let projects = Array.isArray(response.data) ? response.data : response.data?.results || [];

      if (['CLIENT', 'SENIOR', 'EXTERNAL'].includes(role)) {
        projects = projects.filter(p => String(p.client?.id || p.client) === String(clientId));
      }

      setClientProjects(prev => ({ ...prev, [clientId]: projects }));
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setClientProjects(prev => ({ ...prev, [clientId]: [] }));
    }
  };

  const toggleClient = async (clientId) => {
    setExpandedClients(prev => ({ ...prev, [clientId]: !prev[clientId] }));
    if (!expandedClients[clientId]) {
      await fetchClientProjects(clientId);
    }
  };

  const isMenuItemVisible = (item) => {
    if (item.roles && !item.roles.includes(role)) return false;
    if (item.hiddenRoles && item.hiddenRoles.includes(role)) return false;
    return true;
  };

  const isMenuItemActive = (item) => {
    const path = location.pathname;
    if (item.path === '/visitagenda') return path === '/visitagenda' || path.startsWith('/visitagenda/');
    if (item.path === '/clients') return path === '/clients' || path.startsWith('/clients/') || path.startsWith('/projects/');
    return path === item.path;
  };

  // SaaS Navigation Architecture
  const navigationGroups = [
    {
      group: "Dashboard",
      items: [
        {
          label: "My Profile",
          icon: <CircleUser size={18} />,
          hiddenRoles: ['ADMIN', 'HQEPL', 'MLS'],
          path: (() => {
            if (role === 'SGM') return '/sgm';
            if (role === 'SENIOR') return '/senior';
            if (role === 'CLIENT') return '/client';
            return '/employee';
          })()
        },
        {
          label: "My Dashboard",
          icon: <LayoutDashboard size={18} />,
          path: '/dashboard'
        },
        {
          label: "Admin Portal",
          icon: <LayoutDashboard size={18} />,
          roles: ['ADMIN'],
          path: '/admin'
        },
        {
          label: "Executive Dashboard",
          icon: <LayoutDashboard size={18} />,
          roles: ['HQEPL', 'MLS'],
          path: '/hqepl'
        },
        {
          label: "Company Overview",
          icon: <Building2 size={18} />,
          roles: ['HQEPL', 'MLS'],
          path: '/company-dashboard'
        }
      ]
    },
    {
      group: "Workspace",
      items: [
        { label: "Organizations", icon: <Building2 size={18} />, path: "/clients", isDropdown: true, stateKey: "clientsExpanded" },
        { label: "Teams", icon: <Users2 size={18} />, path: "/staff", hiddenRoles: ['EXTERNAL', 'EMPLOYEE'] },
      ]
    },
    {
      group: "People",
      items: [
        { label: "Users", icon: <CircleUser size={18} />, path: "/admin/createuser", roles: ['ADMIN'] },
        { label: "Roles & Permissions", icon: <ShieldCheck size={18} />, path: "/roles", roles: ['ADMIN'] }
      ]
    },
    {
      group: "Planning",
      items: [
        { label: "Planning", icon: <FileSpreadsheet size={18} />, path: "/ddtme" },
        { label: "Weekly Planning", icon: <MapPin size={18} />, path: "/rc7" },
        { label: "Meetings", icon: <CalendarRange size={18} />, path: "/visitagenda" },
        { label: "Calendar", icon: <Calendar size={18} />, path: "/mctc" },
        { label: "Mandays Planning", icon: <ClipboardCheck size={18} />, path: "/mandays-planning" },
      ]
    },
    {
      group: "Insights",
      items: [
        { label: "Analytics", icon: <TrendingUp size={18} />, path: "/weekly-score" },
        { label: "Reports", icon: <FileBarChart size={18} />, path: "/ddfms", hiddenRoles: ['SENIOR', 'EXTERNAL', 'MLS'] },
      ]
    },
    {
      group: "Administration",
      roles: ['ADMIN', 'HQEPL'],
      items: [
        { label: "Settings", icon: <Settings size={18} />, path: "/settings" },
        { label: "Audit Logs", icon: <ClipboardList size={18} />, path: "/audit-logs" },
      ]
    }
  ];

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const renderNavGroup = (groupObj, groupIndex) => {
    if (groupObj.roles && !groupObj.roles.includes(role)) return null;

    const visibleItems = groupObj.items.filter(isMenuItemVisible);
    if (visibleItems.length === 0) return null;

    return (
      <div key={groupIndex} className="mb-6">
        {isOpen && (
          <h3 className="px-4 mb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
            {groupObj.group}
          </h3>
        )}
        <div className="space-y-1">
          {visibleItems.map((item, itemIndex) => renderNavItem(item, `${groupIndex}-${itemIndex}`))}
        </div>
      </div>
    );
  };

  const renderNavItem = (item, key) => {
    const isActive = isMenuItemActive(item);

    if (item.isDropdown && item.label === "Organizations") {
      return (
        <div key={key}>
          <div
            className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${isActive ? 'bg-[#0086FF]/10 text-[#0086FF]' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            onClick={() => {
              navigate(item.path);
              setClientsExpanded(!clientsExpanded);
            }}
            title={!isOpen ? item.label : ''}
          >
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0">{item.icon}</span>
              {isOpen && <span className="text-sm font-semibold">{item.label}</span>}
            </div>
            {isOpen && (
              <button
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  setClientsExpanded(!clientsExpanded);
                }}
              >
                {clientsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
          {/* Dropdown Content */}
          {clientsExpanded && isOpen && (
            <div className="ml-7 mt-1 border-l border-white/10 pl-2 space-y-1">
              {clients.map((client) => (
                <div key={client.id}>
                  <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-slate-400 hover:bg-white/5 hover:text-white text-xs">
                    <button onClick={() => navigate(`/clients/${client.id}`)} className="flex-1 text-left truncate font-medium">
                      {client.company_name}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleClient(client.id); }} className="p-1 hover:bg-white/10 rounded">
                      {expandedClients[client.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                  {expandedClients[client.id] && clientProjects[client.id] && (
                    <div className="ml-3 mt-1 border-l border-white/10 pl-2 space-y-1 py-1">
                      {clientProjects[client.id].map((project) => (
                        <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className="w-full text-left px-2 py-1 rounded text-slate-500 hover:text-[#0086FF] text-[11px] truncate transition-colors">
                          {project.name}
                        </button>
                      ))}
                      {clientProjects[client.id].length === 0 && (
                        <div className="px-2 py-1 text-slate-600 text-[11px]">No projects</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {clients.length === 0 && <div className="px-3 py-2 text-slate-500 text-xs">No organizations</div>}
            </div>
          )}
        </div>
      );
    }

    return (
      <button
        key={key}
        onClick={() => {
          if (!item.disabled) navigate(item.path);
        }}
        disabled={item.disabled}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${item.disabled ? 'opacity-40 cursor-not-allowed' : ''} ${isActive
            ? 'bg-[#0086FF] text-white shadow-md shadow-[#0086FF]/20 font-semibold'
            : 'text-slate-300 hover:bg-white/10 hover:text-white font-medium'
          }`}
        title={!isOpen ? item.label : ''}
      >
        <span className="flex-shrink-0">{item.icon}</span>
        {isOpen && <span className="text-sm">{item.label}</span>}
        {isOpen && item.disabled && <span className="ml-auto text-[9px] uppercase tracking-wider font-bold bg-white/10 px-2 py-0.5 rounded text-white/50">Soon</span>}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-3 left-3 z-[200] md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-[#0F172A] text-white shadow-lg hover:bg-slate-800 transition-colors border border-white/10"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Fullscreen Overlay Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[250] md:hidden bg-[#0F172A] flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-5 h-[72px] border-b border-white/5">
            <img src="/logo/Kayaara%20logo.png" alt="Kayaara" className="h-8 scale-[2] origin-left object-contain" />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-white/5 text-slate-400"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6">
            {navigationGroups.map((group, idx) => (
              <div key={idx}>
                {renderNavGroup(group, idx)}
              </div>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-white/5">
            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-semibold"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`relative h-full bg-[#0F172A] text-white shadow-2xl transition-all duration-300 ease-in-out hidden md:flex flex-col border-r border-white/5 ${isOpen ? 'w-[260px]' : 'w-[80px]'
          }`}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-center h-[72px] border-b border-white/5 flex-shrink-0">
          <img
            src="/logo/Kayaara%20logo.png"
            alt="Kayaara"
            className={`object-contain scale-[2] ${isOpen ? 'h-10' : 'h-6'} transition-all duration-300 origin-center`}
          />
        </div>

        {/* Toggle Button */}
        <div className="p-3 flex justify-end flex-shrink-0">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-white"
            title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Menu Items */}
        <nav
          ref={navRef}
          onScroll={handleScroll}
          className="px-3 flex-1 overflow-y-auto no-scrollbar pb-6"
        >
          {navigationGroups.map((group, idx) => renderNavGroup(group, idx))}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-white/5 flex-shrink-0">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 hover:bg-red-500/10 text-slate-400 hover:text-red-400`}
            title={!isOpen ? 'Logout' : ''}
          >
            <span className="flex-shrink-0"><LogOut size={18} /></span>
            {isOpen && <span className="text-sm font-semibold">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
