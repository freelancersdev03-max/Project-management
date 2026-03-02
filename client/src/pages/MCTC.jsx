import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle2 } from "lucide-react";
import api from "../api";

const MCTC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [userId, setUserId] = useState(null);

    // State to store tasks: { "YYYY-MM-DD": [{ id, label, type }] }
    const [tasks, setTasks] = useState({});

    // Track which day has the input field open
    const [editingDay, setEditingDay] = useState(null);
    const [inputValue, setInputValue] = useState("");
    const [taskType, setTaskType] = useState("normal");
    const [isSaving, setIsSaving] = useState(false);

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

    const toDayKey = (year, monthIndex, day) => {
        const mm = String(monthIndex + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        return `${year}-${mm}-${dd}`;
    };

    useEffect(() => {
        const loadMonthEntries = async () => {
            try {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth() + 1;
                const response = await api.get("/mctc/entries/", {
                    params: { year, month },
                });

                const grouped = {};
                response.data.forEach((entry) => {
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
            }
        };

        loadMonthEntries();
    }, [currentDate]);

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
        setEditingDay(dayKey);
        setInputValue("");
        setTaskType("normal");
    };

    const addTask = async (dayKey) => {
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
        const dayTasks = tasks[dayKey] || [];
        const selectedTask = dayTasks[index];
        if (!selectedTask?.linkedTaskId) return;

        try {
            setIsSaving(true);
            const today = new Date().toISOString().split("T")[0];
            const response = await api.patch(`/tasks/${selectedTask.linkedTaskId}/`, {
                status: "Completed",
                completion_date: today,
            });

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

    // Month names for display
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    /* ============================
       RENDER CALENDAR GRID
    ============================ */
    const renderCalendarCells = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const cells = [];

        // 1. Empty cells
        for (let i = 0; i < firstDay; i++) {
            cells.push(
                <div key={`empty-${i}`} className="min-h-[160px] rounded-2xl bg-slate-50/40 border border-slate-100"></div>
            );
        }

        // 2. Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isSunday = date.getDay() === 0;
            const key = toDayKey(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayTasks = tasks[key] || [];
            const isEditing = editingDay === key;

            cells.push(
                <div
                    key={day}
                    className={`relative min-h-[160px] flex flex-col transition-all duration-300 group p-4 rounded-2xl border ${isSunday ? "bg-red-50/50 border-red-100" : "bg-white border-slate-100 shadow-sm hover:shadow-md"
                        }`}
                >
                    {/* Day Header */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[13px] font-black w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${isSunday ? "bg-[#b91c1c] text-white" : "bg-[#1e293b] text-white"
                                }`}>
                                {day}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider ${isSunday ? "text-red-500" : "text-[#1e293b]/40"}`}>
                                {date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                            </span>
                        </div>
                        <button
                            onClick={() => startEditingDay(key)}
                            className="p-1 px-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-[#1e293b] hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Plus size={14} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Tasks List */}
                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                        {dayTasks.map((task, idx) => (
                            <div
                                key={task.id}
                                className={`text-[10px] py-1.5 px-2.5 rounded-xl border flex justify-between items-center group/item transition-all ${task.type === "task"
                                    ? "bg-amber-50 border-amber-100 text-amber-900"
                                    : "bg-slate-50 border-slate-100 text-slate-700 hover:border-blue-200"
                                    }`}
                            >
                                <span className="font-bold truncate flex-1">{task.label}</span>
                                <div className="flex items-center gap-1">
                                    {task.type === "task" && task.linkedTaskId && (
                                        <button
                                            onClick={() => completeTask(key, idx)}
                                            disabled={isSaving || task.linkedTaskCompletionDate || ["On Time", "Delayed", "Completed"].includes(task.linkedTaskStatus)}
                                            className="text-[8px] font-black uppercase bg-emerald-500 text-white px-1.5 py-0.5 rounded-md disabled:bg-slate-200"
                                        >
                                            {task.linkedTaskCompletionDate || ["On Time", "Delayed", "Completed"].includes(task.linkedTaskStatus) ? "✓" : "Do"}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => removeTask(key, idx)}
                                        className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 p-0.5"
                                    >
                                        <X size={10} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Item Form (Styled as Popover) */}
                    {isEditing && (
                        <div className="absolute top-2 left-2 right-2 z-50 bg-white rounded-2xl shadow-2xl border border-blue-100 p-3 animate-in fade-in zoom-in duration-200">
                            <div className="flex gap-px bg-slate-100 p-0.5 rounded-xl mb-3">
                                <button
                                    onClick={() => setTaskType("normal")}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${taskType === "normal"
                                        ? "bg-[#1e293b] text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    Normal
                                </button>
                                <button
                                    onClick={() => setTaskType("task")}
                                    className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${taskType === "task"
                                        ? "bg-white text-slate-800 shadow-sm border border-slate-200"
                                        : "text-slate-500 hover:text-slate-800"
                                        }`}
                                >
                                    Task
                                </button>
                            </div>
                            <div className="flex gap-2 items-center">
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
                                    className="flex-1 text-xs py-2.5 px-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all placeholder:text-slate-300 font-bold"
                                />
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => addTask(key)}
                                        disabled={isSaving}
                                        className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                                    >
                                        <Plus size={18} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
                                    >
                                        <X size={18} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return cells;
    };

    return (
        <div className="h-screen w-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <main className="flex-1 overflow-y-auto px-12 py-12 space-y-12">
                {/* HEADER */}
                <div className="flex justify-between items-center">
                    <h1 className="text-7xl font-black tracking-tight text-[#1e293b]">
                        MCTC
                    </h1>

                    <div className="flex items-center gap-2 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-2 border-b-4 border-b-slate-200">
                        <button
                            onClick={handlePrevMonth}
                            className="p-3 bg-[#1e293b] text-white rounded-xl hover:bg-blue-900 transition-all active:scale-95 shadow-lg shadow-slate-200"
                        >
                            <ChevronLeft size={24} strokeWidth={3} />
                        </button>

                        <div className="px-8 min-w-[240px] text-center">
                            <h2 className="text-3xl font-black text-[#1e293b] flex items-center justify-center gap-3">
                                {monthNames[currentDate.getMonth()]}
                                <span className="text-slate-200 font-light">/</span>
                                <span>{currentDate.getFullYear()}</span>
                            </h2>
                        </div>

                        <button
                            onClick={handleNextMonth}
                            className="p-3 bg-[#1e293b] text-white rounded-xl hover:bg-blue-900 transition-all active:scale-95 shadow-lg shadow-slate-200"
                        >
                            <ChevronRight size={24} strokeWidth={3} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                        <div className={`w-2.5 h-2.5 rounded-full ${isSaving ? "bg-amber-400 animate-pulse" : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {isSaving ? "Saving..." : "Auto-saved"}
                        </span>
                    </div>
                </div>

                {/* CALENDAR GRID CONTAINER */}
                <div className="bg-slate-50/50 rounded-[3rem] border border-slate-200/60 p-8">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-8 gap-4">
                        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, i) => (
                            <div key={day} className={`text-center font-black text-xs tracking-[0.2em] py-4 rounded-2xl shadow-sm ${i === 0 ? "bg-[#b91c1c] text-white shadow-red-100" : "bg-[#1e293b] text-white shadow-slate-100"
                                }`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Cells Grid */}
                    <div className="grid grid-cols-7 gap-4">
                        {renderCalendarCells()}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default MCTC;
