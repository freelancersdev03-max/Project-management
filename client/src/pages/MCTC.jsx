import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Save, Printer, Plus, X, Trash2, CheckCircle2 } from "lucide-react";

const MCTC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);

    // State to store tasks: { "YYYY-MM-DD": { first: ["Task 1", "Task 2"], second: [] } }
    const [tasks, setTasks] = useState({});

    // New Task Form State
    const [newTask, setNewTask] = useState({
        date: new Date().toISOString().split('T')[0], // Default key format YYYY-MM-DD
        half: "first",
        content: ""
    });

    const [pendingTasks, setPendingTasks] = useState([]); // List of tasks to be added in current session

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

    // --- Task Management ---

    const openModal = (prefillDate = null, prefillHalf = "first") => {
        // If a specific date is clicked, prefill it
        let dateStr = newTask.date;
        if (prefillDate) {
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // JS months are 0-indexed
            const day = String(prefillDate).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`; // Format used by input type="date"
        }

        setNewTask({
            date: dateStr,
            half: prefillHalf,
            content: ""
        });
        setPendingTasks([]); // Clear pending list
        setIsModalOpen(true);
    };

    const handleAddToPending = () => {
        if (!newTask.content.trim()) return;
        setPendingTasks([...pendingTasks, newTask.content]);
        setNewTask({ ...newTask, content: "" });
    };

    const removeFromPending = (index) => {
        const updated = [...pendingTasks];
        updated.splice(index, 1);
        setPendingTasks(updated);
    };

    const handleFinalSubmit = () => {
        // Combine pending tasks and current input content (if any)
        const tasksToAdd = [...pendingTasks];
        if (newTask.content.trim()) {
            tasksToAdd.push(newTask.content);
        }

        if (tasksToAdd.length === 0) return;

        // Convert input date to key format
        const [y, m, d] = newTask.date.split("-");
        const key = `${parseInt(y)}-${parseInt(m) - 1}-${parseInt(d)}`;

        setTasks(prev => {
            const dayTasks = prev[key] || { first: [], second: [] };
            return {
                ...prev,
                [key]: {
                    ...dayTasks,
                    [newTask.half]: [...(dayTasks[newTask.half] || []), ...tasksToAdd]
                }
            };
        });

        setNewTask({ ...newTask, content: "" });
        setPendingTasks([]);
        setIsModalOpen(false);
    };

    const removeTask = (dayKey, half, index) => {
        setTasks(prev => {
            const dayTasks = prev[dayKey];
            if (!dayTasks) return prev;

            const newHalfTasks = [...dayTasks[half]];
            newHalfTasks.splice(index, 1);

            return {
                ...prev,
                [dayKey]: {
                    ...dayTasks,
                    [half]: newHalfTasks
                }
            };
        });
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
                <div key={`empty-${i}`} className="bg-slate-50/30 min-h-[160px]"></div>
            );
        }

        // 2. Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isSunday = date.getDay() === 0;
            const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
            // Data structure: { first: [], second: [] }
            const dayData = tasks[key] || { first: [], second: [] };

            cells.push(
                <div
                    key={day}
                    className={`relative min-h-[160px] flex flex-col transition-all group hover:bg-white hover:shadow-xl hover:z-20 hover:scale-[1.02] duration-200 p-2 cursor-pointer ${isSunday ? "bg-red-50/40" : "bg-white"
                        }`}
                    onClick={() => !isSunday && openModal(day)} // Click cell to add task quickly
                >
                    {/* Day Header */}
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isSunday ? "bg-red-100 text-red-600 shadow-sm" : "bg-slate-100 text-slate-600 shadow-sm group-hover:bg-slate-900 group-hover:text-white"
                            }`}>
                            {day}
                        </span>
                        {isSunday && (
                            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest border border-red-200 px-2 py-0.5 rounded-md bg-white shadow-sm">
                                Holiday
                            </span>
                        )}
                    </div>

                    {/* Content */}
                    {isSunday ? (
                        <div className="flex-1 flex items-center justify-center opacity-10 pointer-events-none overflow-hidden">
                            <span className="text-5xl font-black text-red-500 -rotate-12 select-none whitespace-nowrap">SUNDAY</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1.5 flex-1 h-full">

                            {/* 1st Half Layout */}
                            <div className="flex-1 bg-blue-50/40 rounded-lg p-1.5 border border-blue-100/60 hover:border-blue-200 transition-colors flex flex-col gap-1">
                                <div className="text-[9px] font-bold text-blue-500 uppercase flex justify-between items-center px-1">
                                    <span>Morning (1st)</span>
                                    {dayData.first?.length > 0 && <span className="bg-blue-100 text-blue-600 px-1.5 rounded-md">{dayData.first.length}</span>}
                                </div>
                                <div className="flex flex-col gap-1 overflow-y-auto max-h-[50px] custom-scrollbar pr-1">
                                    {dayData.first?.map((t, idx) => (
                                        <div key={idx} className="bg-white text-[10px] py-1 px-2 rounded-md shadow-sm border border-blue-100 text-slate-700 flex justify-between items-center group/item hover:border-blue-300 transition-colors">
                                            <span className="truncate font-medium">{t}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeTask(key, 'first', idx); }}
                                                className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 transition-all p-0.5"
                                            >
                                                <X size={10} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2nd Half Layout */}
                            <div className="flex-1 bg-purple-50/40 rounded-lg p-1.5 border border-purple-100/60 hover:border-purple-200 transition-colors flex flex-col gap-1">
                                <div className="text-[9px] font-bold text-zinc-900 uppercase flex justify-between items-center px-1">
                                    <span>Afternoon (2nd)</span>
                                    {dayData.second?.length > 0 && <span className="bg-purple-100 text-purple-600 px-1.5 rounded-md">{dayData.second.length}</span>}
                                </div>
                                <div className="flex flex-col gap-1 overflow-y-auto max-h-[50px] custom-scrollbar pr-1">
                                    {dayData.second?.map((t, idx) => (
                                        <div key={idx} className="bg-white text-[10px] py-1 px-2 rounded-md shadow-sm border border-purple-100 text-slate-700 flex justify-between items-center group/item hover:border-purple-300 transition-colors">
                                            <span className="truncate font-medium">{t}</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeTask(key, 'second', idx); }}
                                                className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 transition-all p-0.5"
                                            >
                                                <X size={10} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ))}
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
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 pb-28 relative">
            <Navbar hideLogin />

            <main className="max-w-[1600px] mx-auto px-8 py-8 space-y-8">

                {/* HEADER */}
                <div className="flex flex-col xl:flex-row justify-between items-end gap-6 pb-6 border-b border-slate-200/60">
                    <div>
                        <h1 className="text-6xl font-black tracking-tighter text-slate-900 mb-2">
                            MCTC
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-300 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all group">
                            <Save size={18} className="group-hover:animate-bounce" />
                            <span>Save Calendar</span>
                        </button>
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex justify-between items-center bg-white p-2 rounded-3xl shadow-sm border border-slate-200/60 max-w-4xl mx-auto backdrop-blur-sm bg-white/80 sticky top-4 z-40">
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

                {/* CALENDAR GRID */}
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-6">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-4">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                            <div key={day} className={`text-center font-black uppercase text-xs tracking-widest py-3 rounded-xl ${i === 0 ? "text-red-500 bg-red-50" : "text-slate-400"
                                }`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Cells */}
                    <div className="grid grid-cols-7 bg-slate-100 gap-px border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
                        {renderCalendarCells()}
                    </div>
                </div>

            </main>

            {/* Floating Action Button */}
            <div className="fixed bottom-10 right-10 z-50">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-40 animate-pulse"></div>
                <button
                    onClick={() => openModal()}
                    className="relative w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all group border-4 border-slate-50"
                >
                    <Plus size={32} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300"
                        onClick={() => setIsModalOpen(false)}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100">

                        <div className="bg-slate-50/80 p-6 border-b border-slate-100 flex justify-between items-center backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                                    <Plus size={20} strokeWidth={3} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Add New Tasks</h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Date Picker */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Date</label>
                                <input
                                    type="date"
                                    value={newTask.date}
                                    onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
                                    className="w-full text-base font-bold p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-slate-900 focus:bg-white transition-all text-slate-700 shadow-sm"
                                />
                            </div>

                            {/* Half Selector */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select Session</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setNewTask({ ...newTask, half: "first" })}
                                        className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-1 ${newTask.half === "first"
                                            ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md transform scale-[1.02]"
                                            : "border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50"
                                            }`}
                                    >
                                        <span className="text-lg">☀️</span>
                                        <span>Morning (1st)</span>
                                    </button>
                                    <button
                                        onClick={() => setNewTask({ ...newTask, half: "second" })}
                                        className={`p-4 rounded-2xl border-2 font-bold text-sm transition-all flex flex-col items-center justify-center gap-1 ${newTask.half === "second"
                                            ? "border-zinc-900 bg-purple-50 text-zinc-900 shadow-md transform scale-[1.02]"
                                            : "border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:bg-slate-50"
                                            }`}
                                    >
                                        <span className="text-lg">🌤️</span>
                                        <span>Afternoon (2nd)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Task Input Area */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Task Details</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newTask.content}
                                        onChange={(e) => setNewTask({ ...newTask, content: e.target.value })}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddToPending()}
                                        className="flex-1 p-4 text-sm font-bold bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-slate-900 focus:bg-white transition-all placeholder:text-slate-300 placeholder:font-medium"
                                        placeholder="Type task & press Enter..."
                                    />
                                    <button
                                        onClick={handleAddToPending}
                                        className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-200"
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Pending Tasks List */}
                            {pendingTasks.length > 0 && (
                                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending Items</label>
                                        <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        {pendingTasks.map((task, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 text-sm shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></div>
                                                    <span className="truncate font-bold text-slate-600">{task}</span>
                                                </div>
                                                <button
                                                    onClick={() => removeFromPending(idx)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={handleFinalSubmit}
                                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-300 hover:bg-slate-800 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 text-lg"
                            >
                                <CheckCircle2 size={24} />
                                <span>{(pendingTasks.length > 0 || newTask.content) ? `Save ${pendingTasks.length + (newTask.content ? 1 : 0)} Tasks` : "Save Changes"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default MCTC;
