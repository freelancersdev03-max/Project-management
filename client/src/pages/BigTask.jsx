import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X as CloseIcon, CheckCircle2, Clock, Zap, Calendar, Target } from 'lucide-react';
import api from '../api';

const BigTask = ({ projectId, onProgressUpdate }) => {
    const [project, setProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [editingStartDate, setEditingStartDate] = useState('');
    const [editingTargetDate, setEditingTargetDate] = useState('');

    // --- NEW KPI STATES ---
    const [kpis, setKpis] = useState([
        { id: 1, name: 'Revenue Growth', baseline: '$1.2M', target: '$1.5M' },
        { id: 2, name: 'Customer Satisfaction Score', baseline: '4.2', target: '4.8' },
        { id: 3, name: 'Operational Efficiency', baseline: '85%', target: '95%' },
    ]);
    const [isKpiModalOpen, setIsKpiModalOpen] = useState(false);
    const [kpiFormData, setKpiFormData] = useState({ name: '', baseline: '', target: '' });

    useEffect(() => {
        if (!projectId) return;
        const fetchProject = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const role = (localStorage.getItem('role') || '').toUpperCase();
                let endpoint = `projects/${projectId}/`;
                if (role === 'SGM') endpoint = `sgm/projects/${projectId}/`;
                if (role === 'EMPLOYEE') endpoint = `employees/projects/${projectId}/`;
                const res = await api.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
                setProject(res.data);
            } catch (error) {
                console.error("Failed to fetch project", error);
            }
        };
        fetchProject();
    }, [projectId]);

    const [viewMode, setViewMode] = useState('Month'); // 'Day', 'Week', 'Month', 'Year'

    // --- TIMELINE GENERATION ---
    const months = useMemo(() => {
        if (!project || !project.start_date || !project.end_date) {
            return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        }
        const start = new Date(project.start_date);
        const end = new Date(project.end_date);
        const monthsArr = [];
        const current = new Date(start.getFullYear(), start.getMonth(), 1);

        while (current <= end) {
            const monthName = current.toLocaleString('default', { month: 'short' });
            const year = current.getFullYear();
            monthsArr.push(`${monthName} ${year}`);
            current.setMonth(current.getMonth() + 1);
        }
        return monthsArr;
    }, [project]);

    const kpiTableContent = (
        <div className="border border-slate-300 overflow-x-auto">
            <table className="w-full border-collapse table-fixed min-w-[800px]">
                <thead>
                    <tr className="bg-slate-100 divide-x divide-slate-300 border-b border-slate-300 text-[10px] font-bold text-slate-600 uppercase">
                        <th className="p-2 w-12 text-center">Sr. No.</th>
                        <th className="p-2 w-1/3 text-left pl-3">KPI Description</th>
                        <th className="p-2 w-24 text-center">Base-line</th>
                        <th className="p-2 w-24 text-center">Target</th>
                        {months.map((m, i) => <th key={i} className="p-1 text-center bg-slate-50">{m}</th>)}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                    {kpis.map((kpi, index) => (
                        <tr key={kpi.id} className="divide-x divide-slate-300 bg-white hover:bg-slate-50">
                            <td className="p-2 text-center text-xs font-semibold text-slate-500">{index + 1}</td>
                            <td className="p-2 pl-3 text-xs font-bold text-slate-700">{kpi.name}</td>
                            <td className="p-2 text-center text-[10px] font-bold text-slate-500">{kpi.baseline}</td>
                            <td className="p-2 text-center text-[10px] font-bold text-emerald-600">{kpi.target}</td>
                            {months.map((_, mIdx) => (
                                <td key={mIdx} className="p-1">
                                    <input type="text" className="w-full text-center text-[10px] border-none focus:ring-1 focus:ring-blue-200 bg-transparent rounded" placeholder="-" />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const timelineColumns = useMemo(() => {
        if (!project || !project.start_date || !project.end_date) {
            return [];
        }
        const start = new Date(project.start_date);
        const end = new Date(project.end_date);
        const cols = [];

        let current = new Date(start);

        // ALIGN START DATE based on View Mode
        if (viewMode === 'Week') {
            const day = current.getDay();
            const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            current = new Date(current.setDate(diff));
        } else if (viewMode === 'Month') {
            current.setDate(1); // Start from 1st of the month
        } else if (viewMode === 'Year') {
            current.setMonth(0, 1); // Start from Jan 1st
        }

        while (current <= end || (viewMode === 'Year' && current.getFullYear() <= end.getFullYear()) || (viewMode === 'Month' && (current.getFullYear() < end.getFullYear() || (current.getFullYear() === end.getFullYear() && current.getMonth() <= end.getMonth())))) {
            // Loop condition fix: standard comparison sometimes fails for Year/Month due to day differences
            // We added specific checks for Year and Month to ensuring we cover the range completely

            // Double check entry to avoid infinite loop safeguards or overshooting
            if (viewMode === 'Day' && current > end) break;
            if (viewMode === 'Week' && current > end && current.getTime() > end.getTime() + 7 * 24 * 60 * 60 * 1000) break; // Allow covering the end week

            let colEnd = new Date(current);
            let label = '';
            let isWeekend = false;

            if (viewMode === 'Day') {
                label = current.getDate().toString();
                colEnd.setHours(23, 59, 59, 999);
                isWeekend = [0, 6].includes(current.getDay());
                cols.push({ label, start: new Date(current), end: colEnd, isWeekend });
                current.setDate(current.getDate() + 1);
            } else if (viewMode === 'Week') {
                colEnd.setDate(current.getDate() + 6);
                colEnd.setHours(23, 59, 59, 999);
                const weekEndDisplay = new Date(colEnd);
                // Clamp display to actual month/year if needed, but usually showing the week range is fine
                label = `${current.getDate()} ${current.toLocaleString('default', { month: 'short' })}`;
                cols.push({ label, start: new Date(current), end: colEnd });
                current.setDate(current.getDate() + 7);
            } else if (viewMode === 'Month') {
                colEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
                label = `${current.toLocaleString('default', { month: 'short' })} ${current.getFullYear().toString().substr(-2)}`;
                cols.push({ label, start: new Date(current.getFullYear(), current.getMonth(), 1), end: colEnd });
                current.setMonth(current.getMonth() + 1);
            } else if (viewMode === 'Year') {
                colEnd = new Date(current.getFullYear(), 11, 31, 23, 59, 59, 999);
                label = current.getFullYear().toString();
                cols.push({ label, start: new Date(current.getFullYear(), 0, 1), end: colEnd });
                current.setFullYear(current.getFullYear() + 1);
            }
        }
        return cols;
    }, [project, viewMode]);

    const isTaskActiveInColumn = (task, col) => {
        if (!task.startDate || !task.targetDate) return false;
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.targetDate);
        // Check overlap: TaskEnd >= ColStart AND TaskStart <= ColEnd
        return taskEnd >= col.start && taskStart <= col.end;
    };


    const [tasks, setTasks] = useState([
        { id: 1, title: 'Project Initialization & Discovery', type: 'X', status: 'In Progress', startDate: '2026-11-01', targetDate: '2026-12-15' },
        { id: 2, title: 'Strategic Architecture Design', type: 'Y', status: 'In Progress', startDate: '2027-01-10', targetDate: '2027-03-30' },
        { id: 3, title: 'Legacy Data Migration', type: 'X', status: 'Completed', startDate: '2026-11-05', targetDate: '2026-12-20' },
    ]);

    useEffect(() => {
        if (!onProgressUpdate) return;
        if (tasks.length === 0) {
            onProgressUpdate(0);
            return;
        }
        const completedCount = tasks.filter(t => t.status === 'Completed').length;
        const totalCount = tasks.length;
        const progress = Math.round((completedCount / totalCount) * 100);
        onProgressUpdate(progress);
    }, [tasks, onProgressUpdate]);

    const [formData, setFormData] = useState({
        title: '',
        startDate: '',
        targetDate: '',
        type: 'X'
    });

    const processedTasks = useMemo(() => {
        const progressive = tasks.filter(t => t.status !== 'Completed');
        const completed = tasks.filter(t => t.status === 'Completed');
        return [...progressive, ...completed];
    }, [tasks]);


    const handleAddTask = (e) => {
        e.preventDefault();
        if (new Date(formData.startDate) > new Date(formData.targetDate)) {
            alert("Start date cannot be later than target date");
            return;
        }

        const newTask = {
            ...formData,
            id: Date.now(),
            status: 'In Progress'
        };
        setTasks([...tasks, newTask]);
        setIsModalOpen(false);
        setFormData({ title: '', startDate: '', targetDate: '', type: 'X' });
    };

    const markCompleted = (id) => {
        setTasks(tasks.map(task =>
            task.id === id ? { ...task, status: 'Completed' } : task
        ));
    };

    const handleQuickAddTask = () => {
        const newTaskId = Date.now();
        const defaultStart = project?.start_date || '';
        const defaultEnd = project?.end_date || '';

        const newTask = {
            id: newTaskId,
            title: '',
            startMonth: 0,
            endMonth: 0,
            startDate: defaultStart,
            targetDate: defaultEnd,
            type: 'X',
            status: 'In Progress'
        };
        setTasks([...tasks, newTask]);
        setEditingTaskId(newTaskId);
        setEditingTitle('');
        setEditingStartDate(defaultStart);
        setEditingTargetDate(defaultEnd);
    };

    const startEditing = (task) => {
        setEditingTaskId(task.id);
        setEditingTitle(task.title);
        setEditingStartDate(task.startDate);
        setEditingTargetDate(task.targetDate);
    };

    const saveTask = (taskId) => {
        if (editingTitle.trim() === '') {
            setTasks(tasks.filter(t => t.id !== taskId));
            setEditingTaskId(null);
            return;
        }

        if (new Date(editingStartDate) > new Date(editingTargetDate)) {
            alert("Start date cannot be later than target date");
            return;
        }

        setTasks(tasks.map(t =>
            t.id === taskId
                ? {
                    ...t,
                    title: editingTitle,
                    startDate: editingStartDate,
                    targetDate: editingTargetDate
                }
                : t
        ));

        setEditingTaskId(null);
    };

    const cancelEditing = () => {
        setEditingTaskId(null);
    };

    // --- KPI LOGIC ---
    const handleAddKpi = (e) => {
        e.preventDefault();
        const newKpi = {
            ...kpiFormData,
            id: Date.now()
        };
        setKpis([...kpis, newKpi]);
        setIsKpiModalOpen(false);
        setKpiFormData({ name: '', baseline: '', target: '' });
    };

    const role = (localStorage.getItem('role') || '').toUpperCase();
    const canEdit = ['ADMIN', 'HQEPL', 'SGM'].includes(role);

    return (
        <div className="w-full font-sans text-slate-900 bg-white">
            <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex items-center gap-3">
                    <span className="bg-[#F58A4B] p-1.5 rounded text-white shadow-sm">
                        <Zap size={16} fill="currentColor" />
                    </span>
                    <h1 className="text-xl font-bold tracking-tight text-slate-800 uppercase">Tasks</h1>
                </div>

                <div className="flex items-center gap-4">
                    {/* VIEW MODE SWITCHER */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {['Day', 'Week', 'Month', 'Year'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === mode
                                    ? 'bg-white text-[#F58A4B] shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <button onClick={handleQuickAddTask} className="flex items-center justify-center bg-[#F58A4B] hover:bg-orange-600 text-white px-3 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors">
                                <Plus size={14} />
                            </button>
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors">
                                <Plus size={14} /> Add Task
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="border border-slate-300 overflow-x-auto relative">
                <table className="w-full border-collapse min-w-max">
                    <thead>
                        <tr className="bg-slate-100 divide-x divide-slate-300 border-b border-slate-300">
                            <th className="p-2 w-12 min-w-[48px] text-center text-[10px] font-bold text-slate-600 uppercase sticky left-0 z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Sr. No.</th>
                            <th className="p-2 w-[300px] min-w-[300px] text-left text-[10px] font-bold text-slate-600 uppercase pl-3 sticky left-[48px] z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Task Description (Dates)</th>
                            <th className="p-2 w-24 min-w-[96px] text-center text-[10px] font-bold text-slate-600 uppercase sticky left-[348px] z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Target Date</th>
                            {timelineColumns.map((col, i) => (
                                <th key={i} className="p-1 text-center text-[10px] font-bold text-slate-600 uppercase bg-slate-50 min-w-[40px] whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                            <th className="p-2 w-32 min-w-[128px] text-center text-[10px] font-bold text-slate-600 uppercase sticky right-0 z-30 bg-slate-100 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {processedTasks.map((task, index) => {
                            const rowBg = task.type === 'Y' ? 'bg-orange-50' : 'bg-white';
                            return (
                                <tr key={task.id} className={`divide-x divide-slate-300 ${task.type === 'Y' ? 'bg-orange-50' : 'bg-white hover:bg-slate-50'} group`}>
                                    <td className={`p-2 text-center text-xs font-semibold text-slate-500 sticky left-0 z-20 ${rowBg} group-hover:bg-slate-50 transition-colors`}>{index + 1}</td>

                                    <td className={`p-2 pl-3 sticky left-[48px] z-20 ${rowBg} group-hover:bg-slate-50 transition-colors`}>
                                        {editingTaskId === task.id && canEdit ? (
                                            <div className="space-y-2 py-1">
                                                <input
                                                    type="text"
                                                    value={editingTitle}
                                                    onChange={(e) => setEditingTitle(e.target.value)}
                                                    autoFocus
                                                    placeholder="Task name..."
                                                    className="w-full px-2 py-1 border border-[#F58A4B] rounded text-xs font-semibold focus:outline-none"
                                                />
                                                <div className="flex gap-2 items-center">
                                                    <div className="flex-1">
                                                        <label className="text-[9px] text-slate-400 font-bold uppercase block">Start</label>
                                                        <input
                                                            type="date"
                                                            min={project?.start_date}
                                                            max={project?.end_date}
                                                            value={editingStartDate}
                                                            onChange={(e) => setEditingStartDate(e.target.value)}
                                                            className="w-full px-1 py-0.5 border border-slate-300 rounded text-[10px]"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[9px] text-slate-400 font-bold uppercase block">End</label>
                                                        <input
                                                            type="date"
                                                            min={editingStartDate || project?.start_date}
                                                            max={project?.end_date}
                                                            value={editingTargetDate}
                                                            onChange={(e) => setEditingTargetDate(e.target.value)}
                                                            className="w-full px-1 py-0.5 border border-slate-300 rounded text-[10px]"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <button onClick={() => saveTask(task.id)} className="flex-1 py-1 bg-emerald-500 text-white rounded text-[10px] font-bold">Save</button>
                                                    <button onClick={cancelEditing} className="flex-1 py-1 bg-slate-300 text-slate-700 rounded text-[10px] font-bold">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => canEdit && startEditing(task)}
                                                className={`${canEdit ? 'cursor-pointer group' : ''}`}
                                            >
                                                <div className={`text-xs font-bold ${task.type === 'Y' ? 'text-slate-900' : 'text-slate-700'} group-hover:text-[#F58A4B]`}>
                                                    {task.title || '(No Title)'}
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    <td className={`p-2 text-center text-[10px] font-bold text-slate-600 sticky left-[348px] z-20 ${rowBg} group-hover:bg-slate-50 transition-colors`}>
                                        {task.targetDate || '-'}
                                    </td>

                                    {timelineColumns.map((col, i) => {
                                        const isActive = isTaskActiveInColumn(task, col);
                                        let cellClass = "p-0 h-12 relative select-none min-w-[40px]"; // Added min-w here too
                                        if (isActive) {
                                            cellClass += task.status === 'Completed' ? " bg-emerald-500" : " bg-[#3b82f6]";
                                        } else if (col.isWeekend) {
                                            cellClass += " bg-slate-50/50"; // Light Weekend tint ONLY if not active
                                        }

                                        return <td key={i} className={cellClass}></td>;
                                    })}

                                    <td className={`p-2 text-center sticky right-0 z-20 ${rowBg} group-hover:bg-slate-50 transition-colors shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                                        {task.status === 'In Progress' && canEdit ? (
                                            <div className="relative inline-block w-full max-w-[120px]">
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => e.target.value === 'Completed' && markCompleted(task.id)}
                                                    className="appearance-none bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1.5 rounded text-[10px] font-bold uppercase shadow-sm hover:bg-blue-100 focus:outline-none w-full text-center"
                                                >
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Completed">Completed</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div className={`inline-flex items-center gap-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase border shadow-sm max-w-[120px] ${task.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                                {task.status === 'Completed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                <span className="truncate">{task.status}</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* KPI Section */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-4 px-1">
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-900 p-1.5 rounded text-white shadow-sm">
                            <Target size={16} />
                        </span>
                        <h2 className="text-lg font-bold tracking-tight text-slate-800 uppercase">Key Performance Indicators (KPIs)</h2>
                    </div>
                    {canEdit && (
                        <button onClick={() => setIsKpiModalOpen(true)} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors">
                            <Plus size={14} /> Add KPI
                        </button>
                    )}
                </div>

                <div className="border border-slate-300 overflow-x-auto relative">
                    <table className="w-full border-collapse min-w-max">
                        <thead>
                            <tr className="bg-slate-100 divide-x divide-slate-300 border-b border-slate-300 text-[10px] font-bold text-slate-600 uppercase">
                                <th className="p-2 w-12 min-w-[48px] text-center sticky left-0 z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Sr. No.</th>
                                <th className="p-2 w-[300px] min-w-[300px] text-left pl-3 sticky left-[48px] z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">KPI Description</th>
                                <th className="p-2 w-24 min-w-[96px] text-center sticky left-[348px] z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Base-line</th>
                                <th className="p-2 w-24 min-w-[96px] text-center sticky left-[444px] z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Target</th>
                                {months.map((m, i) => <th key={i} className="p-1 text-center bg-slate-50 min-w-[60px] whitespace-nowrap">{m}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                            {kpis.map((kpi, index) => (
                                <tr key={kpi.id} className="divide-x divide-slate-300 bg-white hover:bg-slate-50 group">
                                    <td className="p-2 text-center text-xs font-semibold text-slate-500 sticky left-0 z-20 bg-white group-hover:bg-slate-50 transition-colors">{index + 1}</td>
                                    <td className="p-2 pl-3 text-xs font-bold text-slate-700 sticky left-[48px] z-20 bg-white group-hover:bg-slate-50 transition-colors">{kpi.name}</td>
                                    <td className="p-2 text-center text-[10px] font-bold text-slate-500 sticky left-[348px] z-20 bg-white group-hover:bg-slate-50 transition-colors">{kpi.baseline}</td>
                                    <td className="p-2 text-center text-[10px] font-bold text-emerald-600 sticky left-[444px] z-20 bg-white group-hover:bg-slate-50 transition-colors">{kpi.target}</td>
                                    {months.map((_, i) => (
                                        <td key={i} className="p-1 min-w-[60px]">
                                            <input type="text" className="w-full text-center text-[10px] border-none focus:ring-1 focus:ring-blue-200 bg-transparent rounded" placeholder="-" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- ADD TASK MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <form onSubmit={handleAddTask} className="relative bg-white w-full max-w-lg rounded-xl p-8 shadow-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Add Task</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-1.5 rounded-full text-slate-400"><CloseIcon size={18} /></button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Task Title</label>
                                <input required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-sm font-bold focus:outline-none" placeholder="Task Name" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Start Date</label>
                                    <input type="date" required min={project?.start_date} max={project?.end_date} className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-sm font-bold outline-none" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Date</label>
                                    <input type="date" required min={formData.startDate || project?.start_date} max={project?.end_date} className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-sm font-bold outline-none" value={formData.targetDate} onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-8 bg-slate-900 hover:bg-[#F58A4B] text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg">Save Task</button>
                    </form>
                </div>
            )}

            {/* --- ADD KPI MODAL --- */}
            {isKpiModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsKpiModalOpen(false)} />
                    <form onSubmit={handleAddKpi} className="relative bg-white w-full max-w-lg rounded-xl p-8 shadow-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Add KPI</h3>
                            <button type="button" onClick={() => setIsKpiModalOpen(false)} className="bg-slate-100 p-1.5 rounded-full text-slate-400"><CloseIcon size={18} /></button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">KPI Description</label>
                                <input required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-sm font-bold focus:outline-none" placeholder="e.g., Revenue Growth" value={kpiFormData.name} onChange={(e) => setKpiFormData({ ...kpiFormData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Base-line</label>
                                    <input required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-sm font-bold outline-none" placeholder="e.g., 70%" value={kpiFormData.baseline} onChange={(e) => setKpiFormData({ ...kpiFormData, baseline: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target</label>
                                    <input required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-sm font-bold outline-none" placeholder="e.g., 90%" value={kpiFormData.target} onChange={(e) => setKpiFormData({ ...kpiFormData, target: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-8 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg">Save KPI</button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default BigTask;