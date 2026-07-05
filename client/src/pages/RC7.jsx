import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { CalendarRange, Loader2, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
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

  const consultantName = getDisplayName(employee);
  const consultantShortform = getShortform(employee);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-1.5 md:gap-2 text-sm md:text-base font-bold text-slate-800 flex-wrap">
            <span>{title}</span>
            {canEdit ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <Pencil size={10} /> Editable Today
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-amber-700">
                <Lock size={10} /> Read Only
              </span>
            )}
          </div>
          <p className="text-[10px] md:text-xs text-slate-500">{formatRange(dates)}</p>
        </div>

        {showAutoSaveStatus && (
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              {saving ? (
                <span className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-600">
                  <Loader2 size={14} className="animate-spin" />
                  Autosaving
                </span>
              ) : saved ? (
                <span className="text-xs md:text-sm font-semibold text-emerald-600">Auto-saved</span>
              ) : (
                <span className="text-xs md:text-sm font-semibold text-slate-500">Auto-save enabled</span>
              )}
            </div>
            {submittedAt && (
              <span className="text-[10px] md:text-xs font-semibold text-slate-500 italic">
                Last submitted: {formatDateTime(submittedAt)}
              </span>
            )}

            {canEdit && onSubmit && (
              <div className="flex items-center gap-2">
                {onPreview && (
                  <button
                    type="button"
                    onClick={onPreview}
                    className="rounded-md border border-slate-300 bg-white px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Preview
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSubmit}
                  disabled={saving}
                  className="rounded-md bg-emerald-600 px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  Submit Plan
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl md:rounded-2xl border border-slate-200 bg-white shadow-sm mt-4">
        <div className="flex flex-col gap-1.5 md:gap-2 border-b border-slate-200 bg-slate-50 px-3 md:px-4 py-3 md:py-4 text-xs font-bold text-slate-800 uppercase tracking-widest md:flex-row md:items-center md:justify-between">
          <span>To be filled on {fillDayLabel}</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 w-28">Day</th>
                <th className="px-4 py-3 w-32">Date</th>
                <th className="px-4 py-3 w-48">Location</th>
                <th className="px-4 py-3">Deliverables & Hours</th>
                <th className="px-4 py-3 w-32 text-center">Total Hrs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {headers.map((head) => {
                const cell = normalizeCell(planData?.[employeeId]?.[head.key]);
                const isHoliday = String(cell.location || '').toLowerCase() === 'holiday';
                const nonEmptyDeliverables = cell.deliverables
                  .map((item) => item.trim())
                  .filter(Boolean);

                return (
                  <tr key={head.key} className={`group align-top transition-colors hover:bg-slate-50/50 ${head.isOverbooked ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-4 font-bold text-slate-800">{head.dayLabel}</td>
                    <td className="px-4 py-4 font-semibold text-slate-600">{head.dateLabel}</td>
                    <td className="px-4 py-4">
                      {canEdit ? (
                        <select
                          value={cell.location}
                          onChange={(event) => onLocationChange(employeeId, head.key, event.target.value)}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#0086FF] focus:ring-1 focus:ring-[#0086FF]"
                        >
                          {locationOptions.map((option) => (
                            <option key={option.value || 'none'} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm font-semibold text-slate-700">
                          {getLocationLabel(cell.location, locationOptions)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {isHoliday ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800 shadow-sm">
                          Holiday selected. Deliverables are disabled.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {canEdit ? (
                            cell.deliverables.map((item, index) => (
                              <div key={`${head.key}-${index}`} className="flex flex-col xl:flex-row gap-2 xl:items-start">
                                <div className="flex-1">
                                  <textarea
                                    value={item}
                                    onChange={(event) => onDeliverableChange(employeeId, head.key, index, event.target.value)}
                                    placeholder="Describe the task or deliverable..."
                                    rows={2}
                                    className="w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed text-slate-800 outline-none focus:border-[#0086FF] focus:ring-1 focus:ring-[#0086FF] shadow-sm"
                                  />
                                </div>
                                <div className="flex items-center gap-2 xl:w-48 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={cell.deliverable_hours?.[index] ?? ''}
                                    onChange={(event) => onStepHoursChange(employeeId, head.key, index, event.target.value)}
                                    placeholder="Hrs"
                                    title="Estimated Hours"
                                    className="w-16 rounded-md border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0086FF] focus:ring-1 focus:ring-[#0086FF] shadow-sm text-center"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => onRemoveDeliverable(employeeId, head.key, index)}
                                    disabled={cell.deliverables.length === 1}
                                    className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:cursor-not-allowed disabled:opacity-40 shadow-sm"
                                    title="Remove Task"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                  {index === cell.deliverables.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => onAddDeliverable(employeeId, head.key)}
                                      className="inline-flex items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 p-2 text-emerald-600 transition-colors hover:bg-emerald-100 shadow-sm"
                                      title="Add Task"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            nonEmptyDeliverables.length ? (
                              nonEmptyDeliverables.map((item, index) => (
                                <div key={`${head.key}-read-${index}`} className="flex flex-col xl:flex-row gap-2 xl:items-start rounded-md border border-slate-100 bg-slate-50/50 p-3">
                                  <div className="flex-1 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {item}
                                  </div>
                                  <div className="flex items-center gap-2 xl:w-24 shrink-0 xl:justify-end">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 xl:hidden">Hrs:</span>
                                    <span className="text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1">{cell.deliverable_hours?.[index] || 0}h</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs italic text-slate-400">No deliverables added.</div>
                            )
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center justify-center rounded-md border px-2.5 py-1 text-xs font-bold leading-none shadow-sm ${
                        head.isOverbooked ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}>
                        {head.totalHours.toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
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
          <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-800">
              <CalendarRange size={20} className="text-[#0086FF]" />
              <h1 className="text-lg font-bold">Weekly Planning</h1>
              {isMemberView && (
                <span className="ml-2 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#0086FF] uppercase border border-blue-100">
                  {targetUserLabel || getDisplayName(ownEmployee)}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              Consultant: <span className="text-slate-800 font-bold">{getDisplayName(ownEmployee)}</span>
            </div>
          </div>

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
