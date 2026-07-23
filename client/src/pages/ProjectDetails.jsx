import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users, Briefcase,
  X, Clock, Target, CheckCircle2,
  UserPlus, Activity, FileStack
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import BigTask from './BigTask'
import Milestones from '../components/Milestones';
import api from '../api';
import { PageHeader } from '../components/kayaara/Band';
import SaveTemplateModal from '../components/SaveTemplateModal';

import { formatDateDDMMYYYY } from '../utils/dateFormat';
/* ───────────────────────── ASSIGN TEAM MODAL ───────────────────────── */
const AssignTeamModal = ({ isOpen, onClose, projectId, clientId, onAssigned, initialSelected = [] }) => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const normalizedSelection = Array.isArray(initialSelected)
      ? initialSelected
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
      : [];
    setSelectedEmployees(normalizedSelection);
  }, [initialSelected, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const fetchEmployees = async () => {
        try {
          const role = (localStorage.getItem('role') || '').toUpperCase();

          if (role === 'SGM') {
            const query = new URLSearchParams();
            if (clientId) query.set('client_id', String(clientId));
            if (projectId) query.set('project_id', String(projectId));
            const suffix = query.toString() ? `?${query.toString()}` : '';
            const res = await api.get(`sgm/employees/${suffix}`);
            setEmployees(Array.isArray(res.data) ? res.data : []);
            return;
          }

          if (clientId) {
            const res = await api.get(`clients/${clientId}/`);
            setEmployees(res.data.internal_team_details || []);
            return;
          }

          setEmployees([]);
        } catch (error) {
          console.error("Failed to load employees", error);
          setEmployees([]);
        }
      };
      fetchEmployees();
    }
  }, [isOpen, clientId]);

  const toggleEmployee = (id) => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return;

    setSelectedEmployees(prev =>
      prev.includes(numericId)
        ? prev.filter(empId => empId !== numericId)
        : [...prev, numericId]
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      // Use standard PATCH endpoint which uses ProjectSerializer
      // ProjectSerializer expects 'assigned_employees' as list of IDs
      await api.patch(`projects/${projectId}/`, {
        assigned_employees: selectedEmployees
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
    <div className="k-backdrop" onClick={onClose} style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="k-modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 md:p-8 overflow-y-auto k-scroll">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="k-eyebrow mb-1">Deploy internal resources</p>
              <h3 className="text-xl font-bold" style={{ color: 'var(--k-ink)' }}>Assign workforce</h3>
            </div>
            <button onClick={onClose} className="k-btn-icon" aria-label="Close"><X size={20} /></button>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 k-scroll">
            {employees.map((emp) => {
              const employeeId = Number(emp?.id);
              if (!Number.isInteger(employeeId) || employeeId <= 0) return null;

              const isSelected = selectedEmployees.includes(employeeId);
              return (
                <div
                  key={employeeId}
                  onClick={() => toggleEmployee(employeeId)}
                  className="p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between"
                  style={isSelected
                    ? { border: '1px solid var(--k-blue)', background: 'var(--k-blue-tint)' }
                    : { border: '1px solid var(--k-grey-200)', background: 'var(--k-white)' }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs"
                      style={isSelected
                        ? { background: 'var(--k-blue)', color: 'var(--k-white)' }
                        : { background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                    >
                      {emp.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--k-ink)' }}>{emp.username}</p>
                      <p className="text-[11px]" style={{ color: 'var(--k-grey-500)' }}>{emp.email}</p>
                    </div>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                    style={isSelected
                      ? { border: '2px solid var(--k-blue)', background: 'var(--k-blue)' }
                      : { border: '2px solid var(--k-grey-200)', background: 'var(--k-white)' }}
                  >
                    {isSelected && <CheckCircle2 size={12} style={{ color: 'var(--k-white)' }} />}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="k-btn-primary w-full mt-8 min-h-[44px] text-sm"
          >
            {loading ? 'Processing Assignment...' : `Confirm Assignment (${selectedEmployees.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── MAIN COMPONENT ───────────────────────── */
export default function ProjectDetails() {
  const { projectId } = useParams();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [calculatedProgress, setCalculatedProgress] = useState(null);

  const fetchData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const role = (localStorage.getItem('role') || '').toUpperCase();
      setUserRole(role);

      let endpoint = `projects/${projectId}/`;
      if (role === 'SGM') endpoint = `sgm/projects/${projectId}/`;
      if (role === 'EMPLOYEE') endpoint = `employees/projects/${projectId}/`;

      const projRes = await api.get(endpoint);
      let projData = projRes.data;

      const needsTarget = !projData.target && !projData.description;
      const needsInternalTeam = !Array.isArray(projData.team_members_details) || projData.team_members_details.length === 0;
      const needsSgm = !projData.assigned_sgm_details && !projData.assigned_sgm_name && (!Array.isArray(projData.assigned_sgms_details) || projData.assigned_sgms_details.length === 0);

      if (needsTarget || needsInternalTeam || needsSgm) {
        try {
          const fallbackRes = await api.get(`projects/${projectId}/`);
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
              : (fallbackData.external_team_details || []),
            assigned_sgm_details: projData.assigned_sgm_details || fallbackData.assigned_sgm_details || fallbackData.assigned_sgms_details?.[0] || null,
            assigned_sgm_name: projData.assigned_sgm_name || fallbackData.assigned_sgm_name || fallbackData.assigned_sgm_details?.full_name || fallbackData.assigned_sgms_details?.[0]?.full_name || null,
            assigned_sgm: projData.assigned_sgm || fallbackData.assigned_sgm || fallbackData.assigned_sgm_details?.id || fallbackData.assigned_sgms_details?.[0]?.id || null,
            assigned_sgms_details: projData.assigned_sgms_details || fallbackData.assigned_sgms_details || []
          };
        } catch (fallbackError) {
          console.warn("Fallback project fetch failed", fallbackError.response || fallbackError);
        }
      }

      const resolvedClientId = projData?.client?.id ?? projData?.client;
      if (resolvedClientId) {
        try {
          const clientRes = await api.get(`clients/${resolvedClientId}/`);
          projData = {
            ...projData,
            client_hierarchy: Array.isArray(clientRes.data?.client_hierarchy)
              ? clientRes.data.client_hierarchy
              : [],
          };
        } catch (clientError) {
          console.warn("Failed to fetch client hierarchy", clientError.response || clientError);
          if (!Array.isArray(projData?.client_hierarchy)) {
            projData = { ...projData, client_hierarchy: [] };
          }
        }
      } else if (!Array.isArray(projData?.client_hierarchy)) {
        projData = { ...projData, client_hierarchy: [] };
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

  const hierarchyByMember = useMemo(() => {
    const hierarchyRank = { HH: 1, SC: 2, SGM: 3 };

    const extractHierarchyMap = (hierarchyItems) => {
      const hierarchyMap = {};
      if (!Array.isArray(hierarchyItems)) return hierarchyMap;

      hierarchyItems.forEach((item) => {
        const rawHierarchy = String(item?.hierarchy || '').toUpperCase();
        if (!hierarchyRank[rawHierarchy]) return;

        const keys = [];
        if (item.member_id !== null && item.member_id !== undefined) {
          keys.push(`id:${String(item.member_id)}`);
        }
        if (item.member_key !== null && item.member_key !== undefined) {
          keys.push(`key:${String(item.member_key)}`);
        }

        keys.forEach((key) => {
          const existingHierarchy = hierarchyMap[key];
          if (!existingHierarchy || hierarchyRank[rawHierarchy] >= hierarchyRank[existingHierarchy]) {
            hierarchyMap[key] = rawHierarchy;
          }
        });
      });

      return hierarchyMap;
    };

    const clientHierarchyMap = extractHierarchyMap(project?.client_hierarchy);
    const projectHierarchyMap = extractHierarchyMap(project?.project_hierarchy);

    Object.entries(projectHierarchyMap).forEach(([key, hierarchy]) => {
      if (!clientHierarchyMap[key]) {
        clientHierarchyMap[key] = hierarchy;
      }
    });

    return clientHierarchyMap;
  }, [project]);

  const formatInternalMemberWithHierarchy = (member) => {
    const name = member?.full_name || member?.username || member?.name || member?.email || 'Unnamed';
    const hierarchy = hierarchyByMember[`id:${String(member?.id)}`] || hierarchyByMember[`key:${String(member?.id)}`];
    return hierarchy ? `${name} (${hierarchy})` : name;
  };

  // Persist Progress
  // Persist Progress
  useEffect(() => {
    // Wait for initial calculation and project load
    if (calculatedProgress === null || !project) return;

    // Loose equality check to handle string/number differences (e.g. "50" vs 50)
    if (calculatedProgress == project.overall_progress) return;

    const updateProgress = async () => {
      try {
        let endpoint = `projects/${projectId}/`;
        if (userRole === 'SGM') endpoint = `sgm/projects/${projectId}/`;

        console.log(`Persisting Progress: ${calculatedProgress}% for Project ${projectId}`);

        await api.patch(endpoint, { overall_progress: calculatedProgress });

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
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto k-band-grey k-band-pad">
          <div className="k-skeleton h-[64px] mb-4" />
          <div className="k-skeleton h-[180px] mb-4" />
          <div className="k-skeleton h-[300px]" />
        </main>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-3">
          <img src="/kayaara-mark.png" alt="Kayaara" className="w-14 h-14 opacity-40 k-float" />
          <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-500)' }}>Instance not found</p>
        </main>
      </div>
    );
  }

  const isActive = project.status === 'ACTIVE';
  const progressValue = (calculatedProgress ?? project.overall_progress) || 0;

  const budgetUnitLabels = { THOUSAND: 'Thousand', LAKH: 'Lakh', CRORE: 'Crore' };
  const budgetUnitLabel = budgetUnitLabels[project.budget_unit] || 'Lakh';

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title={project.name}
          subtitle={project.client?.company_name || project.client_name}
          actions={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--k-band-grey)' }}>
                <Activity size={13} style={{ color: 'var(--k-blue)' }} />
                <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--k-grey-700)' }}>{progressValue}%</span>
                <div className="w-16 k-bar-track">
                  <div className="h-full rounded-full" style={{ width: `${progressValue}%`, background: 'var(--k-blue)' }} />
                </div>
              </div>
              <span className={isActive ? 'k-pill' : 'k-pill-grey'}>{project.status || 'ACTIVE'}</span>

              {/* Save as Template - only for project creators/leads */}
              {(['ADMIN', 'KAYAARA', 'MLS', 'SGM'].includes(userRole)) && (
                <button
                  onClick={() => setIsSaveTemplateOpen(true)}
                  className="k-btn-ghost flex items-center gap-2 text-sm"
                  title="Save project as template"
                >
                  <FileStack size={15} style={{ color: 'var(--k-blue)' }} /> Save as template
                </button>
              )}
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto k-scroll">
          {/* Merged Card: Team | Timeline | Target */}
          <motion.section
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="k-band-grey k-band-pad"
          >
            <div className="k-card p-5 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 md:gap-0 md:divide-x" style={{ borderColor: 'var(--k-grey-200)' }}>
                {/* TEAM SECTION */}
                <div className="flex-[1.5] md:pr-8">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="k-section-title">
                      <Users size={16} style={{ color: 'var(--k-blue)' }} /> Team
                    </h3>
                    {(['ADMIN', 'KAYAARA', 'MLS'].includes(userRole) || (userRole === 'SGM' && project.assigned_sgm === parseInt(localStorage.getItem('user_id')))) && (
                      <button onClick={() => setIsAssignModalOpen(true)} className="k-btn-icon" title="Manage Team">
                        <UserPlus size={16} />
                      </button>
                    )}
                  </div>
                  <div className="space-y-4">
                    {/* Internal Team */}
                    <div className="space-y-1.5">
                      <p className="k-eyebrow">KAYAARA's team</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--k-ink)' }}>
                        {[
                          project.assigned_sgm_name ? `${project.assigned_sgm_name} (SGM)` : null,
                          ...(project.team_members_details || []).map(formatInternalMemberWithHierarchy)
                        ].filter(Boolean).join(', ') || <span className="italic" style={{ color: 'var(--k-grey-500)' }}>No internal members</span>}
                      </p>
                    </div>

                    {/* External Team */}
                    <div className="space-y-1.5">
                      <p className="k-eyebrow">Client's team</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--k-ink)' }}>
                        {[
                          project.external_lead_email ? `${project.external_lead_email} (Lead)` : null,
                          ...teamMembers.map(m => m.username)
                        ].filter(Boolean).join(', ') || <span className="italic" style={{ color: 'var(--k-grey-500)' }}>No external members</span>}
                      </p>
                    </div>
                  </div>
                </div>
                {/* TIMELINE SECTION */}
                <div className="flex-1 md:px-8 pt-4 md:pt-0" style={{ borderTop: '1px solid var(--k-grey-200)' }}>
                  <h3 className="k-section-title mb-5">
                    <Clock size={16} style={{ color: 'var(--k-blue)' }} /> Timeline
                  </h3>
                  <p className="text-sm font-semibold" style={{ color: 'var(--k-ink)' }}>
                    {project.start_date ? formatDateDDMMYYYY(project.start_date) : 'TBD'} — {project.end_date ? formatDateDDMMYYYY(project.end_date) : 'Ongoing'}
                  </p>
                  {project.total_budget && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
                      <p className="k-eyebrow mb-1">Total Budget Left</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--k-blue)' }}>
                        ₹{Number(project.total_budget).toLocaleString('en-IN')} {budgetUnitLabel}
                      </p>
                    </div>
                  )}
                </div>
                {/* TARGET SECTION */}
                <div className="flex-1 md:pl-8 pt-4 md:pt-0" style={{ borderTop: '1px solid var(--k-grey-200)' }}>
                  <h3 className="k-section-title mb-5">
                    <Target size={16} style={{ color: 'var(--k-blue)' }} /> Target
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--k-grey-700)' }}>
                    {project.target || project.description || "No distinct scope documentation has been initialised for this project."}
                  </p>
                  {project.total_budget && (
                    <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
                      <p className="k-eyebrow mb-1">Total Budget Assigned</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--k-ink)' }}>
                        ₹{Number(project.total_budget).toLocaleString('en-IN')} {budgetUnitLabel}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="k-band-grey k-band-pad"
          >
            <div className="k-card p-5 md:p-8">
              <Milestones projectId={projectId} />
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="k-band-white k-band-pad"
          >
            {/* We render the component here */}
            <BigTask projectId={projectId} onProgressUpdate={setCalculatedProgress} />
          </motion.section>
        </main>

        <AnimatePresence>
          {isAssignModalOpen && (
            <AssignTeamModal
              isOpen={isAssignModalOpen}
              onClose={() => setIsAssignModalOpen(false)}
              projectId={projectId}
              clientId={project.client}
              onAssigned={fetchData}
              initialSelected={project.team_members_details?.map(m => m.id) || []}
            />
          )}
          {isSaveTemplateOpen && (
            <SaveTemplateModal
              isOpen={isSaveTemplateOpen}
              onClose={() => setIsSaveTemplateOpen(false)}
              projectId={projectId}
              projectName={project.name}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
