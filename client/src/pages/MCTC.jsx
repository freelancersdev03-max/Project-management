import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../components/Sidebar";
import { ChevronLeft, ChevronRight, Plus, X, CheckCircle2, Clock } from "lucide-react";
import api from "../api";
import { PageHeader, Band } from "../components/kayaara/Band";

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState({});
  const [userId, setUserId] = useState(null);
  const [popupDate, setPopupDate] = useState(null);
  const [inputText, setInputText] = useState("");
  const [saving, setSaving] = useState(false);

  const todayKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const toDayKey = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const weeks = useMemo(() => {
    const w = [];
    let day = 1 - firstDay;
    while (true) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        if (day < 1 || day > daysInMonth) week.push(null);
        else week.push({ day, key: toDayKey(year, month, day) });
        day++;
      }
      w.push(week);
      if (day > daysInMonth) break;
    }
    return w;
  }, [year, month, daysInMonth, firstDay]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, mctcRes, tasksRes] = await Promise.all([
        api.get("/me/"),
        api.get("/mctc/entries/", { params: { year, month: month + 1 } }),
        api.get("/tasks/"),
      ]);

      setUserId(meRes.data.id);
      const grouped = {};
      const linkedIds = new Set();

      (mctcRes.data || []).forEach((entry) => {
        const key = entry.entry_date;
        if (!grouped[key]) grouped[key] = [];
        if (entry.linked_task) linkedIds.add(Number(entry.linked_task));
        grouped[key].push({
          id: entry.id,
          label: entry.label,
          type: entry.entry_type,
          linkedTaskId: entry.linked_task,
          linkedTaskStatus: entry.linked_task_status,
          linkedTaskCompleteDate: entry.linked_task_completion_date,
          isMctc: true,
        });
      });

      const taskList = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data?.results || []);
      taskList.forEach((t) => {
        const dateKey = t.target_date || t.start_date;
        if (!dateKey) return;
        const [ty, tm] = dateKey.split("-").map(Number);
        if (ty !== year || tm !== month + 1) return;
        if (linkedIds.has(Number(t.id))) return;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({
          id: `task-${t.id}`,
          label: t.title || "",
          type: "task",
          linkedTaskId: null,
          linkedTaskStatus: t.status,
          linkedTaskCompleteDate: t.completion_date,
          isMctc: false,
        });
      });

      setTasks(grouped);
    } catch (err) {
      console.error("Failed to load calendar data", err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrev = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNext = () => setCurrentDate(new Date(year, month + 1, 1));

  const openPopup = (dateKey) => {
    if (!dateKey) return;
    const dow = new Date(year, month, parseInt(dateKey.split("-")[2])).getDay();
    if (dow === 0) return;
    setPopupDate(dateKey);
    setInputText("");
  };

  const closePopup = () => { setPopupDate(null); setInputText(""); };

  const addTask = async () => {
    const label = inputText.trim();
    if (!label || !popupDate) return;
    try {
      setSaving(true);
      const taskRes = await api.post("/tasks/", {
        title: label,
        assigned_to: userId,
        target_date: popupDate,
        start_date: popupDate,
        source_module: "MCTC",
      });
      const entryRes = await api.post("/mctc/entries/", {
        entry_date: popupDate,
        label,
        entry_type: "task",
        linked_task: taskRes.data.id,
        half_type: "first_half",
      });
      setTasks((prev) => ({
        ...prev,
        [popupDate]: [
          ...(prev[popupDate] || []),
          {
            id: entryRes.data.id,
            label,
            type: "task",
            linkedTaskId: taskRes.data.id,
            linkedTaskStatus: null,
            linkedTaskCompleteDate: null,
            isMctc: true,
          },
        ],
      }));
      closePopup();
    } catch (err) {
      console.error("Failed to add task", err);
    } finally {
      setSaving(false);
    }
  };

  const completeTask = async (dateKey, entry) => {
    if (!entry.linkedTaskId) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      await api.patch(`/tasks/${entry.linkedTaskId}/`, { status: "Completed", completion_date: today });
      setTasks((prev) => {
        const items = [...(prev[dateKey] || [])];
        const idx = items.findIndex((t) => t.id === entry.id);
        if (idx !== -1) items[idx] = { ...items[idx], linkedTaskStatus: "Completed", linkedTaskCompleteDate: today };
        return { ...prev, [dateKey]: items };
      });
    } catch (err) {
      console.error("Failed to complete task", err);
    }
  };

  const deleteTask = async (dateKey, entry) => {
    if (!entry.isMctc) return;
    try {
      await api.delete(`/mctc/entries/${entry.id}/`);
      setTasks((prev) => ({
        ...prev,
        [dateKey]: (prev[dateKey] || []).filter((t) => t.id !== entry.id),
      }));
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageHeader
          title="Calendar"
          subtitle={`${monthNames[month]} ${year}`}
          actions={
            <div className="flex items-center gap-2">
              <button onClick={handlePrev} className="k-btn-icon"><ChevronLeft size={16} /></button>
              <span className="min-w-[120px] text-center text-sm font-bold" style={{ color: "var(--k-ink)" }}>
                {monthNames[month]} {year}
              </span>
              <button onClick={handleNext} className="k-btn-icon"><ChevronRight size={16} /></button>
            </div>
          }
        />
        <main className="min-h-0 flex-1 overflow-y-auto k-scroll">
          <Band tone="grey" className="h-full !p-2 sm:!p-3 md:!p-4">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--k-grey-200)" }}>
              <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--k-grey-200)" }}>
                {dayNames.map((d, i) => (
                  <div key={d} className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider" style={{
                    background: "var(--k-band-grey)",
                    color: i === 0 ? "var(--k-grey-400)" : "var(--k-grey-500)",
                    borderRight: i < 6 ? "1px solid var(--k-grey-200)" : "none",
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              {loading ? (
                <div className="grid grid-cols-7 flex-1" style={{ background: "var(--k-band-grey)" }}>
                  {Array.from({ length: 35 }).map((_, i) => (
                    <div key={i} className="p-2 border-r border-b" style={{ borderColor: "var(--k-grey-200)" }}>
                      <div className="k-skeleton h-4 w-5 mb-1" />
                      <div className="k-skeleton h-4 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid flex-1" style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 min-h-0">
                      {week.map((cell, di) => {
                        const isSunday = di === 0;
                        const isToday = cell?.key === todayKey;

                        if (!cell) {
                          return (
                            <div key={`e-${wi}-${di}`} className="h-full min-h-0 border-r border-b" style={{ borderColor: "var(--k-grey-200)", background: "var(--k-band-grey)" }} />
                          );
                        }

                        if (isSunday) {
                          return (
                            <div key={cell.key} className="h-full min-h-0 border-r border-b p-1.5" style={{ borderColor: "var(--k-grey-200)", background: "var(--k-band-grey)" }}>
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold" style={{ background: "var(--k-grey-300)", color: "var(--k-white)" }}>
                                {cell.day}
                              </span>
                            </div>
                          );
                        }

                        const dayTasks = tasks[cell.key] || [];

                        return (
                          <div
                            key={cell.key}
                            onClick={() => openPopup(cell.key)}
                            className="h-full min-h-0 border-r border-b p-1.5 cursor-pointer transition-all hover:brightness-95 flex flex-col"
                            style={{ borderColor: "var(--k-grey-200)", background: isToday ? "var(--k-blue-tint)" : "var(--k-white)" }}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span
                                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold"
                                style={{ background: isToday ? "var(--k-blue)" : "transparent", color: isToday ? "white" : "var(--k-ink)" }}
                              >
                                {cell.day}
                              </span>
                              {dayTasks.length > 0 && (
                                <span className="text-[9px] font-bold" style={{ color: "var(--k-blue)" }}>
                                  {dayTasks.length}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 space-y-0.5 overflow-hidden">
                              {dayTasks.slice(0, 3).map((t) => {
                                const isComplete = t.linkedTaskStatus === "Completed" || t.linkedTaskStatus === "On Time" || t.linkedTaskCompleteDate;
                                return (
                                  <div
                                    key={t.id}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold truncate"
                                    style={{
                                      background: isComplete ? "#ecfdf5" : "var(--k-blue-tint)",
                                      color: isComplete ? "#047857" : "var(--k-blue)",
                                    }}
                                  >
                                    {isComplete ? <CheckCircle2 size={8} /> : <Clock size={8} />}
                                    <span className="truncate">{t.label}</span>
                                  </div>
                                );
                              })}
                              {dayTasks.length > 3 && (
                                <span className="text-[8px] font-bold" style={{ color: "var(--k-grey-500)" }}>
                                  +{dayTasks.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Band>
        </main>

        <AnimatePresence>
          {popupDate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: "rgba(23,24,26,0.45)", backdropFilter: "blur(4px)" }}
              onClick={closePopup}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 16 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md rounded-3xl p-6"
                style={{ background: "var(--k-white)", border: "1px solid var(--k-grey-200)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="k-eyebrow mb-0.5">Add task for</p>
                    <h3 className="text-lg font-bold" style={{ color: "var(--k-ink)" }}>
                      {new Date(popupDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                    </h3>
                  </div>
                  <button onClick={closePopup} className="k-btn-icon"><X size={18} /></button>
                </div>

                {(tasks[popupDate] || []).length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    <p className="k-eyebrow">Tasks</p>
                    {(tasks[popupDate] || []).map((t) => {
                      const isComplete = t.linkedTaskStatus === "Completed" || t.linkedTaskStatus === "On Time" || t.linkedTaskCompleteDate;
                      return (
                        <div key={t.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: isComplete ? "#ecfdf5" : "var(--k-band-grey)" }}>
                          <span className="text-sm font-semibold truncate flex-1" style={{ color: isComplete ? "#047857" : "var(--k-ink)" }}>
                            {t.label}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {t.linkedTaskId && !isComplete && (
                              <button onClick={(e) => { e.stopPropagation(); completeTask(popupDate, t); }}
                                className="text-[10px] font-bold px-2 py-1 rounded-lg"
                                style={{ background: "var(--k-blue)", color: "white" }}
                              >
                                Done
                              </button>
                            )}
                            {isComplete && <CheckCircle2 size={14} style={{ color: "#10b981" }} />}
                            {t.isMctc && (
                              <button onClick={(e) => { e.stopPropagation(); deleteTask(popupDate, t); }}
                                className="p-1 rounded-lg" style={{ color: "var(--k-grey-500)" }}
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    className="k-input flex-1"
                    placeholder="What needs to be done?"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addTask(); }}
                    autoFocus
                  />
                  <button onClick={addTask} disabled={saving || !inputText.trim()} className="k-btn-primary px-5 text-sm">
                    <Plus size={16} /> Add
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Calendar;
