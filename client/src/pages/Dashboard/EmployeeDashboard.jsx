import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api";
import Sidebar from "../../components/Sidebar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Calendar, Search, Filter, ClipboardList, Plus, CheckCircle,
  LayoutGrid, Clock, AlertCircle, TrendingUp, User, Download,
  X, Upload, SearchCode, SendHorizontal, FileCheck, BarChart3, FileText, Trash2,
  ChevronLeft, ChevronRight, ArrowLeft, List, Building2, Play, Pause, Save
} from "lucide-react";
import { motion } from "framer-motion";
import { formatDateDDMMYYYY } from "../../utils/dateFormat";
import { formatSeconds, formatDuration } from "../../utils/timeUtils";
import AnimatedNumber from "../../components/kayaara/AnimatedNumber";
import KpiCard from "../../components/kayaara/KpiCard";
import { Band, PageHeader } from "../../components/kayaara/Band";
import SavedFiltersBar from "../../components/SavedFiltersBar";

const parseDateOnly = (value) => {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const normalizeStatusValue = (value) => String(value || "").trim().toLowerCase();

const getEffectiveTaskStatus = (task) => {
  const status = normalizeStatusValue(task?.status);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = parseDateOnly(task?.target_date || task?.targetDate);
  const completion = parseDateOnly(task?.completion_date || task?.completionDate);

  // Handle explicit status values first
  if (status === "backlog") return "backlog";
  if (status === "planning") return "planning";
  if (status === "review") return "review";
  if (status === "testing") return "testing";
  if (status === "blocked") return "blocked";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";

  if (completion) {
    if (target && completion > target) return "delay_completion";
    return "on_time";
  }

  if (status.includes("overdue") || status === "over_due") return "over_due";
  if (target && target < today) return "over_due";
  if (status.includes("delay") || status.includes("late")) return "delay_completion";
  if (status.includes("on time") || status === "on_time" || status.includes("completed")) return "on_time";
  return "in_progress";
};

const calculateTaskATS = (task) => {
  const status = getEffectiveTaskStatus(task);

  if (status === "in_progress") return null;
  if (status === "over_due") return 0;

  const start = parseDateOnly(task?.start_date || task?.startDate);
  const target = parseDateOnly(task?.target_date || task?.targetDate);
  const completion = parseDateOnly(task?.completion_date || task?.completionDate);

  if (!start || !target || !completion) {
    return status === "on_time" ? 100 : 0;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const planned = Math.round((target.getTime() - start.getTime()) / dayMs);
  const actual = Math.round((completion.getTime() - start.getTime()) / dayMs);
  const round2 = (value) => Math.round(Math.max(0, value) * 100) / 100;

  if (completion <= target) return 100;
  if (actual === 0) return 100;
  if (start.getTime() === target.getTime()) {
    return round2((1 / (actual + 1)) * 100);
  }
  return round2((planned / actual) * 100);
};

const isPdfAttachment = (file) => {
  if (!file) return true;

  const fileName = String(file?.name || "").toLowerCase();
  const mimeType = String(file?.type || "").toLowerCase();

  return mimeType === "application/pdf" || fileName.endsWith(".pdf");
};

const EmployeeDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // DATE RANGE STATE
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false);
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");
  const dateFilterRef = useRef(null);

  // MCTC Calendar Enhancement States
  const [originalStartDate, setOriginalStartDate] = useState("");
  const [originalEndDate, setOriginalEndDate] = useState("");
  const [currentStartDate, setCurrentStartDate] = useState("");
  const [currentEndDate, setCurrentEndDate] = useState("");
  const [draftOriginalStartDate, setDraftOriginalStartDate] = useState("");
  const [draftOriginalEndDate, setDraftOriginalEndDate] = useState("");
  const [draftCurrentStartDate, setDraftCurrentStartDate] = useState("");
  const [draftCurrentEndDate, setDraftCurrentEndDate] = useState("");

  const [revisionFilter, setRevisionFilter] = useState("all"); // "all", "revised", "ge2", "ge3"
  const [showRevisionFilterDropdown, setShowRevisionFilterDropdown] = useState(false);
  const revisionFilterRef = useRef(null);

  const [historyPopup, setHistoryPopup] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  // MODAL STATES
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSmartPasteModal, setShowSmartPasteModal] = useState(false);
  const [showExcelImportModal, setShowExcelImportModal] = useState(false);
  const [excelUploadStatus, setExcelUploadStatus] = useState(null);
  const [excelPreview, setExcelPreview] = useState(null); // { columns: [], rows: [] }
  const [columnMapping, setColumnMapping] = useState({}); // { 'task': 0, 'assigned_to': 2, etc }
  const [mappingStep, setMappingStep] = useState(false); // true = show mapping UI, false = show upload UI
  const [excelImportFlag, setExcelImportFlag] = useState('none');
  const [excelImportPriority, setExcelImportPriority] = useState('LOW');
  const [excelErrorFields, setExcelErrorFields] = useState([]);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // TIME TRACKING STATES
  const [activeTimerState, setActiveTimerState] = useState({
    taskId: null,
    taskTitle: '',
    isRunning: false,
    seconds: 0,
    entryId: null,
  });

  // Timer interval ticking
  useEffect(() => {
    let interval = null;
    if (activeTimerState.isRunning && activeTimerState.taskId) {
      interval = setInterval(() => {
        setActiveTimerState((prev) => ({
          ...prev,
          seconds: prev.seconds + 1,
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimerState.isRunning, activeTimerState.taskId]);

  // Restore active timer on load
  useEffect(() => {
    const checkActiveTimers = async () => {
      try {
        const res = await api.get('tasks/my_active_timers/');
        if (Array.isArray(res.data) && res.data.length > 0) {
          const active = res.data[0];
          const startTime = active.start_time ? new Date(active.start_time) : new Date();
          const elapsedSecs = Math.max(0, Math.floor((new Date() - startTime) / 1000)) + ((active.duration_minutes || 0) * 60);

          setActiveTimerState({
            taskId: active.task,
            taskTitle: active.task_id || `Task #${active.task}`,
            isRunning: true,
            seconds: elapsedSecs,
            entryId: active.id,
          });
        }
      } catch (err) {
        console.warn('Failed to fetch active timers', err);
      }
    };
    checkActiveTimers();
  }, []);

  const handleStartTimer = async (task) => {
    try {
      const res = await api.post(`tasks/${task.id}/start_timer/`);
      const entry = res.data.time_entry;
      setActiveTimerState({
        taskId: task.id,
        taskTitle: task.title || task.task_id || `#${task.id}`,
        isRunning: true,
        seconds: ((entry.duration_minutes || 0) * 60),
        entryId: entry.id,
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to start timer:', err);
      alert(err.response?.data?.error || 'Failed to start timer.');
    }
  };

  const handlePauseTimer = async (task) => {
    try {
      await api.post(`tasks/${task.id}/pause_timer/`);
      setActiveTimerState((prev) => ({
        ...prev,
        isRunning: false,
      }));
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to pause timer:', err);
    }
  };

  const handleSaveTimeLog = async (task) => {
    try {
      const elapsedMins = Math.ceil((activeTimerState.seconds || 0) / 60);
      await api.post(`tasks/${task.id}/save_time_log/`, {
        duration_minutes: elapsedMins,
      });
      setActiveTimerState({
        taskId: null,
        taskTitle: '',
        isRunning: false,
        seconds: 0,
        entryId: null,
      });
      fetchDashboardData();
      alert(`Saved ${formatDuration(elapsedMins)} log for task.`);
    } catch (err) {
      console.error('Failed to save time log:', err);
      alert('Failed to save time log.');
    }
  };

  // FORM STATES FOR TASK COMPLETION

  const [fetchId, setFetchId] = useState("");
  const [completionData, setCompletionData] = useState({
    id: "", task: "", client: "", project: "", remarks: "", file: null
  });

  const [assignData, setAssignData] = useState({
    task: "", project: "", client: "", assignedTo: "", targetDate: "", file: null,
    flag: 'none', priority: 'LOW',
    isInternal: false
  });


  // New Task State for Bulk (Includes Client/Project/User now)
  // Initializing with one empty row
  const getEmptyTaskRow = () => ({
    client: "", project: "", assignedTo: "",
    title: "", targetDate: "", file: null, flag: 'none', priority: 'LOW',
    isInternal: false
  });

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

  const [bulkTasks, setBulkTasks] = useState([getEmptyTaskRow()]);

  const normalizeRoleLabel = (role) => {
    const normalized = String(role || "").toUpperCase();
    if (normalized.includes("EXTERNAL")) return "(EXTERNAL)";
    if (normalized.includes("SENIOR")) return "(SENIOR)";
    return normalized || "EMPLOYEE";
  };

  const buildMemberFromUser = (user) => {
    if (!user) return null;

    return {
      ...user,
      id: user.id,
      username: user.username,
      full_name: user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
      email: user.email,
      role: normalizeRoleLabel(user.role),
    };
  };

  const dedupeMembersByIdentity = (members = []) => {
    const unique = new Map();

    members.forEach((member) => {
      if (!member) return;

      const emailKey = member.email ? `email:${String(member.email).toLowerCase()}` : "";
      const idKey = member.id ? `id:${member.id}` : "";
      const key = emailKey || idKey;
      if (!key || unique.has(key)) return;

      unique.set(key, {
        ...member,
        role: normalizeRoleLabel(member.role),
      });
    });

    return Array.from(unique.values());
  };

  const getViewerRole = () => String(currentUser?.role || localStorage.getItem("role") || "").toUpperCase();

  const isInternalRole = (role) => ["ADMIN", "KAYAARA", "MLS", "SGM", "EMPLOYEE"].includes(String(role || "").toUpperCase());

  const refreshTaskLists = async () => {
    const tasksRes = await api.get('tasks/');
    const allFetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);

    const userRes = await api.get('me/');
    const { my_active, my_completed, delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
    setMyTasks(my_active);
    setCompletedTasks(my_completed);
    setDelegatedTasks(delegated);
  };

  const canDeleteTask = (task) => {
    if (!task?.id) return false;

    const sourceModule = String(task?.source_module || '').trim().toUpperCase();
    const nonDeletableModules = ['DDFMS', 'ACTION_PLAN'];
    if (nonDeletableModules.includes(sourceModule)) return false;

    return Number(task?.assigned_by) === Number(currentUser?.id);
  };

  const requestDeleteTask = (task) => {
    if (!canDeleteTask(task)) return;
    setTaskToDelete(task);
  };

  const executeTaskDelete = async () => {
    if (!taskToDelete) return;

    try {
      await api.delete(`tasks/${taskToDelete.id}/`);
      await refreshTaskLists();
    } catch (err) {
      console.error('Task delete failed:', err.response?.data || err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : (err.message || 'Unknown error');
      alert(`Failed to delete task: ${msg}`);
    } finally {
      setTaskToDelete(null);
    }
  };

  const getProjectMembers = (project) => {
    // Internal team members (Employee users with team_members_details field)
    const internalMembers = project?.team_members_details || [];
    const sgmMember = project?.assigned_sgm_details ? [project.assigned_sgm_details] : [];

    // External team members (EXTERNAL users with external_team_details field)
    const externalMembers = project?.external_team_details || [];

    // Senior team members (SENIOR users with senior_team_details field)
    const seniorMembers = project?.senior_team_details || [];

    // Combine both and format with role label
    const combined = [
      ...sgmMember.map(m => ({ ...m, role: "SGM" })),
      ...internalMembers.map(m => ({ ...m, role: m.role || "EMPLOYEE" })),
      ...externalMembers.map(m => ({ ...m, role: "(EXTERNAL)" })),
      ...seniorMembers.map(m => ({ ...m, role: "(SENIOR)" }))
    ];

    return combined;
  };

  const withCurrentUser = (members) => {
    const normalizedMembers = dedupeMembersByIdentity(members);
    if (!currentUser) return normalizedMembers;

    const currentEmail = currentUser.email ? currentUser.email.toLowerCase() : "";
    const hasCurrentUser = normalizedMembers.some(m => {
      const memberEmail = m.email ? m.email.toLowerCase() : "";
      const matchByEmail = currentEmail && memberEmail && memberEmail === currentEmail;
      const matchById = m.id && currentUser.id && m.id === currentUser.id;
      return matchByEmail || matchById;
    });

    if (hasCurrentUser) return normalizedMembers;

    const currentMember = buildMemberFromUser(currentUser);
    if (!currentMember) return normalizedMembers;

    return [currentMember, ...normalizedMembers];
  };

  const getInternalDirectoryMembers = () => {
    let directoryMembers = dedupeMembersByIdentity(assignableDirectory.internal);
    if (directoryMembers.length === 0) return [];

    // Internal assignment list should contain only company working roles.
    directoryMembers = directoryMembers.filter((m) => {
      const role = String(m.role || '').toUpperCase();
      return role === 'ADMIN' || role === 'KAYAARA' || role === 'MLS' || role === 'SGM' || role === 'EMPLOYEE';
    });

    if (isInternalRole(currentUser?.role)) {
      return withCurrentUser(directoryMembers);
    }

    return directoryMembers;
  };

  // Helper to get unique users from all projects (excluding externals for internal tasks)
  const getAllUniqueUsers = () => {
    const directoryUsers = getInternalDirectoryMembers();
    if (directoryUsers.length > 0) return directoryUsers;

    const users = new Map();
    Object.values(clientProjectMap).flat().forEach(project => {
      getProjectMembers(project).forEach(member => {
        // Filter out pure externals - only show internal employees, SGM, and seniors for internal tasks
        if (member.role !== "(EXTERNAL)") {
          if (!users.has(member.email)) {
            users.set(member.email, member);
          }
        }
      });
    });

    const projectUsers = Array.from(users.values());
    if (isInternalRole(currentUser?.role)) {
      return withCurrentUser(projectUsers);
    }

    return dedupeMembersByIdentity(projectUsers);
  };

  const getAllKnownUsers = () => {
    const users = [];

    users.push(...getInternalDirectoryMembers());
    users.push(...getExternalClientUsers());

    Object.values(clientProjectMap).flat().forEach((project) => {
      users.push(...getProjectMembers(project));
    });

    return withCurrentUser(dedupeMembersByIdentity(users));
  };

  const getKayaaraDirectoryMembers = () => {
    const directoryMembers = dedupeMembersByIdentity(assignableDirectory.internal);
    if (!directoryMembers.length) {
      const currentMember = buildMemberFromUser(currentUser);
      return currentMember && String(currentMember.role || '').toUpperCase() === 'KAYAARA'
        ? [currentMember]
        : [];
    }

    const kayaaraMembers = directoryMembers.filter(
      (member) => String(member.role || '').toUpperCase() === 'KAYAARA'
    );

    const currentMember = buildMemberFromUser(currentUser);
    if (currentMember && String(currentMember.role || '').toUpperCase() === 'KAYAARA') {
      kayaaraMembers.push(currentMember);
    }

    return dedupeMembersByIdentity(kayaaraMembers);
  };

  const getExternalClientUsers = (clientId = null) => {
    const normalizedClientId = Number(clientId);
    const hasValidClientId = Number.isInteger(normalizedClientId) && normalizedClientId > 0;

    if (assignableDirectory.externalClient.length > 0) {
      const scopedDirectoryUsers = assignableDirectory.externalClient.filter((member) => {
        if (!hasValidClientId) return true;
        return Number(member.client_id) === normalizedClientId;
      });

      return dedupeMembersByIdentity(scopedDirectoryUsers);
    }

    const users = new Map();
    Object.values(clientProjectMap).flat().forEach(project => {
      getProjectMembers(project).forEach(member => {
        if (member.role === "(EXTERNAL)" || member.role === "(SENIOR)") {
          users.set(member.email || `id:${member.id}`, member);
        }
      });
    });

    const currentMember = buildMemberFromUser(currentUser);
    if (currentMember && ["CLIENT", "(EXTERNAL)", "(SENIOR)"].includes(currentMember.role)) {
      users.set(currentMember.email || `id:${currentMember.id}`, currentMember);
    }

    return dedupeMembersByIdentity(Array.from(users.values()));
  };

  const getClientIdFromName = (clientName) => {
    if (!clientName) return null;
    const projects = clientProjectMap[clientName] || [];
    if (!projects.length) return null;
    const id = Number(projects[0]?.client);
    return Number.isFinite(id) ? id : null;
  };

  const getClientScopedMembers = (clientName) => {
    const projects = clientProjectMap[clientName] || [];
    const membersMap = new Map();

    projects.forEach((project) => {
      getProjectMembers(project).forEach((member) => {
        if (!member) return;
        const key = member.email || `id:${member.id}`;
        if (!key) return;
        membersMap.set(key, {
          ...member,
          role: normalizeRoleLabel(member.role),
        });
      });
    });

    const clientId = getClientIdFromName(clientName);
    if (clientId) {
      const externalDirectoryMembers = getExternalClientUsers(clientId);
      externalDirectoryMembers.forEach((member) => {
        const key = member.email || `id:${member.id}`;
        if (!key) return;
        membersMap.set(key, {
          ...member,
          role: normalizeRoleLabel(member.role),
        });
      });
    }

    // Client-assigned SGMs may exist even when project.assigned_sgm is not populated.
    const clientMeta = clientMetaMap[clientName] || {};
    const assignedSgms = Array.isArray(clientMeta.assignedSgms) ? clientMeta.assignedSgms : [];
    assignedSgms.forEach((sgm) => {
      if (!sgm) return;
      const key = sgm.email || `id:${sgm.id}`;
      if (!key) return;
      membersMap.set(key, {
        id: sgm.id,
        username: sgm.username || sgm.full_name || sgm.email,
        full_name: sgm.full_name || sgm.username || sgm.email,
        email: sgm.email,
        role: "SGM",
      });
    });

    // Keep KAYAARA visible for all assigners in client/project assignment mode.
    getKayaaraDirectoryMembers().forEach((kayaaraMember) => {
      if (!kayaaraMember) return;
      const key = kayaaraMember.email || `id:${kayaaraMember.id}`;
      if (!key) return;
      membersMap.set(key, {
        ...kayaaraMember,
        role: normalizeRoleLabel(kayaaraMember.role),
      });
    });

    return dedupeMembersByIdentity(Array.from(membersMap.values()));
  };

  const getClientScopedExternalMembers = (clientName) => {
    const clientId = getClientIdFromName(clientName);
    const scoped = getExternalClientUsers(clientId);
    return scoped.filter((member) => {
      const role = String(member.role || '').toUpperCase();
      return role === '(EXTERNAL)' || role === 'CLIENT' || role === '(SENIOR)' || role === 'SENIOR';
    });
  };

  const getAssignableMembers = ({ isInternal, clientName, projectName }) => {
    const viewerRole = getViewerRole();

    if (viewerRole === "KAYAARA") {
      return getAllKnownUsers();
    }

    if (isInternal) {
      // CLIENT/EXTERNAL/SENIOR internal-mode should target externals of their client.
      if (viewerRole === "CLIENT" || viewerRole === "EXTERNAL" || viewerRole === "SENIOR") {
        const fallbackClientName = Object.keys(clientProjectMap)[0] || "";
        const scopedClientName = clientName || fallbackClientName;
        return getClientScopedExternalMembers(scopedClientName);
      }

      // KAYAARA/SGM/EMPLOYEE internal-mode should target all company internals.
      return getAllUniqueUsers();
    }

    const selectedProject = clientProjectMap[clientName]?.find(p => p.name === projectName);
    const clientScopedMembers = clientName ? getClientScopedMembers(clientName) : [];

    if (clientScopedMembers.length > 0) {
      return withCurrentUser(clientScopedMembers);
    }

    if (viewerRole === "CLIENT" || viewerRole === "EXTERNAL") {
      const fallbackClientName = clientName || Object.keys(clientProjectMap)[0] || "";
      if (!selectedProject) {
        return getClientScopedMembers(fallbackClientName);
      }
      return withCurrentUser(getProjectMembers(selectedProject));
    }

    if (!selectedProject) {
      return getAllUniqueUsers();
    }

    return withCurrentUser(getProjectMembers(selectedProject));
  };

  const chartData = [
    { name: "On Time", value: 40, color: "#0086ff" },
    { name: "Delayed", value: 20, color: "#66b6ff" },
    { name: "Overdue", value: 10, color: "#212121" },
  ];

  // DATA ARRAYS
  // STATE FOR DYNAMIC DATA
  const [userName, setUserName] = useState("Employee");
  const [currentUser, setCurrentUser] = useState(null);
  const [assignableDirectory, setAssignableDirectory] = useState({
    internal: [],
    externalClient: [],
  });
  const [clientProjectMap, setClientProjectMap] = useState({});
  const [clientMetaMap, setClientMetaMap] = useState({});
  const [selectedClients, setSelectedClients] = useState([]);
  const [includeAllTasks, setIncludeAllTasks] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
  const statusFilterRef = useRef(null);
  const [dashboardStats, setDashboardStats] = useState({
    total_tasks: 0,
    on_time_count: 0,
    otc_score: "0%",
    ats_score: "0%",
    chart_data: [
      { name: "On Time", value: 0, color: "#0086ff" },
      { name: "In Progress", value: 0, color: "#c9cdd3" },
      { name: "Delayed", value: 0, color: "#66b6ff" },
      { name: "Overdue", value: 0, color: "#212121" },
    ]
  });

  const [myTasks, setMyTasks] = useState([]); // Tasks assigned TO me (Active)
  const [completedTasks, setCompletedTasks] = useState([]); // Tasks assigned TO me (Completed)
  const [delegatedTasks, setDelegatedTasks] = useState([]); // Tasks assigned BY me

  const getTodayDateInputValue = () => {
    const now = new Date();
    const offsetInMs = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - offsetInMs).toISOString().split("T")[0];
  };

  const minTaskDate = useMemo(() => getTodayDateInputValue(), []);
  const isPastDate = (dateValue) => Boolean(dateValue && dateValue < minTaskDate);
  const normalizeListResponse = (payload) => (Array.isArray(payload) ? payload : (payload?.results || []));
  const getDashboardDisplayName = (user) => {
    const firstName = String(user?.first_name || "").trim();
    const lastName = String(user?.last_name || "").trim();
    const fullNameFromParts = [firstName, lastName].filter(Boolean).join(" ");

    if (fullNameFromParts) return fullNameFromParts;

    return String(user?.full_name || user?.username || "Employee").trim() || "Employee";
  };

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const taskQuery = query.get("task") || query.get("taskId") || "";

    if (taskQuery) {
      setSearchQuery(taskQuery);
    } else {
      setSearchQuery("");
    }
  }, [location.search]);

  const splitTasksForUser = (tasks, user) => {
    if (!user) {
      console.log("No user object provided to splitTasksForUser");
      return { my_active: [], my_completed: [], delegated: [] };
    }

    const normalizeId = (value) => {
      if (value === null || value === undefined || value === "") return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    };

    const normalizeName = (value) => String(value || "").trim().toLowerCase();
    const userId = normalizeId(user.id);
    const userNameCandidates = [normalizeName(user.username), normalizeName(user.full_name)].filter(Boolean);

    console.log("====== TASK FILTERING DEBUG ======");
    console.log("Filtering for User ID:", user.id, "Username:", user.username);

    const isMine = (t) => {
      // Try multiple field name variations
      const taskAssignedToName = t.assigned_to_name || t.assigned_to_username;
      const taskAssignedToId = t.assigned_to || t.assigned_to_id || t.assigned_to_employee;

      const taskName = normalizeName(taskAssignedToName);
      const taskId = normalizeId(taskAssignedToId);

      const matchByName = taskName && userNameCandidates.includes(taskName);
      const matchById = taskId !== null && userId !== null && taskId === userId;

      const result = matchByName || matchById;
      if (result) {
        console.log(`✓ Task "${t.title}" is mine - assigned_to: ${taskAssignedToName} (${taskAssignedToId}), match by: ${matchByName ? 'name' : 'id'}`);
      }
      return result;
    };

    const isSelfAssigned = (t) => {
      const taskAssignedByName = t.assigned_by_name || t.assigned_by_username;
      const taskAssignedById = t.assigned_by || t.assigned_by_id;

      const taskName = normalizeName(taskAssignedByName);
      const taskId = normalizeId(taskAssignedById);

      const matchByName = taskName && userNameCandidates.includes(taskName);
      const matchById = taskId !== null && userId !== null && taskId === userId;

      return (matchByName || matchById) && isMine(t);
    };

    const my_active = tasks.filter(t => (isMine(t) || isSelfAssigned(t)) && !t.completion_date);
    const my_completed = tasks.filter(t => (isMine(t) || isSelfAssigned(t)) && t.completion_date);
    const delegated = tasks.filter(t => {
      const sourceModule = String(t.source_module || '').trim().toUpperCase();
      if (sourceModule === 'ACTION_PLAN') {
        return false;
      }

      const taskAssignedByName = t.assigned_by_name || t.assigned_by_username;
      const taskAssignedById = t.assigned_by || t.assigned_by_id;
      const taskAssignedToName = t.assigned_to_name || t.assigned_to_username;
      const taskAssignedToId = t.assigned_to || t.assigned_to_id || t.assigned_to_employee;

      const assignedByName = normalizeName(taskAssignedByName);
      const assignedById = normalizeId(taskAssignedById);
      const assignedToName = normalizeName(taskAssignedToName);
      const assignedToId = normalizeId(taskAssignedToId);

      const isAssignedBy = (assignedByName && userNameCandidates.includes(assignedByName)) ||
        (assignedById !== null && userId !== null && assignedById === userId);

      const isAssignedToCurrentUserByName = assignedToName && userNameCandidates.includes(assignedToName);
      const isAssignedToCurrentUserById = assignedToId !== null && userId !== null && assignedToId === userId;
      const isAssignedToOther = !isAssignedToCurrentUserByName && !isAssignedToCurrentUserById;

      return isAssignedBy && isAssignedToOther;
    });

    console.log("====== FILTERING RESULTS ======");
    console.log("My Active Tasks:", my_active.length);
    console.log("My Completed Tasks:", my_completed.length);
    console.log("Delegated Tasks:", delegated.length);
    return { my_active, my_completed, delegated };
  };

  const splitTasksForMember = (tasks, member) => {
    if (!member) {
      return { my_active: [], my_completed: [] };
    }

    const normalizeId = (value) => {
      if (value === null || value === undefined) return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    };

    const normalizeName = (value) => {
      if (!value) return "";
      return String(value).trim().toLowerCase();
    };

    const isAssignedToMember = (t) => {
      const taskAssignedToName = t.assigned_to_name || t.assigned_to_username;
      const taskAssignedToId = t.assigned_to || t.assigned_to_id || t.assigned_to_employee;

      const memberId = normalizeId(member.id);
      const taskId = normalizeId(taskAssignedToId);

      const memberUsername = normalizeName(member.username);
      const memberFullName = normalizeName(member.full_name);
      const taskName = normalizeName(taskAssignedToName);

      const matchByName = taskName && (taskName === memberUsername || taskName === memberFullName);
      const matchById = taskId !== null && memberId !== null && taskId === memberId;

      return matchByName || matchById;
    };

    const my_active = tasks.filter(t => isAssignedToMember(t) && !t.completion_date);
    const my_completed = tasks.filter(t => isAssignedToMember(t) && t.completion_date);

    return { my_active, my_completed };
  };

  // FETCH DATA ON MOUNT
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setMyTasks([]);
      setCompletedTasks([]);
      setDelegatedTasks([]);
      setAssignableDirectory({ internal: [], externalClient: [] });
      setClientProjectMap({});
      setClientMetaMap({});
      setDashboardStats({
        total_tasks: 0,
        on_time_count: 0,
        otc_score: "0%",
        ats_score: "0%",
        chart_data: [
          { name: "On Time", value: 0, color: "#0086ff" },
          { name: "In Progress", value: 0, color: "#c9cdd3" },
          { name: "Delayed", value: 0, color: "#66b6ff" },
          { name: "Overdue", value: 0, color: "#212121" },
        ]
      });

      const authToken = localStorage.getItem("access_token") || localStorage.getItem("token") || localStorage.getItem("access");
      if (!authToken) {
        console.warn("EmployeeDashboard: missing auth token, skipping dashboard fetch.");
        navigate("/login");
        setLoading(false);
        return;
      }

      try {
        const memberParam = new URLSearchParams(window.location.search).get('member');
        const memberId = Number(memberParam);
        const hasValidMemberId = Number.isFinite(memberId) && memberId > 0;
        console.log("====== MEMBER PARAM DEBUG ======");
        console.log("Member Param from URL:", memberParam);
        console.log("Full URL:", window.location.href);
        console.log("Search String:", window.location.search);

        let userData;
        let isMemberView = false;
        if (hasValidMemberId) {
          console.log("Attempting to fetch member ID:", memberId);
          try {
            const url = `admin/users/${memberId}/`;
            console.log("Fetching from URL:", url);

            const memberRes = await api.get(url);
            userData = memberRes.data;
            isMemberView = true;
            console.log("✓ Member Data Fetched Successfully");
            console.log("Member ID:", userData?.id);
            console.log("Member Name:", userData?.full_name);

            if (userData?.id != memberId) {
              console.error("⚠ WARNING: Fetched user ID does not match requested member ID!");
              console.error("Requested:", memberId, "Got:", userData?.id);
            }
          } catch (err) {
            console.error("✗ Failed to fetch member data:");
            console.error("Status:", err.response?.status);
            console.error("Status Text:", err.response?.statusText);
            console.error("Error Message:", err.message);
            console.error("Full Error Response:", err.response?.data);
            console.error("Falling back to minimal member profile to keep member dashboard mode active");
            userData = {
              id: memberId,
              username: `User ${memberId}`,
              full_name: `User ${memberId}`,
            };
            isMemberView = true;
          }
        } else {
          // Fetch current user
          console.log("No member param - fetching current user data");
          const userRes = await api.get("me/");
          userData = userRes.data;
          isMemberView = false;
        }

        console.log("====== USER DATA ======");
        console.log("Is Member View:", isMemberView);
        console.log("UserData ID:", userData?.id);
        console.log("UserData Full Name:", userData?.full_name);

        const displayName = getDashboardDisplayName(userData);
        setUserName(displayName);
        setCurrentUser(userData || null);

        try {
          const [internalUsersRes, externalClientUsersRes] = await Promise.all([
            api.get("assignable-users/", { params: { scope: "internal" } }),
            api.get("assignable-users/", { params: { scope: "external_client" } }),
          ]);

          setAssignableDirectory({
            internal: normalizeListResponse(internalUsersRes.data).map(buildMemberFromUser).filter(Boolean),
            externalClient: normalizeListResponse(externalClientUsersRes.data).map(buildMemberFromUser).filter(Boolean),
          });
        } catch (directoryError) {
          console.warn("Failed to fetch assignable directory:", directoryError?.response?.data || directoryError?.message || directoryError);
          setAssignableDirectory({ internal: [], externalClient: [] });
        }

        // 2. Fetch Projects
        const projRes = await api.get("projects/");
        console.log("Projects API Response:", projRes.data); // DEBUG

        // Handle potential pagination
        const projectsData = normalizeListResponse(projRes.data);

        // 2a. Fetch all tasks early so member-mode can scope clients/projects strictly to that member.
        const tasksUrl = isMemberView && hasValidMemberId
          ? `tasks/?assigned_to=${memberId}`
          : "tasks/";
        const tasksRes = await api.get(tasksUrl);
        const allFetchedTasks = normalizeListResponse(tasksRes.data);

        // Transform projects into Client -> [Projects] map (Store full project object)
        const mapping = {};
        if (projectsData.length === 0) {
          console.warn("No projects found for this user.");
        }

        if (isMemberView && hasValidMemberId) {
          const memberProjectIds = new Set(
            allFetchedTasks
              .map((t) => Number(t.project))
              .filter((id) => Number.isInteger(id) && id > 0)
          );

          const memberClientNames = new Set(
            allFetchedTasks
              .map((t) => t.client_name || t.client_org_name || t.client)
              .filter(Boolean)
          );

          projectsData.forEach((p) => {
            const projectId = Number(p.id);
            const client = p.client_name || "Unknown Client";
            const includeByProject = Number.isInteger(projectId) && memberProjectIds.has(projectId);
            const includeByClient = memberClientNames.has(client);
            if (!includeByProject && !includeByClient) return;
            if (!mapping[client]) mapping[client] = [];
            mapping[client].push(p);
          });

          // If project metadata is missing but tasks exist, create lightweight mapping from task payload.
          if (Object.keys(mapping).length === 0 && allFetchedTasks.length > 0) {
            allFetchedTasks.forEach((task) => {
              const client = task.client_name || task.client_org_name || task.client || "Unknown Client";
              if (!mapping[client]) mapping[client] = [];

              const projectId = task.project ? Number(task.project) : null;
              const alreadyExists = mapping[client].some((proj) => Number(proj.id) === projectId);
              if (alreadyExists) return;

              mapping[client].push({
                id: projectId || `task-project-${task.id}`,
                name: task.project_name || "Unknown Project",
                client: Number(task.client_org) || null,
                client_name: client,
              });
            });
          }
        } else {
          projectsData.forEach(p => {
            const client = p.client_name || "Unknown Client";
            if (!mapping[client]) mapping[client] = [];
            mapping[client].push(p); // Store full object, not just name
          });
        }
        setClientProjectMap(mapping);

        // 2b. Fetch client metadata so assigned SGMs are always available in assignee dropdown.
        try {
          const clientsRes = await api.get("clients/list/");
          const clientsData = normalizeListResponse(clientsRes.data);
          const meta = {};

          const allowedClientNames = new Set(Object.keys(mapping));

          clientsData.forEach((client) => {
            const clientName = client?.company_name || "Unknown Client";
            if (isMemberView && hasValidMemberId && !allowedClientNames.has(clientName)) {
              return;
            }
            const assignedSgms = Array.isArray(client?.assigned_sgms_details)
              ? client.assigned_sgms_details.map((sgm) => ({
                id: sgm.id,
                full_name: sgm.full_name,
                username: sgm.full_name,
                email: sgm.email,
              }))
              : [];

            meta[clientName] = { assignedSgms };
          });

          setClientMetaMap(meta);
        } catch (clientMetaError) {
          console.warn("Failed to fetch client metadata:", clientMetaError?.response?.data || clientMetaError?.message || clientMetaError);
          setClientMetaMap({});
        }


        // 3. Fetch Dashboard Stats
        let statsData;

        // 4. Split tasks from the fetched list
        console.log("====== TASKS DEBUG ======");
        console.log("Total Tasks Fetched:", allFetchedTasks.length);
        if (allFetchedTasks.length > 0) {
          console.log("First Task:", allFetchedTasks[0]);
          console.log("Task assigned_to:", allFetchedTasks[0].assigned_to);
          console.log("Task assigned_to_name:", allFetchedTasks[0].assigned_to_name);
        }
        console.log("Filtering tasks for - ID:", userData?.id, "Username:", userData?.username);

        const { my_active, my_completed, delegated } = isMemberView
          ? { ...splitTasksForMember(allFetchedTasks, userData), delegated: [] }
          : splitTasksForUser(allFetchedTasks, userData);

        console.log("My Active Tasks:", my_active);
        console.log("My Completed Tasks:", my_completed);

        setMyTasks(my_active);
        setCompletedTasks(my_completed);
        setDelegatedTasks(delegated);

        // Fetch dashboard stats
        if (isMemberView) {
          // When viewing another employee, calculate stats from their tasks
          const totalTasks = my_active.length + my_completed.length;
          const onTimeCount = my_completed.filter(t => {
            if (!t.target_date || !t.completion_date) return false;
            const targetDate = new Date(t.target_date);
            const completedDate = new Date(t.completion_date);
            return completedDate <= targetDate;
          }).length;

          const atsScore = totalTasks > 0 ? Math.round((my_completed.length / totalTasks) * 100) : 0;
          const otcScore = my_completed.length > 0 ? Math.round((onTimeCount / my_completed.length) * 100) : 0;

          console.log("Stats - Total:", totalTasks, "OnTime:", onTimeCount, "ATS:", atsScore, "OTC:", otcScore);

          setDashboardStats({
            total_tasks: totalTasks,
            on_time_count: onTimeCount,
            otc_score: `${otcScore}%`,
            ats_score: `${atsScore}%`,
            chart_data: [
              { name: "On Time", value: onTimeCount, color: "#0086ff" },
              { name: "Late", value: my_completed.length - onTimeCount, color: "#66b6ff" },
              { name: "In Progress", value: my_active.length, color: "#c9cdd3" },
              {
                name: "Overdue", value: my_active.filter(t => {
                  if (!t.target_date) return false;
                  const targetDate = new Date(t.target_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  targetDate.setHours(0, 0, 0, 0);
                  return targetDate < today;
                }).length, color: "#212121"
              }
            ]
          });
        } else {
          // For current user, fetch from dashboard_stats endpoint
          const statsRes = await api.get("tasks/dashboard_stats/");
          setDashboardStats(statsRes.data);
        }

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [location.search]);

  useEffect(() => {
    const clients = Object.keys(clientProjectMap);
    if (clients.length === 0) {
      setSelectedClients([]);
      return;
    }

    setSelectedClients((prev) => {
      if (prev.length === 0) return clients;
      const retained = prev.filter((client) => clients.includes(client));
      return retained.length > 0 ? retained : clients;
    });
  }, [clientProjectMap]);

  const toggleClientSelection = (clientName) => {
    setIncludeAllTasks(false);
    setSelectedClients((prev) =>
      (includeAllTasks ? Object.keys(clientProjectMap) : prev).includes(clientName)
        ? (includeAllTasks ? Object.keys(clientProjectMap) : prev).filter((client) => client !== clientName)
        : [...(includeAllTasks ? Object.keys(clientProjectMap) : prev), clientName]
    );
  };

  const parseYMDToDate = (ymd) => {
    if (!ymd) return null;
    const [year, month, day] = ymd.split("-").map(Number);
    if (!year || !month || !day) return null;
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const formatDisplayDate = (ymd) => {
    if (!ymd) return "dd-mm-yyyy";
    const [year, month, day] = ymd.split("-");
    return `${day}-${month}-${year}`;
  };

  const hasAppliedDateFilter = Boolean(
    startDate || endDate || currentStartDate || currentEndDate || originalStartDate || originalEndDate
  );

  const appliedDateFilterLabel = useMemo(() => {
    if (!hasAppliedDateFilter) return "";
    const labels = [];
    if (currentStartDate || currentEndDate || startDate || endDate) {
      const cS = currentStartDate || startDate;
      const cE = currentEndDate || endDate;
      if (cS && cE) labels.push(`Current: ${formatDisplayDate(cS)} to ${formatDisplayDate(cE)}`);
      else if (cS) labels.push(`Current from: ${formatDisplayDate(cS)}`);
      else if (cE) labels.push(`Current to: ${formatDisplayDate(cE)}`);
    }
    if (originalStartDate || originalEndDate) {
      const oS = originalStartDate;
      const oE = originalEndDate;
      if (oS && oE) labels.push(`Original: ${formatDisplayDate(oS)} to ${formatDisplayDate(oE)}`);
      else if (oS) labels.push(`Original from: ${formatDisplayDate(oS)}`);
      else if (oE) labels.push(`Original to: ${formatDisplayDate(oE)}`);
    }
    return labels.join(" | ");
  }, [hasAppliedDateFilter, startDate, endDate, currentStartDate, currentEndDate, originalStartDate, originalEndDate]);

  const getTaskDate = (task) => {
    const dateCandidates = [task.target_date, task.completion_date, task.created_at, task.updated_at];
    for (const value of dateCandidates) {
      if (!value) continue;
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        date.setHours(0, 0, 0, 0);
        return date;
      }
    }
    return null;
  };

  const isTaskInDateRange = (task) => {
    // 1. Check current target date range (falls back to legacy startDate/endDate if currentStartDate/currentEndDate are empty)
    const currentStart = parseYMDToDate(currentStartDate || startDate);
    const currentEnd = parseYMDToDate(currentEndDate || endDate);
    if (currentStart || currentEnd) {
      const taskDate = parseYMDToDate(task.target_date || task.targetDate);
      if (!taskDate) return false;
      if (currentStart && taskDate < currentStart) return false;
      if (currentEnd && taskDate > currentEnd) return false;
    }

    // 2. Check original planned date range (MCTC tasks only)
    const originalStart = parseYMDToDate(originalStartDate);
    const originalEnd = parseYMDToDate(originalEndDate);
    if (originalStart || originalEnd) {
      if (task.source_module !== "MCTC") return false;
      const origDate = parseYMDToDate(task.original_date);
      if (!origDate) return false;
      if (originalStart && origDate < originalStart) return false;
      if (originalEnd && origDate > originalEnd) return false;
    }

    return true;
  };

  const filterTasksByDateRange = (tasks) => tasks.filter(isTaskInDateRange);

  const filterTasksByRevision = (tasks) => {
    if (revisionFilter === "all") return tasks;
    if (revisionFilter === "revised") return tasks.filter(t => t.source_module === "MCTC" && t.revision_count > 0);
    if (revisionFilter === "ge2") return tasks.filter(t => t.source_module === "MCTC" && t.revision_count >= 2);
    if (revisionFilter === "ge3") return tasks.filter(t => t.source_module === "MCTC" && t.revision_count >= 3);
    return tasks;
  };

  useEffect(() => {
    const closeStatusOnOutsideClick = (event) => {
      if (!showStatusFilterDropdown) return;
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target)) {
        setShowStatusFilterDropdown(false);
      }
    };

    document.addEventListener("mousedown", closeStatusOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeStatusOnOutsideClick);
  }, [showStatusFilterDropdown]);

  useEffect(() => {
    const closeRevisionOnOutsideClick = (event) => {
      if (!showRevisionFilterDropdown) return;
      if (revisionFilterRef.current && !revisionFilterRef.current.contains(event.target)) {
        setShowRevisionFilterDropdown(false);
      }
    };

    document.addEventListener("mousedown", closeRevisionOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeRevisionOnOutsideClick);
  }, [showRevisionFilterDropdown]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!showDateFilterDropdown) return;
      if (dateFilterRef.current && !dateFilterRef.current.contains(event.target)) {
        setShowDateFilterDropdown(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [showDateFilterDropdown]);

  const handleApplyDateFilter = () => {
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setCurrentStartDate(draftCurrentStartDate);
    setCurrentEndDate(draftCurrentEndDate);
    setOriginalStartDate(draftOriginalStartDate);
    setOriginalEndDate(draftOriginalEndDate);
    setShowDateFilterDropdown(false);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setDraftStartDate("");
    setDraftEndDate("");
    setCurrentStartDate("");
    setCurrentEndDate("");
    setDraftCurrentStartDate("");
    setDraftCurrentEndDate("");
    setOriginalStartDate("");
    setOriginalEndDate("");
    setDraftOriginalStartDate("");
    setDraftOriginalEndDate("");
    setIncludeAllTasks(true);
    setSelectedClients(Object.keys(clientProjectMap));
    setSearchQuery("");
    setStatusFilter("All");
    setRevisionFilter("all");
    setShowDateFilterDropdown(false);
    setShowStatusFilterDropdown(false);
    setShowRevisionFilterDropdown(false);
  };

  const isOverdueTask = (task) => {
    return getEffectiveTaskStatus(task) === "over_due";
  };

  const isInProgressTask = (task) => {
    return getEffectiveTaskStatus(task) === "in_progress";
  };

  const isBacklogTask = (task) => {
    return getEffectiveTaskStatus(task) === "backlog";
  };

  const isPlanningTask = (task) => {
    return getEffectiveTaskStatus(task) === "planning";
  };

  const isReviewTask = (task) => {
    return getEffectiveTaskStatus(task) === "review";
  };

  const isTestingTask = (task) => {
    return getEffectiveTaskStatus(task) === "testing";
  };

  const isBlockedTask = (task) => {
    return getEffectiveTaskStatus(task) === "blocked";
  };

  const isCompletedTask = (task) => {
    return getEffectiveTaskStatus(task) === "completed";
  };

  const isOnTimeTask = (task) => {
    return getEffectiveTaskStatus(task) === "on_time";
  };

  const isDelayedTask = (task) => {
    return getEffectiveTaskStatus(task) === "delay_completion";
  };

  const isCancelledTask = (task) => {
    return getEffectiveTaskStatus(task) === "cancelled";
  };

  const isTodaysTask = (task) => {
    if (!task.target_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(task.target_date);
    targetDate.setHours(0, 0, 0, 0);
    return targetDate.getTime() === today.getTime();
  };

  const filterTasksByStatus = (tasks) => {
    if (statusFilter === "All") return tasks;
    if (statusFilter === "In Progress") return tasks.filter(isInProgressTask);
    if (statusFilter === "Overdue") return tasks.filter(isOverdueTask);
    if (statusFilter === "Backlog") return tasks.filter(isBacklogTask);
    if (statusFilter === "Planning") return tasks.filter(isPlanningTask);
    if (statusFilter === "Review") return tasks.filter(isReviewTask);
    if (statusFilter === "Testing") return tasks.filter(isTestingTask);
    if (statusFilter === "Blocked") return tasks.filter(isBlockedTask);
    if (statusFilter === "Completed") return tasks.filter(isCompletedTask);
    if (statusFilter === "On Time") return tasks.filter(isOnTimeTask);
    if (statusFilter === "Delayed") return tasks.filter(isDelayedTask);
    if (statusFilter === "Cancelled") return tasks.filter(isCancelledTask);
    if (statusFilter === "Today's Task") return tasks.filter(isTodaysTask);
    return tasks;
  };

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const normalizeClientName = (task) =>
    task.client_name || task.client_org_name || task.client || "Unknown Client";

  const selectedClientSet = useMemo(
    () => new Set(selectedClients.map(normalizeText)),
    [selectedClients]
  );

  const isClientSelected = (task) => {
    if (includeAllTasks) return true;
    return selectedClientSet.has(normalizeText(normalizeClientName(task)));
  };

  const filterTasksByClient = (tasks) => tasks.filter(isClientSelected);

  const filteredDashboardStats = useMemo(() => {
    const activeTasks = filterTasksByClient(myTasks.filter(isTaskInDateRange));
    const doneTasks = filterTasksByClient(completedTasks.filter(isTaskInDateRange));

    const allTasks = [...activeTasks, ...doneTasks];
    const delayedCount = allTasks.filter((task) => getEffectiveTaskStatus(task) === "delay_completion").length;
    const overdueCount = allTasks.filter((task) => getEffectiveTaskStatus(task) === "over_due").length;
    const inProgressCount = allTasks.filter((task) => getEffectiveTaskStatus(task) === "in_progress").length;
    const onTimeCount = allTasks.filter((task) => getEffectiveTaskStatus(task) === "on_time").length;

    const totalTasks = allTasks.length;
    const atsDenominator = totalTasks - inProgressCount;
    const delayedAtsSum = allTasks
      .filter((task) => getEffectiveTaskStatus(task) === "delay_completion")
      .reduce((sum, task) => sum + (calculateTaskATS(task) ?? 0), 0);

    const atsScore = atsDenominator > 0
      ? `${Math.round(((onTimeCount * 100) + delayedAtsSum) / atsDenominator)}%`
      : "0%";

    const otcDenominator = totalTasks - inProgressCount;
    const otcScore = otcDenominator > 0 ? `${((onTimeCount / otcDenominator) * 100).toFixed(1)}%` : "0%";

    return {
      total_tasks: totalTasks,
      on_time_count: onTimeCount,
      delayed_count: delayedCount,
      overdue_count: overdueCount,
      in_progress_count: inProgressCount,
      ats_score: atsScore,
      otc_score: otcScore,
      chart_data: [
        { name: "On Time", value: onTimeCount, color: "#0086ff" },
        { name: "Delayed", value: delayedCount, color: "#66b6ff" },
        { name: "Overdue", value: overdueCount, color: "#212121" },
      ]
    };
  }, [myTasks, completedTasks, includeAllTasks, startDate, endDate, selectedClientSet]);


  // AUTO-FETCH LOGIC
  const handleFetchTask = () => {
    // Search in My Tasks (real API data)
    const relevantTasks = [...myTasks];
    const found = relevantTasks.find(t => t.task_id?.toLowerCase() === fetchId.toLowerCase());

    if (found) {
      setCompletionData({
        ...completionData,
        id: found.id, // Primary Key for API
        taskIdDisplay: found.task_id, // Display ID
        task: found.title,
        project: found.project_name,
        client: found.client_name || "N/A"
      });
    } else {
      alert("Task ID not found in your active tasks!");
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!completionData.id) {
        alert("Task ID is missing. Please re-open the completion form.");
        return;
      }

      const isActionPlanTask = String(completionData.sourceModule || '').trim().toUpperCase() === 'ACTION_PLAN';
      const completionDate = new Date().toISOString().split('T')[0];
      const getActionPlanCompletionStatus = (targetDateValue) => {
        if (!targetDateValue) return 'on_time';

        const targetDate = new Date(targetDateValue);
        const doneDate = new Date(completionDate);
        targetDate.setHours(0, 0, 0, 0);
        doneDate.setHours(0, 0, 0, 0);

        return doneDate > targetDate ? 'delay_completion' : 'on_time';
      };

      if (isActionPlanTask) {
        const actionTaskId = completionData.sourceRef || String(completionData.id).replace('ap-', '');
        const actionTaskStatus = getActionPlanCompletionStatus(completionData.targetDate);
        if (completionData.file) {
          const formData = new FormData();
          formData.append('completion_date', completionDate);
          formData.append('status', actionTaskStatus);
          formData.append('completion_file', completionData.file);
          await api.patch(`action-tasks/${actionTaskId}/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          await api.patch(`action-tasks/${actionTaskId}/`, {
            completion_date: completionDate,
            status: actionTaskStatus,
          });
        }
      } else {
        const payload = {
          status: "Completed",
          remarks: completionData.remarks,
          completion_date: completionDate
        };

        if (completionData.file) {
          const formData = new FormData();
          Object.keys(payload).forEach(key => formData.append(key, payload[key]));
          formData.append('completion_file', completionData.file);
          await api.patch(`tasks/${completionData.id}/`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        } else {
          await api.patch(`tasks/${completionData.id}/`, payload);
        }
      }

      // Refresh Data
      const statsRes = await api.get("tasks/dashboard_stats/");
      setDashboardStats(statsRes.data);

      const tasksRes = await api.get("tasks/");
      const allFetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);

      const userRes = await api.get("me/");

      const { my_active, my_completed, delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
      setMyTasks(my_active);
      setCompletedTasks(my_completed);
      setDelegatedTasks(delegated);

      setCompletionData({ id: "", taskIdDisplay: "", task: "", client: "", project: "", remarks: "", file: null });
      setFetchId("");
      setShowCompleteModal(false);

    } catch (err) {
      console.error("Completion Failed:", err.response?.data || err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : (err.message || "Unknown error");
      alert(`Failed to complete task: ${msg}`);
    }
  };

  const handleDirectComplete = async (task) => {
    try {
      if (!confirm(`Are you sure you want to complete task "${task.title}"?`)) return;

      const isActionPlanTask = String(task?.source_module || '').trim().toUpperCase() === 'ACTION_PLAN';
      const completionDate = new Date().toISOString().split('T')[0];
      const getActionPlanCompletionStatus = (targetDateValue) => {
        if (!targetDateValue) return 'on_time';

        const targetDate = new Date(targetDateValue);
        const doneDate = new Date(completionDate);
        targetDate.setHours(0, 0, 0, 0);
        doneDate.setHours(0, 0, 0, 0);

        return doneDate > targetDate ? 'delay_completion' : 'on_time';
      };

      if (isActionPlanTask) {
        const actionTaskId = task.source_ref_id || String(task.id).replace('ap-', '');
        await api.patch(`action-tasks/${actionTaskId}/`, {
          completion_date: completionDate,
          status: getActionPlanCompletionStatus(task.target_date || task.targetDate),
        });
      } else {
        const payload = {
          status: "Completed",
          remarks: "",
          completion_date: completionDate
        };
        await api.patch(`tasks/${task.id}/`, payload);
      }

      // Refresh Data
      const statsRes = await api.get("tasks/dashboard_stats/");
      setDashboardStats(statsRes.data);

      const tasksRes = await api.get("tasks/");
      const allFetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);

      const userRes = await api.get("me/");

      const { my_active, my_completed, delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
      setMyTasks(my_active);
      setCompletedTasks(my_completed);
      setDelegatedTasks(delegated);

    } catch (err) {
      console.error("Direct Completion Failed:", err.response?.data || err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : (err.message || "Unknown error");
      alert(`Failed to complete task: ${msg}`);
    }
  };

  const openCompletionModal = (task) => {
    setCompletionData({
      id: task.id,
      taskIdDisplay: task.task_id,
      task: task.title,
      project: task.project_name,
      client: task.client_name,
      targetDate: task.target_date || task.targetDate || "",
      sourceModule: task.source_module || "DIRECT",
      sourceRef: task.source_ref_id || null,
      remarks: "",
      file: null
    });
    setShowCompleteModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      if (assignData.file && !isPdfAttachment(assignData.file)) {
        alert("Only PDF files are allowed for attachments.");
        return;
      }

      if (isPastDate(assignData.targetDate)) {
        alert("Past dates are not allowed for task target date.");
        return;
      }

      // Find IDs from names/objects
      // Note: assignData.assignedTo currently stores the email. Ideally, we need ID.
      // But ProjectSerializer provides ID in team_member_details. 
      // Let's fix the Assign Form to store ID in state, or find it here if we stored email.

      // FIX: The previous step stored email. Let's find the user object again to get ID.
      let selectedProjectObj = null;
      if (!assignData.isInternal) {
        selectedProjectObj = clientProjectMap[assignData.client]?.find(p => p.name === assignData.project);
      }

      const viewerRole = getViewerRole();
      const isClientOrExternalViewer = viewerRole === "CLIENT" || viewerRole === "EXTERNAL";
      const selectedClientId = !assignData.isInternal ? getClientIdFromName(assignData.client) : null;

      const selectedUser = getAssignableMembers({
        isInternal: assignData.isInternal,
        clientName: assignData.client,
        projectName: assignData.project,
      }).find(m => m.email === assignData.assignedTo);

      if ((!assignData.isInternal && !isClientOrExternalViewer && !selectedProjectObj) || !selectedUser) {
        alert("Please select valid project and user.");
        return;
      }

      if (!assignData.isInternal && !selectedProjectObj && !selectedClientId) {
        alert("Please select a valid client.");
        return;
      }

      const payload = {
        title: assignData.task,
        project: selectedProjectObj ? selectedProjectObj.id : null, // Send ID or null
        client_org: selectedProjectObj ? selectedProjectObj.client : selectedClientId, // Send ID or null
        assigned_to: selectedUser.id, // Send ID
        target_date: assignData.targetDate,
        priority: assignData.priority || 'LOW',
        flag: assignData.flag || 'none',
        description: assignData.isInternal ? "Internal Task" : "Assigned via Dashboard",
        status: "In Progress",
        is_repeatable: false,
        repeat_frequency: null,
        repeat_end_date: null,
        repeat_day: null,
        repeat_week: null
      };

      // Handle File upload if needed (would need FormData)
      // For now, sending JSON for core data. If file exists:
      if (assignData.file) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          if (payload[key] !== null) formData.append(key, payload[key]);
        });
        formData.append('assigned_file', assignData.file);

        await api.post("tasks/", formData);
      } else {
        await api.post("tasks/", payload);
      }

      alert("Task Assigned Successfully!");

      // Refresh Tasks
      const tasksRes = await api.get("tasks/");
      const userRes = await api.get("me/"); // Need username for filter
      const allFetchedTasks = tasksRes.data;
      const { my_active, my_completed, delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
      setMyTasks(my_active);
      setCompletedTasks(my_completed);
      setDelegatedTasks(delegated);

      setShowAssignModal(false);
      setAssignData({
        task: "", project: "", client: "", assignedTo: "", targetDate: "", file: null, flag: 'none',
        priority: 'LOW',
        isInternal: false
      });

    } catch (err) {
      console.error("Assignment Failed:", err.response?.data || err);
      alert("Failed to assign task: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  // Helper Filter Function
  const filterTasks = (tasks) => {
    if (!searchQuery) return tasks;
    const lowerQ = searchQuery.toLowerCase();
    return tasks.filter(t =>
      t.title?.toLowerCase().includes(lowerQ) ||
      t.task_id?.toLowerCase().includes(lowerQ) ||
      t.project_name?.toLowerCase().includes(lowerQ) ||
      t.client_name?.toLowerCase().includes(lowerQ) ||
      t.assigned_to_name?.toLowerCase().includes(lowerQ)
    );
  };

  const handleBulkAssignSubmit = async (e) => {
    e.preventDefault();
    try {

      // Filter out empty rows (conceptually, though UI enforces some fields)
      const validTasks = bulkTasks.filter(t => t.title && t.assignedTo && t.targetDate && (t.isInternal || (t.client && t.project)));

      if (validTasks.length === 0) {
        alert("No valid tasks to assign. Please fill in the details.");
        return;
      }

      if (validTasks.some((task) => task.file && !isPdfAttachment(task.file))) {
        alert("Only PDF files are allowed for attachments.");
        return;
      }

      if (validTasks.some((task) => isPastDate(task.targetDate))) {
        alert("Past dates are not allowed for task due date.");
        return;
      }

      // Prepare Requests - Resolve IDs for EACH task
      const requests = validTasks.map(task => {
        let selectedProjectObj = null;
        const viewerRole = getViewerRole();
        const isClientOrExternalViewer = viewerRole === "CLIENT" || viewerRole === "EXTERNAL";

        if (!task.isInternal) {
          selectedProjectObj = clientProjectMap[task.client]?.find(p => p.name === task.project);
        }

        const selectedClientId = !task.isInternal ? getClientIdFromName(task.client) : null;

        const selectedUser = getAssignableMembers({
          isInternal: task.isInternal,
          clientName: task.client,
          projectName: task.project,
        }).find(m => m.email === task.assignedTo);

        if ((!task.isInternal && !isClientOrExternalViewer && !selectedProjectObj) || !selectedUser) {
          throw new Error(`Invalid Project or User for task: ${task.title}`);
        }

        if (!task.isInternal && !selectedProjectObj && !selectedClientId) {
          throw new Error(`Invalid Client for task: ${task.title}`);
        }

        const payload = {
          title: task.title,
          project: selectedProjectObj ? selectedProjectObj.id : null,
          client_org: selectedProjectObj ? selectedProjectObj.client : selectedClientId,
          assigned_to: selectedUser.id,
          target_date: task.targetDate,
          priority: task.priority || 'LOW',
          flag: task.flag || 'none',
          description: task.isInternal ? "Internal Bulk Task" : "Assigned via Bulk Assign",
          status: "In Progress",
          is_repeatable: false // Bulk tasks are strictly Normal now
        };

        if (task.file) {
          const formData = new FormData();
          Object.keys(payload).forEach(key => {
            if (payload[key] !== null) formData.append(key, payload[key]);
          });
          formData.append('assigned_file', task.file);
          return api.post("tasks/", formData);
        } else {
          return api.post("tasks/", payload);
        }
      });

      await Promise.all(requests);
      alert(`${validTasks.length} tasks assigned successfully!`);

      // Refresh Tasks
      const tasksRes = await api.get("tasks/");
      const userRes = await api.get("me/");
      const allFetchedTasks = tasksRes.data;
      const { my_active, my_completed, delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
      setMyTasks(my_active);
      setCompletedTasks(my_completed);
      setDelegatedTasks(delegated);

      setShowBulkModal(false);
      setBulkTasks([getEmptyTaskRow()]);

    } catch (err) {
      console.error("Bulk Assignment Failed:", err);
      // Construct a better message
      let msg = "Assignment Failed:\n";
      if (err.message && (err.message.startsWith("Invalid Project") || err.message.startsWith("Invalid User"))) {
        msg += err.message;
      } else if (err.response?.data) {
        msg += JSON.stringify(err.response.data);
      } else {
        msg += err.message || "Unknown error";
      }
      alert(msg);
    }
  };

  const handleRowChange = (index, field, value) => {
    const updatedTasks = [...bulkTasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };

    // Dependencies logic
    if (field === 'client') {
      updatedTasks[index].project = "";
      updatedTasks[index].assignedTo = "";
    }
    if (field === 'project') {
      updatedTasks[index].assignedTo = "";
    }
    if (field === 'isInternal') {
      updatedTasks[index].client = "";
      updatedTasks[index].project = "";
      updatedTasks[index].assignedTo = "";
    }

    setBulkTasks(updatedTasks);
  };

  const addBulkTaskRow = () => {
    setBulkTasks([...bulkTasks, getEmptyTaskRow()]);
  };

  const removeBulkTaskRow = (index) => {
    if (bulkTasks.length > 1) {
      const updatedTasks = bulkTasks.filter((_, i) => i !== index);
      setBulkTasks(updatedTasks);
    } else {
      // If only 1 row, just clear it
      setBulkTasks([getEmptyTaskRow()]);
    }
  };

  /* ===== BULK COMPLETE LOGIC (QUICK ACTION) ===== */
  const [selectedTasks, setSelectedTasks] = useState([]);

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const toggleSelectAll = (tasks) => {
    const allTaskIds = tasks.map((t) => t.id);

    if (selectedTasks.length === allTaskIds.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(allTaskIds);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTasks.length === 0) return;
    if (!confirm(`Are you sure you want to complete ${selectedTasks.length} tasks?`)) return;

    try {
      const completionDate = new Date().toISOString().split('T')[0];
      const allKnownTasks = [...myTasks, ...completedTasks, ...delegatedTasks];

      const requests = selectedTasks.map((id) => {
        const task = allKnownTasks.find((t) => String(t.id) === String(id));
        const isActionPlanTask = String(task?.source_module || '').trim().toUpperCase() === 'ACTION_PLAN';

        const getActionPlanCompletionStatus = (targetDateValue) => {
          if (!targetDateValue) return 'on_time';

          const targetDate = new Date(targetDateValue);
          const doneDate = new Date(completionDate);
          targetDate.setHours(0, 0, 0, 0);
          doneDate.setHours(0, 0, 0, 0);

          return doneDate > targetDate ? 'delay_completion' : 'on_time';
        };

        if (isActionPlanTask) {
          const actionTaskId = task?.source_ref_id || String(id).replace('ap-', '');
          return api.patch(`action-tasks/${actionTaskId}/`, {
            completion_date: completionDate,
            status: getActionPlanCompletionStatus(task?.target_date || task?.targetDate),
          });
        }

        const payload = {
          status: "Completed",
          remarks: "-",
          completion_date: completionDate
        };
        return api.patch(`tasks/${id}/`, payload);
      });

      await Promise.all(requests);
      setSelectedTasks([]); // Clear selection

      // Refresh Data
      const statsRes = await api.get("tasks/dashboard_stats/");
      setDashboardStats(statsRes.data);

      const tasksRes = await api.get("tasks/");
      const allFetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);
      const userRes = await api.get("me/");

      const { my_active, my_completed, delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
      setMyTasks(my_active);
      setCompletedTasks(my_completed);
      setDelegatedTasks(delegated);

    } catch (err) {
      console.error("Bulk Complete Failed:", err.response?.data || err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : (err.message || "Unknown error");
      alert(`Failed to complete some tasks: ${msg}`);
    }
  };

  /* ===== FUZZY MATCHING HELPER ===== */
  // Calculate Levenshtein distance between two strings
  const calculateEditDistance = (str1, str2) => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    const len1 = s1.length;
    const len2 = s2.length;

    // Create a matrix to store distances
    const matrix = Array.from({ length: len1 + 1 }, (_, i) =>
      Array.from({ length: len2 + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = 1 + Math.min(
            matrix[i - 1][j],      // deletion
            matrix[i][j - 1],      // insertion
            matrix[i - 1][j - 1]   // substitution
          );
        }
      }
    }

    return matrix[len1][len2];
  };

  // Find best client match with fuzzy matching (max 1 char difference)
  const getAvailableClientNames = () => {
    const merged = new Set([
      ...Object.keys(clientProjectMap || {}),
      ...Object.keys(clientMetaMap || {}),
    ]);
    return Array.from(merged).filter(Boolean);
  };

  const findBestClientMatch = (input) => {
    const clients = getAvailableClientNames();

    if (!input || !String(input).trim()) return null;
    const normalizedInput = String(input).trim();

    // First try exact case-insensitive match
    const exactMatch = clients.find(c => c.toLowerCase() === normalizedInput.toLowerCase());
    if (exactMatch) return exactMatch;

    // Then try fuzzy match (edit distance <= 1)
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const client of clients) {
      const distance = calculateEditDistance(normalizedInput, client);
      if (distance <= 1 && distance < bestDistance) {
        bestMatch = client;
        bestDistance = distance;
      }
    }

    return bestMatch; // null if no match within 1 char difference
  };

  // Find best project match within a client (max 1 char difference)
  const findBestProjectMatch = (input, clientName) => {
    const projects = clientProjectMap[clientName] || [];

    // First try exact case-insensitive match
    const exactMatch = projects.find(p => p.name.toLowerCase() === input.toLowerCase());
    if (exactMatch) return exactMatch;

    // Then try fuzzy match (edit distance <= 1)
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const project of projects) {
      const distance = calculateEditDistance(input, project.name);
      if (distance <= 1 && distance < bestDistance) {
        bestMatch = project;
        bestDistance = distance;
      }
    }

    return bestMatch; // null if no match within 1 char difference
  };

  const findBestAssignableMember = (input, members = []) => {
    const needle = String(input || "").trim().toLowerCase();
    if (!needle) return null;

    const normalizedMembers = (Array.isArray(members) ? members : []).filter(Boolean);

    const exactByEmail = normalizedMembers.find((m) => String(m.email || "").trim().toLowerCase() === needle);
    if (exactByEmail) return exactByEmail;

    const exactByFullName = normalizedMembers.find((m) => String(m.full_name || "").trim().toLowerCase() === needle);
    if (exactByFullName) return exactByFullName;

    const exactByUsername = normalizedMembers.find((m) => String(m.username || "").trim().toLowerCase() === needle);
    if (exactByUsername) return exactByUsername;

    let bestMatch = null;
    let bestDistance = Infinity;

    normalizedMembers.forEach((member) => {
      const candidates = [member.email, member.username, member.full_name]
        .map((v) => String(v || "").trim())
        .filter(Boolean);

      candidates.forEach((candidate) => {
        const distance = calculateEditDistance(needle, candidate.toLowerCase());
        if (distance <= 1 && distance < bestDistance) {
          bestDistance = distance;
          bestMatch = member;
        }
      });
    });

    return bestMatch;
  };

  /* ===== SMART PASTE LOGIC (ENHANCED) ===== */
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [draftTasks, setDraftTasks] = useState([]); // Tasks created from pasted data
  const [showSmartPasteConfirm, setShowSmartPasteConfirm] = useState(false);
  const [pasteColumnType, setPasteColumnType] = useState(null); // 'title', 'date', 'assignee', 'client', 'project'

  // Parse pasted data into rows
  const parsePasteData = (data) => {
    return data.trim().split('\n').map(line => line.trim()).filter(line => line);
  };

  const isInternalMarker = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'internal';
  };

  const isBlankValue = (value) => String(value || '').trim() === '';

  // Create tasks from first column (usually titles)
  const createDraftTasksFromPaste = (values) => {
    const tasks = values.map((value, idx) => ({
      _id: `draft_${Date.now()}_${idx}`, // Temporary ID
      title: value,
      client: "",
      project: "",
      assignedTo: "",
      targetDate: minTaskDate,
      flag: 'none',
      file: null,
      isInternal: false,
      pasteRowIndex: idx
    }));
    return tasks;
  };

  // Update draft tasks with new column data
  const updateDraftTasksFromPaste = (values, columnType) => {
    const skippedRows = [];

    const updated = draftTasks.map((task, idx) => {
      if (idx < values.length) {
        const value = values[idx];
        const updatedTask = { ...task };

        if (columnType === 'date') {
          updatedTask.targetDate = value;
        } else if (columnType === 'assignee') {
          updatedTask.assignedTo = value;
        } else if (columnType === 'client') {
          if (isBlankValue(value) || isInternalMarker(value)) {
            updatedTask.isInternal = true;
            updatedTask.client = '';
            updatedTask.project = '';
            updatedTask.assignedTo = '';
            return updatedTask;
          }

          // Use fuzzy matching for client names
          const bestMatch = findBestClientMatch(value);
          if (bestMatch) {
            updatedTask.isInternal = false;
            updatedTask.client = bestMatch;
            updatedTask.project = ""; // Reset dependent field
          } else {
            // Client not found - mark as invalid but keep pasted value for visibility
            updatedTask.isInternal = false;
            updatedTask.client = `[INVALID] ${value}`;
            skippedRows.push(`Row ${idx + 1}: "${value}" - No matching client (0 close matches)`);
          }
        } else if (columnType === 'project') {
          if (isBlankValue(value) || isInternalMarker(value)) {
            updatedTask.isInternal = true;
            updatedTask.client = '';
            updatedTask.project = '';
            updatedTask.assignedTo = '';
            return updatedTask;
          }

          // Use fuzzy matching for project names
          let bestMatch = null;

          // If task already has a client, search within that client only
          if (updatedTask.client && !updatedTask.client.startsWith('[INVALID]')) {
            bestMatch = findBestProjectMatch(value, updatedTask.client);
          } else {
            // Search across all projects
            const allProjects = Object.values(clientProjectMap).flat();
            let bestDistance = Infinity;
            for (const project of allProjects) {
              const distance = calculateEditDistance(value, project.name);
              if (distance <= 1 && distance < bestDistance) {
                bestMatch = project;
                bestDistance = distance;
              }
            }
          }

          if (bestMatch) {
            updatedTask.project = bestMatch.name;
            updatedTask.isInternal = false;
            // If project belongs to a different client, update client too
            if (!updatedTask.client || updatedTask.client.startsWith('[INVALID]')) {
              // Find which client owns this project
              for (const [clientName, projects] of Object.entries(clientProjectMap)) {
                if (projects.some(p => p.id === bestMatch.id)) {
                  updatedTask.client = clientName;
                  break;
                }
              }
            }
          } else {
            // Project not found - mark as invalid
            updatedTask.project = `[INVALID] ${value}`;
            skippedRows.push(`Row ${idx + 1}: "${value}" - No matching project (0 close matches)`);
          }
        } else if (columnType === 'title') {
          updatedTask.title = value;
        }

        return updatedTask;
      }
      return task;
    });

    // Show warning if any rows couldn't be matched
    if (skippedRows.length > 0) {
      console.warn(`⚠ Some clients couldn't be matched:`, skippedRows);
    }

    return { updated, skippedRows };
  };

  const handleSmartPaste = () => {
    if (!pasteContent.trim()) return;

    if (!pasteColumnType) {
      alert("Please select a column button before pasting.");
      return;
    }

    const values = parsePasteData(pasteContent);
    const selectedType = pasteColumnType;

    if (draftTasks.length === 0) {
      if (selectedType !== 'title') {
        alert("Please paste the Title column first to create draft tasks.");
        return;
      }
      // First paste - create draft tasks
      const newDrafts = createDraftTasksFromPaste(values);
      setDraftTasks(newDrafts);
      alert(`✓ Created ${newDrafts.length} draft tasks from Title column\n\nNow select another column and paste to add more details.`);
    } else if (selectedType === 'title') {
      // Allow adding more titles to append new draft tasks
      const newDrafts = createDraftTasksFromPaste(values);
      setDraftTasks([...draftTasks, ...newDrafts]);
      alert(`✓ Added ${newDrafts.length} more draft tasks\n\nNow select another column and paste to add more details.`);
    } else {
      // Subsequent paste - update existing draft tasks
      if (values.length !== draftTasks.length) {
        alert(`⚠ Column has ${values.length} rows but you have ${draftTasks.length} draft tasks. Please paste a column with the same number of rows.`);
        return;
      }

      const { updated, skippedRows } = updateDraftTasksFromPaste(values, selectedType);
      setDraftTasks(updated);

      let message = `✓ Updated ${updated.length} draft tasks with ${selectedType} data`;
      if (skippedRows.length > 0) {
        message += `\n\n⚠ ${skippedRows.length} rows couldn't be matched:\n${skippedRows.slice(0, 3).join('\n')}${skippedRows.length > 3 ? '\n...' : ''}`;
      }
      message += `\n\nSelect another column to paste or click "Submit All" to create tasks.`;

      alert(message);
    }

    setPasteContent("");
  };

  const handleSubmitSmartPaste = async () => {
    if (draftTasks.length === 0) {
      alert("No draft tasks to submit!");
      return;
    }

    try {

      const hasInvalidMarker = (value) => String(value || '').startsWith('[INVALID]');

      // Validate all draft tasks - exclude those with invalid clients or projects
      const validTasks = draftTasks.filter(t =>
        t.title && t.assignedTo && t.targetDate &&
        (t.isInternal || (t.client && t.project)) &&
        !hasInvalidMarker(t.client) &&
        !hasInvalidMarker(t.project)
      );

      if (validTasks.length === 0) {
        alert("No valid tasks to submit. Each task needs: Title, Assigned To, Due Date, and either Internal selected or valid Client + Project.");
        return;
      }

      if (validTasks.some((task) => isPastDate(task.targetDate))) {
        alert("Past dates are not allowed for task due date.");
        return;
      }

      if (validTasks.length < draftTasks.length) {
        const skipped = draftTasks.length - validTasks.length;
        const invalidClients = draftTasks
          .filter(t => hasInvalidMarker(t.client))
          .map((t, i) => `- "${t.title}": Invalid client ${t.client}`);
        const invalidProjects = draftTasks
          .filter(t => hasInvalidMarker(t.project))
          .map((t, i) => `- "${t.title}": Invalid project ${t.project}`);
        const missingSelections = draftTasks
          .filter(t => !(t.title && t.assignedTo && t.targetDate && (t.isInternal || (t.client && t.project))))
          .map((t) => `- "${t.title || '(untitled)'}": Missing required client/project or assignee`);

        const skipReasons = [...invalidClients, ...invalidProjects, ...missingSelections];
        let message = `${skipped} tasks will be skipped:\n${skipReasons.slice(0, 3).join('\n')}${skipReasons.length > 3 ? '\n...' : ''}\n\nContinue with ${validTasks.length} valid tasks?`;

        if (!confirm(message)) {
          return;
        }
      }

      // Create tasks
      const requests = validTasks.map((task, taskIndex) => {
        let selectedProjectObj = null;

        if (!task.isInternal && task.client && task.project) {
          selectedProjectObj = findBestProjectMatch(task.project, task.client)
            || clientProjectMap[task.client]?.find((p) => p.name === task.project);
        }

        const assignableMembers = getAssignableMembers({
          isInternal: task.isInternal,
          clientName: task.client,
          projectName: task.project,
        });

        const selectedUser = findBestAssignableMember(task.assignedTo, assignableMembers)
          || assignableMembers.find((m) => m.email === task.assignedTo || m.username === task.assignedTo);

        if (!selectedUser) {
          throw new Error(`User '${task.assignedTo}' not found for task: ${task.title}`);
        }

        const payload = {
          title: task.title,
          project: selectedProjectObj ? selectedProjectObj.id : null,
          client_org: selectedProjectObj ? selectedProjectObj.client : null,
          assigned_to: selectedUser.id,
          target_date: task.targetDate,
          priority: task.priority || 'LOW',
          flag: task.flag || 'none',
          description: "Created via Smart Paste",
          status: "In Progress",
          is_repeatable: false
        };

        console.log(`[Task ${taskIndex + 1}] Creating: "${task.title}"`, {
          project_id: selectedProjectObj?.id || null,
          client_id: selectedProjectObj?.client || null,
          assigned_to: selectedUser.id,
          assigned_to_email: task.assignedTo,
          target_date: task.targetDate,
          isInternal: task.isInternal
        });

        if (task.file) {
          const formData = new FormData();
          Object.keys(payload).forEach(key => {
            if (payload[key] !== null) formData.append(key, payload[key]);
          });
          formData.append('assigned_file', task.file);
          return api.post("tasks/", formData, { headers: { "Content-Type": "multipart/form-data" } }).catch(err => {
            console.error(`[Task ${taskIndex + 1}] Failed:`, err.response?.data || err.message);
            throw err;
          });
        } else {
          return api.post("tasks/", payload).catch(err => {
            console.error(`[Task ${taskIndex + 1}] Failed:`, err.response?.data || err.message);
            throw err;
          });
        }
      });

      await Promise.all(requests);
      alert(`✓ Successfully created ${validTasks.length} tasks!`);

      // Refresh data
      const [tasksRes, meRes] = await Promise.all([
        api.get("tasks/"),
        api.get("me/"),
      ]);
      const allFetchedTasks = tasksRes.data;
      const { my_active, my_completed, delegated } = splitTasksForUser(allFetchedTasks, meRes.data);
      setMyTasks(my_active);
      setCompletedTasks(my_completed);
      setDelegatedTasks(delegated);

      // Reset
      setDraftTasks([]);
      setPasteContent("");
      setShowPasteInput(false);
      setPasteColumnType(null);

    } catch (err) {
      console.error("Smart Paste Submission Failed:", err);

      // Log detailed error info
      let errorDetails = "";
      if (err.response?.data) {
        console.error("Backend Response:", err.response.data);
        if (typeof err.response.data === 'string') {
          // HTML error response
          errorDetails = "Backend error - check console for details";
        } else if (err.response.data.detail) {
          errorDetails = err.response.data.detail;
        } else if (err.response.data.message) {
          errorDetails = err.response.data.message;
        } else {
          errorDetails = JSON.stringify(err.response.data);
        }
      } else if (err.message) {
        errorDetails = err.message;
      }

      const msg = errorDetails || "Unknown error - check browser console";
      alert(`Failed to create tasks:\n\n${msg}`);
    }
  };

  const clearSmartPasteDrafts = () => {
    setDraftTasks([]);
    setPasteContent("");
    setPasteColumnType(null);
  };

  const handleExcelImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      setExcelUploadStatus({ error: "Only .xlsx files are supported" });
      return;
    }

    setExcelUploadStatus({ loading: true });

    try {
      // Read file using FileReader
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          // Dynamically import xlsx to avoid build issues
          const { read, utils } = await import('xlsx');
          const workbook = read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = utils.sheet_to_json(worksheet, { header: 1 });

          if (rows.length === 0) {
            setExcelUploadStatus({ error: "Excel file is empty" });
            return;
          }

          const headers = rows[0] || [];
          const dataRows = rows.slice(1, 6); // Show first 5 data rows for preview

          setExcelPreview({
            columns: headers,
            rows: dataRows,
            file: file
          });

          // Initialize mapping with empty values
          const initialMapping = {};
          setColumnMapping(initialMapping);
          setMappingStep(true);
          setExcelUploadStatus(null);
        } catch (err) {
          console.error('File read error:', err);
          setExcelUploadStatus({ error: "Failed to read Excel file: " + err.message });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('Excel import error:', err);
      setExcelUploadStatus({ error: err.message || "Upload failed" });
    }
  };

  const handleConfirmMapping = async () => {
    if (!excelPreview?.file) {
      setExcelUploadStatus({ error: "No file selected" });
      return;
    }

    // Validate that at least 'task' column is mapped
    // columnMapping is now: { 'task': 0, 'assigned_to': 1, ... }
    const hasTaskMapping = columnMapping['task'] !== undefined && columnMapping['task'] !== '';
    if (!hasTaskMapping) {
      setExcelUploadStatus({ error: "Please map the 'Task' column (required)" });
      return;
    }

    setExcelUploadStatus({ loading: true });
    setExcelErrorFields([]);

    const inferErrorFields = (errors = []) => {
      const joined = errors.map((item) => String(item || '')).join(' ').toLowerCase();
      const fields = [];
      if (joined.includes('task')) fields.push('task');
      if (joined.includes('client')) fields.push('client');
      if (joined.includes('project')) fields.push('project');
      if (joined.includes('assigned to') || joined.includes('assignee') || joined.includes('user')) fields.push('assigned_to');
      if (joined.includes('date') || joined.includes('target_date') || joined.includes('target date')) fields.push('target_date');
      if (joined.includes('description') || joined.includes('remarks') || joined.includes('notes')) fields.push('description');
      return Array.from(new Set(fields));
    };

    try {
      const formData = new FormData();
      formData.append('file', excelPreview.file);

      // Convert back to backend expected format: { 0: 'task', 1: 'assigned_to', ... }
      const backendMapping = {};
      Object.entries(columnMapping).forEach(([fieldName, colIdx]) => {
        if (colIdx !== '') {
          backendMapping[colIdx] = fieldName;
        }
      });
      formData.append('column_mapping', JSON.stringify(backendMapping));
      formData.append('flag', excelImportFlag || 'none');
      formData.append('priority', excelImportPriority || 'LOW');

      const response = await api.post(
        'tasks/import_tasks_from_excel/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.success) {
        const backendErrors = response.data.errors || [];
        const inferredFields = inferErrorFields(backendErrors);
        setExcelErrorFields(inferredFields);

        const importedDraftRows = Array.isArray(response.data.draft_rows) ? response.data.draft_rows : [];

        setExcelUploadStatus({
          success: true,
          tasksCreated: response.data.tasks_created,
          draftsCreated: response.data.drafts_created || 0,
          taskIds: response.data.task_ids,
          draftTaskIds: response.data.draft_task_ids || [],
          backendErrors,
          warnings: response.data.warnings
        });

        // If failed rows exist, open Smart Paste drafts so user can fix fields and submit manually.
        if (importedDraftRows.length > 0) {
          const smartDrafts = importedDraftRows.map((row, idx) => {
            const rawClient = String(row.client || '').trim();
            const rawProject = String(row.project || '').trim();
            const isInternal =
              (isBlankValue(rawClient) && isBlankValue(rawProject))
              || isInternalMarker(rawClient)
              || isInternalMarker(rawProject);

            const normalizedClient = isInternal
              ? ''
              : (findBestClientMatch(rawClient) || rawClient);

            const projectMatch = (!isInternal && normalizedClient && rawProject)
              ? findBestProjectMatch(rawProject, normalizedClient)
              : null;

            const normalizedProject = isInternal
              ? ''
              : (projectMatch?.name || rawProject);

            const members = getAssignableMembers({
              isInternal,
              clientName: normalizedClient,
              projectName: normalizedProject,
            });

            const assigneeMatch = findBestAssignableMember(row.assigned_to, members);

            return {
              _id: `excel_draft_${Date.now()}_${idx}`,
              title: row.title || '',
              client: normalizedClient,
              project: normalizedProject,
              assignedTo: assigneeMatch?.email || String(row.assigned_to || '').trim(),
              targetDate: row.target_date || minTaskDate,
              flag: row.flag || 'none',
              priority: row.priority || 'LOW',
              file: null,
              isInternal,
              pasteRowIndex: idx,
              importError: row.error || '',
              importErrorFields: row.error_fields || [],
            };
          });

          setDraftTasks(smartDrafts);
          setShowExcelImportModal(false);
          setMappingStep(false);
          setExcelPreview(null);
          setShowSmartPasteModal(true);
          return;
        }

        // No failed rows: close and refresh.
        setMappingStep(false);
        setExcelPreview(null);
        setShowExcelImportModal(false);
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const backendErrors = response.data.errors || [];
        const inferredFields = inferErrorFields(backendErrors);
        setExcelErrorFields(inferredFields);
        setExcelUploadStatus({
          error: response.data.error || 'Import failed',
          backendErrors,
          warnings: response.data.warnings || [],
          tasksCreated: response.data.tasks_created || 0,
          draftsCreated: response.data.drafts_created || 0,
        });
        setMappingStep(true);
      }
    } catch (err) {
      console.error('Import error:', err);
      const backendErrors = err.response?.data?.errors || [];
      const inferredFields = inferErrorFields(backendErrors);
      setExcelErrorFields(inferredFields);
      setExcelUploadStatus({
        error: err.response?.data?.error || backendErrors[0] || err.message || "Import failed",
        backendErrors,
        warnings: err.response?.data?.warnings || [],
        tasksCreated: err.response?.data?.tasks_created || 0,
        draftsCreated: err.response?.data?.drafts_created || 0,
      });
      setMappingStep(true);
    }
  };

  const handleBackToUpload = () => {
    setMappingStep(false);
    setExcelPreview(null);
    setColumnMapping({});
    setExcelUploadStatus(null);
    setExcelImportFlag('none');
    setExcelImportPriority('LOW');
    setExcelErrorFields([]);
  };

  const openHistoryPopup = async (task) => {
    if (!task?.mctc_entry_id) return;
    try {
      setHistoryLoading(true);
      setHistoryPopup({ entry: task, history: [] });
      const response = await api.get(`/mctc/entries/${task.mctc_entry_id}/history/`);
      setHistoryPopup({
        entry: task,
        history: response.data.history || [],
        original_date: response.data.original_date,
        current_date: response.data.current_date,
        current_half: response.data.current_half,
        revision_count: response.data.revision_count,
      });
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const renderHistoryPopup = () => {
    if (!historyPopup) return null;

    const { entry, history, original_date, current_date, current_half, revision_count } = historyPopup;

    return (
      <div
        className="k-backdrop !z-[350]"
        onClick={() => setHistoryPopup(null)}
      >
        <div
          className="k-modal !max-w-lg p-4 md:p-5 max-h-[80vh]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <p className="k-eyebrow">Task History</p>
              <h3 className="text-base md:text-lg font-bold truncate" style={{ color: 'var(--k-ink)' }}>
                {entry.title}
              </h3>
            </div>
            <button
              onClick={() => setHistoryPopup(null)}
              className="k-btn-icon shrink-0"
              aria-label="Close history"
            >
              <X size={16} strokeWidth={3} />
            </button>
          </div>

          {/* Summary card */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="k-card-grey p-3">
              <p className="k-eyebrow">Original Date</p>
              <p className="mt-1 text-sm font-bold tabular-nums" style={{ color: 'var(--k-ink)' }}>{formatDateDDMMYYYY(original_date || entry.original_date, "—")}</p>
            </div>
            <div className="k-card-grey p-3">
              <p className="k-eyebrow">Current Date</p>
              <p className="mt-1 text-sm font-bold tabular-nums" style={{ color: 'var(--k-ink)' }}>{formatDateDDMMYYYY(current_date || entry.target_date, "—")}</p>
            </div>
            <div className="k-card-grey p-3">
              <p className="k-eyebrow">Revision Count</p>
              <p className="mt-1 text-sm font-bold tabular-nums" style={{ color: 'var(--k-blue)' }}>{revision_count || entry.revision_count}</p>
            </div>
            <div className="k-card-grey p-3">
              <p className="k-eyebrow">Current Half</p>
              <p className="mt-1 text-sm font-bold" style={{ color: 'var(--k-ink)' }}>{current_half === "second_half" ? "Half 2" : "Half 1"}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 min-h-0 overflow-y-auto k-scroll">
            <p className="k-eyebrow mb-3">Movement Timeline</p>

            {historyLoading ? (
              <div className="space-y-3">
                <div className="h-16 k-skeleton" />
                <div className="h-16 k-skeleton" />
              </div>
            ) : history.length === 0 ? (
              <div className="k-card-grey px-4 py-6 text-center">
                <img src="/kayaara-mark.png" alt="" className="w-8 h-8 mx-auto mb-2 opacity-60 k-float" />
                <p className="k-eyebrow">No movements recorded</p>
              </div>
            ) : (
              <div className="relative pl-6">
                {/* Timeline line */}
                <div className="absolute left-[9px] top-2 bottom-2 w-0.5" style={{ background: 'var(--k-grey-200)' }} />

                {/* Created event */}
                <div className="relative mb-4">
                  <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: 'var(--k-blue)' }}>
                    <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--k-white)' }} />
                  </div>
                  <div className="rounded-xl border p-3" style={{ borderColor: 'var(--k-blue)', background: 'var(--k-blue-tint)' }}>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--k-blue)' }}>Created</p>
                    <p className="mt-1 text-sm font-semibold tabular-nums" style={{ color: 'var(--k-ink)' }}>{formatDateDDMMYYYY(original_date || entry.original_date, "—")}</p>
                  </div>
                </div>

                {/* Move events */}
                {history.map((h, idx) => (
                  <div key={h.id || idx} className="relative mb-4">
                    <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: 'var(--k-blue-light)' }}>
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--k-white)' }} />
                    </div>
                    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-band-grey)' }}>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--k-blue)' }}>
                        Moved #{idx + 1}
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums" style={{ color: 'var(--k-ink)' }}>
                        {formatDateDDMMYYYY(h.old_date, "—")} ({h.old_half === "second_half" ? "H2" : "H1"})
                        {" → "}
                        {formatDateDDMMYYYY(h.new_date, "—")} ({h.new_half === "second_half" ? "H2" : "H1"})
                      </p>
                      {h.moved_by_name && (
                        <p className="mt-0.5 text-[9px] font-semibold" style={{ color: 'var(--k-grey-500)' }}>by {h.moved_by_name}</p>
                      )}
                      {h.moved_at && (
                        <p className="text-[8px] font-semibold" style={{ color: 'var(--k-grey-500)' }}>
                          {new Date(h.moved_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen relative flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />
      {taskToDelete && (
        <div className="k-backdrop !z-[300]">
          <div className="k-modal !max-w-md p-5 md:p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{ background: 'var(--k-blue-tint)' }}>
                <Trash2 size={32} style={{ color: 'var(--k-ink)' }} />
              </div>
              <h3 className="text-2xl font-bold" style={{ color: 'var(--k-ink)' }}>Delete Task?</h3>
              <p className="text-sm font-medium" style={{ color: 'var(--k-grey-500)' }}>
                Are you sure you want to delete {taskToDelete?.title ? `"${taskToDelete.title}"` : 'this task'}? This action cannot be undone.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full pt-4">
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  className="k-btn-ghost w-full !py-3.5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeTaskDelete}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: 'var(--k-ink)', color: 'var(--k-white)' }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 overflow-y-auto k-scroll">
        {/* ===== ACTIVE TIMER STICKY BANNER ===== */}
        {activeTimerState.taskId && (
          <div className="sticky top-0 z-40 bg-[#212121] text-white px-5 py-3 shadow-xl flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-[var(--k-blue-light)] shrink-0">Active Timer:</span>
              <span className="text-sm font-bold truncate">{activeTimerState.taskTitle}</span>
              <span className="px-3 py-1 rounded-lg bg-white/10 text-xs font-mono font-bold tracking-wider text-emerald-300 border border-white/10 shrink-0">
                {formatSeconds(activeTimerState.seconds)}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeTimerState.isRunning ? (
                <button
                  onClick={() => handlePauseTimer({ id: activeTimerState.taskId })}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Pause size={13} /> Pause
                </button>
              ) : (
                <button
                  onClick={() => handleStartTimer({ id: activeTimerState.taskId, title: activeTimerState.taskTitle })}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Play size={13} /> Resume
                </button>
              )}
              <button
                onClick={() => handleSaveTimeLog({ id: activeTimerState.taskId, task_id: activeTimerState.taskTitle })}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--k-blue)] text-white hover:bg-[var(--k-blue-dark)] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Save size={13} /> Save Time Log
              </button>
            </div>
          </div>
        )}

        {/* ===== HEADER · WHITE BAND ===== */}
        <PageHeader
          title={`${userName}'s`}
          accent="Dashboard"
          subtitle="Your tasks, scores and delegations at a glance"
          backTo="/sgm"
          live
          actions={
            <>
              <button
                type="button"
                onClick={() => navigate("/employeedashboard/repeatable-task")}
                className="k-btn-ghost flex items-center gap-2 text-xs"
              >
                <Plus size={14} /> Repeatable Task
              </button>

              <div className="flex flex-wrap items-center gap-2 relative" ref={dateFilterRef}>
                {hasAppliedDateFilter && (
                  <span
                    className="k-pill max-w-[220px] truncate"
                    title={appliedDateFilterLabel}
                  >
                    {appliedDateFilterLabel}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const nextOpen = !showDateFilterDropdown;
                    setShowDateFilterDropdown(nextOpen);
                    if (nextOpen) {
                      setDraftStartDate(startDate);
                      setDraftEndDate(endDate);
                    }
                  }}
                  className="k-btn-primary flex items-center gap-2 text-xs"
                >
                  <Calendar size={14} /> Date Filter
                </button>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="k-btn-ghost text-xs"
                >
                  Reset
                </button>

                {showDateFilterDropdown && (
                  <div className="absolute right-0 mt-2 top-full w-[300px] md:w-[460px] k-card-static !rounded-xl p-4 z-[200]" style={{ boxShadow: 'var(--k-shadow-modal)' }}>
                    {/* SECTION 1: Current Date Range */}
                    <div className="mb-4">
                      <h4 className="k-eyebrow mb-3 border-b pb-1" style={{ borderColor: 'var(--k-grey-200)' }}>Current planned date range</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="k-label">Start Date</label>
                          <input
                            type="date"
                            value={draftCurrentStartDate || draftStartDate}
                            onChange={(e) => {
                              setDraftCurrentStartDate(e.target.value);
                              setDraftStartDate(e.target.value);
                            }}
                            className="k-input !text-xs"
                            title="Current start date"
                          />
                          <p className="mt-1 text-[10px] font-semibold tabular-nums" style={{ color: 'var(--k-grey-500)' }}>{formatDisplayDate(draftCurrentStartDate || draftStartDate)}</p>
                        </div>

                        <div>
                          <label className="k-label">End Date</label>
                          <input
                            type="date"
                            value={draftCurrentEndDate || draftEndDate}
                            onChange={(e) => {
                              setDraftCurrentEndDate(e.target.value);
                              setDraftEndDate(e.target.value);
                            }}
                            className="k-input !text-xs"
                            title="Current end date"
                          />
                          <p className="mt-1 text-[10px] font-semibold tabular-nums" style={{ color: 'var(--k-grey-500)' }}>{formatDisplayDate(draftCurrentEndDate || draftEndDate)}</p>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Original Date Range */}
                    <div className="mb-4">
                      <h4 className="k-eyebrow mb-3 border-b pb-1" style={{ borderColor: 'var(--k-grey-200)' }}>Original planned date range (MCTC)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="k-label">Start Date</label>
                          <input
                            type="date"
                            value={draftOriginalStartDate}
                            onChange={(e) => setDraftOriginalStartDate(e.target.value)}
                            className="k-input !text-xs"
                            title="Original start date"
                          />
                          <p className="mt-1 text-[10px] font-semibold tabular-nums" style={{ color: 'var(--k-grey-500)' }}>{formatDisplayDate(draftOriginalStartDate)}</p>
                        </div>

                        <div>
                          <label className="k-label">End Date</label>
                          <input
                            type="date"
                            value={draftOriginalEndDate}
                            onChange={(e) => setDraftOriginalEndDate(e.target.value)}
                            className="k-input !text-xs"
                            title="Original end date"
                          />
                          <p className="mt-1 text-[10px] font-semibold tabular-nums" style={{ color: 'var(--k-grey-500)' }}>{formatDisplayDate(draftOriginalEndDate)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end mt-4 pt-3 border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
                      <button
                        type="button"
                        onClick={handleApplyDateFilter}
                        className="k-btn-primary text-xs"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          }
        />

        {/* ===== BAND 2 · GREY · OVERVIEW (client filter + chart + KPIs) ===== */}
        <Band tone="grey" eyebrow="Overview">
          {/* Top Row: Executive Scorecard (6 Horizontal KPI Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
            <KpiCard index={0} label="Total Task" value={filteredDashboardStats.total_tasks} icon={<LayoutGrid />} accent />
            <KpiCard index={1} label="On Time Completion" value={filteredDashboardStats.on_time_count} icon={<CheckCircle />} accent />
            <KpiCard index={2} label="Overdue" value={filteredDashboardStats.overdue_count} icon={<AlertCircle />} />
            <KpiCard index={3} label="In Progress" value={filteredDashboardStats.in_progress_count} icon={<TrendingUp />} />
            <KpiCard index={4} label="Delayed" value={filteredDashboardStats.delayed_count} icon={<Clock />} />
            <KpiCard index={5} label="ATS Score" value={parseFloat(filteredDashboardStats.ats_score) || 0} suffix="%" icon={<TrendingUp />} accent />
          </div>

          {/* Bottom Row: Analytics Breakdown (8 cols) & Portfolio Filter (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Task Distribution & Analytics Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-8 k-card p-6 md:p-8 flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-md transition-all"
              style={{ background: 'var(--k-white)', borderColor: 'var(--k-grey-200)' }}
            >
              {/* Subtle ambient gradient glow on top right */}
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-gradient-to-br from-[var(--k-blue)]/10 via-transparent to-transparent blur-3xl pointer-events-none" />

              <div className="flex justify-between items-center mb-6 pb-4 border-b z-10" style={{ borderColor: 'var(--k-grey-200)' }}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="k-section-title !text-base !mb-0">Task Distribution & Analytics</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--k-blue-tint)] text-[var(--k-blue)]">
                      Real-Time
                    </span>
                  </div>
                  <p className="text-xs font-light" style={{ color: 'var(--k-grey-700)' }}>
                    Comprehensive workload status and efficiency breakdown across selected portfolio
                  </p>
                </div>
                <div className="p-3 rounded-2xl shadow-inner border border-[var(--k-blue)]/10" style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
                  <BarChart3 size={22} />
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center gap-8 my-auto z-10 py-2">
                {/* Left: Pie Chart with Glowing OTC Center */}
                <div className="w-full md:w-5/12 h-[250px] relative shrink-0 flex items-center justify-center">
                  {/* Ambient chart halo */}
                  <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-[var(--k-blue)]/15 via-[var(--k-blue-tint)]/40 to-transparent blur-2xl pointer-events-none" />

                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <PieChart>
                      <Pie
                        data={
                          (filteredDashboardStats.total_tasks > 0 && filteredDashboardStats.chart_data.some(d => d.value > 0))
                            ? filteredDashboardStats.chart_data
                            : [{ name: "Standby / No Active Tasks", value: 100, color: "var(--k-blue-tint)" }]
                        }
                        dataKey="value"
                        innerRadius={68}
                        outerRadius={98}
                        paddingAngle={(filteredDashboardStats.total_tasks > 0 && filteredDashboardStats.chart_data.some(d => d.value > 0)) ? 6 : 0}
                        stroke="none"
                        animationBegin={200}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      >
                        {((filteredDashboardStats.total_tasks > 0 && filteredDashboardStats.chart_data.some(d => d.value > 0))
                          ? filteredDashboardStats.chart_data
                          : [{ name: "Standby / No Active Tasks", value: 100, color: "var(--k-blue-tint)" }]
                        ).map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Pie>
                      {filteredDashboardStats.total_tasks > 0 && (
                        <Tooltip
                          allowEscapeViewBox={{ x: true, y: true }}
                          wrapperStyle={{ zIndex: 60 }}
                          contentStyle={{
                            borderRadius: '16px',
                            border: '1px solid var(--k-grey-200)',
                            boxShadow: '0 16px 40px -12px rgba(0,134,255,0.25)',
                            fontFamily: 'Poppins, sans-serif',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: 'var(--k-white)',
                            color: 'var(--k-ink)'
                          }}
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>

                  {/* OTC Center Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-28 h-28 rounded-full flex flex-col items-center justify-center bg-[var(--k-white)] shadow-inner border border-[var(--k-grey-100)]">
                      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--k-grey-500)] mb-0.5">OTC Score</span>
                      <span className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight" style={{ color: 'var(--k-blue)' }}>
                        <AnimatedNumber value={parseFloat(filteredDashboardStats.otc_score) || 0} decimals={1} suffix="%" />
                      </span>
                      <span className="text-[9px] font-bold uppercase text-[var(--k-grey-500)] mt-0.5">
                        {filteredDashboardStats.total_tasks === 0 ? "Standby" : "Efficiency"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Detailed Category Progress Cards */}
                <div className="w-full md:w-7/12 space-y-3.5">
                  {filteredDashboardStats.chart_data.map((d, i) => {
                    const total = filteredDashboardStats.total_tasks || 0;
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                    
                    const isOverdue = d.name.toLowerCase().includes('overdue');
                    const isDelayed = d.name.toLowerCase().includes('delayed');
                    
                    const badgeColor = isOverdue ? '#212121' : isDelayed ? '#d97706' : 'var(--k-blue)';
                    const badgeBg = isOverdue ? '#f3f4f6' : isDelayed ? '#fef3c7' : 'var(--k-blue-tint)';
                    const cardBorderHover = isOverdue ? 'hover:border-[#212121]' : isDelayed ? 'hover:border-amber-400' : 'hover:border-[var(--k-blue)]';

                    return (
                      <div 
                        key={i} 
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 hover:shadow-md bg-[var(--k-white)] flex flex-col gap-2.5 ${cardBorderHover}`}
                        style={{ borderColor: 'var(--k-grey-200)' }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                            <span 
                              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" 
                              style={{ background: d.color }} 
                            />
                            <span className="text-xs sm:text-sm font-bold tracking-tight" style={{ color: 'var(--k-ink)' }}>
                              {d.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-black tabular-nums" style={{ color: 'var(--k-ink)' }}>
                              {d.value} <span className="font-light text-xs text-[var(--k-grey-500)]">Tasks</span>
                            </span>
                            <span 
                              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums"
                              style={{ background: badgeBg, color: badgeColor }}
                            >
                              {pct}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="w-full h-2.5 rounded-full overflow-hidden p-0.5 bg-[var(--k-grey-100)] border border-[var(--k-grey-200)]/50">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full relative"
                            style={{ background: d.color }}
                          >
                            {pct > 0 && (
                              <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/40 rounded-full blur-[1px]" />
                            )}
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Bottom Summary Status Pill */}
                  <div className="pt-2 flex items-center justify-between text-xs font-semibold px-1 text-[var(--k-grey-700)]">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Sync Active</span>
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--k-blue)]">
                      Total Workload: <strong className="text-[var(--k-ink)]">{filteredDashboardStats.total_tasks} Tasks</strong>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Client Portfolio Filter Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-4 k-card p-6 flex flex-col"
            >
              <div className="mb-4 pb-3 border-b" style={{ borderColor: 'var(--k-grey-200)' }}>
                <h3 className="k-section-title !text-base mb-1">Client Portfolio</h3>
                <p className="text-xs font-light" style={{ color: 'var(--k-grey-700)' }}>
                  Filter dashboard metrics by client
                </p>
              </div>

              {loading ? (
                <div className="space-y-3 py-4">
                  <div className="h-8 w-full k-skeleton rounded-xl" />
                  <div className="h-8 w-full k-skeleton rounded-xl" />
                  <div className="h-8 w-3/4 k-skeleton rounded-xl" />
                </div>
              ) : (
                <div className="flex flex-col flex-1">
                  {/* All Tasks Master Toggle */}
                  <label
                    className="flex items-center justify-between text-xs font-bold mb-3 cursor-pointer rounded-xl px-3.5 py-2.5 transition-all border shadow-sm"
                    style={{
                      background: includeAllTasks ? 'var(--k-blue)' : 'var(--k-white)',
                      color: includeAllTasks ? 'var(--k-white)' : 'var(--k-ink)',
                      borderColor: includeAllTasks ? 'var(--k-blue)' : 'var(--k-grey-200)'
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={includeAllTasks}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setIncludeAllTasks(checked);
                          if (checked) {
                            setSelectedClients(Object.keys(clientProjectMap));
                          }
                        }}
                        className="rounded accent-white"
                      />
                      All Tasks & Projects
                    </span>
                    {includeAllTasks && <CheckCircle size={15} />}
                  </label>

                  {/* Scrollable Client Checkbox List */}
                  <div className="max-h-[220px] overflow-y-auto k-scroll pr-1 space-y-1.5 flex-1">
                    {Object.keys(clientProjectMap).map((client, i) => {
                      const checked = includeAllTasks || selectedClients.includes(client);
                      return (
                        <label
                          key={i}
                          className="flex items-center justify-between text-xs cursor-pointer font-medium rounded-xl px-3 py-2 transition-all border"
                          style={{
                            background: checked && !includeAllTasks ? 'var(--k-blue-tint)' : 'transparent',
                            color: checked && !includeAllTasks ? 'var(--k-blue)' : 'var(--k-grey-700)',
                            borderColor: checked && !includeAllTasks ? 'rgba(0,134,255,0.3)' : 'transparent'
                          }}
                        >
                          <span className="flex items-center gap-2.5 truncate pr-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleClientSelection(client)}
                              className="rounded accent-[var(--k-blue)]"
                            />
                            <span className="truncate">{client}</span>
                          </span>
                          {checked && !includeAllTasks && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--k-blue)' }} />}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </Band>

        {/* ===== BAND 3 · WHITE · QUICK ACTIONS ===== */}
        <Band tone="white" eyebrow="Quick actions">
          <div className="flex justify-center gap-3 md:gap-4 items-center flex-wrap">
            <SavedFiltersBar
              activeFilters={{ statusFilter, revisionFilter, dateFilterType }}
              onApplyFilter={(params) => {
                if (params.statusFilter) setStatusFilter(params.statusFilter);
                if (params.revisionFilter) setRevisionFilter(params.revisionFilter);
                if (params.dateFilterType) setDateFilterType(params.dateFilterType);
              }}
            />
            <div className="relative" ref={statusFilterRef}>
              <MidBtn
                label={statusFilter === "All" ? "FILTER" : statusFilter.toUpperCase()}
                icon={<Filter size={14} />}
                onClick={() => setShowStatusFilterDropdown(!showStatusFilterDropdown)}
                primary={statusFilter !== "All"}
              />
              {showStatusFilterDropdown && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 k-card-static !rounded-2xl py-2 z-50" style={{ boxShadow: 'var(--k-shadow-modal)' }}>
                  <div className="px-4 py-2 border-b mb-1" style={{ borderColor: 'var(--k-grey-100)' }}>
                    <p className="k-eyebrow">Filter By Status</p>
                  </div>
                  {[
                    "All", "Backlog", "Planning", "In Progress", "Review", "Testing", "Blocked",
                    "Completed", "On Time", "Delayed", "Overdue", "Cancelled", "Today's Task"
                  ].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setStatusFilter(option);
                        setShowStatusFilterDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center justify-between"
                      style={statusFilter === option
                        ? { background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }
                        : { color: 'var(--k-grey-700)' }}
                    >
                      {option}
                      {statusFilter === option && <CheckCircle size={12} style={{ color: 'var(--k-blue)' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* MCTC REVISION FILTER */}
            <div className="relative" ref={revisionFilterRef}>
              <MidBtn
                label={revisionFilter === "all" ? "REVISIONS" : revisionFilter === "revised" ? "REVISED" : `REVS >= ${revisionFilter === "ge2" ? "2" : "3"}`}
                icon={<Filter size={14} />}
                onClick={() => setShowRevisionFilterDropdown(!showRevisionFilterDropdown)}
                primary={revisionFilter !== "all"}
              />
              {showRevisionFilterDropdown && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 k-card-static !rounded-2xl py-2 z-50" style={{ boxShadow: 'var(--k-shadow-modal)' }}>
                  <div className="px-4 py-2 border-b mb-1" style={{ borderColor: 'var(--k-grey-100)' }}>
                    <p className="k-eyebrow">Filter By Revisions</p>
                  </div>
                  {[
                    { value: "all", label: "All Tasks" },
                    { value: "revised", label: "Revised Tasks Only" },
                    { value: "ge2", label: "Revision Count >= 2" },
                    { value: "ge3", label: "Revision Count >= 3" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setRevisionFilter(option.value);
                        setShowRevisionFilterDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold transition-colors flex items-center justify-between"
                      style={revisionFilter === option.value
                        ? { background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }
                        : { color: 'var(--k-grey-700)' }}
                    >
                      {option.label}
                      {revisionFilter === option.value && <CheckCircle size={12} style={{ color: 'var(--k-blue)' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowSmartPasteModal(true)}
              className="k-btn-ghost !rounded-full flex items-center gap-2 text-xs"
            >
              <Upload size={14} /> Smart Paste
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="k-btn-ghost !rounded-full flex items-center gap-2 text-xs"
            >
              <ClipboardList size={14} /> Bulk Assign
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="k-btn-primary !rounded-full flex items-center gap-2 text-xs"
            >
              <Plus size={14} /> Assign
            </button>
            <button
              onClick={() => setShowExcelImportModal(true)}
              className="k-btn-ghost !rounded-full flex items-center gap-2 text-xs"
            >
              <FileText size={14} /> Import Excel
            </button>
            {/* SEARCH BAR */}
            <div className="relative group">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="k-input !rounded-full !pl-11 !pr-4 !py-3 !text-xs w-64"
              />
              <SearchCode size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--k-grey-500)' }} />
            </div>
          </div>
        </Band>

        {/* ===== CSS-ONLY TABBED DATA TABLES ===== */}
        <div className="max-w-7xl mx-auto mt-6 px-4 md:px-6 w-full pb-20">
          <input type="radio" name="dashboard-tabs" id="tab-my-tasks" className="peer/my-tasks hidden" defaultChecked />
          <input type="radio" name="dashboard-tabs" id="tab-upcoming" className="peer/upcoming hidden" />
          <input type="radio" name="dashboard-tabs" id="tab-completed" className="peer/completed hidden" />
          <input type="radio" name="dashboard-tabs" id="tab-delegated" className="peer/delegated hidden" />

          <div className="flex items-center border-b border-slate-200 mb-6 overflow-x-auto pb-px">
            <div className="flex space-x-1">
              <label htmlFor="tab-my-tasks" className="px-5 py-3 cursor-pointer text-sm font-medium border-b-2 border-transparent peer-checked/my-tasks:border-blue-600 peer-checked/my-tasks:text-blue-600 text-slate-500 hover:text-slate-700 whitespace-nowrap transition-colors">
                My Tasks
              </label>
              <label htmlFor="tab-upcoming" className="px-5 py-3 cursor-pointer text-sm font-medium border-b-2 border-transparent peer-checked/upcoming:border-blue-600 peer-checked/upcoming:text-blue-600 text-slate-500 hover:text-slate-700 whitespace-nowrap transition-colors">
                Upcoming 7 Days
              </label>
              <label htmlFor="tab-completed" className="px-5 py-3 cursor-pointer text-sm font-medium border-b-2 border-transparent peer-checked/completed:border-blue-600 peer-checked/completed:text-blue-600 text-slate-500 hover:text-slate-700 whitespace-nowrap transition-colors">
                Completed
              </label>
              <label htmlFor="tab-delegated" className="px-5 py-3 cursor-pointer text-sm font-medium border-b-2 border-transparent peer-checked/delegated:border-blue-600 peer-checked/delegated:text-blue-600 text-slate-500 hover:text-slate-700 whitespace-nowrap transition-colors">
                Delegated
              </label>
            </div>
          </div>

          <div className="hidden peer-checked/my-tasks:block">
            {/* ===== TASK OVERVIEW TABLE (Tasks Assigned TO Me - Active) ===== */}
            <Table
              title="My Tasks"
              data={filterTasks(filterTasksByStatus(filterTasksByDateRange(filterTasksByRevision(filterTasksByClient(myTasks)))))}
              mode="overview"
              onQuickComplete={handleDirectComplete}
              onReportComplete={openCompletionModal}
              selectedTasks={selectedTasks}
              onToggleSelect={toggleTaskSelection}
              onToggleSelectAll={toggleSelectAll}
              onBulkComplete={handleBulkComplete}
              currentUserId={currentUser?.id}
              onDeleteTask={requestDeleteTask}
              onViewHistory={openHistoryPopup}
              loading={loading}
              activeTimerState={activeTimerState}
              handleStartTimer={handleStartTimer}
              handlePauseTimer={handlePauseTimer}
              handleSaveTimeLog={handleSaveTimeLog}
            />
          </div>

          <div className="hidden peer-checked/upcoming:block">
            {/* ===== UPCOMING 7 DAYS TASKS TABLE ===== */}
            <Table
              title="Upcoming 7 Days Tasks"
              data={filterTasks(filterTasksByStatus(filterTasksByDateRange(filterTasksByRevision(filterTasksByClient(
                myTasks.filter(t => {
                  if (!t.target_date) return false;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const targetDate = new Date(t.target_date);
                  targetDate.setHours(0, 0, 0, 0);
                  const sevenDaysLater = new Date(today);
                  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
                  return targetDate >= today && targetDate <= sevenDaysLater;
                })
              )))))}
              mode="overview"
              onQuickComplete={handleDirectComplete}
              onReportComplete={openCompletionModal}
              selectedTasks={selectedTasks}
              onToggleSelect={toggleTaskSelection}
              onToggleSelectAll={toggleSelectAll}
              onBulkComplete={handleBulkComplete}
              currentUserId={currentUser?.id}
              onDeleteTask={requestDeleteTask}
              onViewHistory={openHistoryPopup}
              loading={loading}
              activeTimerState={activeTimerState}
              handleStartTimer={handleStartTimer}
              handlePauseTimer={handlePauseTimer}
              handleSaveTimeLog={handleSaveTimeLog}
            />
          </div>

          <div className="hidden peer-checked/completed:block">
            {/* ===== COMPLETED TASKS TABLE ===== */}
            <Table
              title="Completed Tasks"
              data={filterTasks(filterTasksByStatus(filterTasksByDateRange(filterTasksByRevision(filterTasksByClient(completedTasks)))))}
              mode="completed"
              currentUserId={currentUser?.id}
              onDeleteTask={requestDeleteTask}
              onViewHistory={openHistoryPopup}
              loading={loading}
              activeTimerState={activeTimerState}
              handleStartTimer={handleStartTimer}
              handlePauseTimer={handlePauseTimer}
              handleSaveTimeLog={handleSaveTimeLog}
            />
          </div>

          <div className="hidden peer-checked/delegated:block">
            {/* ===== DELEGATED TASKS TABLE ===== */}
            <Table
              title="Delegated Tasks"
              data={filterTasks(filterTasksByStatus(filterTasksByDateRange(filterTasksByRevision(filterTasksByClient(delegatedTasks)))))}
              mode="assigned"
              currentUserId={currentUser?.id}
              onDeleteTask={requestDeleteTask}
              onViewHistory={openHistoryPopup}
              loading={loading}
              activeTimerState={activeTimerState}
              handleStartTimer={handleStartTimer}
              handlePauseTimer={handlePauseTimer}
              handleSaveTimeLog={handleSaveTimeLog}
            />
          </div>
        </div>
        {/* ========================================================== */}
        {/* TASK COMPLETION MODAL FORM */}
        {/* ========================================================== */}
        {showCompleteModal && (
          <div className="k-backdrop !z-[300]">
            <div className="k-modal !max-w-2xl">
              <div className="p-6 flex justify-between items-center shrink-0" style={{ background: 'var(--k-blue)', color: 'var(--k-white)' }}>
                <h2 className="text-lg font-semibold flex items-center gap-3">
                  <FileCheck size={24} /> Submit Completion Report
                </h2>
                <button onClick={() => setShowCompleteModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto k-scroll flex-1">
                <form onSubmit={handleCompleteSubmit} className="p-8 md:p-10 space-y-8">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="p-6 rounded-3xl" style={{ background: 'var(--k-blue-tint)', border: '1px solid var(--k-blue)' }}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center text-center">
                        <div><p className="k-eyebrow">Task ID</p><p className="text-xs font-semibold truncate" style={{ color: 'var(--k-blue)' }}>{completionData.taskIdDisplay || "—"}</p></div>
                        <div><p className="k-eyebrow">Task</p><p className="text-xs font-semibold truncate" style={{ color: 'var(--k-blue)' }}>{completionData.task || "—"}</p></div>
                        <div><p className="k-eyebrow">Project</p><p className="text-xs font-semibold truncate" style={{ color: 'var(--k-blue)' }}>{completionData.project || "—"}</p></div>
                        <div><p className="k-eyebrow">Client</p><p className="text-xs font-semibold truncate" style={{ color: 'var(--k-blue)' }}>{completionData.client || "—"}</p></div>
                      </div>
                    </div>

                    <div>
                      <label className="k-label">Step 2: Remarks / Work Description</label>
                      <textarea required value={completionData.remarks} onChange={(e) => setCompletionData({ ...completionData, remarks: e.target.value })} rows="3" className="k-textarea !rounded-3xl !px-6 !py-4" placeholder="Describe exactly what was delivered..." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="k-label">Step 3: Upload Proof (PDF)</label>
                        <label className="mt-1 w-full border-2 border-dashed rounded-3xl py-4 px-4 flex items-center justify-center gap-3 cursor-pointer transition-all hover:opacity-80" style={{ background: 'var(--k-band-grey)', borderColor: 'var(--k-grey-200)' }}>
                          <Upload size={18} style={{ color: 'var(--k-grey-500)' }} />
                          <span className="text-xs font-semibold" style={{ color: 'var(--k-grey-500)' }}>{completionData.file ? completionData.file.name : "Attach Completion File"}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf"
                            onChange={(e) => setCompletionData({ ...completionData, file: e.target.files?.[0] || null })}
                          />
                        </label>
                      </div>

                      <div className="flex items-end">
                        <button type="submit" className="k-btn-primary w-full !py-5 flex items-center justify-center gap-3">
                          <SendHorizontal size={18} /> Submit Final Report
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ===== BULK ASSIGN MODAL ===== */}
        {showBulkModal && (
          <div className="k-backdrop !z-[300]">
            <div className="k-modal !max-w-7xl !max-h-[92vh]">
              <div className="p-6 flex justify-between shrink-0" style={{ background: 'var(--k-ink)', color: 'var(--k-white)' }}>
                <h2 className="font-semibold flex items-center gap-2">
                  <ClipboardList size={18} style={{ color: 'var(--k-blue)' }} /> Bulk Assign Tasks
                </h2>
                <button onClick={() => setShowBulkModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 md:p-8 space-y-6 overflow-y-auto k-scroll flex-1">
                {/* EDITABLE TABLE FOR BULK TASKS */}
                <div className="overflow-x-auto k-scroll rounded-2xl border" style={{ borderColor: 'var(--k-grey-200)' }}>
                  <table className="k-table">
                    <thead>
                      <tr>
                        <th className="w-10 text-center">#</th>
                        <th className="min-w-[120px]">Type</th>
                        <th className="min-w-[140px]">Client</th>
                        <th className="min-w-[140px]">Project</th>
                        <th className="min-w-[200px]">Task Title</th>
                        <th className="min-w-[160px]">Assigned To</th>
                        <th className="min-w-[120px]">Priority</th>
                        <th className="min-w-[130px]">Flag</th>
                        <th className="min-w-[120px]">Due Date</th>
                        <th className="w-10 text-center">Ads</th>
                        <th className="w-10 text-center">Act</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkTasks.map((task, index) => (
                        <motion.tr
                          key={index}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.35 }}
                        >
                          <td className="text-center text-xs font-semibold" style={{ color: 'var(--k-grey-500)' }}>{index + 1}</td>

                          {/* TYPE: INTERNAL / NORMAL */}
                          <td className="align-top">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={task.isInternal}
                              aria-label={task.isInternal ? "Internal task selected" : "Client task selected"}
                              onClick={() => handleRowChange(index, "isInternal", !task.isInternal)}
                              className="mt-1 inline-flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 transition-all"
                              style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-band-grey)' }}
                            >
                              <span className="text-[10px] font-semibold transition-colors" style={{ color: task.isInternal ? 'var(--k-blue)' : 'var(--k-grey-500)' }}>
                                Internal
                              </span>
                              <span
                                className="relative h-6 w-11 overflow-hidden rounded-full transition-colors"
                                style={{ background: task.isInternal ? 'var(--k-grey-300)' : 'var(--k-blue)' }}
                              >
                                <span
                                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full shadow-sm transition-transform ${task.isInternal ? "translate-x-0" : "translate-x-5"}`}
                                  style={{ background: 'var(--k-white)' }}
                                />
                              </span>
                              <span className="text-[10px] font-semibold transition-colors" style={{ color: !task.isInternal ? 'var(--k-blue)' : 'var(--k-grey-500)' }}>
                                Client
                              </span>
                            </button>
                          </td>

                          {/* CLIENT SELECTION (AUTOCOMPLETE) */}
                          <td className="align-top">
                            {!task.isInternal ? (
                              <AutocompleteInput
                                value={task.client}
                                onChange={(val) => handleRowChange(index, "client", val)}
                                options={Object.keys(clientProjectMap)}
                                placeholder="Type Client..."
                                className="k-input !text-[10px] !py-1.5 !rounded-lg"
                              />
                            ) : (
                              <div className="text-[10px] font-semibold italic mt-2" style={{ color: 'var(--k-grey-500)' }}>Internal Task</div>
                            )}
                          </td>

                          {/* PROJECT SELECTION (AUTOCOMPLETE) */}
                          <td className="align-top">
                            {!task.isInternal ? (
                              <AutocompleteInput
                                value={task.project}
                                onChange={(val) => handleRowChange(index, "project", val)}
                                options={task.client && clientProjectMap[task.client] ? clientProjectMap[task.client].map(p => p.name) : []}
                                placeholder="Type Project..."
                                disabled={!task.client}
                                className={`k-input !text-[10px] !py-1.5 !rounded-lg ${!task.client ? "opacity-50 cursor-not-allowed" : ""}`}
                              />
                            ) : (
                              <div className="text-[10px] font-semibold italic mt-2" style={{ color: 'var(--k-grey-500)' }}>—</div>
                            )}
                          </td>

                          {/* TASK TITLE */}
                          <td className="align-top">
                            <textarea
                              value={task.title}
                              onChange={(e) => handleRowChange(index, "title", e.target.value)}
                              placeholder="Enter task description..."
                              rows={2}
                              className="k-textarea !text-xs !py-2 !rounded-lg resize-none"
                            />
                          </td>

                          {/* ASSIGNED TO */}
                          <td className="align-top">
                            <select
                              value={task.assignedTo}
                              onChange={(e) => handleRowChange(index, "assignedTo", e.target.value)}
                              className={`k-select !text-[10px] !py-1.5 !rounded-lg ${(!task.isInternal && !task.client) ? "opacity-50 cursor-not-allowed" : ""}`}
                              disabled={!task.isInternal && !task.client}
                            >
                              <option value="">Select Member...</option>
                              {(() => {
                                const members = getAssignableMembers({
                                  isInternal: task.isInternal,
                                  clientName: task.client,
                                  projectName: task.project,
                                });
                                return members.map((m, i) => (
                                  <option key={i} value={m.email}>{m.full_name || m.username || m.email} ({m.role})</option>
                                ));
                              })()}
                            </select>
                          </td>

                          {/* PRIORITY */}
                          <td className="align-top">
                            <select
                              value={task.priority || 'LOW'}
                              onChange={(e) => handleRowChange(index, "priority", e.target.value)}
                              className="k-select !text-[10px] !py-1.5 !rounded-lg"
                            >
                              {taskPriorityOptions.map((priorityOption) => (
                                <option key={priorityOption.value} value={priorityOption.value}>{priorityOption.label}</option>
                              ))}
                            </select>
                          </td>

                          {/* FLAG */}
                          <td className="align-top">
                            <select
                              value={task.flag || 'none'}
                              onChange={(e) => handleRowChange(index, "flag", e.target.value)}
                              className="k-select !text-[10px] !py-1.5 !rounded-lg"
                            >
                              {taskFlagOptions.map((flagOption) => (
                                <option key={flagOption.value} value={flagOption.value}>{flagOption.label}</option>
                              ))}
                            </select>
                          </td>

                          {/* DUE DATE */}
                          <td className="align-top">
                            <input
                              type="date"
                              value={task.targetDate}
                              onChange={(e) => handleRowChange(index, "targetDate", e.target.value)}
                              min={minTaskDate}
                              className="k-input !text-[10px] !py-1.5 !rounded-lg"
                            />
                          </td>

                          {/* FILE ATTACHMENT */}
                          <td className="align-top text-center">
                            <label
                              className="cursor-pointer w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                              style={task.file
                                ? { background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }
                                : { background: 'var(--k-grey-100)', color: 'var(--k-grey-500)' }}
                            >
                              <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => handleRowChange(index, "file", e.target.files[0])} />
                              {task.file ? <CheckCircle size={14} /> : <Upload size={14} />}
                            </label>
                          </td>

                          {/* REMOVE ROW */}
                          <td className="align-top text-center">
                            <button
                              onClick={() => removeBulkTaskRow(index)}
                              className="k-btn-icon"
                              title="Remove Row"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="flex justify-between items-center pt-4 border-t shrink-0" style={{ borderColor: 'var(--k-grey-100)' }}>
                  <button
                    onClick={addBulkTaskRow}
                    className="k-btn-ghost flex items-center gap-2 text-xs"
                  >
                    <Plus size={14} /> Add Another Row
                  </button>

                  <button
                    onClick={handleBulkAssignSubmit}
                    disabled={bulkTasks.length === 0}
                    className="k-btn-primary flex gap-2 items-center text-xs"
                  >
                    <ClipboardList size={16} /> Assign All {bulkTasks.length} Tasks
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== DEDICATED SMART PASTE MODAL ===== */}
        {showSmartPasteModal && (
          <div className="k-backdrop !z-[300]">
            <div className="k-modal !max-w-4xl">
              <div className="p-6 flex justify-between items-center shrink-0" style={{ background: 'var(--k-ink)', color: 'var(--k-white)' }}>
                <h2 className="text-lg font-semibold flex items-center gap-3">
                  <Upload size={24} /> Smart Paste Task Builder
                </h2>
                <button onClick={() => setShowSmartPasteModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6 overflow-y-auto k-scroll flex-1">
                {/* PASTE INPUT TEXTAREA */}
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'title', label: 'Title' },
                      { key: 'client', label: 'Client' },
                      { key: 'project', label: 'Project' },
                      { key: 'assignee', label: 'Assigned To' },
                      { key: 'date', label: 'Date' }
                    ].map((col) => (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => setPasteColumnType(col.key)}
                        className="px-4 py-2 rounded-full text-[10px] font-semibold uppercase tracking-widest border transition-all"
                        style={pasteColumnType === col.key
                          ? { background: 'var(--k-blue)', color: 'var(--k-white)', borderColor: 'var(--k-blue)' }
                          : { background: 'var(--k-white)', color: 'var(--k-grey-500)', borderColor: 'var(--k-grey-200)' }}
                      >
                        {col.label}
                      </button>
                    ))}
                  </div>
                  <h3 className="k-eyebrow">
                    {pasteColumnType ? `Paste ${pasteColumnType} column` : "Select a column, then paste"}
                  </h3>
                  <textarea
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder={pasteColumnType
                      ? `Paste ${pasteColumnType} values (one per line)`
                      : "Select a column button above, then paste"}
                    className="k-textarea !h-32 font-mono"
                  />
                </div>

                {/* DRAFT TASKS TABLE WITH DROPDOWNS */}
                {draftTasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="k-eyebrow">{draftTasks.length} Draft Tasks</h3>
                    <div className="rounded-lg border overflow-x-auto max-h-60 overflow-y-auto k-scroll" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-white)' }}>
                      <table className="k-table text-[10px] font-mono">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th className="min-w-[100px]">Title</th>
                            <th className="min-w-[90px]">Client</th>
                            <th className="min-w-[90px]">Project</th>
                            <th className="min-w-[120px]">Assigned To</th>
                            <th className="min-w-[110px]">Priority</th>
                            <th className="min-w-[110px]">Flag</th>
                            <th className="min-w-[100px]">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draftTasks.map((task, idx) => {
                            const isInvalidClient = task.client.startsWith('[INVALID]');
                            const isInvalidProject = task.project.startsWith('[INVALID]');
                            const isInvalid = isInvalidClient || isInvalidProject;
                            const importErrorFields = Array.isArray(task.importErrorFields) ? task.importErrorFields : [];
                            const hasTitleError = importErrorFields.includes('title');
                            const hasClientError = importErrorFields.includes('client');
                            const hasProjectError = importErrorFields.includes('project');
                            const hasAssignedToError = importErrorFields.includes('assigned_to');
                            const hasTargetDateError = importErrorFields.includes('target_date');
                            const errBorder = { borderColor: 'var(--k-ink)' };

                            return (
                              <tr
                                key={idx}
                                style={isInvalid ? { background: 'var(--k-blue-tint)' } : undefined}
                              >
                                <td>{idx + 1}</td>
                                <td className="truncate max-w-[100px]" style={{ color: hasTitleError ? 'var(--k-ink)' : 'var(--k-grey-700)', fontWeight: hasTitleError ? 700 : 400 }} title={task.title}>{task.title || "—"}</td>
                                <td className="min-w-[120px]">
                                  <select
                                    value={task.isInternal ? 'Internal' : task.client}
                                    onChange={(e) => {
                                      const selected = e.target.value;
                                      const updated = [...draftTasks];
                                      if (selected === 'Internal') {
                                        updated[idx] = { ...updated[idx], isInternal: true, client: '', project: '', assignedTo: '' };
                                      } else {
                                        updated[idx] = { ...updated[idx], isInternal: false, client: selected, project: '', assignedTo: '' };
                                      }
                                      setDraftTasks(updated);
                                    }}
                                    className="k-select !text-[10px] !py-1 !rounded-lg"
                                    style={(isInvalidClient || hasClientError) ? errBorder : undefined}
                                  >
                                    <option value="">Select Client...</option>
                                    <option value="Internal">Internal</option>
                                    {getAvailableClientNames().map((clientName) => (
                                      <option key={clientName} value={clientName}>{clientName}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="min-w-[120px]">
                                  <select
                                    value={task.project || ''}
                                    onChange={(e) => {
                                      const updated = [...draftTasks];
                                      updated[idx] = { ...updated[idx], project: e.target.value, assignedTo: '' };
                                      setDraftTasks(updated);
                                    }}
                                    disabled={task.isInternal || !task.client}
                                    className="k-select !text-[10px] !py-1 !rounded-lg"
                                    style={(isInvalidProject || hasProjectError) ? errBorder : undefined}
                                  >
                                    <option value="">{task.isInternal ? '-' : 'Select Project...'}</option>
                                    {!task.isInternal && task.client && (clientProjectMap[task.client] || []).map((p, i) => (
                                      <option key={`${task.client}-${p.id || i}`} value={p.name}>{p.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="min-w-[120px]">
                                  <select
                                    value={task.assignedTo}
                                    onChange={(e) => {
                                      const updated = [...draftTasks];
                                      updated[idx] = { ...updated[idx], assignedTo: e.target.value };
                                      setDraftTasks(updated);
                                    }}
                                    className="k-select !text-[10px] !py-1 !rounded-lg"
                                    style={hasAssignedToError ? errBorder : undefined}
                                  >
                                    <option value="">Select...</option>
                                    {(() => {
                                      let members = getAssignableMembers({
                                        isInternal: task.isInternal,
                                        clientName: task.client,
                                        projectName: task.project,
                                      });
                                      return members.map((m, i) => (
                                        <option key={i} value={m.email}>{m.full_name || m.username || m.email.split('@')[0]}</option>
                                      ));
                                    })()}
                                  </select>
                                </td>
                                <td className="min-w-[110px]">
                                  <select
                                    value={task.priority || 'LOW'}
                                    onChange={(e) => {
                                      const updated = [...draftTasks];
                                      updated[idx] = { ...updated[idx], priority: e.target.value };
                                      setDraftTasks(updated);
                                    }}
                                    className="k-select !text-[10px] !py-1 !rounded-lg"
                                  >
                                    {taskPriorityOptions.map((priorityOption) => (
                                      <option key={priorityOption.value} value={priorityOption.value}>{priorityOption.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="min-w-[110px]">
                                  <select
                                    value={task.flag || 'none'}
                                    onChange={(e) => {
                                      const updated = [...draftTasks];
                                      updated[idx] = { ...updated[idx], flag: e.target.value };
                                      setDraftTasks(updated);
                                    }}
                                    className="k-select !text-[10px] !py-1 !rounded-lg"
                                  >
                                    {taskFlagOptions.map((flagOption) => (
                                      <option key={flagOption.value} value={flagOption.value}>{flagOption.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="min-w-[120px]">
                                  <input
                                    type="date"
                                    value={task.targetDate}
                                    onChange={(e) => {
                                      const updated = [...draftTasks];
                                      updated[idx] = { ...updated[idx], targetDate: e.target.value };
                                      setDraftTasks(updated);
                                    }}
                                    min={minTaskDate}
                                    className="k-input !text-[10px] !py-1 !rounded-lg"
                                    style={hasTargetDateError ? errBorder : undefined}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {(draftTasks.some(t => String(t.client || '').startsWith('[INVALID]')) || draftTasks.some(t => String(t.project || '').startsWith('[INVALID]'))) && (
                      <p className="text-[10px] font-semibold" style={{ color: 'var(--k-ink)' }}>
                        ⚠ {draftTasks.filter(t => String(t.client || '').startsWith('[INVALID]') || String(t.project || '').startsWith('[INVALID]')).length} tasks with invalid clients/projects won't be created
                      </p>
                    )}
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex justify-end gap-3 pt-4 border-t shrink-0" style={{ borderColor: 'var(--k-grey-200)' }}>
                  {draftTasks.length > 0 && (
                    <button
                      onClick={clearSmartPasteDrafts}
                      className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                      style={{ background: 'var(--k-ink)', color: 'var(--k-white)' }}
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setShowSmartPasteModal(false)}
                    className="k-btn-ghost text-xs"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSmartPaste}
                    className="k-btn-ghost text-xs"
                  >
                    {draftTasks.length === 0 ? "Create Drafts" : "Update Column"}
                  </button>
                  {draftTasks.length > 0 && (
                    <button
                      onClick={handleSubmitSmartPaste}
                      className="k-btn-primary text-xs"
                    >
                      ✓ Create {draftTasks.filter(t => {
                        const invalidMarker = String(t.client || '').startsWith('[INVALID]') || String(t.project || '').startsWith('[INVALID]');
                        const hasRequired = t.title && t.assignedTo && t.targetDate && (t.isInternal || (t.client && t.project));
                        return !invalidMarker && hasRequired;
                      }).length} Tasks
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showExcelImportModal && (
          <div className="k-backdrop !z-[300]">
            <div className="k-modal !max-w-5xl">
              <div className="p-6 flex justify-between items-center shrink-0" style={{ background: 'var(--k-ink)', color: 'var(--k-white)' }}>
                <h2 className="text-lg font-semibold flex items-center gap-3">
                  <FileText size={24} /> Import Tasks From Excel
                </h2>
                <button
                  onClick={() => {
                    setShowExcelImportModal(false);
                    handleBackToUpload();
                  }}
                  className="hover:bg-white/20 p-2 rounded-full transition-all flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6 overflow-y-auto k-scroll flex-1">
                {!mappingStep ? (
                  <div className="space-y-6">
                    <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--k-blue)', background: 'var(--k-blue-tint)' }}>
                      <p className="text-xs font-semibold" style={{ color: 'var(--k-grey-700)' }}>
                        Upload an <span className="font-bold">.xlsx</span> file. You can map columns in the next step before import.
                      </p>
                    </div>

                    <label className="w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:opacity-80" style={{ borderColor: 'var(--k-grey-300)' }}>
                      <Upload size={28} style={{ color: 'var(--k-blue)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--k-grey-700)' }}>Choose Excel File</span>
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--k-grey-500)' }}>Only .xlsx files are supported</span>
                      <input
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={handleExcelImport}
                      />
                    </label>

                    <a
                      href="/TestExcel.xlsx"
                      download
                      className="k-btn-primary w-full inline-flex items-center justify-center gap-2 text-[11px]"
                    >
                      <Download size={14} /> Download Sample Excel
                    </a>

                    {excelUploadStatus?.loading && (
                      <div className="rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'var(--k-blue)', background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
                        Reading Excel file...
                      </div>
                    )}

                    {excelUploadStatus?.error && (
                      <div className="rounded-xl border px-4 py-3 text-sm font-semibold whitespace-pre-wrap" style={{ borderColor: 'var(--k-ink)', background: 'var(--k-band-grey)', color: 'var(--k-ink)' }}>
                        {excelUploadStatus.error}
                      </div>
                    )}

                    {excelUploadStatus?.success && (
                      <div className="rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'var(--k-blue)', background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
                        Imported {excelUploadStatus.tasksCreated || 0} task(s) successfully.
                        {(excelUploadStatus.draftsCreated || 0) > 0 && (
                          <span className="block mt-1" style={{ color: 'var(--k-ink)' }}>
                            {excelUploadStatus.draftsCreated} task(s) were saved as draft with errors.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: 'var(--k-grey-200)' }}>
                        <h3 className="k-eyebrow">Map Columns</h3>

                        {[
                          { key: 'task', label: 'Task', required: true },
                          { key: 'client', label: 'Client' },
                          { key: 'project', label: 'Project' },
                          { key: 'assigned_to', label: 'Assigned To' },
                          { key: 'target_date', label: 'Target Date' },
                          { key: 'description', label: 'Description' },
                        ].map((field) => {
                          const hasFieldError = excelErrorFields.includes(field.key);
                          return (
                          <div key={field.key} className="grid grid-cols-2 items-center gap-3">
                            <label className="text-xs font-semibold" style={{ color: hasFieldError ? 'var(--k-ink)' : 'var(--k-grey-700)' }}>
                              {field.label} {field.required && <span style={{ color: 'var(--k-blue)' }}>*</span>}
                            </label>
                            <select
                              value={columnMapping[field.key] ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setColumnMapping(prev => ({
                                  ...prev,
                                  [field.key]: value === '' ? '' : Number(value),
                                }));
                              }}
                              className="k-select !text-xs !py-2 !rounded-lg"
                              style={hasFieldError ? { borderColor: 'var(--k-ink)' } : undefined}
                            >
                              <option value="">Not mapped</option>
                              {(excelPreview?.columns || []).map((col, idx) => (
                                <option key={idx} value={idx}>
                                  Col {idx + 1}: {String(col || '').trim() || `Column ${idx + 1}`}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                        })}

                        <div className="pt-3 mt-2 border-t space-y-3" style={{ borderColor: 'var(--k-grey-200)' }}>
                          <p className="k-eyebrow">
                            Import Defaults (Not From Excel)
                          </p>

                          <div className="grid grid-cols-2 items-center gap-3">
                            <label className="text-xs font-semibold" style={{ color: 'var(--k-grey-700)' }}>Flag</label>
                            <select
                              value={excelImportFlag}
                              onChange={(e) => setExcelImportFlag(e.target.value)}
                              className="k-select !text-xs !py-2 !rounded-lg"
                            >
                              {taskFlagOptions.map((flagOption) => (
                                <option key={flagOption.value} value={flagOption.value}>{flagOption.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 items-center gap-3">
                            <label className="text-xs font-semibold" style={{ color: 'var(--k-grey-700)' }}>Priority</label>
                            <select
                              value={excelImportPriority}
                              onChange={(e) => setExcelImportPriority(e.target.value)}
                              className="k-select !text-xs !py-2 !rounded-lg"
                            >
                              {taskPriorityOptions.map((priorityOption) => (
                                <option key={priorityOption.value} value={priorityOption.value}>{priorityOption.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                      </div>

                      <div className="rounded-2xl border p-4 space-y-3 overflow-auto" style={{ borderColor: 'var(--k-grey-200)' }}>
                        <h3 className="k-eyebrow">Preview (First 5 Rows)</h3>
                        <div className="overflow-x-auto k-scroll">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr style={{ background: 'var(--k-band-grey)' }}>
                                {(excelPreview?.columns || []).map((col, idx) => (
                                  <th key={idx} className="border px-2 py-1.5 text-left font-semibold whitespace-nowrap" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-grey-500)' }}>
                                    {String(col || '').trim() || `Column ${idx + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(excelPreview?.rows || []).map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                  {(excelPreview?.columns || []).map((_, colIdx) => (
                                    <td key={colIdx} className="border px-2 py-1.5 whitespace-nowrap" style={{ borderColor: 'var(--k-grey-100)', color: 'var(--k-grey-700)' }}>
                                      {row?.[colIdx] ?? '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {excelUploadStatus?.error && (
                      <div className="rounded-xl border px-4 py-3 text-sm font-semibold whitespace-pre-wrap" style={{ borderColor: 'var(--k-ink)', background: 'var(--k-band-grey)', color: 'var(--k-ink)' }}>
                        {excelUploadStatus.error}
                      </div>
                    )}

                    {excelUploadStatus?.backendErrors?.length > 0 && (
                      <div className="hidden" />
                    )}

                    {excelUploadStatus?.warnings?.length > 0 && (
                      <div className="hidden" />
                    )}

                    {excelUploadStatus?.loading && (
                      <div className="rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: 'var(--k-blue)', background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
                        Importing tasks...
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleBackToUpload}
                        className="k-btn-ghost text-xs"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmMapping}
                        className="k-btn-primary text-xs"
                      >
                        Confirm Import
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showAssignModal && (
          <div className="k-backdrop !z-[300]">
            <div className="k-modal !max-w-lg">
              <div className="p-6 flex justify-between items-center shrink-0" style={{ background: 'var(--k-ink)', color: 'var(--k-white)' }}>
                <h2 className="font-semibold flex items-center gap-2">
                  <Plus size={18} style={{ color: 'var(--k-blue)' }} /> Assign New Task
                </h2>
                <button onClick={() => setShowAssignModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto k-scroll flex-1">
                <form onSubmit={handleAssignSubmit} className="p-8 md:p-10 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="col-span-1 md:col-span-2">
                      <label className="k-label">Task Name</label>
                      <input required value={assignData.task} onChange={e => setAssignData({ ...assignData, task: e.target.value })} className="k-input !rounded-2xl !px-5 !py-3 md:!py-4 mt-1" placeholder="Enter task name..." />
                    </div>

                    <div className="col-span-1">
                      <label className="k-label">Client</label>
                      <select
                        required
                        value={assignData.isInternal ? "Internal" : assignData.client}
                        onChange={e => {
                          if (e.target.value === "Internal") {
                            setAssignData({ ...assignData, client: "", project: "", assignedTo: "", isInternal: true });
                          } else {
                            setAssignData({ ...assignData, client: e.target.value, project: "", assignedTo: "", isInternal: false });
                          }
                        }}
                        className="k-input !rounded-2xl !px-5 !py-3 md:!py-4 mt-1"
                      >
                        <option value="">Select Client</option>
                        <option value="Internal">Internal</option>
                        {Object.keys(clientProjectMap).map((c, i) => <option key={i} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="k-label">Project</label>
                      <select
                        required={!assignData.isInternal}
                        value={assignData.project}
                        onChange={e => setAssignData({ ...assignData, project: e.target.value, assignedTo: "" })}
                        className="k-input !rounded-2xl !px-5 !py-3 md:!py-4 mt-1"
                        disabled={assignData.isInternal || !assignData.client}
                      >
                        <option value="">{assignData.isInternal ? "N/A" : "Select Project"}</option>
                        {!assignData.isInternal && assignData.client && clientProjectMap[assignData.client]?.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="k-label">Assigned To</label>
                      <select
                        required
                        value={assignData.assignedTo}
                        onChange={e => {
                          const members = getAssignableMembers({
                            isInternal: assignData.isInternal,
                            clientName: assignData.client,
                            projectName: assignData.project,
                          });
                          const selectedMember = members.find(m => m.email === e.target.value);
                          const isExternalUser = selectedMember?.role === "(EXTERNAL)";
                          if (isExternalUser) {
                            setAssignData({ ...assignData, assignedTo: e.target.value, isInternal: false });
                            return;
                          }

                          setAssignData({ ...assignData, assignedTo: e.target.value });
                        }}
                        className="k-input !rounded-2xl !px-5 !py-3 md:!py-4 mt-1"
                        disabled={!assignData.isInternal && !assignData.client}
                        title={assignData.isInternal ? "All team members" : "Select a client first"}
                      >
                        <option value="">Select Team Member</option>
                        {(() => {
                          const members = getAssignableMembers({
                            isInternal: assignData.isInternal,
                            clientName: assignData.client,
                            projectName: assignData.project,
                          });
                          return members.map((m, i) => (
                            <option key={i} value={m.email}>{m.full_name || m.username || m.email} ({m.role})</option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="k-label">Target Date</label>
                      <input
                        required
                        type="date"
                        value={assignData.targetDate}
                        min={minTaskDate}
                        onChange={e => setAssignData({ ...assignData, targetDate: e.target.value })}
                        className="k-input !rounded-2xl !px-5 !py-3 md:!py-4 mt-1"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="k-label">Priority</label>
                      <select
                        value={assignData.priority || 'LOW'}
                        onChange={e => setAssignData({ ...assignData, priority: e.target.value })}
                        className="k-input !rounded-2xl !px-5 !py-3 md:!py-4 mt-1"
                      >
                        {taskPriorityOptions.map((priorityOption) => (
                          <option key={priorityOption.value} value={priorityOption.value}>{priorityOption.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="k-label">Flag (Optional)</label>
                      <select
                        value={assignData.flag || 'none'}
                        onChange={e => setAssignData({ ...assignData, flag: e.target.value })}
                        className="k-input !rounded-2xl !px-5 !py-3 md:!py-4 mt-1"
                      >
                        {taskFlagOptions.map((flagOption) => (
                          <option key={flagOption.value} value={flagOption.value}>{flagOption.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="k-label">Attachment (Optional)</label>
                      <input type="file" accept=".pdf,application/pdf" onChange={e => setAssignData({ ...assignData, file: e.target.files[0] })} className="k-input !rounded-2xl !px-5 !py-3 md:!py-4 mt-1 !text-xs" />
                    </div>
                  </div>

                  <div className="pt-4 pb-2">
                    <button type="submit" className="k-btn-primary w-full !py-4 flex justify-center gap-2 items-center">
                      <Plus size={18} /> Confirm Assignment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {renderHistoryPopup()}
      </main>
    </div>
  );
};

/* ===== DYNAMIC TABLE COMPONENT ===== */
const Table = ({
  title,
  data,
  mode,
  onQuickComplete,
  onReportComplete,
  selectedTasks,
  onToggleSelect,
  onToggleSelectAll,
  onBulkComplete,
  currentUserId,
  onDeleteTask,
  onViewHistory,
  loading,
  activeTimerState = {},
  handleStartTimer,
  handlePauseTimer,
  handleSaveTimeLog,
}) => {
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const isOverviewMode = mode === "overview";
  const [viewLayout, setViewLayout] = useState('table');
  const [sortField, setSortField] = useState(isOverviewMode ? "start_date" : "default");
  const [sortDirection, setSortDirection] = useState("asc");

  const buildDownloadUrl = (fileUrl) => {
    if (!fileUrl) return "";
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

    const configuredBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
    const path = String(fileUrl).startsWith("/") ? String(fileUrl) : `/${String(fileUrl)}`;

    if (configuredBaseUrl) {
      try {
        const origin = new URL(configuredBaseUrl).origin;
        return `${origin}${path}`;
      } catch {
        // Fall through to returning the original value.
      }
    }

    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}${path}`;
    }

    return path;
  };

  const getDownloadFileName = (fileUrl, fallbackName) => {
    if (!fileUrl) return fallbackName;

    const cleanPath = String(fileUrl).split("?")[0];
    const extracted = cleanPath.split("/").pop();
    return extracted || fallbackName;
  };

  const buildExternalOpenUrl = (url) => {
    try {
      const parsed = new URL(url);
      const host = String(parsed.hostname || "").toLowerCase();
      const isCloudinary = host.includes("res.cloudinary.com");

      if (!isCloudinary) return url;

      const currentPath = parsed.pathname || "";
      const hasPdfExt = /\.pdf$/i.test(currentPath);

      let normalizedPath = currentPath;
      if (!hasPdfExt) {
        normalizedPath = `${normalizedPath}.pdf`;
      }

      parsed.pathname = normalizedPath;
      return parsed.toString();
    } catch {
      return url;
    }
  };

  const handleFileDownload = async (fileUrl, fallbackName) => {
    const resolvedUrl = buildDownloadUrl(fileUrl);
    if (!resolvedUrl) return;

    try {
      const resolvedOrigin = (() => {
        try {
          return new URL(resolvedUrl).origin;
        } catch {
          return "";
        }
      })();
      const appOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const isExternalFile = Boolean(resolvedOrigin) && resolvedOrigin !== appOrigin;

      // Cross-origin downloads (e.g. Cloudinary) should be opened directly instead of using
      // XHR/axios blob requests, which can fail with CORS/auth edge cases.
      if (isExternalFile) {
        const externalUrl = buildExternalOpenUrl(resolvedUrl);
        const directLink = document.createElement("a");
        directLink.href = externalUrl;
        directLink.target = "_blank";
        directLink.rel = "noopener noreferrer";
        document.body.appendChild(directLink);
        directLink.click();
        directLink.remove();
        return;
      }

      const normalizedFileUrl = String(fileUrl || "").toLowerCase();
      const isMediaFile = normalizedFileUrl.includes("/media/") || resolvedUrl.toLowerCase().includes("/media/");

      // Media files are publicly served by Django static mapping in this project.
      // Fetching without auth avoids false 401s caused by stale/invalid Authorization headers.
      if (isMediaFile) {
        const publicResponse = await fetch(resolvedUrl, { credentials: "omit" });
        if (publicResponse.ok) {
          const blob = await publicResponse.blob();
          const objectUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = objectUrl;
          link.download = getDownloadFileName(fileUrl, fallbackName);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(objectUrl);
          return;
        }
      }

      // Fallback: use the shared API client so auth headers and interceptors are applied consistently.
      const candidateUrls = [resolvedUrl];
      if (!/^https?:\/\//i.test(fileUrl)) {
        candidateUrls.push(fileUrl);
      }

      let response = null;
      let lastError = null;

      for (const candidateUrl of candidateUrls) {
        try {
          response = await api.get(candidateUrl, { responseType: "blob" });
          break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!response) {
        throw lastError || new Error("Download failed");
      }

      const blob = response.data;
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getDownloadFileName(fileUrl, fallbackName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("File download failed:", error);
      alert("Unable to download file. Please try again.");
    }
  };

  const getTaskSortValue = (task) => {
    const dateCandidates = [
      task?.created_at,
      task?.createdAt,
      task?.assigned_date,
      task?.assigned_on,
      task?.updated_at,
      task?.completion_date,
      task?.target_date,
    ];

    for (const value of dateCandidates) {
      if (!value) continue;
      const parsed = new Date(value).getTime();
      if (!Number.isNaN(parsed)) return parsed;
    }

    const numericId = Number(task?.id);
    if (!Number.isNaN(numericId)) return numericId;

    return 0;
  };

  const getDateSortValue = (task, field) => {
    const raw = task?.[field];
    if (!raw) return Number.POSITIVE_INFINITY;

    const parsed = new Date(raw).getTime();
    if (Number.isNaN(parsed)) return Number.POSITIVE_INFINITY;
    return parsed;
  };

  const getSortValue = (task, field) => {
    if (field === "original_date") {
      const raw = task?.original_date;
      if (!raw) return sortDirection === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      const parsed = new Date(raw).getTime();
      return Number.isNaN(parsed) ? (sortDirection === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : parsed;
    }
    if (field === "last_revision_date") {
      const raw = task?.last_revision_date;
      if (!raw) return sortDirection === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      const parsed = new Date(raw).getTime();
      return Number.isNaN(parsed) ? (sortDirection === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY) : parsed;
    }
    if (field === "revision_count") {
      return task?.revision_count || 0;
    }
    return getDateSortValue(task, field);
  };

  const handleSort = (field) => {
    setSortField((prevField) => {
      if (prevField !== field) {
        setSortDirection("asc");
        return field;
      }
      setSortDirection((prevDirection) => (prevDirection === "asc" ? "desc" : "asc"));
      return prevField;
    });
  };

  const sortedData = useMemo(() => {
    if (sortField !== "default") {
      return [...data].sort((a, b) => {
        const left = getSortValue(a, sortField);
        const right = getSortValue(b, sortField);

        if (left === right) return 0;
        return sortDirection === "asc" ? left - right : right - left;
      });
    }

    return [...data].sort((a, b) => getTaskSortValue(b) - getTaskSortValue(a));
  }, [data, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [mode, title]);

  useEffect(() => {
    if (isOverviewMode) {
      setSortField("start_date");
      setSortDirection("asc");
      return;
    }

    setSortField("default");
    setSortDirection("asc");
  }, [isOverviewMode, mode, title]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedData = sortedData.slice(startIndex, startIndex + PAGE_SIZE);

  const getCompletedRemarkLabel = (task) => {
    const rawRemark = String(task?.remarks || '').trim();
    if (!rawRemark || rawRemark === 'Completed directly via Dashboard') {
      return '-';
    }
    return rawRemark;
  };

  const getAssignedByLabel = (task) => {
    const sourceModule = String(task?.source_module || "").trim();
    if (sourceModule.toUpperCase() === "MCTC") return "MCTC";

    const assignedBy = task?.assigned_by_name || task?.assigned_by_username;
    if (assignedBy) return assignedBy;

    return sourceModule || "N/A";
  };

  const getProjectClientLabel = (task) => {
    const sourceModule = String(task?.source_module || "").trim().toUpperCase();
    const projectLabel = String(task?.project_name || "").trim();
    const clientLabel = String(task?.client_name || task?.client_org_name || task?.client || "").trim();

    const resolvedProjectLabel = projectLabel || (sourceModule === "DDFMS" ? "N/A" : (sourceModule || "N/A"));

    const resolvedClientLabel = clientLabel || "N/A";

    return `${resolvedProjectLabel} / ${resolvedClientLabel}`;
  };

  const getTaskDisplayStatus = (task) => {
    const effectiveStatus = getEffectiveTaskStatus(task);

    if (effectiveStatus === 'delay_completion') return 'Delayed';
    if (effectiveStatus === 'over_due') return 'Overdue';
    if (effectiveStatus === 'on_time') return 'Completed';
    return 'In Progress';
  };

  const getTaskDisplayPriority = (task) => {
    const rawPriority = String(task?.priority || '').trim().toUpperCase();
    if (rawPriority === 'HIGH' || rawPriority === 'MEDIUM' || rawPriority === 'LOW') {
      return rawPriority;
    }
    return 'LOW';
  };

  const deleteDashboardTask = async (task) => {
    if (!task?.id) return;

    const sourceModule = String(task?.source_module || '').trim().toUpperCase();
    const nonDeletableModules = ['DDFMS', 'ACTION_PLAN'];
    if (nonDeletableModules.includes(sourceModule)) return;

    if (Number(task?.assigned_by) !== Number(currentUser?.id)) return;

    const confirmed = window.confirm(`Delete task "${task.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.delete(`tasks/${task.id}/`);

      const tasksRes = await api.get('tasks/');
      const allFetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);

      const userRes = await api.get('me/');
      const { my_active, my_completed, delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
      setMyTasks(my_active);
      setCompletedTasks(my_completed);
      setDelegatedTasks(delegated);
    } catch (err) {
      console.error('Task delete failed:', err.response?.data || err);
      const msg = err.response?.data ? JSON.stringify(err.response.data) : (err.message || 'Unknown error');
      alert(`Failed to delete task: ${msg}`);
    }
  };

  return (
    <Band tone="grey" title={title}>
      <div className="k-card !rounded-2xl overflow-hidden hover:!transform-none">
        <div className="px-6 md:px-8 py-4 md:py-5 border-b flex flex-wrap justify-between items-center gap-4" style={{ background: 'var(--k-band-grey)', borderColor: 'var(--k-grey-200)' }}>
          <div className="flex items-center gap-3 k-eyebrow !text-xs">
            {title}
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black bg-[var(--k-blue-tint)] text-[var(--k-blue)]">
              {sortedData.length} {sortedData.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            {/* View Switcher: Grid vs Table */}
            <div className="flex items-center gap-1 bg-[var(--k-white)] border border-[var(--k-grey-200)] rounded-full p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all ${viewLayout === 'grid' ? 'bg-[var(--k-blue)] text-white shadow-sm' : 'text-[var(--k-grey-500)] hover:text-[var(--k-ink)]'}`}
              >
                <LayoutGrid size={14} /> Grid View
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('table')}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all ${viewLayout === 'table' ? 'bg-[var(--k-blue)] text-white shadow-sm' : 'text-[var(--k-grey-500)] hover:text-[var(--k-ink)]'}`}
              >
                <List size={14} /> Table
              </button>
            </div>

            {mode === 'overview' && selectedTasks?.length > 0 && (
              <button
                onClick={onBulkComplete}
                className="k-btn-primary !rounded-full !py-2 !px-4 text-[10px]"
              >
                Submit Selected ({selectedTasks.length})
              </button>
            )}

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--k-grey-500)' }}>
                {sortedData.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + PAGE_SIZE, sortedData.length)} / {sortedData.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="k-btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="k-btn-icon disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {viewLayout === 'grid' ? (
          <div className="p-6 md:p-8 bg-[var(--k-white)]">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={`grid-skel-${idx}`} className="k-skeleton h-[260px] rounded-2xl" />
                ))}
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-[var(--k-band-grey)] flex items-center justify-center text-[var(--k-grey-500)] mb-2">
                  <ClipboardList size={28} />
                </div>
                <h3 className="text-base font-bold text-[var(--k-ink)]">No tasks found</h3>
                <p className="text-xs text-[var(--k-grey-500)] max-w-sm">There are currently no tasks listed under this section.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedData.map((t, rowIndex) => {
                  const isActionPlanTask = String(t?.source_module || '').trim().toUpperCase() === 'ACTION_PLAN';
                  const sourceModule = String(t?.source_module || '').trim().toUpperCase();
                  const nonDeletableModules = ['DDFMS', 'ACTION_PLAN'];
                  const deletable = Boolean(onDeleteTask)
                    && currentUserId
                    && !nonDeletableModules.includes(sourceModule)
                    && Number(t?.assigned_by) === Number(currentUserId);
                  const isSelected = selectedTasks?.includes(t.id) || false;

                  const isOverdue = getTaskDisplayStatus(t) === "Overdue";
                  const isDelayed = getTaskDisplayStatus(t) === "Delayed";
                  const isCompleted = getTaskDisplayStatus(t) === "Completed";
                  const isHighPriority = getTaskDisplayPriority(t) === "High";
                  
                  const accentColor = isCompleted ? "var(--k-blue)" : isOverdue ? "#212121" : isDelayed ? "#f59e0b" : isHighPriority ? "#212121" : "var(--k-blue)";

                  return (
                    <motion.div
                      key={`grid-card-${t.id}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: rowIndex * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className={`k-card group p-5 md:p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 ${isSelected || isActionPlanTask ? '!border-[var(--k-blue)] !bg-[var(--k-blue-tint)]/40 shadow-md' : 'hover:border-[var(--k-blue)]/50 hover:shadow-xl'}`}
                      style={{ background: isSelected || isActionPlanTask ? 'var(--k-blue-tint)' : 'var(--k-white)' }}
                    >
                      {/* Left Edge Status/Priority Accent Bar */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-2.5 transition-all duration-300 group-hover:w-3.5"
                        style={{ background: accentColor }}
                      />
                      {/* Top Bar: ID + Revision + Priority/Status */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-[var(--k-ink)] text-[var(--k-white)] shadow-xs">
                              #{t.task_id}
                            </span>
                            {t.source_module === "MCTC" && t.revision_count > 0 && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onViewHistory?.(t); }}
                                className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[var(--k-blue)] text-white hover:bg-[var(--k-blue-dark)] transition-colors shadow-xs"
                                title="Click to view movement timeline"
                              >
                                R{t.revision_count}
                              </button>
                            )}
                            {t.source_module && t.source_module !== 'MCTC' && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[var(--k-band-grey)] text-[var(--k-grey-700)]">
                                {t.source_module}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <PriorityBadge priority={getTaskDisplayPriority(t)} />
                            <StatusBadge status={getTaskDisplayStatus(t)} />
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-[var(--k-ink)] line-clamp-2 mt-2 mb-3 group-hover:text-[var(--k-blue)] transition-colors leading-snug">
                          {t.title}
                        </h3>

                        {/* Project / Client info */}
                        {mode !== "assigned" && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--k-grey-700)] mb-4 bg-[var(--k-band-grey)]/50 px-3 py-2 rounded-xl">
                            <Building2 size={14} className="text-[var(--k-blue)] shrink-0" />
                            <span className="truncate">{getProjectClientLabel(t)}</span>
                          </div>
                        )}
                        {mode === "assigned" && (
                          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--k-grey-700)] mb-4 bg-[var(--k-band-grey)]/50 px-3 py-2 rounded-xl">
                            <User size={14} className="text-[var(--k-blue)] shrink-0" />
                            <span className="truncate">Assigned to: <strong className="text-[var(--k-ink)]">{t.assigned_to_name || '—'}</strong></span>
                          </div>
                        )}

                        {/* Dates Grid */}
                        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[var(--k-band-grey)]/70 text-[11px] mb-4 border border-[var(--k-grey-200)]/60">
                          {mode === "overview" && (
                            <>
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--k-grey-500)] block">Start Date</span>
                                <span className="font-bold text-[var(--k-ink)] mt-0.5 flex items-center gap-1">
                                  <Clock size={12} className="text-[var(--k-grey-500)]" />
                                  {t.start_date ? formatDateDDMMYYYY(t.start_date, "—") : "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--k-blue)] block">Target Date</span>
                                <span className="font-black text-[var(--k-blue)] mt-0.5 flex items-center gap-1">
                                  <Calendar size={12} className="text-[var(--k-blue)]" />
                                  {formatDateDDMMYYYY(t.target_date, "—")}
                                </span>
                              </div>
                            </>
                          )}
                          {mode === "completed" && (
                            <>
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--k-grey-500)] block">Completed On</span>
                                <span className="font-bold text-[var(--k-blue)] mt-0.5 flex items-center gap-1">
                                  <CheckCircle size={12} className="text-[var(--k-blue)]" />
                                  {formatDateDDMMYYYY(t.completion_date, "—")}
                                </span>
                              </div>
                              {t.completion_file && (
                                <div className="flex items-center justify-end">
                                  <button
                                    onClick={() => handleFileDownload(t.completion_file, `${t.task_id || "task"}-completion.pdf`)}
                                    className="k-btn-ghost !py-1 !px-2.5 !text-[10px] !rounded-lg flex items-center gap-1 text-[var(--k-blue)]"
                                    title="Download completion PDF"
                                  >
                                    <Download size={12} /> PDF
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                          {mode === "assigned" && (
                            <>
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--k-grey-500)] block">Assigned Date</span>
                                <span className="font-bold text-[var(--k-ink)] mt-0.5 flex items-center gap-1">
                                  <Clock size={12} className="text-[var(--k-grey-500)]" />
                                  {t.start_date ? formatDateDDMMYYYY(t.start_date, "—") : "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--k-blue)] block">Target Date</span>
                                <span className="font-black text-[var(--k-blue)] mt-0.5 flex items-center gap-1">
                                  <Calendar size={12} className="text-[var(--k-blue)]" />
                                  {formatDateDDMMYYYY(t.target_date, "—")}
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Assigned By Info & Remarks */}
                        {mode !== "assigned" && (
                          <div className="flex items-center justify-between text-[11px] text-[var(--k-grey-500)] mb-4 px-1">
                            <span>By: <strong className="text-[var(--k-ink)]">{getAssignedByLabel(t)}</strong></span>
                            {t.assigned_file && (
                              <button
                                onClick={() => handleFileDownload(t.assigned_file, `${t.task_id || "task"}-assigned.pdf`)}
                                className="inline-flex items-center gap-1 text-[var(--k-blue)] font-bold hover:underline"
                                title="Download assigned PDF"
                              >
                                <Download size={12} /> Assigned PDF
                              </button>
                            )}
                          </div>
                        )}
                        {mode === "completed" && getCompletedRemarkLabel(t) && getCompletedRemarkLabel(t) !== "—" && (
                          <div className="bg-[var(--k-band-grey)]/40 p-2.5 rounded-xl text-xs text-[var(--k-grey-700)] italic mb-4 border-l-2 border-[var(--k-blue)]">
                            "{getCompletedRemarkLabel(t)}"
                          </div>
                        )}

                        {/* Task Time Tracker Row */}
                        {mode === "overview" && (
                          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--k-band-grey)]/60 border border-[var(--k-grey-200)]/70 mb-3 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-[var(--k-ink)]">
                              <Clock size={13} className="text-[var(--k-blue)]" />
                              <span>
                                {activeTimerState.taskId === t.id
                                  ? formatSeconds(activeTimerState.seconds)
                                  : (t.actual_hours ? `${t.actual_hours}h logged` : '0h logged')}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {activeTimerState.taskId === t.id && activeTimerState.isRunning ? (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handlePauseTimer(t); }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition-all flex items-center gap-1 cursor-pointer"
                                    title="Pause timer"
                                  >
                                    <Pause size={11} /> Pause
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleSaveTimeLog(t); }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[var(--k-blue)] text-white hover:bg-[var(--k-blue-dark)] transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                    title="Save time log"
                                  >
                                    <Save size={11} /> Save Log
                                  </button>
                                </>
                              ) : activeTimerState.taskId === t.id && !activeTimerState.isRunning ? (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleStartTimer(t); }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                                    title="Resume timer"
                                  >
                                    <Play size={11} /> Resume
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleSaveTimeLog(t); }}
                                    className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[var(--k-blue)] text-white hover:bg-[var(--k-blue-dark)] transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                    title="Save time log"
                                  >
                                    <Save size={11} /> Save Log
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStartTimer(t); }}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[var(--k-blue-tint)] text-[var(--k-blue)] border border-[var(--k-blue)]/30 hover:bg-[var(--k-blue)] hover:text-white transition-all flex items-center gap-1 font-bold cursor-pointer"
                                  title="Start timer"
                                >
                                  <Play size={11} /> Start Timer
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {mode === "completed" && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-200/60 mb-3 text-xs">
                            <span className="font-semibold text-emerald-800 flex items-center gap-1.5 text-[11px]">
                              <Clock size={12} className="text-emerald-600" />
                              Total Logged: <strong>{t.actual_hours ? `${t.actual_hours} hrs` : '0 hrs'}</strong>
                            </span>
                            {t.estimated_hours && (
                              <span className="text-[10px] font-medium text-emerald-700">
                                (Est: {t.estimated_hours}h)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Footer Actions */}
                      <div className="border-t border-[var(--k-grey-200)] pt-3 mt-2 flex items-center justify-between gap-2">
                        {mode === "overview" ? (
                          <>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--k-grey-700)] hover:text-[var(--k-blue)] select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onToggleSelect(t.id)}
                                className="cursor-pointer scale-110 rounded accent-[var(--k-blue)]"
                              />
                              Select
                            </label>

                            <div className="flex items-center gap-2">
                              {deletable && (
                                <button
                                  onClick={() => onDeleteTask?.(t)}
                                  className="k-btn-icon !w-8 !h-8 text-[var(--k-grey-500)] hover:text-red-600 hover:bg-red-50"
                                  title="Delete task"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => onReportComplete(t)}
                                className="k-btn-primary !py-2 !px-4 !text-xs !rounded-full flex items-center gap-1.5 shadow-md hover:shadow-lg hover:scale-105 transition-all"
                              >
                                <CheckCircle size={14} /> Complete
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-bold text-[var(--k-grey-500)] uppercase tracking-wider">
                              {mode === 'completed' ? 'Status: Done' : 'Status: Delegated'}
                            </span>
                            {deletable && (
                              <button
                                onClick={() => onDeleteTask?.(t)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                                title="Delete task"
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto k-scroll">
            <table className="k-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task</th>
                {mode !== "assigned" && <th>Project / Client</th>}
                {mode === "assigned" && <th>Assigned To</th>}
                {mode !== "assigned" && <th>Assigned By</th>}
                {mode === "overview" && <th>Start Date</th>}
                {mode === "overview" && (
                  <th>
                    <button
                      type="button"
                      onClick={() => handleSort("target_date")}
                      className="inline-flex items-center gap-1 transition-colors"
                      title="Sort by target date"
                    >
                      <span>Target Date</span>
                      <span className="text-[11px] leading-none">
                        {sortField === "target_date" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  </th>
                )}
                {mode === "completed" && <th>Complete Date</th>}

                {/* MCTC Columns */}
                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("original_date")}
                    className="inline-flex items-center gap-1 transition-colors"
                    title="Sort by original date"
                  >
                    <span>Orig. Date</span>
                    <span className="text-[11px] leading-none">
                      {sortField === "original_date" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
                <th className="text-center">
                  <button
                    type="button"
                    onClick={() => handleSort("revision_count")}
                    className="inline-flex items-center gap-1 transition-colors"
                    title="Sort by revision count"
                  >
                    <span>Revs</span>
                    <span className="text-[11px] leading-none">
                      {sortField === "revision_count" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("last_revision_date")}
                    className="inline-flex items-center gap-1 transition-colors"
                    title="Sort by last revised date"
                  >
                    <span>Last Revised</span>
                    <span className="text-[11px] leading-none">
                      {sortField === "last_revision_date" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </button>
                </th>

                <th className="text-center">Priority</th>
                <th className="text-center">Status</th>
                {(mode === "overview" || mode === "assigned") && <th className="text-center">Assigned PDF</th>}
                {mode === "completed" && <th className="text-center">Remarks</th>}
                {(mode === "completed" || mode === "assigned") && <th className="text-center">Complete PDF</th>}
                {mode === "overview" && <th className="text-center">Select</th>}
                {mode === "overview" && <th className="text-center">Complete</th>}
                {mode !== "completed" && <th className="text-center">Delete</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={`skeleton-row-${idx}`}>
                    <td><div className="k-skeleton h-4 w-6 mx-auto" /></td>
                    <td><div className="k-skeleton h-4 w-24" /></td>
                    <td><div className="k-skeleton h-4 w-32" /></td>
                    <td><div className="k-skeleton h-4 w-48" /></td>
                    <td><div className="k-skeleton h-4 w-16 mx-auto" /></td>
                    <td><div className="k-skeleton h-4 w-12 mx-auto" /></td>
                    <td><div className="k-skeleton h-4 w-12 mx-auto" /></td>
                    {(mode === "overview" || mode === "assigned") && <td><div className="k-skeleton h-4 w-16 mx-auto" /></td>}
                    {mode === "completed" && <td><div className="k-skeleton h-4 w-24 mx-auto" /></td>}
                    {(mode === "completed" || mode === "assigned") && <td><div className="k-skeleton h-4 w-16 mx-auto" /></td>}
                    {mode === "overview" && <td><div className="k-skeleton h-4 w-8 mx-auto" /></td>}
                    {mode === "overview" && <td><div className="k-skeleton h-4 w-12 mx-auto" /></td>}
                    {mode !== "completed" && <td><div className="k-skeleton h-4 w-8 mx-auto" /></td>}
                  </tr>
                ))
              ) : paginatedData.map((t, rowIndex) => {
                const isActionPlanTask = String(t?.source_module || '').trim().toUpperCase() === 'ACTION_PLAN';
                const sourceModule = String(t?.source_module || '').trim().toUpperCase();
                const nonDeletableModules = ['DDFMS', 'ACTION_PLAN'];
                const deletable = Boolean(onDeleteTask)
                  && currentUserId
                  && !nonDeletableModules.includes(sourceModule)
                  && Number(t?.assigned_by) === Number(currentUserId);
                const rowStyle = selectedTasks?.includes(t.id) || isActionPlanTask
                  ? { background: 'var(--k-blue-tint)' }
                  : undefined;

                return (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rowIndex * 0.05, duration: 0.4 }}
                    className="transition-colors"
                    style={rowStyle}
                  >
                    <td className="font-semibold text-[11px]" style={{ color: 'var(--k-grey-500)' }}>{t.task_id}</td>
                    <td className="font-semibold text-xs" style={{ color: 'var(--k-ink)' }}>{t.title}</td>

                    {mode !== "assigned" && <td className="text-[11px] font-medium italic" style={{ color: 'var(--k-grey-500)' }}>{getProjectClientLabel(t)}</td>}
                    {mode === "assigned" && <td className="text-xs font-medium">{t.assigned_to_name}</td>}
                    {mode !== "assigned" && (
                      <td className="text-xs font-semibold" style={{ color: 'var(--k-grey-700)' }}>
                        {getAssignedByLabel(t)}
                      </td>
                    )}
                    {mode === "overview" && <td className="text-[11px] font-semibold whitespace-nowrap tabular-nums" style={{ color: 'var(--k-blue)' }}>{t.start_date ? formatDateDDMMYYYY(t.start_date, "—") : "—"}</td>}
                    {mode === "overview" && <td className="text-[11px] font-semibold whitespace-nowrap tabular-nums" style={{ color: 'var(--k-blue-light)' }}>{formatDateDDMMYYYY(t.target_date, "—")}</td>}
                    {mode === "completed" && <td className="text-[11px] font-semibold whitespace-nowrap tabular-nums" style={{ color: 'var(--k-blue)' }}>{formatDateDDMMYYYY(t.completion_date, "—")}</td>}

                    {/* MCTC Columns */}
                    <td className="text-[11px] font-semibold whitespace-nowrap tabular-nums" style={{ color: 'var(--k-grey-500)' }}>
                      {t.source_module === "MCTC" && t.original_date ? formatDateDDMMYYYY(t.original_date, "—") : "—"}
                    </td>
                    <td className="text-center">
                      {t.source_module === "MCTC" && t.revision_count > 0 ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewHistory?.(t);
                          }}
                          className="k-pill-ink cursor-pointer"
                          title="Click to view movement timeline"
                        >
                          R{t.revision_count}
                        </button>
                      ) : t.source_module === "MCTC" ? (
                        <span className="text-xs" style={{ color: 'var(--k-grey-500)' }}>-</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-[11px] font-semibold whitespace-nowrap tabular-nums" style={{ color: 'var(--k-grey-500)' }}>
                      {t.source_module === "MCTC" && t.last_revision_date ? formatDateDDMMYYYY(t.last_revision_date.slice(0, 10), "—") : "—"}
                    </td>
                    <td className="text-center"><PriorityBadge priority={getTaskDisplayPriority(t)} /></td>
                    <td className="text-center"><StatusBadge status={getTaskDisplayStatus(t)} /></td>
                    {(mode === "overview" || mode === "assigned") && <td className="text-center">{t.assigned_file ? <Download size={16} className="mx-auto cursor-pointer hover:scale-110" style={{ color: 'var(--k-blue)' }} onClick={() => handleFileDownload(t.assigned_file, `${t.task_id || "task"}-assigned.pdf`)} title="Download assigned PDF" /> : "—"}</td>}
                    {mode === "completed" && <td className="text-[11px] font-medium max-w-[200px] truncate" style={{ color: 'var(--k-grey-700)' }} title={getCompletedRemarkLabel(t)}>{getCompletedRemarkLabel(t)}</td>}
                    {(mode === "completed" || mode === "assigned") && <td className="text-center">{t.completion_file ? <Download size={16} className="mx-auto cursor-pointer hover:scale-110" style={{ color: 'var(--k-blue)' }} onClick={() => handleFileDownload(t.completion_file, `${t.task_id || "task"}-completion.pdf`)} title="Download completion PDF" /> : "—"}</td>}
                    {mode === "overview" && (
                      <>
                        <td className="text-center">
                          <input
                            type="checkbox"
                            checked={selectedTasks?.includes(t.id) || false}
                            onChange={() => onToggleSelect(t.id)}
                            className="cursor-pointer scale-110"
                          />
                        </td>
                        <td className="text-center">
                          <button onClick={() => onReportComplete(t)} className="k-btn-primary !py-1.5 !px-3 text-[10px]">
                            Complete
                          </button>
                        </td>
                      </>
                    )}
                    {mode !== "completed" && (
                      <td className="text-center">
                        {deletable ? (
                          <button
                            onClick={() => onDeleteTask?.(t)}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:opacity-90"
                            style={{ background: 'var(--k-ink)', color: 'var(--k-white)' }}
                            title="Delete task"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        ) : (
                          <span style={{ color: 'var(--k-grey-300)' }}>—</span>
                        )}
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

      </div>
    </Band>
  );
};

/* ===== HELPER COMPONENTS (ORIGINAL STYLE) ===== */
const Stat = ({ title, value, icon, color }) => (
  <div className="bg-white border rounded-xl md:rounded-2xl shadow-sm px-4 py-2.5 flex flex-col transition-all hover:translate-y-[-2px] hover:shadow-lg" style={{ borderColor: 'var(--k-grey-200)', borderLeft: `4px solid ${color}` }}>
    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--k-grey-500)' }}>{title}</p>
    <div className="flex justify-between items-end mt-1">
      <h2 className="text-2xl md:text-3xl font-black" style={{ color: 'var(--k-ink)' }}>{value}</h2>
      <div className="opacity-50" style={{ color: 'var(--k-grey-200)' }}>{React.cloneElement(icon, { size: 16 })}</div>
    </div>
  </div>
);

const MidBtn = ({ label, icon, primary, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-7 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${primary ? "k-btn-primary shadow-lg" : "k-btn-ghost"}`}>
    {icon} {label}
  </button>
);

const StatusBadge = ({ status }) => {
  const map = {
    "On Time": "bg-[var(--k-blue-tint)] text-[var(--k-blue)]",
    "In Progress": "bg-[var(--k-blue-tint)] text-[var(--k-blue)]",
    Delayed: "bg-[var(--k-blue-tint)] text-[var(--k-blue-light)]",
    Overdue: "bg-[var(--k-grey-100)] text-[var(--k-ink)]",
    Completed: "bg-[var(--k-blue-tint)] text-[var(--k-blue)]",
    Backlog: "bg-[var(--k-grey-100)] text-[var(--k-grey-600)]",
    Planning: "bg-[var(--k-blue-tint)] text-[var(--k-blue)]",
    Review: "bg-[var(--k-amber-tint)] text-[var(--k-amber)]",
    Testing: "bg-[var(--k-purple-tint)] text-[var(--k-purple)]",
    Blocked: "bg-[var(--k-red-tint)] text-[var(--k-red)]",
    Cancelled: "bg-[var(--k-grey-100)] text-[var(--k-grey-500)]",
  };
  return <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${map[status] || "bg-[var(--k-grey-100)]"}`}>{status}</span>;
};

const PriorityBadge = ({ priority }) => {
  const map = {
    HIGH: "bg-[var(--k-grey-100)] text-[var(--k-ink)]",
    MEDIUM: "bg-[var(--k-blue-tint)] text-[var(--k-blue-light)]",
    LOW: "bg-[var(--k-blue-tint)] text-[var(--k-blue)]",
  };
  return <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${map[priority] || map.LOW}`}>{priority || 'LOW'}</span>;
};

const AutocompleteInput = ({ value, onChange, options, placeholder, disabled, className }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (value) {
      const lower = value.toLowerCase();
      setSuggestions(options.filter(opt => opt.toLowerCase().includes(lower)));
    } else {
      setSuggestions(options);
    }
  }, [value, options]);

  return (
    <div className="relative w-full">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)} // Delay for click
        placeholder={placeholder}
        disabled={disabled}
        className={className}
      />
      {show && suggestions.length > 0 && !disabled && (
        <ul className="absolute z-50 w-full bg-white border rounded-lg shadow-xl max-h-40 overflow-y-auto mt-1 custom-scrollbar animate-in fade-in zoom-in-95 duration-100" style={{ borderColor: 'var(--k-grey-200)' }}>
          {suggestions.map((opt, i) => (
            <li
              key={i}
              onMouseDown={() => { onChange(opt); setShow(false); }} // onMouseDown fires before onBlur
              className="px-3 py-2 text-[10px] font-bold cursor-pointer transition-colors" style={{ color: 'var(--k-grey-700)' }} onMouseEnter={e => { e.target.style.background = 'var(--k-blue-tint)'; e.target.style.color = 'var(--k-blue)'; }} onMouseLeave={e => { e.target.style.background = ''; e.target.style.color = 'var(--k-grey-700)'; }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EmployeeDashboard;