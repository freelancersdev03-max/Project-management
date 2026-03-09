import React, { useState, useMemo, useEffect } from 'react';
import { Plus, X as CloseIcon, CheckCircle2, Clock, Zap, Calendar, Target, Trash2, Pencil } from 'lucide-react';
import api from '../api';

const BIG_TASKS_ENDPOINT = 'ddtme/big-tasks/';
const KPIS_ENDPOINT = 'ddtme/kpis/';
const KPI_UPDATES_BATCH_ENDPOINT = 'ddtme/kpi-updates/batch_update/';

const getProjectEndpoint = (role, projectId) => {
    if (role === 'SGM') return `sgm/projects/${projectId}/`;
    if (role === 'EMPLOYEE') return `employees/projects/${projectId}/`;
    return `projects/${projectId}/`;
};

const BigTask = ({ projectId, onProgressUpdate }) => {
    // --- STATE ---
    const [tasks, setTasks] = useState([]);
    const [project, setProject] = useState(null);

    // KPI State (Local Only)
    // KPI State
    const [kpis, setKpis] = useState([]);

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Editing State
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [editingStartDate, setEditingStartDate] = useState('');
    const [editingTargetDate, setEditingTargetDate] = useState('');

    const [editingKpiId, setEditingKpiId] = useState(null);
    const [editingKpiName, setEditingKpiName] = useState('');
    const [editingKpiBaseline, setEditingKpiBaseline] = useState('');
    const [editingKpiTarget, setEditingKpiTarget] = useState('');

    // Forms
    const [formData, setFormData] = useState({ title: '', startDate: '', targetDate: '', type: 'X' });


    // --- DATA FETCHING ---
    const fetchTasks = async () => {
        if (!projectId || projectId === 'undefined') return;
        try {
            const token = localStorage.getItem('access_token');
            const res = await api.get(`${BIG_TASKS_ENDPOINT}?project_id=${projectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Map backend fields to frontend expected fields
            const mapped = res.data.map(t => ({
                ...t,
                startDate: t.start_date,
                targetDate: t.target_date
            }));
            setTasks(mapped);
        } catch (error) {
            console.error("Failed to fetch Big Tasks", error);
        }
    };

    const fetchKPIs = async () => {
        if (!projectId || projectId === 'undefined') return;
        try {
            const token = localStorage.getItem('access_token');
            const res = await api.get(`${KPIS_ENDPOINT}?project_id=${projectId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKpis(res.data);
        } catch (error) {
            console.error("Failed to fetch KPIs", error);
        }
    };


    useEffect(() => {
        if (projectId) {
            const fetchProject = async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    const role = (localStorage.getItem('role') || '').toUpperCase();
                    const endpoint = getProjectEndpoint(role, projectId);
                    const res = await api.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
                    setProject(res.data);
                } catch (error) {
                    console.error("Failed to fetch project", error);
                }
            };
            fetchProject();
            fetchTasks();
            fetchKPIs();
        }
    }, [projectId]);

    const [viewMode, setViewMode] = useState('Month');

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
            const diff = current.getDate() - day + (day === 0 ? -6 : 1);
            current = new Date(current.setDate(diff));
        } else if (viewMode === 'Month') {
            current.setDate(1);
        } else if (viewMode === 'Year') {
            current.setMonth(0, 1);
        }

        while (current <= end || (viewMode === 'Year' && current.getFullYear() <= end.getFullYear()) || (viewMode === 'Month' && (current.getFullYear() < end.getFullYear() || (current.getFullYear() === end.getFullYear() && current.getMonth() <= end.getMonth())))) {
            if (viewMode === 'Day' && current > end) break;
            if (viewMode === 'Week' && current > end && current.getTime() > end.getTime() + 7 * 24 * 60 * 60 * 1000) break;

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
        return taskEnd >= col.start && taskStart <= col.end;
    };


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

    const processedTasks = useMemo(() => {
        const progressive = tasks.filter(t => t.status !== 'In Progress' && t.status !== 'Completed'); // Just in case
        // Logic: just standard filter
        const active = tasks.filter(t => t.status !== 'Completed');
        const completed = tasks.filter(t => t.status === 'Completed');
        return [...active, ...completed];
    }, [tasks]);


    // --- HANDLERS (API INTEGRATED) ---

    const startEditing = (task) => {
        setEditingTaskId(task.id);
        setEditingTitle(task.title);
        setEditingStartDate(task.startDate || task.start_date);
        setEditingTargetDate(task.targetDate || task.target_date);
    };

    const deleteTask = async (id) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;
        try {
            const token = localStorage.getItem('access_token');
            await api.delete(`${BIG_TASKS_ENDPOINT}${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTasks();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete task");
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (new Date(formData.startDate) > new Date(formData.targetDate)) {
            alert("Start date cannot be later than target date");
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const payload = {
                project: projectId,
                title: formData.title,
                start_date: formData.startDate,
                target_date: formData.targetDate,
                type: formData.type,
                status: 'In Progress'
            };
            await api.post(BIG_TASKS_ENDPOINT, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await fetchTasks();
            setIsModalOpen(false);
            setFormData({ title: '', startDate: '', targetDate: '', type: 'X' });
        } catch (error) {
            console.error("Failed to save task", error);
            if (error.response && error.response.status === 400) {
                const data = error.response.data;
                let msg = "Validation Error:\n";
                Object.keys(data).forEach(key => {
                    const val = data[key];
                    msg += `- ${key}: ${Array.isArray(val) ? val.join(', ') : val}\n`;
                });
                if (msg === "Validation Error:\n") msg = "Failed to save task. Please check input.";
                alert(msg);
            } else {
                alert("Failed to save task");
            }
        }
    };

    const handleQuickAddTask = async () => {
        const defaultStart = project?.start_date || new Date().toISOString().split('T')[0];

        // Default target date: start + 30 days, or project end if sooner
        let defaultEnd = new Date(defaultStart);
        defaultEnd.setDate(defaultEnd.getDate() + 30);
        const endString = defaultEnd.toISOString().split('T')[0];

        const projectEnd = project?.end_date;
        const finalTargetDate = (projectEnd && endString > projectEnd) ? projectEnd : endString;

        try {
            const token = localStorage.getItem('access_token');
            const payload = {
                project: projectId,
                title: 'New Task',
                start_date: defaultStart,
                target_date: finalTargetDate,
                type: 'X',
                status: 'In Progress'
            };
            const res = await api.post(BIG_TASKS_ENDPOINT, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await fetchTasks();
            startEditing({
                ...res.data,
                startDate: res.data.start_date,
                targetDate: res.data.target_date
            });

        } catch (error) {
            console.error("Quick add failed", error);
            if (error.response && error.response.status === 400) {
                const data = error.response.data;
                let msg = "Quick Add Error:\n";
                Object.keys(data).forEach(key => {
                    const val = data[key];
                    msg += `- ${key}: ${Array.isArray(val) ? val.join(', ') : val}\n`;
                });
                alert(msg);
            } else {
                alert(`Quick add failed: ${error.response ? error.response.status : error.message}`);
            }
        }
    };

    const saveTask = async (taskId) => {
        if (editingTitle.trim() === '') return;

        if (new Date(editingStartDate) > new Date(editingTargetDate)) {
            alert("Start date cannot be later than target date");
            return;
        }

        try {
            const token = localStorage.getItem('access_token');
            const payload = {
                title: editingTitle,
                start_date: editingStartDate,
                target_date: editingTargetDate
            };
            await api.patch(`${BIG_TASKS_ENDPOINT}${taskId}/`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            await fetchTasks();
            setEditingTaskId(null);
        } catch (error) {
            console.error("Update failed", error);
            if (error.response && error.response.status === 400) {
                const data = error.response.data;
                let msg = "Update Error:\n";
                Object.keys(data).forEach(key => {
                    const val = data[key];
                    msg += `- ${key}: ${Array.isArray(val) ? val.join(', ') : val}\n`;
                });
                alert(msg);
            } else {
                alert("Failed to update task");
            }
        }
    };

    const cancelEditing = () => {
        setEditingTaskId(null);
    };


    const markCompleted = async (id) => {
        try {
            const token = localStorage.getItem('access_token');
            await api.patch(`${BIG_TASKS_ENDPOINT}${id}/`, { status: "Completed" }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTasks();
        } catch (error) {
            console.error("Completion failed", error);
        }
    };

    // --- KPI HANDLERS (API INTEGRATED) ---
    const startEditingKpi = (kpi) => {
        setEditingKpiId(kpi.id);
        setEditingKpiName(kpi.name);
        setEditingKpiBaseline(kpi.baseline);
        setEditingKpiTarget(kpi.target);
    };

    const handleQuickAddKpi = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const payload = {
                project: projectId,
                name: 'New KPI',
                baseline: '-',
                target: '-'
            };
            const res = await api.post(KPIS_ENDPOINT, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchKPIs();
            startEditingKpi(res.data);
        } catch (error) {
            console.error("Quick add KPI failed", error);
        }
    };

    const saveKpi = async (kpiId) => {
        try {
            const token = localStorage.getItem('access_token');
            const payload = {
                name: editingKpiName,
                baseline: editingKpiBaseline,
                target: editingKpiTarget
            };
            await api.patch(`${KPIS_ENDPOINT}${kpiId}/`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchKPIs();
            setEditingKpiId(null);
        } catch (error) {
            console.error("Save KPI failed", error);
            alert("Failed to save KPI");
        }
    };

    const deleteKpi = async (id) => {
        if (!window.confirm("Are you sure you want to delete this KPI?")) return;
        try {
            const token = localStorage.getItem('access_token');
            await api.delete(`${KPIS_ENDPOINT}${id}/`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchKPIs();
        } catch (error) {
            console.error("Delete KPI failed", error);
        }
    };

    const handleKpiUpdate = async (kpiId, monthLabel, value) => {
        try {
            const token = localStorage.getItem('access_token');
            // Parse monthLabel (e.g., "Feb 2026") into YYYY-MM-DD
            const [monthShort, year] = monthLabel.split(' ');
            const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
            const dateStr = `${year}-${monthMap[monthShort]}-01`;

            const payload = {
                kpi: kpiId,
                month: dateStr,
                update_value: value
            };

            // We can use a batch update or individual update. Individual is easier for basic implementation.
            // Using POST to handle create-or-update logic if backend supports it or just use specific endpoint.
            // My backend KPIUpdateViewSet supports POST and batch_update.
            await api.post(KPI_UPDATES_BATCH_ENDPOINT, {
                updates: [payload]
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update local state without full refetch for better UX
            setKpis(prevKpis => prevKpis.map(k => {
                if (k.id === kpiId) {
                    const existingUpdates = k.updates || [];
                    const otherUpdates = existingUpdates.filter(u => u.month !== dateStr);
                    return { ...k, updates: [...otherUpdates, payload] };
                }
                return k;
            }));
        } catch (error) {
            console.error("Failed to update KPI month", error);
        }
    };

    const getKpiValueForMonth = (kpi, monthLabel) => {
        if (!kpi.updates) return '';
        const [monthShort, year] = monthLabel.split(' ');
        const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        const dateStr = `${year}-${monthMap[monthShort]}-01`;
        const update = kpi.updates.find(u => u.month === dateStr);
        return update ? update.update_value : '';
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
                                            <div className="flex justify-between items-center group">
                                                <div
                                                    onClick={() => canEdit && startEditing(task)}
                                                    className={`flex-1 ${canEdit ? 'cursor-pointer' : ''}`}
                                                >
                                                    <div className={`text-xs font-bold ${task.type === 'Y' ? 'text-slate-900' : 'text-slate-700'} group-hover:text-[#F58A4B]`}>
                                                        {task.title || '(No Title)'}
                                                    </div>
                                                </div>
                                                {canEdit && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); startEditing(task); }}
                                                            className="p-1 text-slate-400 hover:text-blue-600 rounded"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    <td className={`p-2 text-center text-[10px] font-bold text-slate-600 sticky left-[348px] z-20 ${rowBg} group-hover:bg-slate-50 transition-colors`}>
                                        {task.targetDate || '-'}
                                    </td>

                                    {timelineColumns.map((col, i) => {
                                        const isActive = isTaskActiveInColumn(task, col);
                                        let cellClass = "p-0 h-12 relative select-none min-w-[40px]";
                                        if (isActive) {
                                            cellClass += task.status === 'Completed' ? " bg-emerald-500" : " bg-[#3b82f6]";
                                        } else if (col.isWeekend) {
                                            cellClass += " bg-slate-50/50";
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
                        <button onClick={handleQuickAddKpi} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors">
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

                                    <td className="p-2 pl-3 text-xs font-bold text-slate-700 sticky left-[48px] z-20 bg-white group-hover:bg-slate-50 transition-colors">
                                        {editingKpiId === kpi.id ? (
                                            <div className="flex gap-2">
                                                <input
                                                    className="flex-1 px-2 py-1 border border-orange-400 rounded outline-none"
                                                    value={editingKpiName}
                                                    onChange={(e) => setEditingKpiName(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center group/kpi">
                                                <span onClick={() => canEdit && startEditingKpi(kpi)} className={canEdit ? "cursor-pointer" : ""}>{kpi.name}</span>
                                                {canEdit && (
                                                    <div className="flex gap-1 opacity-0 group-hover/kpi:opacity-100 transition-opacity">
                                                        <button onClick={() => startEditingKpi(kpi)} className="p-1 text-slate-400 hover:text-blue-600"><Pencil size={12} /></button>
                                                        <button onClick={() => deleteKpi(kpi.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-2 text-center text-[10px] font-bold text-slate-500 sticky left-[348px] z-20 bg-white group-hover:bg-slate-50 transition-colors">
                                        {editingKpiId === kpi.id ? (
                                            <input
                                                className="w-full px-1 py-1 border border-orange-400 rounded outline-none text-center"
                                                value={editingKpiBaseline}
                                                onChange={(e) => setEditingKpiBaseline(e.target.value)}
                                            />
                                        ) : (
                                            kpi.baseline
                                        )}
                                    </td>

                                    <td className="p-2 text-center text-[10px] font-bold text-emerald-600 sticky left-[444px] z-20 bg-white group-hover:bg-slate-50 transition-colors">
                                        {editingKpiId === kpi.id ? (
                                            <div className="flex flex-col gap-1">
                                                <input
                                                    className="w-full px-1 py-1 border border-orange-400 rounded outline-none text-center"
                                                    value={editingKpiTarget}
                                                    onChange={(e) => setEditingKpiTarget(e.target.value)}
                                                />
                                                <button onClick={() => saveKpi(kpi.id)} className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[8px] uppercase">Save</button>
                                            </div>
                                        ) : (
                                            kpi.target
                                        )}
                                    </td>
                                    {months.map((m, i) => (
                                        <td key={i} className="p-1 min-w-[60px]">
                                            <input
                                                type="text"
                                                className="w-full text-center text-[10px] border-none focus:ring-1 focus:ring-blue-200 bg-transparent rounded"
                                                placeholder="-"
                                                defaultValue={getKpiValueForMonth(kpi, m)}
                                                onBlur={(e) => handleKpiUpdate(kpi.id, m, e.target.value)}
                                            />
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

        </div>
    );
};

export default BigTask;
