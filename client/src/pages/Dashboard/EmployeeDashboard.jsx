import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../api";
import Sidebar from "../../components/Sidebar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Calendar, Search, Filter, ClipboardList, Plus, CheckCircle,
  LayoutGrid, Clock, AlertCircle, TrendingUp, User, Download,
  X, Upload, SearchCode, SendHorizontal, FileCheck, BarChart3, FileText, ArrowLeft, Trash2,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { formatDateDDMMYYYY } from "../../utils/dateFormat";

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

  const isInternalRole = (role) => ["ADMIN", "HQEPL", "MLS", "SGM", "EMPLOYEE"].includes(String(role || "").toUpperCase());

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
    if (sourceModule && sourceModule !== 'DIRECT') return false;

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
      return role === 'ADMIN' || role === 'HQEPL' || role === 'MLS' || role === 'SGM' || role === 'EMPLOYEE';
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

  const getHqeplDirectoryMembers = () => {
    const directoryMembers = dedupeMembersByIdentity(assignableDirectory.internal);
    if (!directoryMembers.length) {
      const currentMember = buildMemberFromUser(currentUser);
      return currentMember && String(currentMember.role || '').toUpperCase() === 'HQEPL'
        ? [currentMember]
        : [];
    }

    const hqeplMembers = directoryMembers.filter(
      (member) => String(member.role || '').toUpperCase() === 'HQEPL'
    );

    const currentMember = buildMemberFromUser(currentUser);
    if (currentMember && String(currentMember.role || '').toUpperCase() === 'HQEPL') {
      hqeplMembers.push(currentMember);
    }

    return dedupeMembersByIdentity(hqeplMembers);
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

    // Keep HQEPL visible for all assigners in client/project assignment mode.
    getHqeplDirectoryMembers().forEach((hqeplMember) => {
      if (!hqeplMember) return;
      const key = hqeplMember.email || `id:${hqeplMember.id}`;
      if (!key) return;
      membersMap.set(key, {
        ...hqeplMember,
        role: normalizeRoleLabel(hqeplMember.role),
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

    if (viewerRole === "HQEPL") {
      return getAllKnownUsers();
    }

    if (isInternal) {
      // CLIENT/EXTERNAL/SENIOR internal-mode should target externals of their client.
      if (viewerRole === "CLIENT" || viewerRole === "EXTERNAL" || viewerRole === "SENIOR") {
        const fallbackClientName = Object.keys(clientProjectMap)[0] || "";
        const scopedClientName = clientName || fallbackClientName;
        return getClientScopedExternalMembers(scopedClientName);
      }

      // HQEPL/SGM/EMPLOYEE internal-mode should target all company internals.
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
    { name: "On Time", value: 40, color: "#22c55e" },
    { name: "Delayed", value: 20, color: "#facc15" },
    { name: "Overdue", value: 10, color: "#ef4444" },
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
      { name: "On Time", value: 0, color: "#22c55e" },
      { name: "In Progress", value: 0, color: "#3b82f6" },
      { name: "Delayed", value: 0, color: "#facc15" },
      { name: "Overdue", value: 0, color: "#ef4444" },
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
          { name: "On Time", value: 0, color: "#22c55e" },
          { name: "In Progress", value: 0, color: "#3b82f6" },
          { name: "Delayed", value: 0, color: "#facc15" },
          { name: "Overdue", value: 0, color: "#ef4444" },
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
              { name: "On Time", value: onTimeCount, color: "#22c55e" },
              { name: "Late", value: my_completed.length - onTimeCount, color: "#ef4444" },
              { name: "In Progress", value: my_active.length, color: "#3b82f6" },
              {
                name: "Overdue", value: my_active.filter(t => {
                  if (!t.target_date) return false;
                  const targetDate = new Date(t.target_date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  targetDate.setHours(0, 0, 0, 0);
                  return targetDate < today;
                }).length, color: "#f59e0b"
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

  const hasAppliedDateFilter = Boolean(startDate || endDate);

  const appliedDateFilterLabel = useMemo(() => {
    if (!hasAppliedDateFilter) return "";
    if (startDate && endDate) {
      return `${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`;
    }
    if (startDate) {
      return `From ${formatDisplayDate(startDate)}`;
    }
    return `Until ${formatDisplayDate(endDate)}`;
  }, [hasAppliedDateFilter, startDate, endDate]);

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
    const start = parseYMDToDate(startDate);
    const end = parseYMDToDate(endDate);
    if (!start && !end) return true;

    const taskDate = getTaskDate(task);
    if (!taskDate) return false;

    if (start && taskDate < start) return false;
    if (end && taskDate > end) return false;
    return true;
  };

  const filterTasksByDateRange = (tasks) => tasks.filter(isTaskInDateRange);

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
    setShowDateFilterDropdown(false);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setDraftStartDate("");
    setDraftEndDate("");
    setIncludeAllTasks(true);
    setSelectedClients(Object.keys(clientProjectMap));
    setSearchQuery("");
    setStatusFilter("All");
    setShowDateFilterDropdown(false);
    setShowStatusFilterDropdown(false);
  };

  const isDelayedTask = (task) => {
    return getEffectiveTaskStatus(task) === "delay_completion";
  };

  const isOverdueTask = (task) => {
    return getEffectiveTaskStatus(task) === "over_due";
  };

  const isInProgressTask = (task) => {
    return getEffectiveTaskStatus(task) === "in_progress";
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
        { name: "On Time", value: onTimeCount, color: "#22c55e" },
        { name: "Delayed", value: delayedCount, color: "#facc15" },
        { name: "Overdue", value: overdueCount, color: "#ef4444" },
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

        await api.post("tasks/", formData, { headers: { "Content-Type": "multipart/form-data" } });
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
          return api.post("tasks/", formData, { headers: { "Content-Type": "multipart/form-data" } });
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
          // Use fuzzy matching for client names
          const bestMatch = findBestClientMatch(value);
          if (bestMatch) {
            updatedTask.client = bestMatch;
            updatedTask.project = ""; // Reset dependent field
          } else {
            // Client not found - mark as invalid but keep pasted value for visibility
            updatedTask.client = `[INVALID] ${value}`;
            skippedRows.push(`Row ${idx + 1}: "${value}" - No matching client (0 close matches)`);
          }
        } else if (columnType === 'project') {
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
            const isInternal = rawClient.toLowerCase() === 'internal';

            const normalizedClient = isInternal
              ? ''
              : (findBestClientMatch(rawClient) || rawClient);

            const projectMatch = (!isInternal && normalizedClient && row.project)
              ? findBestProjectMatch(String(row.project).trim(), normalizedClient)
              : null;

            const normalizedProject = projectMatch?.name || String(row.project || '').trim();

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

  return (
    <div className="h-screen w-screen bg-slate-50 relative flex overflow-hidden">
      <Sidebar />
      {taskToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 max-w-md w-full shadow-2xl border border-slate-100">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">Delete Task?</h3>
              <p className="text-sm font-medium text-slate-500">
                Are you sure you want to delete {taskToDelete?.title ? `"${taskToDelete.title}"` : 'this task'}? This action cannot be undone.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full pt-4">
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeTaskDelete}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 overflow-y-auto pb-20">

        {/* ===== HEADER ===== */}
        <div className="max-w-7xl mx-auto mt-5 bg-slate-900 rounded-2xl px-4 md:px-6 py-4 flex flex-col md:grid md:grid-cols-3 items-center gap-4 md:gap-0 text-white shadow-xl">
          {/* Back + Repeatable Buttons (Left) */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
            <button
              onClick={() => navigate("/sgm")}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors w-fit"
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline text-xs font-semibold">Back</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/employeedashboard/repeatable-task")}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-slate-900 text-[11px] font-black uppercase tracking-wide hover:bg-slate-100 transition-all"
            >
              <Plus size={14} /> Repeatable Task
            </button>
          </div>

          {/* Username in the exact center (Middle) */}
          <h1 className="text-xl font-extrabold text-[#F58A4B] text-center">
            {userName}'s Dashboard
          </h1>

          {/* Date filter dropdown on the right (Right) */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 relative w-full md:w-auto" ref={dateFilterRef}>
            {hasAppliedDateFilter && (
              <span
                className="max-w-[220px] truncate px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-300"
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
              className="px-4 py-2 rounded-lg bg-white text-slate-900 text-xs font-bold border border-slate-300 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Calendar size={14} /> Date Filter
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 hover:bg-slate-200 transition-all"
            >
              Reset
            </button>

            {showDateFilterDropdown && (
              <div className="absolute right-0 md:right-0 mt-2 top-full w-[300px] md:w-[460px] bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={draftStartDate}
                      onChange={(e) => setDraftStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-slate-900 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      title="Start date"
                    />
                    <p className="mt-1 text-[10px] font-bold text-slate-400">{formatDisplayDate(draftStartDate)}</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">End Date</label>
                    <input
                      type="date"
                      value={draftEndDate}
                      onChange={(e) => setDraftEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs text-slate-900 rounded-lg bg-white border border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      title="End date"
                    />
                    <p className="mt-1 text-[10px] font-bold text-slate-400">{formatDisplayDate(draftEndDate)}</p>
                  </div>
                </div>

                <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleApplyDateFilter}
                    className="px-5 py-2 rounded-lg text-[10px] font-black uppercase bg-slate-900 text-white hover:bg-black transition-all"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== KPI & CHARTS GRID (FULL CARDS KEPT) ===== */}
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 mt-6 px-6">
          <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center">
            <h3 className="font-black text-slate-900 uppercase text-xs mb-3 tracking-widest text-left">Client Filter</h3>
            {loading ? <p className="text-xs text-slate-400">Loading...</p> : (
              <>
                <label className="flex items-center gap-2 text-[12px] text-slate-700 mb-2 cursor-pointer font-semibold">
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
                    className="accent-slate-900"
                  /> All Tasks
                </label>
                {Object.keys(clientProjectMap).map((client, i) => (
                  <label key={i} className="flex items-center gap-2 text-[12px] text-slate-600 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAllTasks || selectedClients.includes(client)}
                      onChange={() => toggleClientSelection(client)}
                      className="accent-slate-900"
                    /> {client}
                  </label>
                ))}
              </>
            )}
          </div>
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-black text-slate-900 uppercase text-xs">
                Task Distribution
              </h2>
              <div className="p-2 bg-slate-50 rounded-lg text-[#F58A4B]">
                <BarChart3 size={16} />
              </div>
            </div>

            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={filteredDashboardStats.chart_data}
                    dataKey="value"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {filteredDashboardStats.chart_data.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ zIndex: 60 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* OTC CENTER OVERLAY */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OTC</span>
                <span className="text-3xl font-black text-slate-900">{filteredDashboardStats.otc_score}</span>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-3 md:gap-4">
            <Stat title="Total Task" value={filteredDashboardStats.total_tasks} color="#6366f1" icon={<LayoutGrid size={18} />} />
            <Stat title="On Time Completion" value={filteredDashboardStats.on_time_count} color="#22c55e" icon={<CheckCircle size={18} />} />
            <Stat title="Overdue" value={filteredDashboardStats.overdue_count} color="#ef4444" icon={<AlertCircle size={18} />} />
            <Stat title="In Progress" value={filteredDashboardStats.in_progress_count} color="#3b82f6" icon={<TrendingUp size={18} />} />
            <Stat title="Delayed" value={filteredDashboardStats.delayed_count} color="#facc15" icon={<Clock size={18} />} />
            <Stat title="ATS SCORE" value={filteredDashboardStats.ats_score} color="#a855f7" icon={<TrendingUp size={18} />} />
          </div>
        </div>

        {/* ===== ACTION BAR (FMS instead of Complete) ===== */}
        <div className="flex justify-center mt-8 gap-4 md:gap-12 items-center flex-wrap px-4">
          <div className="relative" ref={statusFilterRef}>
            <MidBtn
              label={statusFilter === "All" ? "FILTER" : statusFilter.toUpperCase()}
              icon={<Filter size={14} />}
              onClick={() => setShowStatusFilterDropdown(!showStatusFilterDropdown)}
              primary={statusFilter !== "All"}
            />
            {showStatusFilterDropdown && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="px-4 py-2 border-b border-slate-50 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter By Status</p>
                </div>
                {["All", "In Progress", "Overdue", "Today's Task"].map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      setStatusFilter(option);
                      setShowStatusFilterDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${statusFilter === option ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                  >
                    {option}
                    {statusFilter === option && <CheckCircle size={12} className="text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowSmartPasteModal(true)}
            className="flex items-center gap-2 px-7 py-3 rounded-full text-[10px] font-bold uppercase bg-emerald-100 border border-emerald-300 text-emerald-700 shadow-sm hover:bg-emerald-200 transition-all active:scale-95"
          >
            <Upload size={14} /> SMART PASTE
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-7 py-3 rounded-full text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <ClipboardList size={14} /> BULK ASSIGN
          </button>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-7 py-3 rounded-full text-[10px] font-bold uppercase bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95"
          >
            <Plus size={14} /> ASSIGN
          </button>
          <button
            onClick={() => setShowExcelImportModal(true)}
            className="flex items-center gap-2 px-7 py-3 rounded-full text-[10px] font-bold uppercase bg-blue-100 border border-blue-300 text-blue-700 shadow-sm hover:bg-blue-200 transition-all active:scale-95"
          >
            <FileText size={14} /> IMPORT EXCEL
          </button>
          {/* SEARCH BAR */}
          <div className="relative group">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-20 pr-10 py-3 rounded-full text-xs font-bold bg-white border border-slate-200 outline-none focus:ring-2 ring-emerald-400 w-64 transition-all shadow-sm group-hover:shadow-md"
            />
            <SearchCode size={24} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          </div>
        </div>

        {/* ===== TASK OVERVIEW TABLE (Tasks Assigned TO Me - Active) ===== */}
        <Table
          title="My  Tasks"
          data={filterTasks(filterTasksByStatus(filterTasksByDateRange(filterTasksByClient(myTasks))))}
          mode="overview"
          onQuickComplete={handleDirectComplete}
          onReportComplete={openCompletionModal}
          selectedTasks={selectedTasks}
          onToggleSelect={toggleTaskSelection}
          onToggleSelectAll={toggleSelectAll}
          onBulkComplete={handleBulkComplete}
          currentUserId={currentUser?.id}
          onDeleteTask={requestDeleteTask}
        />
        {/* ===== UPCOMING 7 DAYS TASKS TABLE ===== */}
        <Table
          title="Upcoming 7 Days Tasks"
          data={filterTasks(filterTasksByStatus(filterTasksByDateRange(filterTasksByClient(
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
          ))))}
          mode="overview"
          onQuickComplete={handleDirectComplete}
          onReportComplete={openCompletionModal}
          selectedTasks={selectedTasks}
          onToggleSelect={toggleTaskSelection}
          onToggleSelectAll={toggleSelectAll}
          onBulkComplete={handleBulkComplete}
          currentUserId={currentUser?.id}
          onDeleteTask={requestDeleteTask}
        />
        {/* ===== COMPLETED TASKS TABLE (Tasks Assigned TO Me - Completed) ===== */}
        <Table title="Completed Tasks" data={filterTasks(filterTasksByStatus(filterTasksByDateRange(filterTasksByClient(completedTasks))))} mode="completed" currentUserId={currentUser?.id} onDeleteTask={requestDeleteTask} />
        {/* ===== ASSIGNED TASKS TABLE (Tasks I Assigned to Others) ===== */}
        <Table title="Delegated Tasks" data={filterTasks(filterTasksByStatus(filterTasksByDateRange(filterTasksByClient(delegatedTasks))))} mode="assigned" currentUserId={currentUser?.id} onDeleteTask={requestDeleteTask} />
        {/* ========================================================== */}
        {/* TASK COMPLETION MODAL FORM */}
        {/* ========================================================== */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
              <div className="bg-emerald-500 p-6 flex justify-between items-center text-white shrink-0">
                <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                  <FileCheck size={24} /> Submit Completion Report
                </h2>
                <button onClick={() => setShowCompleteModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1">
                <form onSubmit={handleCompleteSubmit} className="p-8 md:p-10 space-y-8">
                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center text-center">
                        <div><p className="text-[8px] font-bold text-emerald-400 uppercase">Task ID</p><p className="text-xs font-black text-emerald-900 truncate">{completionData.taskIdDisplay || "—"}</p></div>
                        <div><p className="text-[8px] font-bold text-emerald-400 uppercase">Task</p><p className="text-xs font-black text-emerald-900 truncate">{completionData.task || "—"}</p></div>
                        <div><p className="text-[8px] font-bold text-emerald-400 uppercase">Project</p><p className="text-xs font-black text-emerald-900 truncate">{completionData.project || "—"}</p></div>
                        <div><p className="text-[8px] font-bold text-emerald-400 uppercase">Client</p><p className="text-xs font-black text-emerald-900 truncate">{completionData.client || "—"}</p></div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Step 2: Remarks / Work Description</label>
                      <textarea required value={completionData.remarks} onChange={(e) => setCompletionData({ ...completionData, remarks: e.target.value })} rows="3" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-sm outline-none focus:border-emerald-500 transition-all font-bold text-slate-700" placeholder="Describe exactly what was delivered..." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Step 3: Upload Proof (PDF)</label>
                        <label className="mt-1 w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl py-4 px-4 flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition-all">
                          <Upload size={18} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-500 uppercase">{completionData.file ? completionData.file.name : "Attach Completion File"}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf"
                            onChange={(e) => setCompletionData({ ...completionData, file: e.target.files?.[0] || null })}
                          />
                        </label>
                      </div>

                      <div className="flex items-end">
                        <button type="submit" className="w-full bg-emerald-500 text-white font-black py-5 rounded-3xl text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-95">
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
            <div className="bg-white w-full max-w-7xl rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[92vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 p-6 flex justify-between text-white border-b border-slate-800 shrink-0">
                <h2 className="font-black uppercase tracking-widest flex items-center gap-2">
                  <ClipboardList size={18} className="text-[#F58A4B]" /> Bulk Assign Tasks
                </h2>
                <button onClick={() => setShowBulkModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {/* EDITABLE TABLE FOR BULK TASKS */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left bg-white">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">#</th>
                        <th className="px-4 py-3 min-w-[120px]">Type</th>
                        <th className="px-4 py-3 min-w-[140px]">Client</th>
                        <th className="px-4 py-3 min-w-[140px]">Project</th>
                        <th className="px-4 py-3 min-w-[200px]">Task Title</th>
                        <th className="px-4 py-3 min-w-[160px]">Assigned To</th>
                        <th className="px-4 py-3 min-w-[120px]">Priority</th>
                        <th className="px-4 py-3 min-w-[130px]">Flag</th>
                        <th className="px-4 py-3 min-w-[120px]">Due Date</th>
                        <th className="px-4 py-3 w-10 text-center">Ads</th>
                        <th className="px-4 py-3 w-10 text-center">Act</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkTasks.map((task, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-4 py-3 text-center text-xs font-bold text-slate-400">{index + 1}</td>

                          {/* TYPE: INTERNAL / NORMAL */}
                          <td className="px-4 py-3 align-top">
                            <button
                              type="button"
                              role="switch"
                              aria-checked={task.isInternal}
                              aria-label={task.isInternal ? "Internal task selected" : "Client task selected"}
                              onClick={() => handleRowChange(index, "isInternal", !task.isInternal)}
                              className="mt-1 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 transition-all hover:border-slate-300 hover:bg-slate-100"
                            >
                              <span className={`text-[10px] font-black transition-colors ${task.isInternal ? "text-emerald-600" : "text-slate-400"}`}>
                                Internal
                              </span>
                              <span
                                className={`relative h-6 w-11 overflow-hidden rounded-full transition-colors ${task.isInternal ? "bg-slate-300" : "bg-emerald-500"}`}
                              >
                                <span
                                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${task.isInternal ? "translate-x-0" : "translate-x-5"}`}
                                />
                              </span>
                              <span className={`text-[10px] font-black transition-colors ${!task.isInternal ? "text-emerald-600" : "text-slate-400"}`}>
                                Client
                              </span>
                            </button>
                          </td>

                          {/* CLIENT SELECTION (AUTOCOMPLETE) */}
                          <td className="px-4 py-3 align-top">
                            {!task.isInternal ? (
                              <AutocompleteInput
                                value={task.client}
                                onChange={(val) => handleRowChange(index, "client", val)}
                                options={Object.keys(clientProjectMap)}
                                placeholder="Type Client..."
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-emerald-400 placeholder:text-slate-300"
                              />
                            ) : (
                              <div className="text-[10px] text-slate-400 font-bold italic mt-2">Internal Task</div>
                            )}
                          </td>

                          {/* PROJECT SELECTION (AUTOCOMPLETE) */}
                          <td className="px-4 py-3 align-top">
                            {!task.isInternal ? (
                              <AutocompleteInput
                                value={task.project}
                                onChange={(val) => handleRowChange(index, "project", val)}
                                options={task.client && clientProjectMap[task.client] ? clientProjectMap[task.client].map(p => p.name) : []}
                                placeholder="Type Project..."
                                disabled={!task.client}
                                className={`w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-emerald-400 placeholder:text-slate-300 ${!task.client ? "opacity-50 cursor-not-allowed" : ""}`}
                              />
                            ) : (
                              <div className="text-[10px] text-slate-400 font-bold italic mt-2">—</div>
                            )}
                          </td>

                          {/* TASK TITLE */}
                          <td className="px-4 py-3 align-top">
                            <textarea
                              value={task.title}
                              onChange={(e) => handleRowChange(index, "title", e.target.value)}
                              placeholder="Enter task description..."
                              rows={2}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 ring-emerald-400 resize-none placeholder:text-slate-300 font-bold"
                            />
                          </td>

                          {/* ASSIGNED TO */}
                          <td className="px-4 py-3 align-top">
                            <select
                              value={task.assignedTo}
                              onChange={(e) => handleRowChange(index, "assignedTo", e.target.value)}
                              className={`w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-emerald-400 ${(!task.isInternal && !task.client) ? "opacity-50 cursor-not-allowed" : ""}`}
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

                          {/* FLAG */}
                          <td className="px-4 py-3 align-top">
                            <select
                              value={task.priority || 'LOW'}
                              onChange={(e) => handleRowChange(index, "priority", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-emerald-400"
                            >
                              {taskPriorityOptions.map((priorityOption) => (
                                <option key={priorityOption.value} value={priorityOption.value}>{priorityOption.label}</option>
                              ))}
                            </select>
                          </td>

                          {/* FLAG */}
                          <td className="px-4 py-3 align-top">
                            <select
                              value={task.flag || 'none'}
                              onChange={(e) => handleRowChange(index, "flag", e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-emerald-400"
                            >
                              {taskFlagOptions.map((flagOption) => (
                                <option key={flagOption.value} value={flagOption.value}>{flagOption.label}</option>
                              ))}
                            </select>
                          </td>

                          {/* DUE DATE */}
                          <td className="px-4 py-3 align-top">
                            <input
                              type="date"
                              value={task.targetDate}
                              onChange={(e) => handleRowChange(index, "targetDate", e.target.value)}
                              min={minTaskDate}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-emerald-400"
                            />
                          </td>

                          {/* FILE ATTACHMENT */}
                          <td className="px-4 py-3 align-top text-center">
                            <label className={`cursor-pointer w-8 h-8 flex items-center justify-center rounded-full transition-colors ${task.file ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                              <input type="file" className="hidden" onChange={(e) => handleRowChange(index, "file", e.target.files[0])} />
                              {task.file ? <CheckCircle size={14} /> : <Upload size={14} />}
                            </label>
                          </td>

                          {/* REMOVE ROW */}
                          <td className="px-4 py-3 align-top text-center">
                            <button
                              onClick={() => removeBulkTaskRow(index)}
                              className="text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full"
                              title="Remove Row"
                            >
                              <X size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER ACTIONS */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 shrink-0">
                  <button
                    onClick={addBulkTaskRow}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-bold uppercase bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    <Plus size={14} /> Add Another Row
                  </button>

                  <button
                    onClick={handleBulkAssignSubmit}
                    disabled={bulkTasks.length === 0}
                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl flex gap-2 items-center transition-all ${bulkTasks.length > 0 ? 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600 active:scale-95' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="bg-blue-900 p-6 flex justify-between items-center text-white shrink-0">
                <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                  <Upload size={24} /> Smart Paste Task Builder
                </h2>
                <button onClick={() => setShowSmartPasteModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
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
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${pasteColumnType === col.key ? "bg-emerald-500 text-white border-emerald-500 shadow" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}
                      >
                        {col.label}
                      </button>
                    ))}
                  </div>
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    {pasteColumnType ? `📋 Paste ${pasteColumnType} column` : "📋 Select a column, then paste"}
                  </h3>
                  <textarea
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder={pasteColumnType
                      ? `Paste ${pasteColumnType} values (one per line)`
                      : "Select a column button above, then paste"}
                    className="w-full h-32 p-4 text-sm font-mono bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 ring-emerald-400 resize-none font-bold"
                  />
                </div>

                {/* DRAFT TASKS TABLE WITH DROPDOWNS */}
                {draftTasks.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{draftTasks.length} Draft Tasks</h3>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto max-h-60 overflow-y-auto">
                      <table className="w-full text-[10px] font-mono">
                        <thead className="sticky top-0 bg-slate-50 z-10">
                          <tr className="border-b border-slate-200">
                            <th className="text-left px-3 py-2 text-slate-400">#</th>
                            <th className="text-left px-3 py-2 text-slate-400 min-w-[100px]">Title</th>
                            <th className="text-left px-3 py-2 text-slate-400 min-w-[90px]">Client</th>
                            <th className="text-left px-3 py-2 text-slate-400 min-w-[90px]">Project</th>
                            <th className="text-left px-3 py-2 text-slate-400 min-w-[120px]">Assigned To</th>
                            <th className="text-left px-3 py-2 text-slate-400 min-w-[110px]">Priority</th>
                            <th className="text-left px-3 py-2 text-slate-400 min-w-[110px]">Flag</th>
                            <th className="text-left px-3 py-2 text-slate-400 min-w-[100px]">Date</th>
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

                            return (
                              <tr
                                key={idx}
                                className={`border-b border-slate-100 ${isInvalid ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                              >
                                <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                <td className={`px-3 py-2 truncate max-w-[100px] ${hasTitleError ? 'text-red-600 font-bold' : 'text-slate-700'}`} title={task.title}>{task.title || "—"}</td>
                                <td className="px-3 py-2 min-w-[120px]">
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
                                    className={`w-full px-2 py-1 text-[10px] font-bold bg-white border rounded-lg outline-none focus:ring-1 ring-emerald-400 ${(isInvalidClient || hasClientError) ? 'border-red-400 bg-red-50/50 text-red-700' : 'border-slate-200'}`}
                                  >
                                    <option value="">Select Client...</option>
                                    <option value="Internal">Internal</option>
                                    {getAvailableClientNames().map((clientName) => (
                                      <option key={clientName} value={clientName}>{clientName}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2 min-w-[120px]">
                                  <select
                                    value={task.project || ''}
                                    onChange={(e) => {
                                      const updated = [...draftTasks];
                                      updated[idx] = { ...updated[idx], project: e.target.value, assignedTo: '' };
                                      setDraftTasks(updated);
                                    }}
                                    disabled={task.isInternal || !task.client}
                                    className={`w-full px-2 py-1 text-[10px] font-bold bg-white border rounded-lg outline-none focus:ring-1 ring-emerald-400 ${(isInvalidProject || hasProjectError) ? 'border-red-400 bg-red-50/50 text-red-700' : 'border-slate-200'} ${task.isInternal ? 'text-slate-400 bg-slate-100' : ''}`}
                                  >
                                    <option value="">{task.isInternal ? '-' : 'Select Project...'}</option>
                                    {!task.isInternal && task.client && (clientProjectMap[task.client] || []).map((p, i) => (
                                      <option key={`${task.client}-${p.id || i}`} value={p.name}>{p.name}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2 min-w-[120px]">
                                  <select
                                    value={task.assignedTo}
                                    onChange={(e) => {
                                      const updated = [...draftTasks];
                                      updated[idx] = { ...updated[idx], assignedTo: e.target.value };
                                      setDraftTasks(updated);
                                    }}
                                    className={`w-full px-2 py-1 text-[10px] font-bold bg-white border rounded-lg outline-none focus:ring-1 ring-emerald-400 ${hasAssignedToError ? 'border-red-400 bg-red-50/50' : 'border-slate-200'}`}
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
                                <td className="px-3 py-2 min-w-[110px]">
                                  <select
                                    value={task.priority || 'LOW'}
                                    onChange={(e) => {
                                      const updated = [...draftTasks];
                                      updated[idx] = { ...updated[idx], priority: e.target.value };
                                      setDraftTasks(updated);
                                    }}
                                    className="w-full px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 ring-emerald-400"
                                  >
                                    {taskPriorityOptions.map((priorityOption) => (
                                      <option key={priorityOption.value} value={priorityOption.value}>{priorityOption.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2 min-w-[110px]">
                                  <select
                                    value={task.flag || 'none'}
                                    onChange={(e) => {
                                      const updated = [...draftTasks];
                                      updated[idx] = { ...updated[idx], flag: e.target.value };
                                      setDraftTasks(updated);
                                    }}
                                    className="w-full px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 ring-emerald-400"
                                  >
                                    {taskFlagOptions.map((flagOption) => (
                                      <option key={flagOption.value} value={flagOption.value}>{flagOption.label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2 min-w-[120px]">
                                  <input
                                    type="date"
                                    value={task.targetDate}
                                    onChange={(e) => {
                                      const updated = [...draftTasks];
                                      updated[idx] = { ...updated[idx], targetDate: e.target.value };
                                      setDraftTasks(updated);
                                    }}
                                    min={minTaskDate}
                                    className={`w-full px-2 py-1 text-[10px] font-bold bg-white border rounded-lg outline-none focus:ring-1 ring-emerald-400 ${hasTargetDateError ? 'border-red-400 bg-red-50/50' : 'border-slate-200'}`}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {(draftTasks.some(t => String(t.client || '').startsWith('[INVALID]')) || draftTasks.some(t => String(t.project || '').startsWith('[INVALID]'))) && (
                      <p className="text-[10px] text-red-600 font-semibold">
                        ⚠ {draftTasks.filter(t => String(t.client || '').startsWith('[INVALID]') || String(t.project || '').startsWith('[INVALID]')).length} tasks with invalid clients/projects won't be created
                      </p>
                    )}
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 shrink-0">
                  {draftTasks.length > 0 && (
                    <button
                      onClick={clearSmartPasteDrafts}
                      className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-xs font-bold uppercase hover:bg-red-200 transition-all"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    onClick={() => setShowSmartPasteModal(false)}
                    className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase hover:bg-slate-300 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSmartPaste}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase hover:bg-black transition-all"
                  >
                    {draftTasks.length === 0 ? "Create Drafts" : "Update Column"}
                  </button>
                  {draftTasks.length > 0 && (
                    <button
                      onClick={handleSubmitSmartPaste}
                      className="px-6 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 animate-pulse"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
            <div className="bg-white w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="bg-blue-900 p-6 flex justify-between items-center text-white shrink-0">
                <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
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

              <div className="p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                {!mappingStep ? (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
                      <p className="text-xs font-semibold text-slate-700">
                        Upload an <span className="font-black">.xlsx</span> file. You can map columns in the next step before import.
                      </p>
                    </div>

                    <label className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all">
                      <Upload size={28} className="text-blue-600" />
                      <span className="text-sm font-black text-slate-700 uppercase tracking-wide">Choose Excel File</span>
                      <span className="text-[11px] font-semibold text-slate-500">Only .xlsx files are supported</span>
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
                      className="inline-flex items-center justify-center gap-2 w-full bg-slate-900 text-white rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                    >
                      <Download size={14} /> Download Sample Excel
                    </a>

                    {excelUploadStatus?.loading && (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                        Reading Excel file...
                      </div>
                    )}

                    {excelUploadStatus?.error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 whitespace-pre-wrap">
                        {excelUploadStatus.error}
                      </div>
                    )}

                    {excelUploadStatus?.success && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                        Imported {excelUploadStatus.tasksCreated || 0} task(s) successfully.
                        {(excelUploadStatus.draftsCreated || 0) > 0 && (
                          <span className="block mt-1 text-amber-700">
                            {excelUploadStatus.draftsCreated} task(s) were saved as draft with errors.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Map Columns</h3>

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
                            <label className={`text-xs font-bold ${hasFieldError ? 'text-red-600' : 'text-slate-700'}`}>
                              {field.label} {field.required && <span className="text-red-500">*</span>}
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
                              className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 ring-blue-300 ${hasFieldError ? 'border-red-400 bg-red-50/60' : 'border-slate-200'}`}
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

                        <div className="pt-3 mt-2 border-t border-slate-200 space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Import Defaults (Not From Excel)
                          </p>

                          <div className="grid grid-cols-2 items-center gap-3">
                            <label className="text-xs font-bold text-slate-700">Flag</label>
                            <select
                              value={excelImportFlag}
                              onChange={(e) => setExcelImportFlag(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 ring-blue-300"
                            >
                              {taskFlagOptions.map((flagOption) => (
                                <option key={flagOption.value} value={flagOption.value}>{flagOption.label}</option>
                              ))}
                            </select>
                          </div>

                          <div className="grid grid-cols-2 items-center gap-3">
                            <label className="text-xs font-bold text-slate-700">Priority</label>
                            <select
                              value={excelImportPriority}
                              onChange={(e) => setExcelImportPriority(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-2 ring-blue-300"
                            >
                              {taskPriorityOptions.map((priorityOption) => (
                                <option key={priorityOption.value} value={priorityOption.value}>{priorityOption.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4 space-y-3 overflow-auto">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Preview (First 5 Rows)</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50">
                                {(excelPreview?.columns || []).map((col, idx) => (
                                  <th key={idx} className="border border-slate-200 px-2 py-1.5 text-left font-black text-slate-500 whitespace-nowrap">
                                    {String(col || '').trim() || `Column ${idx + 1}`}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(excelPreview?.rows || []).map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                  {(excelPreview?.columns || []).map((_, colIdx) => (
                                    <td key={colIdx} className="border border-slate-100 px-2 py-1.5 text-slate-700 whitespace-nowrap">
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
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 whitespace-pre-wrap">
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
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
                        Importing tasks...
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleBackToUpload}
                        className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase hover:bg-slate-300 transition-all"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmMapping}
                        className="px-6 py-2 bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex justify-center items-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="bg-slate-900 p-6 flex justify-between items-center text-white border-b border-slate-800 shrink-0">
                <h2 className="font-black uppercase tracking-widest flex items-center gap-2">
                  <Plus size={18} className="text-[#F58A4B]" /> Assign New Task
                </h2>
                <button onClick={() => setShowAssignModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all flex items-center justify-center">
                  <X size={20} />
                </button>
              </div>

              <div className="overflow-y-auto custom-scrollbar flex-1">
                <form onSubmit={handleAssignSubmit} className="p-8 md:p-10 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Task Name</label>
                      <input required value={assignData.task} onChange={e => setAssignData({ ...assignData, task: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 md:py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700" placeholder="Enter task name..." />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Client</label>
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
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 md:py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700"
                      >
                        <option value="">Select Client</option>
                        <option value="Internal">Internal</option>
                        {Object.keys(clientProjectMap).map((c, i) => <option key={i} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Project</label>
                      <select
                        required={!assignData.isInternal}
                        value={assignData.project}
                        onChange={e => setAssignData({ ...assignData, project: e.target.value, assignedTo: "" })}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 md:py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700"
                        disabled={assignData.isInternal || !assignData.client}
                      >
                        <option value="">{assignData.isInternal ? "N/A" : "Select Project"}</option>
                        {!assignData.isInternal && assignData.client && clientProjectMap[assignData.client]?.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Assigned To</label>
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
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 md:py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700"
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
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Target Date</label>
                      <input
                        required
                        type="date"
                        value={assignData.targetDate}
                        min={minTaskDate}
                        onChange={e => setAssignData({ ...assignData, targetDate: e.target.value })}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 md:py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Priority</label>
                      <select
                        value={assignData.priority || 'LOW'}
                        onChange={e => setAssignData({ ...assignData, priority: e.target.value })}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 md:py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700"
                      >
                        {taskPriorityOptions.map((priorityOption) => (
                          <option key={priorityOption.value} value={priorityOption.value}>{priorityOption.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Flag (Optional)</label>
                      <select
                        value={assignData.flag || 'none'}
                        onChange={e => setAssignData({ ...assignData, flag: e.target.value })}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 md:py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700"
                      >
                        {taskFlagOptions.map((flagOption) => (
                          <option key={flagOption.value} value={flagOption.value}>{flagOption.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Attachment (Optional)</label>
                      <input type="file" onChange={e => setAssignData({ ...assignData, file: e.target.files[0] })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 md:py-4 text-xs font-bold outline-none focus:ring-2 ring-emerald-400 transition-all text-slate-700" />
                    </div>
                  </div>

                  <div className="pt-4 pb-2">
                    <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-3xl text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex justify-center gap-2 items-center">
                      <Plus size={18} /> Confirm Assignment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
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
  onDeleteTask
}) => {
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const isOverviewMode = mode === "overview";
  const [sortField, setSortField] = useState(isOverviewMode ? "start_date" : "default");
  const [sortDirection, setSortDirection] = useState("asc");

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

  const toggleTargetDateSort = () => {
    setSortField((prevField) => {
      if (prevField !== "target_date") {
        setSortDirection("asc");
        return "target_date";
      }

      setSortDirection((prevDirection) => (prevDirection === "asc" ? "desc" : "asc"));
      return prevField;
    });
  };

  const sortedData = useMemo(() => {
    if (isOverviewMode && (sortField === "start_date" || sortField === "target_date")) {
      return [...data].sort((a, b) => {
        const left = getDateSortValue(a, sortField);
        const right = getDateSortValue(b, sortField);

        if (left === right) return 0;
        return sortDirection === "asc" ? left - right : right - left;
      });
    }

    return [...data].sort((a, b) => getTaskSortValue(b) - getTaskSortValue(a));
  }, [data, isOverviewMode, sortDirection, sortField]);

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
    if (sourceModule && sourceModule !== 'DIRECT') return;

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
    <div className="max-w-7xl mx-auto mt-10 px-6">
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="px-8 py-5 border-b font-black uppercase text-xs tracking-widest bg-slate-50 text-slate-600 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {title}
          </div>

          <div className="flex items-center gap-6">
            {mode === 'overview' && selectedTasks?.length > 0 && (
              <button
                onClick={onBulkComplete}
                className="bg-emerald-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-emerald-600 transition-all animate-in fade-in"
              >
                Submit Selected ({selectedTasks.length})
              </button>
            )}

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-500 tabular-nums">
                {sortedData.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + PAGE_SIZE, sortedData.length)} / {sortedData.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <tr>
                <th className="px-4 py-3">Task ID</th>
                <th className="px-4 py-3">Task</th>
                {mode !== "assigned" && <th className="px-4 py-3">Project / Client</th>}
                {mode === "assigned" && <th className="px-4 py-3">Assigned To</th>}
                <th className="px-4 py-3">Assigned By</th>
                {mode === "overview" && <th className="px-4 py-3">Start Date</th>}
                {mode === "overview" && (
                  <th className="px-4 py-3">
                    <button
                      type="button"
                      onClick={toggleTargetDateSort}
                      className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
                      title="Sort by target date"
                    >
                      <span>Target Date</span>
                      <span className="text-[11px] leading-none">
                        {sortField === "target_date" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  </th>
                )}
                {mode === "completed" && <th className="px-4 py-3">Complete Date</th>}
                <th className="px-4 py-3 text-center">Priority</th>
                <th className="px-4 py-3 text-center">Status</th>
                {(mode === "overview" || mode === "assigned") && <th className="px-4 py-3 text-center">Assigned PDF</th>}
                {mode === "completed" && <th className="px-4 py-3 text-center">Remarks</th>}
                {(mode === "completed" || mode === "assigned") && <th className="px-4 py-3 text-center">Complete PDF</th>}
                {mode === "overview" && <th className="px-4 py-3 text-center">Select</th>}
                {mode === "overview" && <th className="px-4 py-3 text-center">Complete</th>}
                {mode !== "completed" && <th className="px-4 py-3 text-center">Delete</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedData.map((t) => {
                const isActionPlanTask = String(t?.source_module || '').trim().toUpperCase() === 'ACTION_PLAN';
                const sourceModule = String(t?.source_module || '').trim().toUpperCase();
                const nonDeletableModules = ['DDFMS', 'ACTION_PLAN'];
                const deletable = Boolean(onDeleteTask)
                  && currentUserId
                  && !nonDeletableModules.includes(sourceModule)
                  && Number(t?.assigned_by) === Number(currentUserId);
                const rowClass = selectedTasks?.includes(t.id)
                  ? 'bg-emerald-50/50'
                  : isActionPlanTask
                    ? 'bg-[#f6eefc] hover:bg-[#f2e7fa]'
                    : 'hover:bg-slate-50';

                return (
                  <tr key={t.id} className={`transition-colors ${rowClass}`}>
                    <td className="px-4 py-3 font-bold text-slate-500 text-[11px]">{t.task_id}</td>
                    <td className="px-4 py-3 font-semibold text-xs text-slate-800">{t.title}</td>

                    {mode !== "assigned" && <td className="px-4 py-3 text-[11px] font-medium text-slate-500 italic">{getProjectClientLabel(t)}</td>}
                    {mode === "assigned" && <td className="px-4 py-3 text-xs font-medium">{t.assigned_to_name}</td>}
                    <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                      {getAssignedByLabel(t)}
                    </td>
                    {mode === "overview" && <td className="px-4 py-3 text-[11px] font-bold text-violet-700 whitespace-nowrap">{t.start_date ? formatDateDDMMYYYY(t.start_date, "—") : "—"}</td>}
                    {mode === "overview" && <td className="px-4 py-3 text-[11px] font-bold text-orange-400 whitespace-nowrap">{formatDateDDMMYYYY(t.target_date, "—")}</td>}
                    {mode === "completed" && <td className="px-4 py-3 text-[11px] font-bold text-emerald-500 whitespace-nowrap">{formatDateDDMMYYYY(t.completion_date, "—")}</td>}
                    <td className="px-4 py-3 text-center"><PriorityBadge priority={getTaskDisplayPriority(t)} /></td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={getTaskDisplayStatus(t)} /></td>
                    {(mode === "overview" || mode === "assigned") && <td className="px-4 py-3 text-center">{t.assigned_file ? <Download size={16} className="mx-auto text-blue-500 cursor-pointer hover:scale-110" /> : "—"}</td>}
                    {mode === "completed" && <td className="px-4 py-3 text-[11px] font-medium text-slate-600 max-w-[200px] truncate" title={getCompletedRemarkLabel(t)}>{getCompletedRemarkLabel(t)}</td>}
                    {(mode === "completed" || mode === "assigned") && <td className="px-4 py-3 text-center">{t.completion_file ? <Download size={16} className="mx-auto text-emerald-500 cursor-pointer hover:scale-110" /> : "—"}</td>}
                    {mode === "overview" && (
                      <>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedTasks?.includes(t.id) || false}
                            onChange={() => onToggleSelect(t.id)}
                            className="cursor-pointer accent-emerald-500 scale-110"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => onReportComplete(t)} className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-slate-900 text-white shadow-md hover:bg-black transition-all">
                            Complete
                          </button>
                        </td>
                      </>
                    )}
                    {mode !== "completed" && (
                      <td className="px-4 py-3 text-center">
                        {deletable ? (
                          <button
                            onClick={() => onDeleteTask?.(t)}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-all"
                            title="Delete task"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

/* ===== HELPER COMPONENTS (ORIGINAL STYLE) ===== */
const Stat = ({ title, value, icon, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl md:rounded-2xl shadow-sm px-4 py-2.5 flex flex-col transition-all hover:translate-y-[-2px] hover:shadow-lg" style={{ borderLeft: `4px solid ${color}` }}>
    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
    <div className="flex justify-between items-end mt-1">
      <h2 className="text-2xl md:text-3xl font-black text-slate-900">{value}</h2>
      <div className="text-slate-200 opacity-50">{React.cloneElement(icon, { size: 16 })}</div>
    </div>
  </div>
);

const MidBtn = ({ label, icon, primary, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-7 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${primary ? "bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-black" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
    {icon} {label}
  </button>
);

const StatusBadge = ({ status }) => {
  const map = { "On Time": "bg-green-50 text-green-600", "In Progress": "bg-blue-50 text-blue-600", Delayed: "bg-yellow-50 text-yellow-600", Overdue: "bg-red-50 text-red-600", Completed: "bg-emerald-50 text-emerald-600" };
  return <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${map[status] || "bg-slate-100"}`}>{status}</span>;
};

const PriorityBadge = ({ priority }) => {
  const map = {
    HIGH: "bg-rose-50 text-rose-600",
    MEDIUM: "bg-amber-50 text-amber-600",
    LOW: "bg-emerald-50 text-emerald-600",
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
        <ul className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto mt-1 custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
          {suggestions.map((opt, i) => (
            <li
              key={i}
              onMouseDown={() => { onChange(opt); setShow(false); }} // onMouseDown fires before onBlur
              className="px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 cursor-pointer transition-colors"
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