import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, Filter, ArrowRight,
  Users, Trash2, Edit, MoreHorizontal, X, ShieldCheck, ChevronDown, FileStack
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../api';
import ProjectDetailModal from './ProjectDetailModal';
import { PageHeader, Band, Bands } from '../components/kayaara/Band';
import ProjectPortfolioViews, { ProjectViewTabs } from '../components/ProjectPortfolioViews';
import TemplatePickerModal from '../components/TemplatePickerModal';
import { getPriorityDetails, PriorityBadge } from '../utils/priorityUtils.jsx';

export default function ClientProjects() {
  const role = (localStorage.getItem("role") || "").toUpperCase();
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [filterQuery, setFilterQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]); // Kept for the count badge
  const [internalTeam, setInternalTeam] = useState([]); // Fixed: Internal team members from Client details
  const [clientSgms, setClientSgms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);
  const [hierarchyAssignments, setHierarchyAssignments] = useState({});
  const [isSavingHierarchy, setIsSavingHierarchy] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [activeView, setActiveView] = useState('list');

  const hierarchyRoleOptions = ['HH', 'SC', 'KAYAARA'];

  const canToggleProjectStatus = ['ADMIN', 'SGM'].includes(role);
  const canSetHierarchy = ['ADMIN', 'KAYAARA', 'MLS', 'SGM'].includes(role);

  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [newProjectDropdownOpen, setNewProjectDropdownOpen] = useState(false);
  const newProjectDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (newProjectDropdownRef.current && !newProjectDropdownRef.current.contains(event.target)) {
        setNewProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTemplateSelected = (template) => {
    setIsTemplatePickerOpen(false);
    setIsModalOpen(true);
    setProjectToEdit(null);
    // Store template data for the modal
    setSelectedTemplate(template);
  };

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const fetchData = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      let endpoint = "projects/";
      if (role === "EMPLOYEE") endpoint = "employees/my-projects/";

      const projRes = await api.get(endpoint);
      const projectList = Array.isArray(projRes.data) ? projRes.data : (projRes.data?.results || []);
      const clientProjects = projectList.filter(p => String(p.client?.id || p.client) === String(clientId));
      setProjects(clientProjects);

      // Fetch Client Details for SGM/Internal fallback data (needed across all roles)
      try {
        const clientRes = await api.get(`clients/${clientId}/`);
        setClientData(clientRes.data);
        setInternalTeam(clientRes.data.internal_team_details || []);
        setClientSgms(clientRes.data.assigned_sgms_details || []);

        if (Array.isArray(clientRes.data.client_hierarchy)) {
          const savedMap = clientRes.data.client_hierarchy.reduce((acc, item) => {
            const key = String(item.member_key || item.member_id || '');
            if (key && item.hierarchy) acc[key] = item.hierarchy;
            return acc;
          }, {});
          setHierarchyAssignments(savedMap);
        }
      } catch (err) {
        console.error("Failed to fetch client details", err);
        setInternalTeam([]);
        setClientSgms([]);
      }

      // We still fetch team members to show the count in the header button
      if (['ADMIN', 'KAYAARA', 'MLS', 'SGM'].includes(role)) {
        try {
          // Fetch External Members
          const teamRes = await api.get(`clients/${clientId}/members/`);
          setTeamMembers(teamRes.data);
        } catch (err) {
          setTeamMembers([]);
        }
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [clientId]);

  const handleDelete = async (projectId) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await api.delete(`projects/${projectId}/`);
      fetchData();
    } catch (error) {
      console.error("Delete failed:", error);
      const msg = error.response?.data?.detail || "Failed to delete project.";
      alert(msg);
    }
  };

  const handleEdit = (project) => {
    setProjectToEdit(project);
    setIsModalOpen(true);
  };

  const handleProjectStatusToggle = async (project) => {
    try {
      const currentStatus = (project.status || 'ACTIVE').toUpperCase();
      const nextStatus = currentStatus === 'ACTIVE' ? 'HOLD' : 'ACTIVE';
      await api.patch(`projects/${project.id}/`, { status: nextStatus });
      fetchData();
    } catch (error) {
      console.error("Project status update failed:", error);
      const msg = error.response?.data?.detail || "Failed to update project status.";
      alert(msg);
    }
  };

  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(filterQuery.toLowerCase()));

  const hierarchyMembers = React.useMemo(() => {
    const members = [];

    // Add SGMs
    clientSgms.forEach(sgm => {
      members.push({
        ...sgm,
        roleType: 'SGM',
        key: String(sgm.id)
      });
    });

    // Add KAYAARA members
    Array.isArray(clientData?.assigned_kayaara_users_details) && clientData.assigned_kayaara_users_details.forEach(member => {
      members.push({
        ...member,
        roleType: 'KAYAARA',
        key: String(member.id)
      });
    });

    // Add Internal Team
    internalTeam.forEach(member => {
      members.push({
        ...member,
        roleType: 'INTERNAL',
        key: String(member.id)
      });
    });

    return Array.from(new Map(members.map(m => [m.key, m])).values());
  }, [clientSgms, internalTeam]);

  const handleSaveHierarchy = async () => {
    try {
      setIsSavingHierarchy(true);
      const payload = hierarchyMembers.map(member => ({
        member_key: member.key,
        member_id: member.id,
        name: member.full_name || member.username || member.email,
        hierarchy: member.roleType === 'SGM'
          ? 'SGM'
          : (member.roleType === 'KAYAARA' ? 'KAYAARA' : (hierarchyAssignments[member.key] || 'HH')),
      }));

      await api.patch(`clients/${clientId}/`, {
        client_hierarchy: payload
      });

      setClientData(prev => ({ ...prev, client_hierarchy: payload }));
      setIsHierarchyModalOpen(false);
      alert("Hierarchy settings updated successfully.");
    } catch (error) {
      console.error("Failed to save hierarchy", error.response?.data || error);
      const errorMessage =
        error.response?.data?.detail
        || error.response?.data?.client_hierarchy?.[0]
        || "Failed to save hierarchy.";
      alert(errorMessage);
    } finally {
      setIsSavingHierarchy(false);
    }
  };

  const getProjectLeadName = (proj) => {
    const detailLead = proj?.assigned_sgm_details;
    if (detailLead) {
      return detailLead.full_name || detailLead.username || detailLead.email;
    }

    if (proj?.assigned_sgm_name) return proj.assigned_sgm_name;
    if (proj?.assigned_sgm_email) return proj.assigned_sgm_email;

    const projectLeadFromArray = Array.isArray(proj?.assigned_sgms_details) ? proj.assigned_sgms_details[0] : null;
    if (projectLeadFromArray) {
      return projectLeadFromArray.full_name || projectLeadFromArray.username || projectLeadFromArray.email;
    }

    const matchedClientSgm = clientSgms.find(sgm => String(sgm.id) === String(proj?.assigned_sgm));
    if (matchedClientSgm) {
      return matchedClientSgm.full_name || matchedClientSgm.username || matchedClientSgm.email;
    }

    if (clientSgms.length > 0) {
      const defaultClientSgm = clientSgms[0];
      return defaultClientSgm.full_name || defaultClientSgm.username || defaultClientSgm.email || "Unassigned";
    }

    return "Unassigned";
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ProjectDetailModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setProjectToEdit(null); setSelectedTemplate(null); }}
          onProjectCreated={fetchData}
          clientId={clientId}
          projectToEdit={projectToEdit}
          templateData={selectedTemplate}
        />

        <PageHeader
          title="Project"
          accent="Dashboard"
          subtitle="Workspace overview & management"
          backTo="/clients"
          actions={
            <>

              {(role === "ADMIN" || role === "KAYAARA" || role === "MLS" || role === "SGM") && (
                <>
                  {canSetHierarchy && (
                    <button
                      onClick={() => setIsHierarchyModalOpen(true)}
                      className="k-btn-ghost flex items-center gap-2 text-sm"
                    >
                      <ShieldCheck size={15} style={{ color: 'var(--k-blue)' }} /> Set hierarchy
                    </button>
                  )}

                  <button
                    onClick={() => navigate(`/clients/${clientId}/external-management`)}
                    className="k-btn-ghost flex items-center gap-2 text-sm"
                  >
                    <Users size={15} style={{ color: 'var(--k-blue)' }} /> External ({teamMembers.length})
                  </button>

                  {/* New Project Dropdown */}
                  <div className="relative" ref={newProjectDropdownRef}>
                    <button
                      onClick={() => setNewProjectDropdownOpen(!newProjectDropdownOpen)}
                      className="k-btn-primary flex items-center gap-2 text-sm"
                    >
                      <Plus size={16} /> New project
                      <ChevronDown size={14} />
                    </button>

                    <AnimatePresence>
                      {newProjectDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 top-full mt-2 w-56 rounded-2xl overflow-hidden z-50 bg-white border border-[var(--k-grey-200)] shadow-xl p-1"
                        >
                          <button
                            onClick={() => {
                              setNewProjectDropdownOpen(false);
                              setIsModalOpen(true);
                              setProjectToEdit(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-[var(--k-ink)] hover:bg-[var(--k-grey-100)] transition-colors"
                          >
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--k-blue)]" style={{ background: 'var(--k-blue-tint)' }}>
                              <Plus size={16} />
                            </div>
                            <span className="font-medium">Blank project</span>
                          </button>
                          <button
                            onClick={() => {
                              setNewProjectDropdownOpen(false);
                              setIsTemplatePickerOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm text-[var(--k-ink)] hover:bg-[var(--k-grey-100)] transition-colors"
                          >
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--k-blue)]" style={{ background: 'var(--k-blue-tint)' }}>
                              <FileStack size={16} />
                            </div>
                            <span className="font-medium">From template</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </>
          }
        />

        <main className="flex-1 overflow-y-auto k-scroll">
          <Bands>
            <Band tone="grey">
              <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative w-full max-w-lg">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--k-grey-500)' }} size={16} />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    className="k-input"
                    style={{ paddingLeft: '2.75rem' }}
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                  />
                </div>
                <ProjectViewTabs value={activeView} onChange={setActiveView} />
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="k-skeleton h-[300px]" />
                  ))}
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="k-card flex flex-col items-center justify-center py-20 text-center gap-3">
                  <img src="/kayaara-mark.png" alt="Kayaara" className="w-12 h-12 opacity-40 k-float" />
                  <h3 className="text-base font-bold" style={{ color: 'var(--k-ink)' }}>No projects found</h3>
                  <p className="text-sm" style={{ color: 'var(--k-grey-500)' }}>Workspace is currently empty.</p>
                  {(role === "ADMIN" || role === "KAYAARA" || role === "MLS" || role === "SGM") && (
                    <button onClick={() => setIsModalOpen(true)} className="k-btn-primary mt-2 flex items-center gap-2 text-sm">
                      <Plus size={16} /> New project
                    </button>
                  )}
                </div>
              ) : activeView !== 'grid' ? (
                <ProjectPortfolioViews
                  view={activeView}
                  projects={filteredProjects}
                  onOpenProject={(projectId) => navigate(`/projects/${projectId}`)}
                  getProjectLeadName={getProjectLeadName}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProjects.map((proj, index) => {
                    const isActive = (proj.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
                    const pStyle = getPriorityDetails(proj.priority);
                    return (
                      <motion.div
                        key={proj.id}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                        className="k-card group p-6 flex flex-col justify-between h-full transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl bg-[var(--k-white)] relative overflow-hidden"
                        style={{
                          border: pStyle.borderStyle,
                          boxShadow: pStyle.glowShadow
                        }}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isActive ? 'bg-[var(--k-blue-tint)] text-[var(--k-blue)]' : 'bg-[var(--k-band-grey)] text-[var(--k-grey-700)]'}`}>
                                  {proj.status || "ACTIVE"}
                                </span>
                                <PriorityBadge priority={proj.priority} size="sm" />
                              </div>
                              <h3 className="text-lg font-bold leading-snug mt-3 group-hover:text-[var(--k-blue)] transition-colors" style={{ color: 'var(--k-ink)' }}>{proj.name}</h3>
                            </div>
                            {['ADMIN', 'KAYAARA', 'MLS', 'SGM'].includes(role) && (
                              <div className="flex gap-1 -mr-1">
                                {canToggleProjectStatus && (
                                  <div className="relative">
                                    <button
                                      onClick={() => setOpenMenuId(openMenuId === proj.id ? null : proj.id)}
                                      onBlur={() => setTimeout(() => setOpenMenuId(null), 200)}
                                      className="k-btn-icon hover:bg-[var(--k-band-grey)]"
                                      aria-label="Project status menu"
                                    >
                                      <MoreHorizontal size={16} />
                                    </button>
                                    {openMenuId === proj.id && (
                                      <div
                                        className="absolute right-0 top-full mt-2 w-36 rounded-2xl overflow-hidden z-50 p-1"
                                        style={{ background: 'var(--k-white)', border: '1px solid var(--k-grey-200)', boxShadow: 'var(--k-shadow-modal)' }}
                                      >
                                        <button
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => {
                                            setOpenMenuId(null);
                                            handleProjectStatusToggle(proj);
                                          }}
                                          className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl hover:bg-[var(--k-band-grey)]"
                                          style={{ color: 'var(--k-blue)' }}
                                        >
                                          {(proj.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Hold' : 'Active'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <button onClick={() => handleEdit(proj)} className="k-btn-icon hover:bg-[var(--k-band-grey)]"><Edit size={16} /></button>
                                <button onClick={() => handleDelete(proj.id)} className="k-btn-icon hover:bg-red-50 text-red-600"><Trash2 size={16} /></button>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 mb-6 bg-[var(--k-band-grey)]/40 p-3.5 rounded-xl border border-[var(--k-grey-200)]/60">
                            <div className="flex justify-between text-xs pb-2" style={{ borderBottom: '1px solid var(--k-grey-200)' }}>
                              <span className="font-semibold uppercase tracking-wide text-[var(--k-grey-500)]">Lead</span>
                              <span className="font-bold text-right ml-2 text-[var(--k-ink)]">{getProjectLeadName(proj)}</span>
                            </div>

                            <div className="flex justify-between text-xs pb-2" style={{ borderBottom: '1px solid var(--k-grey-200)' }}>
                              <span className="font-semibold uppercase tracking-wide text-[var(--k-grey-500)]">Project team</span>
                              <span className="font-bold flex items-center gap-1 text-[var(--k-ink)]">
                                <Users size={12} className="text-[var(--k-blue)]" />
                                {proj.team_members_details?.length || 0} Int / {proj.external_team_details?.length || 0} Ext
                              </span>
                            </div>

                            <div className="pt-1">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="k-eyebrow !text-[10px]">Completion</span>
                                <span className="text-[11px] font-black tabular-nums text-[var(--k-blue)]">{proj.overall_progress || 0}%</span>
                              </div>
                              <div className="k-bar-track !h-2">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${proj.overall_progress || 0}%` }}
                                  transition={{ delay: 0.2 + index * 0.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                  className="h-full rounded-full bg-[var(--k-blue)] shadow-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/projects/${proj.id}`)}
                          className="k-btn-primary w-full min-h-[44px] flex items-center justify-center gap-2 text-sm shadow-md group-hover:shadow-lg transition-all"
                        >
                          Launch interface <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Band>
          </Bands>
        </main>

        {/* Hierarchy Modal */}
        <AnimatePresence>
          {isHierarchyModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="k-backdrop"
              onClick={() => setIsHierarchyModalOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="k-modal max-w-2xl p-5 md:p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold" style={{ color: 'var(--k-ink)' }}>Client workforce hierarchy</h3>
                  <button type="button" onClick={() => setIsHierarchyModalOpen(false)} className="k-btn-icon" aria-label="Close"><X size={18} /></button>
                </div>

                <div className="mb-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--k-grey-500)' }}>
                  HH (Handholding), SC (Senior Consultant)
                </div>

                <div className="max-h-[50vh] overflow-auto k-scroll rounded-xl" style={{ border: '1px solid var(--k-grey-200)' }}>
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Role Assignment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hierarchyMembers.map((member) => (
                        <tr key={member.key}>
                          <td>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold" style={{ color: 'var(--k-ink)' }}>{member.full_name || member.username}</span>
                              <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--k-grey-500)' }}>{member.roleType}</span>
                            </div>
                          </td>
                          <td>
                            <select
                              value={member.roleType === 'SGM' ? 'SGM' : (hierarchyAssignments[member.key] || 'HH')}
                              onChange={(e) => setHierarchyAssignments(prev => ({ ...prev, [member.key]: e.target.value }))}
                              disabled={member.roleType === 'SGM'}
                              className="k-select !w-auto max-w-[220px] text-xs"
                            >
                              {member.roleType === 'SGM' ? (
                                <option value="SGM">SGM</option>
                              ) : (
                                hierarchyRoleOptions.map(roleOption => (
                                  <option key={roleOption} value={roleOption}>{roleOption}</option>
                                ))
                              )}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-6">
                  <button type="button" disabled={isSavingHierarchy} onClick={handleSaveHierarchy} className="k-btn-primary text-sm">
                    {isSavingHierarchy ? 'Saving Designations...' : 'Update Hierarchy'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Template Picker Modal */}
        <TemplatePickerModal
          isOpen={isTemplatePickerOpen}
          onClose={() => setIsTemplatePickerOpen(false)}
          onSelectTemplate={handleTemplateSelected}
          clientId={clientId}
        />
      </div>
    </div>
  );
}
