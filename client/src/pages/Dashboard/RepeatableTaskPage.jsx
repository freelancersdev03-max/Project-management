import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus, Trash2, Check, ChevronDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import api from "../../api";
import { PageHeader } from "../../components/kayaara/Band";

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
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
  const [activePopup, setActivePopup] = useState(null);
  const [activeRepeatableTasks, setActiveRepeatableTasks] = useState([]);

  const toggleDropdown = (rowId, field) => {
    if (activePopup?.rowId === rowId && activePopup?.type === field) {
      setActivePopup(null);
    } else {
      setActivePopup({ rowId, type: field });
    }
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

      if (row.repeatFrequency === "Weekly" && row.repeatDays.length === 0) {
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
          repeat_day: row.repeatFrequency === "Daily"
            ? WEEK_DAYS.join(",")
            : (row.repeatFrequency === "Weekly" || row.repeatFrequency === "Monthly")
              ? row.repeatDays.join(",") : null,
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
    <div className="h-screen w-screen relative flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(rgba(0,134,255,0.10) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
              maskImage: 'linear-gradient(to bottom, black, transparent)',
              WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
            }}
          />
          <PageHeader
            title={displayName}
            accent="Repeatable Task"
            subtitle="Configure recurring task rules and review active schedules"
            backTo="/employeedashboard"
            live
          />
        </div>

        <main className="flex-1 overflow-y-auto k-scroll">
          <div className="max-w-5xl mx-auto w-full k-band-pad">

            <motion.section
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="k-card overflow-hidden"
            >
              <div className="px-6 md:px-8 py-5 border-b" style={{ borderColor: 'var(--k-grey-200)' }}>
                <h2 className="k-section-title">
                  <CalendarDays size={16} style={{ color: 'var(--k-blue)' }} /> Configure repeat task
                </h2>
                <p className="text-xs mt-2" style={{ color: 'var(--k-grey-500)' }}>
                  Add one row per repeat rule. Daily and Weekly require days, Monthly requires weeks and days.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                  <div>
                    <label className="k-label">Start date</label>
                    <input
                      required
                      type="date"
                      value={formData.startDate}
                      min={minTaskDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="k-input"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--k-grey-200)' }}>
                  <div className="px-4 md:px-5 py-3 flex items-center justify-between" style={{ background: 'var(--k-band-grey)', borderBottom: '1px solid var(--k-grey-200)' }}>
                    <p className="k-eyebrow">Repeat rules table</p>
                    <button
                      type="button"
                      onClick={addRepeatRow}
                      className="k-btn-primary !py-2 !px-3 flex items-center gap-2 text-xs"
                    >
                      <Plus size={14} /> Add row
                    </button>
                  </div>

                  <div className="overflow-x-auto k-scroll">
                    <table className="k-table min-w-225">
                      <thead>
                        <tr>
                          {['#', 'Task', 'Client', 'Project', 'Frequency', 'Weeks', 'Days', 'End date', 'Action'].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {repeatRows.map((row, index) => (
                          <motion.tr
                            key={row.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.4 }}
                            className="align-top"
                          >
                            <td className="text-xs font-semibold" style={{ color: 'var(--k-grey-700)' }}>{index + 1}</td>
                            <td>
                              <input
                                type="text"
                                value={row.task}
                                onChange={(e) => updateRepeatRow(row.id, { task: e.target.value })}
                                placeholder="Enter task name"
                                className="k-input !text-xs !py-2"
                              />
                            </td>
                            <td>
                              <select
                                value={row.client}
                                onChange={(e) => {
                                  if (e.target.value === "Internal") {
                                    updateRepeatRow(row.id, {
                                      client: "Internal",
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
                                className="k-select !text-xs !py-2"
                              >
                                <option value="">Select client</option>
                                <option value="Internal">Internal</option>
                                {Object.keys(clientProjectMap).map((clientName) => (
                                  <option key={clientName} value={clientName}>{clientName}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                value={row.project}
                                onChange={(e) => updateRepeatRow(row.id, { project: e.target.value })}
                                disabled={row.isInternalRow || !row.client}
                                className="k-select !text-xs !py-2"
                              >
                                <option value="">{row.isInternalRow ? "N/A" : "Select project"}</option>
                                {!row.isInternalRow && row.client && clientProjectMap[row.client]?.map((project) => (
                                  <option key={project.id} value={project.name}>{project.name}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                value={row.repeatFrequency}
                                onChange={(e) => updateRepeatRow(row.id, {
                                  repeatFrequency: e.target.value,
                                  repeatDays: [],
                                  repeatWeeks: [],
                                })}
                                className="k-select !text-xs !py-2"
                              >
                                <option value="">Select</option>
                                <option value="Daily">Daily</option>
                                <option value="Weekly">Weekly</option>
                                <option value="Monthly">Monthly</option>
                              </select>
                            </td>
                            <td>
                              {row.repeatFrequency === "Monthly" ? (
                                <button
                                  type="button"
                                  onClick={() => toggleDropdown(row.id, "weeks")}
                                  className="k-select !text-xs !py-2 flex justify-between items-center gap-2"
                                >
                                  <span>{row.repeatWeeks.length > 0 ? `${row.repeatWeeks.length} selected` : "Select weeks"}</span>
                                  <ChevronDown size={13} style={{ color: 'var(--k-grey-500)' }} />
                                </button>
                              ) : (
                                <span className="text-xs" style={{ color: 'var(--k-grey-500)' }}>Not required</span>
                              )}
                            </td>
                            <td>
                              {row.repeatFrequency === "Daily" ? (
                                <motion.span
                                  initial={{ scale: 0.6, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ type: "spring", stiffness: 420, damping: 18 }}
                                  className="k-pill mt-1"
                                >
                                  Mon - Sat
                                </motion.span>
                              ) : (row.repeatFrequency === "Weekly" || row.repeatFrequency === "Monthly") ? (
                                <button
                                  type="button"
                                  onClick={() => toggleDropdown(row.id, "days")}
                                  className="k-select !text-xs !py-2 flex justify-between items-center gap-2"
                                >
                                  <span>{row.repeatDays.length > 0 ? `${row.repeatDays.length} selected` : "Select days"}</span>
                                  <ChevronDown size={13} style={{ color: 'var(--k-grey-500)' }} />
                                </button>
                              ) : (
                                <span className="text-xs" style={{ color: 'var(--k-grey-500)' }}>Select frequency first</span>
                              )}
                            </td>
                            <td>
                              <input
                                type="date"
                                value={row.repeatEndDate}
                                min={minTaskDate}
                                onChange={(e) => updateRepeatRow(row.id, { repeatEndDate: e.target.value })}
                                className="k-input !text-xs !py-2"
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeRepeatRow(row.id)}
                                disabled={repeatRows.length === 1}
                                className="k-btn-ghost !py-1.5 !px-2 inline-flex items-center gap-1 text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={12} /> Remove
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="k-btn-primary w-full !py-4 text-sm flex justify-center gap-2 items-center"
                    disabled={loading}
                  >
                    <Plus size={18} /> Create repeatable task
                  </button>
                </div>
              </form>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="k-card-grey overflow-hidden mt-6"
            >
              <div className="px-6 md:px-8 py-5 border-b" style={{ borderColor: 'var(--k-grey-200)' }}>
                <h2 className="k-section-title">
                  <CalendarDays size={16} style={{ color: 'var(--k-blue)' }} /> Active repeatable tasks
                </h2>
                <p className="text-xs mt-2" style={{ color: 'var(--k-grey-500)' }}>
                  Showing active repeat schedules with frequency, week/month timing, and repeat end date.
                </p>
              </div>

              <div className="p-6 md:p-8">
                <div className="k-card !rounded-2xl overflow-hidden hover:!transform-none">
                  <div className="overflow-x-auto k-scroll">
                    <table className="k-table min-w-180">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Frequency</th>
                          <th>In week</th>
                          <th>In month</th>
                          <th>End date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeRepeatableTasks.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-sm font-medium" style={{ color: 'var(--k-grey-500)' }}>
                              No active repeatable tasks found.
                            </td>
                          </tr>
                        ) : (
                          activeRepeatableTasks.map((task, index) => (
                            <motion.tr
                              key={task.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05, duration: 0.4 }}
                            >
                              <td className="text-sm font-semibold" style={{ color: 'var(--k-ink)' }}>{task.title || "-"}</td>
                              <td className="text-sm" style={{ color: 'var(--k-grey-700)' }}>{task.repeat_frequency || "-"}</td>
                              <td className="text-sm" style={{ color: 'var(--k-grey-700)' }}>
                                {task.repeat_frequency === "Monthly" || task.repeat_frequency === "Weekly" || task.repeat_frequency === "Daily"
                                  ? formatRepeatValues(task.repeat_day)
                                  : "-"}
                              </td>
                              <td className="text-sm" style={{ color: 'var(--k-grey-700)' }}>
                                {task.repeat_frequency === "Monthly" ? formatRepeatValues(task.repeat_week) : "-"}
                              </td>
                              <td className="text-sm" style={{ color: 'var(--k-grey-700)' }}>{task.repeat_end_date || "-"}</td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          {/* Popups */}
          <AnimatePresence>
            {activePopup && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="k-backdrop"
                onClick={() => setActivePopup(null)}
              >
                <motion.div
                  initial={{ scale: 0.96, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.96, opacity: 0, y: 10 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="k-modal !max-w-sm"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--k-grey-200)' }}>
                    <h3 className="k-section-title">
                      Select {activePopup.type === "days" ? "days" : "weeks"}
                    </h3>
                    <button
                      onClick={() => setActivePopup(null)}
                      className="k-btn-icon"
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto k-scroll space-y-1" style={{ background: 'var(--k-band-grey)' }}>
                    {(activePopup.type === "days" ? WEEK_DAYS : MONTH_WEEKS).map((item) => {
                      const row = repeatRows.find(r => r.id === activePopup.rowId);
                      if (!row) return null;
                      const isChecked = activePopup.type === "days"
                        ? row.repeatDays.includes(item)
                        : row.repeatWeeks.includes(item);

                      return (
                        <label
                          key={item}
                          className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border"
                          style={{
                            background: isChecked ? 'var(--k-white)' : 'transparent',
                            borderColor: isChecked ? 'var(--k-blue)' : 'transparent'
                          }}
                        >
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center border-2 shrink-0 transition-colors"
                            style={{
                              background: isChecked ? 'var(--k-blue)' : 'var(--k-white)',
                              borderColor: isChecked ? 'var(--k-blue)' : 'var(--k-grey-300)'
                            }}
                          >
                            {isChecked && <Check size={12} color="#ffffff" strokeWidth={3} />}
                          </span>
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={isChecked}
                            onChange={() => toggleRepeatRowListValue(row.id, activePopup.type === "days" ? "repeatDays" : "repeatWeeks", item)}
                          />
                          <span className="text-sm font-medium" style={{ color: isChecked ? 'var(--k-blue)' : 'var(--k-grey-700)' }}>{item}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="px-6 py-4 border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
                    <button
                      onClick={() => setActivePopup(null)}
                      className="k-btn-primary w-full"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default RepeatableTaskPage;
