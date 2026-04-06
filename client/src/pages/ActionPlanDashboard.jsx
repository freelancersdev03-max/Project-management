import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  Filter, BarChart3, Plus, User, LayoutGrid,
  CheckCircle, Clock, AlertCircle, TrendingUp,
  FileText, Paperclip, X, Send, ChevronRight, Upload
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import { resolveMediaUrl } from '../utils/media';
import { formatDateDDMMYYYY } from '../utils/dateFormat';

const ActionPlanDashboard = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

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
    visit_agenda_id: "",
    assign_file: null
  });

  // Completion Modal State
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionFile, setCompletionFile] = useState(null);

  // Filter State
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, MY, HQEPL, CLIENT
  const [selectedProjects, setSelectedProjects] = useState([]); // Array of selected project IDs
  const [includeAllProjects, setIncludeAllProjects] = useState(true); // All projects selected
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [internalIds, setInternalIds] = useState([]);
  const [externalIds, setExternalIds] = useState([]);

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
        name: proj.name || `Project ${proj.id}`
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
        // Fetch visit agendas for the first project
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
        if (p.created_by) {
          membersMap.set(p.created_by, {
            id: p.created_by,
            username: p.created_by_name || "Creator",
            email: p.created_by_email || "",
            type: 'INTERNAL'
          });
          iIds.add(p.created_by);
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
      if (newTask.visit_agenda_id) {
        formData.append("visit_agenda_id", newTask.visit_agenda_id);
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
      setNewTask({ task: "", target_date: "", start_date: new Date().toISOString().split('T')[0], assigned_to: "", visit_agenda_id: "", assign_file: null });
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
        api.get(`/projects/${projectId}/visit-agendas/`),
        api.get(`/visit-agenda/clients/${clientId}/logs/`),
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
      setNewTask(prev => ({ ...prev, visit_agenda_id: "" }));
    } catch (error) {
      console.error("Error fetching visit agendas:", error);
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
    // Apply client filter (ALL, MY, HQEPL, CLIENT)
    if (activeFilter === "MY") {
      if (task.assigned_to !== currentUser?.id) return false;
    } else if (activeFilter === "HQEPL") {
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

  const chartData = [
    { name: "On Time", value: onTime, color: "#22c55e" },
    // { name: "In Progress", value: inProgress, color: "#3b82f6" }, // Removed as requested
    { name: "Delayed", value: delayed, color: "#facc15" },
    { name: "Overdue", value: overDue, color: "#ef4444" },
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


  if (loading) return <div className="p-10 text-center">Loading Action Plan...</div>;

  return (
    <div className="h-screen w-screen bg-slate-50/50 flex overflow-hidden font-sans text-slate-800">
      <Sidebar />

      <div className="flex-1 overflow-y-auto">
        <main className="max-w-full xl:max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-12 gap-4 pb-20">

          <div className="col-span-12 flex flex-col sm:flex-row gap-4 mb-2 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {['ALL', 'MY', 'HQEPL', 'CLIENT'].map((filter) => {
                const label = filter === 'ALL' ? 'All Actions'
                  : filter === 'MY' ? 'My Actions'
                    : filter === 'HQEPL' ? 'HQEPL Actions'
                      : 'Client Actions';
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex-1 sm:flex-none ${isActive
                      ? 'bg-slate-900 text-white shadow-lg scale-105'
                      : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300 hover:text-slate-600'
                      }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* PROJECT FILTER CARD */}
          {projectOptions.length > 0 && (
            <div className="col-span-12 lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center flex flex-col max-h-[300px] lg:max-h-[400px]">
              <h3 className="font-black text-slate-900 uppercase text-xs mb-3 tracking-widest text-left shrink-0">Project Filter</h3>
              {loading ? <p className="text-xs text-slate-400">Loading...</p> : (
                <div className="text-left flex-1 overflow-y-auto pr-1">
                  <label className="flex items-center gap-2 text-[12px] text-slate-700 mb-2 cursor-pointer font-semibold">
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
                      className="accent-slate-900"
                    />
                    All Projects
                  </label>
                  {projectOptions.map((proj) => (
                    <label key={proj.id} className="flex items-center gap-2 text-[12px] text-slate-600 mb-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeAllProjects || selectedProjects.includes(proj.id)}
                        onChange={() => handleProjectSelection(proj.id)}
                        className="accent-slate-900"
                      />
                      {proj.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PIE CHART CARD */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-black text-slate-900 uppercase text-xs">
                Action Plan Distribution
              </h2>
              <div className="p-2 bg-slate-50 rounded-lg text-[#F58A4B]">
                <BarChart3 size={16} />
              </div>
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
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    allowEscapeViewBox={{ x: true, y: true }}
                    wrapperStyle={{ zIndex: 60 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* OTC Score Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OTC</span>
                <span className="text-3xl font-black text-slate-900">{otcScore}%</span>
              </div>
            </div>
          </div>

          {/* KPI CARDS GRID */}
          <div className="col-span-12 lg:col-span-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
            <KPICard title="Total Action" value={totalTasks} color="border-indigo-500" icon={<LayoutGrid size={18} />} />
            <KPICard title="On Time Action" value={onTime} color="border-green-500" icon={<CheckCircle size={18} />} />
            <KPICard title="Delay Completion" value={delayed} color="border-yellow-400" icon={<Clock size={18} />} />
            <KPICard title="In Progress" value={inProgress} color="border-blue-500" icon={<TrendingUp size={18} />} />
            <KPICard title="Over Due" value={overDue} color="border-red-500" icon={<AlertCircle size={18} />} />
            <KPICard title="Efficiency" value={`${efficiency}%`} color="border-purple-500" icon={<User size={18} />} />
          </div>

          {/* ===== FILTERS & ACTION PLAN TABLE SECTION ===== */}
          <div className="col-span-12 mt-4 space-y-4">



            <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tighter uppercase italic">Action Matrix</h2>
                  <p className="text-slate-400 text-[8px] sm:text-[9px] font-bold tracking-[0.2em] uppercase mt-0.5">Execution & Monitoring</p>
                </div>

                {!isExternal && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#F58A4B] transition-all shadow-lg active:scale-95"
                  >
                    <Plus size={14} /> New Action Entry
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Sr. No.</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action / Task</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Assign To</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Target Date</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Completion Date</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Task Doc</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Completion Doc</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Select</th>
                      <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Complete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTasks.map((item, idx) => {
                      const normalizedStatus = item.effective_status;
                      const isCompleted = Boolean(item.completion_date) || ['on_time', 'delay_completion', 'completed'].includes(normalizedStatus);
                      const isMyTask = Number(item.assigned_to) === Number(currentUser?.id);
                      const canComplete = isMyTask && !isCompleted;
                      const isSelected = selectedTaskIds.includes(item.id);

                      return (
                      <tr key={item.id} className={`transition-all group ${isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/30'}`}>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[10px] font-black text-slate-300">{idx + 1}</span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900 text-sm group-hover:text-[#F58A4B] transition-colors">{item.task}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#F58A4B]/10 flex items-center justify-center text-[8px] font-black text-[#F58A4B] uppercase">
                              {isExternal && internalIds.includes(item.assigned_to)
                                ? "H"
                                : (item.assigned_to_name ? item.assigned_to_name.charAt(0) : "?")}
                            </div>
                            <span className="text-[10px] font-black text-slate-900 tracking-tight">
                              {isExternal && internalIds.includes(item.assigned_to)
                                ? "HQEPL Team"
                                : (item.assigned_to_name || `User ${item.assigned_to}`)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-block px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 border border-slate-100">
                            {formatDateDDMMYYYY(item.target_date)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="inline-block px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 border border-slate-100">
                            {formatDateDDMMYYYY(item.completion_date)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          {item.assign_file ? (
                            <a href={resolveMediaUrl(item.assign_file)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-[#F58A4B] hover:text-white transition-all" title="View Assignment Doc">
                              <FileText size={14} />
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {item.completion_file ? (
                            <a href={resolveMediaUrl(item.completion_file)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-green-500 hover:text-white transition-all" title="View Completion Doc">
                              <CheckCircle size={14} />
                            </a>
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-black uppercase ${activeFilter === 'MY'
                              ? (isCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600')
                              : (normalizedStatus === 'on_time' ? 'bg-green-100 text-green-600' :
                                normalizedStatus === 'delay_completion' ? 'bg-yellow-100 text-yellow-600' :
                                  normalizedStatus === 'over_due' ? 'bg-red-100 text-red-600' :
                                    'bg-blue-100 text-blue-600')
                              }`}>
                              {activeFilter === 'MY'
                                ? (isCompleted ? 'COMPLETED' : 'IN PROGRESS')
                                : normalizedStatus.replace('_', ' ')}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          {canComplete ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTaskSelection(item.id)}
                              className="cursor-pointer accent-emerald-500 scale-105"
                            />
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {canComplete ? (
                            <button
                              onClick={() => initiateCompleteTask(item)}
                              className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-white shadow-md hover:bg-black transition-all"
                            >
                              COMPLETE
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    )})}
                    {filteredTasks.length === 0 && (
                      <tr>
                        <td colSpan="10" className="text-center py-6 text-slate-400 font-bold text-xs">No tasks found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </main >

        {/* ===== FORM MODAL ===== */}
        {
          isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
              <div className="bg-white w-full max-w-xl max-h-[95vh] flex flex-col rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-4 sm:p-6 flex justify-between items-center border-b border-slate-100 shrink-0">
                  <h3 className="text-base sm:text-lg font-black uppercase italic tracking-tighter">New Action Plan Entry</h3>
                  <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={18} />
                  </button>
                </div>
                <div className="overflow-y-auto p-4 sm:p-6">
                  <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Project</label>
                    <select
                      value={selectedProjectId}
                      onChange={handleProjectSelect}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none appearance-none"
                      required
                    >
                      {projectOptions.map((proj) => (
                        <option key={proj.id} value={proj.id}>{proj.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Visit Agenda (Optional)</label>
                    <select
                      value={newTask.visit_agenda_id}
                      onChange={e => setNewTask({ ...newTask, visit_agenda_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none appearance-none"
                    >
                      <option value="">Select Visit Agenda</option>
                      {visitAgendaOptions.map((agenda, index) => (
                        <option key={`${agenda.id}-${agenda.visit_date}-${index}`} value={agenda.id}>{formatDateDDMMYYYY(agenda.visit_date)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Action Description</label>
                    <input
                      type="text"
                      value={newTask.task}
                      onChange={e => setNewTask({ ...newTask, task: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-[#F58A4B] outline-none transition-all font-bold text-sm"
                      placeholder="What needs to be done?"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Start Date</label>
                      <input
                        type="date"
                        value={newTask.start_date}
                        onChange={e => setNewTask({ ...newTask, start_date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Date</label>
                      <input
                        type="date"
                        value={newTask.target_date}
                        onChange={e => setNewTask({ ...newTask, target_date: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1.5 col-span-1 sm:col-span-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Assign To</label>
                      <select
                        value={newTask.assigned_to}
                        onChange={e => setNewTask({ ...newTask, assigned_to: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none appearance-none"
                        required
                      >
                        <option value="">Select Member</option>
                        {projectMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.username || m.email} ({m.email})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Attachment (Document/File)</label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-[#F58A4B] outline-none transition-all font-bold text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#F58A4B]/10 file:text-[#F58A4B] hover:file:bg-[#F58A4B]/20"
                    />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-[#F58A4B] transition-all shadow-lg mt-2 text-xs">
                    Submit Action Plan
                  </button>
                  </form>
                </div>
              </div>
            </div>
          )
        }

        {/* ===== COMPLETION MODAL ===== */}
        {completeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md max-h-[95vh] flex flex-col rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-4 sm:p-6 border-b border-slate-100 shrink-0">
                <h3 className="text-base sm:text-lg font-black uppercase italic tracking-tighter">Complete Task</h3>
                <p className="text-xs text-slate-500 mt-1 truncate">{selectedTask?.task}</p>
              </div>

              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Completion Document</label>
                  <input
                    type="file"
                    onChange={handleCompletionFileChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-green-500 outline-none transition-all font-bold text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-600 hover:file:bg-green-100"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => setCompleteModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmCompleteTask}
                    className="px-5 py-2.5 rounded-xl bg-green-500 text-white font-bold text-xs hover:bg-green-600 shadow-lg shadow-green-200"
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

const KPICard = ({ title, value, color, icon }) => (
  <div className={`bg-white rounded-[1.5rem] shadow-sm p-4 border-l-[4px] ${color} border border-y-slate-100 border-r-slate-100 flex items-center justify-between group hover:shadow-md transition-all`}>
    <div>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{title}</span>
      <h2 className="text-2xl font-black text-slate-900 tracking-tighter mt-0.5">{value}</h2>
    </div>
    <div className="text-slate-200 group-hover:text-slate-900 transition-colors">
      {icon}
    </div>
  </div>
);

export default ActionPlanDashboard;