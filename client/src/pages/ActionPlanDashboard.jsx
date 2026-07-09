import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  BarChart3, Plus, User, LayoutGrid,
  CheckCircle, Clock, AlertCircle, TrendingUp,
  FileText, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import api from '../api';
import { resolveMediaUrl } from '../utils/media';
import { formatDateDDMMYYYY } from '../utils/dateFormat';
import { PageHeader, Band } from '../components/kayaara/Band';
import KpiCard from '../components/kayaara/KpiCard';
import AnimatedNumber from '../components/kayaara/AnimatedNumber';

// Single status → pill class map (blue family only):
// positive/done = blue solid · warning/delayed = blue tint · negative/overdue = ink · neutral = grey
const STATUS_PILL_CLASS = {
  on_time: 'k-pill-solid',
  delay_completion: 'k-pill',
  over_due: 'k-pill-ink',
  in_progress: 'k-pill-grey',
};

const ActionPlanDashboard = () => {
    const taskFlagOptions = [
      { value: 'none', label: 'None' },
      { value: 'document', label: 'Document' },
      { value: 'training', label: 'Training' },
      { value: 'resource', label: 'Resource' },
    ];
    const taskPriorityOptions = [
      { value: 'HIGH', label: 'High' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'LOW', label: 'Low' },
    ];

  const { clientId } = useParams();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionTasks, setActionTasks] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [visitAgendaOptions, setVisitAgendaOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null); // { id, role }

  // Form State
  // Form State
  const [newTask, setNewTask] = useState({
    task: "",
    target_date: "",
    start_date: new Date().toISOString().split('T')[0], // Default today
    assigned_to: "",
    flag: 'none',
    priority: 'LOW',
    meeting_agenda_id: "",
    assign_file: null
  });

  // Completion Modal State
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionFile, setCompletionFile] = useState(null);

  // Filter State
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, MY, KAYAARA, CLIENT
  const [selectedProjects, setSelectedProjects] = useState([]); // Array of selected project IDs
  const [includeAllProjects, setIncludeAllProjects] = useState(true); // All projects selected
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [internalIds, setInternalIds] = useState([]);
  const [externalIds, setExternalIds] = useState([]);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [excelUploadStatus, setExcelUploadStatus] = useState(null);
  const [draftActionTasks, setDraftActionTasks] = useState([]);
  const [isSubmittingDrafts, setIsSubmittingDrafts] = useState(false);

  const getTodayDateInputValue = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const minTaskDate = getTodayDateInputValue();

  const normalizeDateInput = (rawValue) => {
    if (!rawValue) return '';
    const value = String(rawValue).trim();
    if (!value) return '';

    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    // DD/MM/YYYY or DD-MM-YYYY
    const ddmmyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const dd = ddmmyyyy[1].padStart(2, '0');
      const mm = ddmmyyyy[2].padStart(2, '0');
      const yyyy = ddmmyyyy[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const isInternalMarker = (value) => String(value || '').trim().toLowerCase() === 'internal';

  const isBlankValue = (value) => String(value || '').trim() === '';

  const findProjectByLabel = (label) => {
    const needle = String(label || '').trim().toLowerCase();
    if (!needle) return null;

    const exact = projectOptions.find((p) => String(p.name || '').trim().toLowerCase() === needle);
    if (exact) return exact;

    return projectOptions.find((p) => String(p.name || '').trim().toLowerCase().includes(needle)) || null;
  };

  const getProjectClientName = (projectId) => {
    const project = projectOptions.find((proj) => String(proj.id) === String(projectId));
    return project?.clientName || '';
  };

  const getDraftClientName = (task) => {
    return task?.rawClient || getProjectClientName(task?.projectId) || '-';
  };

  const getProjectName = (task) => {
    if (task?.project_name) return task.project_name;

    const match = projectOptions.find((proj) => String(proj.id) === String(task?.project_id));
    return match?.name || `Project ${task?.project_id || '-'}`;
  };

  const findMemberByIdentifier = (identifier, { internalOnly = false } = {}) => {
    const needle = String(identifier || '').trim().toLowerCase();
    if (!needle) return null;

    const sourceMembers = internalOnly
      ? projectMembers.filter((m) => String(m.type || '').toUpperCase() === 'INTERNAL')
      : projectMembers;

    const match = sourceMembers.find((m) => {
      const username = String(m.username || '').trim().toLowerCase();
      const email = String(m.email || '').trim().toLowerCase();
      const fullName = String(m.full_name || `${m.first_name || ''} ${m.last_name || ''}` || '').trim().toLowerCase();
      return needle === username || needle === email || needle === fullName;
    });

    return match || null;
  };

  const getRowValueByAliases = (row, aliases) => {
    const keys = Object.keys(row || {});
    for (const key of keys) {
      if (aliases.includes(normalizeHeader(key))) {
        return row[key];
      }
    }
    return '';
  };

  const handleActionPlanExcelImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setExcelUploadStatus({ error: 'Only .xlsx files are supported.' });
      return;
    }

    try {
      setExcelUploadStatus({ loading: true });

      const buffer = await file.arrayBuffer();
      const { read, utils } = await import('xlsx');
      const workbook = read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = utils.sheet_to_json(worksheet, { defval: '', raw: false });

      if (!rows.length) {
        setDraftActionTasks([]);
        setExcelUploadStatus({ error: 'Excel file is empty.' });
        return;
      }

      const drafts = rows
        .map((row, idx) => {
          const taskText = String(getRowValueByAliases(row, ['task', 'action', 'action task', 'action/task', 'task title']) || '').trim();
          if (!taskText) return null;

          const clientText = String(getRowValueByAliases(row, ['client', 'client name']) || '').trim();
          const projectText = String(getRowValueByAliases(row, ['project', 'project name']) || '').trim();
          const assigneeText = String(getRowValueByAliases(row, ['assigned to', 'assigned_to', 'assignee', 'user', 'employee']) || '').trim();
          const startRaw = getRowValueByAliases(row, ['start date', 'start_date']);
          const targetRaw = getRowValueByAliases(row, ['target date', 'target_date', 'due date', 'deadline', 'date']);
          const flagRaw = String(getRowValueByAliases(row, ['flag', 'task flag']) || 'none').trim().toLowerCase();
          const priorityRaw = String(getRowValueByAliases(row, ['priority', 'task priority']) || 'LOW').trim().toUpperCase();

          const isInternal =
            (isBlankValue(clientText) && isBlankValue(projectText))
            || isInternalMarker(clientText)
            || isInternalMarker(projectText);

          const projectMatch = findProjectByLabel(projectText);
          const memberMatch = findMemberByIdentifier(assigneeText, { internalOnly: isInternal });

          const normalizedStartDate = normalizeDateInput(startRaw) || minTaskDate;
          const normalizedTargetDate = normalizeDateInput(targetRaw) || minTaskDate;
          const normalizedFlag = ['none', 'document', 'training', 'resource', 'discuss'].includes(flagRaw) ? flagRaw : 'none';
          const normalizedPriority = ['HIGH', 'MEDIUM', 'LOW'].includes(priorityRaw) ? priorityRaw : 'LOW';

          let importError = '';
          if (!isInternal && !projectMatch && projectText) importError = 'Project not matched';
          if (!memberMatch && assigneeText) importError = importError ? `${importError}; Assignee not matched` : 'Assignee not matched';

          return {
            _id: `ap_excel_${Date.now()}_${idx}`,
            task: taskText,
            projectId: projectMatch?.id || selectedProjectId || '',
            assignedTo: memberMatch?.id ? String(memberMatch.id) : '',
            startDate: normalizedStartDate,
            targetDate: normalizedTargetDate,
            flag: normalizedFlag === 'discuss' ? 'document' : normalizedFlag,
            priority: normalizedPriority,
            isInternal,
            rawClient: clientText,
            rawProject: projectText,
            rawAssignedTo: assigneeText,
            importError,
          };
        })
        .filter(Boolean);

      if (!drafts.length) {
        setDraftActionTasks([]);
        setExcelUploadStatus({ error: 'No valid task rows found in the file.' });
        return;
      }

      setDraftActionTasks(drafts);
      setExcelUploadStatus({
        success: true,
        message: `${drafts.length} draft action tasks created from Excel. Review and submit.`,
      });
    } catch (error) {
      console.error('Action plan Excel import failed:', error);
      setExcelUploadStatus({ error: error.message || 'Failed to process Excel file.' });
    }
  };

  const handleSubmitActionPlanDrafts = async () => {
    if (!draftActionTasks.length) {
      alert('No draft tasks to submit.');
      return;
    }

    setIsSubmittingDrafts(true);

    let createdCount = 0;
    let retainedCount = 0;
    const today = minTaskDate;
    const updatedDrafts = [];

    for (const draft of draftActionTasks) {
      const hasRequired = Boolean(draft.task && draft.projectId && draft.assignedTo && draft.startDate && draft.targetDate);
      if (!hasRequired) {
        retainedCount += 1;
        updatedDrafts.push({ ...draft, importError: draft.importError || 'Missing required fields' });
        continue;
      }

      if (String(draft.targetDate) < String(today)) {
        retainedCount += 1;
        updatedDrafts.push({
          ...draft,
          importError: `Past target date (${draft.targetDate}) kept as draft`,
        });
        continue;
      }

      try {
        const formData = new FormData();
        formData.append('task', draft.task);
        formData.append('start_date', draft.startDate);
        formData.append('target_date', draft.targetDate);
        formData.append('assigned_to', String(draft.assignedTo));
        formData.append('flag', draft.flag || 'none');
        formData.append('priority', draft.priority || 'LOW');

        await api.post(`/projects/${draft.projectId}/tasks/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        createdCount += 1;
      } catch (error) {
        retainedCount += 1;
        const detail = error.response?.data ? JSON.stringify(error.response.data) : (error.message || 'Create failed');
        updatedDrafts.push({ ...draft, importError: detail });
      }
    }

    setDraftActionTasks(updatedDrafts);
    setExcelUploadStatus({
      success: createdCount > 0,
      message: `${createdCount} tasks created. ${retainedCount} kept as drafts.`,
    });
    setIsSubmittingDrafts(false);

    if (createdCount > 0) {
      await fetchData(clientId);
    }
  };

  const parseDateOnly = (dateValue) => {
    if (!dateValue) return null;
    const raw = String(dateValue).slice(0, 10);
    const [y, m, d] = raw.split('-').map(Number);
    if (!y || !m || !d) return null;
    const localDate = new Date(y, m - 1, d);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  };

  const normalizeStatus = (status) => String(status || '').trim().toLowerCase();

  const getEffectiveStatus = (task) => {
    const rawStatus = normalizeStatus(task?.status);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = parseDateOnly(task?.target_date);
    const completion = parseDateOnly(task?.completion_date);

    if (completion) {
      if (target && completion > target) return 'delay_completion';
      return 'on_time';
    }

    if (rawStatus === 'over_due' || rawStatus === 'overdue') return 'over_due';
    if (target && target < today) return 'over_due';
    if (rawStatus === 'delay_completion' || rawStatus === 'delayed') return 'delay_completion';
    if (rawStatus === 'on_time' || rawStatus === 'completed') return 'on_time';
    return 'in_progress';
  };

  const fetchCurrentUser = async () => {
    try {
      const { data } = await api.get('/me/');
      setCurrentUser(data);
    } catch (error) {
      console.error("Error fetching user:", error);
      const role = localStorage.getItem('role');
      if (role) setCurrentUser({ role });
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (clientId) {
      fetchData(clientId);
    }
    setNewTask((prev) => ({
      ...prev,
      assigned_to: "",
      assign_file: null
    }));
  }, [clientId]);

  const fetchData = async (cId) => {
    try {
      setLoading(true);
      const role = (localStorage.getItem('role') || '').toUpperCase();

      // 1. Fetch Client Tasks
      try {
        const tasksRes = await api.get(`/clients/${cId}/action-tasks/`);
        setActionTasks(tasksRes.data);
      } catch (err) {
        console.error("Error fetching client tasks:", err);
      }

      // 2. Fetch Projects to aggregate members and populate project dropdown for New Task
      let listEndpoint = '/projects/';
      if (role === 'EMPLOYEE' || role === 'EXTERNAL') listEndpoint = '/employees/my-projects/';

      const projectListRes = await api.get(listEndpoint);
      // Ensure we only look at projects matching this client
      const clientProjects = projectListRes.data.filter(
        proj => String(proj.client?.id || proj.client) === String(cId)
      );

      const options = clientProjects.map(proj => ({
        id: String(proj.id),
        name: proj.name || `Project ${proj.id}`,
        clientName: proj.client_name || proj.client?.company_name || ''
      }));
      setProjectOptions(options);

      // Initialize project filter with all projects selected
      if (options.length > 0) {
        setSelectedProjects(options.map(o => o.id));
        setIncludeAllProjects(true);
      }

      if (options.length > 0 && !selectedProjectId) {
        const firstProjectId = options[0].id;
        setSelectedProjectId(firstProjectId);
        // Fetch meeting agendas for the first project
        await fetchVisitAgendas(firstProjectId);
      }

      // 3. Aggregate Members across all client projects
      const membersMap = new Map();
      const iIds = new Set();
      const eIds = new Set();

      clientProjects.forEach(p => {
        if (p.assigned_sgm_details) {
          membersMap.set(p.assigned_sgm_details.id, { ...p.assigned_sgm_details, type: 'INTERNAL' });
          iIds.add(p.assigned_sgm_details.id);
        }
        if (Array.isArray(p.team_members_details)) {
          p.team_members_details.forEach(m => {
            membersMap.set(m.id, { ...m, type: 'INTERNAL' });
            iIds.add(m.id);
          });
        }
        if (Array.isArray(p.external_team_details)) {
          p.external_team_details.forEach(m => {
            membersMap.set(m.id, { ...m, type: 'EXTERNAL' });
            eIds.add(m.id);
          });
        }
        if (p.external_lead) {
          membersMap.set(p.external_lead, {
            id: p.external_lead,
            username: p.external_lead_name || "External Lead",
            email: p.external_lead_email || "",
            type: 'EXTERNAL'
          });
          eIds.add(p.external_lead);
        }
      });

      setProjectMembers(Array.from(membersMap.values()));
      setInternalIds([...iIds]);
      setExternalIds([...eIds]);

    } catch (error) {
      console.error("Error fetching action plan data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("task", newTask.task);
      formData.append("target_date", newTask.target_date);
      formData.append("start_date", newTask.start_date);
      formData.append("assigned_to", newTask.assigned_to);
      formData.append("flag", newTask.flag || 'none');
      formData.append("priority", newTask.priority || 'LOW');
      if (newTask.meeting_agenda_id) {
        formData.append("meeting_agenda_id", newTask.meeting_agenda_id);
      }
      if (newTask.assign_file) {
        formData.append("assign_file", newTask.assign_file);
      }

      await api.post(`/projects/${selectedProjectId}/tasks/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setIsModalOpen(false);
      setNewTask({ task: "", target_date: "", start_date: new Date().toISOString().split('T')[0], assigned_to: "", flag: 'none', priority: 'LOW', meeting_agenda_id: "", assign_file: null });
      fetchData(clientId); // Refresh list
    } catch (error) {
      console.error("Error creating task:", error);
      if (error.response) {
        console.error("Server Response:", error.response.data);
        alert(`Failed: ${JSON.stringify(error.response.data)}`);
      } else {
        alert("Failed to create task. Please check assignments.");
      }
    }
  };

  const handleFileChange = (e) => {
    setNewTask({ ...newTask, assign_file: e.target.files[0] });
  };

  const handleCompletionFileChange = (e) => {
    setCompletionFile(e.target.files[0]);
  };

  const handleProjectSelection = (projectId) => {
    setSelectedProjects(prev => {
      const updated = prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId];
      return updated;
    });
  };

  const handleProjectSelect = (e) => {
    setSelectedProjectId(e.target.value);
    fetchVisitAgendas(e.target.value);
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds((prev) => (
      prev.includes(taskId)
        ? prev.filter((id) => id !== taskId)
        : [...prev, taskId]
    ));
  };

  const fetchVisitAgendas = async (projectId) => {
    try {
      const [projectVisitRes, logVisitRes] = await Promise.all([
        api.get(`/projects/${projectId}/meeting-agendas/`),
        api.get(`/meeting-agenda/clients/${clientId}/logs/`),
      ]);

      const projectVisits = Array.isArray(projectVisitRes?.data)
        ? projectVisitRes.data
        : Array.isArray(projectVisitRes?.data?.results)
          ? projectVisitRes.data.results
          : [];

      const visitLogs = Array.isArray(logVisitRes?.data)
        ? logVisitRes.data
        : Array.isArray(logVisitRes?.data?.results)
          ? logVisitRes.data.results
          : [];

      const logOptions = visitLogs
        .filter((log) => log?.source_agenda)
        .map((log) => ({
          id: log.source_agenda,
          visit_date: log.visit_date,
        }));

      setVisitAgendaOptions(logOptions.length ? logOptions : projectVisits);
      // Reset visit agenda selection
      setNewTask(prev => ({ ...prev, meeting_agenda_id: "" }));
    } catch (error) {
      console.error("Error fetching meeting agendas:", error);
      setVisitAgendaOptions([]);
    }
  };

  const initiateCompleteTask = (task) => {
    setSelectedTask(task);
    setCompleteModalOpen(true);
    setCompletionFile(null); // Reset
  };

  const confirmCompleteTask = async () => {
    if (!selectedTask) return;

    try {
      const formData = new FormData();

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const todayDate = parseDateOnly(today);
      const targetDate = parseDateOnly(selectedTask.target_date);

      let status = "on_time";
      if (todayDate && targetDate && todayDate > targetDate) status = "delay_completion";

      formData.append("status", status);
      formData.append("completion_date", today);

      if (completionFile) {
        formData.append("completion_file", completionFile);
      }

      await api.patch(`/action-tasks/${selectedTask.id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      fetchData(clientId); // Refresh
      setCompleteModalOpen(false);
      setSelectedTask(null);
      setCompletionFile(null);
    } catch (error) {
      console.error("Error completing task:", error);
      alert("Failed to complete task.");
    }
  };



  const isExternal = currentUser?.role === "EXTERNAL";

  // Filtered Tasks Logic
  const filteredTasks = actionTasks.filter(task => {
    // Apply client filter (ALL, MY, KAYAARA, CLIENT)
    if (activeFilter === "MY") {
      if (task.assigned_to !== currentUser?.id) return false;
    } else if (activeFilter === "KAYAARA") {
      if (!internalIds.includes(task.assigned_to)) return false;
    } else if (activeFilter === "CLIENT") {
      if (!externalIds.includes(task.assigned_to)) return false;
    }
    // ALL filter shows all tasks regardless of assignment

    // Apply project filter
    if (!includeAllProjects && selectedProjects.length > 0) {
      if (!selectedProjects.includes(String(task.project_id))) return false;
    }

    return true;
  }).map((task) => ({ ...task, effective_status: getEffectiveStatus(task) }))
  .sort((a, b) => {
    // Sort Completed tasks to the bottom
    const isCompleteA = ['on_time', 'delay_completion'].includes(a.effective_status);
    const isCompleteB = ['on_time', 'delay_completion'].includes(b.effective_status);

    if (isCompleteA !== isCompleteB) {
      return isCompleteA ? 1 : -1;
    }

    // Sort Overdue to the top
    if (a.effective_status === 'over_due' && b.effective_status !== 'over_due') return -1;
    if (a.effective_status !== 'over_due' && b.effective_status === 'over_due') return 1;

    return 0;
  });

  // Derived Chart Data
  const getStatusCount = (status) => filteredTasks.filter(t => t.effective_status === status).length;

  // KPIs
  const totalTasks = filteredTasks.length;
  const onTime = getStatusCount("on_time");
  const delayed = getStatusCount("delay_completion");
  const inProgress = getStatusCount("in_progress");
  const overDue = getStatusCount("over_due");

  // Percentage ATS Score Logic
  const calculateTaskATS = (task) => {
    const status = getEffectiveStatus(task);

    // 1) In Progress => ignored in aggregate
    if (status === 'in_progress') return null;

    // 2) Overdue => 0
    if (status === 'over_due' || status === 'overdue') return 0;

    if (!task?.start_date || !task?.target_date || !task?.completion_date) return null;

    const start = new Date(task.start_date);
    const target = new Date(task.target_date);
    const comp = new Date(task.completion_date);
    if ([start, target, comp].some((d) => Number.isNaN(d.getTime()))) return null;

    const dayMs = 24 * 60 * 60 * 1000;
    const planned = Math.round((target.getTime() - start.getTime()) / dayMs);
    const actual = Math.round((comp.getTime() - start.getTime()) / dayMs);
    const round2 = (value) => Math.round(value * 100) / 100;
    const clampAndRound = (value) => round2(Math.max(0, value));

    const isOnTimeOrCompleted = status === 'on_time' || status === 'completed';
    const isDelayed = status === 'delay_completion' || status === 'delayed';

    // 3) On Time / Completed
    if (isOnTimeOrCompleted) {
      if (target > comp) return 100;
      if (start.getTime() === comp.getTime() && comp.getTime() === target.getTime()) return 100;
      if (start.getTime() === target.getTime() && comp.getTime() !== start.getTime()) {
        return clampAndRound((1 / (actual + 1)) * 100);
      }
      if (actual === 0) return 100;
      return clampAndRound((planned / actual) * 100);
    }

    // 4) Delayed
    if (isDelayed) {
      if (start.getTime() === target.getTime() && target.getTime() === comp.getTime()) return 100;
      if (target > comp) return 100;
      if (actual === 0) return 100;
      if (start.getTime() === target.getTime()) {
        return clampAndRound((1 / (actual + 1)) * 100);
      }
      return clampAndRound((planned / actual) * 100);
    }

    return null;
  };

  // Efficiency now follows the exact ATS aggregation rule:
  // (on_time * 100 + delayed ATS sum + overdue 0) / (total - in_progress)
  const delayedAtsSum = filteredTasks
    .filter((task) => task.effective_status === 'delay_completion')
    .reduce((sum, task) => {
      const value = calculateTaskATS(task);
      return sum + (value ?? 0);
    }, 0);
  const efficiencyDenominator = totalTasks - inProgress;
  const efficiency = efficiencyDenominator > 0
    ? Math.round(((onTime * 100) + delayedAtsSum) / efficiencyDenominator)
    : 0;

  // OTC Score Formula: onTime / (totalTasks - inProgress)
  const otcDenominator = totalTasks - inProgress;
  const otcScore = otcDenominator > 0 ? Math.round((onTime / otcDenominator) * 100) : 0;

  // Strict 3-color chart: blue family + ink only
  const chartData = [
    { name: "On Time", value: onTime, color: "#0086ff" },
    // { name: "In Progress", value: inProgress, color: "#66b6ff" }, // Removed as requested
    { name: "Delayed", value: delayed, color: "#66b6ff" },
    { name: "Overdue", value: overDue, color: "#212121" },
  ];

  useEffect(() => {
    const visibleTaskIds = new Set(filteredTasks.map((task) => task.id));
    setSelectedTaskIds((prev) => {
      const next = prev.filter((id) => visibleTaskIds.has(id));
      if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return next;
    });
  }, [filteredTasks]);


  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="k-band-white k-band-pad border-b" style={{ borderColor: 'var(--k-grey-200)' }}>
            <div className="k-skeleton h-10 w-64" />
          </div>
          <div className="k-band-grey k-band-pad">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="k-skeleton h-[92px]" />)}
            </div>
          </div>
          <div className="k-band-white k-band-pad grid grid-cols-12 gap-4">
            <div className="k-skeleton h-[260px] col-span-12 lg:col-span-7" />
            <div className="k-skeleton h-[260px] col-span-12 lg:col-span-5" />
          </div>
          <div className="k-band-grey k-band-pad">
            <div className="k-skeleton h-[320px]" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        <PageHeader
          title="Action"
          accent="Plan"
          subtitle="Execution & monitoring"
          live
          actions={!isExternal ? (
            <>
              <button
                onClick={() => setShowExcelImportModal(true)}
                className="k-btn-ghost flex items-center gap-2 text-xs uppercase tracking-widest"
              >
                <FileText size={14} /> Import Excel
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="k-btn-primary flex items-center gap-2 text-xs uppercase tracking-widest"
              >
                <Plus size={14} /> New Action Entry
              </button>
            </>
          ) : null}
        />

        <main className="flex-1 overflow-y-auto k-scroll">

          {/* ── BAND 2 · GREY · scope filter + KPI cards ────── */}
          <Band tone="grey" eyebrow="Overview">
            <div className="flex flex-wrap gap-2 mb-4">
              {['ALL', 'MY', 'KAYAARA', 'CLIENT'].map((filter) => {
                const label = filter === 'ALL' ? 'All Actions'
                  : filter === 'MY' ? 'My Actions'
                    : filter === 'KAYAARA' ? 'KAYAARA Actions'
                      : 'Client Actions';
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-all whitespace-nowrap"
                    style={isActive
                      ? { background: 'var(--k-blue)', color: 'var(--k-white)', boxShadow: '0 6px 18px -8px var(--k-blue-glow)' }
                      : { background: 'var(--k-white)', color: 'var(--k-grey-500)', border: '1px solid var(--k-grey-200)' }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <KpiCard index={0} label="Total action" value={totalTasks} icon={<LayoutGrid />} accent />
              <KpiCard index={1} label="On time action" value={onTime} icon={<CheckCircle />} accent />
              <KpiCard index={2} label="Delay completion" value={delayed} icon={<Clock />} />
              <KpiCard index={3} label="In progress" value={inProgress} icon={<TrendingUp />} />
              <KpiCard index={4} label="Over due" value={overDue} icon={<AlertCircle />} />
              <KpiCard index={5} label="Efficiency" value={efficiency} suffix="%" icon={<User />} accent />
            </div>
          </Band>

          {/* ── BAND 3 · WHITE · distribution chart + project filter ── */}
          <Band tone="white">
            <div className="grid grid-cols-12 gap-4">

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={`col-span-12 ${projectOptions.length > 0 ? 'lg:col-span-7' : ''} k-card-grey p-5`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h2 className="k-section-title">Action plan distribution</h2>
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-lg"
                    style={{ background: 'var(--k-white)', color: 'var(--k-blue)' }}
                  >
                    <BarChart3 size={15} />
                  </span>
                </div>

                <div className="h-[220px] min-h-[220px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        stroke="none"
                        animationBegin={200}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        allowEscapeViewBox={{ x: true, y: true }}
                        wrapperStyle={{ zIndex: 60 }}
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid var(--k-grey-200)',
                          boxShadow: '0 12px 32px -12px rgba(0,134,255,0.25)',
                          fontFamily: 'Poppins, sans-serif',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* OTC Score Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="k-eyebrow">OTC</span>
                    <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--k-blue)' }}>
                      <AnimatedNumber value={otcScore} suffix="%" />
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-5 mt-1">
                  {chartData.map((d) => (
                    <span key={d.name} className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--k-grey-700)' }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                  ))}
                </div>
              </motion.div>

              {projectOptions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="col-span-12 lg:col-span-5 k-card-grey p-5 flex flex-col max-h-[340px]"
                >
                  <h2 className="k-section-title mb-4 shrink-0">Project filter</h2>
                  {loading ? <p className="text-xs" style={{ color: 'var(--k-grey-500)' }}>Loading...</p> : (
                    <div className="flex-1 overflow-y-auto k-scroll pr-2 space-y-1">
                      <label
                        className="flex items-center gap-3 text-sm font-semibold cursor-pointer rounded-lg px-2.5 py-2 transition-colors"
                        style={{
                          background: includeAllProjects ? 'var(--k-blue-tint)' : 'transparent',
                          color: includeAllProjects ? 'var(--k-blue)' : 'var(--k-grey-700)',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={includeAllProjects}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIncludeAllProjects(checked);
                            if (checked) {
                              setSelectedProjects(projectOptions.map(p => p.id));
                            }
                          }}
                        />
                        All Projects
                      </label>
                      {projectOptions.map((proj, i) => {
                        const checked = includeAllProjects || selectedProjects.includes(proj.id);
                        return (
                          <motion.label
                            key={proj.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.25 + i * 0.04 }}
                            className="flex items-center gap-3 text-sm font-medium cursor-pointer rounded-lg px-2.5 py-2 transition-colors"
                            style={{
                              background: checked && !includeAllProjects ? 'var(--k-blue-tint)' : 'transparent',
                              color: checked ? 'var(--k-blue)' : 'var(--k-grey-700)',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleProjectSelection(proj.id)}
                            />
                            {proj.name}
                          </motion.label>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </Band>

          {/* ── BAND 4 · GREY · action matrix table ─────────── */}
          <Band tone="grey" eyebrow="Execution & monitoring" title="Action matrix">
            <div className="k-card !rounded-2xl overflow-hidden hover:!transform-none">
              <div className="overflow-x-auto k-scroll">
                <table className="k-table text-left">
                  <thead>
                    <tr>
                      <th className="text-center">Sr. No.</th>
                      <th>Action / Task</th>
                      <th>Project</th>
                      <th>Assign To</th>
                      <th className="text-center">Target Date</th>
                      <th className="text-center">Completion Date</th>
                      <th className="text-center">Task Doc</th>
                      <th className="text-center">Completion Doc</th>
                      <th className="text-center">Status</th>
                      <th className="text-center">Select</th>
                      <th className="text-center">Complete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map((item, idx) => {
                      const normalizedStatus = item.effective_status;
                      const isCompleted = Boolean(item.completion_date) || ['on_time', 'delay_completion', 'completed'].includes(normalizedStatus);
                      const isMyTask = Number(item.assigned_to) === Number(currentUser?.id);
                      const canComplete = isMyTask && !isCompleted;
                      const isSelected = selectedTaskIds.includes(item.id);

                      return (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.05, 0.6), duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="group transition-colors"
                        style={isSelected ? { background: 'var(--k-blue-tint)' } : undefined}
                      >
                        <td className="text-center">
                          <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--k-grey-500)' }}>{idx + 1}</span>
                        </td>
                        <td>
                          <p className="font-semibold text-sm transition-colors" style={{ color: 'var(--k-ink)' }}>{item.task}</p>
                        </td>
                        <td>
                          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--k-grey-500)' }}>
                            {getProjectName(item)}
                          </p>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold uppercase shrink-0"
                              style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                            >
                              {isExternal && internalIds.includes(item.assigned_to)
                                ? "H"
                                : (item.assigned_to_name ? item.assigned_to_name.charAt(0) : "?")}
                            </div>
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--k-ink)' }}>
                              {isExternal && internalIds.includes(item.assigned_to)
                                ? "KAYAARA Team"
                                : (item.assigned_to_name || `User ${item.assigned_to}`)}
                            </span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="k-pill-grey tabular-nums">
                            {formatDateDDMMYYYY(item.target_date)}
                          </span>
                        </td>

                        <td className="text-center">
                          <span className="k-pill-grey tabular-nums">
                            {formatDateDDMMYYYY(item.completion_date)}
                          </span>
                        </td>

                        <td className="text-center">
                          {item.assign_file ? (
                            <a href={resolveMediaUrl(item.assign_file)} target="_blank" rel="noreferrer" className="k-btn-icon !w-8 !h-8" title="View Assignment Doc">
                              <FileText size={14} />
                            </a>
                          ) : (
                            <span className="text-[10px]" style={{ color: 'var(--k-grey-300)' }}>-</span>
                          )}
                        </td>

                        <td className="text-center">
                          {item.completion_file ? (
                            <a href={resolveMediaUrl(item.completion_file)} target="_blank" rel="noreferrer" className="k-btn-icon !w-8 !h-8" title="View Completion Doc">
                              <CheckCircle size={14} />
                            </a>
                          ) : (
                            <span className="text-[10px]" style={{ color: 'var(--k-grey-300)' }}>-</span>
                          )}
                        </td>

                        <td className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`${activeFilter === 'MY'
                              ? (isCompleted ? STATUS_PILL_CLASS.on_time : STATUS_PILL_CLASS.in_progress)
                              : (STATUS_PILL_CLASS[normalizedStatus] || STATUS_PILL_CLASS.in_progress)
                              } uppercase`}>
                              {activeFilter === 'MY'
                                ? (isCompleted ? 'COMPLETED' : 'IN PROGRESS')
                                : normalizedStatus.replace('_', ' ')}
                            </span>
                          </div>
                        </td>

                        <td className="text-center">
                          {canComplete ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTaskSelection(item.id)}
                              className="cursor-pointer scale-105"
                            />
                          ) : (
                            <span className="text-[10px]" style={{ color: 'var(--k-grey-300)' }}>-</span>
                          )}
                        </td>

                        <td className="text-center">
                          {canComplete ? (
                            <button
                              onClick={() => initiateCompleteTask(item)}
                              className="k-btn-primary !py-1.5 !px-3 !rounded-full text-[10px] uppercase tracking-wider"
                            >
                              COMPLETE
                            </button>
                          ) : (
                            <span className="text-[10px]" style={{ color: 'var(--k-grey-300)' }}>-</span>
                          )}
                        </td>
                      </motion.tr>
                    )})}
                    {filteredTasks.length === 0 && (
                      <tr>
                        <td colSpan="11" className="text-center py-10">
                          <div className="flex flex-col items-center gap-3">
                            <img src="/kayaara-mark.png" alt="" className="w-12 h-12 opacity-70" />
                            <p className="text-sm font-semibold" style={{ color: 'var(--k-ink)' }}>No tasks found</p>
                            {!isExternal && (
                              <button
                                onClick={() => setIsModalOpen(true)}
                                className="k-btn-primary flex items-center gap-2 text-xs uppercase tracking-widest"
                              >
                                <Plus size={14} /> New Action Entry
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Band>

          {/* ── LAST BAND · WHITE · footer strip ─────────────── */}
          <footer className="k-band-white px-5 md:px-8 py-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
            <span className="text-[11px]" style={{ color: 'var(--k-grey-500)' }}>
              Kayaara PMS · Innovating beyond systems
            </span>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--k-blue)' }}>
              Kayaara Innovations Pvt Ltd
            </span>
          </footer>
        </main>

        {/* ===== FORM MODAL ===== */}
        {
          isModalOpen && (
            <div className="k-backdrop">
              <div className="k-modal !max-w-xl max-h-[95vh]">
                <div className="p-4 sm:p-6 flex justify-between items-center border-b shrink-0" style={{ borderColor: 'var(--k-grey-200)' }}>
                  <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--k-ink)' }}>
                    New <span style={{ color: 'var(--k-blue)' }}>Action Plan</span> Entry
                  </h3>
                  <button onClick={() => setIsModalOpen(false)} className="k-btn-icon" aria-label="Close">
                    <X size={18} />
                  </button>
                </div>
                <div className="overflow-y-auto k-scroll p-4 sm:p-6">
                  <form onSubmit={handleCreateTask} className="space-y-4">
                  <div>
                    <label className="k-label">Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={handleProjectSelect}
                      className="k-select"
                      required
                    >
                      {projectOptions.map((proj) => (
                        <option key={proj.id} value={proj.id}>{proj.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="k-label">Meeting Agenda (Optional)</label>
                    <select
                      value={newTask.meeting_agenda_id}
                      onChange={e => setNewTask({ ...newTask, meeting_agenda_id: e.target.value })}
                      className="k-select"
                    >
                      <option value="">Select Meeting Agenda</option>
                      {visitAgendaOptions.map((agenda, index) => (
                        <option key={`${agenda.id}-${agenda.visit_date}-${index}`} value={agenda.id}>{formatDateDDMMYYYY(agenda.visit_date)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="k-label">Action Description</label>
                    <input
                      type="text"
                      value={newTask.task}
                      onChange={e => setNewTask({ ...newTask, task: e.target.value })}
                      className="k-input"
                      placeholder="What needs to be done?"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="k-label">Start Date</label>
                      <input
                        type="date"
                        value={newTask.start_date}
                        onChange={e => setNewTask({ ...newTask, start_date: e.target.value })}
                        className="k-input tabular-nums"
                        required
                      />
                    </div>
                    <div>
                      <label className="k-label">Target Date</label>
                      <input
                        type="date"
                        value={newTask.target_date}
                        onChange={e => setNewTask({ ...newTask, target_date: e.target.value })}
                        className="k-input tabular-nums"
                        required
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="k-label">Assign To</label>
                      <select
                        value={newTask.assigned_to}
                        onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}
                        className="k-select"
                        required
                      >
                        <option value="">Select Member</option>
                        {projectMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.username || m.email} ({m.email})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="k-label">Flag (Optional)</label>
                      <select
                        value={newTask.flag}
                        onChange={e => setNewTask({ ...newTask, flag: e.target.value })}
                        className="k-select"
                      >
                        {taskFlagOptions.map((flag) => (
                          <option key={flag.value} value={flag.value}>{flag.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-2">
                    <label className="k-label">Attachment (Document/File)</label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="k-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold"
                      style={{ color: 'var(--k-grey-500)' }}
                    />
                  </div>
                  <button type="submit" className="k-btn-primary w-full uppercase tracking-[0.2em] !py-4 mt-2 text-xs">
                    Submit Action Plan
                  </button>
                  </form>
                </div>
              </div>
            </div>
          )
        }

        {showExcelImportModal && (
          <div className="k-backdrop">
            <div className="k-modal !max-w-6xl max-h-[95vh]">
              <div className="p-4 sm:p-6 flex justify-between items-center border-b shrink-0" style={{ borderColor: 'var(--k-grey-200)' }}>
                <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--k-ink)' }}>
                  Import Action Tasks From <span style={{ color: 'var(--k-blue)' }}>Excel</span>
                </h3>
                <button onClick={() => setShowExcelImportModal(false)} className="k-btn-icon" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto k-scroll">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-end">
                  <div className="lg:col-span-2">
                    <label className="k-label">Excel File (.xlsx)</label>
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleActionPlanExcelImport}
                      className="k-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold"
                      style={{ color: 'var(--k-grey-500)' }}
                    />
                  </div>
                  <div
                    className="text-[11px] font-medium rounded-xl px-4 py-3"
                    style={{ color: 'var(--k-grey-700)', background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}
                  >
                    Required columns: Task, Assigned To, Target Date. Optional columns: Client, Project, Flag, Priority.
                  </div>
                </div>

                {excelUploadStatus?.loading && (
                  <div className="text-xs font-semibold rounded-xl px-4 py-3" style={{ color: 'var(--k-blue)', background: 'var(--k-blue-tint)', border: '1px solid var(--k-grey-200)' }}>Reading Excel file...</div>
                )}
                {excelUploadStatus?.error && (
                  <div className="text-xs font-semibold rounded-xl px-4 py-3" style={{ color: 'var(--k-white)', background: 'var(--k-ink)' }}>{excelUploadStatus.error}</div>
                )}
                {excelUploadStatus?.message && (
                  <div className="text-xs font-semibold rounded-xl px-4 py-3" style={{ color: 'var(--k-blue)', background: 'var(--k-blue-tint)', border: '1px solid var(--k-grey-200)' }}>{excelUploadStatus.message}</div>
                )}

                {draftActionTasks.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}>
                    <div className="px-4 py-3 border-b flex justify-between items-center" style={{ borderColor: 'var(--k-grey-200)' }}>
                      <h4 className="k-eyebrow">{draftActionTasks.length} Draft Action Tasks</h4>
                    </div>
                    <div className="overflow-x-auto k-scroll max-h-[420px]">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 z-10" style={{ background: 'var(--k-white)' }}>
                          <tr>
                            <th className="px-3 py-2 k-eyebrow">Action</th>
                            <th className="px-3 py-2 k-eyebrow">Client</th>
                            <th className="px-3 py-2 k-eyebrow">Project</th>
                            <th className="px-3 py-2 k-eyebrow">Assign To</th>
                            <th className="px-3 py-2 k-eyebrow">Target Date</th>
                            <th className="px-3 py-2 k-eyebrow">Flag</th>
                            <th className="px-3 py-2 k-eyebrow">Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draftActionTasks.map((task, idx) => {
                            const isPastDate = Boolean(task.targetDate && task.targetDate < minTaskDate);
                            return (
                              <tr
                                key={task._id || idx}
                                className="border-t"
                                style={{ borderColor: 'var(--k-grey-100)', background: isPastDate ? 'var(--k-blue-tint)' : 'transparent' }}
                              >
                                <td className="px-3 py-2 min-w-[220px]">
                                  <input
                                    type="text"
                                    value={task.task}
                                    onChange={(e) => {
                                      const updated = [...draftActionTasks];
                                      updated[idx] = { ...updated[idx], task: e.target.value, importError: '' };
                                      setDraftActionTasks(updated);
                                    }}
                                    className="k-input !py-1.5 !px-2"
                                  />
                                </td>
                                <td className="px-3 py-2 min-w-[180px]">
                                  <input
                                    type="text"
                                    value={getDraftClientName(task)}
                                    readOnly
                                    className="k-input !py-1.5 !px-2"
                                    disabled
                                  />
                                </td>
                                <td className="px-3 py-2 min-w-[180px]">
                                  <select
                                    value={task.projectId}
                                    onChange={(e) => {
                                      const updated = [...draftActionTasks];
                                      const selectedProject = projectOptions.find((proj) => String(proj.id) === String(e.target.value));
                                      updated[idx] = {
                                        ...updated[idx],
                                        projectId: e.target.value,
                                        rawClient: selectedProject?.clientName || updated[idx].rawClient,
                                        importError: '',
                                      };
                                      setDraftActionTasks(updated);
                                    }}
                                    className="k-select !py-1.5 !px-2"
                                  >
                                    <option value="">Select Project</option>
                                    {projectOptions.map((proj) => (
                                      <option key={proj.id} value={proj.id}>{proj.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2 min-w-[220px]">
                                  <div className="space-y-1">
                                    <select
                                      value={task.assignedTo}
                                      onChange={(e) => {
                                        const updated = [...draftActionTasks];
                                        updated[idx] = { ...updated[idx], assignedTo: e.target.value, importError: '' };
                                        setDraftActionTasks(updated);
                                      }}
                                      className="k-select !py-1.5 !px-2"
                                    >
                                      <option value="">Select Member</option>
                                      {(task.isInternal
                                        ? projectMembers.filter((m) => String(m.type || '').toUpperCase() === 'INTERNAL')
                                        : projectMembers
                                      ).map((m) => (
                                        <option key={m.id} value={String(m.id)}>{`${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username}</option>
                                      ))}
                                    </select>
                                    {task.importError && String(task.importError).includes('Assignee') && (
                                      <p className="text-[10px] font-bold" style={{ color: 'var(--k-ink)' }}>
                                        {task.importError}
                                      </p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 min-w-[140px]">
                                  <input
                                    type="date"
                                    value={task.targetDate}
                                    onChange={(e) => {
                                      const updated = [...draftActionTasks];
                                      updated[idx] = { ...updated[idx], targetDate: e.target.value, importError: '' };
                                      setDraftActionTasks(updated);
                                    }}
                                    className="k-input !py-1.5 !px-2 tabular-nums"
                                  />
                                </td>
                                <td className="px-3 py-2 min-w-[140px]">
                                  <select
                                    value={task.flag || 'none'}
                                    onChange={(e) => {
                                      const updated = [...draftActionTasks];
                                      updated[idx] = { ...updated[idx], flag: e.target.value, importError: '' };
                                      setDraftActionTasks(updated);
                                    }}
                                    className="k-select !py-1.5 !px-2"
                                  >
                                    {taskFlagOptions.map((flagOpt) => (
                                      <option key={flagOpt.value} value={flagOpt.value}>{flagOpt.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2 min-w-[140px]">
                                  <div className="space-y-1">
                                    <select
                                      value={task.priority || 'LOW'}
                                      onChange={(e) => {
                                        const updated = [...draftActionTasks];
                                        updated[idx] = { ...updated[idx], priority: e.target.value };
                                        setDraftActionTasks(updated);
                                      }}
                                      className="k-select !py-1.5 !px-2"
                                    >
                                      {taskPriorityOptions.map((priorityOpt) => (
                                        <option key={priorityOpt.value} value={priorityOpt.value}>{priorityOpt.label}</option>
                                      ))}
                                    </select>
                                    {(task.importError || isPastDate || task.isInternal) && (
                                      <p
                                        className="text-[10px] font-bold"
                                        style={{ color: task.importError ? 'var(--k-ink)' : isPastDate ? 'var(--k-grey-700)' : 'var(--k-blue)' }}
                                      >
                                        {task.importError || (isPastDate ? 'Past date: kept as draft' : 'Internal row')}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="px-4 py-3 border-t flex justify-end gap-2" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-white)' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setDraftActionTasks([]);
                          setExcelUploadStatus(null);
                        }}
                        className="k-btn-ghost !py-2 !px-4 text-xs"
                      >
                        Clear Drafts
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitActionPlanDrafts}
                        disabled={isSubmittingDrafts}
                        className="k-btn-primary !py-2 !px-4 text-xs"
                      >
                        {isSubmittingDrafts ? 'Submitting...' : 'Submit Drafts'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== COMPLETION MODAL ===== */}
        {completeModalOpen && (
          <div className="k-backdrop">
            <div className="k-modal !max-w-md max-h-[95vh]">
              <div className="p-4 sm:p-6 border-b shrink-0" style={{ borderColor: 'var(--k-grey-200)' }}>
                <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--k-ink)' }}>
                  Complete <span style={{ color: 'var(--k-blue)' }}>Task</span>
                </h3>
                <p className="text-xs mt-1 truncate" style={{ color: 'var(--k-grey-500)' }}>{selectedTask?.task}</p>
              </div>

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto k-scroll">
                <div>
                  <label className="k-label">Completion Document</label>
                  <input
                    type="file"
                    onChange={handleCompletionFileChange}
                    className="k-input file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold"
                    style={{ color: 'var(--k-grey-500)' }}
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setCompleteModalOpen(false)}
                    className="k-btn-ghost !py-2.5 !px-5 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCompleteTask}
                    className="k-btn-primary !py-2.5 !px-5 text-xs"
                  >
                    Confirm Completion
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ActionPlanDashboard;
