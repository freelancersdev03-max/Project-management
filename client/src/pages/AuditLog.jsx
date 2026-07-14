import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Calendar, Download, ShieldAlert, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Band, PageHeader } from '../components/kayaara/Band';
import api from '../api';

const AuditLog = () => {
    const navigate = useNavigate();

    // Data & loading
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('ALL');
    const [filterAction, setFilterAction] = useState('ALL');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 25;

    useEffect(() => {
        const userRole = (localStorage.getItem('role') || '').toUpperCase();
        if (userRole !== 'ADMIN') {
            navigate('/');
        }
    }, [navigate]);

    // ─── Fetch audit logs ───
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page: currentPage, page_size: pageSize };
            if (searchTerm.trim()) params.search = searchTerm.trim();
            if (filterRole !== 'ALL') params.user_role = filterRole;
            if (filterAction !== 'ALL') params.action = filterAction;

            const res = await api.get('/admin/audit-logs/', { params });
            setLogs(res.data.results || []);
            setTotalCount(res.data.count || 0);
        } catch (err) {
            console.error('[AuditLog] fetch error:', err);
            setLogs([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, filterRole, filterAction]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Debounced search
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    // When filters change, reset to page 1
    const handleRoleChange = (val) => { setFilterRole(val); setCurrentPage(1); };
    const handleActionChange = (val) => { setFilterAction(val); setCurrentPage(1); };

    // Pagination
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    // Format date helper
    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };

    // Action display helper
    const formatAction = (action) => {
        return action.replace(/_/g, ' ');
    };

    // Status Badge Component
    const StatusBadge = ({ status }) => {
        if (status === 'success') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 text-green-700 text-[10px] font-black uppercase tracking-widest border border-green-200">
                    <CheckCircle size={12} /> Success
                </span>
            );
        }
        if (status === 'failed') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest border border-red-200">
                    <XCircle size={12} /> Failed
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-200">
                <ShieldAlert size={12} /> Warning
            </span>
        );
    };

    // CSV export
    const handleExportCSV = () => {
        if (!logs.length) return;
        const headers = ['Timestamp', 'User', 'Role', 'Action', 'Details', 'Status', 'IP Address'];
        const rows = logs.map(log => [
            formatDate(log.timestamp),
            log.user_display,
            log.user_role,
            log.action,
            `"${(log.details || '').replace(/"/g, '""')}"`,
            log.status,
            log.ip_address || '',
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-screen w-screen relative flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
            <Sidebar />

            <main className="flex-1 overflow-y-auto k-scroll">

                {/* ===== HEADER ===== */}
                <div className="bg-white z-20 sticky top-0">
                    <PageHeader
                        title="Activity"
                        accent="Audit Log"
                        subtitle="Monitor system events, user actions, and security alerts in real-time."
                        live
                        actions={
                            <>
                                <button
                                    onClick={handleExportCSV}
                                    className="k-btn-ghost flex items-center gap-2 text-xs border border-[var(--k-grey-200)]"
                                >
                                    <Download size={14} /> Export CSV
                                </button>
                                <button
                                    onClick={fetchLogs}
                                    className="k-btn-primary flex items-center gap-2 text-xs"
                                >
                                    <Clock size={14} /> Refresh
                                </button>
                            </>
                        }
                    />
                </div>

                <Band tone="grey">
                    {/* FILTERS SECTION */}
                    <div className="k-card-static !p-4 mb-4 flex flex-col md:flex-row md:items-center gap-4 border border-[var(--k-grey-200)] bg-white z-10 relative">
                        <div className="flex-1 min-w-[240px] relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--k-grey-400)]" />
                            <input
                                type="text"
                                placeholder="Search user, action, or details..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="k-input w-full !py-2 !text-sm"
                                style={{ paddingLeft: '2.4rem' }}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 relative">
                                <Filter size={14} className="text-[var(--k-grey-500)] absolute left-3 z-10" />
                                <select
                                    value={filterRole}
                                    onChange={(e) => handleRoleChange(e.target.value)}
                                    className="k-input !py-2 !text-sm font-semibold min-w-[140px] cursor-pointer"
                                    style={{ paddingLeft: '2.4rem' }}
                                >
                                    <option value="ALL">All Roles</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="KAYAARA">Kayaara</option>
                                    <option value="MLS">MLS</option>
                                    <option value="SGM">SGM</option>
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="CLIENT">Client</option>
                                    <option value="EXTERNAL">External</option>
                                    <option value="SENIOR">Senior</option>
                                    <option value="SYSTEM">System</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2 relative">
                                <Calendar size={14} className="text-[var(--k-grey-500)] absolute left-3 z-10" />
                                <select
                                    value={filterAction}
                                    onChange={(e) => handleActionChange(e.target.value)}
                                    className="k-input !py-2 !text-sm font-semibold min-w-[160px] cursor-pointer"
                                    style={{ paddingLeft: '2.4rem' }}
                                >
                                    <option value="ALL">All Actions</option>
                                    <option value="USER_LOGIN">Login</option>
                                    <option value="USER_LOGOUT">Logout</option>
                                    <option value="FAILED_LOGIN">Failed Login</option>
                                    <option value="PASSWORD_CHANGED">Password Changed</option>
                                    <option value="TASK_CREATED">Task Created</option>
                                    <option value="TASK_UPDATED">Task Updated</option>
                                    <option value="TASK_DELETED">Task Deleted</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* TABLE SECTION */}
                    <div className="flex-1 min-h-[400px] k-card-static !p-0 border border-[var(--k-grey-200)] bg-white overflow-hidden flex flex-col">
                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[var(--k-band-grey)] z-10">
                                    <tr>
                                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--k-grey-500)] border-b border-[var(--k-grey-200)]">Timestamp</th>
                                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--k-grey-500)] border-b border-[var(--k-grey-200)]">User & Role</th>
                                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--k-grey-500)] border-b border-[var(--k-grey-200)]">Action / Event</th>
                                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--k-grey-500)] border-b border-[var(--k-grey-200)]">Details</th>
                                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--k-grey-500)] border-b border-[var(--k-grey-200)]">IP Address</th>
                                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--k-grey-500)] border-b border-[var(--k-grey-200)]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--k-grey-100)]">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 size={28} className="animate-spin text-[var(--k-blue)]" />
                                                    <span className="text-sm font-semibold text-[var(--k-grey-400)]">Loading audit logs...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <ShieldAlert size={32} className="text-[var(--k-grey-300)]" />
                                                    <span className="text-sm font-bold text-[var(--k-grey-400)]">No audit logs found</span>
                                                    <span className="text-xs text-[var(--k-grey-400)]">Try adjusting your filters or search criteria.</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-[var(--k-blue-tint)] transition-colors group">
                                                <td className="py-3 px-4 align-top">
                                                    <span className="text-xs font-bold text-[var(--k-ink)] whitespace-nowrap">
                                                        {formatDate(log.timestamp)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 align-top">
                                                    <p className="text-sm font-black text-[var(--k-ink)]">{log.user_display}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--k-grey-500)] mt-0.5">{log.user_role}</p>
                                                </td>
                                                <td className="py-3 px-4 align-top">
                                                    <span className="text-xs font-black px-2 py-1 bg-[var(--k-grey-100)] text-[var(--k-ink)] rounded-md tracking-wider">
                                                        {formatAction(log.action)}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 align-top max-w-xs">
                                                    <p className="text-sm text-[var(--k-grey-600)] truncate group-hover:whitespace-normal group-hover:break-words transition-all duration-300">
                                                        {log.details}
                                                    </p>
                                                </td>
                                                <td className="py-3 px-4 align-top">
                                                    <span className="text-xs font-mono text-[var(--k-grey-500)]">
                                                        {log.ip_address || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 align-top">
                                                    <StatusBadge status={log.status} />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION FOOTER */}
                        <div className="py-3 px-4 border-t border-[var(--k-grey-200)] bg-[var(--k-band-grey)] flex items-center justify-between text-xs font-semibold text-[var(--k-grey-500)]">
                            <p>
                                {loading ? '...' : `Showing ${logs.length} of ${totalCount} records`}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage <= 1}
                                    className="px-3 py-1.5 rounded-md hover:bg-[var(--k-grey-200)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                {getPageNumbers().map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setCurrentPage(p)}
                                        className={`px-3 py-1.5 rounded-md transition-colors ${
                                            p === currentPage
                                                ? 'bg-white border border-[var(--k-grey-200)] shadow-sm text-[var(--k-ink)]'
                                                : 'hover:bg-[var(--k-grey-200)]'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="px-3 py-1.5 rounded-md hover:bg-[var(--k-grey-200)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </Band>
            </main>
        </div>
    );
};

export default AuditLog;