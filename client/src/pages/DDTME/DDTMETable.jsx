import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Navbar from '../../components/Navbar';
import api from '../../api';


const DDTMETable = () => {
  const [objectives, setObjectives] = useState([]);

  const [deliverables, setDeliverables] = useState([
    {
      sr: 1,
      name: 'Prepare calling and meeting scripts',
      weekly: 'Week 1',
      yash: { on: 4, off: 2 },
      rahul: { on: 3, off: 1 },
      amit: { on: 2, off: 2 }
    }
  ]);

  const [newObjective, setNewObjective] = useState('');
  const [showAddObjective, setShowAddObjective] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState({ name: '', projectId: '', targetDate: '', weekly: '', yash: { on: 0, off: 0 }, rahul: { on: 0, off: 0 }, amit: { on: 0, off: 0 } });
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);

  const addObjective = async () => {
    if (newObjective.trim()) {
      try {
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };
        const res = await api.post('ddtme/monthly-objectives/', {
          client: clientId,
          month: selectedMonth,
          year: selectedYear,
          objective: newObjective
        }, { headers });
        setObjectives([...objectives, res.data]);
        setNewObjective('');
        setShowAddObjective(false);
      } catch (error) {
        console.error("Error adding objective", error);
        alert("Failed to add objective");
      }
    }
  };

  const addDeliverable = () => {
    if (newDeliverable.name.trim() && newDeliverable.weekly.trim()) {
      setDeliverables([...deliverables, { sr: deliverables.length + 1, ...newDeliverable }]);
      setNewDeliverable({ name: '', weekly: '', yash: { on: 0, off: 0 }, rahul: { on: 0, off: 0 }, amit: { on: 0, off: 0 } });
      setShowAddDeliverable(false);
    }
  };



  const deleteDeliverable = (index) => {
    // Kept for backward compatibility if we still want to edit local state deliverables
    // But for dynamic view, this might be disabled or handled differently
    const updated = deliverables.filter((_, i) => i !== index);
    setDeliverables(updated.map((del, idx) => ({ ...del, sr: idx + 1 })));
  };

  const deleteObjective = async (index, id) => {
    if (!window.confirm("Delete this objective?")) return;
    try {
      if (id) {
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };
        await api.delete(`ddtme/monthly-objectives/${id}/`, { headers });
      }
      const updated = objectives.filter((_, i) => i !== index);
      setObjectives(updated);
    } catch (error) {
      console.error("Error deleting objective", error);
      alert("Failed to delete objective");
    }
  };

  // --- DYNAMIC DATA FETCHING ---
  const [clientBigTasks, setClientBigTasks] = useState([]);
  const [clientProjects, setClientProjects] = useState([]); // [NEW] Active Projects
  const [additionalTasks, setAdditionalTasks] = useState([]); // [NEW] Ad-hoc tasks
  const [clientEmployees, setClientEmployees] = useState([]);
  const [submission, setSubmission] = useState(null); // [NEW] Submission status
  const [userRole, setUserRole] = useState(null); // To determine if SGM or Employee
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rowRemarks, setRowRemarks] = useState({});
  const [remarksDrafts, setRemarksDrafts] = useState({});
  const [editingRemarkKey, setEditingRemarkKey] = useState(null);
  const [savingRemarkKey, setSavingRemarkKey] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const { clientId } = useParams();
  const navigate = useNavigate();

  // Month/Year Selection
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  // Generate years (current year +/- 2)
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const buildMonthLabel = (month, year) => {
    const date = new Date(year, month - 1, 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      if (prev === 1) {
        setSelectedYear(year => year - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      if (prev === 12) {
        setSelectedYear(year => year + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const getRoleFromToken = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const data = JSON.parse(decoded);
      return data.role || null;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    if (clientId) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem('access_token');
          const headers = { Authorization: `Bearer ${token}` };

          // 0. Get User Role (Independent try/catch)
          try {
            // accounts.urls is included under 'api/', so 'me/' maps to /api/me/
            const profileRes = await api.get('accounts/me/', { headers });
            setUserRole(profileRes.data.role);
          } catch (err) {
            const roleFromToken = getRoleFromToken();
            if (roleFromToken) {
              setUserRole(roleFromToken);
            }
            console.error("Failed to fetch user role", err);
          }

          // 1. Fetch Big Tasks (Rows) with Month/Year Filter
          const tasksRes = await api.get(`ddtme/big-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`, { headers });
          const tasksData = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);
          setClientBigTasks(tasksData);

          // 1.2 Fetch Projects
          const projRes = await api.get(`projects/?client_id=${clientId}`, { headers });
          const projData = Array.isArray(projRes.data) ? projRes.data : (projRes.data.results || []);
          setClientProjects(projData);

          // 1.5 Fetch Additional Tasks
          const addTasksRes = await api.get(`ddtme/additional-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`, { headers });
          const addTasksData = Array.isArray(addTasksRes.data) ? addTasksRes.data : (addTasksRes.data.results || []);
          setAdditionalTasks(addTasksData);

          // 1.8 Fetch Objectives
          const objRes = await api.get(`ddtme/monthly-objectives/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`, { headers });
          setObjectives(objRes.data.results || []);

          // 2. Fetch Client Employees (Columns)
          const empsRes = await api.get(`clients/${clientId}/employees/`, { headers });
          const empsData = Array.isArray(empsRes.data) ? empsRes.data : (empsRes.data.results || []);
          setClientEmployees(empsData);

          // 3. Fetch Submission Status
          const subRes = await api.get(`ddtme/submissions/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`, { headers });
          const subData = Array.isArray(subRes.data) ? subRes.data : (subRes.data.results || []);
          if (subData.length > 0) {
            setSubmission(subData[0]);
          } else {
            setSubmission(null);
          }

          // 4. Fetch Man-Day Entries
          const entriesRes = await api.get(`ddtme/man-day-entries/?month=${selectedMonth}&year=${selectedYear}`, { headers });
          const entriesData = Array.isArray(entriesRes.data) ? entriesRes.data : (entriesRes.data.results || []);

          // Populate manDayData
          const mapping = {};
          entriesData.forEach(entry => {
            const taskId = entry.big_task || entry.additional_task;
            // We need to know if it's big or additional. The entry has null for one field.
            // But state key must be unique. Let's use prefix 'big_' or 'add_'?
            // Current getHours uses `${taskId}_${empId}`. Assuming task IDs don't collide? 
            // They are different tables, so IDs might collide.
            // We need a prefix system.
            // Let's UPDATE existing state logic to handle prefixes.

            const typePrefix = entry.big_task ? 'big' : 'add';
            const key = `${typePrefix}_${taskId}_${entry.employee}`;
            mapping[key] = { on: entry.plan_hours, off: entry.off_hours };
          });
          setManDayData(mapping);

        } catch (error) {
          console.error("Failed to fetch DDTME data", error);
        }
      };
      fetchData();
    }
  }, [clientId, selectedMonth, selectedYear]);

  const parseSubmissionRemarks = (raw) => {
    if (!raw) return { perRow: {}, legacy: '' };
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.perRow) {
        return {
          perRow: parsed.perRow || {},
          legacy: parsed.legacy || ''
        };
      }
    } catch (error) {
      return { perRow: {}, legacy: raw };
    }
    return { perRow: {}, legacy: raw };
  };

  const buildRemarksPayload = (perRow, legacy = '') => {
    return JSON.stringify({ version: 1, perRow, legacy });
  };

  useEffect(() => {
    const parsed = parseSubmissionRemarks(submission?.remarks);
    setRowRemarks(parsed.perRow || {});
    setRemarksDrafts(parsed.perRow || {});
    setEditingRemarkKey(null);
    setSavingRemarkKey(null);
  }, [submission?.id, submission?.remarks]);

  // Helper to safely get Hours (Plan/Off)
  const [manDayData, setManDayData] = useState({});

  const handleHourChange = (taskId, empId, field, value, type = 'big') => {
    const key = `${type}_${taskId}_${empId}`;
    setManDayData(prev => ({
      ...prev,
      [key]: {
        ...prev[key] || { on: 0, off: 0 },
        [field]: parseInt(value) || 0
      }
    }));
  };

  const getHours = (taskId, empId, field, type = 'big') => {
    return manDayData[`${type}_${taskId}_${empId}`]?.[field] || 0;
  };

  const getTotalHoursForEmp = (empId) => {
    let total = 0;
    if (Array.isArray(clientBigTasks)) {
      clientBigTasks.forEach(task => {
        total += getHours(task.id, empId, 'on', 'big');
      });
    }
    if (Array.isArray(additionalTasks)) {
      additionalTasks.forEach(task => {
        total += getHours(task.id, empId, 'on', 'add');
      });
    }
    return total;
  };

  const getTotalOffHoursForEmp = (empId) => {
    let total = 0;
    if (Array.isArray(clientBigTasks)) {
      clientBigTasks.forEach(task => {
        total += getHours(task.id, empId, 'off', 'big');
      });
    }
    if (Array.isArray(additionalTasks)) {
      additionalTasks.forEach(task => {
        total += getHours(task.id, empId, 'off', 'add');
      });
    }
    return total;
  };

  const grandTotal = Array.isArray(clientEmployees) ? clientEmployees.reduce((acc, emp) => acc + getTotalHoursForEmp(emp.id), 0) : 0;

  // --- ACTIONS ---

  const handleAddAdditionalTask = async () => {
    if (!newDeliverable.name.trim()) return;
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.post('ddtme/additional-tasks/', {
        client: clientId,
        month: selectedMonth,
        year: selectedYear,
        title: newDeliverable.name,
        project: newDeliverable.projectId || null,
        target_date: newDeliverable.targetDate || null
      }, { headers });
      setAdditionalTasks([...additionalTasks, res.data]);
      setNewDeliverable({ name: '', projectId: '', targetDate: '', weekly: '', yash: { on: 0, off: 0 }, rahul: { on: 0, off: 0 }, amit: { on: 0, off: 0 } });
      setShowAddDeliverable(false);
    } catch (error) {
      console.error("Error adding task", error);
      alert("Failed to add task");
    }
  };

  const handleSaveManDays = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const entries = [];
      Object.keys(manDayData).forEach(key => {
        // key format: type_taskId_empId
        const [type, taskId, empId] = key.split('_');
        const data = manDayData[key];
        // Only send if non-zero or explicitly modified (though state has all)
        // Ideally should convert to int
        entries.push({
          task_type: type,
          task_id: taskId,
          employee_id: empId,
          month: selectedMonth,
          year: selectedYear,
          plan_hours: data.on,
          off_hours: data.off
        });
      });

      await api.post('ddtme/man-day-entries/bulk_update_hours/', { entries }, { headers });
      alert("Saved successfully!");
    } catch (error) {
      console.error("Error saving man-days", error);
      alert("Failed to save hours");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendForApproval = async () => {
    if (!window.confirm("Are you sure you want to submit the DDTME plan? This will notify the SGM.")) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      if (submission?.id && submission?.status === 'Rejected') {
        await api.patch(`ddtme/submissions/${submission.id}/`, { remarks: '' }, { headers });
        setRowRemarks({});
        setRemarksDrafts({});
      }
      const res = await api.post('ddtme/submissions/submit/', {
        client_id: clientId,
        month: selectedMonth,
        year: selectedYear
      }, { headers });
      setSubmission(res.data);
      alert("Submitted successfully!");
    } catch (error) {
      console.error("Error submitting", error);
      alert("Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!submission) return;
    if (!window.confirm("Approve this DDTME plan?")) return;
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.post(`ddtme/submissions/${submission.id}/approve/`, {}, { headers });
      setSubmission(res.data);
      alert("Approved!");
    } catch (error) {
      console.error("Error approving", error);
      alert("Failed to approve");
    }
  };

  const handleStartRejecting = () => {
    if (!submission) return;
    setIsRejecting(true);
  };

  const handleCancelRejecting = () => {
    setIsRejecting(false);
    setEditingRemarkKey(null);
    setRemarksDrafts(rowRemarks || {});
  };

  const handleSubmitRejection = async () => {
    if (!submission) return;
    const hasRemark = Object.values(rowRemarks || {}).some((text) => String(text).trim().length > 0);
    if (!hasRemark) {
      alert('Add at least one remark before rejecting.');
      return;
    }
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const payload = buildRemarksPayload(rowRemarks);
      const res = await api.post(`ddtme/submissions/${submission.id}/reject/`, { remarks: payload }, { headers });
      setSubmission(res.data);
      setIsRejecting(false);
      alert('Rejected.');
    } catch (error) {
      console.error('Error rejecting', error);
      alert('Failed to reject');
    }
  };

  const handleStartEditRemark = (key) => {
    setEditingRemarkKey(key);
    setRemarksDrafts((prev) => ({ ...prev, [key]: rowRemarks[key] || '' }));
  };

  const handleSaveRemark = async (key) => {
    if (!submission) return;
    const nextText = (remarksDrafts[key] || '').trim();
    const nextPerRow = { ...rowRemarks };
    if (nextText) {
      nextPerRow[key] = nextText;
    } else {
      delete nextPerRow[key];
    }

    setSavingRemarkKey(key);
    try {
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const payload = buildRemarksPayload(nextPerRow);
      const res = await api.patch(`ddtme/submissions/${submission.id}/`, { remarks: payload }, { headers });
      setSubmission(res.data);
      setEditingRemarkKey(null);
    } catch (error) {
      console.error("Error saving remark", error);
      alert("Failed to save remark");
    } finally {
      setSavingRemarkKey(null);
    }
  };

  // derived state for read-only
  const isReadOnly = submission?.status === 'Submitted' || submission?.status === 'Approved';

  // Derived status normalized
  const planStatus = submission?.status ? submission.status.toUpperCase() : 'DRAFT';
  const parsedRemarks = parseSubmissionRemarks(submission?.remarks);
  const rejectionRemarksText = parsedRemarks.legacy;
  const showRowRemarks = planStatus !== 'APPROVED';

  // Permissions
  const canEdit = !isReadOnly && (userRole === 'EMPLOYEE' || userRole === 'ADMIN');
  const canEditRowRemarks = showRowRemarks && (userRole === 'SGM' || userRole === 'ADMIN');

  // SGM and ADMIN can approve/reject. EMPLOYEE cannot.
  const canApprove = userRole === 'SGM' && planStatus === 'SUBMITTED';

  const canSubmit = (planStatus === 'DRAFT' || planStatus === 'REJECTED') && (userRole === 'EMPLOYEE' || userRole === 'ADMIN');

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <span className="text-xs font-bold tracking-wider uppercase">← Back</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-black text-white text-[10px] font-black tracking-widest uppercase rounded-full">
              Man-days Estimation
            </span>
            {planStatus === 'SUBMITTED' && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-black tracking-widest uppercase rounded-full">
                Submitted
              </span>
            )}
            {planStatus === 'APPROVED' && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-[10px] font-black tracking-widest uppercase rounded-full">
                Approved
              </span>
            )}
            {planStatus === 'REJECTED' && (
              <span className="px-3 py-1 bg-red-100 text-red-800 text-[10px] font-black tracking-widest uppercase rounded-full">
                Rejected
              </span>
            )}
            {/* DIAGNOSTIC RE-ADDED */}
            <span className="text-[10px] text-slate-400 font-mono border border-slate-200 px-2 py-1 rounded">
              DEBUG: Role={userRole || 'null'} | Status={submission?.status || 'null'} | M={selectedMonth}/Y={selectedYear}
            </span>

          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mt-2">DDTME</h1>
          <p className="text-slate-500 font-medium italic">Deliverable Distribution Table</p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              {buildMonthLabel(selectedMonth, selectedYear)}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">

          {/* REJECTION REMARKS */}
          {planStatus === 'REJECTED' && rejectionRemarksText && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm max-w-md">
              <span className="font-bold block text-xs uppercase mb-1">Rejection Remarks:</span>
              {rejectionRemarksText}
            </div>
          )}

          {/* EMPLOYEE ACTIONS */}
          {/* Can submit if Draft OR Rejected AND not SGM (or SGM acting as submitter) */}
          {canSubmit && !canApprove && (
            <button
              onClick={handleSendForApproval}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all text-xs tracking-wider uppercase"
            >
              {isSubmitting ? 'Sending...' : (planStatus === 'REJECTED' ? 'Resubmit Plan' : 'Send for Approval')}
            </button>
          )}

          {/* SGM ACTIONS */}
          {canApprove && !isRejecting && (
            <>
              <button
                className="px-6 py-2.5 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-green-600 hover:shadow-xl hover:-translate-y-0.5 transition-all text-xs tracking-wider uppercase"
                onClick={handleApprove}
              >
                Approve
              </button>
              <button
                className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 hover:shadow-xl hover:-translate-y-0.5 transition-all text-xs tracking-wider uppercase"
                onClick={handleStartRejecting}
              >
                Reject
              </button>
            </>
          )}

          {canApprove && isRejecting && (
            <>
              <button
                className="px-6 py-2.5 bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-200 hover:bg-red-800 hover:shadow-xl hover:-translate-y-0.5 transition-all text-xs tracking-wider uppercase"
                onClick={handleSubmitRejection}
              >
                Send Rejection
              </button>
              <button
                className="px-4 py-2.5 text-slate-600 font-bold rounded-xl border border-slate-300 hover:bg-slate-50 transition-all text-xs tracking-wider uppercase"
                onClick={handleCancelRejecting}
              >
                Cancel
              </button>
            </>
          )}

          {/* Save Button always visible if editable? Or distinct from Send? */}
          {canEdit && planStatus !== 'APPROVED' && (
            <button
              onClick={handleSaveManDays} // Fixed handler name
              className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all text-xs tracking-wider uppercase"
            >
              Save Man-days
            </button>
          )}

          </div>
        </div>
      </div>

      {/* Monthly Major Objectives */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">Monthly Major Objectives</h2>
          {canEdit && (
            <button
              onClick={() => setShowAddObjective(!showAddObjective)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all"
            >
              <Plus size={14} /> Add Objective
            </button>
          )}
        </div>

        {showAddObjective && canEdit && (
          <div className="flex gap-3 bg-slate-100 p-4 rounded-xl">
            <input
              type="text"
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addObjective()}
              placeholder="Enter new objective..."
              className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg text-sm font-semibold focus:border-black focus:outline-none"
              autoFocus
            />
            <button
              onClick={addObjective}
              className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold uppercase hover:bg-slate-800"
            >
              Add
            </button>
          </div>
        )}

        <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-6 py-4 text-left text-xs font-black uppercase w-16">SR</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase">Objective</th>
                {showRowRemarks && (
                  <th className="px-6 py-4 text-left text-xs font-black uppercase">Remarks</th>
                )}
                <th className="px-6 py-4 text-center text-xs font-black uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {objectives.map((obj, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{idx + 1}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{obj.objective}</td>
                  {showRowRemarks && (
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {canEditRowRemarks ? (
                        editingRemarkKey === `obj_${obj.id}` ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={remarksDrafts[`obj_${obj.id}`] || ''}
                              onChange={(e) => setRemarksDrafts((prev) => ({ ...prev, [`obj_${obj.id}`]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRemark(`obj_${obj.id}`)}
                              className="w-56 px-2 py-1 border border-slate-200 rounded text-xs focus:border-slate-500 focus:outline-none"
                              placeholder="Write remark"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRemark(`obj_${obj.id}`)}
                              disabled={savingRemarkKey === `obj_${obj.id}`}
                              className="px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-bold uppercase"
                            >
                              {savingRemarkKey === `obj_${obj.id}` ? 'Saving' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingRemarkKey(null)}
                              className="px-2 py-1 text-slate-500 text-[10px] font-bold uppercase"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEditRemark(`obj_${obj.id}`)}
                            className="flex items-center gap-2 text-left"
                          >
                            <span className={rowRemarks[`obj_${obj.id}`] ? 'text-slate-700' : 'text-slate-400'}>
                              {rowRemarks[`obj_${obj.id}`] || 'No remark'}
                            </span>
                            <span className="text-blue-600 text-[10px] font-bold uppercase">
                              {rowRemarks[`obj_${obj.id}`] ? 'Edit' : 'Add'}
                            </span>
                          </button>
                        )
                      ) : (
                        <span className={rowRemarks[`obj_${obj.id}`] ? 'text-slate-700' : 'text-slate-300 text-[10px]'}>
                          {rowRemarks[`obj_${obj.id}`] || '--'}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 text-center">
                    {canEdit && (
                      <button
                        onClick={() => deleteObjective(idx, obj.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete objective"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DYNAMIC MAN-DAYS PLAN */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Man-days Plan <span className="text-slate-400">({new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()})</span>
            </h2>
            <p className="text-slate-500 text-xs font-semibold mt-1">Grand Total: {grandTotal} hrs</p>
          </div>
          {canEdit && (
            <button
              onClick={() => setShowAddDeliverable(!showAddDeliverable)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all"
            >
              <Plus size={14} /> Add IT Deliverable
            </button>
          )}
        </div>

        <div className="border-2 border-slate-900 rounded-lg overflow-x-auto">
          <table className="w-full min-w-max">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase sticky left-0 bg-slate-900 z-10">SR</th>
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase sticky left-10 bg-slate-900 z-10">IT Deliverable</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Project</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Target Date</th>
                {showRowRemarks && (
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Remarks</th>
                )}

                {/* Dynamic Employee Headers */}
                {clientEmployees.length === 0 ? (
                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase border-l border-slate-700 text-slate-400">
                    No Employees Assigned
                  </th>
                ) : (
                  clientEmployees.map(emp => (
                    <th key={emp.id} colSpan="2" className="px-4 py-3 text-center text-[10px] font-black uppercase border-l border-slate-700">
                      {emp.first_name} {emp.last_name || ''}
                    </th>
                  ))
                )}

                <th className="px-4 py-3 text-center text-[10px] font-black uppercase border-l border-slate-700">Action</th>
              </tr>
              <tr className="bg-slate-800 text-white">
                <th colSpan={showRowRemarks ? 4 : 3} className="sticky left-0 bg-slate-800 z-10"></th>
                {clientEmployees.map(emp => (
                  <React.Fragment key={emp.id}>
                    <th className="px-3 py-2 text-center text-[9px] font-bold border-l border-slate-700">Plan</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold">Off</th>
                  </React.Fragment>
                ))}
                {clientEmployees.length === 0 && <th></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* BIG TASKS */}
              {clientBigTasks.map((task, idx) => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-sm font-bold text-slate-900 text-center sticky left-0 bg-white group-hover:bg-slate-50">{idx + 1}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 sticky left-10 bg-white group-hover:bg-slate-50">
                    {task.title}
                  </td>
                  <td className="px-4 py-4 text-xs font-bold text-indigo-600 uppercase">{task.project_name}</td>
                  <td className="px-4 py-4 text-xs text-slate-600 font-mono">{task.target_date || '-'}</td>
                  {showRowRemarks && (
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {canEditRowRemarks ? (
                        editingRemarkKey === `big_${task.id}` ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={remarksDrafts[`big_${task.id}`] || ''}
                              onChange={(e) => setRemarksDrafts((prev) => ({ ...prev, [`big_${task.id}`]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRemark(`big_${task.id}`)}
                              className="w-56 px-2 py-1 border border-slate-200 rounded text-xs focus:border-slate-500 focus:outline-none"
                              placeholder="Write remark"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRemark(`big_${task.id}`)}
                              disabled={savingRemarkKey === `big_${task.id}`}
                              className="px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-bold uppercase"
                            >
                              {savingRemarkKey === `big_${task.id}` ? 'Saving' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingRemarkKey(null)}
                              className="px-2 py-1 text-slate-500 text-[10px] font-bold uppercase"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEditRemark(`big_${task.id}`)}
                            className="flex items-center gap-2 text-left"
                          >
                            <span className={rowRemarks[`big_${task.id}`] ? 'text-slate-700' : 'text-slate-400'}>
                              {rowRemarks[`big_${task.id}`] || 'No remark'}
                            </span>
                            <span className="text-blue-600 text-[10px] font-bold uppercase">
                              {rowRemarks[`big_${task.id}`] ? 'Edit' : 'Add'}
                            </span>
                          </button>
                        )
                      ) : (
                        <span className={rowRemarks[`big_${task.id}`] ? 'text-slate-700' : 'text-slate-300 text-[10px]'}>
                          {rowRemarks[`big_${task.id}`] || '--'}
                        </span>
                      )}
                    </td>
                  )}

                  {clientEmployees.map(emp => (
                    <React.Fragment key={emp.id}>
                      <td className="px-2 py-4 text-center border-l border-slate-100">
                        <input
                          type="number"
                          value={getHours(task.id, emp.id, 'on', 'big')}
                          onChange={(e) => handleHourChange(task.id, emp.id, 'on', e.target.value, 'big')}
                          disabled={!canEdit}
                          className={`w-12 text-center text-slate-800 font-bold text-xs p-1 rounded border-transparent transition-all outline-none ${!canEdit ? 'bg-transparent' : 'bg-blue-50 focus:border-blue-500 focus:bg-white'}`}
                        />
                      </td>
                      <td className="px-2 py-4 text-center">
                        <input
                          type="number"
                          value={getHours(task.id, emp.id, 'off', 'big')}
                          onChange={(e) => handleHourChange(task.id, emp.id, 'off', e.target.value, 'big')}
                          disabled={!canEdit}
                          className={`w-12 text-center text-slate-800 font-bold text-xs p-1 rounded border-transparent transition-all outline-none ${!canEdit ? 'bg-transparent' : 'bg-yellow-50 focus:border-yellow-500 focus:bg-white'}`}
                        />
                      </td>
                    </React.Fragment>
                  ))}

                </tr>
              ))}

              {/* ADDITIONAL TASKS */}
              {additionalTasks.map((task, idx) => (
                <tr key={`add-${task.id}`} className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                  <td className="px-4 py-4 text-sm font-bold text-slate-500 text-center sticky left-0 bg-white group-hover:bg-slate-50">{clientBigTasks.length + idx + 1}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 sticky left-10 bg-white group-hover:bg-slate-50">
                    {task.title}
                    <div className="text-[10px] text-green-600 font-bold uppercase mt-1">Additional Deliverable</div>
                  </td>
                  <td className="px-4 py-4 text-xs font-bold text-slate-600 uppercase">{task.project_name || '-'}</td>
                  <td className="px-4 py-4 text-xs text-slate-400 font-mono">{task.target_date || '-'}</td>
                  {showRowRemarks && (
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {canEditRowRemarks ? (
                        editingRemarkKey === `add_${task.id}` ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={remarksDrafts[`add_${task.id}`] || ''}
                              onChange={(e) => setRemarksDrafts((prev) => ({ ...prev, [`add_${task.id}`]: e.target.value }))}
                              onKeyDown={(e) => e.key === 'Enter' && handleSaveRemark(`add_${task.id}`)}
                              className="w-56 px-2 py-1 border border-slate-200 rounded text-xs focus:border-slate-500 focus:outline-none"
                              placeholder="Write remark"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRemark(`add_${task.id}`)}
                              disabled={savingRemarkKey === `add_${task.id}`}
                              className="px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-bold uppercase"
                            >
                              {savingRemarkKey === `add_${task.id}` ? 'Saving' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingRemarkKey(null)}
                              className="px-2 py-1 text-slate-500 text-[10px] font-bold uppercase"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEditRemark(`add_${task.id}`)}
                            className="flex items-center gap-2 text-left"
                          >
                            <span className={rowRemarks[`add_${task.id}`] ? 'text-slate-700' : 'text-slate-400'}>
                              {rowRemarks[`add_${task.id}`] || 'No remark'}
                            </span>
                            <span className="text-blue-600 text-[10px] font-bold uppercase">
                              {rowRemarks[`add_${task.id}`] ? 'Edit' : 'Add'}
                            </span>
                          </button>
                        )
                      ) : (
                        <span className={rowRemarks[`add_${task.id}`] ? 'text-slate-700' : 'text-slate-300 text-[10px]'}>
                          {rowRemarks[`add_${task.id}`] || '--'}
                        </span>
                      )}
                    </td>
                  )}

                  {clientEmployees.map(emp => (
                    <React.Fragment key={emp.id}>
                      <td className="px-2 py-4 text-center border-l border-slate-100">
                        <input
                          type="number"
                          value={getHours(task.id, emp.id, 'on', 'add')}
                          onChange={(e) => handleHourChange(task.id, emp.id, 'on', e.target.value, 'add')}
                          disabled={!canEdit}
                          className={`w-12 text-center text-slate-800 font-bold text-xs p-1 rounded border-transparent transition-all outline-none ${!canEdit ? 'bg-transparent' : 'bg-blue-50 focus:border-blue-500 focus:bg-white'}`}
                        />
                      </td>
                      <td className="px-2 py-4 text-center">
                        <input
                          type="number"
                          value={getHours(task.id, emp.id, 'off', 'add')}
                          onChange={(e) => handleHourChange(task.id, emp.id, 'off', e.target.value, 'add')}
                          disabled={!canEdit}
                          className={`w-12 text-center text-slate-800 font-bold text-xs p-1 rounded border-transparent transition-all outline-none ${!canEdit ? 'bg-transparent' : 'bg-yellow-50 focus:border-yellow-500 focus:bg-white'}`}
                        />
                      </td>
                    </React.Fragment>
                  ))}

                </tr>
              ))}

              {/* NEW DELIVERABLE INPUT ROW */}
              {showAddDeliverable && canEdit && (
                <tr className="bg-indigo-50">
                  <td className="text-center font-bold text-indigo-300">{clientBigTasks.length + additionalTasks.length + 1}</td>
                  <td colSpan={2 + (clientEmployees.length * 2) + (showRowRemarks ? 1 : 0)} className="p-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newDeliverable.name}
                        onChange={(e) => setNewDeliverable({ ...newDeliverable, name: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddAdditionalTask()}
                        placeholder="Enter additional deliverable..."
                        className="flex-[2] px-4 py-2 border border-indigo-200 rounded text-sm focus:border-indigo-500 focus:outline-none"
                        autoFocus
                      />
                      <select
                        value={newDeliverable.projectId}
                        onChange={(e) => setNewDeliverable({ ...newDeliverable, projectId: e.target.value })}
                        className="flex-1 px-4 py-2 border border-indigo-200 rounded text-sm focus:border-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="">Select Project</option>
                        {clientProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={newDeliverable.targetDate}
                        onChange={(e) => setNewDeliverable({ ...newDeliverable, targetDate: e.target.value })}
                        className="flex-1 px-4 py-2 border border-indigo-200 rounded text-sm focus:border-indigo-500 focus:outline-none"
                      />
                      <button onClick={handleAddAdditionalTask} className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700">
                        ADD
                      </button>
                      <button onClick={() => setShowAddDeliverable(false)} className="px-4 py-2 bg-transparent text-slate-500 hover:text-slate-800 text-xs font-bold">
                        CANCEL
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Totals Row */}
              {(clientBigTasks.length > 0 || additionalTasks.length > 0) && clientEmployees.length > 0 && (
                <tr className="bg-yellow-50 font-bold sticky bottom-0 z-10 shadow-t">
                  <td colSpan={showRowRemarks ? 4 : 3} className="px-6 py-4 text-right text-sm sticky left-0 bg-yellow-50 z-20">Total Hours</td>

                  {clientEmployees.map(emp => (
                    <React.Fragment key={emp.id}>
                      <td className="px-3 py-4 text-center text-sm border-l border-yellow-100 text-blue-800">
                        {getTotalHoursForEmp(emp.id)}
                      </td>
                      <td className="px-3 py-4 text-center text-sm text-slate-500">
                        {getTotalOffHoursForEmp(emp.id)}
                      </td>
                    </React.Fragment>
                  ))}

                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default DDTMETable;
