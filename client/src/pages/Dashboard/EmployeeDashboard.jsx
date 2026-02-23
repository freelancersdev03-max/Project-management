import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../../api";
import Navbar from "../../components/Navbar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Calendar, Search, Filter, ClipboardList, Plus, CheckCircle,
  LayoutGrid, Clock, AlertCircle, TrendingUp, User, Download,
  X, Upload, SearchCode, SendHorizontal, FileCheck, BarChart3, FileText, ArrowLeft
} from "lucide-react";

const getFileUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
  return `${baseUrl}${path}`;
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

  // FORM STATES FOR TASK COMPLETION

  const [fetchId, setFetchId] = useState("");
  const [completionData, setCompletionData] = useState({
    id: "", task: "", client: "", project: "", remarks: "", file: null
  });

  const [assignData, setAssignData] = useState({
    task: "", project: "", client: "", assignedTo: "", targetDate: "", file: null,
    isRepeatable: false, repeatFrequency: "", repeatEndDate: "", repeatDay: "", repeatWeek: "",
    isInternal: false
  });


  // New Task State for Bulk (Includes Client/Project/User now)
  // Initializing with one empty row
  const getEmptyTaskRow = () => ({
    client: "", project: "", assignedTo: "",
    title: "", targetDate: "", file: null,
    isInternal: false
  });

  const [bulkTasks, setBulkTasks] = useState([getEmptyTaskRow()]);

  const getProjectMembers = (project) => {
    // Internal team members (Employee users with team_members_details field)
    const internalMembers = project?.team_members_details || [];
    const sgmMember = project?.assigned_sgm_details ? [project.assigned_sgm_details] : [];
    
    // External team members (EXTERNAL users with external_team_details field)
    const externalMembers = project?.external_team_details || [];
    
    // Combine both and format with role label
    const combined = [
      ...sgmMember.map(m => ({ ...m, role: "SGM" })),
      ...internalMembers.map(m => ({ ...m, role: m.role || "EMPLOYEE" })),
      ...externalMembers.map(m => ({ ...m, role: "(EXTERNAL)" }))
    ];
    
    return combined;
  };

  const withCurrentUser = (members) => {
    if (!currentUser) return members;

    const currentEmail = currentUser.email ? currentUser.email.toLowerCase() : "";
    const hasCurrentUser = members.some(m => {
      const memberEmail = m.email ? m.email.toLowerCase() : "";
      const matchByEmail = currentEmail && memberEmail && memberEmail === currentEmail;
      const matchById = m.id && currentUser.id && m.id === currentUser.id;
      return matchByEmail || matchById;
    });

    if (hasCurrentUser) return members;

    return [{ ...currentUser, role: currentUser.role || "EMPLOYEE" }, ...members];
  };

  // Helper to get unique users from all projects (excluding externals for internal tasks)
  const getAllUniqueUsers = () => {
    const users = new Map();
    Object.values(clientProjectMap).flat().forEach(project => {
      getProjectMembers(project).forEach(member => {
        // Filter out externals - only show internal employees and SGM for internal tasks
        if (member.role !== "(EXTERNAL)") {
          if (!users.has(member.email)) {
            users.set(member.email, member);
          }
        }
      });
    });
    return withCurrentUser(Array.from(users.values()));
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
  const [clientProjectMap, setClientProjectMap] = useState({});
  const [selectedClients, setSelectedClients] = useState([]);
  const [includeAllTasks, setIncludeAllTasks] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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

  const splitTasksForUser = (tasks, user) => {
    if (!user) {
      console.log("No user object provided to splitTasksForUser");
      return { my_active: [], my_completed: [], delegated: [] };
    }

    console.log("====== TASK FILTERING DEBUG ======");
    console.log("Filtering for User ID:", user.id, "Username:", user.username);

    const isMine = (t) => {
      // Try multiple field name variations
      const taskAssignedToName = t.assigned_to_name || t.assigned_to_username;
      const taskAssignedToId = t.assigned_to || t.assigned_to_id || t.assigned_to_employee;
      
      const matchByName = taskAssignedToName && (taskAssignedToName === user.username || taskAssignedToName === user.full_name);
      const matchById = taskAssignedToId && taskAssignedToId === user.id;
      
      const result = matchByName || matchById;
      if (result) {
        console.log(`✓ Task "${t.title}" is mine - assigned_to: ${taskAssignedToName} (${taskAssignedToId}), match by: ${matchByName ? 'name' : 'id'}`);
      }
      return result;
    };

    const isSelfAssigned = (t) => {
      const taskAssignedByName = t.assigned_by_name || t.assigned_by_username;
      const taskAssignedById = t.assigned_by || t.assigned_by_id;
      
      const matchByName = taskAssignedByName && (taskAssignedByName === user.username || taskAssignedByName === user.full_name);
      const matchById = taskAssignedById && taskAssignedById === user.id;
      
      return (matchByName || matchById) && isMine(t);
    };

    const my_active = tasks.filter(t => (isMine(t) || isSelfAssigned(t)) && !t.completion_date);
    const my_completed = tasks.filter(t => (isMine(t) || isSelfAssigned(t)) && t.completion_date);
    const delegated = tasks.filter(t => {
      const taskAssignedByName = t.assigned_by_name || t.assigned_by_username;
      const taskAssignedById = t.assigned_by || t.assigned_by_id;
      const taskAssignedToId = t.assigned_to || t.assigned_to_id || t.assigned_to_employee;
      
      const isAssignedBy = (taskAssignedByName && (taskAssignedByName === user.username || taskAssignedByName === user.full_name)) || 
                          (taskAssignedById && taskAssignedById === user.id);
      const isAssignedToOther = taskAssignedToId && taskAssignedToId !== user.id;
      
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
      setClientProjectMap({});
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
        
        // If viewing another employee (from internal team view)
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
            console.error("Falling back to current user and clearing member param");
            const userRes = await api.get("me/");
            userData = userRes.data;
            isMemberView = false;
            window.history.replaceState({}, "", window.location.pathname);
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
        
        const displayName = userData?.full_name || userData?.username || "Employee";
        setUserName(displayName);
        setCurrentUser(userData || null);

        // 2. Fetch Projects
        const projRes = await api.get("projects/");
        console.log("Projects API Response:", projRes.data); // DEBUG

        // Handle potential pagination
        const projectsData = Array.isArray(projRes.data) ? projRes.data : (projRes.data.results || []);

        // Transform projects into Client -> [Projects] map (Store full project object)
        const mapping = {};
        if (projectsData.length === 0) {
          console.warn("No projects found for this user.");
        }

        projectsData.forEach(p => {
          const client = p.client_name || "Unknown Client";
          if (!mapping[client]) mapping[client] = [];
          mapping[client].push(p); // Store full object, not just name
        });
        setClientProjectMap(mapping);


        // 3. Fetch Dashboard Stats
        let statsData;
        
        // 4. Fetch All Tasks (Assigned To & By)
        const tasksUrl = isMemberView && hasValidMemberId
          ? `tasks/?assigned_to=${memberId}`
          : "tasks/";
        const tasksRes = await api.get(tasksUrl);

        // Split tasks
        const allFetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);
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
              { name: "Overdue", value: my_active.filter(t => {
                if (!t.target_date) return false;
                const targetDate = new Date(t.target_date);
                const today = new Date();
                today.setHours(0,0,0,0);
                targetDate.setHours(0,0,0,0);
                return targetDate < today;
              }).length, color: "#f59e0b" }
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
    setShowDateFilterDropdown(false);
  };

  const filteredDashboardStats = useMemo(() => {
    const normalizeText = (value) => String(value || "").trim().toLowerCase();

    const normalizeClientName = (task) =>
      task.client_name || task.client_org_name || task.client || "Unknown Client";

    const selectedClientSet = new Set(selectedClients.map(normalizeText));

    const isClientSelected = (task) => {
      if (includeAllTasks) return true;
      return selectedClientSet.has(normalizeText(normalizeClientName(task)));
    };

    const activeTasks = myTasks.filter(isTaskInDateRange).filter(isClientSelected);
    const doneTasks = completedTasks.filter(isTaskInDateRange).filter(isClientSelected);

    const isDelayedStatus = (task) => {
      const status = normalizeText(task.status);
      return status.includes("delay") || status.includes("late");
    };

    const isOverdueTask = (task) => {
      if (!task.target_date) return false;
      const targetDate = new Date(task.target_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate < today;
    };

    const delayedCount = [...activeTasks, ...doneTasks].filter(isDelayedStatus).length;
    const overdueCount = activeTasks.filter((task) => !isDelayedStatus(task) && isOverdueTask(task)).length;
    const inProgressCount = activeTasks.filter((task) => !isDelayedStatus(task) && !isOverdueTask(task)).length;

    const onTimeCount = doneTasks.filter((task) => {
      if (!task.target_date || !task.completion_date) return false;
      const targetDate = new Date(task.target_date);
      const completedDate = new Date(task.completion_date);
      targetDate.setHours(0, 0, 0, 0);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate <= targetDate;
    }).length;

    const totalTasks = activeTasks.length + doneTasks.length;
    const atsScore = totalTasks > 0 ? `${Math.round((doneTasks.length / totalTasks) * 100)}%` : "0%";
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
  }, [myTasks, completedTasks, selectedClients, includeAllTasks, startDate, endDate]);


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
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      if (!completionData.id) {
        alert("Task ID is missing. Please re-open the completion form.");
        return;
      }

      const payload = {
        status: "Completed",
        remarks: completionData.remarks,
        completion_date: new Date().toISOString().split('T')[0]
      };

      if (completionData.file) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => formData.append(key, payload[key]));
        formData.append('completion_file', completionData.file);
        await axios.patch(`http://127.0.0.1:8000/api/tasks/${completionData.id}/`, formData, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
      } else {
        await axios.patch(`http://127.0.0.1:8000/api/tasks/${completionData.id}/`, payload, { headers });
      }

      alert(`Task ${completionData.taskIdDisplay} marked as completed!`);

      // Refresh Data
      const statsRes = await axios.get("http://127.0.0.1:8000/api/tasks/dashboard_stats/", { headers });
      setDashboardStats(statsRes.data);

      const tasksRes = await axios.get("http://127.0.0.1:8000/api/tasks/", { headers });
      const allFetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);

      const userRes = await axios.get("http://127.0.0.1:8000/api/me/", { headers });

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

      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        status: "Completed",
        remarks: "Completed directly via Dashboard",
        completion_date: new Date().toISOString().split('T')[0]
      };

      await axios.patch(`http://127.0.0.1:8000/api/tasks/${task.id}/`, payload, { headers });

      alert(`Task "${task.title}" marked as completed!`);

      // Refresh Data
      const statsRes = await axios.get("http://127.0.0.1:8000/api/tasks/dashboard_stats/", { headers });
      setDashboardStats(statsRes.data);

      const tasksRes = await axios.get("http://127.0.0.1:8000/api/tasks/", { headers });
      const allFetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);

      const userRes = await axios.get("http://127.0.0.1:8000/api/me/", { headers });

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
      remarks: "",
      file: null
    });
    setShowCompleteModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      // Find IDs from names/objects
      // Note: assignData.assignedTo currently stores the email. Ideally, we need ID.
      // But ProjectSerializer provides ID in team_member_details. 
      // Let's fix the Assign Form to store ID in state, or find it here if we stored email.

      // FIX: The previous step stored email. Let's find the user object again to get ID.
      let selectedProjectObj = null;
      let selectedUser = null;

      if (assignData.isInternal) {
        // Find user from ALL unique users
        const allUsers = getAllUniqueUsers();
        selectedUser = allUsers.find(m => m.email === assignData.assignedTo);
      } else {
        selectedProjectObj = clientProjectMap[assignData.client]?.find(p => p.name === assignData.project);
        selectedUser = withCurrentUser(getProjectMembers(selectedProjectObj)).find(m => m.email === assignData.assignedTo);
      }

      if ((!assignData.isInternal && !selectedProjectObj) || !selectedUser) {
        alert("Please select valid project and user.");
        return;
      }

      const payload = {
        title: assignData.task,
        project: selectedProjectObj ? selectedProjectObj.id : null, // Send ID or null
        client_org: selectedProjectObj ? selectedProjectObj.client : null, // Send ID or null
        assigned_to: selectedUser.id, // Send ID
        target_date: assignData.isRepeatable ? new Date().toISOString().split('T')[0] : assignData.targetDate, // Default to today if hidden
        description: assignData.isInternal ? "Internal Task" : "Assigned via Dashboard",
        status: "In Progress",
        is_repeatable: assignData.isRepeatable,
        repeat_frequency: assignData.repeatFrequency,
        repeat_end_date: assignData.repeatEndDate ? assignData.repeatEndDate : null,
        repeat_day: assignData.repeatDay,
        repeat_week: assignData.repeatWeek
      };

      // Handle File upload if needed (would need FormData)
      // For now, sending JSON for core data. If file exists:
      if (assignData.file) {
        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          if (payload[key] !== null) formData.append(key, payload[key]);
        });
        formData.append('assigned_file', assignData.file);

        await axios.post("http://127.0.0.1:8000/api/tasks/", formData, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
      } else {
        await axios.post("http://127.0.0.1:8000/api/tasks/", payload, { headers });
      }

      alert("Task Assigned Successfully!");

      // Refresh Tasks
      const tasksRes = await axios.get("http://127.0.0.1:8000/api/tasks/", { headers });
      const userRes = await axios.get("http://127.0.0.1:8000/api/me/", { headers }); // Need username for filter
      const allFetchedTasks = tasksRes.data;
      const { delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
      setDelegatedTasks(delegated);

      setShowAssignModal(false);
      setAssignData({
        task: "", project: "", client: "", assignedTo: "", targetDate: "", file: null,
        isRepeatable: false, repeatFrequency: "", repeatEndDate: "", repeatDay: "", repeatWeek: ""
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
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      // Filter out empty rows (conceptually, though UI enforces some fields)
      const validTasks = bulkTasks.filter(t => t.title && t.assignedTo && t.targetDate && (t.isInternal || (t.client && t.project)));

      if (validTasks.length === 0) {
        alert("No valid tasks to assign. Please fill in the details.");
        return;
      }

      // Prepare Requests - Resolve IDs for EACH task
      const requests = validTasks.map(task => {
        let selectedProjectObj = null;
        let selectedUser = null;

        if (task.isInternal) {
          const allUsers = getAllUniqueUsers();
          selectedUser = allUsers.find(m => m.email === task.assignedTo);
        } else {
          selectedProjectObj = clientProjectMap[task.client]?.find(p => p.name === task.project);
          selectedUser = withCurrentUser(getProjectMembers(selectedProjectObj)).find(m => m.email === task.assignedTo);
        }

        if ((!task.isInternal && !selectedProjectObj) || !selectedUser) {
          throw new Error(`Invalid Project or User for task: ${task.title}`);
        }

        const payload = {
          title: task.title,
          project: selectedProjectObj ? selectedProjectObj.id : null,
          client_org: selectedProjectObj ? selectedProjectObj.client : null,
          assigned_to: selectedUser.id,
          target_date: task.targetDate,
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
          return axios.post("http://127.0.0.1:8000/api/tasks/", formData, { headers: { ...headers, "Content-Type": "multipart/form-data" } });
        } else {
          return axios.post("http://127.0.0.1:8000/api/tasks/", payload, { headers });
        }
      });

      await Promise.all(requests);
      alert(`${validTasks.length} tasks assigned successfully!`);

      // Refresh Tasks
      const tasksRes = await axios.get("http://127.0.0.1:8000/api/tasks/", { headers });
      const userRes = await axios.get("http://127.0.0.1:8000/api/me/", { headers });
      const allFetchedTasks = tasksRes.data;
      const { delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
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
    if (selectedTasks.length === tasks.length) {
      setSelectedTasks([]);
    } else {
      setSelectedTasks(tasks.map(t => t.id));
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTasks.length === 0) return;
    if (!confirm(`Are you sure you want to complete ${selectedTasks.length} tasks?`)) return;

    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        status: "Completed",
        remarks: "Completed directly via Dashboard",
        completion_date: new Date().toISOString().split('T')[0]
      };

      const requests = selectedTasks.map(id =>
        axios.patch(`http://127.0.0.1:8000/api/tasks/${id}/`, payload, { headers })
      );

      await Promise.all(requests);
      alert(`${selectedTasks.length} tasks marked as completed!`);
      setSelectedTasks([]); // Clear selection

      // Refresh Data
      const statsRes = await axios.get("http://127.0.0.1:8000/api/tasks/dashboard_stats/", { headers });
      setDashboardStats(statsRes.data);

      const tasksRes = await axios.get("http://127.0.0.1:8000/api/tasks/", { headers });
      const allFetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);
      const userRes = await axios.get("http://127.0.0.1:8000/api/me/", { headers });

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
  const findBestClientMatch = (input) => {
    const clients = Object.keys(clientProjectMap);
    
    // First try exact case-insensitive match
    const exactMatch = clients.find(c => c.toLowerCase() === input.toLowerCase());
    if (exactMatch) return exactMatch;

    // Then try fuzzy match (edit distance <= 1)
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const client of clients) {
      const distance = calculateEditDistance(input, client);
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
      targetDate: new Date().toISOString().split('T')[0],
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
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      // Validate all draft tasks - exclude those with invalid clients or projects
      const validTasks = draftTasks.filter(t => 
        t.title && t.assignedTo && t.targetDate && 
        !t.client.startsWith('[INVALID]') && 
        !t.project.startsWith('[INVALID]')
      );
      
      if (validTasks.length === 0) {
        alert("No valid tasks to submit. Each task needs: Title, Assigned To, Due Date, Valid Client, and Valid Project.");
        return;
      }

      if (validTasks.length < draftTasks.length) {
        const skipped = draftTasks.length - validTasks.length;
        const invalidClients = draftTasks
          .filter(t => t.client.startsWith('[INVALID]'))
          .map((t, i) => `- "${t.title}": Invalid client ${t.client}`);
        const invalidProjects = draftTasks
          .filter(t => t.project.startsWith('[INVALID]'))
          .map((t, i) => `- "${t.title}": Invalid project ${t.project}`);
        
        const skipReasons = [...invalidClients, ...invalidProjects];
        let message = `${skipped} tasks will be skipped:\n${skipReasons.slice(0, 3).join('\n')}${skipReasons.length > 3 ? '\n...' : ''}\n\nContinue with ${validTasks.length} valid tasks?`;
        
        if (!confirm(message)) {
          return;
        }
      }

      // Create tasks
      const requests = validTasks.map((task, taskIndex) => {
        let selectedProjectObj = null;
        let selectedUser = null;

        if (task.isInternal) {
          const allUsers = getAllUniqueUsers();
          selectedUser = allUsers.find(m => m.email === task.assignedTo);
        } else {
          if (task.client && task.project) {
            selectedProjectObj = clientProjectMap[task.client]?.find(p => p.name === task.project);
            selectedUser = withCurrentUser(getProjectMembers(selectedProjectObj)).find(m => m.email === task.assignedTo);
          } else {
            // Try to find the user globally
            const allUsers = getAllUniqueUsers();
            selectedUser = allUsers.find(m => m.email === task.assignedTo || m.username === task.assignedTo);
          }
        }

        if (!selectedUser) {
          throw new Error(`User '${task.assignedTo}' not found for task: ${task.title}`);
        }

        const payload = {
          title: task.title,
          project: selectedProjectObj ? selectedProjectObj.id : null,
          client_org: selectedProjectObj ? selectedProjectObj.client : null,
          assigned_to: selectedUser.id,
          target_date: task.targetDate,
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
          return axios.post("http://127.0.0.1:8000/api/tasks/", formData, { headers: { ...headers, "Content-Type": "multipart/form-data" } }).catch(err => {
            console.error(`[Task ${taskIndex + 1}] Failed:`, err.response?.data || err.message);
            throw err;
          });
        } else {
          return axios.post("http://127.0.0.1:8000/api/tasks/", payload, { headers }).catch(err => {
            console.error(`[Task ${taskIndex + 1}] Failed:`, err.response?.data || err.message);
            throw err;
          });
        }
      });

      await Promise.all(requests);
      alert(`✓ Successfully created ${validTasks.length} tasks!`);

      // Refresh data
      const tasksRes = await axios.get("http://127.0.0.1:8000/api/tasks/", { headers });
      const userRes = await axios.get("http://127.0.0.1:8000/api/me/", { headers });
      const allFetchedTasks = tasksRes.data;
      const { delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
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

      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/tasks/import_tasks_from_excel/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setExcelUploadStatus({
          success: true,
          tasksCreated: response.data.tasks_created,
          taskIds: response.data.task_ids,
          warnings: response.data.warnings
        });
        setMappingStep(false);
        setExcelPreview(null);
        
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setExcelUploadStatus({
          error: response.data.error || 'Import failed',
          backendErrors: response.data.errors || [],
          warnings: response.data.warnings || [],
          tasksCreated: response.data.tasks_created || 0
        });
        setMappingStep(false);
      }
    } catch (err) {
      console.error('Import error:', err);
      setExcelUploadStatus({
        error: err.response?.data?.error || err.message || "Import failed",
        backendErrors: err.response?.data?.errors || [],
        warnings: err.response?.data?.warnings || []
      });
      setMappingStep(false);
    }
  };

  const handleBackToUpload = () => {
    setMappingStep(false);
    setExcelPreview(null);
    setColumnMapping({});
    setExcelUploadStatus(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      <Navbar hideLogin={true} />

      {/* ===== HEADER ===== */}
      <div className="max-w-7xl mx-auto mt-5 bg-slate-900 rounded-2xl px-6 py-4 grid grid-cols-3 items-center text-white shadow-xl">
        {/* Back Button (Left) */}
        <button
          onClick={() => navigate("/sgm")}
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors w-fit"
          title="Back to Dashboard"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline text-xs font-semibold">Back</span>
        </button>

        {/* Username in the exact center (Middle) */}
        <h1 className="text-xl font-extrabold text-[#F58A4B] text-center">
          {userName}'s Dashboard
        </h1>

        {/* Date filter dropdown on the right (Right) */}
        <div className="flex items-center justify-end gap-3 relative" ref={dateFilterRef}>
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
            <div className="absolute right-0 mt-2 top-full w-[460px] bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-30">
              <div className="grid grid-cols-2 gap-8">
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
            <ResponsiveContainer>
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
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* OTC CENTER OVERLAY */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OTC</span>
              <span className="text-3xl font-black text-slate-900">{filteredDashboardStats.otc_score}</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
          <Stat title="Total Task" value={filteredDashboardStats.total_tasks} color="#6366f1" icon={<LayoutGrid size={18} />} />
          <Stat title="On Time Completion" value={filteredDashboardStats.on_time_count} color="#22c55e" icon={<CheckCircle size={18} />} />
          <Stat title="Overdue" value={filteredDashboardStats.overdue_count} color="#ef4444" icon={<AlertCircle size={18} />} />
          <Stat title="In Progress" value={filteredDashboardStats.in_progress_count} color="#3b82f6" icon={<TrendingUp size={18} />} />
           <Stat title="Delayed" value={filteredDashboardStats.delayed_count} color="#facc15" icon={<Clock size={18} />} />
          <Stat title="ATS SCORE" value={filteredDashboardStats.ats_score} color="#a855f7" icon={<TrendingUp size={18} />} />
        </div>
      </div>

      {/* ===== ACTION BAR (FMS instead of Complete) ===== */}
      <div className="flex justify-center mt-8 gap-12 items-center flex-wrap px-4">
        <MidBtn label="FILTER" icon={<Filter size={14} />} />
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
        title="My Function Tasks"
        data={filterTasks(filterTasksByDateRange(myTasks))}
        mode="overview"
        onQuickComplete={handleDirectComplete}
        onReportComplete={openCompletionModal}
        selectedTasks={selectedTasks}
        onToggleSelect={toggleTaskSelection}
        onToggleSelectAll={toggleSelectAll}
        onBulkComplete={handleBulkComplete}
      />
      {/* ===== COMPLETED TASKS TABLE (Tasks Assigned TO Me - Completed) ===== */}
      <Table title="Completed Tasks" data={filterTasks(filterTasksByDateRange(completedTasks))} mode="completed" />
      {/* ===== ASSIGNED TASKS TABLE (Tasks I Assigned to Others) ===== */}
      <Table title="Delegated Tasks" data={filterTasks(filterTasksByDateRange(delegatedTasks))} mode="assigned" />
      {/* ========================================================== */}
      {/* TASK COMPLETION MODAL FORM */}
      {/* ========================================================== */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-500 p-6 flex justify-between items-center text-white">
              <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                <FileCheck size={24} /> Submit Completion Report
              </h2>
              <button onClick={() => setShowCompleteModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2 bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                  <div className="grid grid-cols-4 gap-4 items-center text-center">
                    <div><p className="text-[8px] font-bold text-emerald-400 uppercase">Task ID</p><p className="text-xs font-black text-emerald-900 truncate">{completionData.taskIdDisplay || "—"}</p></div>
                    <div><p className="text-[8px] font-bold text-emerald-400 uppercase">Task</p><p className="text-xs font-black text-emerald-900 truncate">{completionData.task || "—"}</p></div>
                    <div><p className="text-[8px] font-bold text-emerald-400 uppercase">Project</p><p className="text-xs font-black text-emerald-900 truncate">{completionData.project || "—"}</p></div>
                    <div><p className="text-[8px] font-bold text-emerald-400 uppercase">Client</p><p className="text-xs font-black text-emerald-900 truncate">{completionData.client || "—"}</p></div>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Step 2: Remarks / Work Description</label>
                  <textarea required value={completionData.remarks} onChange={(e) => setCompletionData({ ...completionData, remarks: e.target.value })} rows="3" className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-3xl px-6 py-4 text-sm outline-none focus:border-emerald-500 transition-all" placeholder="Describe exactly what was delivered..." />
                </div>

                <div className="col-span-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Step 3: Upload Proof (PDF)</label>
                  <label className="mt-1 w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl py-4 px-4 flex items-center justify-center gap-3 cursor-pointer hover:bg-slate-100 transition-all">
                    <Upload size={18} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase">Attach Completion File</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf"
                      onChange={(e) => setCompletionData({ ...completionData, file: e.target.files?.[0] || null })}
                    />
                  </label>
                </div>

                <div className="col-span-1 flex items-end">
                  <button type="submit" className="w-full bg-emerald-500 text-white font-black py-5 rounded-3xl text-xs uppercase tracking-widest shadow-xl shadow-emerald-100 flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all active:scale-95">
                    <SendHorizontal size={18} /> Submit Final Report
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== BULK ASSIGN MODAL ===== */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 p-6 flex justify-between text-white border-b border-slate-800 shrink-0">
              <h2 className="font-black uppercase tracking-widest flex items-center gap-2"><ClipboardList size={18} className="text-[#F58A4B]" /> Bulk Assign Tasks</h2>
              <button onClick={() => setShowBulkModal(false)}><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">

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
                          <label className="flex items-center gap-2 cursor-pointer mt-2">
                            <input
                              type="checkbox"
                              checked={task.isInternal}
                              onChange={(e) => handleRowChange(index, "isInternal", e.target.checked)}
                              className="accent-emerald-500 scale-110"
                            />
                            <span className={`text-[10px] font-bold uppercase ${task.isInternal ? "text-emerald-500" : "text-slate-400"}`}>
                              {task.isInternal ? "Internal" : "Client"}
                            </span>
                          </label>
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:ring-1 ring-emerald-400 resize-none placeholder:text-slate-300"
                          />
                        </td>

                        {/* ASSIGNED TO */}
                        <td className="px-4 py-3 align-top">
                          <select
                            value={task.assignedTo}
                            onChange={(e) => handleRowChange(index, "assignedTo", e.target.value)}
                            className={`w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:ring-1 ring-emerald-400 ${(!task.isInternal && !task.project) ? "opacity-50 cursor-not-allowed" : ""}`}
                            disabled={!task.isInternal && !task.project}
                          >
                            <option value="">Select Member...</option>
                            {(() => {
                              let members = [];
                              if (task.isInternal) {
                                members = getAllUniqueUsers();
                              } else {
                                const selectedProject = clientProjectMap[task.client]?.find(p => p.name === task.project);
                                members = withCurrentUser(getProjectMembers(selectedProject));
                              }
                              return members.map((m, i) => (
                                <option key={i} value={m.email}>{m.email} ({m.role})</option>
                              ));
                            })()}
                          </select>
                        </td>

                        {/* DUE DATE */}
                        <td className="px-4 py-3 align-top">
                          <input
                            type="date"
                            value={task.targetDate}
                            onChange={(e) => handleRowChange(index, "targetDate", e.target.value)}
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
              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="bg-blue-900 p-6 flex justify-between items-center text-white">
              <h2 className="text-lg font-black uppercase tracking-widest flex items-center gap-3">
                <Upload size={24} /> Smart Paste Task Builder
              </h2>
              <button onClick={() => setShowSmartPasteModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
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
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">
                  {pasteColumnType ? `📋 Paste ${pasteColumnType} column` : "📋 Select a column, then paste"}
                </h3>
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder={pasteColumnType
                    ? `Paste ${pasteColumnType} values (one per line)`
                    : "Select a column button above, then paste"}
                  className="w-full h-32 p-4 text-sm font-mono bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 ring-emerald-400 resize-none"
                />
              </div>

              {/* DRAFT TASKS TABLE WITH DROPDOWNS */}
              {draftTasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">{draftTasks.length} Draft Tasks</h3>
                  <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-[10px] font-mono">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="border-b border-slate-200">
                          <th className="text-left px-3 py-2 text-slate-400">#</th>
                          <th className="text-left px-3 py-2 text-slate-400 min-w-[100px]">Title</th>
                          <th className="text-left px-3 py-2 text-slate-400 min-w-[90px]">Client</th>
                          <th className="text-left px-3 py-2 text-slate-400 min-w-[90px]">Project</th>
                          <th className="text-left px-3 py-2 text-slate-400 min-w-[120px]">Assigned To</th>
                          <th className="text-left px-3 py-2 text-slate-400 min-w-[100px]">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftTasks.map((task, idx) => {
                          const isInvalidClient = task.client.startsWith('[INVALID]');
                          const isInvalidProject = task.project.startsWith('[INVALID]');
                          const isInvalid = isInvalidClient || isInvalidProject;
                          
                          return (
                            <tr 
                              key={idx} 
                              className={`border-b border-slate-100 ${isInvalid ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                            >
                              <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                              <td className="px-3 py-2 text-slate-700 truncate max-w-[100px]" title={task.title}>{task.title || "—"}</td>
                              <td className={`px-3 py-2 truncate max-w-[90px] ${isInvalidClient ? 'text-red-600 font-bold' : 'text-slate-700'}`} title={task.client}>
                                {isInvalidClient ? '❌ ' : ''}{task.client || "—"}
                              </td>
                              <td className={`px-3 py-2 truncate max-w-[90px] ${isInvalidProject ? 'text-red-600 font-bold' : 'text-slate-700'}`} title={task.project}>
                                {isInvalidProject ? '❌ ' : ''}{task.project || "—"}
                              </td>
                              <td className="px-3 py-2 min-w-[120px]">
                                <select
                                  value={task.assignedTo}
                                  onChange={(e) => {
                                    const updated = [...draftTasks];
                                    updated[idx] = { ...updated[idx], assignedTo: e.target.value };
                                    setDraftTasks(updated);
                                  }}
                                  className="w-full px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 ring-emerald-400"
                                >
                                  <option value="">Select...</option>
                                  {(() => {
                                    let members = [];
                                    if (task.isInternal) {
                                      members = getAllUniqueUsers();
                                    } else {
                                      if (task.client && !task.client.startsWith('[INVALID]') && task.project && !task.project.startsWith('[INVALID]')) {
                                        const project = clientProjectMap[task.client]?.find(p => p.name === task.project);
                                        members = withCurrentUser(getProjectMembers(project) || []);
                                      }
                                    }
                                    return members.map((m, i) => (
                                      <option key={i} value={m.email}>{m.email.split('@')[0]}</option>
                                    ));
                                  })()}
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
                                  className="w-full px-2 py-1 text-[10px] font-bold bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 ring-emerald-400"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {(draftTasks.some(t => t.client.startsWith('[INVALID]')) || draftTasks.some(t => t.project.startsWith('[INVALID]'))) && (
                    <p className="text-[10px] text-red-600 font-semibold">
                      ⚠ {draftTasks.filter(t => t.client.startsWith('[INVALID]') || t.project.startsWith('[INVALID]')).length} tasks with invalid clients/projects won't be created
                    </p>
                  )}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
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
                    ✓ Create {draftTasks.filter(t => !t.client.startsWith('[INVALID]') && !t.project.startsWith('[INVALID]')).length} Tasks
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[85vh] flex flex-col">
            <div className="bg-slate-900 p-6 flex justify-between text-white border-b border-slate-800 shrink-0">
              <h2 className="font-black uppercase tracking-widest flex items-center gap-2"><Plus size={18} className="text-[#F58A4B]" /> Assign New Task</h2>
              <button onClick={() => setShowAssignModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAssignSubmit} className="p-10 space-y-6 overflow-y-auto custom-scrollbar">

              {/* TOGGLE TASK TYPE */}
              {(() => {
                // Determine if selected user is external
                let selectedUserRole = null;
                if (!assignData.isInternal && assignData.project && assignData.assignedTo) {
                  const selectedProject = clientProjectMap[assignData.client]?.find(p => p.name === assignData.project);
                  const members = withCurrentUser(getProjectMembers(selectedProject));
                  const selectedMember = members.find(m => m.email === assignData.assignedTo);
                  selectedUserRole = selectedMember?.role;
                }
                const isExternalSelected = selectedUserRole === "(EXTERNAL)";
                
                return (
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button
                      type="button"
                      onClick={() => setAssignData({ ...assignData, isRepeatable: false, isInternal: false })}
                      className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${!assignData.isRepeatable && !assignData.isInternal ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      Normal
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignData({ ...assignData, isRepeatable: true, isInternal: false })}
                      className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${assignData.isRepeatable ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                    >
                      Repeatable
                    </button>
                    {!isExternalSelected && (
                      <button
                        type="button"
                        onClick={() => setAssignData({ ...assignData, isRepeatable: false, isInternal: true })}
                        className={`flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${assignData.isInternal ? "bg-emerald-500 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                      >
                        Internal
                      </button>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Task Name</label>
                  <input required value={assignData.task} onChange={e => setAssignData({ ...assignData, task: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700" placeholder="Enter task name..." />
                </div>

                {!assignData.isInternal && (
                  <>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Client</label>
                      <select
                        required={!assignData.isInternal}
                        value={assignData.client}
                        onChange={e => setAssignData({ ...assignData, client: e.target.value, project: "", assignedTo: "" })}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700"
                      >
                        <option value="">Select Client</option>
                        {Object.keys(clientProjectMap).map((c, i) => <option key={i} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Project</label>
                      <select
                        required={!assignData.isInternal}
                        value={assignData.project}
                        onChange={e => setAssignData({ ...assignData, project: e.target.value, assignedTo: "" })}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700"
                        disabled={!assignData.client}
                      >
                        <option value="">Select Project</option>
                        {assignData.client && clientProjectMap[assignData.client]?.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className={assignData.isInternal ? "col-span-2" : "col-span-1"}>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Assigned To</label>
                  <select
                    required
                    value={assignData.assignedTo}
                    onChange={e => {
                      // Check if selected user is external
                      let members = [];
                      if (assignData.isInternal) {
                        members = getAllUniqueUsers();
                      } else {
                        const selectedProject = clientProjectMap[assignData.client]?.find(p => p.name === assignData.project);
                        members = withCurrentUser(getProjectMembers(selectedProject));
                      }
                      const selectedMember = members.find(m => m.email === e.target.value);
                      const isExternalUser = selectedMember?.role === "(EXTERNAL)";
                      
                      // If external user selected, reset to Normal task
                      if (isExternalUser) {
                        setAssignData({ ...assignData, assignedTo: e.target.value, isRepeatable: false, isInternal: false });
                      } else {
                        setAssignData({ ...assignData, assignedTo: e.target.value });
                      }
                    }}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700"
                    disabled={!assignData.isInternal && !assignData.project}
                  >
                    <option value="">Select Team Member</option>
                    {(() => {
                      let members = [];
                      if (assignData.isInternal) {
                        members = getAllUniqueUsers();
                      } else {
                        const selectedProject = clientProjectMap[assignData.client]?.find(p => p.name === assignData.project);
                        members = withCurrentUser(getProjectMembers(selectedProject));
                      }
                      return members.map((m, i) => (
                        <option key={i} value={m.email}>{m.email} ({m.role})</option>
                      ));
                    })()}
                  </select>
                </div>

                {!assignData.isRepeatable && (
                  <div className={assignData.isInternal ? "col-span-2" : "col-span-1"}>
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Target Date</label>
                    <input required={!assignData.isRepeatable} type="date" value={assignData.targetDate} onChange={e => setAssignData({ ...assignData, targetDate: e.target.value })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700" />
                  </div>
                )}

                {/* REPEATABLE SETTINGS (CONDITIONAL) */}
                {assignData.isRepeatable && (
                  <div className="col-span-2 bg-slate-50 p-5 rounded-2xl border border-dashed border-slate-300 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="col-span-2 text-[10px] font-black uppercase text-slate-400 -mb-2">Repeat Settings</div>

                    <div className="col-span-1">
                      <select
                        required={assignData.isRepeatable}
                        value={assignData.repeatFrequency}
                        onChange={(e) => setAssignData({ ...assignData, repeatFrequency: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-emerald-400 transition-all cursor-pointer"
                      >
                        <option value="">Frequency</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>

                    <div className="col-span-1">
                      <input
                        required={assignData.isRepeatable}
                        type="date"
                        placeholder="End Date"
                        value={assignData.repeatEndDate}
                        onChange={(e) => setAssignData({ ...assignData, repeatEndDate: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-emerald-400 transition-all cursor-pointer text-slate-600"
                      />
                    </div>

                    {/* WEEKLY: SHOW DAY */}
                    {assignData.repeatFrequency === 'Weekly' && (
                      <div className="col-span-2">
                        <select
                          required
                          value={assignData.repeatDay}
                          onChange={(e) => setAssignData({ ...assignData, repeatDay: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-emerald-400 transition-all cursor-pointer"
                        >
                          <option value="">Select Day</option>
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* MONTHLY: SHOW WEEK + DAY */}
                    {assignData.repeatFrequency === 'Monthly' && (
                      <>
                        <div className="col-span-1">
                          <select
                            required
                            value={assignData.repeatWeek}
                            onChange={(e) => setAssignData({ ...assignData, repeatWeek: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-emerald-400 transition-all cursor-pointer"
                          >
                            <option value="">Select Week</option>
                            {['First', 'Second', 'Third', 'Fourth', 'Last'].map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-1">
                          <select
                            required
                            value={assignData.repeatDay}
                            onChange={(e) => setAssignData({ ...assignData, repeatDay: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-emerald-400 transition-all cursor-pointer"
                          >
                            <option value="">Select Day</option>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Attachment (Optional)</label>
                  <input type="file" onChange={e => setAssignData({ ...assignData, file: e.target.files[0] })} className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700" />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-3xl text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex justify-center gap-2 items-center">
                  <Plus size={18} /> Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )
      }

      {showExcelImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className={`bg-white w-full ${mappingStep ? 'max-w-4xl' : 'max-w-md'} rounded-[2.5rem] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col`}>
            <div className="bg-slate-900 p-6 flex justify-between text-white border-b border-slate-800 shrink-0">
              <h2 className="font-black uppercase tracking-widest flex items-center gap-2">
                <FileText size={18} className="text-blue-400" /> 
                {mappingStep ? 'Map Excel Columns' : 'Import Tasks from Excel'}
              </h2>
              <button onClick={() => { setShowExcelImportModal(false); setExcelUploadStatus(null); setMappingStep(false); setExcelPreview(null); }}><X size={20} /></button>
            </div>
            <div className={`p-10 space-y-6 ${mappingStep ? 'overflow-y-auto flex-1' : ''}`}>
              {/* UPLOAD STEP */}
              {!mappingStep && !excelUploadStatus && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-600">Upload an Excel file (.xlsx) with your tasks. Supported columns:</p>
                  <ul className="text-xs text-slate-500 space-y-1 ml-4">
                    <li>• <strong>Task</strong> (required): Task title</li>
                    <li>• <strong>Client</strong>: Client name</li>
                    <li>• <strong>Project</strong>: Project name</li>
                    <li>• <strong>Assigned To</strong>: Email or assignee name</li>
                    <li>• <strong>Target Date</strong>: Due date (YYYY-MM-DD)</li>
                  </ul>
                  <label className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleExcelImport}
                      className="hidden"
                    />
                    <div className="text-center">
                      <FileText size={32} className="mx-auto text-blue-400 mb-2" />
                      <p className="text-xs font-bold text-slate-700">Click to upload or drag and drop</p>
                      <p className="text-[10px] text-slate-500">Only .xlsx files accepted</p>
                    </div>
                  </label>
                </div>
              )}

              {/* MAPPING STEP */}
              {mappingStep && excelPreview && !excelUploadStatus && (
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-blue-700">Map your Excel columns to Task fields</p>
                    <p className="text-xs text-blue-600 mt-1">Select which Excel column contains each field. Leave as "Skip" if not in your file.</p>
                  </div>

                  {/* FIELD MAPPINGS - One row per Task field */}
                  <div className="space-y-3">
                    {[
                      { field: 'task', label: 'Task (Required)', required: true },
                      { field: 'client', label: 'Client', required: false },
                      { field: 'project', label: 'Project', required: false },
                      { field: 'assigned_to', label: 'Assigned To', required: false },
                      { field: 'target_date', label: 'Target Date', required: false },
                      { field: 'description', label: 'Description', required: false }
                    ].map(({ field, label, required }) => (
                      <div key={field} className="flex items-end gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <label className="text-[10px] font-black uppercase text-slate-500">
                            {label} {required && <span className="text-red-500">*</span>}
                          </label>
                          <select
                            value={columnMapping[field] ?? ''}
                            onChange={(e) => {
                              const newMapping = { ...columnMapping };
                              if (e.target.value !== '') {
                                newMapping[field] = parseInt(e.target.value);
                              } else {
                                delete newMapping[field];
                              }
                              setColumnMapping(newMapping);
                            }}
                            className="w-full mt-2 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:ring-2 ring-blue-400 cursor-pointer"
                          >
                            <option value="">Skip</option>
                            {excelPreview.columns.map((colName, colIdx) => (
                              <option key={colIdx} value={colIdx}>
                                Column {colIdx + 1}: {colName || '(No Header)'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex justify-between gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={handleBackToUpload}
                      className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase hover:bg-slate-300 transition-all"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleConfirmMapping}
                      disabled={columnMapping['task'] === undefined || columnMapping['task'] === ''}
                      className="px-8 py-3 bg-blue-500 text-white rounded-lg text-xs font-bold uppercase hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Import Now
                    </button>
                  </div>
                </div>
              )}

              {/* LOADING STATE */}
              {excelUploadStatus?.loading && (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="animate-spin">
                    <Upload size={32} className="text-blue-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-600">Uploading and processing your file...</p>
                </div>
              )}
              {excelUploadStatus?.success && (
                <div className="space-y-4">
                  <div className={`rounded-lg p-4 border ${excelUploadStatus.backendErrors?.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    {excelUploadStatus.backendErrors?.length > 0 ? (
                      <>
                        <p className="text-sm font-bold text-amber-700">⚠️ Partial Import Success</p>
                        <p className="text-xs text-amber-600 mt-2">
                          {excelUploadStatus.tasksCreated} task{excelUploadStatus.tasksCreated !== 1 ? 's' : ''} created successfully, but {excelUploadStatus.backendErrors.length} row{excelUploadStatus.backendErrors.length !== 1 ? 's' : ''} had errors and were skipped.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-emerald-700">✓ Import Successful!</p>
                        <p className="text-xs text-emerald-600 mt-2">
                          {excelUploadStatus.tasksCreated} task{excelUploadStatus.tasksCreated !== 1 ? 's' : ''} created successfully.
                        </p>
                      </>
                    )}
                    
                    {/* Show detailed errors if any */}
                    {excelUploadStatus.backendErrors && excelUploadStatus.backendErrors.length > 0 && (
                      <div className="mt-3 text-[10px] bg-red-100 border border-red-300 rounded p-2 max-h-40 overflow-y-auto">
                        <p className="font-bold text-red-700 mb-1">Errors (rows skipped):</p>
                        {excelUploadStatus.backendErrors.map((err, i) => (
                          <p key={i} className="text-red-600 mb-1">
                            {typeof err === 'string' ? err : err.message || JSON.stringify(err)}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {/* Show warnings if any */}
                    {excelUploadStatus.warnings && excelUploadStatus.warnings.length > 0 && (
                      <div className="mt-3 text-[10px] bg-yellow-50 border border-yellow-200 rounded p-2 max-h-32 overflow-y-auto">
                        <p className="font-bold text-yellow-700 mb-1">Warnings:</p>
                        {excelUploadStatus.warnings.map((w, i) => (
                          <p key={i} className="text-yellow-600 mb-1">
                            {typeof w === 'string' ? w : w.message || JSON.stringify(w)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { 
                      setShowExcelImportModal(false); 
                      setExcelUploadStatus(null);
                      // Only refresh if we had some successful tasks
                      if (excelUploadStatus.tasksCreated > 0) {
                        setTimeout(() => {
                          window.location.reload();
                        }, 500);
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase hover:bg-black transition-all"
                  >
                    {excelUploadStatus.tasksCreated > 0 ? 'Reload & Close' : 'Close'}
                  </button>
                </div>
              )}
              {excelUploadStatus?.error && (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-bold text-red-700">✕ Import Failed</p>
                    <p className="text-xs text-red-600 mt-2">{excelUploadStatus.error}</p>
                    
                    {/* Show number of tasks created if any */}
                    {excelUploadStatus.tasksCreated > 0 && (
                      <p className="text-xs text-orange-600 mt-2">
                        ⚠️ {excelUploadStatus.tasksCreated} task{excelUploadStatus.tasksCreated !== 1 ? 's' : ''} were created before errors occurred
                      </p>
                    )}
                    
                    {/* Show detailed backend errors if available */}
                    {excelUploadStatus.backendErrors && excelUploadStatus.backendErrors.length > 0 && (
                      <div className="mt-3 text-[10px] bg-red-100 border border-red-300 rounded p-2 max-h-40 overflow-y-auto">
                        <p className="font-bold text-red-700 mb-1">Errors:</p>
                        {excelUploadStatus.backendErrors.map((err, i) => (
                          <p key={i} className="text-red-600 mb-1">
                            {typeof err === 'string' ? err : err.message || JSON.stringify(err)}
                          </p>
                        ))}
                      </div>
                    )}
                    
                    {/* Show warnings if any */}
                    {excelUploadStatus.warnings && excelUploadStatus.warnings.length > 0 && (
                      <div className="mt-3 text-[10px] bg-yellow-50 border border-yellow-200 rounded p-2 max-h-40 overflow-y-auto">
                        <p className="font-bold text-yellow-700 mb-1">Warnings:</p>
                        {excelUploadStatus.warnings.map((w, i) => (
                          <p key={i} className="text-yellow-600 mb-1">
                            {typeof w === 'string' ? w : w.message || JSON.stringify(w)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setExcelUploadStatus(null)}
                    className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase hover:bg-black transition-all"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div >
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
  onBulkComplete
}) => {
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

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

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => getTaskSortValue(b) - getTaskSortValue(a));
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [data, mode, title]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedData = sortedData.slice(startIndex, startIndex + PAGE_SIZE);

  return (
  <div className="max-w-7xl mx-auto mt-10 px-6">
    <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="px-8 py-5 border-b font-black uppercase text-xs tracking-widest bg-slate-50 text-slate-600 flex justify-between items-center">
        <div className="flex items-center">
          {title}
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="ml-16 px-4 py-2 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-all"
          >
            Previous
          </button>
        </div>

        <div className="flex items-center">
          {mode === 'overview' && selectedTasks?.length > 0 && (
            <button
              onClick={onBulkComplete}
              className="bg-emerald-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-emerald-600 transition-all animate-in fade-in mr-6"
            >
              Submit Selected ({selectedTasks.length})
            </button>
          )}

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-all"
          >
            Next
          </button>

          <span className="ml-6 bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[9px]">{sortedData.length} Records</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              {mode === 'overview' && (
                <th className="px-8 py-4">
                  <input
                    type="checkbox"
                    onChange={() => onToggleSelectAll(paginatedData)}
                    checked={paginatedData.length > 0 && paginatedData.every((task) => selectedTasks?.includes(task.id))}
                    className="cursor-pointer accent-slate-900"
                  />
                </th>
              )}
              <th className="px-8 py-4">Task ID</th>
              <th className="px-8 py-4">Task</th>
              {mode !== "assigned" && <th className="px-8 py-4">Project / Client</th>}
              {mode === "assigned" && <th className="px-8 py-4">Assigned To</th>}
              <th className="px-8 py-4">Assigned By</th>
              {mode === "overview" && <th className="px-8 py-4">Target Date</th>}
              {mode === "completed" && <th className="px-8 py-4">Complete Date</th>}
              <th className="px-8 py-4 text-center">Status</th>
              {(mode === "overview" || mode === "assigned") && <th className="px-8 py-4 text-center">Assigned PDF</th>}
              {mode === "completed" && <th className="px-8 py-4 text-center">Remarks</th>}
              {(mode === "completed" || mode === "assigned") && <th className="px-8 py-4 text-center">Complete PDF</th>}
              {mode === "overview" && <th className="px-8 py-4 text-center">Quick Action</th>}
              {mode === "overview" && <th className="px-8 py-4 text-center">Complete</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedData.map((t) => (
              <tr key={t.id} className={`transition-colors ${selectedTasks?.includes(t.id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                {mode === 'overview' && (
                  <td className="px-8 py-5">
                    <input
                      type="checkbox"
                      checked={selectedTasks?.includes(t.id) || false}
                      onChange={() => onToggleSelect(t.id)}
                      className="cursor-pointer accent-emerald-500 scale-125"
                    />
                  </td>
                )}
                <td className="px-8 py-5 font-bold text-slate-500 text-xs">{t.task_id}</td>
                <td className="px-8 py-5 font-semibold text-sm text-slate-800">{t.title}</td>

                {mode !== "assigned" && <td className="px-8 py-5 text-xs font-medium text-slate-500 italic">{t.project_name} / {t.client_name}</td>}
                {mode === "assigned" && <td className="px-8 py-5 text-sm font-medium">{t.assigned_to_name}</td>}
                <td className="px-8 py-5 text-xs font-medium">{t.assigned_by_name}</td>
                {mode === "overview" && <td className="px-8 py-5 text-xs font-bold text-orange-400">{t.target_date}</td>}
                {mode === "completed" && <td className="px-8 py-5 text-xs font-bold text-emerald-500">{t.completion_date}</td>}
                <td className="px-8 py-5 text-center"><StatusBadge status={t.status} /></td>
                {(mode === "overview" || mode === "assigned") && (
                  <td className="px-8 py-5 text-center">
                    {t.assigned_file ? (
                      <a
                        href={getFileUrl(t.assigned_file)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center"
                        title="View Assigned PDF"
                      >
                        <Download size={18} className="text-blue-500 hover:scale-110 transition-transform" />
                      </a>
                    ) : "—"}
                  </td>
                )}
                {mode === "completed" && <td className="px-8 py-5 text-xs font-medium text-slate-600 max-w-[200px] truncate" title={t.remarks}>{t.remarks || "—"}</td>}
                {(mode === "completed" || mode === "assigned") && (
                  <td className="px-8 py-5 text-center">
                    {t.completion_file ? (
                      <a
                        href={getFileUrl(t.completion_file)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center"
                        title="View Completion PDF"
                      >
                        <Download size={18} className="text-emerald-500 hover:scale-110 transition-transform" />
                      </a>
                    ) : "—"}
                  </td>
                )}
                {mode === "overview" && (
                  <>
                    <td className="px-8 py-5 text-center">
                      <button onClick={() => onQuickComplete(t)} className="bg-emerald-100 text-emerald-600 p-2 rounded-full hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Quick Complete">
                        <CheckCircle size={18} />
                      </button>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button onClick={() => onReportComplete(t)} className="px-4 py-2 rounded-lg text-xs font-bold uppercase bg-slate-900 text-white shadow-md hover:bg-black transition-all">
                        Complete
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  </div>
  );
};

/* ===== HELPER COMPONENTS (ORIGINAL STYLE) ===== */
const Stat = ({ title, value, icon, color }) => (
  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-4 flex flex-col transition-all hover:translate-y-[-2px] hover:shadow-lg" style={{ borderLeft: `6px solid ${color}` }}>
    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
    <div className="flex justify-between items-end mt-1">
      <h2 className="text-3xl font-black text-slate-900">{value}</h2>
      <div className="text-slate-200 opacity-50">{icon}</div>
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