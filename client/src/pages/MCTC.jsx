import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import api from "../api";

const MCTC = () => {
    const location = useLocation();
    const currentRole = (localStorage.getItem("role") || "").toUpperCase();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);
    const [headerView, setHeaderView] = useState("task");

    // State to store tasks: { "YYYY-MM-DD": [{ id, label, type }] }
    const [tasks, setTasks] = useState({});

    const [activeDayPopup, setActiveDayPopup] = useState(null);
    const [popupMode, setPopupMode] = useState("reminder");
    const [popupReminderDrafts, setPopupReminderDrafts] = useState([]);
    const [popupTaskDrafts, setPopupTaskDrafts] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [activePlacePopupDay, setActivePlacePopupDay] = useState(null);
    const [placePopupStage, setPlacePopupStage] = useState("choice");
    const [placePopupType, setPlacePopupType] = useState("onsite");
    const [placePopupRows, setPlacePopupRows] = useState([
        { halfLabel: "Half 1", mode: "office", companyName: "" },
        { halfLabel: "Half 2", mode: "office", companyName: "" },
    ]);

    const memberViewContext = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const memberParam = Number(params.get("member"));
        const memberName = (params.get("memberName") || "").trim();
        const hasValidMember = Number.isFinite(memberParam) && memberParam > 0;
        const canUseMemberView = ["SGM", "HQEPL", "MLS", "SENIOR"].includes(currentRole);

        if (!canUseMemberView || !hasValidMember) {
            return {
                targetUserId: null,
                targetUserLabel: "",
                isMemberView: false,
            };
        }

        return {
            targetUserId: memberParam,
            targetUserLabel: memberName || `Member ${memberParam}`,
            isMemberView: true,
        };
    }, [location.search, currentRole]);

    const { targetUserId, targetUserLabel, isMemberView } = memberViewContext;
    const isReadOnlyView = isMemberView;
    const canManageEntries = !isReadOnlyView;
    const canCompleteTasks = !isReadOnlyView || currentRole === "SGM";

    const fetchCurrentUserId = async () => {
        if (userId) return userId;
        const response = await api.get("/me/");
        const currentId = response?.data?.id;
        if (currentId) {
            setUserId(currentId);
            return currentId;
        }
        throw new Error("Current user not available");
    };

    // Helper to get days in month
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    // Helper to get the first day of the month
    const getFirstDayOfMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month, 1).getDay();
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const formatDayLabel = (dayKey) => {
        const [year, month, day] = dayKey.split("-").map(Number);
        const date = new Date(year, month - 1, day);

        return date.toLocaleDateString("en-US", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const openDayPopup = (dayKey, mode = "reminder") => {
        if (!dayKey || isSundayDayKey(dayKey)) return;
        setActiveDayPopup(dayKey);
        setPopupMode(mode);
        setPopupReminderDrafts([]);
        setPopupTaskDrafts([]);
    };

    const openPlacePopup = (dayKey) => {
        if (!dayKey || isSundayDayKey(dayKey)) return;

        setActivePlacePopupDay(dayKey);
        setPlacePopupStage("choice");
        setPlacePopupType("onsite");
        setPlacePopupRows([
            { halfLabel: "Half 1", mode: "office", companyName: "" },
            { halfLabel: "Half 2", mode: "office", companyName: "" },
        ]);
    };

    const closeDayPopup = () => {
        setActiveDayPopup(null);
        setPopupReminderDrafts([]);
        setPopupTaskDrafts([]);
    };

    const closePlacePopup = () => {
        setActivePlacePopupDay(null);
        setPlacePopupStage("choice");
        setPlacePopupType("onsite");
        setPlacePopupRows([
            { halfLabel: "Half 1", mode: "office", companyName: "" },
            { halfLabel: "Half 2", mode: "office", companyName: "" },
        ]);
    };

    const toDayKey = (year, monthIndex, day) => {
        const mm = String(monthIndex + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        return `${year}-${mm}-${dd}`;
    };

    const getWeekdayIndexFromDayKey = (dayKey) => {
        const [year, month, day] = dayKey.split("-").map(Number);
        return new Date(year, month - 1, day).getDay();
    };

    const isSundayDayKey = (dayKey) => getWeekdayIndexFromDayKey(dayKey) === 0;

    const buildCalendarWeeks = (date) => {
        const totalDays = getDaysInMonth(date);
        const firstDayIndex = getFirstDayOfMonth(date);
        const weeks = [];
        let dayCounter = 1 - firstDayIndex;

        while (true) {
            const week = [];
            for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
                if (dayCounter < 1 || dayCounter > totalDays) {
                    week.push(null);
                } else {
                    week.push({
                        day: dayCounter,
                        key: toDayKey(date.getFullYear(), date.getMonth(), dayCounter),
                    });
                }
                dayCounter += 1;
            }

            weeks.push(week);
            if (dayCounter > totalDays && week.every((cell) => cell === null || cell.day >= totalDays - 6)) {
                break;
            }
        }

        return weeks;
    };

    const calendarWeeks = useMemo(() => buildCalendarWeeks(currentDate), [currentDate]);

    useEffect(() => {
        const loadMonthEntries = async () => {
            try {
                setLoading(true);
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                const params = targetUserId
                    ? { year, month, user: targetUserId }
                    : { year, month };

                const response = await api.get("/mctc/entries/", {
                    params,
                });

                const grouped = {};
                response.data.forEach((entry) => {
                    if (isSundayDayKey(entry.entry_date)) return;

                    const key = entry.entry_date;
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push({
                        id: entry.id,
                        label: entry.label,
                        type: entry.entry_type,
                        linkedTaskId: entry.linked_task,
                        linkedTaskStatus: entry.linked_task_status,
                        linkedTaskCompletionDate: entry.linked_task_completion_date,
                    });
                });

                setTasks(grouped);
            } catch (error) {
                console.error("Failed to load MCTC entries:", error);
                setTasks({});
            } finally {
                setLoading(false);
            }
        };

        loadMonthEntries();
    }, [currentDate, targetUserId]);

    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                const response = await api.get("/me/");
                setUserId(response.data.id);
            } catch (error) {
                console.error("Failed to load current user:", error);
            }
        };

        loadCurrentUser();
    }, []);

    // --- Task Management ---

    const addTask = async (dayKey, label, entryType) => {
        if (!canManageEntries) return;
        if (isSundayDayKey(dayKey)) {
            alert("No task can be added on Sunday.");
            return;
        }

        const normalizedLabel = String(label || "").trim();
        if (!normalizedLabel) return;
        const normalizedType = entryType === "task" ? "task" : "normal";

        try {
            setIsSaving(true);
            let linkedTaskId = null;

            if (normalizedType === "task") {
                const currentUserId = await fetchCurrentUserId();

                const taskResponse = await api.post("/tasks/", {
                    title: normalizedLabel,
                    assigned_to: currentUserId,
                    target_date: dayKey,
                    start_date: dayKey,
                    source_module: "MCTC",
                });

                linkedTaskId = taskResponse?.data?.id || null;
            }

            const response = await api.post("/mctc/entries/", {
                entry_date: dayKey,
                label: normalizedLabel,
                entry_type: normalizedType,
                linked_task: linkedTaskId,
            });

            setTasks((prev) => {
                const dayTasks = prev[dayKey] || [];
                const newTask = {
                    id: response.data.id,
                    label: response.data.label,
                    type: response.data.entry_type,
                    linkedTaskId: response.data.linked_task,
                    linkedTaskStatus: response.data.linked_task_status,
                    linkedTaskCompletionDate: response.data.linked_task_completion_date,
                };
                return {
                    ...prev,
                    [dayKey]: [...dayTasks, newTask],
                };
            });
        } catch (error) {
            console.error("Failed to auto-save MCTC entry:", error);
            alert("Failed to create MCTC task entry.");
        } finally {
            setIsSaving(false);
        }
    };

    const buildPlaceEntryLabel = (dayType, row) => {
        const placeLabel = row.mode === "visit" ? String(row.companyName || "").trim() : "Office";
        return `${dayType === "onsite" ? "Onsite" : "Offsite"} - ${row.halfLabel} - ${placeLabel}`;
    };

    const updatePlacePopupRow = (index, field, value) => {
        setPlacePopupRows((prev) => prev.map((row, rowIndex) => {
            if (rowIndex !== index) return row;

            if (field === "mode" && value === "office") {
                return { ...row, mode: value, companyName: "" };
            }

            return { ...row, [field]: value };
        }));
    };

    const savePlacePopupEntries = async () => {
        if (!activePlacePopupDay) return;

        const normalizedRows = placePopupRows.map((row) => ({
            ...row,
            companyName: String(row.companyName || "").trim(),
        }));

        const invalidVisitRow = normalizedRows.find((row) => row.mode === "visit" && !row.companyName);
        if (invalidVisitRow) {
            alert("Please enter the company name for every Visit entry.");
            return;
        }

        try {
            setIsSaving(true);
            for (const row of normalizedRows) {
                const label = buildPlaceEntryLabel(placePopupType, row);
                await addTask(activePlacePopupDay, label, "normal");
            }
            closePlacePopup();
        } catch (error) {
            console.error("Failed to save place entries:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const addPopupDraftRow = (mode) => {
        if (!canManageEntries || !activeDayPopup) return;
        if (mode === "task") {
            setPopupTaskDrafts((prev) => [...prev, ""]);
            return;
        }
        setPopupReminderDrafts((prev) => [...prev, ""]);
    };

    const updatePopupDraftRow = (mode, index, value) => {
        if (mode === "task") {
            setPopupTaskDrafts((prev) => prev.map((item, idx) => (idx === index ? value : item)));
            return;
        }
        setPopupReminderDrafts((prev) => prev.map((item, idx) => (idx === index ? value : item)));
    };

    const removePopupDraftRow = (mode, index) => {
        if (mode === "task") {
            setPopupTaskDrafts((prev) => prev.filter((_, idx) => idx !== index));
            return;
        }
        setPopupReminderDrafts((prev) => prev.filter((_, idx) => idx !== index));
    };

    const savePopupDraftRow = async (mode, index) => {
        if (!activeDayPopup) return;
        const drafts = mode === "task" ? popupTaskDrafts : popupReminderDrafts;
        const value = drafts[index] || "";
        await addTask(activeDayPopup, value, mode);
        removePopupDraftRow(mode, index);
    };

    const completeTask = async (dayKey, index) => {
        if (!canCompleteTasks) return;
        const dayTasks = tasks[dayKey] || [];
        const selectedTask = dayTasks[index];
        if (!selectedTask?.linkedTaskId) return;

        try {
            setIsSaving(true);
            const today = new Date().toISOString().split("T")[0];
            const requestConfig = targetUserId && currentRole === "SGM"
                ? { params: { assigned_to: targetUserId } }
                : undefined;
            const response = await api.patch(`/tasks/${selectedTask.linkedTaskId}/`, {
                status: "Completed",
                completion_date: today,
            }, requestConfig);

            setTasks((prev) => {
                const currentDayTasks = [...(prev[dayKey] || [])];
                if (!currentDayTasks[index]) return prev;

                currentDayTasks[index] = {
                    ...currentDayTasks[index],
                    linkedTaskStatus: response?.data?.status || "Completed",
                    linkedTaskCompletionDate: response?.data?.completion_date || today,
                };

                return {
                    ...prev,
                    [dayKey]: currentDayTasks,
                };
            });
        } catch (error) {
            console.error("Failed to complete linked task:", error);
            alert("Failed to complete linked task.");
        } finally {
            setIsSaving(false);
        }
    };

    const removeTask = async (dayKey, index) => {
        if (!canManageEntries) return;
        const dayTasks = tasks[dayKey] || [];
        const selectedTask = dayTasks[index];
        if (!selectedTask?.id) return;

        try {
            setIsSaving(true);
            await api.delete(`/mctc/entries/${selectedTask.id}/`);

            setTasks((prev) => {
                const currentDayTasks = prev[dayKey] || [];
                const newDayTasks = [...currentDayTasks];
                newDayTasks.splice(index, 1);

                return {
                    ...prev,
                    [dayKey]: newDayTasks,
                };
            });
        } catch (error) {
            console.error("Failed to auto-delete MCTC entry:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const isLinkedTaskCompleted = (task) => {
        if (!task) return false;
        if (task.linkedTaskCompletionDate) return true;
        return ["On Time", "Delayed", "Completed"].includes(task.linkedTaskStatus);
    };

    const getVisibleEntriesForView = (dayEntries) => {
        if (headerView === "place") {
            return dayEntries.filter((entry) => entry.type !== "task");
        }

        return dayEntries.filter((entry) => entry.type === "task");
    };

    // Month names for display
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    /* ============================
       RENDER CALENDAR TABLE
    ============================ */
    const renderCalendarTable = () => {
        const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayLabelsShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const calendarRowTemplate = `repeat(${calendarWeeks.length || 1}, minmax(0, 1fr))`;

        return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl md:rounded-4xl border border-slate-200 bg-white">
                <div className="grid grid-cols-7 border-b border-slate-200">
                    {dayLabels.map((dayLabel, dayIndex) => (
                        <div
                            key={dayLabel}
                            className={`px-1 md:px-2 py-1.5 md:py-2 text-center text-[8px] md:text-[10px] font-black uppercase tracking-widest md:tracking-[0.16em] ${dayIndex === 0 ? "bg-red-50/70 text-red-600" : "bg-slate-50/70 text-slate-600"
                                } ${dayIndex < 6 ? "border-r border-slate-200" : ""}`}
                        >
                            <span className="hidden sm:inline">{dayLabel}</span>
                            <span className="sm:hidden">{dayLabelsShort[dayIndex]}</span>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Loading Month...</p>
                    </div>
                ) : (
                    <div className="grid flex-1 min-h-0" style={{ gridTemplateRows: calendarRowTemplate }}>
                        {calendarWeeks.map((week, weekIndex) => (
                            <div key={`week-${weekIndex}`} className="grid min-h-0 grid-cols-7">
                                {week.map((cell, dayIndex) => {
                                    const isSunday = dayIndex === 0;
                                    const showBottomBorder = weekIndex < calendarWeeks.length - 1;
                                    const cellBorderClass = `${dayIndex < 6 ? "border-r border-slate-200" : ""} ${showBottomBorder ? "border-b border-slate-200" : ""}`;

                                    if (!cell) {
                                        return (
                                            <div
                                                key={`empty-${weekIndex}-${dayIndex}`}
                                                className={`h-full min-h-0 bg-slate-50/40 ${cellBorderClass}`}
                                            />
                                        );
                                    }

                                    const key = cell.key;
                                    const dayTasks = isSunday ? [] : getVisibleEntriesForView(tasks[key] || []);

                                    return (
                                        <div
                                            key={key}
                                            className={`flex h-full min-h-0 flex-col ${cellBorderClass} ${isSunday ? "bg-red-50/40" : "bg-white"}`}
                                        >
                                            <div
                                                onClick={() => openDayPopup(key)}
                                                className={`flex items-center justify-between px-1.5 md:px-2.5 pt-1.5 md:pt-2 ${isSunday ? "cursor-default" : "cursor-pointer"}`}
                                            >
                                                <span
                                                    className={`flex h-5 w-5 md:h-6 md:w-6 items-center justify-center rounded-md text-[9px] md:text-[10px] font-black ${isSunday ? "bg-[#b91c1c] text-white" : "bg-[#1e293b] text-white"
                                                        }`}
                                                >
                                                    {cell.day}
                                                </span>
                                                {!isSunday && canManageEntries && (
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            if (headerView === "place") {
                                                                openPlacePopup(key);
                                                            } else {
                                                                openDayPopup(key, "task");
                                                            }
                                                        }}
                                                        className="rounded-md bg-blue-50 p-1.5 text-blue-600 transition-all hover:bg-[#1e293b] hover:text-white"
                                                    >
                                                        <Plus size={11} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>

                                            {isSunday ? (
                                                <p className="px-1.5 md:px-2.5 pt-1 md:pt-2 text-[7px] md:text-[9px] font-black uppercase tracking-[0.14em] text-red-500/80">
                                                    Sunday
                                                </p>
                                            ) : (
                                                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                                                    <div className="custom-scrollbar mt-1 md:mt-2 flex-1 min-h-0 space-y-0.5 md:space-y-1 overflow-y-auto px-1.5 md:px-2.5 pb-1.5 md:pb-2">
                                                        {dayTasks.length > 0 ? (
                                                            dayTasks.map((task, idx) => {
                                                                const taskCompleted = isLinkedTaskCompleted(task);

                                                                return (
                                                                    <div
                                                                        key={task.id}
                                                                        className={`flex items-center justify-between rounded-lg border px-1.5 md:px-2 py-0.5 md:py-1 text-[7px] md:text-[9px] transition-all ${task.type === "task"
                                                                            ? taskCompleted
                                                                                ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                                                                                : "border-amber-100 bg-amber-50 text-amber-900"
                                                                            : "border-slate-100 bg-slate-50 text-slate-700"
                                                                            }`}
                                                                    >
                                                                        <span className="flex-1 truncate font-bold">{task.label}</span>
                                                                        <div className="ml-2 flex items-center gap-1">
                                                                            {canCompleteTasks && task.type === "task" && task.linkedTaskId && (
                                                                                <button
                                                                                    onClick={() => completeTask(key, idx)}
                                                                                    disabled={isSaving || taskCompleted}
                                                                                    className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white disabled:bg-slate-200"
                                                                                >
                                                                                    {taskCompleted ? "✓" : "Do"}
                                                                                </button>
                                                                            )}
                                                                            {canManageEntries && (
                                                                                <button
                                                                                    onClick={() => removeTask(key, idx)}
                                                                                    className="p-0.5 text-slate-400 transition-colors hover:text-red-500"
                                                                                >
                                                                                    <X size={10} strokeWidth={3} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        ) : (
                                                            <p className="pt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300">
                                                                No items
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderDayPopup = () => {
        if (!activeDayPopup) return null;

        const dayTasks = tasks[activeDayPopup] || [];
        const visibleDrafts = popupMode === "task" ? popupTaskDrafts : popupReminderDrafts;
        const popupTitle = popupMode === "task" ? "Task" : "Reminder";

        return (
            <div
                className="fixed inset-0 z-120 flex items-end sm:items-center justify-center bg-slate-950/45 p-2 sm:p-4 backdrop-blur-sm"
            >
                <div
                    className="w-full sm:max-w-[90vw] md:max-w-195 lg:max-w-215 rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 md:p-5 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.55)] max-h-[92vh] sm:max-h-[88vh] flex flex-col"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="mb-3 md:mb-4 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
                        <div className="min-w-0">
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Date Summary</p>
                            <h3 className="text-base md:text-lg font-black text-slate-800 truncate">{formatDayLabel(activeDayPopup)}</h3>
                        </div>
                        <button
                            onClick={closeDayPopup}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 shrink-0"
                        >
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>

                    {canManageEntries && (
                        <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <button
                                onClick={() => setPopupMode("reminder")}
                                className={`flex-1 rounded-lg py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${popupMode === "reminder"
                                    ? "bg-[#1e293b] text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                                    }`}
                            >
                                Reminder
                            </button>
                            <button
                                onClick={() => setPopupMode("task")}
                                className={`flex-1 rounded-lg py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${popupMode === "task"
                                    ? "bg-[#1e293b] text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-800"
                                    }`}
                            >
                                Task
                            </button>
                        </div>
                    )}

                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-4 mb-2 md:mb-3">
                        {canManageEntries && (
                            <div className="rounded-xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-2 sm:p-3 lg:col-span-2 min-h-0 flex flex-col">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                        Add {popupTitle}
                                    </p>
                                    <button
                                        onClick={() => addPopupDraftRow(popupMode)}
                                        className="flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1.5 text-[9px] font-black uppercase text-white shadow-sm transition-colors hover:bg-blue-700"
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                        Add Row
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-[38vh] lg:max-h-full overflow-y-auto pr-1">
                                    {visibleDrafts.length === 0 ? (
                                        <p className="text-[10px] font-bold text-slate-400">Click Add Row to create entries.</p>
                                    ) : (
                                        visibleDrafts.map((draft, index) => (
                                            <div key={`${popupMode}-draft-${index}`} className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={draft}
                                                    onChange={(event) => updatePopupDraftRow(popupMode, index, event.target.value)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter") {
                                                            savePopupDraftRow(popupMode, index);
                                                        }
                                                    }}
                                                    placeholder={`Enter ${popupTitle.toLowerCase()}...`}
                                                    className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                                <div className="flex items-center gap-2 sm:shrink-0">
                                                    <button
                                                        onClick={() => savePopupDraftRow(popupMode, index)}
                                                        disabled={isSaving}
                                                        className="flex-1 sm:flex-none rounded-lg bg-emerald-600 px-2.5 py-2 text-[9px] font-black uppercase text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:bg-slate-300"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => removePopupDraftRow(popupMode, index)}
                                                        className="rounded-lg bg-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-300 hover:text-red-500"
                                                    >
                                                        <X size={12} strokeWidth={3} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className={`custom-scrollbar min-h-0 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 p-2 sm:p-3 ${canManageEntries ? "lg:col-span-3" : "lg:col-span-5"}`}>
                            {dayTasks.length > 0 ? (
                                dayTasks.map((task, idx) => {
                                    const taskCompleted = isLinkedTaskCompleted(task);

                                    return (
                                        <div
                                            key={`popup-${task.id}`}
                                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 ${task.type === "task"
                                                ? taskCompleted
                                                    ? "border-emerald-200 bg-emerald-100"
                                                    : "border-amber-100 bg-amber-50"
                                                : "border-slate-100 bg-slate-50"
                                                }`}
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-bold text-slate-800">{task.label}</p>
                                                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{task.type}</p>
                                            </div>

                                            <div className="flex shrink-0 items-center gap-2">
                                                {canCompleteTasks && task.type === "task" && task.linkedTaskId && (
                                                    <button
                                                        onClick={() => completeTask(activeDayPopup, idx)}
                                                        disabled={isSaving || taskCompleted}
                                                        className="rounded-md bg-emerald-500 px-2 py-1 text-[9px] font-black uppercase text-white disabled:bg-slate-200 whitespace-nowrap"
                                                    >
                                                        {taskCompleted ? "Done" : "Complete"}
                                                    </button>
                                                )}

                                                {canManageEntries && (
                                                    <button
                                                        onClick={() => removeTask(activeDayPopup, idx)}
                                                        className="rounded-md bg-slate-100 p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-red-500"
                                                    >
                                                        <X size={12} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-6 text-center">
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">No items for this date</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPlacePopup = () => {
        if (!activePlacePopupDay) return null;

        const activeScopeLabel = placePopupType === "onsite" ? "Onsite" : "Offsite";

        return (
            <div className="fixed inset-0 z-130 flex items-end sm:items-center justify-center bg-slate-950/45 p-2 sm:p-4 backdrop-blur-sm">
                <div
                    className="w-full sm:max-w-2xl md:max-w-195 lg:max-w-215 rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-4 md:p-5 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.55)] max-h-[92vh] sm:max-h-[88vh] flex flex-col"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="mb-3 md:mb-4 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
                        <div className="min-w-0">
                            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Add Place</p>
                            <h3 className="text-base md:text-lg font-black text-slate-800 truncate">{formatDayLabel(activePlacePopupDay)}</h3>
                        </div>
                        <button
                            onClick={closePlacePopup}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700 shrink-0"
                        >
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>

                    {placePopupStage === "choice" ? (
                        <div className="flex-1 min-h-0">
                            <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Choose category</p>
                                <p className="mt-1 text-sm font-semibold text-slate-700">Select whether this day is onsite or offsite.</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPlacePopupType("onsite");
                                        setPlacePopupStage("details");
                                    }}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-left transition-all hover:border-blue-300 hover:shadow-md"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Onsite</p>
                                    <p className="mt-2 text-lg font-black text-slate-900">Office day</p>
                                    <p className="mt-1 text-sm text-slate-500">Use office for both halves unless you choose Visit.</p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setPlacePopupType("offsite");
                                        setPlacePopupStage("details");
                                    }}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-left transition-all hover:border-blue-300 hover:shadow-md"
                                >
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Offsite</p>
                                    <p className="mt-2 text-lg font-black text-slate-900">Visit day</p>
                                    <p className="mt-1 text-sm text-slate-500">Use company names for visit entries.</p>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Selected type</p>
                                    <p className="text-sm font-black text-slate-800">{activeScopeLabel}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setPlacePopupStage("choice")}
                                    className="rounded-lg bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-600 border border-slate-200 transition-colors hover:bg-slate-100"
                                >
                                    Change
                                </button>
                            </div>

                            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                                {placePopupRows.map((row, index) => (
                                    <div key={`${activePlacePopupDay}-${row.halfLabel}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{row.halfLabel}</p>
                                                <p className="text-sm font-black text-slate-800">{activeScopeLabel}</p>
                                            </div>
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                                                Half {index + 1}
                                            </span>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                                            <label className="min-w-0">
                                                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                                    Office / Visit
                                                </span>
                                                <select
                                                    value={row.mode}
                                                    onChange={(event) => updatePlacePopupRow(index, "mode", event.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                                                >
                                                    <option value="office">Office</option>
                                                    <option value="visit">Visit</option>
                                                </select>
                                            </label>

                                            {row.mode === "visit" ? (
                                                <label className="min-w-0">
                                                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                                                        Company name
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={row.companyName}
                                                        onChange={(event) => updatePlacePopupRow(index, "companyName", event.target.value)}
                                                        placeholder="Enter company name"
                                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
                                                    />
                                                </label>
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-500 self-end">
                                                    Office will be shown in the calendar.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 flex items-center justify-end gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={closePlacePopup}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600 transition-colors hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={savePlacePopupEntries}
                                    disabled={isSaving}
                                    className="rounded-xl bg-[#1e293b] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-sm transition-colors hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    {isSaving ? "Saving" : "Save Place"}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
            <Sidebar />

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 lg:py-5 space-y-2 sm:space-y-3 md:space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
                    <div className="flex items-center justify-start gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm justify-self-start">
                        <button
                            type="button"
                            onClick={() => setHeaderView("task")}
                            className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${headerView === "task" ? "bg-[#1e293b] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                            Task
                        </button>
                        <button
                            type="button"
                            onClick={() => setHeaderView("place")}
                            className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all ${headerView === "place" ? "bg-[#0f5f8a] text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                            Place
                        </button>
                    </div>

                    <div className="min-w-0 text-center justify-self-center">
                        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight text-[#1e293b]">
                            MCTC
                        </h1>
                        {isMemberView && (
                            <p className="mt-0.5 md:mt-1 text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-[0.16em] text-rose-600 truncate">
                                Viewing: {targetUserLabel}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 md:gap-3 rounded-lg sm:rounded-xl md:rounded-2xl border border-slate-100 border-b-4 border-b-slate-200 bg-white p-1 sm:p-1.5 md:p-2 shadow-lg shadow-slate-200/40 justify-self-end">
                        <button
                            onClick={handlePrevMonth}
                            className="rounded-lg md:rounded-xl bg-[#1e293b] p-1.5 sm:p-2 md:p-2.5 text-white transition-all hover:bg-blue-900 active:scale-95 shrink-0"
                        >
                            <ChevronLeft size={12} className="sm:w-4 sm:h-4 md:w-5 md:h-5" strokeWidth={3} />
                        </button>

                        <div className="min-w-20 sm:min-w-35 md:min-w-45 px-1 sm:px-2 md:px-4 text-center">
                            <h2 className="flex items-center justify-center gap-0.5 sm:gap-1 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-black text-[#1e293b] whitespace-nowrap">
                                {monthNames[currentDate.getMonth()].substring(0, 3)}
                                <span className="font-light text-slate-200 hidden sm:inline">/</span>
                                <span className="hidden sm:inline">{currentDate.getFullYear()}</span>
                                <span className="sm:hidden text-[8px]">{currentDate.getFullYear().toString().substring(2)}</span>
                            </h2>
                        </div>

                        <button
                            onClick={handleNextMonth}
                            className="rounded-lg md:rounded-xl bg-[#1e293b] p-1.5 sm:p-2 md:p-2.5 text-white transition-all hover:bg-blue-900 active:scale-95 shrink-0"
                        >
                            <ChevronRight size={12} className="sm:w-4 sm:h-4 md:w-5 md:h-5" strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 rounded-lg sm:rounded-2xl md:rounded-4xl border border-slate-200/60 bg-slate-50/50 p-1 sm:p-2 md:p-3 lg:p-4">
                    {renderCalendarTable()}
                </div>

                {renderDayPopup()}
                {renderPlacePopup()}
            </main>
        </div>
    );
};

export default MCTC;
