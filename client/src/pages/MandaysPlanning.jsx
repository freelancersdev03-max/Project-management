import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Download } from 'lucide-react';
import { SkeletonTableRow } from '../components/SkeletonLoader';
import Sidebar from '../components/Sidebar';
import api from '../api';
import { subscribeToDdtmePlanningRefresh } from '../utils/ddtmePlanningRefresh';
import * as XLSX from 'xlsx';

const formatDays = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '-';
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

const formatDaysNum = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

const getResolvedEmployeeProfileId = (person) => {
  const candidate =
    person?.employee_profile_id
    ?? person?.employee_profile?.id
    ?? person?.employee?.id
    ?? null;
  return candidate !== null && candidate !== undefined ? String(candidate) : '';
};

const MandaysPlanning = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isCurrentUserLoading, setIsCurrentUserLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  // Data from backend
  const [clients, setClients] = useState([]);        // [{id, name}]
  const [employees, setEmployees] = useState([]);      // [{employee_id, employee_name, per_client, total_*}]

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

  const currentUserDisplayName = useMemo(() => {
    if (!currentUser) return '';
    const fullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
    return fullName || currentUser.full_name || currentUser.shortform || currentUser.username || currentUser.employee_name || currentUser.email || '';
  }, [currentUser]);

  // Fetch current user profile
  useEffect(() => {
    const fetchCurrentProfile = async () => {
      const role = (localStorage.getItem('role') || '').toUpperCase();
      if (!['SGM', 'EMPLOYEE', 'MLS'].includes(role)) {
        setIsCurrentUserLoading(false);
        return;
      }
      try {
        for (const endpoint of ['/me/', 'me/', 'accounts/me/', 'accounts/profile/']) {
          try {
            const res = await api.get(endpoint);
            setCurrentUser(res.data);
            break;
          } catch (err) {
            if (err?.response?.status !== 404) break;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch user profile:', e);
      } finally {
        setIsCurrentUserLoading(false);
      }
    };
    fetchCurrentProfile();
  }, []);

  useEffect(() => {
    return subscribeToDdtmePlanningRefresh(() => setRefreshTick((v) => v + 1));
  }, []);

  // Fetch planning data
  useEffect(() => {
    const fetchPlanningData = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');
        setClients([]);
        setEmployees([]);

        const role = (localStorage.getItem('role') || '').toUpperCase();
        const isSgm = role === 'SGM';
        const isEmployee = role === 'EMPLOYEE';

        if ((isSgm || isEmployee) && isCurrentUserLoading) return;

        const employeeScopedProfileId = getResolvedEmployeeProfileId(currentUser)
          || String(currentUser?.employee_id || '').trim();

        const summaryResponse = await api.get('ddtme/man-day-entries/summary/', {
          params: {
            month: selectedMonth,
            year: selectedYear,
            view: 'mandays',
            ...(isEmployee && employeeScopedProfileId ? { employee_id: employeeScopedProfileId } : {}),
          },
        });

        const data = summaryResponse.data;

        // Support both new {clients, employees} format and legacy array format
        if (data && Array.isArray(data.clients) && Array.isArray(data.employees)) {
          setClients(data.clients);
          setEmployees(data.employees);
        } else if (Array.isArray(data)) {
          // Legacy fallback
          setClients([]);
          setEmployees(data.map((row) => ({
            employee_id: row.employee_id,
            employee_name: row.employee_name || row.employee_user_id || 'Unknown',
            records: row.records || 0,
            per_client: {},
            total_onsite_days: row.onsite_days || (row.plan_hours ? row.plan_hours / 6 : 0),
            total_offsite_days: row.offsite_days || (row.off_hours ? row.off_hours / 7.5 : 0),
            total_days: row.total_days || 0,
          })));
        }
      } catch (error) {
        console.error('Failed to load mandays planning data:', error);
        setErrorMessage('Unable to load mandays planning data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlanningData();
  }, [selectedMonth, selectedYear, currentUser, isCurrentUserLoading, refreshTick]);

  // Compute column totals
  const columnTotals = useMemo(() => {
    const perClient = {};
    clients.forEach((c) => {
      perClient[c.id] = { onsite: 0, offsite: 0 };
    });
    let totalOnsite = 0;
    let totalOffsite = 0;

    employees.forEach((emp) => {
      clients.forEach((c) => {
        const pc = emp.per_client?.[c.id];
        if (pc) {
          perClient[c.id].onsite += pc.onsite_days || 0;
          perClient[c.id].offsite += pc.offsite_days || 0;
        }
      });
      totalOnsite += emp.total_onsite_days || 0;
      totalOffsite += emp.total_offsite_days || 0;
    });

    return { perClient, totalOnsite, totalOffsite, totalDays: totalOnsite + totalOffsite };
  }, [clients, employees]);

  // Compute overall days per client (onsite+offsite)
  const overallPerClient = useMemo(() => {
    const result = {};
    clients.forEach((c) => {
      const t = columnTotals.perClient[c.id];
      result[c.id] = (t?.onsite || 0) + (t?.offsite || 0);
    });
    return result;
  }, [clients, columnTotals]);

  // Summary stats
  const summaryStats = useMemo(() => ({
    employeeCount: employees.length,
    clientCount: clients.length,
    totalOnsite: employees.reduce((s, e) => s + (e.total_onsite_days || 0), 0),
    totalOffsite: employees.reduce((s, e) => s + (e.total_offsite_days || 0), 0),
    totalDays: employees.reduce((s, e) => s + (e.total_days || 0), 0),
  }), [employees, clients]);

  // Excel download
  const handleDownloadExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Header row 1: Sr No, Name, then client names (spanning 2 cols each), then Total headers
    const headerRow1 = ['Sr No', 'Name'];
    clients.forEach((c) => { headerRow1.push(c.name, ''); });
    headerRow1.push('Total', 'Offsite Days', 'Total Days');

    // Header row 2: empty, empty, then OnSite Days / Offsite Days per client, then Onsite Days, Offsite Days, Total Days
    const headerRow2 = ['', ''];
    clients.forEach(() => { headerRow2.push('OnSite Days', 'Offsite Days'); });
    headerRow2.push('Onsite Days', 'Offsite Days', 'Total Days');

    const dataRows = employees.map((emp, i) => {
      const row = [i + 1, emp.employee_name];
      clients.forEach((c) => {
        const pc = emp.per_client?.[c.id];
        row.push(pc?.onsite_days || '-', pc?.offsite_days || '-');
      });
      row.push(formatDaysNum(emp.total_onsite_days), formatDaysNum(emp.total_offsite_days), formatDaysNum(emp.total_days));
      return row;
    });

    // Total row
    const totalRow = ['-', 'Total (All Employees)'];
    clients.forEach((c) => {
      totalRow.push(formatDaysNum(columnTotals.perClient[c.id]?.onsite), formatDaysNum(columnTotals.perClient[c.id]?.offsite));
    });
    totalRow.push(formatDaysNum(columnTotals.totalOnsite), formatDaysNum(columnTotals.totalOffsite), formatDaysNum(columnTotals.totalDays));

    // Overall Days row
    const overallRow = ['', 'Overall Days'];
    clients.forEach((c) => {
      overallRow.push(formatDaysNum(overallPerClient[c.id]), '');
    });
    overallRow.push('', '', formatDaysNum(columnTotals.totalDays));

    const sheet = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows, totalRow, overallRow]);

    // Merge client name headers (span 2 cols each)
    sheet['!merges'] = [];
    clients.forEach((_, i) => {
      const col = 2 + i * 2;
      sheet['!merges'].push({ s: { r: 0, c: col }, e: { r: 0, c: col + 1 } });
    });

    XLSX.utils.book_append_sheet(workbook, sheet, 'Mandays Planning');
    XLSX.writeFile(workbook, `Mandays_Planning_${monthLabel.replace(' ', '_')}.xlsx`);
  };

  const clientColCount = clients.length * 2;
  const totalColSpan = 2 + clientColCount + 3; // sr + name + client cols + total 3 cols

  return (
    <div className="h-screen w-screen bg-slate-50 font-sans text-slate-800 flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-8">
        <section className="max-w-full mx-auto border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
          {/* Header */}
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
                <p className="mt-1 text-sm font-semibold text-slate-500">Source: monthly DDTME summary</p>
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

            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
            >
              <Download size={18} />
              <span>Download Excel</span>
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Employees</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{summaryStats.employeeCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Clients</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{summaryStats.clientCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Total Onsite Days</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{formatDaysNum(summaryStats.totalOnsite)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Total Offsite Days</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{formatDaysNum(summaryStats.totalOffsite)}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Total Days</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{formatDaysNum(summaryStats.totalDays)}</div>
            </div>
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" style={{ minWidth: `${200 + clients.length * 200 + 300}px` }}>
                <thead>
                  {/* Row 1: Client names spanning 2 columns each */}
                  <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                    <th rowSpan={2} className="border border-slate-600 px-3 py-3 text-left font-black w-16">Sr No</th>
                    <th rowSpan={2} className="border border-slate-600 px-3 py-3 text-left font-black min-w-40">Name</th>
                    {clients.map((c) => (
                      <th key={c.id} colSpan={2} className="border border-slate-600 px-3 py-3 text-center font-black bg-slate-700">
                        {c.name}
                      </th>
                    ))}
                    <th colSpan={3} className="border border-slate-600 px-3 py-3 text-center font-black bg-blue-700">
                      Total
                    </th>
                  </tr>
                  {/* Row 2: OnSite Days / Offsite Days under each client */}
                  <tr className="bg-slate-700 text-white text-[10px] uppercase tracking-wider">
                    {clients.map((c) => (
                      <React.Fragment key={`sub-${c.id}`}>
                        <th className="border border-slate-600 px-2 py-2 text-center font-bold">OnSite Days</th>
                        <th className="border border-slate-600 px-2 py-2 text-center font-bold">Offsite Days</th>
                      </React.Fragment>
                    ))}
                    <th className="border border-slate-600 px-2 py-2 text-center font-bold bg-blue-600">Onsite Days</th>
                    <th className="border border-slate-600 px-2 py-2 text-center font-bold bg-blue-600">Offsite Days</th>
                    <th className="border border-slate-600 px-2 py-2 text-center font-bold bg-blue-600">Total Days</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <SkeletonTableRow key={idx} columns={totalColSpan || 8} />
                    ))
                  ) : employees.length > 0 ? (
                    <>
                      {employees.map((emp, index) => (
                        <tr key={emp.employee_id} className="bg-white hover:bg-slate-50 transition-colors">
                          <td className="border border-slate-200 px-3 py-2 font-bold text-slate-600">{index + 1}</td>
                          <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{emp.employee_name}</td>
                          {clients.map((c) => {
                            const pc = emp.per_client?.[c.id];
                            return (
                              <React.Fragment key={`${emp.employee_id}-${c.id}`}>
                                <td className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                                  {formatDays(pc?.onsite_days)}
                                </td>
                                <td className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                                  {formatDays(pc?.offsite_days)}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          <td className="border border-slate-200 px-2 py-2 text-center font-bold text-slate-800 bg-blue-50">
                            {formatDays(emp.total_onsite_days)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center font-bold text-slate-800 bg-blue-50">
                            {formatDays(emp.total_offsite_days)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center font-black text-slate-900 bg-blue-50">
                            {formatDays(emp.total_days)}
                          </td>
                        </tr>
                      ))}

                      {/* Total row */}
                      <tr className="bg-slate-100 font-bold">
                        <td className="border border-slate-300 px-3 py-2 text-slate-700">-</td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-800">Total (All Employees)</td>
                        {clients.map((c) => (
                          <React.Fragment key={`total-${c.id}`}>
                            <td className="border border-slate-300 px-2 py-2 text-center text-slate-800">
                              {formatDaysNum(columnTotals.perClient[c.id]?.onsite)}
                            </td>
                            <td className="border border-slate-300 px-2 py-2 text-center text-slate-800">
                              {formatDaysNum(columnTotals.perClient[c.id]?.offsite)}
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="border border-slate-300 px-2 py-2 text-center font-black text-slate-900 bg-blue-100">
                          {formatDaysNum(columnTotals.totalOnsite)}
                        </td>
                        <td className="border border-slate-300 px-2 py-2 text-center font-black text-slate-900 bg-blue-100">
                          {formatDaysNum(columnTotals.totalOffsite)}
                        </td>
                        <td className="border border-slate-300 px-2 py-2 text-center font-black text-slate-900 bg-blue-100">
                          {formatDaysNum(columnTotals.totalDays)}
                        </td>
                      </tr>

                      {/* Overall Days row */}
                      <tr className="bg-slate-200 font-black">
                        <td className="border border-slate-300 px-3 py-2 text-slate-700"></td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-900">Overall Days</td>
                        {clients.map((c) => (
                          <React.Fragment key={`overall-${c.id}`}>
                            <td colSpan={2} className="border border-slate-300 px-2 py-2 text-center text-slate-900">
                              {formatDaysNum(overallPerClient[c.id])}
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="border border-slate-300 px-2 py-2 text-center text-slate-600">-</td>
                        <td className="border border-slate-300 px-2 py-2 text-center text-slate-600">-</td>
                        <td className="border border-slate-300 px-2 py-2 text-center font-black text-slate-900 bg-blue-200">
                          {formatDaysNum(columnTotals.totalDays)}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={totalColSpan} className="border border-slate-200 px-4 py-12 text-center text-slate-500 font-semibold">
                        No DDTME records found for the selected month.
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