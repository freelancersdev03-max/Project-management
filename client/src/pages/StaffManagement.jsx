import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, UserPlus, Search, Mail, Calendar,
    ShieldCheck, ChevronLeft, MoreVertical,
    CheckCircle2, XCircle, Filter
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api';

const StaffManagement = () => {
    const navigate = useNavigate();
    const [staffMembers, setStaffMembers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStaff = async () => {
            try {
                setLoading(true);
                const response = await api.get('admin/users/');
                
                // --- STRICT FILTERING LOGIC ---
                // Only show users with these specific roles
                const allowedRoles = ['HQEPL', 'SGM', 'EMPLOYEE'];
                const filteredData = response.data.filter(user => 
                    allowedRoles.includes(user.role?.toUpperCase())
                );

                // Sort them in the specific sequence: HQEPL -> SGM -> EMPLOYEE
                const sortedData = filteredData.sort((a, b) => {
                    const order = { 'HQEPL': 1, 'SGM': 2, 'EMPLOYEE': 3 };
                    return order[a.role?.toUpperCase()] - order[b.role?.toUpperCase()];
                });

                setStaffMembers(sortedData);
            } catch (error) {
                console.error("Error fetching staff:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStaff();
    }, []);

    const filteredStaff = staffMembers.filter(member =>
        member.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 antialiased pb-20 font-sans">
            <Navbar hideLogin={true} />

            <main className="max-w-[1600px] mx-auto px-6 md:px-10 pt-6 space-y-8">

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-slate-400 font-bold text-[11px] uppercase tracking-widest hover:text-[#F58A4B] transition-colors group"
                        >
                            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Admin
                        </button>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Staff <span className="text-[#F58A4B]">Directory</span>
                        </h1>
                         
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#F58A4B] transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search directory..."
                                className="pl-14 pr-8 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#F58A4B] w-full md:w-80 shadow-sm transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => navigate('/admin/createuser')}
                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#F58A4B] transition-all shadow-xl flex items-center gap-3"
                        >
                            <UserPlus size={18} /> Onboard New Staff
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Member Identity</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Access Role</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Status</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">Joined</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-4 border-[#F58A4B] border-t-transparent rounded-full animate-spin"></div>
                                                <p className="font-bold text-slate-400 text-xs uppercase tracking-widest">Accessing Database...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredStaff.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-20 text-slate-400 font-medium">No matching staff members found.</td>
                                    </tr>
                                ) : (
                                    filteredStaff.map((member) => (
                                        <tr key={member.id} className="hover:bg-slate-50/80 transition-all group">
                                            <td className="px-10 py-6">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-12 h-12 bg-slate-900 text-[#F58A4B] rounded-2xl flex items-center justify-center font-black shadow-lg group-hover:scale-110 transition-transform">
                                                        {member.username?.[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-extrabold text-slate-900 text-base tracking-tight">{member.username}</p>
                                                        <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                            <Mail size={12} className="text-[#F58A4B]" /> {member.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-10 py-6">
                                                <span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-lg tracking-[0.15em] border ${
                                                    member.role?.toUpperCase() === 'SGM' ? 'bg-orange-50 text-[#F58A4B] border-orange-100' :
                                                    member.role?.toUpperCase() === 'HQEPL' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                                                    'bg-slate-100 text-slate-500 border-slate-200'
                                                }`}>
                                                    {member.role || 'Employee'}
                                                </span>
                                            </td>

                                            <td className="px-10 py-6 text-center">
                                                <div className="flex justify-center">
                                                    {member.is_active ? (
                                                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                                            <CheckCircle2 size={14} /> Active
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-slate-400 bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                                            <XCircle size={14} /> Inactive
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-10 py-6 text-center">
                                                <p className="text-[11px] font-bold text-slate-600 flex items-center justify-center gap-2">
                                                    <Calendar size={14} className="text-[#F58A4B] opacity-50" />
                                                    {formatDate(member.date_joined)}
                                                </p>
                                            </td>

                                            <td className="px-10 py-6 text-right">
                                                <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                                                    <MoreVertical size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Dynamic Analytics Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-900 rounded-3xl p-8 text-white flex items-center justify-between shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Validated Staff Members</p>
                            <p className="text-4xl font-black mt-2 tracking-tighter italic">{staffMembers.length}<span className="text-[#F58A4B] text-xl ml-1">Live</span></p>
                        </div>
                        <div className="relative z-10 w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-[#F58A4B]">
                            <ShieldCheck size={28} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StaffManagement;