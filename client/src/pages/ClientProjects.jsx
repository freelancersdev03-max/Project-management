import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, ChevronLeft, Filter, ArrowRight, Briefcase,
  Users, LayoutGrid, MoreHorizontal, X, ShieldCheck, Edit, Trash2, Layout
} from 'lucide-react';
import { SkeletonCard } from '../components/SkeletonLoader';
import Sidebar from '../components/Sidebar';
import api from '../api';
import ProjectDetailModal from './ProjectDetailModal';

export default function ClientProjects() {
  const role = (localStorage.getItem("role") || "").toUpperCase();
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [filterQuery, setFilterQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]); 
  const [internalTeam, setInternalTeam] = useState([]); 
  const [clientSgms, setClientSgms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [isHierarchyModalOpen, setIsHierarchyModalOpen] = useState(false);
  const [hierarchyAssignments, setHierarchyAssignments] = useState({});
  const [isSavingHierarchy, setIsSavingHierarchy] = useState(false);
  const [clientData, setClientData] = useState(null);

  const hierarchyRoleOptions = ['HH', 'SC', 'HQEPL'];

  const canToggleProjectStatus = ['ADMIN', 'SGM'].includes(role);
  const canSetHierarchy = ['ADMIN', 'HQEPL', 'MLS', 'SGM'].includes(role);

  const fetchData = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      let endpoint = "projects/";
      if (role === "EMPLOYEE") endpoint = "employees/my-projects/";

      const projRes = await api.get(endpoint);
      const clientProjects = projRes.data.filter(p => String(p.client?.id || p.client) === String(clientId));
      setProjects(clientProjects);

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
      }

      if (['ADMIN', 'HQEPL', 'MLS', 'SGM'].includes(role)) {
        try {
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
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`projects/${projectId}/`);
      fetchData();
    } catch (error) {
      console.error("Delete failed:", error);
      alert(error.response?.data?.detail || "Failed to delete project.");
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
      alert(error.response?.data?.detail || "Failed to update project status.");
    }
  };

  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(filterQuery.toLowerCase()));

  const hierarchyMembers = React.useMemo(() => {
    const members = [];
    clientSgms.forEach(sgm => members.push({ ...sgm, roleType: 'SGM', key: String(sgm.id) }));
    Array.isArray(clientData?.assigned_hqepls_details) && clientData.assigned_hqepls_details.forEach(m => members.push({ ...m, roleType: 'HQEPL', key: String(m.id) }));
    internalTeam.forEach(m => members.push({ ...m, roleType: 'INTERNAL', key: String(m.id) }));
    return Array.from(new Map(members.map(m => [m.key, m])).values());
  }, [clientSgms, internalTeam, clientData]);

  const handleSaveHierarchy = async () => {
    try {
      setIsSavingHierarchy(true);
      const payload = hierarchyMembers.map(member => ({
        member_key: member.key,
        member_id: member.id,
        name: member.full_name || member.username || member.email,
        hierarchy: member.roleType === 'SGM' ? 'SGM' : (member.roleType === 'HQEPL' ? 'HQEPL' : (hierarchyAssignments[member.key] || 'HH')),
      }));

      await api.patch(`clients/${clientId}/`, { client_hierarchy: payload });
      setClientData(prev => ({ ...prev, client_hierarchy: payload }));
      setIsHierarchyModalOpen(false);
    } catch (error) {
      console.error("Failed to save hierarchy", error);
      alert(error.response?.data?.detail || "Failed to save hierarchy.");
    } finally {
      setIsSavingHierarchy(false);
    }
  };

  const getProjectLeadName = (proj) => {
    if (proj?.assigned_sgm_details) return proj.assigned_sgm_details.full_name || proj.assigned_sgm_details.username;
    if (proj?.assigned_sgm_name) return proj.assigned_sgm_name;
    const arrayLead = Array.isArray(proj?.assigned_sgms_details) ? proj.assigned_sgms_details[0] : null;
    if (arrayLead) return arrayLead.full_name || arrayLead.username;
    const matchedSgm = clientSgms.find(sgm => String(sgm.id) === String(proj?.assigned_sgm));
    if (matchedSgm) return matchedSgm.full_name || matchedSgm.username;
    return "Unassigned";
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <ProjectDetailModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setProjectToEdit(null); }}
          onProjectCreated={fetchData}
          clientId={clientId}
          projectToEdit={projectToEdit}
        />

        {/* Top Navigation */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/clients')} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Project Dashboard</h1>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                <span>{clientData?.company_name || 'Organization'}</span>
                <ArrowRight size={14} className="text-slate-400" />
                <span className="text-slate-900 font-medium">All Projects</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {['ADMIN', 'HQEPL', 'MLS', 'SGM'].includes(role) && (
              <>
                {canSetHierarchy && (
                  <button
                    onClick={() => setIsHierarchyModalOpen(true)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-2 hidden md:flex"
                  >
                    <ShieldCheck size={16} className="text-emerald-500" /> Hierarchy
                  </button>
                )}

                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Plus size={16} /> New Project
                </button>
              </>
            )}
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
          
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Filter projects by name..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => <SkeletonCard key={idx} />)}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <LayoutGrid size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No Projects Found</h3>
              <p className="text-slate-500 mt-1 text-sm">Create a new project to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map(proj => {
                const isActive = (proj.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
                const progress = proj.overall_progress || 0;
                
                return (
                  <div key={proj.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col relative group">
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold mb-2 ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {isActive ? 'Active' : 'On Hold'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                          {proj.name}
                        </h3>
                      </div>

                      {['ADMIN', 'HQEPL', 'MLS', 'SGM'].includes(role) && (
                        <div className="flex gap-1 -mt-1 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canToggleProjectStatus && (
                            <div className="relative">
                              <button onClick={() => setOpenMenuId(openMenuId === proj.id ? null : proj.id)} onBlur={() => setTimeout(() => setOpenMenuId(null), 200)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors"><MoreHorizontal size={16}/></button>
                              {openMenuId === proj.id && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 z-50 overflow-hidden">
                                  <button onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpenMenuId(null); handleProjectStatusToggle(proj); }} className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50">
                                    {isActive ? 'Mark Hold' : 'Mark Active'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          <button onClick={() => handleEdit(proj)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit size={16}/></button>
                          <button onClick={() => handleDelete(proj.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"><Trash2 size={16}/></button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-6 flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Lead</span>
                        <span className="font-medium text-slate-800">{getProjectLeadName(proj)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Team Size</span>
                        <span className="font-medium text-slate-800 flex items-center gap-1">
                          <Users size={14} className="text-blue-500"/>
                          {proj.team_members_details?.length || 0} Int / {proj.external_team_details?.length || 0} Ext
                        </span>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">Completion</span>
                          <span className="font-bold text-slate-900">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/projects/${proj.id}`)}
                      className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-200"
                    >
                      View Project <ArrowRight size={14} className="text-slate-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hierarchy Modal */}
        {isHierarchyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-2xl w-full">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-800">Workforce Hierarchy</h3>
                <button onClick={() => setIsHierarchyModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
              </div>
              <div className="p-6">
                <div className="max-h-[60vh] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Member Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Assignment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hierarchyMembers.map((member) => (
                        <tr key={member.key}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm text-slate-800">{member.full_name || member.username}</div>
                            <div className="text-xs text-slate-500">{member.roleType}</div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={member.roleType === 'SGM' ? 'SGM' : (hierarchyAssignments[member.key] || 'HH')}
                              onChange={(e) => setHierarchyAssignments(prev => ({ ...prev, [member.key]: e.target.value }))}
                              disabled={member.roleType === 'SGM'}
                              className="w-full max-w-[200px] border-slate-200 rounded-md text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                            >
                              {member.roleType === 'SGM' ? (
                                <option value="SGM">SGM</option>
                              ) : (
                                hierarchyRoleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)
                              )}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={handleSaveHierarchy}
                  disabled={isSavingHierarchy}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isSavingHierarchy ? 'Saving...' : 'Save Hierarchy'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}