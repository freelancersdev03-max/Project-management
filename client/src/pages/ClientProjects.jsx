import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, ChevronLeft, Filter, ArrowRight, User, Briefcase,
  Users, Activity, Trash2, Edit, LayoutGrid, MoreHorizontal, X, ShieldCheck
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import api from '../api';
import ProjectDetailModal from './ProjectDetailModal';

const CLIENT_PROJECTS_ENDPOINTS = {
  projects: 'projects/',
  employeeProjects: 'employees/my-projects/',
  externalProjects: 'employees/external-projects/',
  clientMembers: (id) => `clients/${encodeURIComponent(id)}/members/`,
  clientById: (id) => `clients/${encodeURIComponent(id)}/`,
  projectById: (id) => `projects/${encodeURIComponent(id)}/`,
};

/* NOTE: CreateTeamMemberModal and TeamListModal logic has been 
  migrated to the ExternalManagement page for a cleaner workflow.
*/

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

  const hierarchyRoleOptions = ['HH', 'SC'];

  const hasProjects = projects.length > 0;
  const canToggleProjectStatus = ['ADMIN', 'SGM'].includes(role);
  const canSetHierarchy = ['ADMIN', 'HQEPL', 'SGM'].includes(role);

  const fetchData = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      let endpoint = CLIENT_PROJECTS_ENDPOINTS.projects;
      if (role === "EMPLOYEE") endpoint = CLIENT_PROJECTS_ENDPOINTS.employeeProjects;
      if (role === "EXTERNAL") endpoint = CLIENT_PROJECTS_ENDPOINTS.externalProjects;

      const projRes = await api.get(endpoint, { headers });
      const clientProjects = projRes.data.filter(p => String(p.client?.id || p.client) === String(clientId));
      setProjects(clientProjects);

      // We still fetch team members to show the count in the header button
      if (['ADMIN', 'HQEPL', 'SGM'].includes(role)) {
        try {
          // Fetch External Members
          const teamRes = await api.get(CLIENT_PROJECTS_ENDPOINTS.clientMembers(clientId), { headers });
          setTeamMembers(teamRes.data);
        } catch (err) {
          setTeamMembers([]);
        }

        try {
          // Fetch Client Details (for Internal Team)
          const clientRes = await api.get(CLIENT_PROJECTS_ENDPOINTS.clientById(clientId), { headers });
          setClientData(clientRes.data);
          setInternalTeam(clientRes.data.internal_team_details || []);
          setClientSgms(clientRes.data.assigned_sgms_details || []);

          // Initialize hierarchy assignments from client data
          if (Array.isArray(clientRes.data.client_hierarchy)) {
            const savedMap = clientRes.data.client_hierarchy.reduce((acc, item) => {
              const key = String(item.member_key || item.member_id || '');
              if (key && item.hierarchy) acc[key] = item.hierarchy;
              return acc;
            }, {});
            setHierarchyAssignments(savedMap);
          }
        } catch (err) {
          console.error("Failed to fetch client details for internal team", err);
          setInternalTeam([]);
          setClientSgms([]);
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
      await api.delete(CLIENT_PROJECTS_ENDPOINTS.projectById(projectId));
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
      await api.patch(CLIENT_PROJECTS_ENDPOINTS.projectById(project.id), { status: nextStatus });
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
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = hierarchyMembers.map(member => ({
        member_key: member.key,
        member_id: member.id,
        name: member.full_name || member.username || member.email,
        hierarchy: member.roleType === 'SGM' ? 'SGM' : (hierarchyAssignments[member.key] || 'HH'),
      }));

      await api.patch(CLIENT_PROJECTS_ENDPOINTS.clientById(clientId), {
        client_hierarchy: payload
      }, { headers });

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
    <div className="h-screen w-screen bg-slate-50 antialiased flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto transition-all duration-300 pb-20">

        <ProjectDetailModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setProjectToEdit(null); }}
          onProjectCreated={fetchData}
          clientId={clientId}
          projectToEdit={projectToEdit}
        />

        {/* HEADER */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-6">
            <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-[#F58A4B] mb-4">
              <ChevronLeft size={14} /> Back to Directory
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Project <span className="text-[#F58A4B]">Dashboard</span></h1>
                <p className="text-slate-500 font-medium text-sm flex items-center gap-2"><Briefcase size={16} /> Workspace Overview & Management</p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => hasProjects && navigate(`/projects/${projects[0].id}/actionplan`)}
                  disabled={!hasProjects}
                  className={`px-5 py-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm ${hasProjects
                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  title={hasProjects ? 'Open Action Plan' : 'No projects available'}
                >
                  <LayoutGrid size={16} className="text-[#F58A4B]" /> Action Plan
                </button>

                {(role === "ADMIN" || role === "HQEPL" || role === "SGM") && (
                  <>
                    {/* Internal Team Members View */}
                    <button
                      onClick={() => navigate(`/clients/${clientId}/internal-team`)}
                      className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <User size={16} className="text-[#F58A4B]" /> Internal Team ({internalTeam.length})
                    </button>

                    {/* NEW: Navigates to dedicated management page */}
                    <button
                      onClick={() => navigate(`/clients/${clientId}/external-management`)}
                      className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Users size={16} className="text-[#F58A4B]" /> External Management ({teamMembers.length})
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-[#F58A4B] transition-all shadow-lg flex items-center gap-2">
                      <Plus size={16} /> New Project
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-10">
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative group max-w-lg w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Filter className="text-slate-400" size={18} />
                </div>
                <input type="text" placeholder="Search active projects..." className="block w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-orange-100 outline-none transition-all" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} />
              </div>

              {canSetHierarchy && (
                <button
                  type="button"
                  onClick={() => setIsHierarchyModalOpen(true)}
                  className="px-5 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                >
                  <ShieldCheck size={16} className="text-[#F58A4B]" /> Set Hierarchy
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-100 rounded-[2rem] animate-pulse" />)}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white/50">
                <LayoutGrid size={40} className="mx-auto text-slate-200 mb-4" />
                <h3 className="text-slate-900 font-bold text-lg mb-1">No Projects Found</h3>
                <p className="text-slate-500 text-sm">Workspace is currently empty.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(proj => (
                  <div key={proj.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 hover:shadow-2xl transition-all group flex flex-col h-full relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100 mb-3">{proj.status || "ACTIVE"}</span>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight group-hover:text-[#F58A4B] transition-colors">{proj.name}</h3>
                      </div>
                      {['ADMIN', 'HQEPL', 'SGM'].includes(role) && (
                        <div className="flex gap-1">
                          {canToggleProjectStatus && (
                            <div className="relative">
                              <button
                                onClick={() => setOpenMenuId(openMenuId === proj.id ? null : proj.id)}
                                onBlur={() => setTimeout(() => setOpenMenuId(null), 200)}
                                className="p-2 text-slate-300 hover:text-[#F58A4B] transition-colors"
                                aria-label="Project status menu"
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              {openMenuId === proj.id && (
                                <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[50] p-1">
                                  <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleProjectStatusToggle(proj);
                                    }}
                                    className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-yellow-50 flex items-center gap-2 text-yellow-700 rounded-xl"
                                  >
                                    {(proj.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Hold' : 'Active'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <button onClick={() => handleEdit(proj)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><Edit size={16} /></button>
                          <button onClick={() => handleDelete(proj.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 mb-8 flex-1">
                      <div className="flex justify-between text-xs border-b border-slate-50 pb-2">
                        <span className="text-slate-400 font-bold uppercase tracking-tighter">Lead</span>
                        <span className="text-slate-700 font-bold text-right ml-2">{getProjectLeadName(proj)}</span>
                      </div>

                      <div className="flex justify-between text-xs border-b border-slate-50 pb-2">
                        <span className="text-slate-400 font-bold uppercase tracking-tighter">Project Team</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 font-bold flex items-center gap-1">
                            <Users size={12} className="text-orange-400" />
                            {proj.team_members_details?.length || 0} Int / {proj.external_team_details?.length || 0} Ext
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completion</span>
                          <span className="text-[10px] font-black text-slate-900">{proj.overall_progress || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#F58A4B] to-orange-400" style={{ width: `${proj.overall_progress || 0}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">

                      <button onClick={() => navigate(`/projects/${proj.id}`)} className="w-full py-4 bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-[#F58A4B] transition-all group/btn">
                        Launch Interface <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {isHierarchyModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsHierarchyModalOpen(false)} />
            <div className="relative bg-white w-full max-w-2xl rounded-xl p-8 shadow-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Client Workforce Hierarchy</h3>
                <button type="button" onClick={() => setIsHierarchyModalOpen(false)} className="bg-slate-100 p-1.5 rounded-full text-slate-400"><X size={18} /></button>
              </div>

              <div className="mb-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                HH (Handholding), SC (Senior Consultant)
              </div>

              <div className="max-h-[50vh] overflow-auto border border-slate-200 rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                      <th className="p-3 text-left">Member</th>
                      <th className="p-3 text-left">Role Assignment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {hierarchyMembers.map((member) => (
                      <tr key={member.key} className="bg-white">
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700">{member.full_name || member.username}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{member.roleType}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={member.roleType === 'SGM' ? 'SGM' : (hierarchyAssignments[member.key] || 'HH')}
                            onChange={(e) => setHierarchyAssignments(prev => ({ ...prev, [member.key]: e.target.value }))}
                            disabled={member.roleType === 'SGM'}
                            className="w-full max-w-[220px] bg-white border border-slate-300 px-3 py-2 rounded text-xs font-bold text-slate-700 focus:outline-none"
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
                <button type="button" disabled={isSavingHierarchy} onClick={handleSaveHierarchy} className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors">
                  {isSavingHierarchy ? 'Saving Designations...' : 'Update Hierarchy'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}