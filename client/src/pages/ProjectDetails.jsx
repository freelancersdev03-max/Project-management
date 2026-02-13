import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Users, Briefcase,
  X, Clock, Target, CheckCircle2, Loader2,
  UserPlus, Lock, Activity, Star
} from 'lucide-react';
import Navbar from '../components/Navbar';
import BigTask from './BigTask'
import api from '../api';

/* ───────────────────────── ASSIGN TEAM MODAL ───────────────────────── */
const AssignTeamModal = ({ isOpen, onClose, projectId, clientId, onAssigned, initialSelected = [] }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelectedEmployees(initialSelected);
  }, [initialSelected, isOpen]);

  useEffect(() => {
    if (isOpen && clientId) {
      const fetchEmployees = async () => {
        try {
          const token = localStorage.getItem('access_token');
          // Fetch Client's Internal Team
          const res = await api.get(`clients/${clientId}/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setEmployees(res.data.internal_team_details || []);
        } catch (error) {
          console.error("Failed to load employees", error);
        }
      };
      fetchEmployees();
    }
  }, [isOpen, clientId]);

  const toggleEmployee = (id) => {
    setSelectedEmployees(prev =>
      prev.includes(id) ? prev.filter(empId => empId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      // Use standard PATCH endpoint which uses ProjectSerializer
      // ProjectSerializer expects 'assigned_employees' as list of IDs
      await api.patch(`projects/${projectId}/`, {
        assigned_employees: selectedEmployees
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onAssigned();
      onClose();
    } catch (error) {
      console.error("Assignment failed", error);
      alert("Failed to assign team: " + (error.response?.data?.assigned_employees || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[2rem] p-8 shadow-2xl overflow-hidden border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Assign Workforce</h3>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mt-1">Deploy Internal Resources</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"><X size={20} /></button>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {employees.map(emp => (
            <div
              key={emp.id}
              onClick={() => toggleEmployee(emp.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${selectedEmployees.includes(emp.id)
                ? 'border-[#F58A4B] bg-orange-50/50'
                : 'border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-colors ${selectedEmployees.includes(emp.id) ? 'bg-[#F58A4B] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>
                  {emp.username?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{emp.username}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{emp.email}</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedEmployees.includes(emp.id) ? 'border-[#F58A4B] bg-[#F58A4B]' : 'border-slate-200 bg-white'}`}>
                {selectedEmployees.includes(emp.id) && <CheckCircle2 size={12} className="text-white" />}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#F58A4B] transition-all disabled:opacity-50 shadow-lg shadow-slate-900/10"
        >
          {loading ? 'Processing Assignment...' : `Confirm Assignment (${selectedEmployees.length})`}
        </button>
      </div>
    </div>
  );
};

/* ───────────────────────── MAIN COMPONENT ───────────────────────── */
export default function ProjectDetails() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [calculatedProgress, setCalculatedProgress] = useState(null);

  const fetchData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const role = (localStorage.getItem('role') || '').toUpperCase();
      setUserRole(role);
      const headers = { Authorization: `Bearer ${token}` };

      let endpoint = `projects/${projectId}/`;
      if (role === 'SGM') endpoint = `sgm/projects/${projectId}/`;
      if (role === 'EMPLOYEE') endpoint = `employees/projects/${projectId}/`;

      const projRes = await api.get(endpoint, { headers });
      let projData = projRes.data;

      const needsTarget = !projData.target && !projData.description;
      const needsInternalTeam = !Array.isArray(projData.team_members_details) || projData.team_members_details.length === 0;

      if (needsTarget || needsInternalTeam) {
        try {
          const fallbackRes = await api.get(`projects/${projectId}/`, { headers });
          const fallbackData = fallbackRes.data;

          projData = {
            ...fallbackData,
            ...projData,
            target: projData.target || fallbackData.target,
            description: projData.description || fallbackData.description,
            team_members_details: needsInternalTeam
              ? (fallbackData.team_members_details || [])
              : projData.team_members_details,
            external_team_details: (projData.external_team_details && projData.external_team_details.length > 0)
              ? projData.external_team_details
              : (fallbackData.external_team_details || [])
          };
        } catch (fallbackError) {
          console.warn("Fallback project fetch failed", fallbackError.response || fallbackError);
        }
      }

      setProject(projData);
      setTeamMembers(projData.external_team_details || projData.external_team || []);
    } catch (error) {
      console.error("Fetch error:", error.response || error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [projectId]);

  // Persist Progress
  // Persist Progress
  useEffect(() => {
    // Wait for initial calculation and project load
    if (calculatedProgress === null || !project) return;

    // Loose equality check to handle string/number differences (e.g. "50" vs 50)
    if (calculatedProgress == project.overall_progress) return;

    const updateProgress = async () => {
      try {
        const token = localStorage.getItem('access_token');
        let endpoint = `projects/${projectId}/`;
        if (userRole === 'SGM') endpoint = `sgm/projects/${projectId}/`;

        console.log(`Persisting Progress: ${calculatedProgress}% for Project ${projectId}`);

        await api.patch(endpoint,
          { overall_progress: calculatedProgress },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Optimistically update local project state to avoid loops
        setProject(prev => ({ ...prev, overall_progress: calculatedProgress }));
      } catch (error) {
        console.error("Failed to save progress", error);
      }
    };

    const debounce = setTimeout(updateProgress, 500);
    return () => clearTimeout(debounce);
  }, [calculatedProgress, projectId, project, userRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#F58A4B]" size={40} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Synchronizing Data...</p>
        </div>
      </div>
    );
  }

  if (!project) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase text-slate-400 tracking-widest">Instance Not Found</div>;

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans pb-20 selection:bg-[#F58A4B] selection:text-white">
      <Navbar hideLogin={true} />

      {/* 1. PROJECT HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 mx-20 rounded-[2rem] mt-2">
        <div className="max-w-[1400px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Back & Client */}
            <div className="flex items-center gap-3 min-w-fit">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-[#F58A4B] transition-colors group"
              >
                <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back
              </button>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg">
                <Briefcase size={12} className="text-[#F58A4B]" />
                <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">{project.client?.company_name || project.client_name}</span>
              </div>
            </div>

            {/* Center: Project Name */}
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex-1 text-center">{project.name}</h1>

            {/* Right: Status & Progress */}
            <div className="flex items-center gap-3 min-w-fit">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg whitespace-nowrap">
                <Activity size={12} className="text-[#F58A4B]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-600">{(calculatedProgress ?? project.overall_progress) || 0}%</span>
                  <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#F58A4B] to-orange-400 rounded-full transition-all duration-500"
                      style={{ width: `${(calculatedProgress ?? project.overall_progress) || 0}%` }}
                    />
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${project.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                {project.status || 'ACTIVE'}
              </span>

            </div>
          </div>
        </div>
      </div>



      <div className="max-w-[1400px] mx-auto px-6 pt-2 space-y-10">

        {/* Merged Card: Team | Timeline | Target */}
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex divide-x divide-slate-200">
            {/* TEAM SECTION - Can expand more */}
            <div className="flex-[1.5] pr-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Users size={18} className="text-[#F58A4B]" /> Team
                </h3>
                {/* Manual Assignment Button - Restricted to Admin/HQEPL/Assigned SGM */}
                {(['ADMIN', 'HQEPL'].includes(userRole) || (userRole === 'SGM' && project.assigned_sgm === parseInt(localStorage.getItem('user_id')))) && (
                  <button onClick={() => setIsAssignModalOpen(true)} className="p-2 bg-slate-50 text-slate-900 rounded-lg hover:bg-slate-900 hover:text-white transition-colors" title="Manage Team">
                    <UserPlus size={16} />
                  </button>
                )}
              </div>
              <div className="space-y-4">
                {/* Internal Team */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Team</p>
                  <p className="text-sm text-slate-900 leading-relaxed">
                    {[
                      project.assigned_sgm_name ? `${project.assigned_sgm_name} (SGM)` : null,
                      ...(project.team_members_details || []).map(m => m.username)
                    ].filter(Boolean).join(', ') || <span className="text-slate-400 italic">No internal members</span>}
                  </p>
                </div>

                {/* External Team */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">External Team</p>
                  <p className="text-sm text-slate-900 leading-relaxed">
                    {[
                      project.external_lead_email ? `${project.external_lead_email} (Lead)` : null,
                      ...teamMembers.map(m => m.username)
                    ].filter(Boolean).join(', ') || <span className="text-slate-400 italic">No external members</span>}
                  </p>
                </div>
              </div>
            </div>
            {/* TIMELINE SECTION */}
            <div className="flex-1 px-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-1">
                <Clock size={18} className="text-[#F58A4B]" /> Timeline
              </h3>
              <div className="space-y-2">

                <p className="text-sm font-bold text-slate-900">
                  {project.start_date || 'TBD'} — {project.end_date || 'Ongoing'}
                </p>
              </div>
            </div>
            {/* TARGET SECTION */}
            <div className="flex-1 pl-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Target size={18} className="text-[#F58A4B]" /> Target
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                {project.target || project.description || "No distinct scope documentation has been initialised for this project."}
              </p>
            </div>
          </div>
        </div>
        <div className="pt-10 border-t border-slate-200">
          {/* <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Project Roadmap</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Detailed Execution Schedule</p>
          </div> */}

          {/* We render the component here */}
          <BigTask projectId={projectId} onProgressUpdate={setCalculatedProgress} />
        </div>

      </div>

      <AssignTeamModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        projectId={projectId}
        clientId={project.client}
        onAssigned={fetchData}
        initialSelected={project.team_members_details?.map(m => m.id) || []}
      />
    </div >
  );
}