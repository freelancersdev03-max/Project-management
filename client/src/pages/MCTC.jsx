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
            const response = await api.post("/mctc/entries/", {
                entry_date: dayKey,
                label,
                entry_type: taskType,
            });

            setTasks((prev) => {
                const dayTasks = prev[dayKey] || [];
                const newTask = {
                    id: response.data.id,
                    label: response.data.label,
                    type: response.data.entry_type,
                };
                return {
                    ...prev,
                    [dayKey]: [...dayTasks, newTask],
                };
            });

            if (taskType === "task" && userId) {
                try {
                    await api.post("/tasks/", {
                        title: label,
                        assigned_to: userId,
                        target_date: dayKey,
                    });
                } catch (error) {
                    console.error("Failed to create task from MCTC entry:", error);
                }
            }

            setInputValue("");
            setEditingDay(null);
        } catch (error) {
            console.error("Failed to auto-save MCTC entry:", error);
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
                <div key={`empty-${i}`} className="min-h-[180px] rounded-2xl bg-slate-50/60 border border-slate-200/60"></div>
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
                    className={`relative min-h-[180px] flex flex-col transition-all group hover:shadow-lg hover:z-20 duration-200 p-4 rounded-2xl ${isSunday ? "bg-gradient-to-br from-red-50 to-red-100/50" : "bg-white"
                        } border border-slate-200/60`}
                >
                    {/* Day Header */}
                    <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${isSunday ? "bg-red-200 text-red-700 shadow-sm" : "bg-blue-100 text-blue-700 shadow-sm"
                                }`}>
                                {day}
                            </span>
                            {isSunday && (
                                <span className="text-[8px] font-black text-red-600 uppercase tracking-wider bg-red-200 px-1.5 py-0.5 rounded-md shadow-sm">
                                    SUNDAY
                                </span>
                            )}
                        </div>
                        {!isSunday && (
                            <button
                                onClick={() => startEditingDay(key)}
                                className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all shadow-sm hover:shadow-md"
                                aria-label={`Add item for day ${day}`}
                            >
                                <Plus size={14} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    {/* Tasks List */}
                    <div className="flex-1 flex flex-col gap-2">
                        <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[88px] custom-scrollbar">
                            {dayTasks.map((task, idx) => (
                                <div
                                    key={task.id}
                                    className={`text-[11px] py-2 px-2.5 rounded-lg shadow-sm border flex justify-between items-center group/item hover:shadow-md transition-all ${task.type === "task"
                                        ? "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200/70 text-amber-900"
                                        : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/70 text-slate-700"
                                        }`}
                                >
                                    <span className="font-medium truncate flex-1">{task.label}</span>
                                    <button
                                        onClick={() => removeTask(key, idx)}
                                        className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 transition-all p-0.5 ml-1 shrink-0"
                                    >
                                        <X size={12} strokeWidth={2.5} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Inline Form */}
                        {isEditing && (
                            <div className="mt-auto rounded-xl border border-slate-200 bg-white/90 p-2 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <button
                                        onClick={() => setTaskType("normal")}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${taskType === "normal"
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                            }`}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        onClick={() => setTaskType("task")}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all ${taskType === "task"
                                            ? "bg-amber-500 text-white border-amber-500"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                                            }`}
                                    >
                                        Task
                                    </button>
                                </div>
                                <div className="flex gap-1.5 items-center">
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
                                        className="flex-1 text-[10px] py-2 px-2 bg-white border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-300"
                                    />
                                    <button
                                        onClick={() => addTask(key)}
                                        disabled={isSaving}
                                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                                    >
                                        <CheckCircle2 size={14} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                                    >
                                        <X size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return cells;
    };

    return (
        <div className="h-screen w-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <main className="flex-1 overflow-y-auto px-8 py-8 space-y-8">

                {/* HEADER */}
                <div className="flex flex-col xl:flex-row justify-between items-end gap-6 pb-6 border-b border-slate-200/60">
                    <div>
                        <h1 className="text-6xl font-black tracking-tighter text-slate-900 mb-2">
                            MCTC
                        </h1>
                    </div>
                <div className="flex justify-between items-center p-2 rounded-3xl shadow-sm border border-slate-200/60 max-w-4xl mx-auto backdrop-blur-sm bg-white/80 sticky top-4 z-40">
                    <button
                        onClick={handlePrevMonth}
                        className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 hover:shadow-inner"
                    >
                        <ChevronLeft size={24} strokeWidth={2.5} />
                    </button>

                    <div className="text-center px-8">
                        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                            {monthNames[currentDate.getMonth()]}
                            <span className="text-slate-200 text-4xl font-light">/</span>
                            <span className="text-slate-400">{currentDate.getFullYear()}</span>
                        </h2>
                    </div>

                    <button
                        onClick={handleNextMonth}
                        className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 hover:shadow-inner"
                    >
                        <ChevronRight size={24} strokeWidth={2.5} />
                    </button>
                </div>
                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                        {isSaving ? "Auto-saving..." : "Auto-saved"}
                    </div>
                </div>

                {/* CONTROLS */}
                

                {/* CALENDAR GRID */}
                <div className="bg-white rounded-[4rem]  shadow-2xl shadow-slate-200/50 border border-slate-100 p-6">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-4 gap-px">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                            <div key={day} className={`text-center font-black uppercase text-xs tracking-widest py-4 rounded-[4rem] ${i === 0 ? "text-red-600 bg-red-100/40" : "text-blue-600 bg-blue-100/40"
                                }`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Cells */}
                    <div className="grid grid-cols-7 gap-4">
                        {renderCalendarCells()}
                    </div>
                </div>

            </main>
        </div>
    );
};

export default MCTC;
