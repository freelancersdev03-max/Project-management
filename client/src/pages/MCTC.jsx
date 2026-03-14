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

    // State to store tasks: { "YYYY-MM-DD": [{ id, label, type }] }
    const [tasks, setTasks] = useState({});

    // Track which day has the input field open
    const [editingDay, setEditingDay] = useState(null);
    const [activeDayPopup, setActiveDayPopup] = useState(null);
    const [inputValue, setInputValue] = useState("");
    const [taskType, setTaskType] = useState("normal");
    const [isSaving, setIsSaving] = useState(false);

    const memberViewContext = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const memberParam = Number(params.get("member"));
        const memberName = (params.get("memberName") || "").trim();
        const hasValidMember = Number.isFinite(memberParam) && memberParam > 0;
        const canUseMemberView = ["SGM", "HQEPL"].includes(currentRole);

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

    const openDayPopup = (dayKey) => {
        if (!dayKey || isSundayDayKey(dayKey)) return;
        setActiveDayPopup(dayKey);
    };

    const closeDayPopup = () => {
        setActiveDayPopup(null);
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
        if (!isReadOnlyView) return;

        setEditingDay(null);
        setInputValue("");
        setTaskType("normal");
    }, [isReadOnlyView]);

    useEffect(() => {
        const handleEscapeClose = (event) => {
            if (event.key === "Escape") {
                closeDayPopup();
            }
        };

        window.addEventListener("keydown", handleEscapeClose);
        return () => window.removeEventListener("keydown", handleEscapeClose);
    }, []);

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

    const startEditingDay = (dayKey) => {
        if (!canManageEntries) return;
        if (isSundayDayKey(dayKey)) return;

        setEditingDay(dayKey);
        setInputValue("");
        setTaskType("normal");
    };

    const addTask = async (dayKey) => {
        if (!canManageEntries) return;
        if (isSundayDayKey(dayKey)) {
            alert("No task can be added on Sunday.");
            return;
        }

        const label = inputValue.trim();
        if (!label) return;

        try {
            setIsSaving(true);
            let linkedTaskId = null;

            if (taskType === "task") {
                const currentUserId = await fetchCurrentUserId();

                const taskResponse = await api.post("/tasks/", {
                    title: label,
                    assigned_to: currentUserId,
                    target_date: dayKey,
                    start_date: dayKey,
                    source_module: "MCTC",
                });

                linkedTaskId = taskResponse?.data?.id || null;
            }

            const response = await api.post("/mctc/entries/", {
                entry_date: dayKey,
                label,
                entry_type: taskType,
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

            setInputValue("");
            setEditingDay(null);
        } catch (error) {
            console.error("Failed to auto-save MCTC entry:", error);
            alert("Failed to create MCTC task entry.");
        } finally {
            setIsSaving(false);
        }
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

    const cancelEditing = () => {
        setEditingDay(null);
        setInputValue("");
        setTaskType("normal");
    };

    const isLinkedTaskCompleted = (task) => {
        if (!task) return false;
        if (task.linkedTaskCompletionDate) return true;
        return ["On Time", "Delayed", "Completed"].includes(task.linkedTaskStatus);
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
        const calendarRowTemplate = `repeat(${calendarWeeks.length || 1}, minmax(0, 1fr))`;

        return (
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white">
                <div className="grid grid-cols-7 border-b border-slate-200">
                    {dayLabels.map((dayLabel, dayIndex) => (
                        <div
                            key={dayLabel}
                            className={`px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.16em] ${dayIndex === 0 ? "bg-red-50/70 text-red-600" : "bg-slate-50/70 text-slate-600"
                                } ${dayIndex < 6 ? "border-r border-slate-200" : ""}`}
                        >
                            {dayLabel}
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
                                    const dayTasks = isSunday ? [] : (tasks[key] || []);
                                    const isEditing = editingDay === key && !isSunday && canManageEntries;

                                    return (
                                        <div
                                            key={key}
                                            className={`flex h-full min-h-0 flex-col ${cellBorderClass} ${isSunday ? "bg-red-50/40" : "bg-white"}`}
                                        >
                                            <div
                                                onClick={() => openDayPopup(key)}
                                                className={`flex items-center justify-between px-2.5 pt-2 ${isSunday ? "cursor-default" : "cursor-pointer"}`}
                                            >
                                                <span
                                                    className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-black ${isSunday ? "bg-[#b91c1c] text-white" : "bg-[#1e293b] text-white"
                                                        }`}
                                                >
                                                    {cell.day}
                                                </span>
                                                {!isSunday && canManageEntries && (
                                                    <button
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            startEditingDay(key);
                                                        }}
                                                        className="rounded-md bg-blue-50 p-1.5 text-blue-600 transition-all hover:bg-[#1e293b] hover:text-white"
                                                    >
                                                        <Plus size={11} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>

                                            {isSunday ? (
                                                <p className="px-2.5 pt-2 text-[9px] font-black uppercase tracking-[0.14em] text-red-500/80">
                                                    Sunday
                                                </p>
                                            ) : (
                                                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                                                    <div className="custom-scrollbar mt-2 flex-1 min-h-0 space-y-1 overflow-y-auto px-2.5 pb-2">
                                                        {dayTasks.length > 0 ? (
                                                            dayTasks.map((task, idx) => {
                                                                const taskCompleted = isLinkedTaskCompleted(task);

                                                                return (
                                                                    <div
                                                                        key={task.id}
                                                                        className={`flex items-center justify-between rounded-lg border px-2 py-1 text-[9px] transition-all ${task.type === "task"
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
                                                        ) : !isEditing ? (
                                                            <p className="pt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300">
                                                                No items
                                                            </p>
                                                        ) : null}
                                                    </div>

                                                    {isEditing && (
                                                        <div className="min-w-0 space-y-1.5 px-2.5 pb-2.5">
                                                            <div className="flex min-w-0 gap-px rounded-lg bg-slate-100 p-0.5">
                                                                <button
                                                                    onClick={() => setTaskType("normal")}
                                                                    className={`flex-1 rounded-md py-1 text-[8px] font-black uppercase tracking-[0.14em] transition-all ${taskType === "normal"
                                                                        ? "bg-[#1e293b] text-white shadow-sm"
                                                                        : "text-slate-500 hover:text-slate-800"
                                                                        }`}
                                                                >
                                                                    Normal
                                                                </button>
                                                                <button
                                                                    onClick={() => setTaskType("task")}
                                                                    className={`flex-1 rounded-md py-1 text-[8px] font-black uppercase tracking-[0.14em] transition-all ${taskType === "task"
                                                                        ? "border border-slate-200 bg-white text-slate-800 shadow-sm"
                                                                        : "text-slate-500 hover:text-slate-800"
                                                                        }`}
                                                                >
                                                                    Task
                                                                </button>
                                                            </div>
                                                            <div className="flex min-w-0 items-center gap-1">
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    value={inputValue}
                                                                    onChange={(e) => setInputValue(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") addTask(key);
                                                                        else if (e.key === "Escape") cancelEditing();
                                                                    }}
                                                                    placeholder="Add item..."
                                                                    className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5 text-[10px] font-bold placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                                />
                                                                <div className="flex shrink-0 items-center gap-1">
                                                                    <button
                                                                        onClick={() => addTask(key)}
                                                                        disabled={isSaving}
                                                                        className="rounded-lg bg-blue-600 p-1.5 text-white transition-all hover:bg-blue-700"
                                                                    >
                                                                        <Plus size={13} strokeWidth={3} />
                                                                    </button>
                                                                    <button
                                                                        onClick={cancelEditing}
                                                                        className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-all hover:bg-slate-200"
                                                                    >
                                                                        <X size={13} strokeWidth={3} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
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

        return (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
                onClick={closeDayPopup}
            >
                <div
                    className="w-full max-w-xl rounded-4xl border border-slate-200 bg-white p-5 shadow-2xl"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Date Summary</p>
                            <h3 className="text-lg font-black text-slate-800">{formatDayLabel(activeDayPopup)}</h3>
                        </div>
                        <button
                            onClick={closeDayPopup}
                            className="rounded-xl bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200"
                        >
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="custom-scrollbar max-h-[55vh] space-y-2 overflow-y-auto pr-1">
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
                                                    className="rounded-md bg-emerald-500 px-2 py-1 text-[9px] font-black uppercase text-white disabled:bg-slate-200"
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
        );
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
            <Sidebar />

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-4 py-4 lg:px-6 lg:py-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-[#1e293b] xl:text-5xl">
                            MCTC
                        </h1>
                        {isMemberView && (
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-rose-600">
                                Viewing employee MCTC: {targetUserLabel}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-100 border-b-4 border-b-slate-200 bg-white p-1.5 shadow-lg shadow-slate-200/40">
                            <button
                                onClick={handlePrevMonth}
                                className="rounded-xl bg-[#1e293b] p-2.5 text-white transition-all hover:bg-blue-900 active:scale-95"
                            >
                                <ChevronLeft size={20} strokeWidth={3} />
                            </button>

                            <div className="min-w-52 px-4 text-center">
                                <h2 className="flex items-center justify-center gap-2 text-xl font-black text-[#1e293b] lg:text-2xl">
                                    {monthNames[currentDate.getMonth()]}
                                    <span className="font-light text-slate-200">/</span>
                                    <span>{currentDate.getFullYear()}</span>
                                </h2>
                            </div>

                            <button
                                onClick={handleNextMonth}
                                className="rounded-xl bg-[#1e293b] p-2.5 text-white transition-all hover:bg-blue-900 active:scale-95"
                            >
                                <ChevronRight size={20} strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="min-h-0 flex-1 rounded-4xl border border-slate-200/60 bg-slate-50/50 p-3 lg:p-4">
                    {renderCalendarTable()}
                </div>

                {renderDayPopup()}
            </main>
        </div>
    );
};

export default MCTC;
