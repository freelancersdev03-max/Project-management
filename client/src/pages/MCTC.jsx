import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Save, Printer, Plus, X, Trash2, CheckCircle2 } from "lucide-react";

const MCTC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());

    // State to store tasks: { "YYYY-MM-DD": ["Task 1", "Task 2"] }
    const [tasks, setTasks] = useState({});

    // Track which day has the input field open
    const [editingDay, setEditingDay] = useState(null);
    const [inputValue, setInputValue] = useState("");

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

    const startEditingDay = (dayKey) => {
        setEditingDay(dayKey);
        setInputValue("");
    };

    const addTask = (dayKey) => {
        if (!inputValue.trim()) return;

        setTasks(prev => {
            const dayTasks = prev[dayKey] || [];
            return {
                ...prev,
                [dayKey]: [...dayTasks, inputValue.trim()]
            };
        });

        setInputValue("");
        setEditingDay(null);
    };

    const removeTask = (dayKey, index) => {
        setTasks(prev => {
            const dayTasks = prev[dayKey];
            if (!dayTasks) return prev;

            const newDayTasks = [...dayTasks];
            newDayTasks.splice(index, 1);

            return {
                ...prev,
                [dayKey]: newDayTasks
            };
        });
    };

    const cancelEditing = () => {
        setEditingDay(null);
        setInputValue("");
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
                <div key={`empty-${i}`} className="bg-slate-50/30 min-h-[180px]"></div>
            );
        }

        // 2. Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isSunday = date.getDay() === 0;
            const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
            const dayTasks = tasks[key] || [];
            const isEditing = editingDay === key;

            cells.push(
                <div
                    key={day}
                    className={`relative min-h-[180px] flex flex-col transition-all group hover:shadow-lg hover:z-20 duration-200 p-3 ${isSunday ? "bg-gradient-to-br from-red-50 to-red-100/50" : "bg-white"
                        } border-l border-t border-slate-200/60`}
                >
                    {/* Day Header */}
                    <div className="flex justify-between items-start mb-2">
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

                    {/* Tasks List */}
                    {!isSunday && (
                        <div className="flex-1 flex flex-col gap-1.5 mb-2">
                            <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                                {dayTasks.map((task, idx) => (
                                    <div 
                                        key={idx} 
                                        className="bg-gradient-to-r from-blue-50 to-indigo-50 text-[11px] py-2 px-2.5 rounded-lg shadow-sm border border-blue-200/50 text-slate-700 flex justify-between items-center group/item hover:border-blue-400 transition-all hover:shadow-md"
                                    >
                                        <span className="font-medium truncate flex-1">{task}</span>
                                        <button
                                            onClick={() => removeTask(key, idx)}
                                            className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 transition-all p-0.5 ml-1 shrink-0"
                                        >
                                            <X size={12} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Inline Input or Plus Button */}
                            {isEditing ? (
                                <div className="flex gap-1.5 items-center mt-auto">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') addTask(key);
                                            else if (e.key === 'Escape') cancelEditing();
                                        }}
                                        placeholder="Add task..."
                                        className="flex-1 text-[10px] py-2 px-2 bg-white border-2 border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-slate-300"
                                    />
                                    <button
                                        onClick={() => addTask(key)}
                                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                    </button>
                                    <button
                                        onClick={cancelEditing}
                                        className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors"
                                    >
                                        <X size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => startEditingDay(key)}
                                    className="mt-auto py-1.5 px-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all flex items-center justify-center gap-1 font-semibold text-[10px] shadow-sm hover:shadow-md group"
                                >
                                    <Plus size={12} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
                                    <span>Add</span>
                                </button>
                            )}
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
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-xl shadow-slate-300 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all group">
                            <Save size={18} className="group-hover:animate-bounce" />
                            <span>Save Calendar</span>
                        </button>
                    </div>
                </div>

                {/* CONTROLS */}
                

                {/* CALENDAR GRID */}
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-6">
                    {/* Days Header */}
                    <div className="grid grid-cols-7 mb-4 gap-px">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                            <div key={day} className={`text-center font-black uppercase text-xs tracking-widest py-4 rounded-xl ${i === 0 ? "text-red-600 bg-red-100/40" : "text-blue-600 bg-blue-100/40"
                                }`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Cells */}
                    <div className="grid grid-cols-7 gap-px border border-slate-200 rounded-2xl overflow-hidden shadow-inner">
                        {renderCalendarCells()}
                    </div>
                </div>

            </main>

        </div>
    );
};

export default MCTC;
