import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Briefcase, Info, Users, ShieldCheck } from 'lucide-react';
import api from '../api';

const ProjectDetailModal = ({ isOpen, onClose, onProjectCreated, clientId, projectToEdit = null }) => {
  const [loading, setLoading] = useState(false);
  const [currentClient, setCurrentClient] = useState(null); // Store full client details
  const [internalTeamOptions, setInternalTeamOptions] = useState([]);

  const normalizeIdList = (value, fallbackObjects = []) => {
    if (Array.isArray(value) && value.length > 0) {
      return value
        .map(item => (typeof item === 'object' && item !== null ? item.id : item))
        .filter(Boolean);
    }
    if (Array.isArray(fallbackObjects) && fallbackObjects.length > 0) {
      return fallbackObjects.map(item => item?.id).filter(Boolean);
    }
    return [];
  };

  const [formData, setFormData] = useState({
    name: '',
    target: '',
    client: clientId || '',
    assigned_sgm: '',
    internal_team_selection: [], // For local state of internal team
    external_team_selection: [],
    start_date: '',
    end_date: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (projectToEdit) {
      // Handle client being either an ID or an Object
      const clientVal = projectToEdit.client?.id || projectToEdit.client || clientId;

      const internalTeamSelection = normalizeIdList(
        projectToEdit.assigned_employees,
        projectToEdit.team_members_details
      );
      const externalTeamSelection = normalizeIdList(
        projectToEdit.external_team,
        projectToEdit.external_team_details
      );

      setFormData({
        name: projectToEdit.name,
        target: projectToEdit.target || projectToEdit.description || '', // Fallback for old projects
        client: clientVal,
        assigned_sgm: projectToEdit.assigned_sgm || '',
        internal_team_selection: internalTeamSelection,
        external_team_selection: externalTeamSelection,
        start_date: projectToEdit.start_date || '',
        end_date: projectToEdit.end_date || '',
        status: projectToEdit.status || 'ACTIVE'
      });
    } else {
      // Reset for create mode
      setFormData({
        name: '',
        target: '',
        client: clientId || '',
        assigned_sgm: '',
        internal_team_selection: [],
        external_team_selection: [],
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
          const token = localStorage.getItem('access_token');
          const headers = { Authorization: `Bearer ${token}` };

          // Fetch current client details to get auto-assigned data
          if (clientId) {
            const clientRes = await api.get(`clients/${clientId}/`, { headers });
            const clientData = clientRes.data;
            setCurrentClient(clientData);

            // Set options
            // Set options
            setInternalTeamOptions(clientData.internal_team_details || []);

            // Auto-set SGM logic
            // If user is SGM, set themselves
            const userRole = (localStorage.getItem('role') || '').toUpperCase();
            const userId = parseInt(localStorage.getItem('user_id') || '0'); // Assuming you store user_id

            if (userRole === 'SGM') {
              // Verify if this SGM is in the client's assigned list (optional UI safety)
              setFormData(prev => ({ ...prev, assigned_sgm: userId }));
            } else if (clientData.assigned_sgms_details && clientData.assigned_sgms_details.length > 0) {
              // For Admin/HQEPL, maybe select the first one or leave empty?
              // Let's set the first one for now or handle via dropdown if we add one.
              // Ideally Admin should pick. For now, default to first.
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
      const token = localStorage.getItem('access_token');

      // Sanitize payload
      const payload = { ...formData };

      // Map internal team selection to backend field
      payload.assigned_employees = payload.internal_team_selection;
      payload.external_team = payload.external_team_selection;

      // Removed unnecessary fields
      // delete payload.internal_team_selection; 

      if (!payload.assigned_sgm) payload.assigned_sgm = null;

      if (projectToEdit) {
        await api.patch(`projects/${projectToEdit.id}/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await api.post(`projects/`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
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

  const handleTeamCheck = (id) => {
    const current = [...formData.internal_team_selection];
    if (current.includes(id)) {
      setFormData({ ...formData, internal_team_selection: current.filter(item => item !== id) });
    } else {
      setFormData({ ...formData, internal_team_selection: [...current, id] });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 border border-slate-100">
        <div className="p-8 md:p-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">{projectToEdit ? 'Update' : 'Initialize'} <span className="text-[#f5914e]">Project</span></h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Strategic Asset Configuration</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Identity */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Project Name</label>
                <input required className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-[#f5914e] outline-none transition-all"
                  placeholder="e.g., ISO 27001 Certification"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Project Target</label>
                <textarea rows="2" className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-[#f5914e] outline-none"
                  placeholder="Define the core objective..."
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })} />
              </div>
            </div>

            {/* Read-Only Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Client</p>
                <p className="text-sm font-bold text-slate-700">{currentClient?.company_name || 'Loading...'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Lead SGM</p>
                <p className="text-sm font-bold text-slate-700">
                  {currentClient?.assigned_sgm_details?.full_name || 'Unassigned'}
                </p>
              </div>
            </div>

            {/* Dropdowns Row - ONLY Status remaining */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Project Status</label>
                <select className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold appearance-none outline-none focus:border-[#f5914e]"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="HOLD">HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            {/* Internal Team Selection */}
            {/* Internal Team Selection */}
            <div className="space-y-4">
              {/* Internal Team */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Assign Internal Team (From Client's Squad)</label>
                {internalTeamOptions.length === 0 ? (
                  <div className="p-4 bg-slate-50 text-slate-400 text-xs text-center rounded-2xl border border-dashed border-slate-200">
                    No internal team members assigned to this client.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-100 rounded-3xl min-h-[80px]">
                    {internalTeamOptions.map(m => (
                      <button type="button" key={m.id} onClick={() => handleTeamCheck(m.id)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.internal_team_selection.includes(m.id)
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-400 border-slate-200'
                          }`}>
                        {m.full_name || m.username}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* External Team Selection */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Assign External Team (Client Credentials)</label>
                {currentClient?.employees?.length === 0 ? (
                  <div className="p-4 bg-slate-50 text-slate-400 text-xs text-center rounded-2xl border border-dashed border-slate-200">
                    No external members found for this client.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-100 rounded-3xl min-h-[80px]">
                    {currentClient?.employees?.map(m => (
                      <button type="button" key={m.id} onClick={() => {
                        const current = [...formData.external_team_selection];
                        if (current.includes(m.id)) {
                          setFormData({ ...formData, external_team_selection: current.filter(id => id !== m.id) });
                        } else {
                          setFormData({ ...formData, external_team_selection: [...current, m.id] });
                        }
                      }}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.external_team_selection.includes(m.id)
                          ? 'bg-[#f5914e] text-white border-[#f5914e]'
                          : 'bg-white text-slate-400 border-slate-200'
                          }`}>
                        {m.name || m.username} <span className="opacity-50 text-[8px] ml-1">({m.role})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Start Date</label>
                <input type="date" required className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">End Date</label>
                <input type="date" required className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>

            <button disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-[#f5914e] transition-all shadow-xl shadow-slate-200">
              {loading ? 'Processing...' : (projectToEdit ? 'Update Configuration' : 'Deploy Project Instance')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default ProjectDetailModal;