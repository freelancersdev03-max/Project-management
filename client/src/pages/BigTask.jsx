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
            if (wholeDays < 20000 || wholeDays > 60000) return null;

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

    const normalizeExcelHeader = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');

    const isGenericExcelHeader = (value) => {
        const normalized = normalizeExcelHeader(value);
        return !normalized || ['sr no', 'serial', 'plan', 'actual', 'value', 'date', 'name', 'column'].includes(normalized);
    };

    const inferExcelColumnMapping = (headers = []) => {
        const mapping = {};

        headers.forEach((header, index) => {
            const normalized = normalizeExcelHeader(header);
            if (!normalized) return;

            const isTaskTitle = normalized.includes('deliverable') || normalized.includes('task title') || normalized === 'task' || normalized.includes('task ') || normalized.includes('title') || normalized.includes('description');
            const isStartDate = normalized.includes('start date') || normalized === 'start' || normalized.includes('start');
            const isTargetDate = normalized.includes('target date') || normalized.includes('due date') || normalized.includes('end date') || normalized.includes('finish date') || normalized.includes('deadline');

            if (isTaskTitle && mapping.title === undefined) mapping.title = index;
            if (isStartDate && mapping.start_date === undefined) mapping.start_date = index;
            if (isTargetDate && mapping.target_date === undefined) mapping.target_date = index;
        });

        return mapping;
    };

    const findHeaderColumnIndex = (headers = [], matcher) => {
        for (let index = 0; index < headers.length; index += 1) {
            if (matcher(normalizeExcelHeader(headers[index]))) {
                return index;
            }
        }

        return undefined;
    };

    const inferRequiredColumnsFromHeaders = (headers = []) => {
        const mapping = {};

        const titleIndex = findHeaderColumnIndex(headers, (value) => (
            value.includes('deliverable') ||
            value.includes('task title') ||
            value === 'task' ||
            value.includes('title') ||
            value.includes('description')
        ));

        const startDateIndex = findHeaderColumnIndex(headers, (value) => (
            value.includes('start date') ||
            value === 'start date' ||
            value.endsWith(' start date') ||
            value.includes('starting date')
        ));

        const targetDateIndex = findHeaderColumnIndex(headers, (value) => (
            value.includes('target date') ||
            value.includes('due date') ||
            value.includes('end date') ||
            value.includes('finish date') ||
            value.includes('deadline')
        ));

        if (titleIndex !== undefined) mapping.title = titleIndex;
        if (startDateIndex !== undefined) mapping.start_date = startDateIndex;
        if (targetDateIndex !== undefined) mapping.target_date = targetDateIndex;

        return mapping;
    };

    const inferExcelColumnMappingFromData = (rows = [], existingHeaders = []) => {
        const columnCount = Math.max(existingHeaders.length, ...rows.map((row) => (Array.isArray(row) ? row.length : 0)), 0);
        const columnStats = Array.from({ length: columnCount }, (_, index) => ({
            index,
            dateCount: 0,
            textCount: 0,
            shortTextCount: 0,
            totalTextLength: 0,
        }));

        rows.slice(0, 12).forEach((row) => {
            if (!Array.isArray(row)) return;

            row.forEach((cell, index) => {
                const value = String(cell ?? '').trim();
                if (!value) return;

                const stats = columnStats[index];
                if (!stats) return;

                const parsedDate = parseExcelDateValue(cell);
                if (parsedDate) {
                    stats.dateCount += 1;
                    return;
                }

                stats.textCount += 1;
                stats.totalTextLength += value.length;
                if (value.length <= 5) stats.shortTextCount += 1;
            });
        });

        const dateColumns = columnStats
            .filter((stats) => stats.dateCount >= 2)
            .sort((left, right) => right.dateCount - left.dateCount || left.index - right.index);

        const textColumns = columnStats
            .filter((stats) => stats.textCount >= 2)
            .sort((left, right) => {
                const leftAvg = left.textCount ? left.totalTextLength / left.textCount : 0;
                const rightAvg = right.textCount ? right.totalTextLength / right.textCount : 0;
                return rightAvg - leftAvg || right.textCount - left.textCount || left.index - right.index;
            });

        const mapping = {};

        if (dateColumns[0]) mapping.start_date = dateColumns[0].index;
        if (dateColumns[1]) mapping.target_date = dateColumns[1].index;

        const filteredTextColumns = textColumns.filter((stats) => !dateColumns.some((dateStats) => dateStats.index === stats.index));
        if (filteredTextColumns[0]) mapping.title = filteredTextColumns[0].index;

        return mapping;
    };

    const isNonEmptyExcelRow = (row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '');

    const isLikelyExcelHeaderRow = (row = []) => {
        if (!Array.isArray(row) || row.length === 0) return false;

        let keywordHits = 0;
        let textCells = 0;
        let dateLikeCells = 0;
        let numericLikeCells = 0;

        row.forEach((cell) => {
            const value = String(cell ?? '').trim();
            if (!value) return;

            const normalized = normalizeExcelHeader(value);
            const parsedDate = parseExcelDateValue(value);
            const numericValue = Number(value);

            if (normalized) {
                textCells += 1;
                if (
                    normalized.includes('deliverable') ||
                    normalized.includes('task') ||
                    normalized.includes('title') ||
                    normalized.includes('start date') ||
                    normalized.includes('target date') ||
                    normalized.includes('priority') ||
                    normalized.includes('plan') ||
                    normalized.includes('actual') ||
                    normalized.includes('sr no') ||
                    normalized.includes('serial')
                ) {
                    keywordHits += 1;
                }
            }

            if (parsedDate) dateLikeCells += 1;
            if (!Number.isNaN(numericValue) && value !== '') numericLikeCells += 1;
        });

        const populatedCells = textCells + dateLikeCells + numericLikeCells;
        if (populatedCells === 0) return false;

        const headerRatio = keywordHits / populatedCells;
        const textRatio = textCells / populatedCells;
        const dataRatio = (dateLikeCells + numericLikeCells) / populatedCells;

        return keywordHits >= 2 || (textRatio >= 0.7 && dataRatio <= 0.25 && keywordHits >= 1);
    };

    const buildMergedExcelHeaders = (rows = [], headerRowIndex = 0) => {
        const primary = Array.isArray(rows[headerRowIndex]) ? rows[headerRowIndex] : [];
        const secondary = Array.isArray(rows[headerRowIndex + 1]) ? rows[headerRowIndex + 1] : [];
        const shouldMergeSecondary = isLikelyExcelHeaderRow(secondary);
        const columnCount = Math.max(primary.length, shouldMergeSecondary ? secondary.length : 0);

        return Array.from({ length: columnCount }, (_, index) => {
            const first = String(primary[index] ?? '').trim();
            const second = String(secondary[index] ?? '').trim();

            if (shouldMergeSecondary && first && second && normalizeExcelHeader(first) !== normalizeExcelHeader(second)) {
                return `${first} ${second}`.trim();
            }

            return first || second || '';
        });
    };

    const detectExcelHeaderRowIndex = (rows = []) => {
        let fallbackIndex = 0;

        for (let index = 0; index < Math.min(rows.length, 20); index += 1) {
            const row = rows[index];
            if (!isNonEmptyExcelRow(row)) continue;

            const normalizedValues = row.map(normalizeExcelHeader).filter(Boolean);
            const keywordHits = normalizedValues.filter((value) => (
                value.includes('deliverable') ||
                value.includes('start date') ||
                value.includes('target date') ||
                value.includes('task') ||
                value.includes('title') ||
                value.includes('priority') ||
                value.includes('sr no') ||
                value.includes('serial') ||
                value.includes('plan')
            )).length;

            const hasCoreHeaders = normalizedValues.some((value) => value.includes('deliverable') || value.includes('start date') || value.includes('target date'));

            if (hasCoreHeaders && keywordHits >= 2) {
                return index;
            }

            if (fallbackIndex === 0) {
                fallbackIndex = index;
            }
        }

        return fallbackIndex;
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
    const [subtaskDrafts, setSubtaskDrafts] = useState({});

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
            scrollbar-color: var(--k-grey-300) transparent;
        }

        .bigtask-scrollbar::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        .bigtask-scrollbar::-webkit-scrollbar-track {
            background: var(--k-band-grey);
            border-radius: 999px;
        }

        .bigtask-scrollbar::-webkit-scrollbar-thumb {
            background: var(--k-grey-300);
            border-radius: 999px;
            border: 2px solid var(--k-band-grey);
        }

        .bigtask-scrollbar::-webkit-scrollbar-thumb:hover {
            background: var(--k-blue);
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
                targetDate: t.target_date,
                parentTask: t.parent_task || null
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
        const taskMap = new Map(tasks.map((task) => [String(task.id), task]));
        const parentTasks = [];
        const childrenByParent = new Map();

        tasks.forEach((task) => {
            const parentId = task.parentTask;
            if (parentId && taskMap.has(String(parentId))) {
                const list = childrenByParent.get(String(parentId)) || [];
                list.push(task);
                childrenByParent.set(String(parentId), list);
            } else {
                parentTasks.push(task);
            }
        });

        const orderByStatus = (list) => {
            const active = list.filter((t) => t.status !== 'Completed');
            const completed = list.filter((t) => t.status === 'Completed');
            return [...active, ...completed];
        };

        const flattenWithChildren = (list, parentNumberParts = []) => {
            return orderByStatus(list).flatMap((parent, index) => {
                const numberParts = [...parentNumberParts, index + 1];
                const children = childrenByParent.get(String(parent.id)) || [];

                return [{
                    ...parent,
                    _isSubtask: parentNumberParts.length > 0,
                    _parentTaskId: parent.parentTask || null,
                    _taskNumber: numberParts.join('.'),
                    _taskDepth: parentNumberParts.length,
                }, ...flattenWithChildren(children, numberParts)];
            });
        };

        return flattenWithChildren(parentTasks);
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

    const openSubtaskDraft = (parentTask) => {
        const parentStartDate = parentTask.startDate || parentTask.start_date || '';
        setSubtaskDrafts((prev) => ({
            ...prev,
            [parentTask.id]: {
                title: 'New subtask',
                targetDate: parentTask.targetDate || parentTask.target_date || parentStartDate,
            },
        }));
    };

    const updateSubtaskDraft = (parentTaskId, key, value) => {
        setSubtaskDrafts((prev) => ({
            ...prev,
            [parentTaskId]: {
                ...(prev[parentTaskId] || { title: '', targetDate: '' }),
                [key]: value,
            },
        }));
    };

    const closeSubtaskDraft = (parentTaskId) => {
        setSubtaskDrafts((prev) => {
            const next = { ...prev };
            delete next[parentTaskId];
            return next;
        });
    };

    const createSubtask = async (parentTask) => {
        const parentTaskId = parentTask.id;
        const draft = subtaskDrafts[parentTaskId];
        if (!draft) return;

        const title = (draft.title || '').trim();
        const parentStartDate = parentTask.startDate || parentTask.start_date;
        const parentTargetDate = parentTask.targetDate || parentTask.target_date;
        const targetDate = draft.targetDate;

        if (!title) {
            alert('Please enter subtask title.');
            return;
        }

        if (!targetDate) {
            alert('Please select subtask target date.');
            return;
        }

        if (new Date(parentStartDate) > new Date(targetDate)) {
            alert('Subtask target date cannot be before parent start date.');
            return;
        }

        if (parentTargetDate && new Date(targetDate) > new Date(parentTargetDate)) {
            alert('Subtask target date cannot be after parent target date.');
            return;
        }

        try {
            const payload = {
                project: projectId,
                title,
                start_date: parentStartDate,
                target_date: targetDate,
                type: parentTask.type || 'X',
                status: 'In Progress',
                parent_task: parentTaskId,
            };

            await api.post('ddtme/big-tasks/', payload);
            await fetchTasks();
            closeSubtaskDraft(parentTaskId);
        } catch (error) {
            console.error('Failed to create subtask', error);
            if (error.response?.data) {
                alert(JSON.stringify(error.response.data));
            } else {
                alert('Failed to create subtask');
            }
        }
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
                    const activeTabIdx = workbook.Workbook?.WBView?.[0]?.activeTab || 0;
                    const sheetName = workbook.SheetNames[activeTabIdx] || workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const rows = utils.sheet_to_json(worksheet, { header: 1 });
                    if (rows.length === 0) {
                        setExcelUploadStatus({ error: 'Excel file is empty' });
                        return;
                    }
                    const headerRowIndex = detectExcelHeaderRowIndex(rows);
                    const headers = buildMergedExcelHeaders(rows, headerRowIndex);
                    
                    let allDataRowsRaw = rows.slice(headerRowIndex + 1).filter(isNonEmptyExcelRow);
                    let cutOffIndex = -1;
                    for (let i = 0; i < allDataRowsRaw.length; i++) {
                        const rowText = allDataRowsRaw[i].map(c => String(c || '').toLowerCase().trim()).join(' ');
                        if (rowText.includes('total hours') || rowText.includes('fixed tasks / other task') || rowText.includes('total bmd man days')) {
                            cutOffIndex = i;
                            break;
                        }
                    }
                    const allDataRows = cutOffIndex !== -1 ? allDataRowsRaw.slice(0, cutOffIndex) : allDataRowsRaw;
                    
                    const dataRows = allDataRows.slice(0, 5);
                    const requiredHeaderMapping = inferRequiredColumnsFromHeaders(headers);
                    const headerMapping = inferExcelColumnMapping(headers);
                    const dataMapping = inferExcelColumnMappingFromData(allDataRows, headers);
                    const previewColumns = [...headers];

                    if (typeof dataMapping.title === 'number' && isGenericExcelHeader(previewColumns[dataMapping.title])) {
                        previewColumns[dataMapping.title] = 'Task Title';
                    }

                    if (typeof dataMapping.start_date === 'number' && isGenericExcelHeader(previewColumns[dataMapping.start_date])) {
                        previewColumns[dataMapping.start_date] = 'Start Date';
                    }

                    if (typeof dataMapping.target_date === 'number' && isGenericExcelHeader(previewColumns[dataMapping.target_date])) {
                        previewColumns[dataMapping.target_date] = 'Target Date';
                    }

                    setExcelPreview({ columns: previewColumns, rows: dataRows, allRows: allDataRows, file });
                    setColumnMapping({ ...dataMapping, ...headerMapping, ...requiredHeaderMapping });
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

            // KAYAARA brand palette: blue #0086FF, ink #212121, grey family
            const brandBlue = [0, 134, 255];
            const inkDark = [33, 33, 33];
            const greyBody = [75, 79, 85];
            const greyMuted = [138, 144, 153];
            const greyFill = [242, 243, 245];
            const border = [228, 231, 235];
            const buildHierarchicalTasks = (sourceTasks) => {
                const taskMap = new Map(sourceTasks.map((task) => [String(task.id), task]));
                const parentTasks = [];
                const childrenByParent = new Map();

                sourceTasks.forEach((task) => {
                    const parentId = task.parentTask;
                    if (parentId && taskMap.has(String(parentId))) {
                        const list = childrenByParent.get(String(parentId)) || [];
                        list.push(task);
                        childrenByParent.set(String(parentId), list);
                    } else {
                        parentTasks.push(task);
                    }
                });

                const orderByStatus = (list) => {
                    const active = list.filter((t) => t.status !== 'Completed');
                    const completed = list.filter((t) => t.status === 'Completed');
                    return [...active, ...completed];
                };

                const flattenWithChildren = (list, parentNumberParts = []) => orderByStatus(list).flatMap((parent, index) => {
                    const numberParts = [...parentNumberParts, index + 1];
                    const children = childrenByParent.get(String(parent.id)) || [];

                    return [{
                        ...parent,
                        _isSubtask: parentNumberParts.length > 0,
                        _taskNumber: numberParts.join('.'),
                        _taskDepth: parentNumberParts.length,
                    }, ...flattenWithChildren(children, numberParts)];
                });

                return flattenWithChildren(parentTasks);
            };

            const allPdfTasks = allTasksForPdf.length
                ? buildHierarchicalTasks(allTasksForPdf)
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
                doc.setTextColor(...greyMuted);
                doc.setFont(undefined, 'bold');
                doc.text(safeTitle, x + 8, titleY);

                doc.setFontSize(9);
                doc.setTextColor(...greyBody);
                doc.setFont(undefined, 'normal');
                doc.text(wrapped.slice(0, maxLines), x + 8, bodyY);
            };

            doc.setFontSize(16);
            doc.setTextColor(...inkDark);
            doc.text('4T + KPI Report', pageWidth / 2, 34, { align: 'center' });
            doc.setFontSize(11);
            doc.setTextColor(...greyBody);
            doc.text(`Project: ${projectName}`, 40, 56);
            doc.text(`Timeline: ${project?.start_date || '-'} to ${project?.end_date || '-'}`, 40, 72);
            doc.text(`Generated: ${generatedAt}`, 40, 88);

            const summaryBoxX = 40;
            const summaryBoxY = 102;
            const summaryBoxWidth = pageWidth - 80;
            const summaryBoxHeight = 94;
            const innerGap = 10;
            const sectionWidth = (summaryBoxWidth - (innerGap * 4)) / 3;

            doc.setFillColor(...greyFill);
            doc.roundedRect(summaryBoxX, summaryBoxY, summaryBoxWidth, summaryBoxHeight, 10, 10, 'F');

            drawSummaryBlock(
                summaryBoxX + innerGap,
                summaryBoxY + 10,
                sectionWidth,
                summaryBoxHeight - 20,
                'TEAM',
                `KAYAARA: ${internalTeamMembers.join(', ') || 'No internal members'}\nClient: ${externalTeamMembers.join(', ') || 'No external members'}`
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

            doc.setFillColor(...brandBlue);
            doc.roundedRect(40, 212, 26, 18, 4, 4, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.text('T', 53, 225, { align: 'center' });
            doc.setTextColor(...inkDark);
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
                    String(task._taskNumber || index + 1),
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
                    textColor: greyBody,
                    lineColor: border,
                    lineWidth: 0.5,
                },
                headStyles: {
                    fillColor: greyFill,
                    textColor: greyMuted,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                },
                alternateRowStyles: { fillColor: [242, 243, 245] },
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
                        cell.styles.fillColor = isCompleted ? [0, 134, 255] : [102, 182, 255];
                        cell.styles.textColor = [255, 255, 255];
                        cell.styles.halign = 'center';
                        cell.styles.fontStyle = 'bold';
                    }

                    if (column.index === statusColIndex && cell.raw) {
                        const isCompleted = String(cell.raw).toLowerCase() === 'completed';
                        cell.styles.fillColor = isCompleted ? [0, 134, 255] : [233, 244, 255];
                        cell.styles.textColor = isCompleted ? [255, 255, 255] : [0, 104, 201];
                        cell.styles.fontStyle = 'bold';
                        cell.styles.halign = 'center';
                    }
                },
                margin: { left: 24, right: 24 },
            });

            doc.addPage('a4', 'landscape');
            doc.setFillColor(...inkDark);
            doc.roundedRect(40, 26, 26, 18, 4, 4, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.text('K', 53, 39, { align: 'center' });
            doc.setTextColor(...inkDark);
            doc.setFontSize(14);
            doc.text('KEY PERFORMANCE INDICATORS (KPIS)', 74, 40);
            doc.setFontSize(10);
            doc.setTextColor(...greyBody);
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
                    textColor: greyBody,
                    lineColor: border,
                    lineWidth: 0.5,
                },
                headStyles: {
                    fillColor: greyFill,
                    textColor: greyMuted,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                },
                alternateRowStyles: { fillColor: [242, 243, 245] },
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
                        cell.styles.fillColor = [233, 244, 255];
                        cell.styles.textColor = [0, 104, 201];
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
    const canEdit = ['ADMIN', 'KAYAARA', 'MLS', 'SGM'].includes(role);

    return (
        <div className="w-full" style={{ fontFamily: 'Poppins, sans-serif', color: 'var(--k-ink)', background: 'var(--k-white)' }}>
            <style>{bigTaskScrollbarStyles}</style>
            <div className="k-fade-up flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 px-1 gap-3">
                <div className="flex items-center gap-3">
                    <span className="p-1.5 rounded-lg" style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
                        <Zap size={16} fill="currentColor" />
                    </span>
                    <h1 className="k-section-title text-lg md:text-xl uppercase">Tasks</h1>
                </div>

                <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                    <button
                        onClick={handleDownload4TWithKpi}
                        className="k-btn-ghost flex items-center gap-1 md:gap-2 !px-3 !py-2 text-[10px] md:text-xs uppercase tracking-wider"
                    >
                        <Download size={14} />
                        <span className="hidden sm:inline">Download PDF</span>
                        <span className="sm:hidden">PDF</span>
                    </button>

                    <div className="flex p-0.5 md:p-1 rounded-xl" style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}>
                        {['Day', 'Week', 'Month', 'Year'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className="px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider transition-all"
                                style={{
                                    background: viewMode === mode ? 'var(--k-white)' : 'transparent',
                                    color: viewMode === mode ? 'var(--k-blue)' : 'var(--k-grey-500)',
                                    boxShadow: viewMode === mode ? 'var(--k-shadow-card)' : 'none',
                                }}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    {canEdit && (
                        <div className="flex items-center gap-1 md:gap-2">
                            <button onClick={() => setShowExcelModal(true)} className="k-btn-ghost flex items-center gap-1 md:gap-2 !px-3 !py-2 text-[10px] md:text-xs uppercase tracking-wider">
                                <Upload size={14} /> <span className="hidden sm:inline">Upload Excel</span><span className="sm:hidden">Upload</span>
                            </button>
                            <button onClick={handleQuickAddTask} aria-label="Quick add task" className="k-btn-primary flex items-center justify-center !px-3 !py-2 text-[10px] md:text-xs uppercase tracking-wider">
                                <Plus size={14} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div
                ref={tasksTableScrollRef}
                className="k-fade-up rounded-2xl border border-[var(--k-grey-200)] overflow-x-auto overflow-y-auto relative bigtask-scrollbar"
                style={{ maxHeight: `min(${taskTableViewportMaxHeight}px, calc(100vh - 280px))`, background: 'var(--k-white)' }}
            >
                <table className="w-full border-collapse min-w-max tabular-nums">
                    <thead>
                        <tr className="bg-[var(--k-band-grey)] divide-x divide-[var(--k-grey-200)] border-b border-[var(--k-grey-200)]">
                            <th className="p-2 w-10 md:w-12 min-w-[40px] md:min-w-[48px] text-center text-[9px] md:text-[10px] font-semibold text-[var(--k-grey-500)] uppercase tracking-widest sticky left-0 z-30 bg-[var(--k-band-grey)] shadow-[2px_0_5px_-2px_rgba(33,33,33,0.1)]">Sr.</th>
                            <th className="p-2 w-[180px] md:w-[300px] min-w-[180px] md:min-w-[300px] text-left text-[9px] md:text-[10px] font-semibold text-[var(--k-grey-500)] uppercase tracking-widest pl-3 sticky left-[40px] md:left-[48px] z-30 bg-[var(--k-band-grey)] shadow-[2px_0_5px_-2px_rgba(33,33,33,0.1)]">Task Description</th>
                            <th className="p-2 w-20 md:w-24 min-w-[80px] md:min-w-[96px] text-center text-[9px] md:text-[10px] font-semibold text-[var(--k-grey-500)] uppercase tracking-widest sticky left-[220px] md:left-[348px] z-30 bg-[var(--k-band-grey)] shadow-[2px_0_5px_-2px_rgba(33,33,33,0.1)]">Target</th>
                            {timelineColumns.map((col, i) => (
                                <th key={i} className="p-1 text-center text-[10px] font-semibold text-[var(--k-grey-500)] uppercase tracking-widest bg-[var(--k-band-grey)] min-w-[40px] whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                            <th className="p-2 w-28 md:w-32 min-w-[112px] md:min-w-[128px] text-center text-[9px] md:text-[10px] font-semibold text-[var(--k-grey-500)] uppercase tracking-widest sticky right-0 z-30 bg-[var(--k-band-grey)] shadow-[-2px_0_5px_-2px_rgba(33,33,33,0.1)]">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--k-grey-100)]">
                        {processedTasks.map((task, index) => {
                            const isSubtask = Boolean(task._isSubtask);
                            const rowTaskId = task.id;
                            const subtaskDraft = subtaskDrafts[rowTaskId];
                            const parentTaskObj = task;
                            const maxTargetDateForTask = isSubtask
                                ? (parentTaskObj?.targetDate || parentTaskObj?.target_date || project?.end_date)
                                : project?.end_date;
                            const rowBg = task.type === 'Y' ? 'bg-[var(--k-blue-tint)]' : 'bg-white';
                            return (
                                <React.Fragment key={task.id}>
                                <tr data-task-id={task.id} className={`divide-x divide-[var(--k-grey-100)] ${task.type === 'Y' ? 'bg-[var(--k-blue-tint)]' : 'bg-white hover:bg-[var(--k-blue-tint)]'} group transition-colors`}>
                                    <td className={`p-2 text-center text-xs font-semibold text-[var(--k-grey-500)] tabular-nums sticky left-0 z-20 ${rowBg} group-hover:bg-[var(--k-blue-tint)] transition-colors`}>{task._taskNumber || index + 1}</td>

                                    <td className={`p-2 pl-3 sticky left-[40px] md:left-[48px] z-20 ${rowBg} group-hover:bg-[var(--k-blue-tint)] transition-colors`}>
                                        {editingTaskId === task.id && canEdit ? (
                                            <div className="space-y-2 py-1">
                                                <input
                                                    type="text"
                                                    value={editingTitle}
                                                    onChange={(e) => setEditingTitle(e.target.value)}
                                                    autoFocus
                                                    placeholder="Task name..."
                                                    className="k-input !px-2 !py-1 !text-xs font-semibold"
                                                />
                                                <div className="flex gap-2 items-center">
                                                    <div className="flex-1">
                                                        <label className="text-[9px] text-[var(--k-grey-500)] font-semibold uppercase tracking-wide block">Start</label>
                                                        {isSubtask ? (
                                                            <input
                                                                type="date"
                                                                value={editingStartDate}
                                                                disabled
                                                                className="k-input !px-1 !py-0.5 !text-[10px]"
                                                            />
                                                        ) : (
                                                            <input
                                                                type="date"
                                                                min={task.id === lastQuickAddedTaskId ? (minimumStartDate || project?.start_date) : project?.start_date}
                                                                max={project?.end_date}
                                                                value={editingStartDate}
                                                                onChange={(e) => setEditingStartDate(e.target.value)}
                                                                className="k-input !px-1 !py-0.5 !text-[10px]"
                                                            />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[9px] text-[var(--k-grey-500)] font-semibold uppercase tracking-wide block">End</label>
                                                        <input
                                                            type="date"
                                                            min={editingStartDate || project?.start_date}
                                                            max={maxTargetDateForTask}
                                                            value={editingTargetDate}
                                                            onChange={(e) => setEditingTargetDate(e.target.value)}
                                                            className="k-input !px-1 !py-0.5 !text-[10px]"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <button onClick={() => saveTask(task.id)} className="k-btn-primary flex-1 !py-1 !px-2 !rounded-lg text-[10px] uppercase">Save</button>
                                                    <button onClick={cancelEditing} className="k-btn-ghost flex-1 !py-1 !px-2 !rounded-lg text-[10px] uppercase">Cancel</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center group">
                                                <div
                                                    onClick={() => canEdit && startEditing(task)}
                                                    className={`flex-1 ${canEdit ? 'cursor-pointer' : ''}`}
                                                >
                                                    <div className="text-xs font-semibold text-[var(--k-ink)] group-hover:text-[var(--k-blue)] flex items-center gap-2 transition-colors">
                                                        {isSubtask && <span className="text-[9px] uppercase tracking-wide text-[var(--k-grey-500)]">Sub</span>}
                                                        <span className={isSubtask ? 'pl-3 border-l border-[var(--k-grey-200)]' : ''}>{task.title || '(No Title)'}</span>
                                                    </div>
                                                </div>
                                                {canEdit && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity pl-2">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openSubtaskDraft(task); }}
                                                            className="p-1 text-[var(--k-grey-500)] hover:text-[var(--k-blue)] rounded transition-colors"
                                                            title="Add Subtask"
                                                        >
                                                            <Plus size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); startEditing(task); }}
                                                            className="p-1 text-[var(--k-grey-500)] hover:text-[var(--k-blue)] rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                                                            className="p-1 text-[var(--k-grey-500)] hover:text-[var(--k-ink)] rounded transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    <td className={`p-2 text-center text-[10px] font-semibold text-[var(--k-grey-700)] tabular-nums sticky left-[220px] md:left-[348px] z-20 ${rowBg} group-hover:bg-[var(--k-blue-tint)] transition-colors`}>
                                        {task.targetDate || '-'}
                                    </td>

                                    {timelineColumns.map((col, i) => {
                                        const isActive = isTaskActiveInColumn(task, col);
                                        let cellClass = "p-0 h-12 relative select-none min-w-[40px]";
                                        if (isActive) {
                                            cellClass += task.status === 'Completed' ? " bg-[var(--k-blue)]" : " bg-[var(--k-blue-light)]";
                                        } else if (col.isWeekend) {
                                            cellClass += " bg-[var(--k-band-grey)]";
                                        }

                                        return <td key={i} className={cellClass}></td>;
                                    })}

                                    <td className={`p-2 text-center sticky right-0 z-20 ${rowBg} group-hover:bg-[var(--k-blue-tint)] transition-colors shadow-[-2px_0_5px_-2px_rgba(33,33,33,0.1)]`}>
                                        {task.status === 'In Progress' && canEdit ? (
                                            <div className="relative inline-block w-full max-w-[120px]">
                                                <select
                                                    value={task.status}
                                                    onChange={(e) => e.target.value === 'Completed' && markCompleted(task.id)}
                                                    className="appearance-none bg-[var(--k-blue-tint)] text-[var(--k-blue-dark)] border border-[var(--k-grey-200)] px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase shadow-sm hover:border-[var(--k-blue)] focus:outline-none w-full text-center transition-colors"
                                                >
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Completed">Completed</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div
                                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-[10px] font-bold uppercase max-w-[120px]"
                                                style={task.status === 'Completed'
                                                    ? { background: 'var(--k-blue)', color: 'var(--k-white)' }
                                                    : { background: 'var(--k-blue-tint)', color: 'var(--k-blue-dark)' }}
                                            >
                                                {task.status === 'Completed' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                                <span className="truncate">{task.status}</span>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                {canEdit && subtaskDraft && (
                                    <tr className="divide-x divide-[var(--k-grey-100)] bg-[var(--k-blue-tint)]">
                                        <td className="p-2 text-center text-xs font-semibold text-[var(--k-blue-dark)] sticky left-0 z-20 bg-[var(--k-blue-tint)]">+</td>
                                        <td className="p-2 pl-3 sticky left-[40px] md:left-[48px] z-20 bg-[var(--k-blue-tint)]">
                                            <div className="space-y-2 py-1">
                                                <input
                                                    type="text"
                                                    value={subtaskDraft.title}
                                                    onChange={(e) => updateSubtaskDraft(task.id, 'title', e.target.value)}
                                                    placeholder="Subtask title"
                                                    className="k-input !px-2 !py-1 !text-xs font-semibold"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[9px] text-[var(--k-grey-500)] font-semibold uppercase tracking-wide block">Start (Parent)</label>
                                                        <input
                                                            type="date"
                                                            value={task.startDate || task.start_date || ''}
                                                            disabled
                                                            className="k-input !px-1 !py-0.5 !text-[10px]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-[var(--k-grey-500)] font-semibold uppercase tracking-wide block">Target Date</label>
                                                        <input
                                                            type="date"
                                                            min={task.startDate || task.start_date || project?.start_date}
                                                            max={task.targetDate || task.target_date || project?.end_date}
                                                            value={subtaskDraft.targetDate || ''}
                                                            onChange={(e) => updateSubtaskDraft(task.id, 'targetDate', e.target.value)}
                                                            className="k-input !px-1 !py-0.5 !text-[10px]"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                    <button onClick={() => createSubtask(task)} className="k-btn-primary flex-1 !py-1 !px-2 !rounded-lg text-[10px] uppercase">Save</button>
                                                    <button onClick={() => closeSubtaskDraft(task.id)} className="k-btn-ghost flex-1 !py-1 !px-2 !rounded-lg text-[10px] uppercase">Cancel</button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-2 text-center text-[10px] font-semibold text-[var(--k-blue-dark)] tabular-nums sticky left-[220px] md:left-[348px] z-20 bg-[var(--k-blue-tint)]">
                                            {subtaskDraft.targetDate || '-'}
                                        </td>
                                        {timelineColumns.map((col, i) => {
                                            const pseudoSubtask = {
                                                startDate: task.startDate || task.start_date,
                                                targetDate: subtaskDraft.targetDate,
                                            };
                                            const isActive = isTaskActiveInColumn(pseudoSubtask, col);
                                            return (
                                                <td key={i} className={`p-0 h-12 relative select-none min-w-[40px] ${isActive ? 'bg-[var(--k-blue-light)]' : (col.isWeekend ? 'bg-[var(--k-band-grey)]' : '')}`}></td>
                                            );
                                        })}
                                        <td className="p-2 text-center sticky right-0 z-20 bg-[var(--k-blue-tint)] shadow-[-2px_0_5px_-2px_rgba(33,33,33,0.1)]">
                                            <span className="k-pill uppercase">Draft</span>
                                        </td>
                                    </tr>
                                )}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* KPI Section */}
            <div className="mt-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-1 gap-3">
                    <div className="flex items-center gap-3">
                        <span className="p-1.5 rounded-lg" style={{ background: 'var(--k-ink)', color: 'var(--k-white)' }}>
                            <Target size={16} />
                        </span>
                        <h2 className="k-section-title text-base md:text-lg uppercase">Key Performance Indicators (KPIs)</h2>
                    </div>
                    {canEdit && (
                        <button onClick={handleQuickAddKpi} className="k-btn-primary flex items-center gap-2 !px-4 !py-2 text-xs uppercase tracking-wider">
                            <Plus size={14} /> Add KPI
                        </button>
                    )}
                </div>

                <div className="rounded-2xl border border-[var(--k-grey-200)] overflow-x-auto relative bigtask-scrollbar" style={{ background: 'var(--k-white)' }}>
                    <table className="w-full border-collapse min-w-max tabular-nums">
                        <thead>
                            <tr className="bg-[var(--k-band-grey)] divide-x divide-[var(--k-grey-200)] border-b border-[var(--k-grey-200)] text-[10px] font-semibold text-[var(--k-grey-500)] uppercase tracking-widest">
                                <th className="p-2 w-12 min-w-[48px] text-center sticky left-0 z-30 bg-[var(--k-band-grey)] shadow-[2px_0_5px_-2px_rgba(33,33,33,0.1)]">Sr. No.</th>
                                <th className="p-2 w-[300px] min-w-[300px] text-left pl-3 sticky left-[48px] z-30 bg-[var(--k-band-grey)] shadow-[2px_0_5px_-2px_rgba(33,33,33,0.1)]">KPI Description</th>
                                <th className="p-2 w-24 min-w-[96px] text-center sticky left-[348px] z-30 bg-[var(--k-band-grey)] shadow-[2px_0_5px_-2px_rgba(33,33,33,0.1)]">Base-line</th>
                                <th className="p-2 w-24 min-w-[96px] text-center sticky left-[444px] z-30 bg-[var(--k-band-grey)] shadow-[2px_0_5px_-2px_rgba(33,33,33,0.1)]">Target</th>
                                {months.map((m, i) => <th key={i} className="p-1 text-center bg-[var(--k-band-grey)] min-w-[60px] whitespace-nowrap">{m}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--k-grey-100)]">
                            {kpis.map((kpi, index) => (
                                <tr key={kpi.id} className="divide-x divide-[var(--k-grey-100)] bg-white hover:bg-[var(--k-blue-tint)] group transition-colors">
                                    <td className="p-2 text-center text-xs font-semibold text-[var(--k-grey-500)] tabular-nums sticky left-0 z-20 bg-white group-hover:bg-[var(--k-blue-tint)] transition-colors">{index + 1}</td>

                                    <td className="p-2 pl-3 text-xs font-semibold text-[var(--k-ink)] sticky left-[48px] z-20 bg-white group-hover:bg-[var(--k-blue-tint)] transition-colors">
                                        {editingKpiId === kpi.id ? (
                                            <div className="flex gap-2">
                                                <input
                                                    className="k-input flex-1 !px-2 !py-1"
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
                                                        <button onClick={() => startEditingKpi(kpi)} className="p-1 text-[var(--k-grey-500)] hover:text-[var(--k-blue)] transition-colors"><Pencil size={12} /></button>
                                                        <button onClick={() => deleteKpi(kpi.id)} className="p-1 text-[var(--k-grey-500)] hover:text-[var(--k-ink)] transition-colors"><Trash2 size={12} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>

                                    <td className="p-2 text-center text-[10px] font-semibold text-[var(--k-grey-500)] sticky left-[348px] z-20 bg-white group-hover:bg-[var(--k-blue-tint)] transition-colors">
                                        {editingKpiId === kpi.id ? (
                                            <input
                                                className="k-input !px-1 !py-1 text-center"
                                                value={editingKpiBaseline}
                                                onChange={(e) => setEditingKpiBaseline(e.target.value)}
                                            />
                                        ) : (
                                            kpi.baseline
                                        )}
                                    </td>

                                    <td className="p-2 text-center text-[10px] font-semibold text-[var(--k-blue)] sticky left-[444px] z-20 bg-white group-hover:bg-[var(--k-blue-tint)] transition-colors">
                                        {editingKpiId === kpi.id ? (
                                            <div className="flex flex-col gap-1">
                                                <input
                                                    className="k-input !px-1 !py-1 text-center"
                                                    value={editingKpiTarget}
                                                    onChange={(e) => setEditingKpiTarget(e.target.value)}
                                                />
                                                <button onClick={() => saveKpi(kpi.id)} className="k-btn-primary !px-2 !py-0.5 !rounded-lg text-[8px] uppercase">Save</button>
                                            </div>
                                        ) : (
                                            kpi.target
                                        )}
                                    </td>
                                    {months.map((m, i) => (
                                        <td key={i} className="p-1 min-w-[60px]">
                                            <input
                                                type="text"
                                                className="w-full text-center text-[10px] border-none focus:ring-2 focus:ring-[var(--k-blue-ring)] bg-transparent rounded"
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
                <div className="k-backdrop">
                    <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
                    <form onSubmit={handleAddTask} className="k-modal relative !max-w-lg p-5 md:p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold uppercase tracking-tight" style={{ color: 'var(--k-ink)' }}>Add <span style={{ color: 'var(--k-blue)' }}>Task</span></h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="k-btn-icon !rounded-full"><CloseIcon size={18} /></button>
                        </div>
                        <div className="space-y-5">
                            <div>
                                <label className="k-label">Task Title</label>
                                <input required className="k-input" placeholder="Task Name" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="k-label">Start Date</label>
                                    <input type="date" required min={minimumStartDate || project?.start_date} max={project?.end_date} className="k-input" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                                </div>
                                <div>
                                    <label className="k-label">Target Date</label>
                                    <input type="date" required min={formData.startDate || project?.start_date} max={project?.end_date} className="k-input" value={formData.targetDate} onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <button type="submit" className="k-btn-primary w-full mt-8 !py-4 text-xs uppercase tracking-widest">Save Task</button>
                    </form>
                </div>
            )}

            {/* --- EXCEL UPLOAD MODAL --- */}
            {showExcelModal && (
                <div className="k-backdrop">
                    <div className="absolute inset-0" onClick={closeExcelModal} />
                    <div className="k-modal relative !max-w-lg p-5 md:p-8 !overflow-y-auto k-scroll">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold uppercase tracking-tight" style={{ color: 'var(--k-ink)' }}>
                                {mappingStep ? 'Map Excel Columns' : 'Upload Excel File'}
                            </h3>
                            <button type="button" onClick={closeExcelModal} className="k-btn-icon !rounded-full">
                                <CloseIcon size={18} />
                            </button>
                        </div>

                        {/* FILE UPLOAD STEP */}
                        {!mappingStep && !excelUploadStatus && (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed rounded-xl p-8 text-center transition-colors" style={{ borderColor: 'var(--k-grey-300)' }}>
                                    <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--k-grey-500)' }} />
                                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--k-grey-700)' }}>Choose an .xlsx file</p>
                                    <p className="text-xs mb-4" style={{ color: 'var(--k-grey-500)' }}>Supported columns: Task, Start Date, Target Date</p>
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        onChange={handleExcelFileSelect}
                                        className="block w-full text-sm text-[var(--k-grey-500)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--k-blue-tint)] file:text-[var(--k-blue)] hover:file:bg-[var(--k-blue-tint)]"
                                    />
                                </div>
                            </div>
                        )}

                        {/* COLUMN MAPPING STEP */}
                        {mappingStep && excelPreview && !excelUploadStatus && (
                            <div className="space-y-4">
                                <div className="rounded-lg p-3" style={{ background: 'var(--k-blue-tint)', border: '1px solid var(--k-grey-200)' }}>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--k-blue-dark)' }}>Map your Excel columns to Task fields</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--k-blue)' }}>Select which Excel column contains each field. Leave as "Skip" if not in your file.</p>
                                </div>

                                {[{ key: 'title', label: 'Task Title', required: true }, { key: 'start_date', label: 'Start Date' }, { key: 'target_date', label: 'Target Date' }].map(field => (
                                    <div key={field.key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                        <label className="text-xs font-semibold uppercase tracking-wider sm:min-w-30" style={{ color: 'var(--k-grey-700)' }}>
                                            {field.label} {field.required && <span style={{ color: 'var(--k-blue)' }}>*</span>}
                                        </label>
                                        <select
                                            value={columnMapping[field.key] ?? ''}
                                            onChange={e => setColumnMapping(prev => ({ ...prev, [field.key]: e.target.value === '' ? '' : Number(e.target.value) }))}
                                            className="k-select flex-1"
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
                                        <p className="k-eyebrow mb-2">Preview (first {excelPreview.rows.length} rows)</p>
                                        <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--k-grey-200)' }}>
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr style={{ background: 'var(--k-band-grey)' }}>
                                                        {excelPreview.columns.map((col, i) => (
                                                            <th key={i} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap" style={{ color: 'var(--k-grey-500)' }}>{col}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {excelPreview.rows.map((row, ri) => (
                                                        <tr key={ri} style={{ borderTop: '1px solid var(--k-grey-100)' }}>
                                                            {excelPreview.columns.map((_, ci) => (
                                                                <td key={ci} className="px-2 py-1 whitespace-nowrap" style={{ color: 'var(--k-grey-700)' }}>{row[ci] ?? ''}</td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button onClick={handleExcelBackToUpload} className="k-btn-ghost flex-1 !py-3 text-xs uppercase tracking-widest">
                                        Back
                                    </button>
                                    <button onClick={handleExcelConfirmMapping} className="k-btn-primary flex-1 !py-3 text-xs uppercase tracking-widest">
                                        Import Tasks
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* LOADING */}
                        {excelUploadStatus?.loading && (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--k-blue)' }}></div>
                                <span className="ml-3 text-sm font-semibold" style={{ color: 'var(--k-grey-700)' }}>Importing tasks...</span>
                            </div>
                        )}

                        {/* ERROR */}
                        {excelUploadStatus?.error && (
                            <div className="rounded-lg p-4" style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}>
                                <p className="text-sm font-semibold" style={{ color: 'var(--k-ink)' }}>{excelUploadStatus.error}</p>
                                <button onClick={handleExcelBackToUpload} className="mt-3 text-xs font-semibold underline" style={{ color: 'var(--k-blue)' }}>Try Again</button>
                            </div>
                        )}

                        {/* SUCCESS */}
                        {excelUploadStatus?.success && (
                            <div className="space-y-4">
                                <div className="rounded-lg p-4" style={{ background: 'var(--k-blue-tint)', border: '1px solid var(--k-grey-200)' }}>
                                    <p className="text-sm font-semibold" style={{ color: 'var(--k-blue-dark)' }}>
                                        {excelUploadStatus.tasksCreated} task{excelUploadStatus.tasksCreated !== 1 ? 's' : ''} created successfully.
                                    </p>
                                </div>
                                {excelUploadStatus.errors?.length > 0 && (
                                    <div className="rounded-lg p-3" style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}>
                                        <p className="text-xs font-semibold mb-1" style={{ color: 'var(--k-ink)' }}>{excelUploadStatus.errors.length} row(s) had errors:</p>
                                        <ul className="text-xs list-disc pl-4" style={{ color: 'var(--k-grey-700)' }}>
                                            {excelUploadStatus.errors.map((err, i) => (
                                                <li key={i}>Row {err.row}: {err.message}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <button onClick={closeExcelModal} className="k-btn-primary w-full !py-3 text-xs uppercase tracking-widest">
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
