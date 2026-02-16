import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  Filter, BarChart3, Plus, User, LayoutGrid,
  CheckCircle, Clock, AlertCircle, TrendingUp,
  FileText, Paperclip, X, Send, Download, ChevronRight, Upload
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';

const ActionPlanDashboard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionTasks, setActionTasks] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [projectOptions, setProjectOptions] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null); // { id, role }

  // Form State
  // Form State
  const [newTask, setNewTask] = useState({
    task: "",
    target_date: "",
    start_date: new Date().toISOString().split('T')[0], // Default today
    assigned_to: "",
    assign_file: null
  });

  // Completion Modal State
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [completionFile, setCompletionFile] = useState(null);

  // Filter State
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, MY, HQEPL, CLIENT
  const [internalIds, setInternalIds] = useState([]);
  const [externalIds, setExternalIds] = useState([]);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (projectId) setSelectedProjectId(String(projectId));
  }, [projectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    fetchData(selectedProjectId);
    setNewTask((prev) => ({
      ...prev,
      assigned_to: "",
      assign_file: null
    }));
  }, [selectedProjectId]);

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

  const fetchData = async (activeProjectId) => {
    try {
      setLoading(true);
      const role = (localStorage.getItem('role') || '').toUpperCase();
      let projectEndpoint = `/projects/${activeProjectId}/`;

      if (role === 'SGM') projectEndpoint = `/sgm/projects/${activeProjectId}/`;
      if (role === 'EMPLOYEE' || role === 'EXTERNAL') projectEndpoint = `/employees/projects/${activeProjectId}/`;

      const [tasksRes, projectRes] = await Promise.all([
        api.get(`/projects/${activeProjectId}/tasks/`),
        api.get(projectEndpoint)
      ]);

      setActionTasks(tasksRes.data);

      const p = projectRes.data;
      const baseOption = { id: String(activeProjectId), name: p.name || "Current Project" };
      const members = [];
      const iIds = [];
      const eIds = [];

      // 1. SGM (Internal)
      if (p.assigned_sgm_details) {
        members.push({ ...p.assigned_sgm_details, type: 'INTERNAL' });
        iIds.push(p.assigned_sgm_details.id);
      }

      // 2. Internal Team
      if (Array.isArray(p.team_members_details)) {
        members.push(...p.team_members_details.map(m => ({ ...m, type: 'INTERNAL' })));
        iIds.push(...p.team_members_details.map(m => m.id));
      }

      // 3. External Team
      if (Array.isArray(p.external_team_details)) {
        members.push(...p.external_team_details.map(m => ({ ...m, type: 'EXTERNAL' })));
        eIds.push(...p.external_team_details.map(m => m.id));
      }

      // 4. External Lead
      if (p.external_lead) {
        const lead = {
          id: p.external_lead,
          username: p.external_lead_name || "External Lead",
          email: p.external_lead_email || "",
          type: 'EXTERNAL'
        };
        members.push(lead);
        eIds.push(p.external_lead);
      }

      // 5. Creator (Internal)
      if (p.created_by) {
        members.push({
          id: p.created_by,
          username: "Creator",
          email: p.created_by_email || "",
          type: 'INTERNAL'
        });
        iIds.push(p.created_by);
      }

      // Deduplicate by ID
      const uniqueMembers = Array.from(new Map(members.map(m => [m.id, m])).values());
      setProjectMembers(uniqueMembers);
      setInternalIds([...new Set(iIds)]);
      setExternalIds([...new Set(eIds)]);

      const clientId = p.client?.id || p.client;
      if (clientId) {
        try {
          let listEndpoint = '/projects/';
          if (role === 'EMPLOYEE' || role === 'EXTERNAL') listEndpoint = '/employees/my-projects/';

          const projectListRes = await api.get(listEndpoint);
          const clientProjects = projectListRes.data.filter(
            proj => String(proj.client?.id || proj.client) === String(clientId)
          );

          const options = clientProjects.map(proj => ({
            id: String(proj.id),
            name: proj.name || `Project ${proj.id}`
          }));

          const hasActive = options.some(opt => opt.id === String(activeProjectId));
          setProjectOptions(hasActive ? options : [baseOption, ...options]);
        } catch (listError) {
          setProjectOptions([baseOption]);
        }
      } else {
        setProjectOptions([baseOption]);
      }

      console.log("PROJECT DATA:", projectRes.data);


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
      if (newTask.assign_file) {
        formData.append("assign_file", newTask.assign_file);
      }

      await api.post(`/projects/${selectedProjectId}/tasks/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setIsModalOpen(false);
      setNewTask({ task: "", target_date: "", start_date: new Date().toISOString().split('T')[0], assigned_to: "", assign_file: null });
      fetchData(selectedProjectId); // Refresh list
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

  const handleProjectSelect = (e) => {
    const nextProjectId = e.target.value;
    if (!nextProjectId || nextProjectId === String(selectedProjectId)) return;
    setSelectedProjectId(nextProjectId);
    navigate(`/projects/${nextProjectId}/actionplan`);
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

      const today = new Date().toISOString().split('T')[0];
      const target = selectedTask.target_date;

      let status = "on_time";
      if (today > target) status = "delay_completion";

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

      fetchData(selectedProjectId); // Refresh
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
    if (activeFilter === "MY") return task.assigned_to === currentUser?.id;
    if (activeFilter === "HQEPL") return internalIds.includes(task.assigned_to);
    if (activeFilter === "CLIENT") return externalIds.includes(task.assigned_to);
    return true; // ALL
  }).sort((a, b) => {
    // Sort Completed tasks to the bottom
    const isCompleteA = ['on_time', 'delay_completion'].includes(a.status);
    const isCompleteB = ['on_time', 'delay_completion'].includes(b.status);

    if (isCompleteA !== isCompleteB) {
      return isCompleteA ? 1 : -1;
    }

    // Sort Overdue to the top
    if (a.status === 'over_due' && b.status !== 'over_due') return -1;
    if (a.status !== 'over_due' && b.status === 'over_due') return 1;

    return 0;
  });

  // Derived Chart Data
  const getStatusCount = (status) => filteredTasks.filter(t => t.status === status).length;

  // KPIs
  const totalTasks = filteredTasks.length;
  const onTime = getStatusCount("on_time");
  const delayed = getStatusCount("delay_completion");
  const inProgress = getStatusCount("in_progress");
  const overDue = getStatusCount("over_due");

  // Percentage ATS Score Logic
  const calculateTaskATS = (task) => {
    // Rule 4: In Progress -> Null
    if (task.status === 'in_progress') return null;

    // Rule 5: Overdue -> 0
    if (task.status === 'over_due') return 0;

    // Completed Tasks
    if (!task.completion_date || !task.start_date || !task.target_date) return null;

    const start = new Date(task.start_date).getTime();
    const target = new Date(task.target_date).getTime();
    const completion = new Date(task.completion_date).getTime();

    // Rule 1: Start = Target = Completion -> 100%
    if (start === target && target === completion) return 100;

    // Rule 2: Target > Completion -> 100% (Completed Early)
    if (target > completion) return 100;

    // Rule 3: Variation formula -> (Target - Start) / (Completion - Start) %
    const numerator = target - start;
    const denominator = completion - start;

    if (denominator === 0) return 0; // Prevent division by zero

    const ats = (numerator / denominator) * 100;
    return Math.max(0, ats); // Ensure non-negative
  };

  const atsScores = filteredTasks.map(calculateTaskATS).filter(s => s !== null);
  const totalATS = atsScores.reduce((a, b) => a + b, 0);
  const efficiency = atsScores.length > 0 ? Math.round(totalATS / atsScores.length) : 0;

  // OTC Score Formula: onTime / (totalTasks - inProgress)
  const otcDenominator = totalTasks - inProgress;
  const otcScore = otcDenominator > 0 ? Math.round((onTime / otcDenominator) * 100) : 0;

  const chartData = [
    { name: "On Time", value: onTime, color: "#22c55e" },
    // { name: "In Progress", value: inProgress, color: "#3b82f6" }, // Removed as requested
    { name: "Delayed", value: delayed, color: "#facc15" },
    { name: "Overdue", value: overDue, color: "#ef4444" },
  ];


  if (loading) return <div className="p-10 text-center">Loading Action Plan...</div>;

  return (
    <div className="min-h-screen bg-slate-50/50 antialiased pb-20">
      <Navbar hideLogin={true} />

      {/* ===== MAIN ANALYTICS SECTION (UNCHANGED) ===== */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-4">

        {/* FILTER BAR (MOVED) */}
        <div className="col-span-12 flex flex-wrap gap-2 mb-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
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
                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isActive
                  ? 'bg-slate-900 text-white shadow-lg scale-105'
                  : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300 hover:text-slate-600'
                  }`}
              >
                {label}
              </button>
            )
          })}
          </div>

          <div className="min-w-[220px]">
            <select
              value={selectedProjectId}
              onChange={handleProjectSelect}
              className="w-full bg-white border border-slate-200 rounded-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none appearance-none"
              disabled={projectOptions.length === 0}
            >
              {projectOptions.map((proj) => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* PIE CHART CARD */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="font-black text-slate-900 tracking-tighter text-lg uppercase italic">
                Action Plan Distribution
              </h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Live Analytics</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl text-[#F58A4B]">
              <BarChart3 size={16} />
            </div>
          </div>

          <div className="h-[180px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={0}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* OTC Score Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-black text-slate-900 tracking-tighter">{otcScore}%</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">OTC Score</span>
            </div>
          </div>
        </div>

        {/* KPI CARDS GRID */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KPICard title="Total Task" value={totalTasks} color="border-indigo-500" icon={<LayoutGrid size={18} />} />
          <KPICard title="On Time Task" value={onTime} color="border-green-500" icon={<CheckCircle size={18} />} />
          <KPICard title="Delay Completion" value={delayed} color="border-yellow-400" icon={<Clock size={18} />} />
          <KPICard title="In Progress" value={inProgress} color="border-blue-500" icon={<TrendingUp size={18} />} />
          <KPICard title="Over Due" value={overDue} color="border-red-500" icon={<AlertCircle size={18} />} />
          <KPICard title="Efficiency" value={`${efficiency}%`} color="border-purple-500" icon={<User size={18} />} />
        </div>

        {/* ===== FILTERS & ACTION PLAN TABLE SECTION ===== */}
        <div className="col-span-12 mt-4 space-y-4">



          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4 bg-white">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Action Matrix</h2>
                <p className="text-slate-400 text-[9px] font-bold tracking-[0.2em] uppercase mt-0.5">Execution & Monitoring</p>
              </div>

              {!isExternal && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#F58A4B] transition-all shadow-lg active:scale-95"
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
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Task Doc</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Completion Doc</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTasks.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-all group">
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
                          {item.target_date}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center">
                        {item.assign_file ? (
                          <a href={item.assign_file.startsWith('http') ? item.assign_file : `${import.meta.env.VITE_API_URL}${item.assign_file}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-[#F58A4B] hover:text-white transition-all" title="View Assignment Doc">
                            <FileText size={14} />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[10px]">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {item.completion_file ? (
                          <a href={item.completion_file.startsWith('http') ? item.completion_file : `${import.meta.env.VITE_API_URL}${item.completion_file}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-green-500 hover:text-white transition-all" title="View Completion Doc">
                            <CheckCircle size={14} />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-[10px]">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-black uppercase ${activeFilter === 'MY'
                            ? (['on_time', 'delay_completion'].includes(item.status) ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600')
                            : (item.status === 'on_time' ? 'bg-green-100 text-green-600' :
                              item.status === 'delay_completion' ? 'bg-yellow-100 text-yellow-600' :
                                item.status === 'over_due' ? 'bg-red-100 text-red-600' :
                                  'bg-blue-100 text-blue-600')
                            }`}>
                            {activeFilter === 'MY'
                              ? (['on_time', 'delay_completion'].includes(item.status) ? 'COMPLETED' : 'IN PROGRESS')
                              : item.status.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">

                          {/* User Complete Button (Any assigned user) */}
                          {item.assigned_to === currentUser?.id && item.status !== 'on_time' && item.status !== 'delay_completion' && (
                            <button
                              onClick={() => initiateCompleteTask(item)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 rounded-lg border border-green-100 hover:bg-green-100 transition-all"
                            >
                              <CheckCircle size={12} />
                              <span className="text-[8px] font-black uppercase">Complete</span>
                            </button>
                          )}

                          {(item.status === 'on_time' || item.status === 'delay_completion') && (
                            <div className="text-green-500">
                              <CheckCircle size={16} />
                            </div>
                          )}

                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-slate-400 font-bold text-xs">No tasks found.</td>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-6 flex justify-between items-center border-b border-slate-100">
                <h3 className="text-lg font-black uppercase italic tracking-tighter">New Action Plan Entry</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleCreateTask} className="p-6 space-y-4">
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
                <div className="grid grid-cols-2 gap-3">
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
                  <div className="space-y-1.5 col-span-2">
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
        )
      }

      {/* ===== COMPLETION MODAL ===== */}
      {completeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-black uppercase italic tracking-tighter">Complete Task</h3>
              <p className="text-xs text-slate-500 mt-1">{selectedTask?.task}</p>
            </div>

            <div className="p-6 space-y-4">
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

    </div >
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