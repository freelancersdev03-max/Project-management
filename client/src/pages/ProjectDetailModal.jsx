import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Briefcase, Info, Users, ShieldCheck, Check } from 'lucide-react';
import api from '../api';

const ProjectDetailModal = ({ isOpen, onClose, onProjectCreated, clientId, projectToEdit = null }) => {
  const [loading, setLoading] = useState(false);
  const [currentClient, setCurrentClient] = useState(null);
  const [internalTeamOptions, setInternalTeamOptions] = useState([]);
  const [seniorTeamOptions, setSeniorTeamOptions] = useState([]);
  const [hqeplOptions, setHqeplOptions] = useState([]);

  const normalizeIdList = (value, fallbackObjects = []) => {
    const source = Array.isArray(value) && value.length > 0 ? value : fallbackObjects;
    return source
      .map((item) => (typeof item === 'object' && item !== null ? item.id : item))
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
  };

  const mergeMemberOptions = (...collections) => {
    const memberMap = new Map();
    collections.forEach((collection) => {
      if (!Array.isArray(collection)) return;
      collection.forEach((member) => {
        const memberId = Number(member?.id);
        if (!Number.isInteger(memberId) || memberId <= 0) return;
        memberMap.set(memberId, { ...member, id: memberId });
      });
    });
    return Array.from(memberMap.values());
  };

  const [formData, setFormData] = useState({
    name: '',
    target: '',
    client: clientId || '',
    assigned_sgm: '',
    assigned_hqepl: '',
    internal_team_selection: [],
    senior_team_selection: [],
    start_date: '',
    end_date: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (projectToEdit) {
      const clientVal = projectToEdit.client?.id || projectToEdit.client || clientId;
      const internalTeamSelection = normalizeIdList(projectToEdit.assigned_employees, projectToEdit.team_members_details);
      const seniorTeamSelection = normalizeIdList(projectToEdit.senior_team, projectToEdit.senior_team_details);

      setFormData({
        name: projectToEdit.name,
        target: projectToEdit.target || projectToEdit.description || '',
        client: clientVal,
        assigned_sgm: projectToEdit.assigned_sgm || '',
        assigned_hqepl: projectToEdit.assigned_hqepl || '',
        internal_team_selection: internalTeamSelection,
        senior_team_selection: seniorTeamSelection,
        start_date: projectToEdit.start_date || '',
        end_date: projectToEdit.end_date || '',
        status: projectToEdit.status || 'ACTIVE'
      });
    } else {
      setFormData({
        name: '',
        target: '',
        client: clientId || '',
        assigned_sgm: '',
        assigned_hqepl: '',
        internal_team_selection: [],
        senior_team_selection: [],
        start_date: '',
        end_date: '',
        status: 'ACTIVE'
      });
    }
  }, [projectToEdit, clientId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const fetchDropdownData = async () => {
        try {
          const userRole = (localStorage.getItem('role') || '').toUpperCase();
          const userId = parseInt(localStorage.getItem('user_id') || '0', 10);

          if (clientId) {
            const clientRes = await api.get(`clients/${clientId}/`);
            const clientData = clientRes.data;
            setCurrentClient(clientData);

            let scopedInternalMembers = clientData.internal_team_details || [];

            if (userRole === 'SGM') {
              try {
                const employeeRes = await api.get(`sgm/employees/?client_id=${clientId}`);
                scopedInternalMembers = Array.isArray(employeeRes.data) ? employeeRes.data : [];
              } catch (employeeError) {
                console.warn('Failed to load SGM employee pool, using client internal team fallback', employeeError);
              }
            }

            setInternalTeamOptions(
              mergeMemberOptions(scopedInternalMembers, projectToEdit?.team_members_details || [])
            );

            const seniors = clientData.seniors_details || [];
            setSeniorTeamOptions(
              mergeMemberOptions(seniors, projectToEdit?.senior_team_details || [])
            );

            let assignedHqepls = Array.isArray(clientData.assigned_hqepls_details)
              ? clientData.assigned_hqepls_details
              : [];

            if (assignedHqepls.length === 0 && Array.isArray(clientData.assigned_hqepls) && clientData.assigned_hqepls.length > 0) {
              try {
                const hqeplRes = await api.get('hqepl/');
                const allHqepls = Array.isArray(hqeplRes.data) ? hqeplRes.data : (hqeplRes.data?.results || []);
                const allowedIds = new Set(normalizeIdList(clientData.assigned_hqepls));
                assignedHqepls = allHqepls.filter((user) => allowedIds.has(Number(user?.id)));
              } catch (hqeplFallbackError) {
                console.warn('Failed to resolve assigned HQEPL IDs for project form', hqeplFallbackError);
              }
            }

            const mergedHqeplOptions = mergeMemberOptions(
              assignedHqepls,
              projectToEdit?.assigned_hqepl_details ? [projectToEdit.assigned_hqepl_details] : []
            );
            setHqeplOptions(mergedHqeplOptions);

            if (mergedHqeplOptions.length > 0) {
              setFormData((prev) => ({
                ...prev,
                assigned_hqepl: prev.assigned_hqepl || mergedHqeplOptions[0].id,
              }));
            }

            if (userRole === 'SGM') {
              setFormData(prev => ({ ...prev, assigned_sgm: userId }));
            } else if (clientData.assigned_sgms_details && clientData.assigned_sgms_details.length > 0) {
              setFormData(prev => ({ ...prev, assigned_sgm: clientData.assigned_sgms_details[0].id }));
            }
          }
        } catch (err) {
          console.error("Error loading client data", err);
        }
      };

      fetchDropdownData();
    }
  }, [isOpen, clientId, projectToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        target: formData.target,
        client: formData.client,
        assigned_sgm: formData.assigned_sgm || null,
        assigned_hqepl: formData.assigned_hqepl || null,
        assigned_employees: normalizeIdList(formData.internal_team_selection),
        external_team: [], // Removed feature, passing empty array to satisfy backend
        senior_team: normalizeIdList(formData.senior_team_selection),
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
      };

      if (projectToEdit) {
        await api.patch(`projects/${projectToEdit.id}/`, payload);
      } else {
        await api.post(`projects/`, payload);
      }

      onProjectCreated();
      onClose();
    } catch (error) {
      console.error("Project Save Error", error.response?.data);
      let errorMsg = "Failed to save project.";
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          errorMsg = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
        } else {
          errorMsg = String(error.response.data);
        }
      }
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamCheck = (id, type) => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return;

    if (type === 'internal') {
      const current = [...formData.internal_team_selection];
      if (current.includes(numericId)) {
        setFormData({ ...formData, internal_team_selection: current.filter(item => item !== numericId) });
      } else {
        setFormData({ ...formData, internal_team_selection: [...current, numericId] });
      }
    } else if (type === 'senior') {
      const current = [...formData.senior_team_selection];
      if (current.includes(numericId)) {
        setFormData({ ...formData, senior_team_selection: current.filter(item => item !== numericId) });
      } else {
        setFormData({ ...formData, senior_team_selection: [...current, numericId] });
      }
    }
  };

  if (!isOpen) return null;

  const isSgmUser = (localStorage.getItem('role') || '').toUpperCase() === 'SGM';

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {projectToEdit ? 'Edit Project' : 'Create New Project'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {currentClient?.company_name || 'Loading organization...'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-500 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        {/* Body - No Scroll Needed */}
        <div className="p-6">
          <form id="project-form" onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Row 1: Name and Target */}
              <div className="col-span-1 md:col-span-2 space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Project Name <span className="text-red-500">*</span></label>
                <input required className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  placeholder="e.g., Q3 Marketing Campaign"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Objectives / Target</label>
                <input type="text" className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                  placeholder="Main goal of this project..."
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })} />
              </div>

              {/* Row 2: Dates, Management, Status */}
              <div className="col-span-1 space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Start Date <span className="text-red-500">*</span></label>
                <input type="date" required className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              
              <div className="col-span-1 space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">End Date <span className="text-red-500">*</span></label>
                <input type="date" required className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>

              <div className="col-span-1 space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Top Management</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                  value={formData.assigned_hqepl || ''}
                  onChange={(e) => setFormData({ ...formData, assigned_hqepl: e.target.value ? Number(e.target.value) : '' })}
                >
                  <option value="">Unassigned</option>
                  {hqeplOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.username || member.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="col-span-1 space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Status</label>
                <select className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="ACTIVE">Active</option>
                  <option value="HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              {/* Row 3: Team Assignments (split into 2 columns) */}
              <div className="col-span-1 md:col-span-2 space-y-2 pt-2 border-t border-slate-100">
                <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>Internal Team Members</span>
                  <span className="text-xs font-normal text-slate-500">{formData.internal_team_selection.length} selected</span>
                </label>
                {internalTeamOptions.length === 0 ? (
                  <div className="px-4 py-2.5 bg-slate-50 text-slate-500 text-sm rounded-lg border border-dashed border-slate-200">
                    {isSgmUser ? 'No available members in your pool.' : 'No internal team members found.'}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {internalTeamOptions.map((m) => {
                      const isSelected = formData.internal_team_selection.includes(m.id);
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => handleTeamCheck(m.id, 'internal')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                            isSelected
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-blue-600" />}
                          {m.full_name || m.username}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2 pt-2 border-t border-slate-100">
                <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>Senior Team</span>
                  <span className="text-xs font-normal text-slate-500">{formData.senior_team_selection.length} selected</span>
                </label>
                {seniorTeamOptions.length === 0 ? (
                  <div className="px-4 py-2.5 bg-slate-50 text-slate-500 text-sm rounded-lg border border-dashed border-slate-200">
                    No senior members assigned to this client.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {seniorTeamOptions.map((m) => {
                      const isSelected = formData.senior_team_selection.includes(m.id);
                      return (
                        <button
                          type="button"
                          key={m.id}
                          onClick={() => handleTeamCheck(m.id, 'senior')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {isSelected && <Check size={12} className="text-indigo-600" />}
                          {m.full_name || m.username}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 md:px-6 md:py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200/50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="project-form"
            disabled={loading} 
            className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {projectToEdit ? 'Save Changes' : 'Create Project'}
          </button>
        </div>

      </div>
    </div>
  );
};
export default ProjectDetailModal;