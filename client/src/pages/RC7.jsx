import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useSidebar } from '../context/SidebarContext';
import { CalendarRange, Loader2, Lock, Pencil, Plus, Trash2, MoreVertical, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import api from '../api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const BASE_LOCATION_OPTIONS = [
  { value: '', label: '-' },
  { value: 'company_visit', label: 'Company Visit' },
  { value: 'office', label: 'Office' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'travel', label: 'Travel' },
];

const AUTOSAVE_DELAY_MS = 900;
const RC7_TOMBSTONE_PREFIX = '__RC7_TOMBSTONE__:';
const RC7_MCTC_LABEL_PREFIX = '__RC7_SYNC__:';

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDate = (date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

const nearestUpcoming = (today, targetDay) => {
  const d = new Date(today);
  const diff = (targetDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
};

const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const startOfLocalDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const shiftLocalDay = (date, offsetDays) => {
  const shifted = startOfLocalDay(date);
  shifted.setDate(shifted.getDate() + offsetDays);
  return shifted;
};

const getWorkingDayWindow = (startDate, totalDays = 6) => {
  const dates = [];
  const cursor = startOfLocalDay(startDate);

  while (dates.length < totalDays) {
    if (cursor.getDay() !== 0) {
      dates.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
};

// Wednesday sheet changes on Wednesday and shows the next Thursday-starting work week.
const getWednesdaySheetDates = (today) => {
  const normalizedToday = startOfLocalDay(today);
  const dayOfWeek = normalizedToday.getDay();

  const thursdayStart = dayOfWeek === 3
    ? shiftLocalDay(normalizedToday, 1)
    : shiftLocalDay(normalizedToday, -((dayOfWeek - 4 + 7) % 7));

  return getWorkingDayWindow(thursdayStart, 6);
};

// Saturday sheet changes on Saturday and shows the next Monday-starting work week.
const getSaturdaySheetDates = (today) => {
  const normalizedToday = startOfLocalDay(today);
  const dayOfWeek = normalizedToday.getDay();

  const mondayStart = dayOfWeek === 6
    ? shiftLocalDay(normalizedToday, 2)
    : shiftLocalDay(normalizedToday, -((dayOfWeek - 1 + 7) % 7));

  return getWorkingDayWindow(mondayStart, 6);
};

const formatRange = (dates) => {
  if (!dates.length) return '';
  const first = dates[0];
  const last = dates[dates.length - 1];
  return `${DAY_NAMES[first.getDay()]} ${formatDate(first)} to ${DAY_NAMES[last.getDay()]} ${formatDate(last)}`;
};

const getDisplayName = (emp) => {
  if (!emp) return 'Consultant';
  const full = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
  return full || emp.username || emp.email || `Employee ${emp.id || ''}`;
};

const getShortform = (emp) => (emp ? emp.shortform || emp.short_form || emp.initials || '' : '');

const getLocationLabel = (value, locationOptions) => {
  const match = locationOptions.find((item) => item.value === value);
  return match ? match.label : '-';
};

const getCellTotalHours = (cell) => {
  const normalized = normalizeCell(cell);
  return (normalized.deliverable_hours || []).reduce((sum, item) => {
    const hours = Number(item);
    return sum + (Number.isFinite(hours) && hours > 0 ? hours : 0);
  }, 0);
};

const splitDeliverableText = (value) =>
  String(value ?? '')
    .split(/\r?\n+/)
    .map((item) => String(item ?? '').replace(/\r/g, ''))
    .filter((item) => item.trim().length > 0);

const normalizeTombstones = (value) => {
  const output = [];
  const seen = new Set();

  const addTombstone = (rawValue) => {
    const trimmed = String(rawValue ?? '').trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    output.push(trimmed);
  };

  if (Array.isArray(value)) {
    value.forEach(addTombstone);
  }

  return { output, addTombstone };
};

const normalizeCell = (cell) => {
  if (typeof cell === 'string') {
    const list = splitDeliverableText(cell);
    const { output: tombstones, addTombstone } = normalizeTombstones([]);
    const deliverables = [];

    list.forEach((item) => {
      if (item.startsWith(RC7_TOMBSTONE_PREFIX)) {
        addTombstone(item.slice(RC7_TOMBSTONE_PREFIX.length));
        return;
      }

      deliverables.push(item);
    });

    return {
      location: '',
      deliverables: deliverables.length ? deliverables : [''],
      tombstones,
      deliverable_hours: new Array(deliverables.length ? deliverables.length : 1).fill(0),
      estimated_hours: 0,
      updatedAt: null,
    };
  }

  if (cell && typeof cell === 'object') {
    const location = String(cell.location || '');
    const { output: tombstones, addTombstone } = normalizeTombstones(cell.tombstones || []);
    const list = Array.isArray(cell.deliverables)
      ? cell.deliverables.flatMap((item) => {
        const raw = String(item ?? '').replace(/\r/g, '');
        const lines = raw.split('\n');
        const nonEmpty = lines.filter((line) => line.trim().length > 0);
        // Keep explicit blank rows from in-memory state so "Add" can render a new empty deliverable.
        return nonEmpty.length ? nonEmpty : [''];
      })
      : splitDeliverableText(cell.deliverable || '');

    const deliverables = [];
    list.forEach((item) => {
      if (item.startsWith(RC7_TOMBSTONE_PREFIX)) {
        addTombstone(item.slice(RC7_TOMBSTONE_PREFIX.length));
        return;
      }

      deliverables.push(item);
    });

    const visibleDeliverables = deliverables.length ? deliverables : [''];

    if (location.toLowerCase() === 'holiday') {
      return {
        location,
        deliverables: [''],
        tombstones,
        deliverable_hours: [0],
        estimated_hours: 0,
        updatedAt: cell.updated_at || null,
      };
    }

    const deliverableHours = Array.isArray(cell.deliverable_hours)
      ? cell.deliverable_hours.map((value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      })
      : [];

    const normalizedHours = visibleDeliverables.length
      ? visibleDeliverables.map((_, index) => deliverableHours[index] || 0)
      : [0];

    const totalEstimated = normalizedHours.reduce((sum, item) => sum + item, 0);

    return {
      location,
      deliverables: visibleDeliverables,
      tombstones,
      deliverable_hours: normalizedHours,
      estimated_hours: Number(cell.estimated_hours || totalEstimated || 0),
      updatedAt: cell.updated_at || null,
    };
  }

  return { location: '', deliverables: [''], tombstones: [], deliverable_hours: [0], estimated_hours: 0, updatedAt: null };
};

const normalizeClientsPayload = (payload, role) => {
  if (role === 'CLIENT') {
    if (Array.isArray(payload)) return payload;
    return payload ? [payload] : [];
  }

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

const buildLocationOptionsFromClients = (clients) => {
  const unique = new Map();

  clients.forEach((client, index) => {
    const clientId = client?.id ?? client?.client_id ?? null;
    const label = client?.company_name || client?.name || client?.client_name || `Client ${index + 1}`;
    const value = clientId !== null ? `client:${clientId}` : `client_name:${label}`;

    if (!unique.has(value)) {
      unique.set(value, { value, label });
    }
  });

  const dynamicOptions = Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label));
  return [...BASE_LOCATION_OPTIONS, ...dynamicOptions];
};

const serializeEmployeePlan = (employeePlan) => {
  const source = employeePlan && typeof employeePlan === 'object' ? employeePlan : {};
  const output = {};

  Object.entries(source).forEach(([dateKey, rawCell]) => {
    const cell = normalizeCell(rawCell);
    const isHoliday = String(cell.location || '').toLowerCase() === 'holiday';
    const deliverables = isHoliday ? [] : cell.deliverables.map((item) => String(item ?? ''));
    const tombstones = Array.isArray(cell.tombstones)
      ? cell.tombstones.map((item) => String(item ?? '').trim()).filter(Boolean)
      : [];
    const joinedDeliverable = deliverables
      .map((item) => item.trim())
      .filter(Boolean)
      .join('\n');

    const hiddenMarkers = tombstones.map((item) => `${RC7_TOMBSTONE_PREFIX}${item}`);
    const mergedDeliverable = [joinedDeliverable, ...hiddenMarkers].filter(Boolean).join('\n');

    output[dateKey] = {
      location: cell.location || '',
      deliverable: mergedDeliverable,
      deliverables,
      tombstones,
      deliverable_hours: (cell.deliverable_hours || []).slice(0, deliverables.length).map((item) => {
        const parsed = Number(item);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      }),
      estimated_hours: (cell.deliverable_hours || []).slice(0, deliverables.length).reduce((sum, item) => {
        const parsed = Number(item);
        return sum + (Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
      }, 0),
    };
  });

  return output;
};

const buildRc7PreviewPayload = ({ type, dates, plan, locationOptions, employeeLabel, submittedAt }) => {
  const days = dates.map((date) => {
    const dateKey = toDateKey(date);
    const cell = normalizeCell(plan?.[dateKey]);
    const office = getLocationLabel(cell.location, locationOptions) || '-';
    const deliverables = (cell.deliverables || []).map((item) => String(item || '').trim()).filter(Boolean);
    const deliverableHours = Array.isArray(cell.deliverable_hours) ? cell.deliverable_hours : [];

    const items = deliverables.map((deliverable, index) => {
      const parsedHours = Number(deliverableHours[index]);
      return {
        deliverable,
        estimatedHours: Number.isFinite(parsedHours) && parsedHours > 0 ? parsedHours : 0,
      };
    });

    const totalHours = items.reduce((sum, item) => sum + Number(item.estimatedHours || 0), 0);

    return {
      dayLabel: DAY_NAMES[date.getDay()],
      dateLabel: formatDate(date),
      office,
      totalHours,
      items,
    };
  });

  return {
    planType: type,
    planLabel: type === 'sat' ? 'Saturday' : 'Wednesday',
    employeeLabel,
    submittedAt: submittedAt || null,
    generatedAt: new Date().toISOString(),
    days,
  };
};

const parseDeliverableString = (str) => {
  const s = String(str || '').trim();

  const match = s.match(/^\[(On-site|Remote)\]\s*(.*)$/i);
  if (match) {
    const mode = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    const rest = match[2].trim();
    const pipeIndex = rest.indexOf('|');
    if (pipeIndex !== -1) {
      return {
        mode,
        title: rest.substring(0, pipeIndex).trim(),
        description: rest.substring(pipeIndex + 1).trim(),
      };
    } else {
      return {
        mode,
        title: rest,
        description: '',
      };
    }
  }

  const pipeIndex = s.indexOf('|');
  if (pipeIndex !== -1) {
    return {
      mode: 'On-site',
      title: s.substring(0, pipeIndex).trim(),
      description: s.substring(pipeIndex + 1).trim(),
    };
  }

  return {
    mode: 'On-site',
    title: s,
    description: '',
  };
};

const serializeDeliverableObject = ({ mode, title, description }) => {
  const m = mode || 'On-site';
  const t = String(title || '').trim();
  const d = String(description || '').trim();

  if (d) {
    return `[${m}] ${t} | ${d}`;
  }
  return `[${m}] ${t}`;
};

const TaskCard = ({
  head,
  idx,
  parsed,
  canEdit,
  employeeId,
  onDeliverableChange,
  onRemoveDeliverable,
  onStepHoursChange,
}) => {
  const [localTitle, setLocalTitle] = useState(parsed.title);
  const [localDesc, setLocalDesc] = useState(parsed.description);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setLocalTitle(parsed.title);
  }, [parsed.title]);

  useEffect(() => {
    setLocalDesc(parsed.description);
  }, [parsed.description]);

  const handleSync = (updatedTitle, updatedDesc) => {
    if (!canEdit) return;
    const serialized = serializeDeliverableObject({
      mode: parsed.mode,
      title: updatedTitle,
      description: updatedDesc,
    });
    onDeliverableChange(employeeId, head.key, idx, serialized);
  };

  const handleToggleMode = () => {
    if (!canEdit) return;
    const newMode = parsed.mode === 'Remote' ? 'On-site' : 'Remote';
    const serialized = serializeDeliverableObject({
      mode: newMode,
      title: localTitle,
      description: localDesc,
    });
    onDeliverableChange(employeeId, head.key, idx, serialized);
  };

  const handleHoursChange = (diff) => {
    if (!canEdit) return;
    const current = Number(parsed.hours || 0);
    const next = Math.max(0, current + diff);
    onStepHoursChange(employeeId, head.key, idx, String(next));
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const isRemote = parsed.mode === 'Remote';
  const badgeColorClass = isRemote
    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
    : (idx % 2 === 0
      ? 'bg-orange-50 text-orange-700 border-orange-100'
      : 'bg-indigo-50 text-indigo-700 border-indigo-100');

  return (
    <div className="relative flex flex-col justify-between p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all group min-h-[90px]">
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <button
            type="button"
            disabled={!canEdit}
            onClick={handleToggleMode}
            className={`px-1.5 py-0.2 rounded-full border text-[8px] font-extrabold uppercase tracking-wider transition-all select-none cursor-pointer hover:opacity-80 ${badgeColorClass}`}
          >
            {parsed.mode || 'On-site'}
          </button>

          {canEdit && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-all flex items-center justify-center"
              >
                <MoreVertical size={11} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-0.5 w-28 bg-white border border-slate-200 rounded-md shadow-lg py-0.5 z-30 animate-in fade-in slide-in-from-top-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleMode();
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 text-[10px] text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Set to {isRemote ? 'On-site' : 'Remote'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveDeliverable(employeeId, head.key, idx);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-2 py-1 text-[10px] text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete Task
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mb-0">
          {canEdit ? (
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={() => handleSync(localTitle, localDesc)}
              placeholder="Task Title..."
              className="w-full bg-transparent font-bold text-slate-800 text-[11px] border-0 border-transparent p-0 focus:outline-none focus:ring-0 focus:bg-slate-50 rounded"
            />
          ) : (
            <div className="font-bold text-slate-800 text-[11px] truncate px-0" title={parsed.title}>
              {parsed.title || <span className="text-slate-300 italic font-normal">Untitled Task</span>}
            </div>
          )}
        </div>

        <div className="mb-1">
          {canEdit ? (
            <textarea
              value={localDesc}
              onChange={(e) => setLocalDesc(e.target.value)}
              onBlur={() => handleSync(localTitle, localDesc)}
              placeholder="Describe..."
              rows={1}
              className="w-full bg-transparent text-[9px] text-slate-500 border-0 border-transparent p-0 resize-none focus:outline-none focus:ring-0 focus:bg-slate-50 rounded leading-normal"
            />
          ) : (
            <div className="text-[9px] text-slate-500 line-clamp-1 leading-normal px-0" title={parsed.description}>
              {parsed.description || <span className="text-slate-300 italic">No description</span>}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-auto">
        <div className="flex items-center gap-1 text-slate-500">
          <Clock size={9} className="text-slate-400" />
          <span className="text-[9px] font-bold text-slate-700">{Number(parsed.hours || 0).toFixed(1)}h</span>
        </div>

        {canEdit && (
          <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => handleHoursChange(-0.5)}
              className="w-4 h-4 flex items-center justify-center text-[8px] font-bold text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-all select-none animate-none"
            >
              -
            </button>
            <span className="w-5.5 text-center text-[8px] font-extrabold text-slate-700 font-mono select-none">
              {Number(parsed.hours || 0).toFixed(1)}
            </span>
            <button
              type="button"
              onClick={() => handleHoursChange(0.5)}
              className="w-4 h-4 flex items-center justify-center text-[8px] font-bold text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-all select-none animate-none"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PlanSheet = ({
  title,
  fillDayLabel,
  dates,
  planData,
  locationOptions,
  employee,
  employeeId,
  canEdit,
  onLocationChange,
  onDeliverableChange,
  onStepHoursChange,
  onAddDeliverable,
  onRemoveDeliverable,
  saving,
  saved,
  showAutoSaveStatus,
  onSubmit,
  onPreview,
  submittedAt,
}) => {
  const [collapsedDays, setCollapsedDays] = useState({});
  const { isOpen } = useSidebar();

  const toggleDayCollapse = (dateKey) => {
    setCollapsedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const headers = dates.map((date) => {
    const key = toDateKey(date);
    const totalHours = getCellTotalHours(planData?.[employeeId]?.[key]);

    return {
      key,
      dayLabel: DAY_NAMES[date.getDay()],
      dateLabel: formatDate(date),
      totalHours,
      isOverbooked: totalHours > 8,
    };
  });

  if (!employeeId) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">Unable to resolve your profile. Please re-login and try again.</p>
      </section>
    );
  }

  const totalHours = headers.reduce((sum, h) => sum + h.totalHours, 0);
  const capacityLeft = Math.max(0, 48 - totalHours);
  const completionPercentage = Math.round(Math.min(100, (totalHours / 48) * 100));

  return (
    <section className="space-y-3 relative">
      {/* Weekly Progress Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 w-full space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-slate-455 select-none">
            <span className="text-slate-400">WEEKLY PROGRESS</span>
            <span className="text-blue-600 font-extrabold">{completionPercentage}% Complete</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-8 shrink-0 w-full md:w-auto justify-between md:justify-start border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-8">
          <div className="space-y-1">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none">TOTAL HOURS</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800 leading-none">{totalHours.toFixed(1)}</span>
              <span className="text-xs font-bold text-slate-500">hrs</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none">CAPACITY</div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800 leading-none">{capacityLeft.toFixed(1)}</span>
              <span className="text-xs font-bold text-slate-500">hrs left</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2.5 mt-3">
        {headers.map((head) => {
          const cell = normalizeCell(planData?.[employeeId]?.[head.key]);
          const isHoliday = String(cell.location || '').toLowerCase() === 'holiday';
          const isCollapsed = collapsedDays[head.key];
          const parsedDeliverables = cell.deliverables.map((deliv, idx) => {
            const parsed = parseDeliverableString(deliv);
            return {
              ...parsed,
              hours: cell.deliverable_hours?.[idx] || 0,
            };
          });

          return (
            <div
              key={head.key}
              className={`bg-white border rounded-xl shadow-sm overflow-hidden p-2.5 sm:px-3.5 sm:py-2.5 space-y-2.5 transition-all duration-200 ${head.isOverbooked ? 'border-red-300 bg-red-50/10' : 'border-slate-200'
                }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-sm font-extrabold text-slate-800">{head.dayLabel}</h3>
                  <span className="text-[10px] text-slate-400 font-medium">{head.dateLabel}</span>
                </div>

                <div className="flex items-center gap-3 flex-wrap sm:ml-auto text-[10px]">
                  <span className={`font-bold px-1.5 py-0.5 rounded ${head.isOverbooked ? 'text-red-700 bg-red-50 border border-red-100' : 'text-slate-500 bg-slate-100/80'
                    }`}>
                    Total: {head.totalHours.toFixed(1)}h
                  </span>

                  {canEdit ? (
                    <select
                      value={cell.location}
                      onChange={(e) => onLocationChange(employeeId, head.key, e.target.value)}
                      className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 outline-none focus:border-[#0086FF] focus:ring-1 focus:ring-[#0086FF]"
                    >
                      {locationOptions.map((opt) => (
                        <option key={opt.value || 'none'} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-slate-600 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                      {getLocationLabel(cell.location, locationOptions)}
                    </span>
                  )}

                  {canEdit && !isHoliday && (
                    <button
                      type="button"
                      onClick={() => onAddDeliverable(employeeId, head.key)}
                      className="flex items-center gap-1 font-bold text-[#0086FF] hover:text-blue-700 transition-colors"
                    >
                      <Plus size={10} /> Add Task
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleDayCollapse(head.key)}
                    className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded transition-colors flex items-center justify-center"
                  >
                    {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className="pt-2 border-t border-slate-100">
                  {isHoliday ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-[10px] font-semibold text-amber-800 flex items-center gap-2">
                      🌴 Holiday selected. Tasks are disabled for this day.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {parsedDeliverables.map((parsed, idx) => (
                        <TaskCard
                          key={`${head.key}-task-${idx}`}
                          head={head}
                          idx={idx}
                          parsed={parsed}
                          canEdit={canEdit}
                          employeeId={employeeId}
                          onDeliverableChange={onDeliverableChange}
                          onRemoveDeliverable={onRemoveDeliverable}
                          onStepHoursChange={onStepHoursChange}
                        />
                      ))}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onAddDeliverable(employeeId, head.key)}
                          className="flex flex-col items-center justify-center p-2.5 border border-dashed border-slate-300 rounded-lg min-h-[90px] bg-slate-50/30 hover:bg-slate-50 hover:border-blue-300 transition-all text-blue-600 gap-1 cursor-pointer group"
                        >
                          <Plus size={16} className="group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">Add Task</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showAutoSaveStatus && (
        <div className={`fixed bottom-0 right-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] transition-all duration-300 left-0 ${isOpen ? 'md:left-[260px]' : 'md:left-[80px]'}`}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100 shadow-sm text-[10px] font-bold">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              {saving ? 'Autosaving' : saved ? 'Auto-saved' : 'Auto-save enabled'}
            </div>
            {submittedAt && (
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                LAST SYNC: {formatDateTime(submittedAt)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onPreview && (
              <button
                type="button"
                onClick={onPreview}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
              >
                Preview Plan
              </button>
            )}
            {onSubmit && (
              <button
                type="button"
                onClick={onSubmit}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-200"
              >
                Submit Plan
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

const RC7 = () => {
  const location = useLocation();
  const currentRole = (localStorage.getItem('role') || '').toUpperCase();
  const [today, setToday] = useState(() => new Date());
  const isSatCycleActive = true; // Always editable
  const isWedCycleActive = true; // Always editable

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const timeoutId = window.setTimeout(() => {
      setToday(new Date());
    }, Math.max(0, nextMidnight.getTime() - now.getTime()));

    return () => window.clearTimeout(timeoutId);
  }, [today]);

  const memberViewContext = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const memberParam = Number(params.get('member'));
    const memberName = (params.get('memberName') || '').trim();
    const hasValidMember = Number.isFinite(memberParam) && memberParam > 0;
    const canUseMemberView = ['SGM', 'HQEPL', 'MLS', 'SENIOR'].includes(currentRole);

    if (!canUseMemberView || !hasValidMember) {
      return {
        targetUserId: '',
        targetUserLabel: '',
        isMemberView: false,
      };
    }

    return {
      targetUserId: String(memberParam),
      targetUserLabel: memberName || `Member ${memberParam}`,
      isMemberView: true,
    };
  }, [currentRole, location.search]);

  const { targetUserId, targetUserLabel, isMemberView } = memberViewContext;

  const satDates = useMemo(() => getSaturdaySheetDates(today), [today]);
  const wedDates = useMemo(() => getWednesdaySheetDates(today), [today]);
  const sharedDateKeys = useMemo(() => {
    const wedKeySet = new Set(wedDates.map(toDateKey));
    return satDates.map(toDateKey).filter((dateKey) => wedKeySet.has(dateKey));
  }, [satDates, wedDates]);
  const sharedDateKeySet = useMemo(() => new Set(sharedDateKeys), [sharedDateKeys]);

  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [satPlan, setSatPlan] = useState({});
  const [wedPlan, setWedPlan] = useState({});
  const [locationOptions, setLocationOptions] = useState(BASE_LOCATION_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [savingSat, setSavingSat] = useState(false);
  const [savingWed, setSavingWed] = useState(false);
  const [satSaved, setSatSaved] = useState(false);
  const [wedSaved, setWedSaved] = useState(false);
  const [satDirty, setSatDirty] = useState(false);
  const [wedDirty, setWedDirty] = useState(false);
  const [satSubmitted, setSatSubmitted] = useState(false);
  const [wedSubmitted, setWedSubmitted] = useState(false);
  const [satSubmittedAt, setSatSubmittedAt] = useState(null);
  const [wedSubmittedAt, setWedSubmittedAt] = useState(null);
  const [mctcEntries, setMctcEntries] = useState([]);
  const [currentSatPlan, setCurrentSatPlan] = useState({});
  const [currentWedPlan, setCurrentWedPlan] = useState({});
  const [satPrefillDone, setSatPrefillDone] = useState(false);
  const [wedPrefillDone, setWedPrefillDone] = useState(false);

  const effectiveEmployeeId = useMemo(() => {
    if (selectedUserId) return String(selectedUserId);
    if (currentUserId) return String(currentUserId);
    if (selectedUser?.id) return String(selectedUser.id);
    if (currentUser?.id) return String(currentUser.id);
    return '';
  }, [currentUser, currentUserId, selectedUser, selectedUserId]);

  const satPlanRef = useRef(satPlan);
  const wedPlanRef = useRef(wedPlan);
  const satDirtyRef = useRef(satDirty);
  const wedDirtyRef = useRef(wedDirty);
  const satSubmittedRef = useRef(satSubmitted);
  const wedSubmittedRef = useRef(wedSubmitted);
  const effectiveEmployeeIdRef = useRef('');
  const isMemberViewRef = useRef(isMemberView);
  const satDatesRef = useRef(satDates);
  const wedDatesRef = useRef(wedDates);

  useEffect(() => {
    satPlanRef.current = satPlan;
  }, [satPlan]);

  useEffect(() => {
    wedPlanRef.current = wedPlan;
  }, [wedPlan]);

  useEffect(() => {
    satDirtyRef.current = satDirty;
  }, [satDirty]);

  useEffect(() => {
    wedDirtyRef.current = wedDirty;
  }, [wedDirty]);

  useEffect(() => {
    satSubmittedRef.current = satSubmitted;
  }, [satSubmitted]);

  useEffect(() => {
    wedSubmittedRef.current = wedSubmitted;
  }, [wedSubmitted]);

  useEffect(() => {
    effectiveEmployeeIdRef.current = effectiveEmployeeId;
  }, [effectiveEmployeeId]);

  useEffect(() => {
    isMemberViewRef.current = isMemberView;
  }, [isMemberView]);

  useEffect(() => {
    satDatesRef.current = satDates;
  }, [satDates]);

  useEffect(() => {
    wedDatesRef.current = wedDates;
  }, [wedDates]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setSatPrefillDone(false);
      setWedPrefillDone(false);
      try {
        let resolvedUser = null;
        let resolvedUserId = '';

        try {
          const meRes = await api.get('/me/');
          resolvedUser = meRes.data || null;
          resolvedUserId = String(meRes.data?.id || '');
        } catch {
          try {
            const accountMeRes = await api.get('/accounts/me/');
            resolvedUser = accountMeRes.data || null;
            resolvedUserId = String(accountMeRes.data?.id || '');
          } catch {
            const storedId = String(localStorage.getItem('user_id') || '');
            const storedUsername = String(localStorage.getItem('username') || '');
            if (storedId) {
              resolvedUser = { id: storedId, username: storedUsername };
              resolvedUserId = storedId;
            }
          }
        }

        setCurrentUser(resolvedUser);
        setCurrentUserId(resolvedUserId);

        let resolvedSelectedUser = resolvedUser;
        let resolvedSelectedUserId = resolvedUserId;

        if (isMemberView && targetUserId) {
          try {
            const memberRes = await api.get(`admin/users/${targetUserId}/`);
            resolvedSelectedUser = memberRes.data || null;
            resolvedSelectedUserId = String(memberRes.data?.id || targetUserId);
          } catch {
            resolvedSelectedUser = {
              id: targetUserId,
              username: targetUserLabel || `Member ${targetUserId}`,
              first_name: targetUserLabel || '',
            };
            resolvedSelectedUserId = String(targetUserId);
          }
        }

        setSelectedUser(resolvedSelectedUser);
        setSelectedUserId(resolvedSelectedUserId);

        try {
          const role = currentRole;
          let clientsEndpoint = 'clients/list/';

          if (role === 'SGM') clientsEndpoint = 'sgm/clients/';
          else if (role === 'EMPLOYEE') clientsEndpoint = 'employees/clients/';
          else if (role === 'CLIENT') clientsEndpoint = 'clients/me/';

          const clientsRes = await api.get(clientsEndpoint);
          const clients = normalizeClientsPayload(clientsRes.data, role);
          setLocationOptions(buildLocationOptionsFromClients(clients));
        } catch {
          setLocationOptions(BASE_LOCATION_OPTIONS);
        }

        try {
          const role = currentRole;
          const endpoint = role === 'SGM' ? 'sgm/employees/' : 'employees/list/';
          const res = await api.get(endpoint);
          setEmployees(Array.isArray(res.data) ? res.data : res.data?.results || []);
        } catch {
          setEmployees([]);
        }

        const satKeys = satDates.map(toDateKey);
        const wedKeys = wedDates.map(toDateKey);

        try {
          const satParams = {
            type: 'sat',
            start: satKeys[0],
            end: satKeys[satKeys.length - 1],
          };

          if (isMemberView && resolvedSelectedUserId) {
            satParams.user = resolvedSelectedUserId;
          }

          const satRes = await api.get('rc7/planning/', {
            params: satParams,
          });
          setSatPlan(satRes.data?.plans || satRes.data || {});
          setSatSubmitted(satRes.data?.is_submitted || false);
          setSatSubmittedAt(satRes.data?.submitted_at || null);
        } catch {
          setSatPlan({});
          setSatSubmitted(false);
          setSatSubmittedAt(null);
        }

        // Fetch overlapping Saturday plan used to prefill Thu-Sat in Wednesday sheet.
        try {
          const currentSatParams = {
            type: 'sat',
            start: wedKeys[0],
            end: wedKeys[wedKeys.length - 1],
          };
          if (isMemberView && resolvedSelectedUserId) {
            currentSatParams.user = resolvedSelectedUserId;
          }
          const currentSatRes = await api.get('rc7/planning/', { params: currentSatParams });
          setCurrentSatPlan(currentSatRes.data?.plans || currentSatRes.data || {});
        } catch {
          setCurrentSatPlan({});
        }

        // Fetch overlapping Wednesday plan used to prefill Wednesday in Saturday sheet.
        try {
          const currentWedParams = {
            type: 'wed',
            start: satKeys[0],
            end: satKeys[satKeys.length - 1],
          };
          if (isMemberView && resolvedSelectedUserId) {
            currentWedParams.user = resolvedSelectedUserId;
          }
          const currentWedRes = await api.get('rc7/planning/', { params: currentWedParams });
          setCurrentWedPlan(currentWedRes.data?.plans || currentWedRes.data || {});
        } catch {
          setCurrentWedPlan({});
        }

        try {
          const wedParams = {
            type: 'wed',
            start: wedKeys[0],
            end: wedKeys[wedKeys.length - 1],
          };

          if (isMemberView && resolvedSelectedUserId) {
            wedParams.user = resolvedSelectedUserId;
          }

          const wedRes = await api.get('rc7/planning/', {
            params: wedParams,
          });
          setWedPlan(wedRes.data?.plans || wedRes.data || {});
          setWedSubmitted(wedRes.data?.is_submitted || false);
          setWedSubmittedAt(wedRes.data?.submitted_at || null);
        } catch {
          setWedPlan({});
          setWedSubmitted(false);
          setWedSubmittedAt(null);
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [currentRole, isMemberView, satDates, targetUserId, targetUserLabel, wedDates]);

  const ownEmployee = useMemo(() => {
    if (!effectiveEmployeeId) return currentUser;
    return employees.find((emp) => String(emp.id) === effectiveEmployeeId) || selectedUser || currentUser;
  }, [currentUser, effectiveEmployeeId, employees, selectedUser]);

  const hasCellData = (cell) => {
    const normalized = normalizeCell(cell);
    return Boolean(String(normalized.location || '').trim())
      || normalized.deliverables.some((item) => String(item || '').trim())
      || (normalized.tombstones || []).length > 0;
  };

  const clonePrefillCell = (cell) => {
    const normalized = normalizeCell(cell);
    return {
      location: normalized.location || '',
      deliverables: [...normalized.deliverables],
      tombstones: [...(normalized.tombstones || [])],
      deliverable_hours: [...normalized.deliverable_hours],
    };
  };

  const fetchCombinedPrefillEntries = async (startDate, endDate, employeeId) => {
    const [mctcRes, tasksRes] = await Promise.all([
      api.get('mctc/entries/', {
        params: {
          user: employeeId,
          start_date: startDate,
          end_date: endDate,
        },
      }),
      api.get('tasks/', {
        params: {
          assigned_to: employeeId,
        },
      }),
    ]);

    const merged = [];
    const seen = new Set();

    const addEntry = (entryDate, label, updatedAt, createdAt, source) => {
      const dateKey = String(entryDate || '').slice(0, 10);
      const normalizedLabel = String(label || '').trim();
      if (!dateKey || !normalizedLabel) return;
      if (dateKey < startDate || dateKey > endDate) return;

      // Ignore RC7-synced markers from MCTC to prevent RC7->MCTC->RC7 loops.
      if (normalizedLabel.startsWith(RC7_MCTC_LABEL_PREFIX)) return;

      const dedupeKey = `${dateKey}::${normalizedLabel.toLowerCase()}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      merged.push({
        entry_date: dateKey,
        label: normalizedLabel,
        updated_at: updatedAt || null,
        created_at: createdAt || null,
        source: source || 'mctc',
      });
    };

    const mctcEntries = Array.isArray(mctcRes?.data) ? mctcRes.data : [];
    mctcEntries.forEach((entry) => {
      addEntry(entry?.entry_date, entry?.label, entry?.updated_at, entry?.created_at, 'mctc');
    });

    const taskRows = Array.isArray(tasksRes?.data) ? tasksRes.data : [];
    taskRows.forEach((task) => {
      addEntry(task?.target_date, task?.title, task?.updated_at, task?.created_at, 'task');
    });

    return merged;
  };

  const syncWednesdayPreFill = (currentWedPlanData, overlapSatPlan, overlapSatHistoryPlan, entries) => {
    if (!effectiveEmployeeId) {
      return { newPlan: currentWedPlanData, changed: false };
    }

    const wedKeys = wedDates.map(toDateKey);
    const newWedPlan = { ...currentWedPlanData };
    const empPlan = { ...(newWedPlan[effectiveEmployeeId] || {}) };
    let changed = false;

    wedKeys.forEach((dateKey) => {
      const dayNum = new Date(dateKey).getDay();
      const currentCell = normalizeCell(empPlan[dateKey]);

      // Thu-Sat in Wednesday sheet should start from Saturday sheet overlap.
      if (dayNum >= 4 && dayNum <= 6) {
        const satLiveCell = normalizeCell(overlapSatPlan?.[effectiveEmployeeId]?.[dateKey]);
        const satHistoryCell = normalizeCell(overlapSatHistoryPlan?.[effectiveEmployeeId]?.[dateKey]);
        const satCell = hasCellData(satLiveCell) ? satLiveCell : satHistoryCell;
        if (hasCellData(satCell) && !hasCellData(currentCell)) {
          empPlan[dateKey] = clonePrefillCell(satCell);
          changed = true;
          return;
        }
      }

      // Wednesday sheet should also sync MCTC items for all visible working days.
      if (dayNum >= 1 && dayNum <= 6) {
        if (String(currentCell.location || '').toLowerCase() === 'holiday') {
          return;
        }

        const dayEntries = entries.filter((entry) => entry.entry_date === dateKey);

        const existingGroup = currentCell.deliverables.map(item => item.trim()).filter(Boolean);
        const tombstoneSet = new Set((currentCell.tombstones || []).map((item) => String(item || '').trim()).filter(Boolean));
        const cellUpdatedAt = currentCell.updatedAt ? new Date(currentCell.updatedAt).getTime() : 0;

        // If the user previously cleared this RC7 date and it was saved,
        // keep it suppressed from future MCTC auto-prefill.
        const isUserClearedCell = Boolean(cellUpdatedAt) && !String(currentCell.location || '').trim() && existingGroup.length === 0;
        if (isUserClearedCell) {
          return;
        }

        const newToSync = dayEntries.filter(entry => {
          const label = String(entry.label || '').trim();
          if (!label) return false;
          if (existingGroup.includes(label)) return false;
          if (tombstoneSet.has(label)) return false;

          if (String(entry.source || '').toLowerCase() === 'task') {
            return true;
          }

          const entryTime = new Date(entry.updated_at || entry.created_at).getTime();
          return entryTime > cellUpdatedAt;
        }).map(entry => String(entry.label || '').trim());

        if (!newToSync.length) return;

        empPlan[dateKey] = {
          ...currentCell,
          deliverables: [...existingGroup, ...newToSync],
          deliverable_hours: [
            ...(currentCell.deliverable_hours || []),
            ...new Array(newToSync.length).fill(0),
          ],
        };
        changed = true;
      }
    });

    if (changed) {
      newWedPlan[effectiveEmployeeId] = empPlan;
    }

    return { newPlan: newWedPlan, changed };
  };

  const syncSaturdayPreFill = (currentSatPlanData, overlapWedPlan, overlapWedHistoryPlan, entries) => {
    if (!effectiveEmployeeId) {
      return { newPlan: currentSatPlanData, changed: false };
    }

    const satKeys = satDates.map(toDateKey);
    const newSatPlan = { ...currentSatPlanData };
    const empPlan = { ...(newSatPlan[effectiveEmployeeId] || {}) };
    let changed = false;

    satKeys.forEach((dateKey) => {
      const dayNum = new Date(dateKey).getDay();
      const currentCell = normalizeCell(empPlan[dateKey]);
      const isHoliday = String(currentCell.location || '').toLowerCase() === 'holiday';

      // Monday-Tuesday-Wednesday cells in Saturday sheet should prefill from previous Wednesday sheet overlap (Mon-Tue-Wed section).
      if (dayNum >= 1 && dayNum <= 3) {
        const wedLiveCell = normalizeCell(overlapWedPlan?.[effectiveEmployeeId]?.[dateKey]);
        const wedHistoryCell = normalizeCell(overlapWedHistoryPlan?.[effectiveEmployeeId]?.[dateKey]);
        const wedCell = hasCellData(wedLiveCell) ? wedLiveCell : wedHistoryCell;
        if (hasCellData(wedCell) && !hasCellData(currentCell)) {
          empPlan[dateKey] = clonePrefillCell(wedCell);
          changed = true;
          return;
        }
      }

      // Remaining Saturday sheet days (Thursday-Friday-Saturday) prefill from MCTC automatically.
      if (isHoliday) {
        return;
      }

      const dayEntries = entries.filter((entry) => entry.entry_date === dateKey);

      const existingGroup = currentCell.deliverables.map(item => item.trim()).filter(Boolean);
      const tombstoneSet = new Set((currentCell.tombstones || []).map((item) => String(item || '').trim()).filter(Boolean));
      const cellUpdatedAt = currentCell.updatedAt ? new Date(currentCell.updatedAt).getTime() : 0;

      // If the user previously cleared this RC7 date and it was saved,
      // keep it suppressed from future MCTC auto-prefill.
      const isUserClearedCell = Boolean(cellUpdatedAt) && !String(currentCell.location || '').trim() && existingGroup.length === 0;
      if (isUserClearedCell) {
        return;
      }

      const newToSync = dayEntries.filter(entry => {
        const label = String(entry.label || '').trim();
        if (!label) return false;
        if (existingGroup.includes(label)) return false;
        if (tombstoneSet.has(label)) return false;

        if (String(entry.source || '').toLowerCase() === 'task') {
          return true;
        }

        const entryTime = new Date(entry.updated_at || entry.created_at).getTime();
        return entryTime > cellUpdatedAt;
      }).map(entry => String(entry.label || '').trim());

      if (!newToSync.length) return;

      empPlan[dateKey] = {
        ...currentCell,
        deliverables: [...existingGroup, ...newToSync],
        deliverable_hours: [
          ...(currentCell.deliverable_hours || []),
          ...new Array(newToSync.length).fill(0),
        ],
      };
      changed = true;
    });

    if (changed) {
      newSatPlan[effectiveEmployeeId] = empPlan;
    }

    return { newPlan: newSatPlan, changed };
  };

  const updatePlanCell = (sourceRef, setter, employeeId, dateKey, updater) => {
    const sourceEmployeePlan = sourceRef.current?.[employeeId] || {};
    const previousCell = normalizeCell(sourceEmployeePlan[dateKey]);
    const nextCell = updater(previousCell);

    setter((prev) => {
      const previousEmployeePlan = prev[employeeId] || {};
      return {
        ...prev,
        [employeeId]: {
          ...previousEmployeePlan,
          [dateKey]: nextCell,
        },
      };
    });

    return { previousCell, nextCell };
  };

  const createHandlers = (sourceRef, setter, markDirty, mirrorSetter, markMirrorDirty) => ({
    onLocationChange: (employeeId, dateKey, value) => {
      updatePlanCell(sourceRef, setter, employeeId, dateKey, (cell) => {
        const isHoliday = String(value || '').toLowerCase() === 'holiday';
        return {
          ...cell,
          location: value,
          deliverables: isHoliday ? [''] : (cell.deliverables.length ? cell.deliverables : ['']),
          deliverable_hours: isHoliday
            ? [0]
            : ((cell.deliverable_hours && cell.deliverable_hours.length)
              ? cell.deliverable_hours
              : new Array(cell.deliverables.length ? cell.deliverables.length : 1).fill(0)),
        };
      });
      if (sharedDateKeySet.has(dateKey) && mirrorSetter) {
        const mirrorSourcePlan = mirrorSetter === setSatPlan ? satPlanRef.current : wedPlanRef.current;
        updatePlanCell({ current: mirrorSourcePlan }, mirrorSetter, employeeId, dateKey, (cell) => {
          const isHoliday = String(value || '').toLowerCase() === 'holiday';
          return {
            ...cell,
            location: value,
            deliverables: isHoliday ? [''] : (cell.deliverables.length ? cell.deliverables : ['']),
            deliverable_hours: isHoliday
              ? [0]
              : ((cell.deliverable_hours && cell.deliverable_hours.length)
                ? cell.deliverable_hours
                : new Array(cell.deliverables.length ? cell.deliverables.length : 1).fill(0)),
          };
        });
        if (markMirrorDirty) markMirrorDirty(true);
      }
      markDirty(true);
    },
    onDeliverableChange: (employeeId, dateKey, index, value) => {
      const { nextCell } = updatePlanCell(sourceRef, setter, employeeId, dateKey, (cell) => {
        if (String(cell.location || '').toLowerCase() === 'holiday') {
          return cell;
        }
        const nextDeliverables = [...cell.deliverables];
        const previousValue = String(cell.deliverables[index] || '').trim();
        const nextValue = String(value || '').trim();
        const tombstones = new Set((cell.tombstones || []).map((item) => String(item || '').trim()).filter(Boolean));
        if (previousValue && previousValue !== nextValue) {
          tombstones.add(previousValue);
        }
        nextDeliverables[index] = value;
        return { ...cell, deliverables: nextDeliverables, tombstones: Array.from(tombstones) };
      });
      if (sharedDateKeySet.has(dateKey) && mirrorSetter) {
        const mirrorPlan = mirrorSetter === setSatPlan ? satPlanRef.current : wedPlanRef.current;
        updatePlanCell({ current: mirrorPlan }, mirrorSetter, employeeId, dateKey, () => nextCell);
        if (markMirrorDirty) markMirrorDirty(true);
      }
      markDirty(true);
    },
    onStepHoursChange: (employeeId, dateKey, index, value) => {
      const { nextCell } = updatePlanCell(sourceRef, setter, employeeId, dateKey, (cell) => {
        const nextHours = [...(cell.deliverable_hours || new Array(cell.deliverables.length || 1).fill(0))];
        const hours = parseFloat(value);
        nextHours[index] = Number.isFinite(hours) ? Math.max(0, hours) : 0;
        return { ...cell, deliverable_hours: nextHours };
      });
      if (sharedDateKeySet.has(dateKey) && mirrorSetter) {
        const mirrorPlan = mirrorSetter === setSatPlan ? satPlanRef.current : wedPlanRef.current;
        updatePlanCell({ current: mirrorPlan }, mirrorSetter, employeeId, dateKey, () => nextCell);
        if (markMirrorDirty) markMirrorDirty(true);
      }
      markDirty(true);
    },
    onAddDeliverable: (employeeId, dateKey) => {
      const { nextCell } = updatePlanCell(sourceRef, setter, employeeId, dateKey, (cell) => {
        if (String(cell.location || '').toLowerCase() === 'holiday') {
          return cell;
        }
        return {
          ...cell,
          deliverables: [...cell.deliverables, ''],
          deliverable_hours: [...(cell.deliverable_hours || []), 0],
        };
      });
      if (sharedDateKeySet.has(dateKey) && mirrorSetter) {
        const mirrorPlan = mirrorSetter === setSatPlan ? satPlanRef.current : wedPlanRef.current;
        updatePlanCell({ current: mirrorPlan }, mirrorSetter, employeeId, dateKey, () => nextCell);
        if (markMirrorDirty) markMirrorDirty(true);
      }
      markDirty(true);
    },
    onRemoveDeliverable: (employeeId, dateKey, index) => {
      const { nextCell } = updatePlanCell(sourceRef, setter, employeeId, dateKey, (cell) => {
        if (String(cell.location || '').toLowerCase() === 'holiday') {
          return cell;
        }
        if (cell.deliverables.length <= 1) return cell;
        const removedValue = String(cell.deliverables[index] || '').trim();
        const tombstones = new Set((cell.tombstones || []).map((item) => String(item || '').trim()).filter(Boolean));
        if (removedValue) {
          tombstones.add(removedValue);
        }
        const nextDeliverables = cell.deliverables.filter((_, itemIndex) => itemIndex !== index);
        const nextHours = (cell.deliverable_hours || []).filter((_, itemIndex) => itemIndex !== index);
        return {
          ...cell,
          deliverables: nextDeliverables.length ? nextDeliverables : [''],
          tombstones: Array.from(tombstones),
          deliverable_hours: nextHours.length ? nextHours : [0],
        };
      });
      if (sharedDateKeySet.has(dateKey) && mirrorSetter) {
        const mirrorPlan = mirrorSetter === setSatPlan ? satPlanRef.current : wedPlanRef.current;
        updatePlanCell({ current: mirrorPlan }, mirrorSetter, employeeId, dateKey, () => nextCell);
        if (markMirrorDirty) markMirrorDirty(true);
      }
      markDirty(true);
    },
  });

  const satHandlers = createHandlers(satPlanRef, setSatPlan, setSatDirty, setWedPlan, setWedDirty);
  const wedHandlers = createHandlers(wedPlanRef, setWedPlan, setWedDirty, setSatPlan, setSatDirty);

  const flushPendingChanges = () => {
    const userId = effectiveEmployeeIdRef.current;
    if (!userId || isMemberViewRef.current) {
      return;
    }

    if (satDirtyRef.current && !satSubmittedRef.current) {
      const keys = satDatesRef.current.map(toDateKey);
      const satEmployeePlan = serializeEmployeePlan((satPlanRef.current || {})[userId] || {});
      api.post('rc7/planning/', {
        type: 'sat',
        start: keys[0],
        end: keys[keys.length - 1],
        plan: { [userId]: satEmployeePlan },
      }).catch((error) => {
        console.error('Failed to flush Saturday RC7 changes:', error);
      });
    }

    if (wedDirtyRef.current && !wedSubmittedRef.current) {
      const keys = wedDatesRef.current.map(toDateKey);
      const wedEmployeePlan = serializeEmployeePlan((wedPlanRef.current || {})[userId] || {});
      api.post('rc7/planning/', {
        type: 'wed',
        start: keys[0],
        end: keys[keys.length - 1],
        plan: { [userId]: wedEmployeePlan },
      }).catch((error) => {
        console.error('Failed to flush Wednesday RC7 changes:', error);
      });
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingChanges();
      }
    };

    window.addEventListener('beforeunload', flushPendingChanges);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', flushPendingChanges);
      flushPendingChanges();
    };
  }, []);

  useEffect(() => {
    if (
      loading
      || satPrefillDone
      || isMemberView
      || !isSatCycleActive
      || satSubmitted
      || !effectiveEmployeeId
      || satDirty
    ) {
      return;
    }

    const satKeys = satDates.map(toDateKey);

    let cancelled = false;

    const applySaturdayPrefill = async () => {
      try {
        const entries = await fetchCombinedPrefillEntries(
          satKeys[0],
          satKeys[satKeys.length - 1],
          effectiveEmployeeId,
        );
        if (cancelled) return;
        setMctcEntries(entries);

        const { newPlan, changed } = syncSaturdayPreFill(satPlan, wedPlan, currentWedPlan, entries);
        if (changed) {
          setSatPlan(newPlan);
          setSatDirty(true);
        }

        setSatPrefillDone(true);
      } catch (err) {
        console.error('Failed to prefill Saturday sheet:', err);
      }
    };

    applySaturdayPrefill();

    return () => {
      cancelled = true;
    };
  }, [
    currentWedPlan,
    effectiveEmployeeId,
    isMemberView,
    isSatCycleActive,
    loading,
    satDates,
    satDirty,
    satPrefillDone,
    satPlan,
    wedPlan,
    setSatPrefillDone,
    satSubmitted,
  ]);

  useEffect(() => {
    if (!satDirty || isMemberView || !isSatCycleActive || satSubmitted || !effectiveEmployeeId) {
      return;
    }

    const satKeys = satDates.map(toDateKey);

    const timerSave = setTimeout(async () => {
      try {
        setSavingSat(true);
        await api.post('rc7/planning/', {
          type: 'sat',
          start: satKeys[0],
          end: satKeys[satKeys.length - 1],
          plan: {
            [effectiveEmployeeId]: serializeEmployeePlan(satPlan[effectiveEmployeeId]),
          },
        });

        setSatSaved(true);
        setSatDirty(false);
        setTimeout(() => setSatSaved(false), 2000);
      } catch (error) {
        console.error('Failed to autosave Saturday plan:', error);
      } finally {
        setSavingSat(false);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      clearTimeout(timerSave);
    };
  }, [effectiveEmployeeId, isMemberView, isSatCycleActive, satSubmitted, satDates, satDirty, satPlan]);

  useEffect(() => {
    if (
      loading
      || wedPrefillDone
      || isMemberView
      || !isWedCycleActive
      || wedSubmitted
      || !effectiveEmployeeId
      || wedDirty
    ) {
      return;
    }

    const wedKeys = wedDates.map(toDateKey);
    let cancelled = false;

    const applyWednesdayPrefill = async () => {
      try {
        const entries = await fetchCombinedPrefillEntries(
          wedKeys[0],
          wedKeys[wedKeys.length - 1],
          effectiveEmployeeId,
        );
        if (cancelled) return;
        setMctcEntries(entries);

        const { newPlan, changed } = syncWednesdayPreFill(wedPlan, satPlan, currentSatPlan, entries);
        if (changed) {
          setWedPlan(newPlan);
          setWedDirty(true);
        }

        setWedPrefillDone(true);
      } catch (err) {
        console.error('Failed to prefill Wednesday sheet:', err);
      }
    };

    applyWednesdayPrefill();

    return () => {
      cancelled = true;
    };
  }, [
    currentSatPlan,
    effectiveEmployeeId,
    isMemberView,
    isWedCycleActive,
    loading,
    satPlan,
    wedDates,
    wedDirty,
    wedPrefillDone,
    wedPlan,
    setWedPrefillDone,
    wedSubmitted,
  ]);

  useEffect(() => {
    if (!wedDirty || isMemberView || !isWedCycleActive || wedSubmitted || !effectiveEmployeeId) {
      return;
    }

    const wedKeys = wedDates.map(toDateKey);

    const timerSave = setTimeout(async () => {
      try {
        setSavingWed(true);
        await api.post('rc7/planning/', {
          type: 'wed',
          start: wedKeys[0],
          end: wedKeys[wedKeys.length - 1],
          plan: {
            [effectiveEmployeeId]: serializeEmployeePlan(wedPlan[effectiveEmployeeId]),
          },
        });

        setWedSaved(true);
        setWedDirty(false);
        setTimeout(() => setWedSaved(false), 2000);
      } catch (error) {
        console.error('Failed to autosave Wednesday plan:', error);
        if (error.response?.data) {
          console.error('Wednesday Autosave Error Detail:', error.response.data);
        }
      } finally {
        setSavingWed(false);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      clearTimeout(timerSave);
    };
  }, [effectiveEmployeeId, isMemberView, isWedCycleActive, wedSubmitted, wedDates, wedDirty, wedPlan]);

  const handleSubmitCycle = async (type) => {
    const isSat = type === 'sat';
    const activeDates = isSat ? satDates : wedDates;
    const activePlan = isSat ? satPlan : wedPlan;
    const setSaving = isSat ? setSavingSat : setSavingWed;
    const setDirty = isSat ? setSatDirty : setWedDirty;
    const setSaved = isSat ? setSatSaved : setWedSaved;
    const setSubmitted = isSat ? setSatSubmitted : setWedSubmitted;
    const setSubmittedAt = isSat ? setSatSubmittedAt : setWedSubmittedAt;

    if (!window.confirm(`Are you sure you want to submit the ${isSat ? 'Saturday' : 'Wednesday'} plan?`)) {
      return;
    }

    try {
      setSaving(true);
      const keys = activeDates.map(toDateKey);
      const response = await api.post('rc7/planning/', {
        type,
        start: keys[0],
        end: keys[keys.length - 1],
        plan: {
          [effectiveEmployeeId]: serializeEmployeePlan(activePlan[effectiveEmployeeId] || {}),
        },
        is_submitted: true,
      });

      const submittedAt = response.data?.submitted_at || new Date().toISOString();

      setSaved(true);
      setSubmitted(true);
      setSubmittedAt(submittedAt);
      setDirty(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error(`Failed to submit ${type} plan:`, error);
      if (error.response?.data) {
        console.error(`${type} Submission Error Detail:`, error.response.data);
      }
      alert('Failed to submit plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPreview = (type, activeDates, activePlan, submittedAt = null) => {
    const payload = buildRc7PreviewPayload({
      type,
      dates: activeDates,
      plan: activePlan[effectiveEmployeeId] || {},
      locationOptions,
      employeeLabel: getDisplayName(selectedUser || currentUser),
      submittedAt,
    });

    const encodedPayload = encodeURIComponent(JSON.stringify(payload));
    window.open(`/rc7/preview?payload=${encodedPayload}`, '_blank', 'noopener,noreferrer');
  };



  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f7f7f7] antialiased">
      <Sidebar />

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto max-w-350 px-3 py-4 md:px-6 md:py-8">
          {(() => {
            const consultantName = getDisplayName(ownEmployee);
            const initials = consultantName
              .split(' ')
              .map((n) => n.charAt(0))
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div className="mb-6 flex items-center justify-between gap-3 select-none">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-black text-slate-800 tracking-tight">Weekly Planning</h1>
                  {!isMemberView && isSatCycleActive ? (
                    <span className="rounded-full bg-blue-55 text-blue-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border border-blue-100 shadow-sm bg-blue-50">
                      Editable Today
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-600 border border-amber-100 shadow-sm">
                      Read Only
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1"></div>
                    <div className="text-xs font-bold text-slate-800">{consultantName}</div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-blue-200">
                    {initials}
                  </div>
                </div>
              </div>
            );
          })()}

          {loading ? (
            <div className="space-y-8 animate-pulse">
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
                <div className="bg-slate-200 h-6 w-48 rounded" />
                <div className="bg-slate-200 h-4 w-full rounded" />
                <div className="bg-slate-200 h-16 w-full rounded" />
              </div>
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4">
                <div className="bg-slate-200 h-6 w-48 rounded" />
                <div className="bg-slate-200 h-4 w-full rounded" />
                <div className="bg-slate-200 h-16 w-full rounded" />
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {(() => {
                const type = 'sat';
                const activeDates = satDates;
                const activePlan = satPlan;
                const activeHandlers = satHandlers;
                const activeSaving = savingSat;
                const activeSaved = satSaved;
                const activeCycleActive = isSatCycleActive;
                const activeSubmitted = satSubmitted;
                const activeSubmittedAt = satSubmittedAt;

                return (
                  <PlanSheet
                    key={type}
                    title="Weekly Plan"
                    fillDayLabel="Saturday"
                    dates={activeDates}
                    planData={activePlan}
                    locationOptions={locationOptions}
                    employee={ownEmployee}
                    employeeId={effectiveEmployeeId}
                    canEdit={!isMemberView && activeCycleActive}
                    onLocationChange={activeHandlers.onLocationChange}
                    onDeliverableChange={activeHandlers.onDeliverableChange}
                    onStepHoursChange={activeHandlers.onStepHoursChange}
                    onAddDeliverable={activeHandlers.onAddDeliverable}
                    onRemoveDeliverable={activeHandlers.onRemoveDeliverable}
                    saving={activeSaving}
                    saved={activeSaved}
                    showAutoSaveStatus={!isMemberView && activeCycleActive && Boolean(effectiveEmployeeId)}
                    onSubmit={() => handleSubmitCycle(type)}
                    onPreview={() => handleOpenPreview(type, activeDates, activePlan, activeSubmittedAt)}
                    submittedAt={activeSubmittedAt}
                  />
                );
              })()}

              {!isMemberView && !isSatCycleActive && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                  <Lock size={12} />
                  The sheet is read-only today. Check back during an active window.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RC7;
