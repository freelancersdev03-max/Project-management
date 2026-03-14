import React, { useEffect, useMemo, useState } from 'react';
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

// Saturday section always shows Mon-Sat of the cycle after the upcoming Saturday.
const getSatWindow = (today) => {
  const sat = nearestUpcoming(today, 6);
  const mon = new Date(sat);
  mon.setDate(sat.getDate() + 2);

  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
};

// Wednesday section shows Thu-Wed window.
const getWedWindow = (today) => {
  const wed = nearestUpcoming(today, 3);
  const thu = new Date(wed);
  thu.setDate(wed.getDate() + 1);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(thu);
    d.setDate(thu.getDate() + i);
    return d;
  });
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

const normalizeCell = (cell) => {
  if (typeof cell === 'string') {
    return { location: '', deliverables: [cell] };
  }

  if (cell && typeof cell === 'object') {
    const location = String(cell.location || '');
    const list = Array.isArray(cell.deliverables)
      ? cell.deliverables.map((item) => String(item ?? ''))
      : [String(cell.deliverable || '')];

    if (location.toLowerCase() === 'holiday') {
      return {
        location,
        deliverables: [''],
      };
    }

    return {
      location,
      deliverables: list.length ? list : [''],
    };
  }

  return { location: '', deliverables: [''] };
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
    const joinedDeliverable = deliverables
      .map((item) => item.trim())
      .filter(Boolean)
      .join('\n');

    output[dateKey] = {
      location: cell.location || '',
      deliverable: joinedDeliverable,
      deliverables,
    };
  });

  return output;
};

const PlanSheet = ({
  title,
  fillDayLabel,
  preparationDate,
  dates,
  planData,
  locationOptions,
  employee,
  employeeId,
  canEdit,
  onLocationChange,
  onDeliverableChange,
  onAddDeliverable,
  onRemoveDeliverable,
  saving,
  saved,
  showAutoSaveStatus,
}) => {
  const headers = dates.map((date) => ({
    key: toDateKey(date),
    dayLabel: DAY_NAMES[date.getDay()],
    dateLabel: formatDate(date),
  }));

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
          <div className="flex items-center gap-2 text-base font-bold text-slate-800">
            <span>{title}</span>
            {canEdit ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <Pencil size={10} /> Editable Today
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                <Lock size={10} /> Read Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{formatRange(dates)}</p>
        </div>

        {showAutoSaveStatus && (
          <div className="flex items-center gap-3">
            {saving ? (
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Loader2 size={14} className="animate-spin" />
                Autosaving
              </span>
            ) : saved ? (
              <span className="text-sm font-semibold text-emerald-600">Auto-saved</span>
            ) : (
              <span className="text-sm font-semibold text-slate-500">Auto-save enabled</span>
            )}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border-2 border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b-2 border-slate-300 bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 md:flex-row md:items-center md:justify-between">
          <span>To be filled on {fillDayLabel}</span>
          <span>Date of Preparation: {preparationDate}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-255 border-collapse text-sm">
            <tbody>
              <tr>
                <th className="w-60 border-2 border-slate-300 bg-slate-100 px-3 py-2 text-left text-sm font-bold text-slate-800">
                  Name of Consultant
                </th>
                <td colSpan={headers.length} className="border-2 border-slate-300 px-3 py-2">
                  <div className="flex items-center gap-2">
                    {consultantShortform && (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-200 text-[10px] font-bold uppercase text-slate-700">
                        {consultantShortform}
                      </span>
                    )}
                    <span className="font-semibold text-slate-800">{consultantName}</span>
                  </div>
                </td>
              </tr>

              <tr>
                <th className="border-2 border-slate-300 bg-slate-100 px-3 py-2 text-left text-sm font-bold text-slate-800">Day</th>
                {headers.map((head) => (
                  <th key={`day-${head.key}`} className="border-2 border-slate-300 bg-slate-50 px-2 py-2 text-center text-sm font-bold text-slate-800">
                    {head.dayLabel}
                  </th>
                ))}
              </tr>

              <tr>
                <th className="border-2 border-slate-300 bg-slate-100 px-3 py-2 text-left text-sm font-bold text-slate-800">Dates</th>
                {headers.map((head) => (
                  <td key={`date-${head.key}`} className="border-2 border-slate-300 px-2 py-2 text-center text-sm font-semibold text-slate-700">
                    {head.dateLabel}
                  </td>
                ))}
              </tr>

              <tr>
                <th className="border-2 border-slate-300 bg-slate-100 px-3 py-2 text-left text-sm font-bold text-slate-800">
                  Company Visit / Office
                </th>
                {headers.map((head) => {
                  const cell = normalizeCell(planData?.[employeeId]?.[head.key]);

                  return (
                    <td key={`loc-${head.key}`} className="border-2 border-slate-300 px-2 py-2 align-top">
                      {canEdit ? (
                        <select
                          value={cell.location}
                          onChange={(event) => onLocationChange(employeeId, head.key, event.target.value)}
                          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-slate-500"
                        >
                          {locationOptions.map((option) => (
                            <option key={option.value || 'none'} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="rounded-md border border-transparent px-2 py-1.5 text-xs font-semibold text-slate-700">
                          {getLocationLabel(cell.location, locationOptions)}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <th className="border-2 border-slate-300 bg-slate-100 px-3 py-2 text-left align-top text-sm font-bold text-slate-800">
                  Deliverables
                </th>
                {headers.map((head) => {
                  const cell = normalizeCell(planData?.[employeeId]?.[head.key]);
                  const isHoliday = String(cell.location || '').toLowerCase() === 'holiday';

                  const nonEmptyDeliverables = cell.deliverables
                    .map((item) => item.trim())
                    .filter(Boolean);

                  return (
                    <td key={`del-${head.key}`} className="border-2 border-slate-300 px-2 py-2 align-top">
                      {canEdit ? (
                        <div className="space-y-1.5">
                          {!isHoliday && (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => onAddDeliverable(employeeId, head.key)}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                <Plus size={11} />
                                Add
                              </button>
                            </div>
                          )}

                          {isHoliday ? (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700">
                              Holiday selected. Deliverables are disabled.
                            </div>
                          ) : (
                            cell.deliverables.map((item, index) => (
                              <div key={`${head.key}-${index}`} className="flex items-start gap-1.5">
                                <textarea
                                  value={item}
                                  onChange={(event) => onDeliverableChange(employeeId, head.key, index, event.target.value)}
                                  placeholder="Enter deliverable"
                                  rows={2}
                                  className="w-full resize-none rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs leading-relaxed text-slate-700 outline-none focus:border-slate-500"
                                />

                                <button
                                  type="button"
                                  onClick={() => onRemoveDeliverable(employeeId, head.key, index)}
                                  disabled={cell.deliverables.length === 1}
                                  className="inline-flex items-center justify-center rounded-md border border-slate-300 p-1.5 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Remove deliverable line"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1 text-xs text-slate-700">
                          {nonEmptyDeliverables.length ? (
                            nonEmptyDeliverables.map((item, index) => (
                              <div key={`${head.key}-read-${index}`} className="rounded-md bg-slate-50 px-2 py-1.5">
                                {item}
                              </div>
                            ))
                          ) : (
                            <div className="rounded-md px-2 py-1.5 text-slate-400">-</div>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
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
  const today = useMemo(() => new Date(), []);
  const isSaturday = today.getDay() === 6;
  const isWednesday = today.getDay() === 3;

  const memberViewContext = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const memberParam = Number(params.get('member'));
    const memberName = (params.get('memberName') || '').trim();
    const hasValidMember = Number.isFinite(memberParam) && memberParam > 0;
    const canUseMemberView = ['SGM', 'HQEPL'].includes(currentRole);

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

  const satDates = useMemo(() => getSatWindow(today), [today]);
  const wedDates = useMemo(() => getWedWindow(today), [today]);

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

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        let resolvedUser = null;
        let resolvedUserId = '';

        try {
          const meRes = await api.get('/me/');
          resolvedUser = meRes.data || null;
          resolvedUserId = String(meRes.data?.id || '');
        } catch {
          const storedId = String(localStorage.getItem('user_id') || '');
          const storedUsername = String(localStorage.getItem('username') || '');
          if (storedId) {
            resolvedUser = { id: storedId, username: storedUsername };
            resolvedUserId = storedId;
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
          else if (role === 'EXTERNAL') clientsEndpoint = 'employees/external-clients/';
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
          setSatPlan(satRes.data || {});
        } catch {
          setSatPlan({});
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
          setWedPlan(wedRes.data || {});
        } catch {
          setWedPlan({});
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [currentRole, isMemberView, satDates, targetUserId, targetUserLabel, wedDates]);

  const effectiveEmployeeId = useMemo(() => {
    if (selectedUserId) return String(selectedUserId);
    if (currentUserId) return String(currentUserId);
    if (selectedUser?.id) return String(selectedUser.id);
    if (currentUser?.id) return String(currentUser.id);
    return '';
  }, [currentUser, currentUserId, selectedUser, selectedUserId]);

  const ownEmployee = useMemo(() => {
    if (!effectiveEmployeeId) return currentUser;
    return employees.find((emp) => String(emp.id) === effectiveEmployeeId) || selectedUser || currentUser;
  }, [currentUser, effectiveEmployeeId, employees, selectedUser]);

  const updatePlanCell = (setter, employeeId, dateKey, updater) => {
    setter((prev) => {
      const previousEmployeePlan = prev[employeeId] || {};
      const previousCell = normalizeCell(previousEmployeePlan[dateKey]);
      const nextCell = updater(previousCell);

      return {
        ...prev,
        [employeeId]: {
          ...previousEmployeePlan,
          [dateKey]: nextCell,
        },
      };
    });
  };

  const createHandlers = (setter, markDirty) => ({
    onLocationChange: (employeeId, dateKey, value) => {
      updatePlanCell(setter, employeeId, dateKey, (cell) => {
        const isHoliday = String(value || '').toLowerCase() === 'holiday';
        return {
          ...cell,
          location: value,
          deliverables: isHoliday ? [''] : (cell.deliverables.length ? cell.deliverables : ['']),
        };
      });
      markDirty(true);
    },
    onDeliverableChange: (employeeId, dateKey, index, value) => {
      updatePlanCell(setter, employeeId, dateKey, (cell) => {
        if (String(cell.location || '').toLowerCase() === 'holiday') {
          return cell;
        }
        const nextDeliverables = [...cell.deliverables];
        nextDeliverables[index] = value;
        return { ...cell, deliverables: nextDeliverables };
      });
      markDirty(true);
    },
    onAddDeliverable: (employeeId, dateKey) => {
      updatePlanCell(setter, employeeId, dateKey, (cell) => {
        if (String(cell.location || '').toLowerCase() === 'holiday') {
          return cell;
        }
        return {
          ...cell,
          deliverables: [...cell.deliverables, ''],
        };
      });
      markDirty(true);
    },
    onRemoveDeliverable: (employeeId, dateKey, index) => {
      updatePlanCell(setter, employeeId, dateKey, (cell) => {
        if (String(cell.location || '').toLowerCase() === 'holiday') {
          return cell;
        }
        if (cell.deliverables.length <= 1) return cell;
        const nextDeliverables = cell.deliverables.filter((_, itemIndex) => itemIndex !== index);
        return { ...cell, deliverables: nextDeliverables.length ? nextDeliverables : [''] };
      });
      markDirty(true);
    },
  });

  const satHandlers = createHandlers(setSatPlan, setSatDirty);
  const wedHandlers = createHandlers(setWedPlan, setWedDirty);

  useEffect(() => {
    if (!satDirty || isMemberView || !isSaturday || !effectiveEmployeeId) {
      return;
    }

    const satKeys = satDates.map(toDateKey);
    const timer = setTimeout(async () => {
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
        setTimeout(() => setSatSaved(false), 2000);
      } catch (error) {
        console.error('Failed to autosave Saturday plan:', error);
      } finally {
        setSavingSat(false);
        setSatDirty(false);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [effectiveEmployeeId, isMemberView, isSaturday, satDates, satDirty, satPlan]);

  useEffect(() => {
    if (!wedDirty || isMemberView || !isWednesday || !effectiveEmployeeId) {
      return;
    }

    const wedKeys = wedDates.map(toDateKey);
    const timer = setTimeout(async () => {
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
        setTimeout(() => setWedSaved(false), 2000);
      } catch (error) {
        console.error('Failed to autosave Wednesday plan:', error);
      } finally {
        setSavingWed(false);
        setWedDirty(false);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [effectiveEmployeeId, isMemberView, isWednesday, wedDates, wedDirty, wedPlan]);

  const satPreparationDate = useMemo(() => formatDate(nearestUpcoming(today, 6)), [today]);
  const wedPreparationDate = useMemo(() => formatDate(nearestUpcoming(today, 3)), [today]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f7f7f7] antialiased">
      <Sidebar />

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="mx-auto max-w-350 px-6 py-8">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-800">
                  <CalendarRange size={20} />
                  <h1 className="text-xl font-bold">RC7 (Rolling Consultant 7) Days Schedule and Deliverable Plan</h1>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Name of Consultant: <span className="font-semibold text-slate-800">{getDisplayName(ownEmployee)}</span>
                </p>
                {isMemberView && (
                  <p className="mt-1 text-xs font-semibold text-[#F58A4B]">
                    Viewing shared RC7 for {targetUserLabel || getDisplayName(ownEmployee)}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                Saturday Window: {formatRange(satDates)}
                <br />
                Wednesday Window: {formatRange(wedDates)}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
              <Loader2 size={26} className="animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-8">
              <PlanSheet
                title="To be filled on Saturday"
                fillDayLabel="Saturday"
                preparationDate={satPreparationDate}
                dates={satDates}
                planData={satPlan}
                locationOptions={locationOptions}
                employee={ownEmployee}
                employeeId={effectiveEmployeeId}
                canEdit={!isMemberView && isSaturday}
                onLocationChange={satHandlers.onLocationChange}
                onDeliverableChange={satHandlers.onDeliverableChange}
                onAddDeliverable={satHandlers.onAddDeliverable}
                onRemoveDeliverable={satHandlers.onRemoveDeliverable}
                saving={savingSat}
                saved={satSaved}
                showAutoSaveStatus={!isMemberView && isSaturday && Boolean(effectiveEmployeeId)}
              />

              <PlanSheet
                title="To be filled on Wednesday"
                fillDayLabel="Wednesday"
                preparationDate={wedPreparationDate}
                dates={wedDates}
                planData={wedPlan}
                locationOptions={locationOptions}
                employee={ownEmployee}
                employeeId={effectiveEmployeeId}
                canEdit={!isMemberView && isWednesday}
                onLocationChange={wedHandlers.onLocationChange}
                onDeliverableChange={wedHandlers.onDeliverableChange}
                onAddDeliverable={wedHandlers.onAddDeliverable}
                onRemoveDeliverable={wedHandlers.onRemoveDeliverable}
                saving={savingWed}
                saved={wedSaved}
                showAutoSaveStatus={!isMemberView && isWednesday && Boolean(effectiveEmployeeId)}
              />

              {!isMemberView && !isSaturday && !isWednesday && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                  <Lock size={12} />
                  Both sheets are read-only today. Edit on Saturday or Wednesday.
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
