import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import api from '../api';

const unwrapList = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

const getEmployeeDisplayName = (employee) => {
  if (employee?.is_mls) {
    return 'MLS';
  }

  if (employee.username) {
    return employee.username;
  }

  const fullName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
  if (fullName) {
    return fullName;
  }

  if (employee.employee_name) {
    return employee.employee_name;
  }

  if (employee.email) {
    return employee.email;
  }

  return `Employee ${employee.employee_id || employee.id}`;
};

const parseHours = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatDaysValue = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';

  const rounded = Math.round((numeric + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

const normalizeRole = (value) => String(value || '').toUpperCase();

const getResolvedUserId = (person) => {
  const candidate = person?.id ?? person?.user_id ?? person?.user?.id ?? null;
  return candidate !== null && candidate !== undefined ? String(candidate) : '';
};

const getResolvedEmployeeProfileId = (person) => {
  const candidate =
    person?.employee_profile_id
    ?? person?.employee_profile?.id
    ?? person?.employee?.id
    ?? null;
  return candidate !== null && candidate !== undefined ? String(candidate) : '';
};

const isMlsIdentity = (person) => {
  if (!person) return false;

  if (person.is_mls) return true;

  const candidates = [
    person.shortform,
    person.full_name,
    person.employee_name,
    person.username,
    person.email,
    `${person.first_name || ''} ${person.last_name || ''}`,
  ];

  return candidates.some((entry) => String(entry || '').toLowerCase().includes('mls'));
};

const getRowPriority = (person) => {
  if (isMlsIdentity(person)) return 0;

  const role = normalizeRole(person?.role);
  if (role === 'SGM') return 1;
  if (role === 'EMPLOYEE') return 2;

  return 3;
};

const MandaysPlanning = () => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [hrRows, setHrRows] = useState([]);
  const [hoursMatrix, setHoursMatrix] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isCurrentUserLoading, setIsCurrentUserLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const selectedMonth = currentDate.getMonth() + 1;
  const selectedYear = currentDate.getFullYear();

  const monthLabel = useMemo(
    () => currentDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
    [currentDate]
  );

  const srNoColumnWidth = 96;
  const nameColumnWidth = 260;

  const totalColumnCount = useMemo(() => 5 + Math.max(clients.length, 1) * 2, [clients.length]);

  const minTableWidth = useMemo(
    () => `${srNoColumnWidth + nameColumnWidth + Math.max(clients.length, 1) * 220 + 260}px`,
    [clients.length]
  );

  useEffect(() => {
    const fetchCurrentProfile = async () => {
      const role = (localStorage.getItem('role') || '').toUpperCase();
      if (!['SGM', 'EMPLOYEE'].includes(role)) return;

      let profileData = null;
      let lastError = null;

      try {
        for (const endpoint of ['/me/', 'me/', 'accounts/me/', 'accounts/profile/']) {
          try {
            const res = await api.get(endpoint);
            profileData = res.data;
            break;
          } catch (err) {
            lastError = err;
            // Keep fallback behavior for legacy deployments where one of these routes may not exist.
            if (err?.response?.status !== 404) {
              break;
            }
          }
        }

        if (profileData) {
          setCurrentUser(profileData);
        } else if (lastError) {
          console.warn('Failed to fetch user profile:', lastError);
        }
      } catch (unexpectedError) {
        console.warn('Failed to fetch user profile:', unexpectedError);
      } finally {
        setIsCurrentUserLoading(false);
      }
    };
    fetchCurrentProfile();
  }, []);

  const currentUserDisplayName = useMemo(() => {
    if (!currentUser) return '';
    const fullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
    return (
      currentUser.username ||
      fullName ||
      currentUser.full_name ||
      currentUser.employee_name ||
      currentUser.email ||
      ''
    );
  }, [currentUser]);

  useEffect(() => {
    const fetchPlanningData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const role = (localStorage.getItem('role') || '').toUpperCase();
        const isSgm = role === 'SGM';
        const isEmployee = role === 'EMPLOYEE';
        const isPrivilegedViewer = role === 'HQEPL' || role === 'MLS' || role === 'ADMIN';

        // Skip if we're still waiting for currentUser to load (for SGM/EMPLOYEE roles)
        if ((isSgm || isEmployee) && isCurrentUserLoading) {
          return;
        }

        let clientsEndpoint = 'clients/list/';
        if (isEmployee) {
          clientsEndpoint = 'employees/clients/';
        }

        const clientsRequestConfig =
          isSgm && clientsEndpoint === 'clients/list/'
            ? { params: { view: 'mandays' } }
            : undefined;

        const clientsResponse = await api.get(clientsEndpoint, clientsRequestConfig);
        const normalizedClients = unwrapList(clientsResponse.data).map((client, index) => ({
          ...client,
          display_name: client.company_name || client.name || `Client ${index + 1}`,
        }));

        if (!normalizedClients.length) {
          setClients([]);
          setHrRows([]);
          setHoursMatrix({});
          return;
        }

        const employeeMap = new Map();
        const employeeProfileToUserId = new Map();
        const nextHoursMatrix = {};

        // For HQEPL/Admin, include all assigned SGMs so SGM section renders fully.
        if (!isSgm && !isEmployee) {
          normalizedClients.forEach((client) => {
            const assignedSgms = Array.isArray(client?.assigned_sgms_details)
              ? client.assigned_sgms_details
              : [];

            assignedSgms.forEach((sgmUser) => {
              if (!sgmUser?.id) return;

              const key = String(sgmUser.id);
              const existing = employeeMap.get(key) || {
                id: sgmUser.id,
                employee_id: sgmUser.id,
                user_id: sgmUser.id,
              };

              employeeMap.set(key, {
                ...existing,
                role: 'SGM',
                first_name: existing.first_name || sgmUser.first_name || '',
                last_name: existing.last_name || sgmUser.last_name || '',
                username: existing.username || sgmUser.username || '',
                email: existing.email || sgmUser.email || '',
                full_name: existing.full_name || sgmUser.full_name || '',
                shortform: existing.shortform || sgmUser.shortform || '',
              });
            });
          });
        }

        // Include MLS row(s) for HQEPL and SGM views.
        if (!isEmployee) {
          try {
            const hqeplUsersRes = await api.get('hqepl/');
            const hqeplUsers = unwrapList(hqeplUsersRes.data);

            hqeplUsers
              .filter((user) => isMlsIdentity(user))
              .forEach((mlsUser) => {
                if (!mlsUser?.id) return;

                const key = String(mlsUser.id);
                const existing = employeeMap.get(key) || {
                  id: mlsUser.id,
                  employee_id: mlsUser.id,
                  user_id: mlsUser.id,
                };

                employeeMap.set(key, {
                  ...existing,
                  role: normalizeRole(mlsUser.role) || 'HQEPL',
                  first_name: existing.first_name || mlsUser.first_name || '',
                  last_name: existing.last_name || mlsUser.last_name || '',
                  username: existing.username || mlsUser.username || '',
                  email: existing.email || mlsUser.email || '',
                  full_name: existing.full_name || mlsUser.full_name || '',
                  shortform: existing.shortform || mlsUser.shortform || '',
                });
              });
          } catch (hqeplError) {
            console.warn('Failed to fetch HQEPL list for MLS placement:', hqeplError);
          }
        }

        // 1. Always ensure current user (SGM/EMPLOYEE) is included.
        if ((isSgm || isEmployee) && currentUser) {
          const userId = getResolvedUserId(currentUser);
          const profileId = getResolvedEmployeeProfileId(currentUser);
          const normalizedCurrentRole = normalizeRole(currentUser.role || role || '');

          if (userId) {
            employeeMap.set(userId, {
              ...currentUser,
              id: currentUser.id ?? (Number(userId) || userId),
              employee_id: currentUser.employee_id ?? (Number(userId) || userId),
              user_id: Number(userId) || userId,
              role: normalizedCurrentRole,
              full_name: currentUserDisplayName || getEmployeeDisplayName(currentUser),
            });
          }

          if (profileId && userId) {
            employeeProfileToUserId.set(profileId, userId);
          }
        }

        if (isSgm) {
          // For SGM, fetch all their authorized employees at once
          try {
            const sgmEmployeesRes = await api.get('sgm/employees/');
            const sgmEmployees = unwrapList(sgmEmployeesRes.data);
            sgmEmployees.forEach((emp) => {
              const userId = emp.id;
              // Avoid overwriting SGM if they were already added (or just merge)
              employeeMap.set(String(userId), {
                ...emp,
                id: userId,
                employee_id: userId,
                user_id: userId,
                role: normalizeRole(emp.role || 'EMPLOYEE'),
              });
              if (emp.employee_profile_id) {
                employeeProfileToUserId.set(String(emp.employee_profile_id), String(userId));
              }
            });
          } catch (err) {
            console.error('Failed to fetch SGM employees:', err);
          }
        } else if (!isEmployee) {
          // Original logic for HQEPL/Admin/Client roles
          const employeeResults = await Promise.allSettled(
            normalizedClients.map((client) => api.get(`clients/${client.id}/employees/`))
          );

          employeeResults.forEach((result) => {
            if (result.status !== 'fulfilled') return;

            const employees = unwrapList(result.value.data);
            employees.forEach((employee) => {
              const userId = employee.user_id || employee.id;
              if (!userId) return;

              const key = String(userId);
              const existing = employeeMap.get(key) || {
                id: userId,
                employee_id: userId,
                user_id: userId,
                first_name: '',
                last_name: '',
                username: '',
                email: '',
                employee_name: '',
              };

              employeeMap.set(key, {
                ...existing,
                user_id: existing.user_id || userId,
                role: normalizeRole(existing.role || employee.role || ''),
                first_name: existing.first_name || employee.first_name || '',
                last_name: existing.last_name || employee.last_name || '',
                username: existing.username || employee.username || '',
                email: existing.email || employee.email || '',
              });

              // Assuming employee objects from clients/id/employees might have profile IDs too
              if (employee.id) {
                // If this is the Employee model ID
                employeeProfileToUserId.set(String(employee.id), key);
              }
            });
          });
        }

        if (isPrivilegedViewer) {
          try {
            const allUsersResponse = await api.get('admin/users/');
            const scopedUsers = unwrapList(allUsersResponse.data).filter((user) => {
              const normalizedRole = normalizeRole(user.role || '');
              return ['SGM', 'EMPLOYEE', 'HQEPL', 'MLS'].includes(normalizedRole);
            });

            scopedUsers.forEach((user) => {
              const userId = user.id;
              const key = String(userId);
              const existing = employeeMap.get(key) || {
                id: userId,
                employee_id: userId,
                employee_name: '',
              };

              employeeMap.set(key, {
                ...existing,
                id: userId,
                employee_id: existing.employee_id || userId,
                user_id: userId,
                role: normalizeRole(user.role || ''),
                first_name: existing.first_name || user.first_name || '',
                last_name: existing.last_name || user.last_name || '',
                username: existing.username || user.username || '',
                email: existing.email || user.email || '',
              });
            });
          } catch (allUsersError) {
            console.warn('Failed to fetch global staff list for HQEPL/Admin:', allUsersError);
          }
        }

        // Fetch man days for all clients
        const employeeScopedProfileId = getResolvedEmployeeProfileId(currentUser)
          || String(currentUser?.employee_id || '').trim();

        const manDayResults = await Promise.allSettled(
          normalizedClients.map((client) => {
            let query = `client_id=${client.id}&month=${selectedMonth}&year=${selectedYear}&approved_only=true`;
            if (isEmployee && employeeScopedProfileId) {
              query += `&employee_id=${employeeScopedProfileId}`;
            }
            return api.get(`ddtme/man-day-entries/?${query}`);
          })
        );

        manDayResults.forEach((result, index) => {
          if (result.status !== 'fulfilled') return;

          const clientId = normalizedClients[index]?.id;
          const entries = unwrapList(result.value.data);

          entries.forEach((entry) => {
            const profileId = entry.employee;
            let userId = profileId ? employeeProfileToUserId.get(String(profileId)) : null;
            const isMlsEntry = String(entry.person_key || '').toLowerCase() === 'mls';

            if (!userId && entry.employee_user_id) {
              userId = String(entry.employee_user_id);
            }

            const currentUserId = getResolvedUserId(currentUser)
              || String(currentUser?.employee_id || '').trim();
            const currentUserProfileId = employeeScopedProfileId;

            if (!userId && isEmployee && currentUserId && currentUserProfileId) {
              if (String(profileId) === currentUserProfileId) {
                userId = currentUserId;
              }
            }

            if (!userId) return;

            if (isEmployee && currentUserId && String(userId) !== currentUserId) {
              return;
            }

            let existingEmployee = employeeMap.get(String(userId));
            if (!existingEmployee && isMlsEntry) {
              const fallbackLabel = String(entry.employee_name || '').trim() || 'MLS';
              existingEmployee = {
                id: Number(userId) || userId,
                user_id: Number(userId) || userId,
                employee_id: Number(userId) || userId,
                role: 'HQEPL',
                username: fallbackLabel,
                full_name: fallbackLabel,
                is_mls: true,
              };
              employeeMap.set(String(userId), existingEmployee);
            }

            if (!existingEmployee && isEmployee) {
              const fallbackLabel = String(entry.employee_name || '').trim() || currentUserDisplayName || 'Employee';
              existingEmployee = {
                id: Number(userId) || userId,
                user_id: Number(userId) || userId,
                employee_id: Number(userId) || userId,
                role: 'EMPLOYEE',
                username: currentUser?.username || fallbackLabel,
                full_name: currentUserDisplayName || fallbackLabel,
                employee_name: fallbackLabel,
              };
              employeeMap.set(String(userId), existingEmployee);
            }

            if (!existingEmployee) {
              return;
            }

            if (isMlsEntry) {
              employeeMap.set(String(userId), {
                ...existingEmployee,
                is_mls: true,
              });
              existingEmployee = employeeMap.get(String(userId));
            }

            const normalizedEmployeeRole = normalizeRole(existingEmployee.role || '');
            if (normalizedEmployeeRole === 'ADMIN') {
              return;
            }

            const matrixKey = `${userId}_${clientId}`;
            const currentValues = nextHoursMatrix[matrixKey] || { on: 0, off: 0 };
            nextHoursMatrix[matrixKey] = {
              on: currentValues.on + parseHours(entry.plan_hours),
              off: currentValues.off + parseHours(entry.off_hours),
            };
          });
        });

        const baseEmployees = Array.from(employeeMap.values()).filter(
          (employee) => normalizeRole(employee.role || '') !== 'ADMIN'
        );

        const byDisplayName = (a, b) =>
          getEmployeeDisplayName(a).localeCompare(getEmployeeDisplayName(b));

        const dedupeById = (list) => {
          const seen = new Set();
          return list.filter((item) => {
            const key = String(item.id || item.user_id || item.employee_id || '');
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };

        let mergedEmployees = [];
        let finalClients = normalizedClients;

        if (isEmployee) {
          const selfId = getResolvedUserId(currentUser);
          const selfProfileId = getResolvedEmployeeProfileId(currentUser);
          const fallbackIdentity = String(currentUser?.employee_id || '').trim();
          const effectiveSelfId = selfId || fallbackIdentity;
          const selfRow = currentUser
            ? {
              ...currentUser,
              id: currentUser.id ?? (Number(effectiveSelfId) || effectiveSelfId || 'self'),
              user_id: Number(effectiveSelfId) || effectiveSelfId || 'self',
              employee_id: currentUser.employee_id ?? (Number(effectiveSelfId) || effectiveSelfId || 'self'),
              role: normalizeRole(currentUser.role || role || 'EMPLOYEE'),
              full_name: currentUserDisplayName || getEmployeeDisplayName(currentUser),
            }
            : null;

          mergedEmployees = baseEmployees.filter((employee) => {
            const employeeUserId = getResolvedUserId(employee);
            const employeeProfileId = getResolvedEmployeeProfileId(employee);

            if (effectiveSelfId && employeeUserId === effectiveSelfId) return true;
            if (selfProfileId && employeeProfileId === selfProfileId) return true;
            return false;
          });

          if (!mergedEmployees.length && selfRow) {
            mergedEmployees = [selfRow];
          }

          // Security rule: employee view must never fall back to another employee row.
          // If self identity cannot be resolved, show no rows rather than another person's data.
          if (!currentUser) {
            mergedEmployees = [];
          }

          if (mergedEmployees.length > 1 && selfRow) {
            const selfKey = String(selfRow.user_id || selfRow.id || selfRow.employee_id || '');
            mergedEmployees = mergedEmployees.filter((employee) => {
              const candidate = String(employee.user_id || employee.id || employee.employee_id || '');
              return candidate === selfKey;
            });
          }

          if (mergedEmployees.length) {
            const selfRow = mergedEmployees[0];
            const selfKey = String(selfRow.user_id || selfRow.id || selfRow.employee_id || '');
            const workedClientIds = new Set(
              normalizedClients
                .filter((client) => {
                  const matrix = nextHoursMatrix[`${selfKey}_${client.id}`];
                  if (!matrix) return false;
                  return parseHours(matrix.on) > 0 || parseHours(matrix.off) > 0;
                })
                .map((client) => String(client.id))
            );

            if (workedClientIds.size > 0) {
              finalClients = normalizedClients.filter((client) => workedClientIds.has(String(client.id)));
            } else {
              // Employee has no worked clients, show all clients with empty matrix
              finalClients = normalizedClients;
            }
          }
        } else if (isSgm) {
          const selfId = String(currentUser?.id || '');
          const mlsRows = baseEmployees
            .filter((employee) => isMlsIdentity(employee))
            .sort(byDisplayName);
          const selfRows = baseEmployees.filter((employee) => String(employee.id || employee.user_id) === selfId);
          const assignedEmployeeRows = baseEmployees
            .filter((employee) => normalizeRole(employee.role || '') === 'EMPLOYEE')
            .sort(byDisplayName);

          mergedEmployees = dedupeById([...mlsRows, ...selfRows, ...assignedEmployeeRows]);
        } else {
          mergedEmployees = baseEmployees
            .filter((employee) => {
              const roleValue = normalizeRole(employee.role || '');
              return isMlsIdentity(employee) || roleValue === 'SGM' || roleValue === 'EMPLOYEE';
            })
            .sort((a, b) => {
              const priorityDiff = getRowPriority(a) - getRowPriority(b);
              if (priorityDiff !== 0) return priorityDiff;
              return byDisplayName(a, b);
            });
        }

        setClients(finalClients);
        setHrRows(mergedEmployees);
        setHoursMatrix(nextHoursMatrix);
      } catch (error) {
        console.error('Failed to load mandays planning data:', error);
        setErrorMessage('Unable to load clients and HR planning data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlanningData();
  }, [selectedMonth, selectedYear, currentUser, currentUserDisplayName, isCurrentUserLoading]);

  const getDaysDisplay = (employeeId, clientId, field) => {
    const rowHours = hoursMatrix[`${employeeId}_${clientId}`];
    if (!rowHours) return '-';

    const hours = field === 'on' ? parseHours(rowHours.on) : parseHours(rowHours.off);
    if (hours === 0) return '-';
    const days = field === 'on' ? hours / 6 : hours / 7.5;
    return days % 1 === 0 ? String(days) : days.toFixed(2);
  };

  const getEmployeeTotalOnsiteDays = (employeeId) => {
    const total = clients.reduce((sum, client) => {
      const rowHours = hoursMatrix[`${employeeId}_${client.id}`];
      if (!rowHours) return sum;
      return sum + parseHours(rowHours.on) / 6;
    }, 0);
    return total % 1 === 0 ? String(total) : total.toFixed(2);
  };

  const getEmployeeTotalOffsiteDays = (employeeId) => {
    const total = clients.reduce((sum, client) => {
      const rowHours = hoursMatrix[`${employeeId}_${client.id}`];
      if (!rowHours) return sum;
      return sum + parseHours(rowHours.off) / 7.5;
    }, 0);
    return total % 1 === 0 ? String(total) : total.toFixed(2);
  };

  const getEmployeeTotalDays = (employeeId) => {
    const total = clients.reduce((sum, client) => {
      const rowHours = hoursMatrix[`${employeeId}_${client.id}`];
      if (!rowHours) return sum;

      const onsiteDays = parseHours(rowHours.on) / 6;
      const offsiteDays = parseHours(rowHours.off) / 7.5;
      return sum + onsiteDays + offsiteDays;
    }, 0);

    return total % 1 === 0 ? String(total) : total.toFixed(2);
  };

  const allEmployeesTotals = useMemo(() => {
    const totals = hrRows.reduce(
      (accumulator, employee) => {
        clients.forEach((client) => {
          const rowHours = hoursMatrix[`${employee.id}_${client.id}`];
          if (!rowHours) return;

          accumulator.onsite += parseHours(rowHours.on) / 6;
          accumulator.offsite += parseHours(rowHours.off) / 7.5;
        });

        return accumulator;
      },
      { onsite: 0, offsite: 0 }
    );

    const totalDays = totals.onsite + totals.offsite;

    return {
      onsite: formatDaysValue(totals.onsite),
      offsite: formatDaysValue(totals.offsite),
      total: formatDaysValue(totalDays),
    };
  }, [clients, hrRows, hoursMatrix]);

  return (
    <div className="h-screen w-screen bg-slate-50 font-sans text-slate-800 flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-8">
        <section className="max-w-425 mx-auto border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden p-6 md:p-8 space-y-6 min-h-180">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 border border-slate-200 rounded-xl px-5 py-4 bg-white">
            <div className="flex items-center gap-4">
              <span className="h-12 w-12 rounded-xl bg-blue-600 text-white grid place-items-center shadow-md">
                <CalendarDays size={22} />
              </span>
              <div>
                <p className="text-xs font-black tracking-[0.2em] uppercase text-slate-500">Planning Period</p>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  {currentUserDisplayName ? `${currentUserDisplayName} - Mandays Planning` : 'Mandays Planning'}
                </h1>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
              <button
                type="button"
                onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="h-10 w-10 rounded-lg text-slate-700 hover:bg-white hover:shadow-sm transition-all"
                title="Previous Month"
              >
                <ChevronLeft size={18} className="mx-auto" />
              </button>

              <span className="px-4 text-sm font-bold text-slate-700 min-w-45 text-center">{monthLabel}</span>

              <button
                type="button"
                onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="h-10 w-10 rounded-lg text-slate-700 hover:bg-white hover:shadow-sm transition-all"
                title="Next Month"
              >
                <ChevronRight size={18} className="mx-auto" />
              </button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: minTableWidth }}>
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-xs">
                    <th rowSpan={2} className="sticky left-0 z-40 border border-slate-300 px-2 py-2 text-left font-black bg-slate-100 w-20 min-w-20">
                      Sr No
                    </th>
                    <th
                      rowSpan={2}
                      className="sticky z-40 border border-slate-300 px-2 py-2 text-left font-black bg-slate-100"
                      style={{ left: `${srNoColumnWidth}px`, minWidth: `${nameColumnWidth}px` }}
                    >
                      Name
                    </th>
                    {(clients.length ? clients : [{ id: 'fallback', display_name: 'Client 1' }]).map((client) => (
                      <th key={`client-head-${client.id}`} colSpan={2} className="border border-slate-300 px-2 py-2 text-center font-black min-w-44">
                        {client.display_name}
                      </th>
                    ))}
                    <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center font-black min-w-24">
                      Total Onsite Days
                    </th>
                    <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center font-black min-w-24">
                      Total Offsite Days
                    </th>
                    <th rowSpan={2} className="border border-slate-300 px-2 py-2 text-center font-black min-w-24">
                      Total Days
                    </th>
                  </tr>
                  <tr className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider">
                    {(clients.length ? clients : [{ id: 'fallback' }]).map((client) => (
                      <React.Fragment key={`client-subhead-${client.id}`}>
                        <th className="border border-slate-300 px-2 py-1.5 text-center font-black">OnSite Days</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center font-black">Offsite Days</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={totalColumnCount} className="border border-slate-200 px-4 py-16">
                        <div className="flex items-center justify-center gap-3 text-slate-500 font-semibold">
                          <Loader2 size={20} className="animate-spin" />
                          Loading clients and HR data...
                        </div>
                      </td>
                    </tr>
                  ) : hrRows.length > 0 ? (
                    <>
                      {hrRows.map((row, index) => (
                        <tr key={`row-${row.id}`} className="group bg-white hover:bg-slate-50 transition-colors text-xs">
                          <td className="sticky left-0 z-30 border border-slate-200 px-2 py-2 font-bold text-slate-600 bg-white group-hover:bg-slate-50 w-20 min-w-20">
                            {index + 1}
                          </td>
                          <td
                            className="sticky z-30 border border-slate-200 px-2 py-2 font-semibold text-slate-800 bg-white group-hover:bg-slate-50"
                            style={{ left: `${srNoColumnWidth}px`, minWidth: `${nameColumnWidth}px` }}
                          >
                            {getEmployeeDisplayName(row)}
                          </td>
                          {(clients.length ? clients : [{ id: 'fallback' }]).map((client) => (
                            <React.Fragment key={`days-${row.id}-${client.id}`}>
                              <td className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                                {client.id === 'fallback' ? '-' : getDaysDisplay(row.id, client.id, 'on')}
                              </td>
                              <td className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                                {client.id === 'fallback' ? '-' : getDaysDisplay(row.id, client.id, 'off')}
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="border border-slate-200 px-2 py-2 text-center font-bold text-slate-800">
                            {clients.length ? getEmployeeTotalOnsiteDays(row.id) : '-'}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center font-bold text-slate-800">
                            {clients.length ? getEmployeeTotalOffsiteDays(row.id) : '-'}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center font-bold text-slate-800">
                            {clients.length ? getEmployeeTotalDays(row.id) : '-'}
                          </td>
                        </tr>
                      ))}

                      <tr className="bg-slate-100 text-xs">
                        <td className="sticky left-0 z-30 border border-slate-300 px-2 py-2 font-black text-slate-700 bg-slate-100 w-20 min-w-20">
                          -
                        </td>
                        <td
                          className="sticky z-30 border border-slate-300 px-2 py-2 font-black text-slate-800 bg-slate-100"
                          style={{ left: `${srNoColumnWidth}px`, minWidth: `${nameColumnWidth}px` }}
                        >
                          Total (All Employees)
                        </td>
                        {(clients.length ? clients : [{ id: 'fallback' }]).map((client) => (
                          <React.Fragment key={`grand-total-${client.id}`}>
                            <td className="border border-slate-300 px-2 py-2 text-center font-black text-slate-700">-</td>
                            <td className="border border-slate-300 px-2 py-2 text-center font-black text-slate-700">-</td>
                          </React.Fragment>
                        ))}
                        <td className="border border-slate-300 px-2 py-2 text-center font-black text-slate-900">
                          {allEmployeesTotals.onsite}
                        </td>
                        <td className="border border-slate-300 px-2 py-2 text-center font-black text-slate-900">
                          {allEmployeesTotals.offsite}
                        </td>
                        <td className="border border-slate-300 px-2 py-2 text-center font-black text-slate-900">
                          {allEmployeesTotals.total}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={totalColumnCount} className="border border-slate-200 px-4 py-12 text-center text-slate-500 font-semibold">
                        No HR members available for the selected month and client scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {errorMessage ? (
            <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{errorMessage}</p>
          ) : null}
        </section>
      </main>
    </div>
  );
};

export default MandaysPlanning;
