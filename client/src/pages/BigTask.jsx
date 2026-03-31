import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, X as CloseIcon, CheckCircle2, Clock, Zap, Calendar, Target, Trash2, Pencil, Upload, Download } from 'lucide-react';
import api from '../api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BigTask = ({ projectId, onProgressUpdate }) => {
    const formatDateKey = (dateObj) => {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getTodayKey = () => formatDateKey(new Date());

    const laterDateKey = (left, right) => {
        if (left && right) return left > right ? left : right;
        return left || right || null;
    };

    const normalizeYmd = (year, month, day) => {
        const y = Number(year);
        const m = Number(month);
        const d = Number(day);

        if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
        if (m < 1 || m > 12 || d < 1 || d > 31) return null;

        const check = new Date(Date.UTC(y, m - 1, d));
        if (
            check.getUTCFullYear() !== y ||
            (check.getUTCMonth() + 1) !== m ||
            check.getUTCDate() !== d
        ) {
            return null;
        }

        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    };

    const parseExcelDateValue = (rawValue) => {
        if (rawValue === null || rawValue === undefined || rawValue === '') return null;

        if (rawValue instanceof Date && !Number.isNaN(rawValue.getTime())) {
            return formatDateKey(rawValue);
        }

        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
            const wholeDays = Math.floor(rawValue);
            if (wholeDays <= 0) return null;

            // Convert Excel serial date without local timezone drift.
            const excelEpochMs = Date.UTC(1899, 11, 30);
            const utcDate = new Date(excelEpochMs + (wholeDays * 86400000));
            return normalizeYmd(
                utcDate.getUTCFullYear(),
                utcDate.getUTCMonth() + 1,
                utcDate.getUTCDate()
            );
        }

        const text = String(rawValue).trim();
        if (!text) return null;

        const ymdMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (ymdMatch) {
            return normalizeYmd(ymdMatch[1], ymdMatch[2], ymdMatch[3]);
        }

        const dmyMatch = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
        if (dmyMatch) {
            let year = Number(dmyMatch[3]);
            if (year < 100) year += 2000;
            return normalizeYmd(year, dmyMatch[2], dmyMatch[1]);
        }

        const parsed = new Date(text);
        if (!Number.isNaN(parsed.getTime())) {
            return formatDateKey(parsed);
        }

        return null;
    };

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

    // Excel Upload State
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [excelPreview, setExcelPreview] = useState(null);
    const [excelUploadStatus, setExcelUploadStatus] = useState(null);
    const [columnMapping, setColumnMapping] = useState({});
    const [mappingStep, setMappingStep] = useState(false);
    const [lastQuickAddedTaskId, setLastQuickAddedTaskId] = useState(null);
    const [pendingScrollTaskId, setPendingScrollTaskId] = useState(null);

    const tasksTableScrollRef = useRef(null);

    const todayKey = getTodayKey();
    const minimumStartDate = laterDateKey(project?.start_date || null, todayKey);
    const taskVisibleRows = 10;
    const taskHeaderHeightPx = 46;
    const taskRowHeightPx = 48;
    const taskTableViewportMaxHeight = taskHeaderHeightPx + (taskVisibleRows * taskRowHeightPx);

    const bigTaskScrollbarStyles = `
        .bigtask-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #64748b #e2e8f0;
        }

        .bigtask-scrollbar::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        .bigtask-scrollbar::-webkit-scrollbar-track {
            background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 999px;
        }

        .bigtask-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%);
            border-radius: 999px;
            border: 2px solid #e2e8f0;
        }

        .bigtask-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #64748b 0%, #475569 100%);
        }
    `;


    // --- DATA FETCHING ---
    const fetchTasks = async () => {
        if (!projectId || projectId === 'undefined') return;
        try {
            const res = await api.get(`ddtme/big-tasks/?project_id=${projectId}`);
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
            const res = await api.get(`ddtme/kpis/?project_id=${projectId}`);
            setKpis(res.data);
        } catch (error) {
            console.error("Failed to fetch KPIs", error);
        }
    };


    useEffect(() => {
        if (projectId) {
            const fetchProject = async () => {
                try {
                    const role = (localStorage.getItem('role') || '').toUpperCase();
                    let endpoint = `projects/${projectId}/`;
                    if (role === 'SGM') endpoint = `sgm/projects/${projectId}/`;
                    if (role === 'EMPLOYEE') endpoint = `employees/projects/${projectId}/`;
                    const res = await api.get(endpoint);
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

    useEffect(() => {
        if (!pendingScrollTaskId) return;

        const scrollContainer = tasksTableScrollRef.current;
        if (!scrollContainer) return;

        const timer = setTimeout(() => {
            const targetRow = scrollContainer.querySelector(`[data-task-id="${pendingScrollTaskId}"]`);

            if (targetRow) {
                targetRow.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
            } else {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
            }

            setPendingScrollTaskId(null);
        }, 120);

        return () => clearTimeout(timer);
    }, [tasks, pendingScrollTaskId]);


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
            await api.delete(`ddtme/big-tasks/${id}/`);
            fetchTasks();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete task");
        }
    };

    const handleAddTask = async (e) => {
        e.preventDefault();
        if (formData.startDate < minimumStartDate) {
            alert(`Start date cannot be before ${minimumStartDate}.`);
            return;
        }
        if (new Date(formData.startDate) > new Date(formData.targetDate)) {
            alert("Start date cannot be later than target date");
            return;
        }

        try {
            const payload = {
                project: projectId,
                title: formData.title,
                start_date: formData.startDate,
                target_date: formData.targetDate,
                type: formData.type,
                status: 'In Progress'
            };
            await api.post(`ddtme/big-tasks/`, payload);

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
        const defaultStart = minimumStartDate || todayKey;

        // Default target date: start + 30 days, or project end if sooner
        let defaultEnd = new Date(defaultStart);
        defaultEnd.setDate(defaultEnd.getDate() + 30);
        const endString = formatDateKey(defaultEnd);

        const projectEnd = project?.end_date;
        const finalTargetDate = (projectEnd && endString > projectEnd) ? projectEnd : endString;

        try {
            const payload = {
                project: projectId,
                title: 'New Task',
                start_date: defaultStart,
                target_date: finalTargetDate,
                type: 'X',
                status: 'In Progress'
            };
            const res = await api.post(`ddtme/big-tasks/`, payload);

            await fetchTasks();
            setLastQuickAddedTaskId(res.data.id);
            setPendingScrollTaskId(res.data.id);
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

        if (taskId === lastQuickAddedTaskId && editingStartDate < minimumStartDate) {
            alert(`Start date cannot be before ${minimumStartDate}.`);
            return;
        }

        if (new Date(editingStartDate) > new Date(editingTargetDate)) {
            alert("Start date cannot be later than target date");
            return;
        }

        try {
            const payload = {
                title: editingTitle,
                start_date: editingStartDate,
                target_date: editingTargetDate
            };
            await api.patch(`ddtme/big-tasks/${taskId}/`, payload);

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

    // --- EXCEL UPLOAD HANDLERS ---
    const handleExcelFileSelect = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.name.endsWith('.xlsx')) {
            setExcelUploadStatus({ error: 'Only .xlsx files are supported' });
            return;
        }
        setExcelUploadStatus({ loading: true });
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const { read, utils } = await import('xlsx');
                    const workbook = read(data, { type: 'array' });
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = utils.sheet_to_json(worksheet, { header: 1 });
                    if (rows.length === 0) {
                        setExcelUploadStatus({ error: 'Excel file is empty' });
                        return;
                    }
                    const headers = rows[0] || [];
                    const dataRows = rows.slice(1, 6);
                    setExcelPreview({ columns: headers, rows: dataRows, allRows: rows.slice(1), file });
                    setColumnMapping({});
                    setMappingStep(true);
                    setExcelUploadStatus(null);
                } catch (err) {
                    setExcelUploadStatus({ error: 'Failed to read Excel file: ' + err.message });
                }
            };
            reader.readAsArrayBuffer(file);
        } catch (err) {
            setExcelUploadStatus({ error: err.message || 'Upload failed' });
        }
    };

    const handleExcelConfirmMapping = async () => {
        if (!excelPreview) {
            setExcelUploadStatus({ error: 'No file selected' });
            return;
        }
        const hasTitle = columnMapping['title'] !== undefined && columnMapping['title'] !== '';
        if (!hasTitle) {
            setExcelUploadStatus({ error: "Please map the 'Task' column (required)" });
            return;
        }
        setExcelUploadStatus({ loading: true });
        try {
            const allRows = excelPreview.allRows;
            let created = 0;
            let errors = [];
            const uploadDayKey = getTodayKey();
            const minUploadStartDate = laterDateKey(project?.start_date || null, uploadDayKey);

            for (let i = 0; i < allRows.length; i++) {
                const row = allRows[i];
                const title = columnMapping['title'] !== '' ? String(row[columnMapping['title']] || '').trim() : '';
                if (!title) continue;
                let startDate = columnMapping['start_date'] !== undefined && columnMapping['start_date'] !== '' ? row[columnMapping['start_date']] : null;
                let targetDate = columnMapping['target_date'] !== undefined && columnMapping['target_date'] !== '' ? row[columnMapping['target_date']] : null;
                startDate = parseExcelDateValue(startDate) || minUploadStartDate || uploadDayKey;
                targetDate = parseExcelDateValue(targetDate) || project?.end_date || startDate;

                // Clamp dates within project range
                const projStart = project?.start_date;
                const projEnd = project?.end_date;
                if (projStart && startDate < projStart) startDate = projStart;
                if (projEnd && startDate > projEnd) startDate = projEnd;
                if (projStart && targetDate < projStart) targetDate = projStart;
                if (projEnd && targetDate > projEnd) targetDate = projEnd;
                if (startDate > targetDate) targetDate = startDate;

                if (minUploadStartDate && startDate < minUploadStartDate) {
                    errors.push({
                        row: i + 2,
                        message: `Start date ${startDate} cannot be before ${minUploadStartDate}`
                    });
                    continue;
                }

                try {
                    await api.post('ddtme/big-tasks/', {
                        project: projectId,
                        title,
                        start_date: startDate,
                        target_date: targetDate,
                        type: 'X',
                        status: 'In Progress'
                    });
                    created++;
                } catch (err) {
                    errors.push({ row: i + 2, message: err.response?.data?.error || err.message });
                }
            }
            setExcelUploadStatus({ success: true, tasksCreated: created, errors });
            setMappingStep(false);
            setExcelPreview(null);
            if (created > 0) fetchTasks();
        } catch (err) {
            setExcelUploadStatus({ error: err.message || 'Import failed' });
            setMappingStep(false);
        }
    };

    const handleExcelBackToUpload = () => {
        setMappingStep(false);
        setExcelPreview(null);
        setColumnMapping({});
        setExcelUploadStatus(null);
    };

    const closeExcelModal = () => {
        setShowExcelModal(false);
        setExcelUploadStatus(null);
        setMappingStep(false);
        setExcelPreview(null);
        setColumnMapping({});
    };


    const markCompleted = async (id) => {
        try {
            await api.patch(`ddtme/big-tasks/${id}/`, { status: "Completed" });
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
            const payload = {
                project: projectId,
                name: 'New KPI',
                baseline: '-',
                target: '-'
            };
            const res = await api.post(`ddtme/kpis/`, payload);
            await fetchKPIs();
            startEditingKpi(res.data);
        } catch (error) {
            console.error("Quick add KPI failed", error);
        }
    };

    const saveKpi = async (kpiId) => {
        try {
            const payload = {
                name: editingKpiName,
                baseline: editingKpiBaseline,
                target: editingKpiTarget
            };
            await api.patch(`ddtme/kpis/${kpiId}/`, payload);
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
            await api.delete(`ddtme/kpis/${id}/`);
            fetchKPIs();
        } catch (error) {
            console.error("Delete KPI failed", error);
        }
    };

    const handleKpiUpdate = async (kpiId, monthLabel, value) => {
        try {
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
            await api.post(`ddtme/kpi-updates/batch_update/`, {
                updates: [payload]
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

    const fetchAllPaginated = async (endpoint, mapItem = (item) => item) => {
        let nextUrl = endpoint;
        const records = [];

        while (nextUrl) {
            const response = await api.get(nextUrl);
            const payload = response.data;

            if (Array.isArray(payload)) {
                return payload.map(mapItem);
            }

            const pageResults = Array.isArray(payload?.results) ? payload.results : [];
            records.push(...pageResults.map(mapItem));
            nextUrl = payload?.next || null;
        }

        return records;
    };

    const handleDownload4TWithKpi = async () => {
        try {
            const disableProblematicTextProcessors = (doc) => {
                try {
                    if (!doc?.internal?.events?.getTopics || !doc?.internal?.events?.unsubscribe) return;
                    const topics = doc.internal.events.getTopics();
                    const pre = topics?.preProcessText || {};
                    const post = topics?.postProcessText || {};

                    Object.keys(pre).forEach((token) => {
                        doc.internal.events.unsubscribe(token);
                    });

                    Object.keys(post).forEach((token) => {
                        doc.internal.events.unsubscribe(token);
                    });

                    if (typeof doc.setR2L === 'function') {
                        doc.setR2L(false);
                    }
                } catch (hookError) {
                    console.warn('Unable to disable jsPDF text hooks', hookError);
                }
            };

            const sanitizePdfText = (value) => {
                if (value === null || value === undefined) return '';
                return String(value)
                    .normalize('NFKD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
            };

            const sanitizePdfHeader = (value, fallback) => {
                const safe = sanitizePdfText(value);
                return safe || fallback;
            };

            const sanitizePdfMultiline = (value) => {
                if (value === null || value === undefined) return '';
                return String(value)
                    .normalize('NFKD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                    .replace(/\r\n/g, '\n')
                    .split('\n')
                    .map((line) => line.replace(/\s{2,}/g, ' ').trim())
                    .join('\n')
                    .trim();
            };

            const allTasksForPdf = await fetchAllPaginated(
                `ddtme/big-tasks/?project_id=${projectId}`,
                (task) => ({
                    ...task,
                    startDate: task.startDate || task.start_date,
                    targetDate: task.targetDate || task.target_date,
                })
            );

            const allKpisForPdf = await fetchAllPaginated(`ddtme/kpis/?project_id=${projectId}`);

            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            disableProblematicTextProcessors(doc);
            const pageWidth = doc.internal.pageSize.getWidth();
            const generatedAt = new Date().toLocaleString('en-GB');
            const projectName = sanitizePdfText(project?.name || project?.title || 'Project') || 'Project';

            const brandOrange = [245, 138, 75];
            const slate900 = [15, 23, 42];
            const slate700 = [51, 65, 85];
            const slate600 = [71, 85, 105];
            const slate100 = [241, 245, 249];
            const border = [203, 213, 225];
            const allPdfTasks = allTasksForPdf.length
                ? [
                    ...allTasksForPdf.filter((task) => task.status !== 'Completed'),
                    ...allTasksForPdf.filter((task) => task.status === 'Completed'),
                ]
                : processedTasks;
            const allPdfKpis = allKpisForPdf.length ? allKpisForPdf : kpis;
            const safeTimelineColumns = timelineColumns.map((col, index) => ({
                ...col,
                label: sanitizePdfHeader(col?.label, `Timeline ${index + 1}`),
            }));
            const safeMonths = months.map((monthLabel, index) => sanitizePdfHeader(monthLabel, `Month ${index + 1}`));

            const internalTeamMembers = [
                project?.assigned_sgm_name ? `${project.assigned_sgm_name} (SGM)` : null,
                ...(project?.team_members_details || []).map((member) => member?.full_name || member?.username || member?.email || ''),
            ].filter(Boolean);

            const externalTeamMembers = [
                project?.external_lead_email ? `${project.external_lead_email} (Lead)` : null,
                ...(project?.external_team_details || []).map((member) => member?.username || member?.full_name || member?.email || ''),
            ].filter(Boolean);

            const timelineText = sanitizePdfText(`${project?.start_date || 'TBD'} - ${project?.end_date || 'Ongoing'}`) || 'TBD - Ongoing';
            const targetText = sanitizePdfMultiline(project?.target || project?.description || 'No target available.') || 'No target available.';

            const drawSummaryBlock = (x, y, width, height, title, bodyText) => {
                const titleY = y + 18;
                const bodyY = y + 34;
                const safeTitle = sanitizePdfText(title) || '-';
                const safeBody = sanitizePdfMultiline(bodyText) || '-';
                const wrapped = doc.splitTextToSize(safeBody, width - 16);
                const maxLines = Math.max(1, Math.floor((height - 40) / 12));

                doc.setDrawColor(...border);
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(x, y, width, height, 8, 8, 'FD');

                doc.setFontSize(10);
                doc.setTextColor(...slate600);
                doc.setFont(undefined, 'bold');
                doc.text(safeTitle, x + 8, titleY);

                doc.setFontSize(9);
                doc.setTextColor(...slate700);
                doc.setFont(undefined, 'normal');
                doc.text(wrapped.slice(0, maxLines), x + 8, bodyY);
            };

            doc.setFontSize(16);
            doc.setTextColor(...slate900);
            doc.text('4T + KPI Report', pageWidth / 2, 34, { align: 'center' });
            doc.setFontSize(11);
            doc.setTextColor(...slate700);
            doc.text(`Project: ${projectName}`, 40, 56);
            doc.text(`Timeline: ${project?.start_date || '-'} to ${project?.end_date || '-'}`, 40, 72);
            doc.text(`Generated: ${generatedAt}`, 40, 88);

            const summaryBoxX = 40;
            const summaryBoxY = 102;
            const summaryBoxWidth = pageWidth - 80;
            const summaryBoxHeight = 94;
            const innerGap = 10;
            const sectionWidth = (summaryBoxWidth - (innerGap * 4)) / 3;

            doc.setFillColor(...slate100);
            doc.roundedRect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight, 10, 10, 'F');

            drawSummaryBlock(
                summaryBoxX + innerGap,
                summaryBoxY + 10,
                sectionWidth,
                summaryBoxHeight - 20,
                'TEAM',
                `HQEPL: ${internalTeamMembers.join(', ') || 'No internal members'}\nClient: ${externalTeamMembers.join(', ') || 'No external members'}`
            );

            drawSummaryBlock(
                summaryBoxX + (innerGap * 2) + sectionWidth,
                summaryBoxY + 10,
                sectionWidth,
                summaryBoxHeight - 20,
                'TIMELINE',
                timelineText
            );

            drawSummaryBlock(
                summaryBoxX + (innerGap * 3) + (sectionWidth * 2),
                summaryBoxY + 10,
                sectionWidth,
                summaryBoxHeight - 20,
                'TARGET',
                targetText
            );

            doc.setFillColor(...brandOrange);
            doc.roundedRect(40, 212, 26, 18, 4, 4, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.text('T', 53, 225, { align: 'center' });
            doc.setTextColor(...slate900);
            doc.setFontSize(14);
            doc.text('TASKS', 74, 226);

            const taskHead = [
                'Sr.',
                'Task Description',
                'Type',
                'Target',
                ...safeTimelineColumns.map((col, i) => col?.label || `Timeline ${i + 1}`),
                'Status',
            ];

            const taskBody = allPdfTasks.length
                ? allPdfTasks.map((task, index) => [
                    String(index + 1),
                    sanitizePdfText(task.title || ''),
                    sanitizePdfText(task.type || ''),
                    sanitizePdfText(task.targetDate || task.target_date || ''),
                    ...safeTimelineColumns.map((col) => (
                        isTaskActiveInColumn(task, col)
                            ? (task.status === 'Completed' ? 'Completed' : 'Planned')
                            : ''
                    )),
                    sanitizePdfText(task.status || ''),
                ])
                : [['-', 'No tasks available', '-', '-', ...safeTimelineColumns.map(() => ''), '-']];

            const timelineStartIndex = 4;
            const statusColIndex = taskHead.length - 1;
            const timelineEndIndex = statusColIndex - 1;

            autoTable(doc, {
                head: [taskHead],
                body: taskBody,
                startY: 236,
                theme: 'grid',
                styles: {
                    fontSize: 7,
                    cellPadding: 3,
                    overflow: 'linebreak',
                    textColor: slate700,
                    lineColor: border,
                    lineWidth: 0.5,
                },
                headStyles: {
                    fillColor: slate100,
                    textColor: slate600,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                bodyStyles: { valign: 'middle' },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 28 },
                    1: { halign: 'left', cellWidth: 170 },
                    2: { halign: 'center', cellWidth: 34 },
                    3: { halign: 'center', cellWidth: 58 },
                    [statusColIndex]: { halign: 'center', cellWidth: 62 },
                },
                didParseCell: (hookData) => {
                    const { section, column, cell } = hookData;
                    if (section !== 'body') return;

                    if (column.index >= timelineStartIndex && column.index <= timelineEndIndex && cell.raw) {
                        const isCompleted = String(cell.raw).toLowerCase() === 'completed';
                        cell.styles.fillColor = isCompleted ? [16, 185, 129] : [59, 130, 246];
                        cell.styles.textColor = [255, 255, 255];
                        cell.styles.halign = 'center';
                        cell.styles.fontStyle = 'bold';
                    }

                    if (column.index === statusColIndex && cell.raw) {
                        const isCompleted = String(cell.raw).toLowerCase() === 'completed';
                        cell.styles.fillColor = isCompleted ? [220, 252, 231] : [219, 234, 254];
                        cell.styles.textColor = isCompleted ? [6, 95, 70] : [30, 64, 175];
                        cell.styles.fontStyle = 'bold';
                        cell.styles.halign = 'center';
                    }
                },
                margin: { left: 24, right: 24 },
            });

            doc.addPage('a4', 'landscape');
            doc.setFillColor(...slate900);
            doc.roundedRect(40, 26, 26, 18, 4, 4, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text('K', 53, 39, { align: 'center' });
            doc.setTextColor(...slate900);
            doc.setFontSize(14);
            doc.text('KEY PERFORMANCE INDICATORS (KPIS)', 74, 40);
            doc.setFontSize(10);
            doc.setTextColor(...slate700);
            doc.text(`Project: ${projectName}`, 40, 56);
            doc.text(`Generated: ${generatedAt}`, 40, 70);

            const kpiHead = [
                'Sr. No.',
                'KPI Description',
                'Base-line',
                'Target',
                ...safeMonths,
            ];

            const kpiBody = allPdfKpis.length
                ? allPdfKpis.map((kpi, index) => [
                    String(index + 1),
                    sanitizePdfText(kpi.name || ''),
                    sanitizePdfText(kpi.baseline || ''),
                    sanitizePdfText(kpi.target || ''),
                    ...safeMonths.map((m) => sanitizePdfText(getKpiValueForMonth(kpi, m) || '')),
                ])
                : [['-', 'No KPI data available', '-', '-', ...safeMonths.map(() => '')]];

            autoTable(doc, {
                head: [kpiHead],
                body: kpiBody,
                startY: 82,
                theme: 'grid',
                styles: {
                    fontSize: 7,
                    cellPadding: 3,
                    overflow: 'linebreak',
                    textColor: slate700,
                    lineColor: border,
                    lineWidth: 0.5,
                },
                headStyles: {
                    fillColor: slate100,
                    textColor: slate600,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 36 },
                    1: { halign: 'left', cellWidth: 180 },
                    2: { halign: 'center', cellWidth: 58 },
                    3: { halign: 'center', cellWidth: 58 },
                },
                didParseCell: (hookData) => {
                    const { section, column, cell } = hookData;
                    if (section !== 'body') return;

                    if (column.index === 3 && cell.raw) {
                        cell.styles.fillColor = [220, 252, 231];
                        cell.styles.textColor = [6, 95, 70];
                        cell.styles.fontStyle = 'bold';
                    }
                },
                margin: { left: 24, right: 24 },
            });

            const safeProjectName = String(projectName).replace(/[^a-zA-Z0-9_-]/g, '_');
            doc.save(`4T_KPI_${safeProjectName}_${todayKey}.pdf`);
        } catch (error) {
            console.error('Failed to download 4T + KPI report', error);
            try {
                const fallbackSanitize = (value) => {
                    if (value === null || value === undefined) return '';
                    return String(value)
                        .normalize('NFKD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                        .replace(/\s{2,}/g, ' ')
                        .trim();
                };

                const fallbackDoc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                const fallbackTopics = fallbackDoc?.internal?.events?.getTopics?.() || {};
                const fallbackPre = fallbackTopics?.preProcessText || {};
                const fallbackPost = fallbackTopics?.postProcessText || {};

                Object.keys(fallbackPre).forEach((token) => {
                    fallbackDoc.internal.events.unsubscribe(token);
                });

                Object.keys(fallbackPost).forEach((token) => {
                    fallbackDoc.internal.events.unsubscribe(token);
                });

                if (typeof fallbackDoc.setR2L === 'function') {
                    fallbackDoc.setR2L(false);
                }

                const fallbackProjectName = fallbackSanitize(project?.name || project?.title || 'Project') || 'Project';
                const safeProjectName = String(fallbackProjectName).replace(/[^a-zA-Z0-9_-]/g, '_');
                const fallbackTasks = processedTasks.slice(0, 120);

                fallbackDoc.setFontSize(14);
                fallbackDoc.text('4T + KPI Report (Compatibility Mode)', 40, 40);
                fallbackDoc.setFontSize(10);
                fallbackDoc.text(`Project: ${fallbackProjectName}`, 40, 60);
                fallbackDoc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 40, 74);

                let y = 96;
                fallbackDoc.setFontSize(11);
                fallbackDoc.text('Tasks', 40, y);
                y += 16;

                fallbackDoc.setFontSize(9);
                fallbackTasks.forEach((task, index) => {
                    if (y > 790) {
                        fallbackDoc.addPage();
                        y = 40;
                    }
                    const row = `${index + 1}. ${fallbackSanitize(task?.title || '')} | ${fallbackSanitize(task?.status || '')} | ${fallbackSanitize(task?.targetDate || task?.target_date || '')}`;
                    const lines = fallbackDoc.splitTextToSize(row || '-', 520);
                    fallbackDoc.text(lines, 40, y);
                    y += (lines.length * 11) + 3;
                });

                fallbackDoc.save(`4T_KPI_${safeProjectName}_${todayKey}.pdf`);
                alert('Downloaded a compatibility PDF after a rendering issue.');
                return;
            } catch (fallbackError) {
                console.error('Compatibility PDF fallback also failed', fallbackError);
            }
            alert('Failed to download report. Please try again.');
        }
    };


    const role = (localStorage.getItem('role') || '').toUpperCase();
    const canEdit = ['ADMIN', 'HQEPL', 'SGM'].includes(role);

    return (
        <div className="w-full font-sans text-slate-900 bg-white">
            <style>{bigTaskScrollbarStyles}</style>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 px-1 gap-3">
                <div className="flex items-center gap-3">
                    <span className="bg-[#F58A4B] p-1.5 rounded text-white shadow-sm">
                        <Zap size={16} fill="currentColor" />
                    </span>
                    <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-800 uppercase">Tasks</h1>
                </div>

                <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                    <button
                        onClick={handleDownload4TWithKpi}
                        className="flex items-center gap-1 md:gap-2 bg-emerald-100 border border-emerald-300 text-emerald-700 hover:bg-emerald-200 px-2 py-1.5 md:px-3 md:py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors"
                    >
                        <Download size={14} />
                        <span className="hidden sm:inline">Download PDF</span>
                        <span className="sm:hidden">PDF</span>
                    </button>

                    <div className="flex bg-slate-100 p-0.5 md:p-1 rounded-lg">
                        {['Day', 'Week', 'Month', 'Year'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-2 py-1 md:px-3 md:py-1.5 rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === mode
                                    ? 'bg-white text-[#F58A4B] shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    {canEdit && (
                        <div className="flex items-center gap-1 md:gap-2">
                            <button onClick={() => setShowExcelModal(true)} className="flex items-center gap-1 md:gap-2 bg-blue-100 border border-blue-300 text-blue-700 hover:bg-blue-200 px-2 py-1.5 md:px-3 md:py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors">
                                <Upload size={14} /> <span className="hidden sm:inline">Upload Excel</span><span className="sm:hidden">Upload</span>
                            </button>
                            <button onClick={handleQuickAddTask} className="flex items-center justify-center bg-[#F58A4B] hover:bg-orange-600 text-white px-2 py-1.5 md:px-3 md:py-2 rounded text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors">
                                <Plus size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div
                ref={tasksTableScrollRef}
                className="border border-slate-300 overflow-x-auto overflow-y-auto relative bigtask-scrollbar"
                style={{ maxHeight: `min(${taskTableViewportMaxHeight}px, calc(100vh - 280px))` }}
            >
                <table className="w-full border-collapse min-w-max">
                    <thead>
                        <tr className="bg-slate-100 divide-x divide-slate-300 border-b border-slate-300">
                            <th className="p-2 w-10 md:w-12 min-w-[40px] md:min-w-[48px] text-center text-[9px] md:text-[10px] font-bold text-slate-600 uppercase sticky left-0 z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Sr.</th>
                            <th className="p-2 w-[180px] md:w-[300px] min-w-[180px] md:min-w-[300px] text-left text-[9px] md:text-[10px] font-bold text-slate-600 uppercase pl-3 sticky left-[40px] md:left-[48px] z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Task Description</th>
                            <th className="p-2 w-20 md:w-24 min-w-[80px] md:min-w-[96px] text-center text-[9px] md:text-[10px] font-bold text-slate-600 uppercase sticky left-[220px] md:left-[348px] z-30 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Target</th>
                            {timelineColumns.map((col, i) => (
                                <th key={i} className="p-1 text-center text-[10px] font-bold text-slate-600 uppercase bg-slate-50 min-w-[40px] whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                            <th className="p-2 w-28 md:w-32 min-w-[112px] md:min-w-[128px] text-center text-[9px] md:text-[10px] font-bold text-slate-600 uppercase sticky right-0 z-30 bg-slate-100 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {processedTasks.map((task, index) => {
                            const rowBg = task.type === 'Y' ? 'bg-orange-50' : 'bg-white';
                            return (
                                <tr data-task-id={task.id} key={task.id} className={`divide-x divide-slate-300 ${task.type === 'Y' ? 'bg-orange-50' : 'bg-white hover:bg-slate-50'} group`}>
                                    <td className={`p-2 text-center text-xs font-semibold text-slate-500 sticky left-0 z-20 ${rowBg} group-hover:bg-slate-50 transition-colors`}>{index + 1}</td>

                                    <td className={`p-2 pl-3 sticky left-[40px] md:left-[48px] z-20 ${rowBg} group-hover:bg-slate-50 transition-colors`}>
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
                                                            min={task.id === lastQuickAddedTaskId ? (minimumStartDate || project?.start_date) : project?.start_date}
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
                                                            min={editingStartDate || (task.id === lastQuickAddedTaskId ? (minimumStartDate || project?.start_date) : project?.start_date)}
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

                                    <td className={`p-2 text-center text-[10px] font-bold text-slate-600 sticky left-[220px] md:left-[348px] z-20 ${rowBg} group-hover:bg-slate-50 transition-colors`}>
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
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-1 gap-3">
                    <div className="flex items-center gap-3">
                        <span className="bg-slate-900 p-1.5 rounded text-white shadow-sm">
                            <Target size={16} />
                        </span>
                        <h2 className="text-base md:text-lg font-bold tracking-tight text-slate-800 uppercase">Key Performance Indicators (KPIs)</h2>
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
                    <form onSubmit={handleAddTask} className="relative bg-white w-full max-w-lg rounded-xl p-5 md:p-8 shadow-2xl border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Add Task</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-100 p-1.5 rounded-full text-slate-400"><CloseIcon size={18} /></button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Task Title</label>
                                <input required className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-sm font-bold focus:outline-none" placeholder="Task Name" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Start Date</label>
                                    <input type="date" required min={minimumStartDate || project?.start_date} max={project?.end_date} className="w-full bg-slate-50 border border-slate-300 rounded px-4 py-3 text-sm font-bold outline-none" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
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

            {/* --- EXCEL UPLOAD MODAL --- */}
            {showExcelModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeExcelModal} />
                    <div className="relative bg-white w-full max-w-lg rounded-xl p-5 md:p-8 shadow-2xl border border-slate-100 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                                {mappingStep ? 'Map Excel Columns' : 'Upload Excel File'}
                            </h3>
                            <button type="button" onClick={closeExcelModal} className="bg-slate-100 p-1.5 rounded-full text-slate-400 hover:text-slate-600">
                                <CloseIcon size={18} />
                            </button>
                        </div>

                        {/* FILE UPLOAD STEP */}
                        {!mappingStep && !excelUploadStatus && (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                                    <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                                    <p className="text-sm font-bold text-slate-600 mb-1">Choose an .xlsx file</p>
                                    <p className="text-xs text-slate-400 mb-4">Supported columns: Task, Start Date, Target Date</p>
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        onChange={handleExcelFileSelect}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                </div>
                            </div>
                        )}

                        {/* COLUMN MAPPING STEP */}
                        {mappingStep && excelPreview && !excelUploadStatus && (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm font-bold text-blue-700">Map your Excel columns to Task fields</p>
                                    <p className="text-xs text-blue-600 mt-1">Select which Excel column contains each field. Leave as "Skip" if not in your file.</p>
                                </div>

                                {[{ key: 'title', label: 'Task Title', required: true }, { key: 'start_date', label: 'Start Date' }, { key: 'target_date', label: 'Target Date' }].map(field => (
                                    <div key={field.key} className="flex items-center justify-between gap-4">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider min-w-[120px]">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                            value={columnMapping[field.key] ?? ''}
                                            onChange={e => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        >
                                            <option value="">— Skip —</option>
                                            {excelPreview.columns.map((colName, colIdx) => (
                                                <option key={colIdx} value={colIdx}>{colName}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}

                                {/* Preview */}
                                {excelPreview.rows.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Preview (first {excelPreview.rows.length} rows)</p>
                                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-slate-100">
                                                        {excelPreview.columns.map((col, i) => (
                                                            <th key={i} className="px-2 py-1.5 text-left font-bold text-slate-600 whitespace-nowrap">{col}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {excelPreview.rows.map((row, ri) => (
                                                        <tr key={ri} className="border-t border-slate-100">
                                                            {excelPreview.columns.map((_, ci) => (
                                                                <td key={ci} className="px-2 py-1 text-slate-600 whitespace-nowrap">{row[ci] ?? ''}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button onClick={handleExcelBackToUpload} className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-300 transition-all">
                                        Back
                                    </button>
                                    <button onClick={handleExcelConfirmMapping} className="flex-1 py-3 bg-slate-900 hover:bg-[#F58A4B] text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-all">
                                        Import Tasks
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* LOADING */}
                        {excelUploadStatus?.loading && (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                                <span className="ml-3 text-sm font-bold text-slate-600">Importing tasks...</span>
                            </div>
                        )}

                        {/* ERROR */}
                        {excelUploadStatus?.error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-sm font-bold text-red-700">{excelUploadStatus.error}</p>
                                <button onClick={handleExcelBackToUpload} className="mt-3 text-xs font-bold text-red-600 underline">Try Again</button>
                            </div>
                        )}

                        {/* SUCCESS */}
                        {excelUploadStatus?.success && (
                            <div className="space-y-4">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                    <p className="text-sm font-bold text-emerald-700">
                                        {excelUploadStatus.tasksCreated} task{excelUploadStatus.tasksCreated !== 1 ? 's' : ''} created successfully.
                                    </p>
                                </div>
                                {excelUploadStatus.errors?.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                        <p className="text-xs font-bold text-amber-700 mb-1">{excelUploadStatus.errors.length} row(s) had errors:</p>
                                        <ul className="text-xs text-amber-600 list-disc pl-4">
                                            {excelUploadStatus.errors.map((err, i) => (
                                                <li key={i}>Row {err.row}: {err.message}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <button onClick={closeExcelModal} className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-[#F58A4B] transition-all">
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default BigTask;
