import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Users, Building2, Download, Sun, Moon, Sigma } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import api from '../api';
import { subscribeToDdtmePlanningRefresh } from '../utils/ddtmePlanningRefresh';
import * as XLSX from 'xlsx';
import { PageHeader, Band } from '../components/kayaara/Band';
import KpiCard from '../components/kayaara/KpiCard';

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

  // Max employee total days (for capacity bars)
  const maxEmployeeDays = useMemo(
    () => Math.max(...employees.map((e) => Number(e.total_days) || 0), 1),
    [employees]
  );

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

  const headerCellStyle = {
    background: 'var(--k-band-grey)',
    color: 'var(--k-grey-500)',
    borderColor: 'var(--k-grey-200)',
  };
  const headerCellBlueStyle = {
    background: 'var(--k-blue-tint)',
    color: 'var(--k-blue)',
    borderColor: 'var(--k-grey-200)',
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Mandays"
          accent="Planning"
          subtitle={currentUserDisplayName ? `${currentUserDisplayName} · Source: monthly DDTME summary` : 'Source: monthly DDTME summary'}
          actions={
            <>
              <div
                className="inline-flex items-center gap-1 rounded-xl p-1"
                style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}
              >
                <button
                  type="button"
                  onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="k-btn-icon"
                  title="Previous Month"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-3 text-sm font-semibold min-w-[150px] text-center tabular-nums" style={{ color: 'var(--k-ink)' }}>
                  {monthLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="k-btn-icon"
                  title="Next Month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <button
                onClick={handleDownloadExcel}
                className="k-btn-primary flex items-center gap-2 text-sm"
              >
                <Download size={16} />
                <span>Download Excel</span>
              </button>
            </>
          }
        />

        <main className="flex-1 overflow-y-auto k-scroll">
          <Band tone="grey" eyebrow="Planning period" title={monthLabel}>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[...Array(5)].map((_, i) => <div key={i} className="k-skeleton h-[92px]" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <KpiCard index={0} label="Employees" value={summaryStats.employeeCount} icon={<Users />} accent />
                <KpiCard index={1} label="Clients" value={summaryStats.clientCount} icon={<Building2 />} />
                <KpiCard
                  index={2}
                  label="Total onsite days"
                  value={summaryStats.totalOnsite}
                  decimals={Number.isInteger(Math.round((summaryStats.totalOnsite + Number.EPSILON) * 100) / 100) ? 0 : 2}
                  icon={<Sun />}
                />
                <KpiCard
                  index={3}
                  label="Total offsite days"
                  value={summaryStats.totalOffsite}
                  decimals={Number.isInteger(Math.round((summaryStats.totalOffsite + Number.EPSILON) * 100) / 100) ? 0 : 2}
                  icon={<Moon />}
                />
                <KpiCard
                  index={4}
                  label="Total days"
                  value={summaryStats.totalDays}
                  decimals={Number.isInteger(Math.round((summaryStats.totalDays + Number.EPSILON) * 100) / 100) ? 0 : 2}
                  icon={<Sigma />}
                  accent
                />
              </div>
            )}
          </Band>

          <Band tone="white" title="Planning grid">
            <div className="k-card-static overflow-hidden">
              <div className="overflow-x-auto k-scroll">
                <table className="w-full border-collapse text-sm tabular-nums" style={{ minWidth: `${200 + clients.length * 200 + 300}px` }}>
                  <thead>
                    {/* Row 1: Client names spanning 2 columns each */}
                    <tr className="text-[10px] uppercase tracking-[0.14em]">
                      <th rowSpan={2} className="border px-3 py-3 text-left font-semibold w-16" style={headerCellStyle}>Sr No</th>
                      <th rowSpan={2} className="border px-3 py-3 text-left font-semibold min-w-40" style={headerCellStyle}>Name</th>
                      {clients.map((c) => (
                        <th key={c.id} colSpan={2} className="border px-3 py-3 text-center font-semibold" style={{ ...headerCellStyle, color: 'var(--k-grey-700)' }}>
                          {c.name}
                        </th>
                      ))}
                      <th colSpan={3} className="border px-3 py-3 text-center font-semibold" style={headerCellBlueStyle}>
                        Total
                      </th>
                    </tr>
                    {/* Row 2: OnSite Days / Offsite Days under each client */}
                    <tr className="text-[10px] uppercase tracking-[0.12em]">
                      {clients.map((c) => (
                        <React.Fragment key={`sub-${c.id}`}>
                          <th className="border px-2 py-2 text-center font-semibold" style={headerCellStyle}>OnSite Days</th>
                          <th className="border px-2 py-2 text-center font-semibold" style={headerCellStyle}>Offsite Days</th>
                        </React.Fragment>
                      ))}
                      <th className="border px-2 py-2 text-center font-semibold" style={headerCellBlueStyle}>Onsite Days</th>
                      <th className="border px-2 py-2 text-center font-semibold" style={headerCellBlueStyle}>Offsite Days</th>
                      <th className="border px-2 py-2 text-center font-semibold" style={headerCellBlueStyle}>Total Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx}>
                          <td colSpan={totalColSpan || 8} className="px-3 py-2 border" style={{ borderColor: 'var(--k-grey-100)' }}>
                            <div className="k-skeleton h-6 w-full" />
                          </td>
                        </tr>
                      ))
                    ) : employees.length > 0 ? (
                      <>
                        {employees.map((emp, index) => (
                          <motion.tr
                            key={emp.employee_id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="transition-colors"
                            style={{ background: 'var(--k-white)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--k-blue-tint)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--k-white)'; }}
                          >
                            <td className="border px-3 py-2 font-semibold" style={{ borderColor: 'var(--k-grey-100)', color: 'var(--k-grey-500)' }}>{index + 1}</td>
                            <td className="border px-3 py-2 font-semibold whitespace-nowrap" style={{ borderColor: 'var(--k-grey-100)', color: 'var(--k-ink)' }}>{emp.employee_name}</td>
                            {clients.map((c) => {
                              const pc = emp.per_client?.[c.id];
                              return (
                                <React.Fragment key={`${emp.employee_id}-${c.id}`}>
                                  <td className="border px-2 py-2 text-center font-medium" style={{ borderColor: 'var(--k-grey-100)', color: 'var(--k-grey-700)' }}>
                                    {formatDays(pc?.onsite_days)}
                                  </td>
                                  <td className="border px-2 py-2 text-center font-medium" style={{ borderColor: 'var(--k-grey-100)', color: 'var(--k-grey-700)' }}>
                                    {formatDays(pc?.offsite_days)}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                            <td className="border px-2 py-2 text-center font-semibold" style={{ borderColor: 'var(--k-grey-100)', color: 'var(--k-blue)', background: 'var(--k-blue-tint)' }}>
                              {formatDays(emp.total_onsite_days)}
                            </td>
                            <td className="border px-2 py-2 text-center font-semibold" style={{ borderColor: 'var(--k-grey-100)', color: 'var(--k-blue)', background: 'var(--k-blue-tint)' }}>
                              {formatDays(emp.total_offsite_days)}
                            </td>
                            <td className="border px-2 py-2" style={{ borderColor: 'var(--k-grey-100)', background: 'var(--k-blue-tint)' }}>
                              <div className="flex flex-col items-center gap-1 min-w-[72px]">
                                <span className="font-bold" style={{ color: 'var(--k-ink)' }}>{formatDays(emp.total_days)}</span>
                                <div className="k-bar-track w-full max-w-[64px]" style={{ height: 4 }}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(((Number(emp.total_days) || 0) / maxEmployeeDays) * 100, 100)}%` }}
                                    transition={{ delay: 0.2 + index * 0.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                    className="h-full rounded-full"
                                    style={{ background: 'var(--k-blue)' }}
                                  />
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        ))}

                        {/* Total row */}
                        <tr className="font-semibold" style={{ background: 'var(--k-band-grey)' }}>
                          <td className="border px-3 py-2" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-grey-500)' }}>-</td>
                          <td className="border px-3 py-2" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-ink)' }}>Total (All Employees)</td>
                          {clients.map((c) => (
                            <React.Fragment key={`total-${c.id}`}>
                              <td className="border px-2 py-2 text-center" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-grey-700)' }}>
                                {formatDaysNum(columnTotals.perClient[c.id]?.onsite)}
                              </td>
                              <td className="border px-2 py-2 text-center" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-grey-700)' }}>
                                {formatDaysNum(columnTotals.perClient[c.id]?.offsite)}
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="border px-2 py-2 text-center font-bold" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-blue)', background: 'var(--k-blue-tint)' }}>
                            {formatDaysNum(columnTotals.totalOnsite)}
                          </td>
                          <td className="border px-2 py-2 text-center font-bold" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-blue)', background: 'var(--k-blue-tint)' }}>
                            {formatDaysNum(columnTotals.totalOffsite)}
                          </td>
                          <td className="border px-2 py-2 text-center font-bold" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-blue)', background: 'var(--k-blue-tint)' }}>
                            {formatDaysNum(columnTotals.totalDays)}
                          </td>
                        </tr>

                        {/* Overall Days row */}
                        <tr className="font-bold" style={{ background: 'var(--k-ink)' }}>
                          <td className="border px-3 py-2" style={{ borderColor: 'var(--k-grey-700)' }}></td>
                          <td className="border px-3 py-2" style={{ borderColor: 'var(--k-grey-700)', color: 'var(--k-white)' }}>Overall Days</td>
                          {clients.map((c) => (
                            <React.Fragment key={`overall-${c.id}`}>
                              <td colSpan={2} className="border px-2 py-2 text-center" style={{ borderColor: 'var(--k-grey-700)', color: 'var(--k-white)' }}>
                                {formatDaysNum(overallPerClient[c.id])}
                              </td>
                            </React.Fragment>
                          ))}
                          <td className="border px-2 py-2 text-center" style={{ borderColor: 'var(--k-grey-700)', color: 'var(--k-grey-300)' }}>-</td>
                          <td className="border px-2 py-2 text-center" style={{ borderColor: 'var(--k-grey-700)', color: 'var(--k-grey-300)' }}>-</td>
                          <td className="border px-2 py-2 text-center" style={{ borderColor: 'var(--k-grey-700)', color: 'var(--k-white)', background: 'var(--k-blue)' }}>
                            {formatDaysNum(columnTotals.totalDays)}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td colSpan={totalColSpan} className="border px-4 py-12 text-center" style={{ borderColor: 'var(--k-grey-100)' }}>
                          <div className="flex flex-col items-center gap-3">
                            <img src="/kayaara-mark.png" alt="" className="w-12 h-12 opacity-70" />
                            <p className="text-sm font-semibold" style={{ color: 'var(--k-ink)' }}>No DDTME records found for the selected month</p>
                            <p className="text-xs" style={{ color: 'var(--k-grey-500)' }}>Try a different month using the arrows above.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {errorMessage ? (
              <p className="mt-4 text-sm font-semibold rounded-xl px-4 py-3" style={{ color: 'var(--k-ink)', background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)' }}>
                {errorMessage}
              </p>
            ) : null}
          </Band>

          <footer className="k-band-grey px-5 md:px-8 py-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
            <span className="text-[11px]" style={{ color: 'var(--k-grey-500)' }}>
              Kayaara PMS · Innovating beyond systems
            </span>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--k-blue)' }}>
              Kayaara Innovations Pvt Ltd
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default MandaysPlanning;
