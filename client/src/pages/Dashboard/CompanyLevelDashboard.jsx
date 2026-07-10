import React, { useState, useEffect, useMemo } from 'react';
import {
    Calendar,
    LayoutGrid,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Clock,
    BarChart3,
    CheckSquare,
    Award
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { getCachedData } from '../../utils/apiCache';
import Sidebar from '../../components/Sidebar';
import AnimatedNumber from '../../components/kayaara/AnimatedNumber';
import KpiCard from '../../components/kayaara/KpiCard';
import { Band, PageHeader } from '../../components/kayaara/Band';

const CompanyLevelDashboard = () => {
    const [userName, setUserName] = useState('');
    const [clients, setClients] = useState([]);
    const [selectedClients, setSelectedClients] = useState(['All Tasks']);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showDateFilter, setShowDateFilter] = useState(false);

    const [allTasks, setAllTasks] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);


    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [userRes, clientsRes, tasksRes] = await Promise.all([
                    getCachedData('me/'),
                    getCachedData('clients/list/'),
                    api.get('tasks/company-dashboard-tasks/')
                ]);

                setUserName(userRes.data?.full_name || userRes.data?.username || 'User');

                const clientList = Array.isArray(clientsRes.data)
                    ? clientsRes.data
                    : (clientsRes.data.results || []);
                setClients(clientList);

                const taskList = Array.isArray(tasksRes.data)
                    ? tasksRes.data
                    : (tasksRes.data.results || []);
                setAllTasks(taskList);

                try {
                    const employeesRes = await api.get('admin/users/');
                    const allUsers = Array.isArray(employeesRes.data)
                        ? employeesRes.data
                        : (employeesRes.data.results || []);

                    const allowedRoles = ['sgm', 'employee'];
                    const employeeList = allUsers.filter(u =>
                        u.role && allowedRoles.includes(u.role.toLowerCase())
                    );

                    setAllEmployees(employeeList);
                } catch (employeeError) {
                    console.warn('Failed to fetch employee directory for company table:', employeeError);
                    setAllEmployees([]);
                }

                setLoading(false);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Calculation Logic
    const filteredDashboardStats = useMemo(() => {
        const normalizeText = (value) => String(value || "").trim().toLowerCase();
        const truncateToOneDecimal = (value) => Math.trunc(value * 10) / 10;
        const selectedClientSet = new Set(selectedClients.map(normalizeText));

        const isTaskInDateRange = (task) => {
            if (!startDate && !endDate) return true;
            const taskDate = task.target_date || task.completion_date || task.created_at;
            if (!taskDate) return false;
            const date = new Date(taskDate);
            if (startDate) {
                const start = new Date(startDate);
                if (date < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                if (date > end) return false;
            }
            return true;
        };

        const isClientSelected = (task) => {
            if (selectedClients.includes('All Tasks')) return true;
            const clientName = task.client_name || task.client_org_name || task.client || "Unknown Client";
            return selectedClientSet.has(normalizeText(clientName));
        };

        const filtered = allTasks.filter(t => isTaskInDateRange(t) && isClientSelected(t));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const parseDateOnly = (value) => {
            if (!value) return null;
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return null;
            d.setHours(0, 0, 0, 0);
            return d;
        };

        const getTaskBucket = (task) => {
            const status = normalizeText(task.status);

            if (status.includes("progress")) return "inProgress";
            if (status.includes("overdue")) return "overdue";
            if (status.includes("delay") || status.includes("late")) return "delayed";
            if (status.includes("on time") || status.includes("completed")) return "onTime";

            const targetDate = parseDateOnly(task.target_date);
            const completionDate = parseDateOnly(task.completion_date);

            if (completionDate && targetDate) {
                return completionDate <= targetDate ? "onTime" : "delayed";
            }
            if (completionDate) return "onTime";
            if (targetDate && targetDate < today) return "overdue";
            return "inProgress";
        };

        const toNumber = (value) => {
            const num = Number(value);
            return Number.isFinite(num) ? num : 0;
        };

        const bucketedTasks = filtered.map((task) => ({ task, bucket: getTaskBucket(task) }));

        const totalTasks = bucketedTasks.length;
        const inProgressCount = bucketedTasks.filter(({ bucket }) => bucket === "inProgress").length;
        const delayedTasks = bucketedTasks.filter(({ bucket }) => bucket === "delayed");
        const delayedCount = delayedTasks.length;
        const overdueCount = bucketedTasks.filter(({ bucket }) => bucket === "overdue").length;
        const onTimeCount = bucketedTasks.filter(({ bucket }) => bucket === "onTime").length;

        const nonInProgressTotal = totalTasks - inProgressCount;
        const otcPercentage = nonInProgressTotal > 0
            ? truncateToOneDecimal((onTimeCount / nonInProgressTotal) * 100)
            : 0;

        // ATS formula: On Time = 100 each, Delayed = task ATS%, Overdue = 0, In Progress excluded.
        const delayedAtsSum = delayedTasks.reduce((sum, { task }) => sum + toNumber(task.ats_score), 0);
        const onTimeAtsSum = onTimeCount * 100;
        const overdueAtsSum = 0;
        const atsNumerator = onTimeAtsSum + delayedAtsSum + overdueAtsSum;
        const atsScore = nonInProgressTotal > 0
            ? Number((atsNumerator / nonInProgressTotal).toFixed(1))
            : 0;

        const getEmployeeDisplayName = (user) => {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            return fullName || user.full_name || user.username || user.email || `Employee ${user.id}`;
        };

        const employeeStatsMap = new Map(
            allEmployees.map((employee) => [
                employee.id,
                {
                    employeeId: employee.id,
                    employeeName: getEmployeeDisplayName(employee),
                    totalTasks: 0,
                    onTime: 0,
                    delayed: 0,
                    overdue: 0,
                    inProgress: 0,
                    delayedAtsSum: 0,
                }
            ])
        );

        const shouldFallbackToTaskDerivedRows = allEmployees.length === 0;

        bucketedTasks.forEach(({ task, bucket }) => {
            const employeeId = task.assigned_to ?? task.assigned_to_id ?? task.id;
            const employeeName = task.assigned_to_name || task.assigned_to_full_name || `Employee ${employeeId}`;

            if (!employeeStatsMap.has(employeeId)) {
                if (!shouldFallbackToTaskDerivedRows) {
                    return;
                }

                employeeStatsMap.set(employeeId, {
                    employeeId,
                    employeeName,
                    totalTasks: 0,
                    onTime: 0,
                    delayed: 0,
                    overdue: 0,
                    inProgress: 0,
                    delayedAtsSum: 0,
                });
            }

            const employeeStats = employeeStatsMap.get(employeeId);
            employeeStats.totalTasks += 1;

            if (bucket === "onTime") employeeStats.onTime += 1;
            if (bucket === "delayed") {
                employeeStats.delayed += 1;
                employeeStats.delayedAtsSum += toNumber(task.ats_score);
            }
            if (bucket === "overdue") employeeStats.overdue += 1;
            if (bucket === "inProgress") employeeStats.inProgress += 1;
        });

        const performerRows = Array.from(employeeStatsMap.values())
            .map((employeeStats) => {
                const nonInProgress = employeeStats.totalTasks - employeeStats.inProgress;
                const atcScore = nonInProgress > 0
                    ? truncateToOneDecimal(((employeeStats.onTime * 100) + employeeStats.delayedAtsSum) / nonInProgress)
                    : 0;

                return {
                    employeeId: employeeStats.employeeId,
                    employeeName: employeeStats.employeeName,
                    totalTasks: employeeStats.totalTasks,
                    onTime: employeeStats.onTime,
                    delayed: employeeStats.delayed,
                    overdue: employeeStats.overdue,
                    inProgress: employeeStats.inProgress,
                    atcScore,
                };
            })
            .sort((a, b) => {
                if (b.atcScore !== a.atcScore) return b.atcScore - a.atcScore;
                if (b.onTime !== a.onTime) return b.onTime - a.onTime;
                if (b.totalTasks !== a.totalTasks) return b.totalTasks - a.totalTasks;
                return a.employeeName.localeCompare(b.employeeName);
            });

        return {
            totalTasks,
            onTimeCompletion: onTimeCount,
            overdue: overdueCount,
            inProgress: inProgressCount,
            delayed: delayedCount,
            atsScore,
            otcPercentage,
            performerRows,
        };
    }, [allTasks, allEmployees, selectedClients, startDate, endDate]);

    const { performerRows, ...stats } = filteredDashboardStats;

    // Strict 3-color chart: blue family + ink + grey only
    const chartData = [
        { name: 'On Time', value: stats.onTimeCompletion, color: '#0086ff' },
        { name: 'Delayed', value: stats.delayed, color: '#66b6ff' },
        { name: 'Overdue', value: stats.overdue, color: '#17181a' },
    ];

    const appliedDateLabel = useMemo(() => {
        const formatDateLabel = (value) => {
            if (!value) return '';
            const parsed = new Date(value);
            if (Number.isNaN(parsed.getTime())) return value;
            return parsed.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        };

        if (startDate && endDate) {
            return `${formatDateLabel(startDate)} to ${formatDateLabel(endDate)}`;
        }
        if (startDate) {
            return `From ${formatDateLabel(startDate)}`;
        }
        if (endDate) {
            return `Until ${formatDateLabel(endDate)}`;
        }
        return '';
    }, [startDate, endDate]);

    const hasChartData = chartData.some((item) => item.value > 0);
    const chartDataForRender = hasChartData
        ? chartData
        : [{ name: 'No Data', value: 1, color: '#c9cdd3' }];

    const handleToggleClient = (clientName) => {
        if (clientName === 'All Tasks') {
            setSelectedClients(['All Tasks']);
        } else {
            let newSelected = selectedClients.filter(c => c !== 'All Tasks');
            if (newSelected.includes(clientName)) {
                newSelected = newSelected.filter(c => c !== clientName);
                if (newSelected.length === 0) newSelected = ['All Tasks'];
            } else {
                newSelected.push(clientName);
            }
            setSelectedClients(newSelected);
        }
    };

    const maxAtc = Math.max(...performerRows.map(r => r.atcScore), 100);

    // Tilt-lite hover handlers for KPI cards (transform-only, no layout/reflow cost)
    const handleKpiTilt = (e) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width - 0.5;
        const py = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(600px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translateY(-4px)`;
    };
    const resetKpiTilt = (e) => {
        e.currentTarget.style.transform = '';
    };

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
            <style>{`
                @keyframes k-top-glow-pulse {
                    0%, 100% { box-shadow: inset 0 0 0 0 rgba(0,134,255,0); }
                    50% { box-shadow: inset 0 0 24px 0 rgba(0,134,255,0.16); }
                }
                .k-top-performer-glow td:first-child { position: relative; }
                .k-top-performer-glow { animation: k-top-glow-pulse 3.2s ease-in-out infinite; }
                @media (prefers-reduced-motion: reduce) {
                    .k-top-performer-glow { animation: none !important; }
                }
            `}</style>
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">

                <PageHeader
                    title="Company"
                    accent="Dashboard"
                    subtitle={`Welcome back, ${userName || '—'}`}
                    live
                    actions={
                        <>
                            <span className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium" style={{ color: 'var(--k-grey-500)' }}>
                                <span className="k-live-dot" style={{ width: 6, height: 6 }} />
                                Updated just now
                            </span>
                            {appliedDateLabel ? (
                                <span
                                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                                    style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                                >
                                    {appliedDateLabel}
                                </span>
                            ) : null}
                            <button onClick={() => setShowDateFilter(true)} className="k-btn-primary flex items-center gap-2 text-sm">
                                <Calendar size={15} />
                                Date filter
                            </button>
                            <button
                                onClick={() => {
                                    setStartDate('');
                                    setEndDate('');
                                    setSelectedClients(['All Tasks']);
                                }}
                                className="k-btn-ghost text-sm"
                            >
                                Reset
                            </button>
                        </>
                    }
                />

                <main className="flex-1 overflow-y-auto k-scroll">

                    <Band tone="grey" eyebrow="Overview">
                        {loading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                                {[...Array(6)].map((_, i) => <div key={i} className="k-skeleton h-[92px]" />)}
                            </div>
                        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                                {[
                                    { index: 0, label: 'Total task', value: stats.totalTasks, icon: <LayoutGrid />, accent: true },
                                    { index: 1, label: 'On time', value: stats.onTimeCompletion, icon: <CheckCircle2 />, accent: true },
                                    { index: 2, label: 'In progress', value: stats.inProgress, icon: <TrendingUp /> },
                                    { index: 3, label: 'Delayed', value: stats.delayed, icon: <Clock /> },
                                    { index: 4, label: 'Overdue', value: stats.overdue, icon: <AlertCircle /> },
                                    { index: 5, label: 'ATS score', value: stats.atsScore, icon: <Award />, suffix: '%', decimals: 1, accent: true },
                                ].map((kpi) => (
                                    <div
                                        key={kpi.index}
                                        onMouseMove={handleKpiTilt}
                                        onMouseLeave={resetKpiTilt}
                                        style={{ transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)', willChange: 'transform' }}
                                    >
                                        <KpiCard {...kpi} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </Band>

                    <Band tone="white">
                        <div className="grid grid-cols-12 gap-4">

                            <motion.div
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                                className="col-span-12 lg:col-span-7 k-card-grey p-5"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <h2 className="k-section-title">Task distribution</h2>
                                    <span
                                        className="flex items-center justify-center w-8 h-8 rounded-lg"
                                        style={{ background: 'var(--k-white)', color: 'var(--k-blue)' }}
                                    >
                                        <BarChart3 size={15} />
                                    </span>
                                </div>

                                <div className="h-[230px] relative flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartDataForRender}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={62}
                                                outerRadius={92}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                                animationBegin={150}
                                                animationDuration={1100}
                                                animationEasing="ease-out"
                                                isAnimationActive
                                            >
                                                {chartDataForRender.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--k-grey-200)',
                                                    boxShadow: '0 12px 32px -12px rgba(0,134,255,0.25)',
                                                    fontFamily: 'Poppins, sans-serif',
                                                    fontSize: '12px'
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="k-eyebrow">OTC</span>
                                        <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--k-blue)' }}>
                                            <AnimatedNumber value={stats.otcPercentage} decimals={1} suffix="%" />
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-center gap-5 mt-1">
                                    {chartData.map((d) => (
                                        <span key={d.name} className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--k-grey-700)' }}>
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                                            {d.name}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="col-span-12 lg:col-span-5 k-card-grey p-5"
                            >
                                <h2 className="k-section-title mb-4">Client filter</h2>
                                <div className="space-y-1 max-h-[250px] overflow-y-auto k-scroll pr-2">
                                    {['All Tasks', ...clients.map(c => c.company_name)].map((name, i) => {
                                        const checked = selectedClients.includes(name);
                                        return (
                                            <motion.label
                                                key={name + i}
                                                initial={{ opacity: 0, x: -12 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.25 + i * 0.04 }}
                                                className="k-press relative flex items-center gap-3 cursor-pointer group rounded-lg px-2.5 py-2"
                                            >
                                                {checked && (
                                                    <motion.span
                                                        layoutId="client-filter-highlight"
                                                        className="absolute inset-0 rounded-lg"
                                                        style={{ background: 'var(--k-blue-tint)' }}
                                                        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                                                    />
                                                )}
                                                <input
                                                    type="checkbox"
                                                    className="peer hidden"
                                                    checked={checked}
                                                    onChange={() => handleToggleClient(name)}
                                                />
                                                <span
                                                    className="relative w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0"
                                                    style={{
                                                        borderColor: checked ? 'var(--k-blue)' : 'var(--k-grey-300)',
                                                        background: checked ? 'var(--k-blue)' : 'var(--k-white)'
                                                    }}
                                                >
                                                    {checked && <CheckSquare size={12} color="#ffffff" />}
                                                </span>
                                                <span
                                                    className="relative text-sm font-medium truncate transition-colors"
                                                    style={{ color: checked ? 'var(--k-blue)' : 'var(--k-grey-700)' }}
                                                >
                                                    {name}
                                                </span>
                                            </motion.label>
                                        );
                                    })}
                                </div>
                            </motion.div>

                        </div>
                    </Band>

                    <Band
                        tone="grey"
                        title="Employee performance"
                        actions={performerRows[0] ? (
                            <span
                                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                                style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                            >
                                <Award size={13} />
                                Top performer · {performerRows[0].employeeName}
                            </span>
                        ) : null}
                    >
                        <div className="k-card !rounded-2xl overflow-hidden hover:!transform-none">
                            <div className="overflow-x-auto k-scroll">
                                <table className="min-w-full border-separate border-spacing-0">
                                    <thead>
                                        <tr style={{ background: 'var(--k-band-grey)' }}>
                                            {['#', 'Employee', 'Total task', 'On time', 'Delayed', 'Overdue', 'In progress', 'ATC score'].map((h, i) => (
                                                <th
                                                    key={h}
                                                    className={`k-eyebrow px-4 py-3 border-b ${i > 1 ? 'text-right' : 'text-left'}`}
                                                    style={{ borderColor: 'var(--k-grey-200)' }}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performerRows.length > 0 ? performerRows.map((row, index) => (
                                            <motion.tr
                                                key={row.employeeId}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.05 + index * 0.05, duration: 0.4 }}
                                                className={`group transition-colors ${index === 0 ? 'k-top-performer-glow' : ''}`}
                                                style={{ background: index === 0 ? 'var(--k-blue-tint)' : 'var(--k-white)' }}
                                            >
                                                <td className="px-4 py-3 text-sm font-semibold border-b" style={{ color: 'var(--k-grey-500)', borderColor: 'var(--k-grey-100)' }}>{index + 1}</td>
                                                <td className="px-4 py-3 text-sm font-semibold border-b" style={{ color: 'var(--k-ink)', borderColor: 'var(--k-grey-100)' }}>
                                                    {row.employeeName}
                                                    {index === 0 ? (
                                                        <span
                                                            className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                                                            style={{ background: 'var(--k-blue)', color: 'var(--k-white)' }}
                                                        >
                                                            Top
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right tabular-nums border-b" style={{ color: 'var(--k-grey-700)', borderColor: 'var(--k-grey-100)' }}>{row.totalTasks}</td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums border-b" style={{ color: 'var(--k-blue)', borderColor: 'var(--k-grey-100)' }}>{row.onTime}</td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums border-b" style={{ color: 'var(--k-blue-light)', borderColor: 'var(--k-grey-100)' }}>{row.delayed}</td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums border-b" style={{ color: 'var(--k-ink)', borderColor: 'var(--k-grey-100)' }}>{row.overdue}</td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold tabular-nums border-b" style={{ color: 'var(--k-grey-500)', borderColor: 'var(--k-grey-100)' }}>{row.inProgress}</td>
                                                <td className="px-4 py-3 border-b" style={{ borderColor: 'var(--k-grey-100)' }}>
                                                    <div className="flex items-center justify-end gap-2 min-w-[130px]">
                                                        <div className="flex-1 max-w-[70px] h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--k-grey-100)' }}>
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${Math.min((row.atcScore / maxAtc) * 100, 100)}%` }}
                                                                transition={{ delay: 0.3 + index * 0.05, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                                                                className="h-full rounded-full"
                                                                style={{ background: 'var(--k-blue)' }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--k-ink)' }}>
                                                            {row.atcScore.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-10 text-center text-sm font-medium" style={{ color: 'var(--k-grey-500)' }}>
                                                    No employee task data for the selected filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Band>

                    {/* ── BAND 5 · WHITE · Footer strip ────────────────── */}
                    <footer className="k-band-white px-5 md:px-8 py-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
                        <span className="text-[11px]" style={{ color: 'var(--k-grey-500)' }}>
                            Kayaara PMS · Innovating beyond systems
                        </span>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--k-blue)' }}>
                            Kayaara Innovations Pvt Ltd
                        </span>
                    </footer>
                </main>
            </div>

            {/* Date filter modal */}
            <AnimatePresence>
                {showDateFilter && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        style={{ background: 'rgba(23,24,26,0.45)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setShowDateFilter(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0, y: 16 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.92, opacity: 0, y: 16 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="w-full max-w-md rounded-3xl p-6 md:p-8"
                            style={{ background: 'var(--k-white)', border: '1px solid var(--k-grey-200)' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold mb-6" style={{ color: 'var(--k-ink)' }}>
                                Filter by <span style={{ color: 'var(--k-blue)' }}>date</span>
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="k-eyebrow mb-1.5 block">Start date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full rounded-xl px-4 py-3 font-medium text-sm focus:outline-none transition-all"
                                        style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)', color: 'var(--k-grey-700)' }}
                                        onFocus={e => e.target.style.borderColor = 'var(--k-blue)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--k-grey-200)'}
                                    />
                                </div>
                                <div>
                                    <label className="k-eyebrow mb-1.5 block">End date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full rounded-xl px-4 py-3 font-medium text-sm focus:outline-none transition-all"
                                        style={{ background: 'var(--k-band-grey)', border: '1px solid var(--k-grey-200)', color: 'var(--k-grey-700)' }}
                                        onFocus={e => e.target.style.borderColor = 'var(--k-blue)'}
                                        onBlur={e => e.target.style.borderColor = 'var(--k-grey-200)'}
                                    />
                                </div>
                            </div>
                            <div className="mt-8 flex flex-col sm:flex-row gap-3">
                                <button onClick={() => setShowDateFilter(false)} className="k-btn-ghost flex-1">
                                    Cancel
                                </button>
                                <button onClick={() => setShowDateFilter(false)} className="k-btn-primary flex-1">
                                    Apply filter
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CompanyLevelDashboard;
