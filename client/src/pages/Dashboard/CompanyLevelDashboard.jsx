import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    RotateCcw,
    LayoutGrid,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Clock,
    BarChart3,
    PieChart as PieChartIcon,
    CheckSquare
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import Sidebar from '../../components/Sidebar';

const CompanyLevelDashboard = () => {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [clients, setClients] = useState([]);
    const [selectedClients, setSelectedClients] = useState(['All Tasks']);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showDateFilter, setShowDateFilter] = useState(false);

    const [allTasks, setAllTasks] = useState([]);
    const [allEmployees, setAllEmployees] = useState([]);
    const [stats, setStats] = useState({
        totalTasks: 0,
        onTimeCompletion: 0,
        overdue: 0,
        inProgress: 0,
        delayed: 0,
        atsScore: 0,
        otcPercentage: 0
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [userRes, clientsRes, tasksRes] = await Promise.all([
                    api.get('me/'),
                    api.get('clients/list/'),
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

    useEffect(() => {
        const { performerRows, ...summaryStats } = filteredDashboardStats;
        setStats(summaryStats);
    }, [filteredDashboardStats]);

    const performerRows = filteredDashboardStats.performerRows || [];

    const chartData = [
        { name: 'On Time', value: stats.onTimeCompletion, color: '#22c55e' },
        { name: 'Delayed', value: stats.delayed, color: '#facc15' },
        { name: 'Overdue', value: stats.overdue, color: '#ef4444' },
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
        : [{ name: 'No Data', value: 1, color: '#e2e8f0' }];

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

    const MetricCard = ({ label, value, icon, color }) => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200 rounded-xl md:rounded-2xl shadow-sm px-4 py-2.5 flex flex-col transition-all hover:translate-y-[-2px] hover:shadow-lg"
            style={{ borderLeft: `4px solid ${color}` }}
        >
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
            <div className="flex justify-between items-end mt-1">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900">{value}</h2>
                <div className="text-slate-200 opacity-50">
                    {React.cloneElement(icon, { size: 16 })}
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="flex h-screen bg-[#f8fafc] overflow-hidden">
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Premium Header */}
                <header className="bg-[#111827] text-white p-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0 shadow-2xl z-10 mx-4 mt-4 rounded-xl">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-medium hover:text-slate-300 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>

                    <h1 className="text-xl font-black tracking-tight text-[#f97316]">
                        Company Level Dashboard
                    </h1>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowDateFilter(!showDateFilter)}
                            className="bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-slate-50 transition-all active:scale-95"
                        >
                            <Calendar size={16} />
                            Date Filter
                        </button>
                        {appliedDateLabel ? (
                            <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                                {appliedDateLabel}
                            </span>
                        ) : null}
                        <button
                            onClick={() => {
                                setStartDate('');
                                setEndDate('');
                                setSelectedClients(['All Tasks']);
                            }}
                            className="bg-slate-700/50 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition-all active:scale-95 border border-white/10"
                        >
                            Reset
                        </button>
                    </div>
                </header>

                {/* Dashboard Content */}
                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="grid grid-cols-12 gap-6">

                        {/* Client Filter Section */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="col-span-12 lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm text-center"
                        >
                            <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 text-left">Client Filter</h2>
                            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar text-left">
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            className="peer hidden"
                                            checked={selectedClients.includes('All Tasks')}
                                            onChange={() => handleToggleClient('All Tasks')}
                                        />
                                        <div className="w-5 h-5 border-2 border-slate-200 rounded peer-checked:bg-slate-800 peer-checked:border-slate-800 transition-all group-hover:border-slate-400"></div>
                                        <CheckSquare size={14} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                    <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">All Tasks</span>
                                </label>

                                {clients.map(client => (
                                    <label key={client.id} className="flex items-center gap-3 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="peer hidden"
                                                checked={selectedClients.includes(client.company_name)}
                                                onChange={() => handleToggleClient(client.company_name)}
                                            />
                                            <div className="w-5 h-5 border-2 border-slate-200 rounded peer-checked:bg-slate-800 peer-checked:border-slate-800 transition-all group-hover:border-slate-400"></div>
                                            <CheckSquare size={14} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                        </div>
                                        <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors truncate">{client.company_name}</span>
                                    </label>
                                ))}
                            </div>
                        </motion.div>

                        {/* Task Distribution Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
                        >
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Task Distribution</h2>
                                <div className="p-2 bg-slate-50 rounded-lg text-[#f97316]">
                                    <BarChart3 size={16} />
                                </div>
                            </div>

                            <div className="h-[220px] relative flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartDataForRender}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={4}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {chartDataForRender.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>

                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">OTC</span>
                                    <span className="text-3xl font-black text-slate-900">{stats.otcPercentage.toFixed(1)}%</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Metrics Grid Section */}
                        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-3 md:gap-4">
                            <MetricCard
                                label="Total Task"
                                value={stats.totalTasks}
                                icon={<LayoutGrid />}
                                color="#6366f1"
                            />
                            <MetricCard
                                label="On Time Completion"
                                value={stats.onTimeCompletion}
                                icon={<CheckCircle2 />}
                                color="#22c55e"
                            />
                            <MetricCard
                                label="Overdue"
                                value={stats.overdue}
                                icon={<AlertCircle />}
                                color="#ef4444"
                            />
                            <MetricCard
                                label="In Progress"
                                value={stats.inProgress}
                                icon={<TrendingUp />}
                                color="#3b82f6"
                            />
                            <MetricCard
                                label="Delayed"
                                value={stats.delayed}
                                icon={<Clock />}
                                color="#eab308"
                            />
                            <MetricCard
                                label="ATS Score"
                                value={`${stats.atsScore}%`}
                                icon={<TrendingUp />}
                                color="#a855f7"
                            />
                        </div>

                        {/* Team Performance Table */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="col-span-12 bg-white rounded-2xl border border-slate-200 shadow-sm p-4"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Employee Performance Table</h2>
                                <span className="text-xs font-bold text-slate-500">
                                    Top Performer: {performerRows[0]?.employeeName || 'N/A'}
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full border-separate border-spacing-0">
                                    <thead>
                                        <tr>
                                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-slate-200">#</th>
                                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-slate-200">Employee</th>
                                            <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-slate-200">Total Task</th>
                                            <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-slate-200">On Time</th>
                                            <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-slate-200">Delayed</th>
                                            <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-slate-200">Overdue</th>
                                            <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-slate-200">In Progress</th>
                                            <th className="text-right text-[10px] font-black uppercase tracking-widest text-slate-500 px-3 py-2 border-b border-slate-200">ATC Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {performerRows.length > 0 ? performerRows.map((row, index) => (
                                            <tr
                                                key={row.employeeId}
                                                className={index === 0 ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}
                                            >
                                                <td className="px-3 py-2 text-sm font-bold text-slate-700 border-b border-slate-100">{index + 1}</td>
                                                <td className="px-3 py-2 text-sm font-semibold text-slate-800 border-b border-slate-100">
                                                    {row.employeeName}
                                                    {index === 0 ? (
                                                        <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                                            Top
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-right text-slate-700 border-b border-slate-100">{row.totalTasks}</td>
                                                <td className="px-3 py-2 text-sm text-right text-emerald-700 font-bold border-b border-slate-100">{row.onTime}</td>
                                                <td className="px-3 py-2 text-sm text-right text-amber-700 font-bold border-b border-slate-100">{row.delayed}</td>
                                                <td className="px-3 py-2 text-sm text-right text-rose-700 font-bold border-b border-slate-100">{row.overdue}</td>
                                                <td className="px-3 py-2 text-sm text-right text-blue-700 font-bold border-b border-slate-100">{row.inProgress}</td>
                                                <td className="px-3 py-2 text-sm text-right text-violet-700 font-black border-b border-slate-100">{row.atcScore.toFixed(1)}%</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={8} className="px-3 py-8 text-center text-sm font-medium text-slate-500">
                                                    No employee task data available for selected filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>

                    </div>
                </main>
            </div>

            {/* Date Filter Modal */}
            <AnimatePresence>
                {showDateFilter && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDateFilter(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-3xl p-6 md:p-8 shadow-2xl w-full max-w-md border border-slate-100"
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 className="text-xl font-black text-slate-800 mb-6">Filter by Date</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Start Date</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-slate-800 transition-all font-bold text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">End Date</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:border-slate-800 transition-all font-bold text-slate-700"
                                    />
                                </div>
                            </div>
                            <div className="mt-8 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setShowDateFilter(false)}
                                    className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black hover:bg-slate-200 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setShowDateFilter(false)}
                                    className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-black hover:bg-slate-900 transition-all shadow-lg active:scale-95 shadow-slate-900/20"
                                >
                                    Apply Filter
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
        </div>
    );
};

export default CompanyLevelDashboard;
