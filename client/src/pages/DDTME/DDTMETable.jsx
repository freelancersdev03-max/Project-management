import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Trash2, ChevronLeft, ChevronRight, Pencil, Download, Upload, X, FileSpreadsheet, ArrowRight, CheckCircle2, AlertTriangle , LayoutGrid, Users, Check, Clock, UserCheck} from 'lucide-react';
import api from '../../api';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';
import { broadcastDdtmePlanningRefresh } from '../../utils/ddtmePlanningRefresh';
import * as XLSX from 'xlsx';


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
  const [hqeplPeople, setHqeplPeople] = useState([]); // ALL assigned HQEPL people: [{ id, name }]
  const [mlsLabel, setMlsLabel] = useState('MLS'); // MLS role shortform label
  const [mlsId, setMlsId] = useState(null); // MLS user id for stable column mapping
  const [submission, setSubmission] = useState(null); // [NEW] Submission status
  const [userRole, setUserRole] = useState(null); // To determine if SGM or Employee
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAllowingEdit, setIsAllowingEdit] = useState(false);
  const [isSgmEditApproveMode, setIsSgmEditApproveMode] = useState(false);
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

  // --- Upload Excel State ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState(1); // 1=select file, 2=map columns, 3=result
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadHeaders, setUploadHeaders] = useState([]);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadMapping, setUploadMapping] = useState({ deliverable: '', project: '', target_date: '' });
  const [isUploadingHeaders, setIsUploadingHeaders] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const uploadFileInputRef = useRef(null);

  const { clientId } = useParams();
  const navigate = useNavigate();

  // Month/Year Selection
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('task');

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

  const getHqeplDisplayLabel = (member) => {
    return member?.shortform
      || `${member?.first_name || ''} ${member?.last_name || ''}`.trim()
      || member?.full_name
      || member?.username
      || 'HQEPL';
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
          setLoading(true);
          // Reset per-client derived SGM so stale values don't leak across clients/months.
          setSgmName(null);
          setSgmId(null);
          setHqeplPeople([]);
          setMlsLabel('MLS');
          setMlsId(null);

          let resolvedMlsId = null;

          // Fetch MLS user shortform from HQEPL list
          try {
            const hqeplRes = await api.get('hqepl/');
            const hqeplUsers = Array.isArray(hqeplRes.data) ? hqeplRes.data : (hqeplRes.data?.results || []);
            const mlsUser = hqeplUsers.find((u) => String(u.role || '').toUpperCase() === 'MLS')
              || hqeplUsers.find((u) => String(u?.shortform || '').toUpperCase() === 'MLS');
            if (mlsUser) {
              setMlsLabel(mlsUser.shortform || mlsUser.username || mlsUser.full_name || 'MLS');
              resolvedMlsId = mlsUser.id || null;
              setMlsId(resolvedMlsId);
            }
          } catch (mlsErr) {
            console.warn('Failed to fetch MLS shortform:', mlsErr);
          }

          let resolvedSgmName = null;
          let resolvedSgmId = null;
          let resolvedHqeplPeople = [];

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

            const assignedHqepls = Array.isArray(clientRes?.data?.assigned_hqepls_details)
              ? clientRes.data.assigned_hqepls_details
              : [];
            resolvedHqeplPeople = assignedHqepls
              .filter((member) => member && member.id)
              .map((member) => ({
                id: member.id,
                name: getHqeplDisplayLabel(member)
              }));
          } catch (clientErr) {
            console.error('Failed to fetch client details for SGM mapping', clientErr);
          }

          // 1. Fetch Big Tasks (Rows) with Month/Year Filter
          const tasksRes = await api.get(`ddtme/big-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`);
          const tasksPayload = tasksRes.data;
          const tasksData = Array.isArray(tasksPayload)
            ? tasksPayload
            : (Array.isArray(tasksPayload?.results)
              ? tasksPayload.results
              : (Array.isArray(tasksPayload?.data) ? tasksPayload.data : []));
          const leafTasks = filterToLeafTasks(tasksData);
          setClientBigTasks(sortByProject(leafTasks));

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

          if (resolvedHqeplPeople.length === 0 && Array.isArray(projData)) {
            const seenHqeplIds = new Set();
            const collected = [];
            projData.forEach((project) => {
              const pid = project?.assigned_hqepl || project?.assigned_hqepl_details?.id;
              if (!pid || seenHqeplIds.has(pid)) return;
              const name = project?.assigned_hqepl_details
                ? getHqeplDisplayLabel(project.assigned_hqepl_details)
                : project?.assigned_hqepl_name;
              if (!name) return;
              seenHqeplIds.add(pid);
              collected.push({ id: pid, name });
            });
            resolvedHqeplPeople = collected;
          }

          if (resolvedSgmName) {
            setSgmName(resolvedSgmName);
          }
          if (resolvedSgmId) {
            setSgmId(resolvedSgmId);
          }
          if (resolvedHqeplPeople.length > 0) {
            setHqeplPeople(resolvedHqeplPeople);
          }
          // 1.5 Fetch Additional Tasks
          const addTasksRes = await api.get(`ddtme/additional-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`);
          const addTasksData = Array.isArray(addTasksRes.data) ? addTasksRes.data : (addTasksRes.data.results || []);
          const leafAdditionalTasks = filterToLeafTasks(addTasksData);
          setAdditionalTasks(sortByProject(leafAdditionalTasks));

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
            const rawPersonKey = entry.person_key || (entry.employee_user_id
              ? `u-${entry.employee_user_id}`
              : (entry.employee ? `e-${entry.employee}` : null));
            const personKey = (rawPersonKey === 'mls' && resolvedMlsId)
              ? `u-${resolvedMlsId}`
              : rawPersonKey;
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
        } finally {
          setLoading(false);
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

  const formatDaysValue = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';

    const rounded = Math.round((numeric + Number.EPSILON) * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  };

  const handleHourChange = (taskId, empId, field, value, type = 'big') => {
    const normalizedValue = String(value ?? '').replace(',', '.').trim();

    // Allow typing in-progress decimals like "0." while still blocking invalid chars.
    if (!/^\d*(\.\d{0,2})?$/.test(normalizedValue)) {
      return;
    }

    const canonicalEmpId = (empId === 'mls' && mlsId) ? `u-${mlsId}` : empId;
    const key = `${type}_${taskId}_${canonicalEmpId}`;
    setManDayData(prev => ({
      ...prev,
      [key]: {
        ...prev[key] || { on: '0', off: '0' },
        [field]: normalizedValue === '.' ? '0.' : normalizedValue
      }
    }));
  };

  const getHours = (taskId, empId, field, type = 'big') => {
    const mlsUserKey = mlsId ? `u-${mlsId}` : null;
    const candidateIds = (empId === 'mls' || (mlsUserKey && empId === mlsUserKey))
      ? [mlsUserKey, 'mls'].filter(Boolean)
      : [empId];

    for (const candidateId of candidateIds) {
      const value = manDayData[`${type}_${taskId}_${candidateId}`]?.[field];
      if (value != null) {
        return value;
      }
    }

    return 0;
  };

  const getUserId = (employee) => employee?.user_id ?? null;
  const toUserKey = (userId) => (userId ? `u-${userId}` : null);

  const mlsPersonKey = mlsId ? `u-${mlsId}` : 'mls';
  const sgmPersonKey = toUserKey(sgmId) || 'sgm';

  // One column per assigned HQEPL person (supports multiple HQEPL assignments).
  const hqeplPersonEntries = hqeplPeople
    .map((person) => ({ id: toUserKey(person.id), label: person.name }))
    .filter((person) => person.id);

  const reservedPersonKeys = new Set([
    mlsPersonKey,
    sgmName ? sgmPersonKey : null,
    ...hqeplPersonEntries.map((person) => person.id)
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
    { id: mlsPersonKey, label: mlsLabel },
    ...hqeplPersonEntries,
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

  const getTotalOnDaysForEmp = (empId) => formatDaysValue(getTotalHoursForEmp(empId) / 6);

  const getTotalOffDaysForEmp = (empId) => formatDaysValue(getTotalOffHoursForEmp(empId) / 7.5);

  const sortByProject = (tasks) =>
    [...tasks].sort((a, b) =>
      (a.project_name || '').localeCompare(b.project_name || '')
    );

  const filterToLeafTasks = (tasks) => {
    // Build set of parent task IDs
    const parentTaskIds = new Set(
      tasks
        .filter((task) => task.parent_task)
        .map((task) => task.parent_task)
    );
    // Filter to only include tasks that are not parents (leaf tasks)
    return tasks.filter((task) => !parentTaskIds.has(task.id));
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
      setAdditionalTasks(prev => sortByProject([...prev, res.data]));

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

      broadcastDdtmePlanningRefresh();

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
          (userRole === 'SGM' || userRole === 'HQEPL' || userRole === 'MLS')
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
    const hasMonthlyMajorObjective = objectives.some((objectiveItem) =>
      String(objectiveItem?.objective || '').trim().length > 0
    );

    if (!hasMonthlyMajorObjective) {
      alert('Add atleast 1 Monthly Major Objectives and then only send for approval.');
      return;
    }

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
      const submitRes = await api.post('ddtme/submissions/submit/', {
        client_id: clientId,
        month: selectedMonth,
        year: selectedYear
      });

      if (userRole === 'SGM') {
        const approvalRes = await api.post(`ddtme/submissions/${submitRes.data.id}/approve/`, {});
        setSubmission(approvalRes.data);
        alert('Submitted and approved successfully!');
      } else {
        setSubmission(submitRes.data);
        alert("Submitted successfully!");
      }
    } catch (error) {
      console.error("Error submitting", error);
      const backendError = error?.response?.data?.error || error?.response?.data?.detail;
      alert(backendError || "Failed to submit");
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
      setIsSgmEditApproveMode(false);
      alert("Approved!");
    } catch (error) {
      console.error("Error approving", error);
      const backendError = error?.response?.data?.detail || error?.response?.data?.error;
      alert(backendError || "Failed to approve");
    }
  };

  const handleAllowEdit = async () => {
    if (!submission?.id) return;
    if (!window.confirm("Allow editing again? This will move the plan to Draft and it must be submitted for approval again.")) return;

    setIsAllowingEdit(true);
    try {
      const res = await api.post(`ddtme/submissions/${submission.id}/allow_edit/`, {});

      setSubmission(res.data);
      setIsSgmEditApproveMode(false);
      setIsRejecting(false);
      alert('Edit access enabled. Employee can update DDTME and submit for approval again.');
    } catch (error) {
      console.error('Error enabling edit mode', error);
      const backendError = error?.response?.data?.detail || error?.response?.data?.error;
      alert(backendError || 'Failed to enable edit mode');
    } finally {
      setIsAllowingEdit(false);
    }
  };

  const handleStartRejecting = () => {
    if (!submission) return;
    setIsSgmEditApproveMode(false);
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
      setIsSgmEditApproveMode(false);
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
        setClientBigTasks((prev) => sortByProject(prev.map((task) => (
          task.id === taskId
            ? {
              ...task,
              ddtme_title: nextTitle,
              project: nextProjectId,
              project_name: selectedProject?.name || '-',
              target_date: nextTargetDate
            }
            : task
        ))));
      } else {
        setAdditionalTasks((prev) => sortByProject(prev.map((task) => (
          task.id === taskId
            ? {
              ...task,
              title: nextTitle,
              project: nextProjectId,
              project_name: selectedProject?.name || '-',
              target_date: nextTargetDate
            }
            : task
        ))));
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

  const handleStartEditAndApprove = () => {
    if (!submission?.id) return;
    setIsRejecting(false);
    setIsSgmEditApproveMode(true);
  };

  const handleSubmitEditAndApprove = async () => {
    if (!submission?.id) return;
    if (!window.confirm('Submit your edits and approve this DDTME plan?')) return;

    setIsSubmitting(true);
    try {
      const saveOk = await handleSaveManDays({ showAlerts: false });
      if (!saveOk) {
        alert('Unable to submit edits because saving latest hours failed. Please retry.');
        return;
      }

      const res = await api.post(`ddtme/submissions/${submission.id}/approve/`, {});
      setSubmission(res.data);
      setIsSgmEditApproveMode(false);
      alert('Edits submitted and DDTME approved.');
    } catch (error) {
      console.error('Error submitting edited approval', error);
      const backendError = error?.response?.data?.detail || error?.response?.data?.error;
      alert(backendError || 'Failed to submit edited approval');
    } finally {
      setIsSubmitting(false);
    }
  };

  // derived state for read-only
  const isReadOnly = (submission?.status === 'Submitted' && !isSgmEditApproveMode) || submission?.status === 'Approved';

  // Derived status normalized
  const planStatus = submission?.status ? submission.status.toUpperCase() : 'DRAFT';
  const parsedRemarks = parseSubmissionRemarks(submission?.remarks);
  const rejectionRemarksText = parsedRemarks.legacy;
  const showRowRemarks = planStatus !== 'APPROVED';
  const currentPersonKey = toUserKey(currentUserId);
  const isRestrictedReviewerRole = userRole === 'HQEPL' || userRole === 'MLS';
  const canViewSubmittedPlan = !isRestrictedReviewerRole || planStatus !== 'DRAFT';

  const visibleObjectives = canViewSubmittedPlan ? objectives : [];
  const visibleBigTasks = canViewSubmittedPlan ? clientBigTasks : [];
  const visibleAdditionalTasks = canViewSubmittedPlan ? additionalTasks : [];

  // Permissions
  const canEdit = !isReadOnly && (userRole === 'EMPLOYEE' || userRole === 'ADMIN' || userRole === 'SGM');
  const canEditHoursForPerson = (personId) => {
    if (planStatus === 'APPROVED') {
      return false;
    }

    if (userRole === 'ADMIN' || userRole === 'EMPLOYEE') {
      return planStatus !== 'SUBMITTED';
    }

    if (userRole === 'SGM') {
      return planStatus !== 'SUBMITTED' || isSgmEditApproveMode;
    }

    if (userRole === 'HQEPL' || userRole === 'MLS') {
      // HQEPL/MLS can only edit their own column while plan is editable.
      if (planStatus === 'SUBMITTED') {
        return false;
      }
      const isOwnUserColumn = currentPersonKey && personId === currentPersonKey;
      const isMlsColumn = personId === mlsPersonKey && userRole === 'MLS';
      return Boolean(isOwnUserColumn || isMlsColumn);
    }

    return false;
  };

  const shouldMaskHoursForViewer = (personId) => {
    if (!canViewSubmittedPlan) {
      return true;
    }
    return false;
  };

  const renderHourCell = ({ taskId, personId, field, type, canEditPersonHours }) => {
    if (shouldMaskHoursForViewer(personId)) {
      return <span className="text-xs font-bold text-slate-400">-</span>;
    }

    return (
      <input
        type="text"
        inputMode="decimal"
        value={getHours(taskId, personId, field, type)}
        onChange={(e) => handleHourChange(taskId, personId, field, e.target.value, type)}
        disabled={!canEditPersonHours}
        className={`w-12 no-number-spinner text-center text-slate-800 font-bold text-xs p-1 rounded border-transparent transition-all outline-none ${!canEditPersonHours ? 'bg-transparent' : (field === 'on' ? 'bg-blue-50 focus:border-blue-500 focus:bg-white' : 'bg-yellow-50 focus:border-yellow-500 focus:bg-white')}`}
      />
    );
  };

  const canEditRowRemarks = showRowRemarks && (userRole === 'SGM' || userRole === 'ADMIN');

  // SGM and ADMIN can approve/reject. EMPLOYEE cannot.
  const canApprove = userRole === 'SGM' && planStatus === 'SUBMITTED';
  const canEditAndApprove = canApprove && !isSgmEditApproveMode;
  const canSubmitEditAndApprove = userRole === 'SGM' && planStatus === 'SUBMITTED' && isSgmEditApproveMode;
  const canAllowEdit = (userRole === 'SGM' || userRole === 'ADMIN') && planStatus === 'APPROVED';

  const canSubmit = (planStatus === 'DRAFT' || planStatus === 'REJECTED') && (userRole === 'EMPLOYEE' || userRole === 'ADMIN' || userRole === 'SGM');

  useEffect(() => {
    if (userRole !== 'SGM' || planStatus !== 'SUBMITTED') {
      setIsSgmEditApproveMode(false);
    }
  }, [userRole, planStatus, clientId, selectedMonth, selectedYear]);

  const handleDownloadExcel = () => {
    const rows = [];
    let sr = 1;

    // Big Tasks
    visibleBigTasks.forEach((task) => {
      rows.push({
        'SR': sr++,
        'Deliverable': task.ddtme_title || task.title || '-',
        'Project': task.project_name || '-',
        'Target Date': task.target_date ? formatDateDDMMYYYY(task.target_date) : '-'
      });
    });

    // Additional Tasks
    visibleAdditionalTasks.forEach((task) => {
      rows.push({
        'SR': sr++,
        'Deliverable': task.title || '-',
        'Project': task.project_name || '-',
        'Target Date': task.target_date ? formatDateDDMMYYYY(task.target_date) : '-'
      });
    });

    if (rows.length === 0) {
      alert('No deliverables to download.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // SR
      { wch: 50 },  // Deliverable
      { wch: 25 },  // Project
      { wch: 15 },  // Target Date
    ];

    const wb = XLSX.utils.book_new();
    const monthLabel = months.find((m) => m.value === selectedMonth)?.label || selectedMonth;
    XLSX.utils.book_append_sheet(wb, ws, `DDTME ${monthLabel} ${selectedYear}`);

    XLSX.writeFile(wb, `DDTME_Deliverables_${monthLabel}_${selectedYear}.xlsx`);
  };

  // --- Upload Excel Handlers ---

  const handleOpenUploadModal = () => {
    setShowUploadModal(true);
    setUploadStep(1);
    setUploadFile(null);
    setUploadHeaders([]);
    setUploadPreview([]);
    setUploadMapping({ deliverable: '', project: '', target_date: '' });
    setImportResult(null);
  };

  const handleCloseUploadModal = () => {
    setShowUploadModal(false);
    if (uploadFileInputRef.current) uploadFileInputRef.current.value = '';
  };

  const handleUploadFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setIsUploadingHeaders(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('ddtme/additional-tasks/upload_excel_headers/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const headers = res.data.headers || [];
      const preview = res.data.preview || [];
      setUploadHeaders(headers);
      setUploadPreview(preview);

      // Auto-map by guessing common column names
      const autoMap = { deliverable: '', project: '', target_date: '' };
      const deliverableAliases = ['deliverable', 'task', 'title', 'task name', 'task_name', 'deliverable name'];
      const projectAliases = ['project', 'project name', 'project_name'];
      const dateAliases = ['target date', 'target_date', 'due date', 'due_date', 'deadline', 'date'];

      headers.forEach((h) => {
        const norm = h.trim().toLowerCase();
        if (!autoMap.deliverable && deliverableAliases.includes(norm)) autoMap.deliverable = h;
        if (!autoMap.project && projectAliases.includes(norm)) autoMap.project = h;
        if (!autoMap.target_date && dateAliases.includes(norm)) autoMap.target_date = h;
      });
      setUploadMapping(autoMap);
      setUploadStep(2);
    } catch (err) {
      console.error('Error reading Excel headers', err);
      const msg = err?.response?.data?.error || 'Failed to read Excel file';
      alert(msg);
    } finally {
      setIsUploadingHeaders(false);
    }
  };

  const handleImportExcel = async () => {
    if (!uploadFile) return;
    if (!uploadMapping.deliverable) {
      alert('Please map the Deliverable column.');
      return;
    }
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('client_id', clientId);
      formData.append('month', selectedMonth);
      formData.append('year', selectedYear);
      formData.append('column_mapping', JSON.stringify(uploadMapping));

      const res = await api.post('ddtme/additional-tasks/upload_excel_import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      setUploadStep(3);
    } catch (err) {
      console.error('Error importing Excel', err);
      const msg = err?.response?.data?.error || 'Failed to import Excel';
      alert(msg);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFinishUpload = () => {
    handleCloseUploadModal();
    // Re-fetch data to show newly imported tasks
    // Trigger a re-render by toggling month (then reverting) — or just set state to force useEffect
    setSelectedMonth((prev) => prev); // This won't trigger useEffect since value is same
    // Force re-fetch by briefly toggling
    const currentMonth = selectedMonth;
    const currentYear = selectedYear;
    setSelectedMonth(0);
    setTimeout(() => {
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
    }, 50);
  };


  const allTasks = [
    ...visibleBigTasks.map(t => ({ ...t, type: 'big', title: t.ddtme_title || t.title })),
    ...visibleAdditionalTasks.map(t => ({ ...t, type: 'add', title: t.title }))
  ];

  let totalHours = 0;
  Object.values(manDayData).forEach(val => {
    totalHours += (parseFloat(val.on) || 0) + (parseFloat(val.off) || 0);
  });
  
  const activeResources = new Set();
  Object.keys(manDayData).forEach(key => {
    const parts = key.split('_');
    if (parts.length >= 3) {
      const empId = parts.slice(2).join('_'); // Handle u-XX
      const data = manDayData[key];
      if ((parseFloat(data.on) || 0) > 0 || (parseFloat(data.off) || 0) > 0) {
        activeResources.add(empId);
      }
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* --- 1. HEADER NAVIGATION --- */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Capacity Planner</h1>
              <p className="text-sm text-slate-500 font-medium">Project Lead: <span className="text-slate-800">{sgmName || "Unassigned"}</span></p>
            </div>
            <div className="hidden md:block h-10 w-px bg-slate-200 mx-2"></div>
            {/* Status Pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full ${
              planStatus === 'APPROVED' ? 'bg-green-50 border-green-200' :
              planStatus === 'SUBMITTED' ? 'bg-yellow-50 border-yellow-200' :
              planStatus === 'REJECTED' ? 'bg-red-50 border-red-200' :
              'bg-slate-50 border-slate-200'
            }`}>
              {planStatus === 'APPROVED' && <CheckCircle size={14} className="text-green-600" />}
              <span className={`text-xs font-bold tracking-wide uppercase ${
                planStatus === 'APPROVED' ? 'text-green-700' :
                planStatus === 'SUBMITTED' ? 'text-yellow-700' :
                planStatus === 'REJECTED' ? 'text-red-700' :
                'text-slate-700'
              }`}>{planStatus}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleDownloadExcel} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
              <Download size={16} />
              Download
            </button>
            <button onClick={handleSendForApproval} disabled={isSubmitting || !canSubmit} className={`flex items-center gap-2 px-5 py-2 bg-slate-900 ${(!canSubmit || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""} text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-md`}>
              <Check size={16} />
              Submit Approval
            </button>
          </div>
        </header>

        {/* --- 2. BENTO GRID TOP SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Sprint Goals */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-400 tracking-widest uppercase mb-4">Sprint Goals</h2>
              <ul className="space-y-3">
                {visibleObjectives.map(obj => (
                  <li key={obj.id} className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                    <span className="text-slate-700 font-medium">{obj.objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Card 2: Summary Metrics */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
            <h2 className="text-sm font-bold text-slate-400 tracking-widest uppercase">Summary Metrics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Total Hours</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{totalHours}</div>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <UserCheck size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Resources</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{activeResources.size}</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. TEAM CAPACITY ALLOCATION (DATA GRID) --- */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Grid Header & Toggle */}
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Team Capacity Allocation</h2>
            
            {/* View Toggle */}
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('task')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'task' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid size={16} />
                View by Task
              </button>
              <button 
                onClick={() => setViewMode('employee')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'employee' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={16} />
                View by Employee
              </button>
            </div>
          </div>

          {/* Grid Scrollable Area */}
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-sm text-left border-collapse min-w-max">
              <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                <tr>
                  {/* Sticky First Column Header */}
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider sticky left-0 z-30 bg-slate-50 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                    {viewMode === 'task' ? 'Action Item' : 'Team Member'}
                  </th>
                  
                  {/* Dynamic Headers */}
                  {viewMode === 'task' ? (
                    tablePeople.map(emp => (
                      <th key={emp.id} className="px-4 py-4 text-center border-r border-slate-200 min-w-[140px]">
                        <div className="flex flex-col items-center gap-2" title={emp.label}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${"bg-slate-100 text-slate-700"}`}>
                            {(emp.label ? emp.label.substring(0, 2).toUpperCase() : "NA")}
                          </div>
                          <div className="flex gap-4 mt-2 text-[10px] uppercase font-bold text-slate-400">
                            <span>Core</span>
                            <span>Ad-hoc</span>
                          </div>
                        </div>
                      </th>
                    ))
                  ) : (
                    allTasks.map(task => (
                      <th key={task.id} className="px-4 py-4 text-center border-r border-slate-200 min-w-[160px]">
                        <div className="flex flex-col items-center gap-2" title={task.title}>
                          <span className="font-semibold text-slate-700 truncate max-w-[140px]">{task.title}</span>
                          <div className="flex gap-4 mt-2 text-[10px] uppercase font-bold text-slate-400">
                            <span>Core</span>
                            <span>Ad-hoc</span>
                          </div>
                        </div>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {viewMode === 'task' ? (
                  // TASK VIEW (Rows = Tasks, Cols = Employees)
                  allTasks.map(task => (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                        {task.title}
                      </td>
                      {tablePeople.map(emp => {
                        const coreVal = getHours(task.id, emp.id, 'on', task.type);
                        const adHocVal = getHours(task.id, emp.id, 'off', task.type);
                        
                        return (
                          <td key={emp.id} className="px-4 py-3 border-r border-slate-100">
                            <div className="flex justify-center gap-2">
                              {/* Core Input */}
                              <input 
                                type="text"
                                value={coreVal}
                                disabled={!canEditHoursForPerson(emp.id)} onChange={(e) => handleHourChange(task.id, emp.id, 'on', e.target.value, task.type)}
                                className={`w-12 text-center py-1.5 rounded-md border font-semibold text-sm transition-all outline-none focus:ring-2 focus:ring-blue-100 ${
                                  parseHourValue(coreVal) === 0 ? 'border-transparent bg-transparent text-slate-300' : 'border-slate-200 ${!canEditHoursForPerson(emp.id) ? "bg-slate-50 cursor-not-allowed" : "bg-white text-slate-800"} focus:border-blue-400'
                                }`}
                              />
                              {/* Ad-hoc Input */}
                              <input 
                                type="text"
                                value={adHocVal}
                                disabled={!canEditHoursForPerson(emp.id)} onChange={(e) => handleHourChange(task.id, emp.id, 'off', e.target.value, task.type)}
                                className={`w-12 text-center py-1.5 rounded-md border font-semibold text-sm transition-all outline-none focus:ring-2 focus:ring-purple-100 ${
                                  parseHourValue(adHocVal) === 0 ? 'border-transparent bg-transparent text-slate-300' : 'border-slate-200 ${!canEditHoursForPerson(emp.id) ? "bg-slate-50 cursor-not-allowed" : "bg-white text-slate-800"} focus:border-purple-400'
                                }`}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  // EMPLOYEE VIEW (Rows = Employees, Cols = Tasks)
                  tablePeople.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${"bg-slate-100 text-slate-700"}`}>
                            {(emp.label ? emp.label.substring(0, 2).toUpperCase() : "NA")}
                          </div>
                          <span className="font-medium text-slate-900">{emp.label}</span>
                        </div>
                      </td>
                      {allTasks.map(task => {
                        const coreVal = getHours(task.id, emp.id, 'on', task.type);
                        const adHocVal = getHours(task.id, emp.id, 'off', task.type);
                        
                        return (
                          <td key={task.id} className="px-4 py-3 border-r border-slate-100">
                            <div className="flex justify-center gap-2">
                              {/* Core Input */}
                              <input 
                                type="text"
                                value={coreVal}
                                disabled={!canEditHoursForPerson(emp.id)} onChange={(e) => handleHourChange(task.id, emp.id, 'on', e.target.value, task.type)}
                                className={`w-12 text-center py-1.5 rounded-md border font-semibold text-sm transition-all outline-none focus:ring-2 focus:ring-blue-100 ${
                                  parseHourValue(coreVal) === 0 ? 'border-transparent bg-transparent text-slate-300' : 'border-slate-200 ${!canEditHoursForPerson(emp.id) ? "bg-slate-50 cursor-not-allowed" : "bg-white text-slate-800"} focus:border-blue-400'
                                }`}
                              />
                              {/* Ad-hoc Input */}
                              <input 
                                type="text"
                                value={adHocVal}
                                disabled={!canEditHoursForPerson(emp.id)} onChange={(e) => handleHourChange(task.id, emp.id, 'off', e.target.value, task.type)}
                                className={`w-12 text-center py-1.5 rounded-md border font-semibold text-sm transition-all outline-none focus:ring-2 focus:ring-purple-100 ${
                                  parseHourValue(adHocVal) === 0 ? 'border-transparent bg-transparent text-slate-300' : 'border-slate-200 ${!canEditHoursForPerson(emp.id) ? "bg-slate-50 cursor-not-allowed" : "bg-white text-slate-800"} focus:border-purple-400'
                                }`}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
              
              {/* Sticky Footer */}
              <tfoot className="bg-slate-50 sticky bottom-0 z-20 shadow-[0_-1px_0_0_#e2e8f0]">
                <tr>
                  <td className="px-6 py-4 font-black text-slate-900 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 uppercase tracking-widest text-xs">
                    Total Hours
                  </td>
                  {viewMode === 'task' ? (
                     tablePeople.map(emp => {
                       let empCore = 0; let empAdhoc = 0;
                       allTasks.forEach(task => {
                         empCore += parseHourValue(getHours(task.id, emp.id, 'on', task.type));
                         empAdhoc += parseHourValue(getHours(task.id, emp.id, 'off', task.type));
                       });
                       return (
                         <td key={emp.id} className="px-4 py-4 border-r border-slate-200 text-center">
                           <div className="flex justify-center gap-4 text-sm font-bold text-slate-700">
                             <span className="w-10 text-center">{empCore}</span>
                             <span className="w-10 text-center">{empAdhoc}</span>
                           </div>
                         </td>
                       );
                     })
                  ) : (
                     allTasks.map(task => {
                       let taskCore = 0; let taskAdhoc = 0;
                       tablePeople.forEach(emp => {
                         taskCore += parseHourValue(getHours(task.id, emp.id, 'on', task.type));
                         taskAdhoc += parseHourValue(getHours(task.id, emp.id, 'off', task.type));
                       });
                       return (
                         <td key={task.id} className="px-4 py-4 border-r border-slate-200 text-center">
                           <div className="flex justify-center gap-4 text-sm font-bold text-slate-700">
                             <span className="w-10 text-center">{taskCore}</span>
                             <span className="w-10 text-center">{taskAdhoc}</span>
                           </div>
                         </td>
                       );
                     })
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
{/* ---- Upload Excel Column Mapping Modal ---- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <FileSpreadsheet size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {uploadStep === 1 && 'Upload Excel'}
                    {uploadStep === 2 && 'Map Columns'}
                    {uploadStep === 3 && 'Import Complete'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {uploadStep === 1 && 'Select an Excel file (.xlsx) to import deliverables'}
                    {uploadStep === 2 && 'Map your Excel columns to DDTME fields'}
                    {uploadStep === 3 && 'Review the import results below'}
                  </p>
                </div>
              </div>
              <button onClick={handleCloseUploadModal} className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-all">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Step 1: File Selection */}
              {uploadStep === 1 && (
                <div className="flex flex-col items-center justify-center py-12 space-y-5">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <Upload size={36} className="text-indigo-400" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-bold text-slate-700">Drag & drop or click to select</p>
                    <p className="text-xs text-slate-400">Supports .xlsx and .xls files</p>
                  </div>
                  <button
                    onClick={() => uploadFileInputRef.current?.click()}
                    disabled={isUploadingHeaders}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all text-sm uppercase tracking-wider disabled:opacity-60"
                  >
                    {isUploadingHeaders ? 'Reading file...' : 'Choose File'}
                  </button>
                </div>
              )}

              {/* Step 2: Column Mapping */}
              {uploadStep === 2 && (
                <>
                  {/* Mapping Fields */}
                  <div className="space-y-3">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Column Mapping</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Deliverable (required) */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          Deliverable <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={uploadMapping.deliverable}
                          onChange={(e) => setUploadMapping((prev) => ({ ...prev, deliverable: e.target.value }))}
                          className={`w-full px-3 py-2.5 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                            uploadMapping.deliverable
                              ? 'border-indigo-300 bg-indigo-50/50 focus:ring-indigo-200 text-slate-800'
                              : 'border-red-300 bg-red-50/30 focus:ring-red-200 text-slate-500'
                          }`}
                        >
                          <option value="">— Select Excel Column —</option>
                          {uploadHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      {/* Project */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">Project</label>
                        <select
                          value={uploadMapping.project}
                          onChange={(e) => setUploadMapping((prev) => ({ ...prev, project: e.target.value }))}
                          className={`w-full px-3 py-2.5 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                            uploadMapping.project
                              ? 'border-emerald-300 bg-emerald-50/50 focus:ring-emerald-200 text-slate-800'
                              : 'border-slate-200 bg-white focus:ring-slate-200 text-slate-500'
                          }`}
                        >
                          <option value="">— Not Mapped —</option>
                          {uploadHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>

                      {/* Target Date */}

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">Target Date</label>
                        <select
                          value={uploadMapping.target_date}
                          onChange={(e) => setUploadMapping((prev) => ({ ...prev, target_date: e.target.value }))}
                          className={`w-full px-3 py-2.5 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition-all ${
                            uploadMapping.target_date
                              ? 'border-emerald-300 bg-emerald-50/50 focus:ring-emerald-200 text-slate-800'
                              : 'border-slate-200 bg-white focus:ring-slate-200 text-slate-500'
                          }`}
                        >
                          <option value="">— Not Mapped —</option>
                          {uploadHeaders.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Data Preview */}
                  {uploadPreview.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Data Preview (first {uploadPreview.length} rows)</p>
                      <div className="border border-slate-200 rounded-xl overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-100">
                              {uploadHeaders.map((h) => {
                                const isMapped = Object.values(uploadMapping).includes(h);
                                return (
                                  <th
                                    key={h}
                                    className={`px-3 py-2 text-left font-bold uppercase tracking-wider whitespace-nowrap ${
                                      isMapped ? 'text-indigo-700 bg-indigo-50' : 'text-slate-500'
                                    }`}
                                  >
                                    {h}
                                    {isMapped && (
                                      <span className="ml-1 text-[9px] text-indigo-400 font-black">
                                        ✓
                                      </span>
                                    )}
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {uploadPreview.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                {uploadHeaders.map((h) => {
                                  const isMapped = Object.values(uploadMapping).includes(h);
                                  return (
                                    <td
                                      key={h}
                                      className={`px-3 py-2 text-slate-700 whitespace-nowrap max-w-[200px] truncate ${
                                        isMapped ? 'bg-indigo-50/30 font-medium' : ''
                                      }`}
                                    >
                                      {row[h] || ''}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Step 3: Results */}
              {uploadStep === 3 && importResult && (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-center">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      importResult.created > 0 ? 'bg-green-100' : 'bg-amber-100'
                    }`}>
                      {importResult.created > 0
                        ? <CheckCircle2 size={32} className="text-green-600" />
                        : <AlertTriangle size={32} className="text-amber-600" />
                      }
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <p className="text-2xl font-black text-slate-900">
                      {importResult.created} Deliverable{importResult.created !== 1 ? 's' : ''} Imported
                    </p>
                    {importResult.skipped > 0 && (
                      <p className="text-sm text-amber-600 font-bold">
                        {importResult.skipped} row{importResult.skipped !== 1 ? 's' : ''} skipped
                      </p>
                    )}
                  </div>

                  {/* Errors */}
                  {importResult.errors?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                      <p className="text-[11px] font-black text-red-700 uppercase tracking-wider">Errors</p>
                      <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {importResult.warnings?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
                      <p className="text-[11px] font-black text-amber-700 uppercase tracking-wider">Warnings</p>
                      <ul className="text-xs text-amber-600 space-y-0.5 max-h-32 overflow-y-auto">
                        {importResult.warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <div className="text-[10px] text-slate-400 font-medium">
                {uploadFile && (
                  <span className="flex items-center gap-1.5">
                    <FileSpreadsheet size={12} />
                    {uploadFile.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {uploadStep === 2 && (
                  <>
                    <button
                      onClick={() => { setUploadStep(1); setUploadFile(null); setUploadHeaders([]); setUploadPreview([]); if (uploadFileInputRef.current) uploadFileInputRef.current.value = ''; }}
                      className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-[11px] uppercase tracking-wider transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleImportExcel}
                      disabled={!uploadMapping.deliverable || isImporting}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all text-[11px] tracking-wider uppercase disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      {isImporting ? 'Importing...' : <><ArrowRight size={14} /> Import</>}
                    </button>
                  </>
                )}
                {uploadStep === 3 && (
                  <button
                    onClick={handleFinishUpload}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 hover:-translate-y-0.5 transition-all text-[11px] tracking-wider uppercase"
                  >
                    <CheckCircle2 size={14} /> Done
                  </button>
                )}
                {uploadStep === 1 && (
                  <button
                    onClick={handleCloseUploadModal}
                    className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-[11px] uppercase tracking-wider transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default DDTMETable;
