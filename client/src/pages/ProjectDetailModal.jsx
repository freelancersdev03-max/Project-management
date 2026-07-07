import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../api';

const ProjectDetailModal = ({ isOpen, onClose, onProjectCreated, clientId, projectToEdit = null }) => {
  const [loading, setLoading] = useState(false);
  const [currentClient, setCurrentClient] = useState(null); // Store full client details
  const [internalTeamOptions, setInternalTeamOptions] = useState([]);
  const [seniorTeamOptions, setSeniorTeamOptions] = useState([]); // NEW: for senior team
  const [kayaaraOptions, setKayaaraOptions] = useState([]);

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
    assigned_kayaara: '',
    internal_team_selection: [], // For local state of internal team
    external_team_selection: [],
    senior_team_selection: [], // NEW: for senior team
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
      const seniorTeamSelection = normalizeIdList(
        projectToEdit.senior_team,
        projectToEdit.senior_team_details
      );

      setFormData({
        name: projectToEdit.name,
        target: projectToEdit.target || projectToEdit.description || '', // Fallback for old projects
        client: clientVal,
        assigned_sgm: projectToEdit.assigned_sgm || '',
        assigned_kayaara: projectToEdit.assigned_kayaara || '',
        internal_team_selection: internalTeamSelection,
        external_team_selection: externalTeamSelection,
        senior_team_selection: seniorTeamSelection,
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
        assigned_kayaara: '',
        internal_team_selection: [],
        external_team_selection: [],
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

          // Fetch current client details to get auto-assigned data
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

            // NEW: Load seniors from client
            const seniors = clientData.seniors_details || [];
            setSeniorTeamOptions(
              mergeMemberOptions(seniors, projectToEdit?.senior_team_details || [])
            );

            let assignedKayaaraUsers = Array.isArray(clientData.assigned_kayaara_users_details)
              ? clientData.assigned_kayaara_users_details
              : [];

            // Fallback for older client payloads that only expose IDs.
            if (assignedKayaaraUsers.length === 0 && Array.isArray(clientData.assigned_kayaara_users) && clientData.assigned_kayaara_users.length > 0) {
              try {
                const kayaaraRes = await api.get('kayaara/');
                const allKayaaraUsers = Array.isArray(kayaaraRes.data)
                  ? kayaaraRes.data
                  : (kayaaraRes.data?.results || []);
                const allowedIds = new Set(normalizeIdList(clientData.assigned_kayaara_users));
                assignedKayaaraUsers = allKayaaraUsers.filter((user) => allowedIds.has(Number(user?.id)));
              } catch (kayaaraFallbackError) {
                console.warn('Failed to resolve assigned KAYAARA IDs for project form', kayaaraFallbackError);
              }
            }

            const mergedHqeplOptions = mergeMemberOptions(
              assignedHqepls,
              projectToEdit?.assigned_kayaara_details ? [projectToEdit.assigned_kayaara_details] : []
            );
            setKayaaraOptions(mergedHqeplOptions);

            // Default to the first available client-assigned KAYAARA when the project has none yet.
            if (mergedHqeplOptions.length > 0) {
              setFormData((prev) => ({
                ...prev,
                assigned_kayaara: prev.assigned_kayaara || mergedHqeplOptions[0].id,
              }));
            }

            // Auto-set SGM logic
            // If user is SGM, set themselves
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
      // Sanitize payload
      const payload = {
        name: formData.name,
        target: formData.target,
        client: formData.client,
        assigned_sgm: formData.assigned_sgm || null,
        assigned_kayaara: formData.assigned_kayaara || null,
        assigned_employees: normalizeIdList(formData.internal_team_selection),
        external_team: normalizeIdList(formData.external_team_selection),
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

  const handleTeamCheck = (id) => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return;

    const current = [...formData.internal_team_selection];
    if (current.includes(numericId)) {
      setFormData({ ...formData, internal_team_selection: current.filter(item => item !== numericId) });
    } else {
      setFormData({ ...formData, internal_team_selection: [...current, numericId] });
    }
  };

  if (!isOpen) return null;

  const isSgmUser = (localStorage.getItem('role') || '').toUpperCase() === 'SGM';

  const chipStyle = (selected) => selected
    ? { background: 'var(--k-blue)', color: 'var(--k-white)', border: '1px solid var(--k-blue)' }
    : { background: 'var(--k-white)', color: 'var(--k-grey-500)', border: '1px solid var(--k-grey-200)' };

  return (
    <div className="k-backdrop" onClick={onClose} style={{ fontFamily: 'Poppins, sans-serif' }}>
      <div className="k-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 md:p-8 overflow-y-auto k-scroll">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="k-eyebrow mb-1">Strategic asset configuration</p>
              <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--k-ink)' }}>
                {projectToEdit ? 'Update' : 'Initialize'} <span style={{ color: 'var(--k-blue)' }}>Project</span>
              </h2>
            </div>
            <button onClick={onClose} className="k-btn-icon" aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Identity */}
            <div className="space-y-4">
              <div>
                <label className="k-label">Project name</label>
                <input required className="k-input"
                  placeholder="e.g., ISO 27001 Certification"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="k-label">Project target</label>
                <textarea rows="2" className="k-textarea"
                  placeholder="Define the core objective..."
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })} />
              </div>
            </div>

            {/* Read-Only Info Row */}
            <div className="k-card-grey grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div>
                <p className="k-eyebrow mb-1">Client</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-700)' }}>{currentClient?.company_name || 'Loading...'}</p>
              </div>
              <div>
                <p className="k-eyebrow mb-1">Lead SGM</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-700)' }}>
                  {currentClient?.assigned_sgms_details?.[0]?.full_name || 'Unassigned'}
                </p>
              </div>
            </div>

            {/* Dropdowns Row - ONLY Status remaining */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="k-label">Include top management</label>
                <select
                  className="k-select"
                  value={formData.assigned_kayaara || ''}
                  onChange={(e) => setFormData({ ...formData, assigned_kayaara: e.target.value ? Number(e.target.value) : '' })}
                >
                  <option value="">Unassigned</option>
                  {kayaaraOptions.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name || member.username || member.email}
                    </option>
                  ))}
                </select>
                {Array.isArray(kayaaraOptions) && kayaaraOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {kayaaraOptions.map((member) => (
                      <span
                        key={member.id}
                        className={Number(formData.assigned_kayaara) === Number(member.id) ? 'k-pill-solid' : 'k-pill-grey'}
                      >
                        {member.full_name || member.username || member.email}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="k-label">Project status</label>
                <select className="k-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="HOLD">HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            {/* Internal Team Selection */}
            <div className="space-y-4">
              {/* Internal Team */}
              <div className="space-y-2">
                <label className="k-label">
                  Assign internal team ({isSgmUser ? "From SGM assigned team" : "From client's squad"})
                </label>
                {internalTeamOptions.length === 0 ? (
                  <div className="p-4 text-xs text-center rounded-2xl" style={{ background: 'var(--k-band-grey)', color: 'var(--k-grey-500)', border: '1px dashed var(--k-grey-300)' }}>
                    {isSgmUser
                      ? 'No internal members available in your assigned team pool.'
                      : 'No internal team members assigned to this client.'}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-4 rounded-2xl min-h-20" style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}>
                    {internalTeamOptions.map((m) => {
                      const memberId = Number(m.id);
                      if (!Number.isInteger(memberId) || memberId <= 0) return null;

                      const isSelected = formData.internal_team_selection.includes(memberId);
                      return (
                        <button
                          type="button"
                          key={memberId}
                          onClick={() => handleTeamCheck(memberId)}
                          className="px-4 py-2 rounded-xl text-[11px] font-semibold transition-all"
                          style={chipStyle(isSelected)}
                        >
                          {m.full_name || m.username}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* External Team Selection */}
              <div className="space-y-2">
                <label className="k-label">Assign external team (client credentials)</label>
                {currentClient?.employees?.filter(m => m.role !== "SENIOR").length === 0 ? (
                  <div className="p-4 text-xs text-center rounded-2xl" style={{ background: 'var(--k-band-grey)', color: 'var(--k-grey-500)', border: '1px dashed var(--k-grey-300)' }}>
                    No external members found for this client.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-4 rounded-2xl min-h-20" style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}>
                    {currentClient?.employees?.filter(m => m.role !== "SENIOR")?.map((m) => {
                      const memberId = Number(m.id);
                      if (!Number.isInteger(memberId) || memberId <= 0) return null;

                      const isSelected = formData.external_team_selection.includes(memberId);
                      return (
                        <button
                          type="button"
                          key={memberId}
                          onClick={() => {
                            const current = [...formData.external_team_selection];
                            if (current.includes(memberId)) {
                              setFormData({ ...formData, external_team_selection: current.filter(id => id !== memberId) });
                            } else {
                              setFormData({ ...formData, external_team_selection: [...current, memberId] });
                            }
                          }}
                          className="px-4 py-2 rounded-xl text-[11px] font-semibold transition-all"
                          style={chipStyle(isSelected)}
                        >
                          {m.name || m.username} <span className="opacity-60 text-[9px] ml-1">({m.role})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Senior Team Selection - NEW */}
              <div className="space-y-2">
                <label className="k-label">Assign senior team (automatic)</label>
                {seniorTeamOptions.length === 0 ? (
                  <div className="p-4 text-xs text-center rounded-2xl" style={{ background: 'var(--k-band-grey)', color: 'var(--k-grey-500)', border: '1px dashed var(--k-grey-300)' }}>
                    No senior members assigned to this client.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 p-4 rounded-2xl min-h-20" style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}>
                    {seniorTeamOptions.map((m) => {
                      const memberId = Number(m.id);
                      if (!Number.isInteger(memberId) || memberId <= 0) return null;

                      const isSelected = formData.senior_team_selection.includes(memberId);
                      return (
                        <button
                          type="button"
                          key={memberId}
                          onClick={() => {
                            const current = [...formData.senior_team_selection];
                            if (current.includes(memberId)) {
                              setFormData({ ...formData, senior_team_selection: current.filter(id => id !== memberId) });
                            } else {
                              setFormData({ ...formData, senior_team_selection: [...current, memberId] });
                            }
                          }}
                          className="px-4 py-2 rounded-xl text-[11px] font-semibold transition-all"
                          style={chipStyle(isSelected)}
                        >
                          {m.full_name || m.username} <span className="opacity-60 text-[9px] ml-1">(SENIOR)</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="k-label">Start date</label>
                <input type="date" required className="k-input"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div>
                <label className="k-label">End date</label>
                <input type="date" required className="k-input"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>

            <button disabled={loading} className="k-btn-primary w-full min-h-[44px] text-sm">
              {loading ? 'Processing...' : (projectToEdit ? 'Update Configuration' : 'Deploy Project Instance')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
export default ProjectDetailModal;
