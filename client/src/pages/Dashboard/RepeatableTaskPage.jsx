import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CalendarDays, Plus, Trash2 } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import api from "../../api";

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const MONTH_WEEKS = ["First", "Second", "Third", "Fourth", "Last"];

const MONTH_WEEKS_WITH_DATES = [
  { label: "First", dateRange: "1-7" },
  { label: "Second", dateRange: "8-14" },
  { label: "Third", dateRange: "15-21" },
  { label: "Fourth", dateRange: "22-28" },
  { label: "Last", dateRange: "29+" },
];

const createRepeatRow = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  task: "",
  client: "",
  project: "",
  isInternalRow: false,
  repeatFrequency: "",
  repeatDays: [],
  repeatWeeks: [],
  repeatEndDate: "",
});

const normalizeListResponse = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const splitRepeatValues = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

const formatRepeatValues = (value) => {
  const values = splitRepeatValues(value);
  return values.length ? values.join(", ") : "-";
};

const normalizeRoleLabel = (role) => {
  const normalized = String(role || "").toUpperCase();
  if (normalized.includes("EXTERNAL")) return "(EXTERNAL)";
  return normalized || "EMPLOYEE";
};

const buildMemberFromUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    id: user.id,
    username: user.username,
    full_name: user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim(),
    email: user.email,
    role: normalizeRoleLabel(user.role),
  };
};

const dedupeMembersByIdentity = (members = []) => {
  const unique = new Map();

  members.forEach((member) => {
    if (!member) return;
    const emailKey = member.email ? `email:${String(member.email).toLowerCase()}` : "";
    const idKey = member.id ? `id:${member.id}` : "";
    const key = emailKey || idKey;
    if (!key || unique.has(key)) return;

    unique.set(key, {
      ...member,
      role: normalizeRoleLabel(member.role),
    });
  });

  return Array.from(unique.values());
};

const RepeatableTaskPage = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [clientProjectMap, setClientProjectMap] = useState({});
  const [assignableDirectory, setAssignableDirectory] = useState({
    internal: [],
    externalClient: [],
  });

  const [formData, setFormData] = useState({
    startDate: "",
    file: null,
  });

  const [repeatRows, setRepeatRows] = useState([createRepeatRow()]);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [activeRepeatableTasks, setActiveRepeatableTasks] = useState([]);

  const toggleDropdown = (rowId, field) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [`${rowId}-${field}`]: !prev[`${rowId}-${field}`],
    }));
  };

  const minTaskDate = useMemo(() => {
    const now = new Date();
    const offsetInMs = now.getTimezoneOffset() * 60 * 1000;
    return new Date(now.getTime() - offsetInMs).toISOString().split("T")[0];
  }, []);

  const getInternalDirectoryMembers = () => dedupeMembersByIdentity(assignableDirectory.internal);

  const getExternalClientUsers = (clientId = null) => {
    const normalizedClientId = Number(clientId);
    const hasValidClientId = Number.isInteger(normalizedClientId) && normalizedClientId > 0;

    const scopedDirectoryUsers = assignableDirectory.externalClient.filter((member) => {
      if (!hasValidClientId) return true;
      return Number(member.client_id) === normalizedClientId;
    });

    return dedupeMembersByIdentity(scopedDirectoryUsers);
  };

  const getAssignableMembers = () => {
    if (formData.isInternal) {
      return getInternalDirectoryMembers();
    }

    const selectedProject = clientProjectMap[formData.client]?.find((p) => p.name === formData.project);
    if (!selectedProject) {
      return getExternalClientUsers();
    }

    return getExternalClientUsers(selectedProject.client);
  };

  const toggleArrayValue = (arr, value) => (
    arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value]
  );

  const updateRepeatRow = (rowId, patch) => {
    setRepeatRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const toggleRepeatRowListValue = (rowId, key, value) => {
    setRepeatRows((prev) => prev.map((row) => {
      if (row.id !== rowId) return row;
      return { ...row, [key]: toggleArrayValue(row[key], value) };
    }));
  };

  const addRepeatRow = () => {
    setRepeatRows((prev) => [...prev, createRepeatRow()]);
  };

  const removeRepeatRow = (rowId) => {
    setRepeatRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((row) => row.id !== rowId);
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userRes, projectRes, internalUsersRes, externalUsersRes, repeatableTasksRes] = await Promise.all([
          api.get("me/"),
          api.get("projects/"),
          api.get("assignable-users/", { params: { scope: "internal" } }),
          api.get("assignable-users/", { params: { scope: "external_client" } }),
          api.get("tasks/", { params: { is_repeatable: true } }),
        ]);

        setCurrentUser(userRes.data || null);

        const projectsData = normalizeListResponse(projectRes.data);
        const mapping = {};
        projectsData.forEach((project) => {
          const client = project.client_name || "Unknown Client";
          if (!mapping[client]) mapping[client] = [];
          mapping[client].push(project);
        });
        setClientProjectMap(mapping);

        setAssignableDirectory({
          internal: normalizeListResponse(internalUsersRes.data).map(buildMemberFromUser).filter(Boolean),
          externalClient: normalizeListResponse(externalUsersRes.data).map(buildMemberFromUser).filter(Boolean),
        });

        const activeRepeatables = normalizeListResponse(repeatableTasksRes.data)
          .filter((task) => Boolean(task?.is_repeatable))
          .filter((task) => !task?.repeat_end_date || task.repeat_end_date >= minTaskDate)
          .sort((a, b) => {
            const aDate = new Date(a?.repeat_end_date || "9999-12-31").getTime();
            const bDate = new Date(b?.repeat_end_date || "9999-12-31").getTime();
            return aDate - bDate;
          });

        setActiveRepeatableTasks(activeRepeatables);

        setFormData((prev) => ({
          ...prev,
          startDate: prev.startDate || minTaskDate,
        }));
      } catch (error) {
        console.error("Failed to load repeatable task page:", error?.response?.data || error);
        alert("Unable to load data for repeatable task assignment.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [minTaskDate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!repeatRows.length) {
      alert("Please add at least one repetition row.");
      return;
    }

    for (let index = 0; index < repeatRows.length; index += 1) {
      const row = repeatRows[index];
      const rowLabel = `Row ${index + 1}`;

      if (!row.task) {
        alert(`${rowLabel}: Please enter task name.`);
        return;
      }

      if (!row.client) {
        alert(`${rowLabel}: Please select client.`);
        return;
      }

      if (!row.isInternalRow && !row.project) {
        alert(`${rowLabel}: Please select project.`);
        return;
      }

      if (!row.repeatFrequency) {
        alert(`${rowLabel}: Please select repeat frequency.`);
        return;
      }

      if (!row.repeatEndDate) {
        alert(`${rowLabel}: Please select repeat end date.`);
        return;
      }

      if (row.repeatEndDate < minTaskDate) {
        alert(`${rowLabel}: Repeat end date cannot be in the past.`);
        return;
      }

      if ((row.repeatFrequency === "Daily" || row.repeatFrequency === "Weekly") && row.repeatDays.length === 0) {
        alert(`${rowLabel}: Select at least one day.`);
        return;
      }

      if (row.repeatFrequency === "Monthly" && row.repeatWeeks.length === 0) {
        alert(`${rowLabel}: Select at least one week.`);
        return;
      }

      if (row.repeatFrequency === "Monthly" && row.repeatDays.length === 0) {
        alert(`${rowLabel}: Select at least one day.`);
        return;
      }
    }

    try {
      for (const row of repeatRows) {
        const isInternal = row.isInternalRow;
        const selectedProjectObj = !isInternal
          ? clientProjectMap[row.client]?.find((p) => p.name === row.project)
          : null;
        const selectedUser = currentUser;

        if (!isInternal && !selectedProjectObj) {
          alert(`Row: Invalid project selected.`);
          return;
        }

        if (!selectedUser) {
          alert("Current user not found.");
          return;
        }

        const payload = {
          title: row.task,
          project: selectedProjectObj ? selectedProjectObj.id : null,
          client_org: selectedProjectObj ? selectedProjectObj.client : null,
          assigned_to: selectedUser.id,
          target_date: formData.startDate || minTaskDate,
          description: isInternal ? "Internal Repeatable Task" : "Repeatable task via dashboard",
          status: "In Progress",
          is_repeatable: true,
          repeat_frequency: row.repeatFrequency,
          repeat_end_date: row.repeatEndDate,
          repeat_day: (row.repeatFrequency === "Daily" || row.repeatFrequency === "Weekly")
            ? row.repeatDays.join(",")
            : (row.repeatFrequency === "Monthly" ? row.repeatDays.join(",") : null),
          repeat_week: row.repeatFrequency === "Monthly" ? row.repeatWeeks.join(",") : null,
        };

        if (formData.file) {
          const uploadData = new FormData();
          Object.keys(payload).forEach((key) => {
            if (payload[key] !== null && payload[key] !== "") {
              uploadData.append(key, payload[key]);
            }
          });
          uploadData.append("assigned_file", formData.file);
          await api.post("tasks/", uploadData, { headers: { "Content-Type": "multipart/form-data" } });
        } else {
          await api.post("tasks/", payload);
        }
      }

      alert(`${repeatRows.length} repeatable task(s) created successfully.`);
      try {
        const refreshRes = await api.get("tasks/", { params: { is_repeatable: true } });
        const activeRepeatables = normalizeListResponse(refreshRes.data)
          .filter((task) => Boolean(task?.is_repeatable))
          .filter((task) => !task?.repeat_end_date || task.repeat_end_date >= minTaskDate)
          .sort((a, b) => {
            const aDate = new Date(a?.repeat_end_date || "9999-12-31").getTime();
            const bDate = new Date(b?.repeat_end_date || "9999-12-31").getTime();
            return aDate - bDate;
          });
        setActiveRepeatableTasks(activeRepeatables);
      } catch (refreshError) {
        console.error("Failed to refresh repeatable tasks:", refreshError?.response?.data || refreshError);
      }
      navigate("/employeedashboard");
    } catch (error) {
      console.error("Failed to create repeatable task:", error?.response?.data || error);
      alert(`Failed to create repeatable task: ${JSON.stringify(error?.response?.data || error?.message)}`);
    }
  };

  const displayName = currentUser?.full_name || currentUser?.username || "Employee";

  return (
    <div className="h-screen w-screen bg-slate-50 relative flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-4xl mx-auto mt-5 px-4 md:px-6">
          <div className="bg-slate-900 rounded-2xl px-5 md:px-6 py-4 flex items-center justify-between text-white shadow-xl">
            <button
              type="button"
              onClick={() => navigate("/employeedashboard")}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-xs font-semibold">Back</span>
            </button>
            <h1 className="text-sm md:text-lg font-extrabold text-[#F58A4B] text-center">{displayName} - Repeatable Task</h1>
            <div className="w-16" />
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm mt-6 overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <CalendarDays size={16} className="text-[#F58A4B]" /> Configure Repeat Task
              </h2>
              <p className="text-xs text-slate-500 mt-2">
                Add one row per repeat rule. Daily and Weekly require days, Monthly requires weeks and days.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Start Date</label>
                  <input
                    required
                    type="date"
                    value={formData.startDate}
                    min={minTaskDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 ring-emerald-400 transition-all font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 md:px-5 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">Repeat Rules Table</p>
                  <button
                    type="button"
                    onClick={addRepeatRow}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider px-3 py-2 hover:bg-black transition-colors"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-225 text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">#</th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Task</th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Client</th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Project</th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Frequency</th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Weeks</th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Days</th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">End Date</th>
                        <th className="px-3 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repeatRows.map((row, index) => (
                        <tr key={row.id} className="border-t border-slate-100 align-top">
                          <td className="px-3 py-3 text-xs font-black text-slate-600">{index + 1}</td>
                          <td className="px-3 py-3">
                            <input
                              type="text"
                              value={row.task}
                              onChange={(e) => updateRepeatRow(row.id, { task: e.target.value })}
                              placeholder="Enter task name"
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-emerald-300"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={row.client}
                              onChange={(e) => {
                                if (e.target.value === "Internal") {
                                  updateRepeatRow(row.id, {
                                    client: "",
                                    project: "",
                                    isInternalRow: true,
                                  });
                                } else {
                                  updateRepeatRow(row.id, {
                                    client: e.target.value,
                                    project: "",
                                    isInternalRow: false,
                                  });
                                }
                              }}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-emerald-300"
                            >
                              <option value="">Select Client</option>
                              <option value="Internal">Internal</option>
                              {Object.keys(clientProjectMap).map((clientName) => (
                                <option key={clientName} value={clientName}>{clientName}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={row.project}
                              onChange={(e) => updateRepeatRow(row.id, { project: e.target.value })}
                              disabled={row.isInternalRow || !row.client}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">{row.isInternalRow ? "N/A" : "Select Project"}</option>
                              {!row.isInternalRow && row.client && clientProjectMap[row.client]?.map((project) => (
                                <option key={project.id} value={project.name}>{project.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={row.repeatFrequency}
                              onChange={(e) => updateRepeatRow(row.id, {
                                repeatFrequency: e.target.value,
                                repeatDays: [],
                                repeatWeeks: [],
                              })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-emerald-300"
                            >
                              <option value="">Select</option>
                              <option value="Daily">Daily</option>
                              <option value="Weekly">Weekly</option>
                              <option value="Monthly">Monthly</option>
                            </select>
                          </td>
                          <td className="px-3 py-3 relative">
                            {row.repeatFrequency === "Monthly" ? (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => toggleDropdown(row.id, "weeks")}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-emerald-300 hover:bg-slate-50 text-left flex justify-between items-center"
                                >
                                  <span>{row.repeatWeeks.length > 0 ? `${row.repeatWeeks.length} selected` : "Select weeks"}</span>
                                  <span className="text-slate-400">▼</span>
                                </button>
                                {openDropdowns[`${row.id}-weeks`] && (
                                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-2">
                                    {MONTH_WEEKS.map((week) => (
                                      <label key={week} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={row.repeatWeeks.includes(week)}
                                          onChange={() => toggleRepeatRowListValue(row.id, "repeatWeeks", week)}
                                          className="w-4 h-4 accent-emerald-500"
                                        />
                                        <span className="text-xs font-bold text-slate-700">{week}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Not required</span>
                            )}
                          </td>
                          <td className="px-3 py-3 relative">
                            {(row.repeatFrequency === "Daily" || row.repeatFrequency === "Weekly" || row.repeatFrequency === "Monthly") ? (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => toggleDropdown(row.id, "days")}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-emerald-300 hover:bg-slate-50 text-left flex justify-between items-center"
                                >
                                  <span>{row.repeatDays.length > 0 ? `${row.repeatDays.length} selected` : "Select days"}</span>
                                  <span className="text-slate-400">▼</span>
                                </button>
                                {openDropdowns[`${row.id}-days`] && (
                                  <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-10 p-2 max-h-48 overflow-y-auto">
                                    {WEEK_DAYS.map((day) => (
                                      <label key={day} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={row.repeatDays.includes(day)}
                                          onChange={() => toggleRepeatRowListValue(row.id, "repeatDays", day)}
                                          className="w-4 h-4 accent-emerald-500"
                                        />
                                        <span className="text-xs font-bold text-slate-700">{day}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Select frequency first</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="date"
                              value={row.repeatEndDate}
                              min={minTaskDate}
                              onChange={(e) => updateRepeatRow(row.id, { repeatEndDate: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-emerald-300"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() => removeRepeatRow(row.id)}
                              disabled={repeatRows.length === 1}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-3xl text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95 flex justify-center gap-2 items-center"
                  disabled={loading}
                >
                  <Plus size={18} /> Create Repeatable Task
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm mt-6 overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <CalendarDays size={16} className="text-[#F58A4B]" /> Active Repeatable Tasks
              </h2>
              <p className="text-xs text-slate-500 mt-2">
                Showing active repeat schedules with frequency, week/month timing, and repeat end date.
              </p>
            </div>

            <div className="p-6 md:p-8">
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-180 text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Task</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Frequency</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">In Week</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">In Month</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500">End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRepeatableTasks.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-sm font-semibold text-slate-500 text-center">
                            No active repeatable tasks found.
                          </td>
                        </tr>
                      ) : (
                        activeRepeatableTasks.map((task) => (
                          <tr key={task.id} className="border-t border-slate-100">
                            <td className="px-4 py-3 text-sm font-bold text-slate-800">{task.title || "-"}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{task.repeat_frequency || "-"}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                              {task.repeat_frequency === "Monthly" || task.repeat_frequency === "Weekly" || task.repeat_frequency === "Daily"
                                ? formatRepeatValues(task.repeat_day)
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                              {task.repeat_frequency === "Monthly" ? formatRepeatValues(task.repeat_week) : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{task.repeat_end_date || "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RepeatableTaskPage;
