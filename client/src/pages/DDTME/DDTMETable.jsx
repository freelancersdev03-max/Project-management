import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Trash2, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
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

  const [objectiveDrafts, setObjectiveDrafts] = useState([]);
  const [deliverableDrafts, setDeliverableDrafts] = useState([]);

  const addObjective = async (index) => {
    const draftText = objectiveDrafts[index]?.text || '';
    if (draftText.trim()) {
      try {
        const res = await api.post('ddtme/monthly-objectives/', {
          client: clientId,
          month: selectedMonth,
          year: selectedYear,
          objective: draftText
        });
        setObjectives([...objectives, res.data]);

        // Remove the saved draft from the list
        setObjectiveDrafts(prev => prev.filter((_, i) => i !== index));
      } catch (error) {
        console.error("Error adding objective", error);
        alert("Failed to add objective");
      }
    }
  };

  const addObjectiveDraftRow = () => {
    setObjectiveDrafts(prev => [...prev, { text: '' }]);
  };

  const removeObjectiveDraftRow = (index) => {
    setObjectiveDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const addDeliverableDraftRow = () => {
    setDeliverableDrafts(prev => [...prev, { name: '', projectId: '', targetDate: '' }]);
  };

  const removeDeliverableDraftRow = (index) => {
    setDeliverableDrafts(prev => prev.filter((_, i) => i !== index));
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
        await api.delete(`ddtme/monthly-objectives/${id}/`);
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
  const [sgmName, setSgmName] = useState(null); // SGM name from project
  const [sgmId, setSgmId] = useState(null); // SGM user ID for hours mapping
  const [mlsId, setMlsId] = useState(null); // Owner (MLS) user ID for hours mapping
  const [submission, setSubmission] = useState(null); // [NEW] Submission status
  const [userRole, setUserRole] = useState(null); // To determine if SGM or Employee
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAllowingEdit, setIsAllowingEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rowRemarks, setRowRemarks] = useState({});
  const [remarksDrafts, setRemarksDrafts] = useState({});
  const [editingRemarkKey, setEditingRemarkKey] = useState(null);
  const [savingRemarkKey, setSavingRemarkKey] = useState(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const hasInitializedManDayData = useRef(false);
  const [editingDeliverableKey, setEditingDeliverableKey] = useState(null);
  const [deliverableDraft, setDeliverableDraft] = useState({
    title: '',
    projectId: '',
    targetDate: ''
  });
  const [savingDeliverableKey, setSavingDeliverableKey] = useState(null);
  const [deletingDeliverableKey, setDeletingDeliverableKey] = useState(null);

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

  const getUserContextFromToken = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return { role: null, userId: null };
    const payload = token.split('.')[1];
    if (!payload) return { role: null, userId: null };
    try {
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized);
      const data = JSON.parse(decoded);
      return {
        role: data.role || null,
        userId: data.user_id || data.id || null
      };
    } catch (error) {
      return { role: null, userId: null };
    }
  };

  useEffect(() => {
    if (clientId) {
      const fetchData = async () => {
        try {
          // Reset per-client derived SGM so stale values don't leak across clients/months.
          setSgmName(null);
          setSgmId(null);

          let resolvedSgmName = null;
          let resolvedSgmId = null;

          // 0. Get User Role (Independent try/catch)
          try {
            // accounts.urls is included under 'api/', so 'me/' maps to /api/me/
            const profileRes = await api.get('accounts/me/');
            setUserRole(profileRes.data.role || null);
            setCurrentUserId(profileRes.data.id || null);
          } catch (err) {
            const tokenContext = getUserContextFromToken();
            if (tokenContext.role) {
              setUserRole(tokenContext.role);
            }
            setCurrentUserId(tokenContext.userId || null);
            console.error("Failed to fetch user role", err);
          }

          // 0.5 Prefer client-level assigned SGM as source of truth.
          try {
            const clientRes = await api.get(`clients/${clientId}/`);
            const assignedSgms = Array.isArray(clientRes?.data?.assigned_sgms_details)
              ? clientRes.data.assigned_sgms_details
              : [];
            const primarySgm = assignedSgms[0] || null;

            if (primarySgm) {
              resolvedSgmName =
                primarySgm.shortform ||
                primarySgm.full_name ||
                primarySgm.username ||
                primarySgm.email ||
                null;
              resolvedSgmId = primarySgm.id || null;
            }
          } catch (clientErr) {
            console.error('Failed to fetch client details for SGM mapping', clientErr);
          }

          // 1. Fetch Big Tasks (Rows) with Month/Year Filter
          const tasksRes = await api.get(`ddtme/big-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`);
          const tasksData = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);
          setClientBigTasks(tasksData);

          // Fallback to task-level SGM only if client-level assignment is unavailable.
          if (!resolvedSgmName && tasksData.length > 0 && tasksData[0].sgm_name && tasksData[0].sgm_name !== '-') {
            resolvedSgmName = tasksData[0].sgm_name;
          }

          // 1.2 Fetch Projects
          const projRes = await api.get(`projects/?client_id=${clientId}`);
          const projDataRaw = Array.isArray(projRes.data) ? projRes.data : (projRes.data.results || []);
          const projData = Array.isArray(projDataRaw)
            ? projDataRaw.filter((project) => String(project?.client) === String(clientId))
            : [];
          setClientProjects(projData);

          if (!resolvedSgmId && Array.isArray(projData) && projData.length > 0) {
            const projectWithSgmId = projData.find((project) => project?.assigned_sgm || project?.assigned_sgm_details?.id);
            if (projectWithSgmId) {
              resolvedSgmId = projectWithSgmId.assigned_sgm || projectWithSgmId.assigned_sgm_details?.id || null;
            }
          }

          if (!resolvedSgmName && Array.isArray(projData)) {
            const projectWithSgm = projData.find((project) =>
              project?.assigned_sgm_name ||
              project?.assigned_sgm_details?.username ||
              project?.assigned_sgm_email
            );

            if (projectWithSgm) {
              resolvedSgmName =
                projectWithSgm.assigned_sgm_name ||
                projectWithSgm.assigned_sgm_details?.username ||
                projectWithSgm.assigned_sgm_email ||
                null;
            }
          }

          if (resolvedSgmName) {
            setSgmName(resolvedSgmName);
          }
          if (resolvedSgmId) {
            setSgmId(resolvedSgmId);
          }

          // 1.3 Fetch HQEPL users and pick owner (MLS)
          try {
            const hqeplRes = await api.get('hqepl/');
            const hqeplData = Array.isArray(hqeplRes.data) ? hqeplRes.data : (hqeplRes.data.results || []);
            const ownerUser = hqeplData.find((user) => {
              const haystack = `${user?.full_name || ''} ${user?.email || ''}`;
              return /mls/i.test(haystack);
            }) || hqeplData[0] || null;
            setMlsId(ownerUser?.id || null);
          } catch (ownerErr) {
            console.error('Failed to fetch HQEPL users', ownerErr);
            setMlsId(null);
          }

          // 1.5 Fetch Additional Tasks
          const addTasksRes = await api.get(`ddtme/additional-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`);
          const addTasksData = Array.isArray(addTasksRes.data) ? addTasksRes.data : (addTasksRes.data.results || []);
          setAdditionalTasks(addTasksData);

          // 1.8 Fetch Objectives
          const objRes = await api.get(`ddtme/monthly-objectives/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`);
          const objData = Array.isArray(objRes.data) ? objRes.data : (objRes.data.results || []);
          setObjectives(objData);

          // 2. Fetch Client Employees (Columns)
          const empsRes = await api.get(`clients/${clientId}/employees/`);
          const empsData = Array.isArray(empsRes.data) ? empsRes.data : (empsRes.data.results || []);
          const normalizedEmployees = empsData.map((employee) => ({
            ...employee,
            employee_id: employee.employee_id ?? employee.id
          }));
          setClientEmployees(normalizedEmployees);

          // 3. Fetch Submission Status
          const subRes = await api.get(`ddtme/submissions/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`);
          const subData = Array.isArray(subRes.data) ? subRes.data : (subRes.data.results || []);
          if (subData.length > 0) {
            setSubmission(subData[0]);
          } else {
            setSubmission(null);
          }

          // 4. Fetch Man-Day Entries
          const entriesRes = await api.get(`ddtme/man-day-entries/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`);

          // Debug: Log full response to see structure
          console.log('FULL entries response:', entriesRes);
          console.log('Response data type:', typeof entriesRes.data);
          console.log('Is array?', Array.isArray(entriesRes.data));
          console.log('Response data:', entriesRes.data);

          // Handle both paginated and non-paginated responses
          let entriesData = [];
          if (Array.isArray(entriesRes.data)) {
            entriesData = entriesRes.data;
          } else if (entriesRes.data && Array.isArray(entriesRes.data.results)) {
            entriesData = entriesRes.data.results;
          } else if (entriesRes.data && typeof entriesRes.data === 'object') {
            // If it's an object but not paginated, try to extract
            entriesData = entriesRes.data.results || [];
          }

          console.log('Normalized entriesData:', entriesData);
          console.log('Number of entries:', entriesData.length);

          // Populate manDayData
          const mapping = {};
          entriesData.forEach(entry => {
            const taskId = entry.big_task || entry.additional_task;
            const typePrefix = entry.big_task ? 'big' : 'add';
            const personKey = entry.employee_user_id
              ? `u-${entry.employee_user_id}`
              : (entry.employee ? `e-${entry.employee}` : null);
            if (!personKey) {
              return;
            }
            const key = `${typePrefix}_${taskId}_${personKey}`;
            mapping[key] = {
              on: entry.plan_hours == null ? '0' : String(entry.plan_hours),
              off: entry.off_hours == null ? '0' : String(entry.off_hours)
            };
            console.log('Adding manday entry:', { key, entry });
          });
          setManDayData(mapping);
          console.log('Final manDayData mapping:', mapping);

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

  const parseHourValue = (rawValue) => {
    const normalized = String(rawValue ?? '').replace(',', '.').trim();
    if (!normalized || normalized === '.') {
      return 0;
    }
    const parsed = Number(normalized);
    if (Number.isNaN(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  };

  const roundHours = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

  const handleHourChange = (taskId, empId, field, value, type = 'big') => {
    const normalizedValue = String(value ?? '').replace(',', '.').trim();

    // Allow typing in-progress decimals like "0." while still blocking invalid chars.
    if (!/^\d*(\.\d{0,2})?$/.test(normalizedValue)) {
      return;
    }

    const key = `${type}_${taskId}_${empId}`;
    setManDayData(prev => ({
      ...prev,
      [key]: {
        ...prev[key] || { on: '0', off: '0' },
        [field]: normalizedValue === '.' ? '0.' : normalizedValue
      }
    }));
  };

  const getHours = (taskId, empId, field, type = 'big') => {
    return manDayData[`${type}_${taskId}_${empId}`]?.[field] ?? 0;
  };

  const getUserId = (employee) => employee?.user_id ?? null;
  const toUserKey = (userId) => (userId ? `u-${userId}` : null);

  const mlsPersonKey = toUserKey(mlsId) || 'mls';
  const sgmPersonKey = toUserKey(sgmId) || 'sgm';

  const reservedPersonKeys = new Set([
    mlsPersonKey,
    sgmName ? sgmPersonKey : null
  ].filter(Boolean));

  const employeePeople = Array.isArray(clientEmployees)
    ? clientEmployees
      .map((employee) => ({
        id: toUserKey(getUserId(employee)),
        label: employee.shortform || `${employee.first_name || ''} ${employee.last_name || ''}`.trim()
      }))
      .filter((person) => person.id && !reservedPersonKeys.has(person.id))
    : [];

  const tablePeople = [
    { id: mlsPersonKey, label: 'MLS' },
    ...(sgmName ? [{ id: sgmPersonKey, label: sgmName }] : []),
    ...employeePeople
  ];

  const getTotalHoursForEmp = (empId) => {
    let total = 0;
    if (Array.isArray(clientBigTasks)) {
      clientBigTasks.forEach(task => {
        total += parseHourValue(getHours(task.id, empId, 'on', 'big'));
      });
    }
    if (Array.isArray(additionalTasks)) {
      additionalTasks.forEach(task => {
        total += parseHourValue(getHours(task.id, empId, 'on', 'add'));
      });
    }
    return roundHours(total);
  };

  const getTotalOffHoursForEmp = (empId) => {
    let total = 0;
    if (Array.isArray(clientBigTasks)) {
      clientBigTasks.forEach(task => {
        total += parseHourValue(getHours(task.id, empId, 'off', 'big'));
      });
    }
    if (Array.isArray(additionalTasks)) {
      additionalTasks.forEach(task => {
        total += parseHourValue(getHours(task.id, empId, 'off', 'add'));
      });
    }
    return roundHours(total);
  };

  const getZeroHourDeliverables = () => {
    const allDeliverables = [
      ...clientBigTasks.map((task) => ({
        id: task.id,
        type: 'big',
        title: task.title || `Deliverable ${task.id}`
      })),
      ...additionalTasks.map((task) => ({
        id: task.id,
        type: 'add',
        title: task.title || `Deliverable ${task.id}`
      }))
    ];

    return allDeliverables.filter((task) => {
      const totalTaskHours = tablePeople.reduce((sum, person) => {
        const onHours = parseHourValue(getHours(task.id, person.id, 'on', task.type));
        const offHours = parseHourValue(getHours(task.id, person.id, 'off', task.type));
        return sum + onHours + offHours;
      }, 0);

      return totalTaskHours === 0;
    });
  };

  const grandTotal = Array.isArray(clientEmployees)
    ? clientEmployees.reduce((acc, emp) => acc + getTotalHoursForEmp(toUserKey(getUserId(emp))), 0)
    : 0;

  // --- ACTIONS ---

  const handleAddAdditionalTask = async (index) => {
    const draft = deliverableDrafts[index];
    if (!draft || !draft.name.trim()) return;
    try {
      const res = await api.post('ddtme/additional-tasks/', {
        client: clientId,
        month: selectedMonth,
        year: selectedYear,
        title: draft.name,
        project: draft.projectId || null,
        target_date: draft.targetDate || null
      });
      setAdditionalTasks([...additionalTasks, res.data]);

      // Remove the draft row upon success
      setDeliverableDrafts(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("Error adding task", error);
      alert("Failed to add task");
    }
  };

  const handleSaveManDays = async (options = {}) => {
    const { showAlerts = true } = options;
    setIsSaving(true);
    try {
      const entries = [];
      Object.keys(manDayData).forEach(key => {
        // key format: type_taskId_empId
        const [type, taskId, ...personKeyParts] = key.split('_');
        const empId = personKeyParts.join('_');
        const data = manDayData[key];
        entries.push({
          task_type: type,
          task_id: taskId,
          employee_id: empId,
          month: selectedMonth,
          year: selectedYear,
          plan_hours: roundHours(parseHourValue(data.on)),
          off_hours: roundHours(parseHourValue(data.off))
        });
      });

      const saveRes = await api.post('ddtme/man-day-entries/bulk_update_hours/', { entries });
      if (Array.isArray(saveRes?.data?.failed) && saveRes.data.failed.length > 0) {
        console.error('Man-day save failed entries:', saveRes.data.failed);
        if (showAlerts) {
          alert('Failed to save some hours. Please retry.');
        }
        return false;
      }
      if (showAlerts) {
        alert("Saved successfully!");
      }
      return true;
    } catch (error) {
      console.error("Error saving man-days", error);
      if (showAlerts) {
        alert("Failed to save hours");
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    hasInitializedManDayData.current = false;
  }, [clientId, selectedMonth, selectedYear]);

  useEffect(() => {
    const status = submission?.status ? String(submission.status).toUpperCase() : 'DRAFT';
    const canAutoSave = (
      status !== 'APPROVED' && (
        (userRole === 'EMPLOYEE' || userRole === 'ADMIN') ? status !== 'SUBMITTED' :
          (userRole === 'SGM' || userRole === 'HQEPL')
      )
    );

    if (!canAutoSave) {
      return;
    }

    if (!hasInitializedManDayData.current) {
      hasInitializedManDayData.current = true;
      return;
    }

    const hasEntries = Object.keys(manDayData).length > 0;
    if (!hasEntries || isSaving) {
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSaveManDays({ showAlerts: false });
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [manDayData, userRole, submission?.status, isSaving]);

  const handleSendForApproval = async () => {
    const zeroHourDeliverables = getZeroHourDeliverables();
    if (zeroHourDeliverables.length > 0) {
      const deliverablePreview = zeroHourDeliverables
        .slice(0, 3)
        .map((task) => task.title)
        .join(', ');
      const extraCount = zeroHourDeliverables.length - 3;
      const overflowText = extraCount > 0 ? ` and ${extraCount} more` : '';

      alert(
        `Cannot send for approval. For a deliverable, all members cannot have 0 hrs.\nPlease update: ${deliverablePreview}${overflowText}.`
      );
      return;
    }

    if (!window.confirm("Are you sure you want to submit the DDTME plan? This will notify the SGM.")) return;
    setIsSubmitting(true);
    try {
      const saveOk = await handleSaveManDays({ showAlerts: false });
      if (!saveOk) {
        alert('Unable to submit because saving latest hours failed. Please retry.');
        return;
      }

      if (submission?.id && submission?.status === 'Rejected') {
        await api.patch(`ddtme/submissions/${submission.id}/`, { remarks: '' });
        setRowRemarks({});
        setRemarksDrafts({});
      }
      const res = await api.post('ddtme/submissions/submit/', {
        client_id: clientId,
        month: selectedMonth,
        year: selectedYear
      });
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
      const res = await api.post(`ddtme/submissions/${submission.id}/approve/`, {});
      setSubmission(res.data);
      alert("Approved!");
    } catch (error) {
      console.error("Error approving", error);
      alert("Failed to approve");
    }
  };

  const handleAllowEdit = async () => {
    if (!submission?.id) return;
    if (!window.confirm("Allow editing again? This will move the plan to Draft and it must be submitted for approval again.")) return;

    setIsAllowingEdit(true);
    try {
      const res = await api.patch(`ddtme/submissions/${submission.id}/`, {
        status: 'Draft',
        approved_by: null
      });

      setSubmission(res.data);
      setIsRejecting(false);
      alert('Edit access enabled. Employee can update DDTME and submit for approval again.');
    } catch (error) {
      console.error('Error enabling edit mode', error);
      alert('Failed to enable edit mode');
    } finally {
      setIsAllowingEdit(false);
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
      const payload = buildRemarksPayload(rowRemarks);
      const res = await api.post(`ddtme/submissions/${submission.id}/reject/`, { remarks: payload });
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
      const payload = buildRemarksPayload(nextPerRow);
      const res = await api.patch(`ddtme/submissions/${submission.id}/`, { remarks: payload });
      setSubmission(res.data);
      setEditingRemarkKey(null);
    } catch (error) {
      console.error("Error saving remark", error);
      alert("Failed to save remark");
    } finally {
      setSavingRemarkKey(null);
    }
  };

  const handleStartEditDeliverable = (type, task) => {
    const key = `${type}_${task.id}`;
    setEditingDeliverableKey(key);
    setDeliverableDraft({
      title: (type === 'big' ? (task.ddtme_title || task.title) : task.title) || '',
      projectId: task.project ? String(task.project) : '',
      targetDate: task.target_date || ''
    });
  };

  const handleCancelEditDeliverable = () => {
    setEditingDeliverableKey(null);
    setDeliverableDraft({ title: '', projectId: '', targetDate: '' });
  };

  const handleSaveDeliverable = async (type, taskId) => {
    const key = `${type}_${taskId}`;
    const nextTitle = deliverableDraft.title.trim();
    const nextProjectId = deliverableDraft.projectId ? parseInt(deliverableDraft.projectId, 10) : null;
    const nextTargetDate = deliverableDraft.targetDate || null;

    if (!nextTitle) {
      alert('Deliverable title cannot be empty.');
      return;
    }

    if (type === 'big' && !nextProjectId) {
      alert('Project is required for deliverable.');
      return;
    }

    setSavingDeliverableKey(key);
    try {
      const endpoint = type === 'big' ? `ddtme/big-tasks/${taskId}/` : `ddtme/additional-tasks/${taskId}/`;
      const selectedProject = clientProjects.find((project) => String(project.id) === String(deliverableDraft.projectId));

      // For BigTasks, save the edited title as ddtme_title so it doesn't overwrite the original title
      const payload = type === 'big'
        ? { ddtme_title: nextTitle, project: nextProjectId, target_date: nextTargetDate }
        : { title: nextTitle, project: nextProjectId, target_date: nextTargetDate };

      await api.patch(endpoint, payload);

      if (type === 'big') {
        setClientBigTasks((prev) => prev.map((task) => (
          task.id === taskId
            ? {
              ...task,
              ddtme_title: nextTitle,
              project: nextProjectId,
              project_name: selectedProject?.name || '-',
              target_date: nextTargetDate
            }
            : task
        )));
      } else {
        setAdditionalTasks((prev) => prev.map((task) => (
          task.id === taskId
            ? {
              ...task,
              title: nextTitle,
              project: nextProjectId,
              project_name: selectedProject?.name || '-',
              target_date: nextTargetDate
            }
            : task
        )));
      }

      setEditingDeliverableKey(null);
      setDeliverableDraft({ title: '', projectId: '', targetDate: '' });
    } catch (error) {
      console.error('Error updating deliverable', error);
      alert('Failed to update deliverable');
    } finally {
      setSavingDeliverableKey(null);
    }
  };

  const handleDeleteDeliverableTask = async (type, taskId) => {
    if (!window.confirm('Delete this deliverable?')) return;

    const key = `${type}_${taskId}`;
    setDeletingDeliverableKey(key);
    try {
      const endpoint = type === 'big' ? `ddtme/big-tasks/${taskId}/` : `ddtme/additional-tasks/${taskId}/`;

      await api.delete(endpoint);

      if (type === 'big') {
        setClientBigTasks((prev) => prev.filter((task) => task.id !== taskId));
      } else {
        setAdditionalTasks((prev) => prev.filter((task) => task.id !== taskId));
      }

      setManDayData((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((entryKey) => {
          if (entryKey.startsWith(`${type}_${taskId}_`)) {
            delete next[entryKey];
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Error deleting deliverable', error);
      alert('Failed to delete deliverable');
    } finally {
      setDeletingDeliverableKey(null);
    }
  };

  // derived state for read-only
  const isReadOnly = submission?.status === 'Submitted' || submission?.status === 'Approved';

  // Derived status normalized
  const planStatus = submission?.status ? submission.status.toUpperCase() : 'DRAFT';
  const parsedRemarks = parseSubmissionRemarks(submission?.remarks);
  const rejectionRemarksText = parsedRemarks.legacy;
  const showRowRemarks = planStatus !== 'APPROVED';
  const currentPersonKey = toUserKey(currentUserId);

  // Permissions
  const canEdit = !isReadOnly && (userRole === 'EMPLOYEE' || userRole === 'ADMIN');
  const canEditHoursForPerson = (personId) => {
    if (planStatus === 'APPROVED') {
      return false;
    }

    if (userRole === 'ADMIN' || userRole === 'EMPLOYEE') {
      return planStatus !== 'SUBMITTED';
    }

    if (userRole === 'SGM' || userRole === 'HQEPL') {
      return Boolean(currentPersonKey) && personId === currentPersonKey;
    }

    return false;
  };

  const canEditRowRemarks = showRowRemarks && (userRole === 'SGM' || userRole === 'ADMIN');

  // SGM and ADMIN can approve/reject. EMPLOYEE cannot.
  const canApprove = userRole === 'SGM' && planStatus === 'SUBMITTED';
  const canAllowEdit = (userRole === 'SGM' || userRole === 'ADMIN') && planStatus === 'APPROVED';

  const canSubmit = (planStatus === 'DRAFT' || planStatus === 'REJECTED') && (userRole === 'EMPLOYEE' || userRole === 'ADMIN');

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">

      {/* HEADER */}
      {/* HEADER: BIG BAR */}
      <div className="relative flex items-center justify-between gap-4 px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">

        {/* Left Group: Back + Status */}
        <div className="flex items-center gap-6 z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-200"
            title="Go Back"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="flex items-center gap-3">
            {planStatus === 'SUBMITTED' && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-black tracking-widest uppercase rounded-full border border-yellow-200">
                Submitted
              </span>
            )}
            {planStatus === 'APPROVED' && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-[10px] font-black tracking-widest uppercase rounded-full border border-green-200">
                Approved
              </span>
            )}
            {planStatus === 'REJECTED' && (
              <span className="px-3 py-1 bg-red-100 text-red-800 text-[10px] font-black tracking-widest uppercase rounded-full border border-red-200">
                Rejected
              </span>
            )}
            {submission?.approved_by && (
              <span className="px-3 py-1 bg-blue-50 text-blue-800 text-[10px] font-black tracking-widest uppercase rounded-full border border-blue-200">
                Approved By: {submission.approved_by_name || submission.approved_by}
              </span>
            )}
            {/* Debug Info (Hidden) */}
            <span className="text-[10px] text-slate-300 font-mono hidden xl:inline-block">
              Role={userRole} | Status={submission?.status}
            </span>
          </div>
        </div>

        {/* CENTER Group: Title */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-0 pointer-events-none">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">DDTME</h1>
        </div>

        {/* Right Group: SGM + Month + Actions */}
        <div className="flex items-center gap-6 z-10">

          {/* SGM Name */}
          {sgmName && (
            <div className="hidden lg:flex flex-col items-end border-r border-slate-200 pr-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SGM</span>
              <span className="text-xs font-bold text-slate-700 uppercase">{sgmName}</span>
            </div>
          )}

          {/* Month Controls */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-full p-1.5 shadow-sm">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 w-24 text-center">
              {buildMonthLabel(selectedMonth, selectedYear)}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* REJECTION REMARKS POPUP/IN-LINE */}
            {planStatus === 'REJECTED' && rejectionRemarksText && (
              <div className="hidden xl:block bg-red-50 border border-red-200 text-red-700 px-3 py-1 rounded text-xs max-w-[200px] truncate" title={rejectionRemarksText}>
                {rejectionRemarksText}
              </div>
            )}

            {/* Submit / Approve / Reject Buttons */}
            {canSubmit && !canApprove && (
              <button
                onClick={handleSendForApproval}
                disabled={isSubmitting}
                className="px-5 py-2 bg-black text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 hover:-translate-y-0.5 transition-all text-[11px] tracking-wider uppercase"
              >
                {isSubmitting ? '...' : (planStatus === 'REJECTED' ? 'Resubmit' : 'Send Approval')}
              </button>
            )}

            {canAllowEdit && (
              <button
                onClick={handleAllowEdit}
                disabled={isAllowingEdit}
                className="px-5 py-2 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-200 hover:bg-amber-600 hover:-translate-y-0.5 transition-all text-[11px] tracking-wider uppercase disabled:opacity-60"
              >
                {isAllowingEdit ? '...' : 'Allow Edit'}
              </button>
            )}

            {canApprove && !isRejecting && (
              <>
                <button
                  className="px-5 py-2 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-green-600 hover:-translate-y-0.5 transition-all text-[11px] tracking-wider uppercase"
                  onClick={handleApprove}
                >
                  Approve
                </button>
                <button
                  className="px-5 py-2 bg-red-50 text-red-600 border border-red-200 font-bold rounded-xl hover:bg-red-100 hover:-translate-y-0.5 transition-all text-[11px] tracking-wider uppercase"
                  onClick={handleStartRejecting}
                >
                  Reject
                </button>
              </>
            )}

            {canApprove && isRejecting && (
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-red-200 shadow-lg absolute right-0 top-full mt-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-[10px] uppercase"
                  onClick={handleSubmitRejection}
                >
                  Confirm Reject
                </button>
                <button
                  className="px-3 py-2 text-slate-500 hover:text-slate-800 font-bold text-[10px] uppercase"
                  onClick={handleCancelRejecting}
                >
                  Cancel
                </button>
              </div>
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
              onClick={addObjectiveDraftRow}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all"
            >
              <Plus size={14} /> Add Objective
            </button>
          )}
        </div>


        <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-6 py-4 text-left text-xs font-black uppercase w-16">SR</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase">Objective</th>
                {showRowRemarks && (
                  <th className="px-6 py-4 text-left text-xs font-black uppercase">Comments</th>
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

              {/* NEW OBJECTIVE INPUT ROW */}

              {/* NEW OBJECTIVE INPUT ROWS */}
              {objectiveDrafts.map((draft, dIdx) => (
                <tr key={`draft-${dIdx}`} className="bg-slate-50">
                  <td className="px-6 py-4 text-sm font-bold text-slate-400">{objectives.length + dIdx + 1}</td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={draft.text}
                      onChange={(e) => {
                        const next = [...objectiveDrafts];
                        next[dIdx].text = e.target.value;
                        setObjectiveDrafts(next);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && addObjective(dIdx)}
                      placeholder="Enter new objective..."
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:border-black focus:outline-none"
                      autoFocus={dIdx === objectiveDrafts.length - 1}
                    />
                  </td>
                  {showRowRemarks && (
                    <td className="px-6 py-4 text-sm text-slate-300">--</td>
                  )}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => addObjective(dIdx)}
                        className="px-3 py-1.5 bg-black text-white rounded text-[10px] font-bold uppercase hover:bg-slate-800"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => removeObjectiveDraftRow(dIdx)}
                        className="text-slate-500 hover:text-slate-800 text-[10px] font-bold uppercase"
                      >
                        Cancel
                      </button>
                    </div>
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
          </div>
          {canEdit && (
            <button
              onClick={addDeliverableDraftRow}
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
                <th className="px-6 py-3 text-left text-[10px] font-black uppercase sticky left-10 bg-slate-900 z-10">Deliverable</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Project</th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Target Date</th>
                {showRowRemarks && (
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Comments</th>
                )}

                {/* Dynamic People Headers (SGM + Employees) */}
                {tablePeople.length === 0 ? (
                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase border-l border-slate-700 text-slate-400">
                    No Employees Assigned
                  </th>
                ) : (
                  tablePeople.map((person) => (
                    <th
                      key={person.id}
                      colSpan="2"
                      className="px-4 py-3 text-center text-[10px] font-black uppercase border-l border-slate-700"
                    >
                      {person.label}
                    </th>
                  ))
                )}

              </tr>
              <tr className="bg-slate-800 text-white">
                <th className="sticky left-0 bg-slate-800 z-10"></th>
                <th className="sticky left-10 bg-slate-800 z-10"></th>
                <th></th>
                <th></th>
                {showRowRemarks && <th></th>}
                {tablePeople.map((person) => (
                  <React.Fragment key={`sub-${person.id}`}>
                    <th className="px-3 py-2 text-center text-[9px] font-bold border-l border-slate-700">Onsite Hrs</th>
                    <th className="px-3 py-2 text-center text-[9px] font-bold">Offsite Hrs</th>
                  </React.Fragment>
                ))}
                {tablePeople.length === 0 && <th></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* BIG TASKS */}
              {clientBigTasks.map((task, idx) => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4 text-sm font-bold text-slate-900 text-center sticky left-0 bg-white group-hover:bg-slate-50">{idx + 1}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 sticky left-10 bg-white group-hover:bg-slate-50">
                    {editingDeliverableKey === `big_${task.id}` ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={deliverableDraft.title}
                          onChange={(e) => setDeliverableDraft((prev) => ({ ...prev, title: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveDeliverable('big', task.id)}
                          className="w-56 px-2 py-1 border border-slate-200 rounded text-xs focus:border-slate-500 focus:outline-none"
                          autoFocus
                        />
                        <select
                          value={deliverableDraft.projectId}
                          onChange={(e) => setDeliverableDraft((prev) => ({ ...prev, projectId: e.target.value }))}
                          className="w-40 px-2 py-1 border border-slate-200 rounded text-xs focus:border-slate-500 focus:outline-none bg-white"
                        >
                          <option value="">Select Project</option>
                          {clientProjects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={deliverableDraft.targetDate}
                          onChange={(e) => setDeliverableDraft((prev) => ({ ...prev, targetDate: e.target.value }))}
                          className="w-36 px-2 py-1 border border-slate-200 rounded text-xs focus:border-slate-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveDeliverable('big', task.id)}
                          disabled={savingDeliverableKey === `big_${task.id}`}
                          className="px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-bold uppercase"
                        >
                          {savingDeliverableKey === `big_${task.id}` ? 'Saving' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEditDeliverable}
                          className="px-2 py-1 text-slate-500 text-[10px] font-bold uppercase"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <span>{task.ddtme_title || task.title}</span>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStartEditDeliverable('big', task)}
                                className="p-1 rounded text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                title="Edit deliverable"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteDeliverableTask('big', task.id)}
                                disabled={deletingDeliverableKey === `big_${task.id}`}
                                className="p-1 rounded text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-red-300"
                                title="Delete deliverable"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
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

                  {tablePeople.map((person) => {
                    const personId = person.id;
                    const canEditPersonHours = canEditHoursForPerson(personId);
                    return (
                      <React.Fragment key={`big-${task.id}-${personId}`}>
                        <td className="px-2 py-4 text-center border-l border-slate-100">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={getHours(task.id, personId, 'on', 'big')}
                            onChange={(e) => handleHourChange(task.id, personId, 'on', e.target.value, 'big')}
                            disabled={!canEditPersonHours}
                            className={`w-12 no-number-spinner text-center text-slate-800 font-bold text-xs p-1 rounded border-transparent transition-all outline-none ${!canEditPersonHours ? 'bg-transparent' : 'bg-blue-50 focus:border-blue-500 focus:bg-white'}`}
                          />
                        </td>
                        <td className="px-2 py-4 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={getHours(task.id, personId, 'off', 'big')}
                            onChange={(e) => handleHourChange(task.id, personId, 'off', e.target.value, 'big')}
                            disabled={!canEditPersonHours}
                            className={`w-12 no-number-spinner text-center text-slate-800 font-bold text-xs p-1 rounded border-transparent transition-all outline-none ${!canEditPersonHours ? 'bg-transparent' : 'bg-yellow-50 focus:border-yellow-500 focus:bg-white'}`}
                          />
                        </td>
                      </React.Fragment>
                    );
                  })}

                </tr>
              ))}

              {/* ADDITIONAL TASKS */}
              {additionalTasks.map((task, idx) => (
                <tr key={`add-${task.id}`} className="hover:bg-slate-50 transition-colors bg-slate-50/50">
                  <td className="px-4 py-4 text-sm font-bold text-slate-500 text-center sticky left-0 bg-white group-hover:bg-slate-50">{clientBigTasks.length + idx + 1}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700 sticky left-10 bg-white group-hover:bg-slate-50">
                    {editingDeliverableKey === `add_${task.id}` ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="text"
                          value={deliverableDraft.title}
                          onChange={(e) => setDeliverableDraft((prev) => ({ ...prev, title: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveDeliverable('add', task.id)}
                          className="w-56 px-2 py-1 border border-slate-200 rounded text-xs focus:border-slate-500 focus:outline-none"
                          autoFocus
                        />
                        <select
                          value={deliverableDraft.projectId}
                          onChange={(e) => setDeliverableDraft((prev) => ({ ...prev, projectId: e.target.value }))}
                          className="w-40 px-2 py-1 border border-slate-200 rounded text-xs focus:border-slate-500 focus:outline-none bg-white"
                        >
                          <option value="">Select Project</option>
                          {clientProjects.map((project) => (
                            <option key={project.id} value={project.id}>{project.name}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={deliverableDraft.targetDate}
                          onChange={(e) => setDeliverableDraft((prev) => ({ ...prev, targetDate: e.target.value }))}
                          className="w-36 px-2 py-1 border border-slate-200 rounded text-xs focus:border-slate-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveDeliverable('add', task.id)}
                          disabled={savingDeliverableKey === `add_${task.id}`}
                          className="px-2 py-1 bg-slate-900 text-white rounded text-[10px] font-bold uppercase"
                        >
                          {savingDeliverableKey === `add_${task.id}` ? 'Saving' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEditDeliverable}
                          className="px-2 py-1 text-slate-500 text-[10px] font-bold uppercase"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <span>{task.title}</span>
                          {canEdit && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStartEditDeliverable('add', task)}
                                className="p-1 rounded text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                title="Edit deliverable"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteDeliverableTask('add', task.id)}
                                disabled={deletingDeliverableKey === `add_${task.id}`}
                                className="p-1 rounded text-red-600 hover:bg-red-50 hover:text-red-700 disabled:text-red-300"
                                title="Delete deliverable"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
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

                  {tablePeople.map((person) => {
                    const personId = person.id;
                    const canEditPersonHours = canEditHoursForPerson(personId);
                    return (
                      <React.Fragment key={`add-${task.id}-${personId}`}>
                        <td className="px-2 py-4 text-center border-l border-slate-100">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={getHours(task.id, personId, 'on', 'add')}
                            onChange={(e) => handleHourChange(task.id, personId, 'on', e.target.value, 'add')}
                            disabled={!canEditPersonHours}
                            className={`w-12 no-number-spinner text-center text-slate-800 font-bold text-xs p-1 rounded border-transparent transition-all outline-none ${!canEditPersonHours ? 'bg-transparent' : 'bg-blue-50 focus:border-blue-500 focus:bg-white'}`}
                          />
                        </td>
                        <td className="px-2 py-4 text-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={getHours(task.id, personId, 'off', 'add')}
                            onChange={(e) => handleHourChange(task.id, personId, 'off', e.target.value, 'add')}
                            disabled={!canEditPersonHours}
                            className={`w-12 no-number-spinner text-center text-slate-800 font-bold text-xs p-1 rounded border-transparent transition-all outline-none ${!canEditPersonHours ? 'bg-transparent' : 'bg-yellow-50 focus:border-yellow-500 focus:bg-white'}`}
                          />
                        </td>
                      </React.Fragment>
                    );
                  })}

                </tr>
              ))}

              {/* NEW DELIVERABLE INPUT ROWS */}
              {deliverableDrafts.map((draft, dIdx) => (
                <tr key={`add-draft-${dIdx}`} className="bg-indigo-50">
                  <td className="text-center font-bold text-indigo-300">{clientBigTasks.length + additionalTasks.length + dIdx + 1}</td>
                  <td colSpan={3 + (tablePeople.length * 2) + (showRowRemarks ? 1 : 0)} className="p-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) => {
                          const next = [...deliverableDrafts];
                          next[dIdx].name = e.target.value;
                          setDeliverableDrafts(next);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddAdditionalTask(dIdx)}
                        placeholder="Enter deliverable..."
                        className="flex-[2] px-4 py-2 border border-indigo-200 rounded text-sm focus:border-indigo-500 focus:outline-none"
                        autoFocus={dIdx === deliverableDrafts.length - 1}
                      />
                      <select
                        value={draft.projectId}
                        onChange={(e) => {
                          const next = [...deliverableDrafts];
                          next[dIdx].projectId = e.target.value;
                          setDeliverableDrafts(next);
                        }}
                        className="flex-1 px-4 py-2 border border-indigo-200 rounded text-sm focus:border-indigo-500 focus:outline-none bg-white"
                      >
                        <option value="">Select Project</option>
                        {clientProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={draft.targetDate}
                        onChange={(e) => {
                          const next = [...deliverableDrafts];
                          next[dIdx].targetDate = e.target.value;
                          setDeliverableDrafts(next);
                        }}
                        className="flex-1 px-4 py-2 border border-indigo-200 rounded text-sm focus:border-indigo-500 focus:outline-none"
                      />
                      <button onClick={() => handleAddAdditionalTask(dIdx)} className="px-4 py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700">
                        ADD
                      </button>
                      <button onClick={() => removeDeliverableDraftRow(dIdx)} className="px-4 py-2 bg-transparent text-slate-500 hover:text-slate-800 text-xs font-bold">
                        CANCEL
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Totals Row */}
              {(clientBigTasks.length > 0 || additionalTasks.length > 0) && tablePeople.length > 0 && (
                <tr className="bg-yellow-50 font-bold sticky bottom-0 z-10 shadow-t">
                  <td className="sticky left-0 bg-yellow-50 z-20"></td>
                  <td colSpan={showRowRemarks ? 4 : 3} className="px-6 py-4 text-right text-sm sticky left-10 bg-yellow-50 z-20">Total Hours</td>

                  {tablePeople.map((person) => (
                    <React.Fragment key={`total-${person.id}`}>
                      <td className="px-3 py-4 text-center text-sm border-l border-yellow-100 text-blue-800 bg-yellow-50">
                        {getTotalHoursForEmp(person.id)}
                      </td>
                      <td className="px-3 py-4 text-center text-sm text-slate-500 bg-yellow-50">
                        {getTotalOffHoursForEmp(person.id)}
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
