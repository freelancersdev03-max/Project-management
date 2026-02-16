import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus, ChevronLeft, Filter, ArrowRight, User, Briefcase,
  Users, Activity, Trash2, Edit, LayoutGrid
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api';
import ProjectDetailModal from './ProjectDetailModal';

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
  const [loading, setLoading] = useState(true);

  const hasProjects = projects.length > 0;

  const fetchData = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      let endpoint = "projects/";
      if (role === "EMPLOYEE" || role === "EXTERNAL") endpoint = "employees/my-projects/";

      const projRes = await api.get(endpoint, { headers });
      const clientProjects = projRes.data.filter(p => String(p.client?.id || p.client) === String(clientId));
      setProjects(clientProjects);

      // We still fetch team members to show the count in the header button
      if (['ADMIN', 'HQEPL', 'SGM'].includes(role)) {
        try {
          const teamRes = await api.get(`clients/${clientId}/members/`, { headers });
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

  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(filterQuery.toLowerCase()));

  return (
    <div className="bg-slate-50 min-h-screen antialiased pb-20">
      <Navbar hideLogin />

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

            <div className="flex items-center gap-3">
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
                  {/* NEW: Navigates to dedicated management page */}
                  <button
                    onClick={() => navigate(`/clients/${clientId}/external-management`)}
                    className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Users size={16} className="text-[#F58A4B]" /> Team Management ({teamMembers.length})
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
          <div className="relative group max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Filter className="text-slate-400" size={18} />
            </div>
            <input type="text" placeholder="Search active projects..." className="block w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold shadow-sm focus:ring-2 focus:ring-orange-100 outline-none transition-all" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} />
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
                        <button onClick={() => handleEdit(proj)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><Edit size={16} /></button>
                        <button onClick={() => handleDelete(proj.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 mb-8 flex-1">
                    <div className="flex justify-between text-xs border-b border-slate-50 pb-2">
                      <span className="text-slate-400 font-bold uppercase tracking-tighter">Lead</span>
                      <span className="text-slate-700 font-bold"> {proj.assigned_sgm_details?.username || proj.assigned_sgm_details?.email || "Unassigned"}</span>
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
    </div>
  );
}