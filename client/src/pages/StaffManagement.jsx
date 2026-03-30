import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, UserPlus, Search, Mail, Calendar,
    ShieldCheck, ChevronLeft, ChevronDown,
    Trash2, Edit,
    CheckCircle2, XCircle, Loader2, Filter, Briefcase, Plus
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
// Ensure your api service is correctly configured to point to your Django/Node backend
import api from '../api';

const StaffManagement = () => {
    const navigate = useNavigate();
    const currentRole = (localStorage.getItem('role') || '').toUpperCase();
    const isAdminRole = currentRole === 'ADMIN';
    const isClientRole = currentRole === 'CLIENT';
    const isSgmRole = currentRole === 'SGM';
    const isHqeplRole = currentRole === 'HQEPL';
    const isSeniorRole = currentRole === 'SENIOR';
    const isManagerMemberView = isSgmRole || isHqeplRole || isSeniorRole;
    const defaultTableColSpan = isManagerMemberView ? 4 : (isAdminRole ? 6 : 5);
    const [staffMembers, setStaffMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('All');
    const [expandedMemberId, setExpandedMemberId] = useState(null);

    // --- 1. DATA FETCHING & ROLE FILTERING ---
    useEffect(() => {
        const fetchStaff = async () => {
            try {
                setLoading(true);

                if (currentRole === 'CLIENT') {
                    const clientRes = await api.get('clients/me/');
                    const clientId = clientRes.data?.id;

                    if (!clientId) {
                        setStaffMembers([]);
                        return;
                    }

                    const employeesRes = await api.get(`clients/${clientId}/employees/`);
                    const employees = Array.isArray(employeesRes.data)
                        ? employeesRes.data
                        : Array.isArray(employeesRes.data?.results)
                            ? employeesRes.data.results
                            : [];

                    const normalizedEmployees = employees.map((employee) => {
                        const firstName = employee.first_name || '';
                        const lastName = employee.last_name || '';
                        const fallbackUsername = `${firstName} ${lastName}`.trim() || employee.email;

                        return {
                            ...employee,
                            id: employee.user_id || employee.id,
                            username: employee.username || fallbackUsername,
                            role: employee.role || 'employee',
                            is_active: employee.is_active ?? true,
                            date_joined: employee.date_joined || null,
                        };
                    });

                    setStaffMembers(normalizedEmployees);
                    return;
                }

                if (currentRole === 'SGM') {
                    const sgmEmployeesRes = await api.get('sgm/employees/');
                    const sgmEmployees = Array.isArray(sgmEmployeesRes.data)
                        ? sgmEmployeesRes.data
                        : Array.isArray(sgmEmployeesRes.data?.results)
                            ? sgmEmployeesRes.data.results
                            : [];

                    const normalizedSgmEmployees = sgmEmployees.map((employee) => ({
                        ...employee,
                        id: employee.id,
                        username: employee.username || employee.email || 'Unknown',
                        first_name: employee.first_name || '',
                        last_name: employee.last_name || '',
                        email: employee.email || '',
                        role: employee.role || 'EMPLOYEE',
                    }));

                    setStaffMembers(normalizedSgmEmployees);
                    return;
                }

                if (currentRole === 'HQEPL') {
                    const allUsersRes = await api.get('admin/users/');

                    const allUsers = Array.isArray(allUsersRes.data)
                        ? allUsersRes.data
                        : Array.isArray(allUsersRes.data?.results)
                            ? allUsersRes.data.results
                            : [];

                    // Filter for sgm and employee, then sort SGM to top
                    const allowedRoles = ['sgm', 'employee'];
                    const hqeplStaff = allUsers
                        .filter(u => u.role && allowedRoles.includes(u.role.toLowerCase()))
                        .sort((a, b) => {
                            const roleA = a.role.toLowerCase();
                            const roleB = b.role.toLowerCase();
                            if (roleA === 'sgm' && roleB === 'employee') return -1;
                            if (roleA === 'employee' && roleB === 'sgm') return 1;
                            return 0;
                        });

                    setStaffMembers(hqeplStaff);
                    return;
                }

                if (currentRole === 'SENIOR') {
                    const clientsRes = await api.get('clients/list/');
                    const clients = Array.isArray(clientsRes.data)
                        ? clientsRes.data
                        : Array.isArray(clientsRes.data?.results)
                            ? clientsRes.data.results
                            : [];

                    if (clients.length === 0) {
                        setStaffMembers([]);
                        return;
                    }

                    const membersByClient = await Promise.all(
                        clients.map(async (client) => {
                            try {
                                const membersRes = await api.get(`clients/${client.id}/members/`);
                                return Array.isArray(membersRes.data)
                                    ? membersRes.data
                                    : Array.isArray(membersRes.data?.results)
                                        ? membersRes.data.results
                                        : [];
                            } catch {
                                return [];
                            }
                        })
                    );

                    const members = membersByClient.flat();
                    const memberMap = new Map();

                    members.forEach((member) => {
                        const normalizedRole = String(member.role || '').toUpperCase();
                        const isExternalOnly = normalizedRole.includes('EXTERNAL') && !normalizedRole.includes('SENIOR');

                        if (!isExternalOnly) {
                            return;
                        }

                        if (!memberMap.has(String(member.id))) {
                            memberMap.set(String(member.id), {
                                ...member,
                                username: member.username || member.email || `User ${member.id}`,
                                first_name: member.first_name || '',
                                last_name: member.last_name || '',
                                email: member.email || '',
                                role: member.role || 'EXTERNAL',
                            });
                        }
                    });

                    const seniorExternalStaff = Array.from(memberMap.values());

                    setStaffMembers(seniorExternalStaff);
                    return;
                }

                const response = await api.get('admin/users/');

                /** * FILTER LOGIC: 
                 * Only allow users with roles: hqepl, sgm, or employee.
                 * Case-insensitive check to avoid issues with backend formatting.
                 */
                const allowedRoles = ['hqepl', 'sgm', 'employee'];
                const filteredByRole = response.data.filter(user =>
                    user.role && allowedRoles.includes(user.role.toLowerCase())
                );

                setStaffMembers(filteredByRole);
            } catch (error) {
                console.error("Error fetching staff:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, [currentRole]);

    // --- 2. SEARCH & ROLE FILTERING ---
    const filteredStaff = staffMembers.filter(member => {
        const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim();
        const query = searchQuery.toLowerCase();

        const matchesSearch = fullName.toLowerCase().includes(query) ||
            member.username?.toLowerCase().includes(query) ||
            member.email?.toLowerCase().includes(query);

        const matchesRole = isManagerMemberView || activeFilter === 'All' ||
            member.role?.toUpperCase() === activeFilter.toUpperCase();

        return matchesSearch && matchesRole;
    });

    // --- 3. UTILITIES ---
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Not changed yet';
        return new Date(dateString).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };


    const handleDelete = async (userId) => {
        if (window.confirm("Are you sure you want to remove this staff member? This action cannot be undone.")) {
            try {
                await api.delete(`admin/users/${userId}/`);
                setStaffMembers(prev => prev.filter(member => member.id !== userId));
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Failed to delete user.");
            }
        }
    };

    // --- EDIT STATE ---
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    const openEditModal = (user) => {
        setEditingUser(user);
        setEditFormData({ ...user, password: '' }); // Clone user data to form
    };

    const closeEditModal = () => {
        setEditingUser(null);
        setEditFormData({});
    };

    const handleEditChange = (e) => {
        const { name, value, type, checked } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                username: editFormData.username,
                email: editFormData.email,
                first_name: editFormData.first_name,
                last_name: editFormData.last_name,
                shortform: editFormData.shortform,
                role: editFormData.role,
                is_active: Boolean(editFormData.is_active),
            };

            if (editFormData.password) {
                payload.password = editFormData.password;
            }

            await api.patch(`admin/users/${editingUser.id}/`, payload);

            // Update local state
            setStaffMembers(prev => prev.map(member =>
                member.id === editingUser.id
                    ? {
                        ...member,
                        ...payload,
                        ...(payload.password ? { password_changed_at: new Date().toISOString() } : {}),
                    }
                    : member
            ));

            closeEditModal();
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Failed to update user details.");
        }
    };

    return (
        <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto">
                {/* HEADER */}
                <div className="bg-white border-b border-slate-200">
                    <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10 py-4 md:py-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] hover:text-[#F58A4B] transition-all group"
                                >
                                    <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                                    Back to Portal
                                </button>
                                <div className="space-y-1">
                                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Internal <span className="text-[#F58A4B]">Members</span></h1>
                                    <p className="text-slate-500 font-medium text-xs md:text-sm flex items-center gap-2"><Briefcase size={16} /> Enterprise Staff Directory</p>
                                </div>
                            </div>

                            {!isClientRole && !isHqeplRole && (
                                <button
                                    onClick={() => navigate('/admin/createuser')}
                                    className="px-4 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white rounded-xl text-[10px] md:text-[11px] font-bold uppercase tracking-wider hover:bg-[#F58A4B] transition-all shadow-lg flex items-center gap-2"
                                >
                                    <Plus size={16} /> Add New Staff
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10 pt-6 md:pt-10 space-y-6 md:space-y-12">
                    {/* Controls Section */}
                    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl p-3 md:p-4 rounded-xl md:rounded-[2rem] border border-white/50 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 transition-all duration-500">
                        <div className="relative w-full md:w-[480px] group">
                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                <Search className="text-slate-300 group-focus-within:text-[#F58A4B] transition-colors duration-300" size={20} />
                            </div>
                            <input
                                type="text"
                                placeholder="Search by name, email, or ID..."
                                className="block w-full pl-14 pr-6 py-3 md:py-4 bg-slate-50/50 border-0 rounded-xl md:rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-[#F58A4B]/20 focus:bg-white transition-all duration-300"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-1 md:gap-1.5 bg-slate-100/50 p-1 md:p-1.5 rounded-xl md:rounded-2xl flex-wrap">
                            {(isManagerMemberView ? ['All'] : ['All', 'HQEPL', 'SGM', 'Employee']).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`px-3 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeFilter === filter
                                        ? 'bg-white text-[#F58A4B] shadow-lg shadow-black/5 ring-1 ring-black/5 scale-100'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50 scale-95 hover:scale-100'
                                        }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                    </div>


                    {/* --- MOBILE CARD VIEW (visible on < md) --- */}
                    <div className="md:hidden space-y-3">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center gap-4 py-20">
                                <Loader2 className="animate-spin text-[#F58A4B]" size={40} />
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Loading Database</p>
                            </div>
                        ) : filteredStaff.length > 0 ? (
                            filteredStaff.map((member) => {
                                const isExpanded = expandedMemberId === member.id;
                                const memberInitials = isManagerMemberView
                                    ? (member.username?.[0] || member.email?.[0] || 'U').toUpperCase()
                                    : (member.first_name || member.last_name
                                        ? `${(member.first_name?.[0] || '').toUpperCase()}${(member.last_name?.[0] || '').toUpperCase()}`
                                        : member.username?.[0]?.toUpperCase() || 'U');
                                const memberName = isManagerMemberView
                                    ? (member.username || member.email)
                                    : `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username;

                                return (
                                    <div key={member.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                                        {/* Card Header - always visible */}
                                        <button
                                            onClick={() => setExpandedMemberId(isExpanded ? null : member.id)}
                                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-900 text-[#F58A4B] rounded-xl flex items-center justify-center text-sm font-black shrink-0">
                                                    {memberInitials}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-black text-slate-900 text-sm">{memberName}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                                                        <Mail size={10} /> {member.email || '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronDown
                                                size={18}
                                                className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                            />
                                        </button>

                                        {/* Expanded Details */}
                                        {isExpanded && (
                                            <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50/50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                {isManagerMemberView ? (
                                                    /* Manager view: Dashboard, MCTC, RC7 links */
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={() => navigate(`/employeedashboard?member=${member.id}`)}
                                                            className="w-full text-left px-3 py-2.5 bg-white rounded-lg border border-slate-100 text-xs font-black uppercase tracking-wider text-blue-600 hover:bg-blue-50 transition-colors"
                                                        >
                                                            View Dashboard
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const mName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username || member.email || `Member ${member.id}`;
                                                                navigate(`/mctc?member=${member.id}&memberName=${encodeURIComponent(mName)}`);
                                                            }}
                                                            className="w-full text-left px-3 py-2.5 bg-white rounded-lg border border-slate-100 text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 transition-colors"
                                                        >
                                                            View MCTC
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const mName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username || member.email || `Member ${member.id}`;
                                                                navigate(`/rc7?member=${member.id}&memberName=${encodeURIComponent(mName)}`);
                                                            }}
                                                            className="w-full text-left px-3 py-2.5 bg-white rounded-lg border border-slate-100 text-xs font-black uppercase tracking-wider text-violet-600 hover:bg-violet-50 transition-colors"
                                                        >
                                                            View RC7
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* Admin/default view: Role, Status, Date, Password, Actions */
                                                    <>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</span>
                                                            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg tracking-widest border
                                                                ${member.role?.toLowerCase() === 'hqepl' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                    member.role?.toLowerCase() === 'sgm' ? 'bg-orange-50 text-[#F58A4B] border-orange-100' :
                                                                        'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                {member.role || 'Employee'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                                            {member.is_active ? (
                                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                                                                    <CheckCircle2 size={12} /> Active
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-400 text-[10px] font-black uppercase">
                                                                    <XCircle size={12} /> Inactive
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</span>
                                                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                                                <Calendar size={12} className="text-slate-300" />
                                                                {formatDate(member.date_joined)}
                                                            </span>
                                                        </div>
                                                        {isAdminRole && (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Password</span>
                                                                <div className="text-right">
                                                                    <p className="text-[11px] font-black tracking-wide text-slate-700">{member.password_display || 'N/A'}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400">{formatDateTime(member.password_changed_at)}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {!isClientRole && (
                                                            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={() => openEditModal(member)}
                                                                        className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                                    >
                                                                        <Edit size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(member.id)}
                                                                        className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center gap-3 opacity-20 py-16">
                                <Filter size={48} />
                                <p className="font-black uppercase tracking-widest text-xs">No records found</p>
                            </div>
                        )}
                    </div>

                    {/* --- TABLE SECTION (hidden on mobile, visible md+) --- */}
                    <div className="hidden md:block bg-white border border-slate-100 rounded-xl md:rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-4 md:px-10 py-4 md:py-7 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                            {isManagerMemberView ? 'Name' : 'Member'}
                                        </th>
                                        {isManagerMemberView ? (
                                            <>
                                                <th className="px-4 md:px-8 py-4 md:py-7 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Dashboard</th>
                                                <th className="px-4 md:px-8 py-4 md:py-7 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">MCTC</th>
                                                <th className="px-4 md:px-8 py-4 md:py-7 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">RC7</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="px-4 md:px-8 py-4 md:py-7 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Role</th>
                                                <th className="px-4 md:px-8 py-4 md:py-7 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                                                <th className="px-4 md:px-8 py-4 md:py-7 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Joined Date</th>
                                                {isAdminRole && (
                                                    <th className="px-4 md:px-8 py-4 md:py-7 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Password</th>
                                                )}
                                                <th className="px-4 md:px-10 py-4 md:py-7 text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={defaultTableColSpan} className="py-40">
                                                <div className="flex flex-col items-center justify-center gap-4">
                                                    <Loader2 className="animate-spin text-[#F58A4B]" size={40} />
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Loading Database</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredStaff.length > 0 ? (
                                        filteredStaff.map((member) => (
                                            isManagerMemberView ? (
                                                <tr key={member.id} className="hover:bg-slate-50/80 transition-all group">
                                                    <td className="px-4 md:px-10 py-4 md:py-6">
                                                        <div className="flex items-center gap-3 md:gap-5">
                                                            <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-900 text-[#F58A4B] rounded-xl md:rounded-2xl flex items-center justify-center text-base md:text-xl font-black group-hover:bg-[#F58A4B] group-hover:text-white transition-all shadow-lg">
                                                                {(member.username?.[0] || member.email?.[0] || 'U').toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 text-[15px]">{member.username || member.email}</p>
                                                                <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                                    <Mail size={12} /> {member.email || '-'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(`/employeedashboard?member=${member.id}`)}
                                                            className="text-xs font-black uppercase tracking-wider text-blue-600 hover:text-[#F58A4B] transition-colors"
                                                        >
                                                            View Dashboard
                                                        </button>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const memberName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username || member.email || `Member ${member.id}`;
                                                                navigate(`/mctc?member=${member.id}&memberName=${encodeURIComponent(memberName)}`);
                                                            }}
                                                            className="text-xs font-black uppercase tracking-wider text-rose-600 hover:text-[#F58A4B] transition-colors"
                                                        >
                                                            View MCTC
                                                        </button>
                                                    </td>
                                                    <td className="px-8 py-6 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const memberName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username || member.email || `Member ${member.id}`;
                                                                navigate(`/rc7?member=${member.id}&memberName=${encodeURIComponent(memberName)}`);
                                                            }}
                                                            className="text-xs font-black uppercase tracking-wider text-violet-600 hover:text-[#F58A4B] transition-colors"
                                                        >
                                                            View RC7
                                                        </button>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr key={member.id} className="hover:bg-slate-50/80 transition-all group">
                                                    {/* Identity Card */}
                                                    <td className="px-4 md:px-10 py-4 md:py-6">
                                                        <div className="flex items-center gap-3 md:gap-5">
                                                            <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-900 text-[#F58A4B] rounded-xl md:rounded-2xl flex items-center justify-center text-base md:text-xl font-black group-hover:bg-[#F58A4B] group-hover:text-white transition-all shadow-lg">
                                                                {member.first_name || member.last_name
                                                                    ? `${(member.first_name?.[0] || '').toUpperCase()}${(member.last_name?.[0] || '').toUpperCase()}`
                                                                    : member.username?.[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 text-[15px]">{member.first_name} {member.last_name}</p>
                                                                <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                                    <Mail size={12} /> {member.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Role Badge */}
                                                    <td className="px-8 py-6">
                                                        <span className={`text-[9px] font-black uppercase px-4 py-2 rounded-xl tracking-widest border
                                                    ${member.role?.toLowerCase() === 'hqepl' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                                member.role?.toLowerCase() === 'sgm' ? 'bg-orange-50 text-[#F58A4B] border-orange-100' :
                                                                    'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                            {member.role || 'Employee'}
                                                        </span>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="px-8 py-6 text-center">
                                                        <div className="flex justify-center">
                                                            {member.is_active ? (
                                                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                                                                    <CheckCircle2 size={14} /> Active
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-400 text-[10px] font-black uppercase">
                                                                    <XCircle size={14} /> Inactive
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Join Date */}
                                                    <td className="px-8 py-6 text-center">
                                                        <p className="text-[12px] font-bold text-slate-700 flex items-center justify-center gap-2">
                                                            <Calendar size={14} className="text-slate-300" />
                                                            {formatDate(member.date_joined)}
                                                        </p>
                                                    </td>

                                                    {isAdminRole && (
                                                        <td className="px-8 py-6 text-center">
                                                            <p className="text-[12px] font-black tracking-[0.1em] text-slate-700">{member.password_display || 'Not available'}</p>
                                                            <p className="mt-1 text-[10px] font-bold text-slate-400">{formatDateTime(member.password_changed_at)}</p>
                                                        </td>
                                                    )}

                                                    {/* Control Menu */}
                                                    <td className="px-10 py-6 text-right">
                                                        {isClientRole ? (
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">View Only</span>
                                                        ) : (
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    onClick={() => openEditModal(member)}
                                                                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm group"
                                                                    title="Edit Member"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(member.id)}
                                                                    className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm group"
                                                                    title="Delete Member"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={defaultTableColSpan} className="py-24 text-center">
                                                <div className="flex flex-col items-center gap-3 opacity-20">
                                                    <Filter size={48} />
                                                    <p className="font-black uppercase tracking-widest text-xs">No records found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* --- ANALYTICS FOOTER --- */}
                    {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white flex items-center justify-between shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Total Filtered Personnel</p>
                            <p className="text-4xl font-black mt-2 italic tracking-tighter">
                                {staffMembers.length}
                                <span className="text-[14px] text-[#F58A4B] not-italic ml-2 uppercase font-bold tracking-widest">Active Seats</span>
                            </p>
                        </div>
                        <div className="w-16 h-16 bg-[#F58A4B]/10 rounded-2xl flex items-center justify-center text-[#F58A4B] shadow-inner relative z-10">
                            <ShieldCheck size={32} />
                        </div>
                        {/* Subtle background decoration */}
                    {/* <Users className="absolute -right-4 -bottom-4 text-white/[0.03]" size={150} />
                    </div>
                </div> */}
                </div>
            </main >

            {/* --- EDIT MODAL --- */}
            {
                !isClientRole && editingUser && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-xl md:rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
                            {/* Sticky Header with Close Button */}
                            <div className="flex items-center justify-between px-5 md:px-8 pt-5 md:pt-8 pb-4 border-b border-slate-100 shrink-0">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
                                        Edit <span className="text-[#F58A4B]">{editingUser.username}</span>
                                    </h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                        Update Personnel Details
                                    </p>
                                </div>
                                <button
                                    onClick={closeEditModal}
                                    className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors shrink-0"
                                >
                                    <XCircle size={20} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Scrollable Form Body */}
                            <div className="flex-1 overflow-y-auto px-5 md:px-8 py-4 md:py-6">
                                <form onSubmit={handleUpdate} className="space-y-3 md:space-y-4">
                                    {/* Username */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={editFormData.username || ''}
                                            onChange={handleEditChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:outline-none focus:border-[#F58A4B] transition-all"
                                        />
                                    </div>

                                    {/* Email */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={editFormData.email || ''}
                                            onChange={handleEditChange}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:outline-none focus:border-[#F58A4B] transition-all"
                                        />
                                    </div>

                                    {/* First Name, Last Name & Short Form */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">First Name</label>
                                            <input
                                                type="text"
                                                name="first_name"
                                                value={editFormData.first_name || ''}
                                                onChange={handleEditChange}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:outline-none focus:border-[#F58A4B] transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Last Name</label>
                                            <input
                                                type="text"
                                                name="last_name"
                                                value={editFormData.last_name || ''}
                                                onChange={handleEditChange}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:outline-none focus:border-[#F58A4B] transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Short Form</label>
                                            <input
                                                type="text"
                                                name="shortform"
                                                value={editFormData.shortform || ''}
                                                onChange={handleEditChange}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:outline-none focus:border-[#F58A4B] transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Role Selection */}
                                    <select
                                        name="role"
                                        value={editFormData.role || ''}
                                        onChange={handleEditChange}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:outline-none focus:border-[#F58A4B] transition-all appearance-none"
                                    >
                                        <option value="HQEPL">HQEPL</option>
                                        <option value="SGM">SGM</option>
                                        <option value="EMPLOYEE">Employee</option>
                                    </select>

                                    {/* Optional Password Update */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">New Password (Optional)</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={editFormData.password || ''}
                                            onChange={handleEditChange}
                                            placeholder="Leave empty to keep current password"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 md:py-3 text-sm font-bold focus:outline-none focus:border-[#F58A4B] transition-all"
                                        />
                                    </div>

                                    {/* Active Status Checkbox */}
                                    <div className="flex items-center gap-3 pt-1">
                                        <input
                                            type="checkbox"
                                            name="is_active"
                                            checked={editFormData.is_active || false}
                                            onChange={handleEditChange}
                                            id="isActive"
                                            className="w-5 h-5 rounded-md text-[#F58A4B] border-slate-300 focus:ring-[#F58A4B]"
                                        />
                                        <label htmlFor="isActive" className="text-xs font-bold text-slate-700">User Account Active</label>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-slate-900 text-white py-3 md:py-4 rounded-xl text-xs font-black uppercase tracking-[0.15em] hover:bg-[#F58A4B] transition-all mt-3"
                                    >
                                        Save Changes
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default StaffManagement;