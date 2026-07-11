import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Download, ShieldAlert, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { Band, PageHeader } from '../components/kayaara/Band';

// Mock Data for the frontend UI
const MOCK_AUDIT_LOGS = [
    {
        id: 1,
        timestamp: '2026-07-10T09:45:12Z',
        user: 'John SGM',
        role: 'SGM',
        action: 'USER_LOGIN',
        module: 'Authentication',
        details: 'Successful login from IP 192.168.1.45',
        status: 'success'
    },
    {
        id: 2,
        timestamp: '2026-07-10T10:12:05Z',
        user: 'Alice Smith',
        role: 'EMPLOYEE',
        action: 'TASK_UPDATE',
        module: 'Employee Dashboard',
        details: 'Updated status of task #1042 to "Completed"',
        status: 'success'
    },
    {
        id: 3,
        timestamp: '2026-07-10T11:05:33Z',
        user: 'Unknown',
        role: 'SYSTEM',
        action: 'FAILED_LOGIN',
        module: 'Authentication',
        details: 'Failed login attempt for user admin@kayaara.com',
        status: 'failed'
    },
    {
        id: 4,
        timestamp: '2026-07-10T14:22:11Z',
        user: 'David Manager',
        role: 'SENIOR',
        action: 'PROJECT_CREATED',
        module: 'Project Management',
        details: 'Created new project "Website Redesign" for Client #45',
        status: 'success'
    },
    {
        id: 5,
        timestamp: '2026-07-10T15:01:44Z',
        user: 'Super Admin',
        role: 'ADMIN',
        action: 'USER_ROLE_CHANGED',
        module: 'User Management',
        details: 'Changed role for user #22 from EMPLOYEE to SENIOR',
        status: 'warning'
    }
];

const AuditLog = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('ALL');

    useEffect(() => {
        const userRole = (localStorage.getItem('role') || '').toUpperCase();
        if (userRole !== 'ADMIN') {
            navigate('/');
        }
    }, [navigate]);

    // Format date helper
    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
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
                                <button className="k-btn-ghost flex items-center gap-2 text-xs border border-[var(--k-grey-200)]">
                                    <Download size={14} /> Export CSV
                                </button>
                                <button className="k-btn-primary flex items-center gap-2 text-xs">
                                    <Clock size={14} /> Real-time Sync
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
                                placeholder="Search user, action, or module..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="k-input w-full !py-2 !text-sm"
                                style={{ paddingLeft: '2.4rem' }}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 relative">
                                <Filter size={14} className="text-[var(--k-grey-500)] absolute left-3 z-10" />
                                <select
                                    value={filterRole}
                                    onChange={(e) => setFilterRole(e.target.value)}
                                    className="k-input !py-2 !text-sm font-semibold min-w-[140px] cursor-pointer"
                                    style={{ paddingLeft: '2.4rem' }}
                                >
                                    <option value="ALL">All Roles</option>
                                    <option value="ADMIN">Admin</option>
                                    <option value="SGM">SGM</option>
                                    <option value="EMPLOYEE">Employee</option>
                                    <option value="SYSTEM">System</option>
                                </select>
                            </div>

                            <button className="k-btn-ghost flex items-center gap-2 text-xs border border-[var(--k-grey-200)]">
                                <Calendar size={14} /> Last 7 Days
                            </button>
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
                                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--k-grey-500)] border-b border-[var(--k-grey-200)]">Module</th>
                                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--k-grey-500)] border-b border-[var(--k-grey-200)]">Details</th>
                                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-widest text-[var(--k-grey-500)] border-b border-[var(--k-grey-200)]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--k-grey-100)]">
                                    {MOCK_AUDIT_LOGS.map((log) => (
                                        <tr key={log.id} className="hover:bg-[var(--k-blue-tint)] transition-colors group">
                                            <td className="py-3 px-4 align-top">
                                                <span className="text-xs font-bold text-[var(--k-ink)] whitespace-nowrap">
                                                    {formatDate(log.timestamp)}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 align-top">
                                                <p className="text-sm font-black text-[var(--k-ink)]">{log.user}</p>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--k-grey-500)] mt-0.5">{log.role}</p>
                                            </td>
                                            <td className="py-3 px-4 align-top">
                                                <span className="text-xs font-black px-2 py-1 bg-[var(--k-grey-100)] text-[var(--k-ink)] rounded-md tracking-wider">
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 align-top">
                                                <span className="text-sm font-semibold text-[var(--k-grey-700)]">{log.module}</span>
                                            </td>
                                            <td className="py-3 px-4 align-top max-w-xs">
                                                <p className="text-sm text-[var(--k-grey-600)] truncate group-hover:whitespace-normal group-hover:break-words transition-all duration-300">
                                                    {log.details}
                                                </p>
                                            </td>
                                            <td className="py-3 px-4 align-top">
                                                <StatusBadge status={log.status} />
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Empty padding rows for mock layout */}
                                    {Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={`empty-${idx}`}>
                                            <td className="py-6 px-4"></td>
                                            <td className="py-6 px-4"></td>
                                            <td className="py-6 px-4"></td>
                                            <td className="py-6 px-4"></td>
                                            <td className="py-6 px-4"></td>
                                            <td className="py-6 px-4"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="py-3 px-4 border-t border-[var(--k-grey-200)] bg-[var(--k-band-grey)] flex items-center justify-between text-xs font-semibold text-[var(--k-grey-500)]">
                            <p>Showing 5 of 124 records</p>
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1.5 rounded-md hover:bg-[var(--k-grey-200)] transition-colors">Previous</button>
                                <button className="px-3 py-1.5 rounded-md bg-white border border-[var(--k-grey-200)] shadow-sm text-[var(--k-ink)]">1</button>
                                <button className="px-3 py-1.5 rounded-md hover:bg-[var(--k-grey-200)] transition-colors">2</button>
                                <button className="px-3 py-1.5 rounded-md hover:bg-[var(--k-grey-200)] transition-colors">3</button>
                                <button className="px-3 py-1.5 rounded-md hover:bg-[var(--k-grey-200)] transition-colors">Next</button>
                            </div>
                        </div>
                    </div>
                </Band>
            </main>
        </div>
    );
};

export default AuditLog;