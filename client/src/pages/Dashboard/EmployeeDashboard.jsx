import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../../components/Navbar";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Calendar, Search, Filter, ClipboardList, Plus, CheckCircle,
  LayoutGrid, Clock, AlertCircle, TrendingUp, User, Download,
  X, Upload, SearchCode, SendHorizonal, FileCheck, BarChart3
} from "lucide-react";

const EmployeeDashboard = () => {
  // MODAL STATES
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

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
    return Array.from(users.values());
  };

  const chartData = [
    { name: "On Time", value: 40, color: "#22c55e" },
    { name: "In Progress", value: 30, color: "#3b82f6" },
    { name: "Delayed", value: 20, color: "#facc15" },
    { name: "Overdue", value: 10, color: "#ef4444" },
  ];

  // DATA ARRAYS
  // STATE FOR DYNAMIC DATA
  const [userName, setUserName] = useState("Employee");
  const [clientProjectMap, setClientProjectMap] = useState({});
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
    const isMine = (t) => (t.assigned_to_name === user.username || t.assigned_to === user.id);
    const isSelfAssigned = (t) =>
      (t.assigned_by_name === user.username || t.assigned_by === user.id) && isMine(t);

    const my_active = tasks.filter(t => (isMine(t) || isSelfAssigned(t)) && t.status !== 'Completed');
    const my_completed = tasks.filter(t => (isMine(t) || isSelfAssigned(t)) && t.status === 'Completed');
    const delegated = tasks.filter(t =>
      (t.assigned_by_name === user.username || t.assigned_by === user.id) && (t.assigned_to !== user.id)
    );

    return { my_active, my_completed, delegated };
  };

  // FETCH DATA ON MOUNT
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch User Profile
        const userRes = await axios.get("http://127.0.0.1:8000/api/me/", { headers });
        setUserName(userRes.data.username || "Employee");

        // 2. Fetch Projects
        const projRes = await axios.get("http://127.0.0.1:8000/api/projects/", { headers });
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
        const statsRes = await axios.get("http://127.0.0.1:8000/api/tasks/dashboard_stats/", { headers });
        setDashboardStats(statsRes.data);

        // 4. Fetch All Tasks (Assigned To & By)
        const tasksRes = await axios.get("http://127.0.0.1:8000/api/tasks/", { headers });

        // Split tasks
        const allFetchedTasks = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);

        const { my_active, my_completed, delegated } = splitTasksForUser(allFetchedTasks, userRes.data);
        setMyTasks(my_active);
        setCompletedTasks(my_completed);
        setDelegatedTasks(delegated);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);


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
      const token = localStorage.getItem("token");
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

      const token = localStorage.getItem("token");
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
      const token = localStorage.getItem("token");
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
        selectedUser = getProjectMembers(selectedProjectObj).find(m => m.email === assignData.assignedTo);
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
      const token = localStorage.getItem("token");
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
          selectedUser = getProjectMembers(selectedProjectObj).find(m => m.email === task.assignedTo);
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
      const token = localStorage.getItem("token");
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

  /* ===== SMART PASTE LOGIC ===== */
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pasteContent, setPasteContent] = useState("");

  const handleSmartPaste = () => {
    if (!pasteContent.trim()) return;

    const rows = pasteContent.trim().split('\n');
    const newTasks = [];
    const errors = [];

    rows.forEach((row, index) => {
      // Expected Format: Client | Project | Task | Assigned To | Date
      const cols = row.split('\t').map(c => c.trim());
      if (cols.length < 3) return; // Skip invalid rows

      const [pClient, pProject, pTitle, pAssignedTo, pDate] = cols;
      let taskObj = {
        title: pTitle,
        targetDate: pDate || new Date().toISOString().split('T')[0],
        file: null,
        isInternal: false
      };

      // internal task check
      if (pClient.toLowerCase() === 'internal' || (!pProject && !pClient)) {
        taskObj.isInternal = true;
        taskObj.client = "";
        taskObj.project = "";

        // Resolve User
        const allUsers = getAllUniqueUsers();
        const foundUser = allUsers.find(u => u.email === pAssignedTo || u.username === pAssignedTo);
        if (foundUser) {
          taskObj.assignedTo = foundUser.email;
        } else {
          errors.push(`Row ${index + 1}: User '${pAssignedTo}' not found for Internal Task.`);
          return;
        }

      } else {
        // Normal Task Matching
        const clients = Object.keys(clientProjectMap);
        // Fuzzyish match for client (exact for now)
        const matchedClient = clients.find(c => c.toLowerCase() === pClient.toLowerCase());

        if (!matchedClient) {
          errors.push(`Row ${index + 1}: Client '${pClient}' not found.`);
          return;
        }

        const matchedProject = clientProjectMap[matchedClient].find(p => p.name.toLowerCase() === pProject.toLowerCase());
        if (!matchedProject) {
          errors.push(`Row ${index + 1}: Project '${pProject}' not found in '${matchedClient}'.`);
          return;
        }

        taskObj.client = matchedClient;
        taskObj.project = matchedProject.name;

        // Resolve User in Project
        const foundUser = getProjectMembers(matchedProject).find(
          u => u.email === pAssignedTo || u.username === pAssignedTo
        );
        if (foundUser) {
          taskObj.assignedTo = foundUser.email;
        } else {
          errors.push(`Row ${index + 1}: User '${pAssignedTo}' not found in project.`);
          return;
        }
      }

      newTasks.push(taskObj);
    });

    if (errors.length > 0) {
      alert(`Some rows could not be added:\n${errors.slice(0, 5).join('\n')}\n...`);
    }

    if (newTasks.length > 0) {
      setBulkTasks(prev => [...prev, ...newTasks]);
      setPasteContent("");
      setShowPasteInput(false);
      alert(`Successfully added ${newTasks.length} tasks!`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      <Navbar hideLogin={true} />

      {/* ===== HEADER ===== */}
      <div className="max-w-7xl mx-auto mt-5 bg-slate-900 rounded-2xl px-6 py-4 grid grid-cols-3 items-center text-white shadow-xl">
        {/* Empty div to balance the grid (Left) */}
        <div className="hidden md:block"></div>

        {/* Username in the exact center (Middle) */}
        <h1 className="text-xl font-extrabold text-[#F58A4B] text-center">
          {userName}'s Dashboard
        </h1>

        {/* Date range on the right (Right) */}
        <div className="flex items-center justify-end gap-2 text-xs text-slate-300">
          <Calendar size={14} />
          <span className="hidden sm:inline">Select date range</span>
        </div>
      </div>

      {/* ===== KPI & CHARTS GRID (FULL CARDS KEPT) ===== */}
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 mt-6 px-6">
        <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center">
          <h3 className="font-black text-slate-900 uppercase text-xs mb-3 tracking-widest text-left">Client Filter</h3>
          {loading ? <p className="text-xs text-slate-400">Loading...</p> : Object.keys(clientProjectMap).map((client, i) => (
            <label key={i} className="flex items-center gap-2 text-[12px] text-slate-600 mb-2 cursor-pointer">
              <input type="checkbox" defaultChecked className="accent-slate-900" /> {client}
            </label>
          ))}
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
                  data={dashboardStats.chart_data}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  stroke="none"
                >
                  {dashboardStats.chart_data.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            {/* OTC CENTER OVERLAY */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OTC</span>
              <span className="text-3xl font-black text-slate-900">{dashboardStats.otc_score}</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
          <Stat title="Total Task" value={dashboardStats.total_tasks} color="#6366f1" icon={<LayoutGrid size={18} />} />
          <Stat title="On Time Completion" value={dashboardStats.on_time_count} color="#22c55e" icon={<CheckCircle size={18} />} />
          <Stat title="Overdue" value={dashboardStats.chart_data.find(d => d.name === "Overdue")?.value || 0} color="#ef4444" icon={<AlertCircle size={18} />} />
          <Stat title="Delayed" value={dashboardStats.chart_data.find(d => d.name === "Delayed")?.value || 0} color="#facc15" icon={<Clock size={18} />} />
          <Stat title="In Progress" value={dashboardStats.chart_data.find(d => d.name === "In Progress")?.value || 0} color="#3b82f6" icon={<TrendingUp size={18} />} />
          <Stat title="ATS SCORE" value={dashboardStats.ats_score} color="#a855f7" icon={<TrendingUp size={18} />} />
        </div>
      </div>

      {/* ===== ACTION BAR (FMS instead of Complete) ===== */}
      <div className="flex justify-center mt-8 gap-20 items-center">
        <MidBtn label="FILTER" icon={<Filter size={14} />} />
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
        data={filterTasks(myTasks)}
        mode="overview"
        onQuickComplete={handleDirectComplete}
        onReportComplete={openCompletionModal}
        selectedTasks={selectedTasks}
        onToggleSelect={toggleTaskSelection}
        onToggleSelectAll={toggleSelectAll}
        onBulkComplete={handleBulkComplete}
      />
      {/* ===== COMPLETED TASKS TABLE (Tasks Assigned TO Me - Completed) ===== */}
      <Table title="Completed Tasks" data={filterTasks(completedTasks)} mode="completed" />
      {/* ===== ASSIGNED TASKS TABLE (Tasks I Assigned to Others) ===== */}
      <Table title="Delegated Tasks" data={filterTasks(delegatedTasks)} mode="assigned" />
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
                    <SendHorizonal size={18} /> Submit Final Report
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
              <div className="flex items-center gap-4">
                <h2 className="font-black uppercase tracking-widest flex items-center gap-2"><ClipboardList size={18} className="text-[#F58A4B]" /> Bulk Assign Tasks</h2>
                <button
                  onClick={() => setShowPasteInput(!showPasteInput)}
                  className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-lg border border-emerald-500/50 hover:bg-emerald-500/30 transition-all"
                >
                  {showPasteInput ? "Hide Paste" : "Smart Paste"}
                </button>
              </div>
              <button onClick={() => setShowBulkModal(false)}><X size={20} /></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">

              {/* SMART PASTE INPUT AREA */}
              {showPasteInput && (
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest pl-1">Paste Data (Expected: Client | Project | Task | AssignedTo | Date)</h3>
                  </div>
                  <textarea
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    placeholder={`Example:\nClientA\tProjectX\tTask 1\tuser@email.com\t2024-10-10\nInternal\t\tInternal Task 1\tuser@email.com\t2024-10-12`}
                    className="w-full h-32 p-3 text-xs font-mono bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 ring-emerald-400 resize-none"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleSmartPaste}
                      className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase hover:bg-black transition-all"
                    >
                      Process Data
                    </button>
                  </div>
                </div>
              )}

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
                                members = getProjectMembers(selectedProject);
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
                  const members = getProjectMembers(selectedProject);
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
                        members = getProjectMembers(selectedProject);
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
                        members = getProjectMembers(selectedProject);
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
}) => (
  <div className="max-w-7xl mx-auto mt-10 px-6">
    <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="px-8 py-5 border-b font-black uppercase text-xs tracking-widest bg-slate-50 text-slate-600 flex justify-between items-center">
        {title}
        <div className="flex items-center gap-4">
          {mode === 'overview' && selectedTasks?.length > 0 && (
            <button
              onClick={onBulkComplete}
              className="bg-emerald-500 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md hover:bg-emerald-600 transition-all animate-in fade-in"
            >
              Submit Selected ({selectedTasks.length})
            </button>
          )}
          <span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-[9px]">{data.length} Records</span>
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
                    onChange={() => onToggleSelectAll(data)}
                    checked={data.length > 0 && selectedTasks?.length === data.length}
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
            {data.map((t) => (
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
                {(mode === "overview" || mode === "assigned") && <td className="px-8 py-5 text-center">{t.assigned_file ? <Download size={18} className="mx-auto text-blue-500 cursor-pointer hover:scale-110" /> : "—"}</td>}
                {mode === "completed" && <td className="px-8 py-5 text-xs font-medium text-slate-600 max-w-[200px] truncate" title={t.remarks}>{t.remarks || "—"}</td>}
                {(mode === "completed" || mode === "assigned") && <td className="px-8 py-5 text-center">{t.completion_file ? <Download size={18} className="mx-auto text-emerald-500 cursor-pointer hover:scale-110" /> : "—"}</td>}
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

/* ===== AUTOCOMPLETE INPUT COMPONENT ===== */
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