import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    UserPlus, Search, Shield, Key, Trash2, Activity,
    ChevronLeft, Mail, User, Briefcase, Info
} from 'lucide-react';
import { SkeletonListItem } from '../components/SkeletonLoader';
import Sidebar from '../components/Sidebar';
import api from '../api';
import CreateTeamMemberModal from '../components/CreateTeamMemberModal';

export default function ExternalManagement() {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const res = await api.get(`clients/${clientId}/members/`);
            setMembers(res.data);
        } catch (err) {
            console.error("Failed to fetch members", err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (memberId, updates) => {
        try {
            // Use member_id if available (from backend), else fallback to id if consistent
            // Based on my backend view, I return "member_id" for the ExternalTeam ID.
            await api.patch(`clients/${clientId}/members/${memberId}/`, updates);
            fetchMembers();
        } catch (error) {
            alert("Update failed");
        }
    };

    const handleDelete = async (member) => {
        if (!window.confirm(`Remove ${member.username} permanently?`)) return;
        try {
            await api.delete(`clients/${clientId}/members/${member.member_id}/`);
            fetchMembers();
        } catch (error) {
            alert("Delete failed");
        }
    };

    useEffect(() => { fetchMembers(); }, [clientId]);

    const filteredMembers = members.filter(m =>
        m.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-screen w-screen bg-slate-50 antialiased font-sans flex overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto transition-all duration-300 pb-20">
                <div className="bg-white border-b border-slate-200">
                    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8">
                        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-[#F58A4B] mb-4">
                            <ChevronLeft size={14} /> Return to Projects
                        </button>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">External <span className="text-[#F58A4B]">Team Management</span></h1>
                                <p className="text-slate-500 text-sm mt-1">Control access levels and manage credentials for client-side users.</p>
                            </div>
                            <button
                                onClick={() => setIsCreateOpen(true)}
                                className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#F58A4B] transition-all shadow-xl flex items-center gap-2"
                            >
                                <UserPlus size={18} /> Register New Member
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 mt-6 sm:mt-10">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                        {/* Sidebar Info */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                                <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Access Guidelines</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <div className="p-2 bg-orange-50 rounded-lg h-fit"><Key size={14} className="text-orange-600" /></div>
                                        <p className="text-xs text-slate-600 leading-relaxed"><strong>Credential Access:</strong> Allows users to view sensitive project passwords and keys.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="p-2 bg-emerald-50 rounded-lg h-fit"><Activity size={14} className="text-emerald-600" /></div>
                                        <p className="text-xs text-slate-600 leading-relaxed"><strong>Status:</strong> Set to 'Hold' to temporarily revoke all platform access.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main List */}
                        <div className="lg:col-span-3 space-y-4">
                            <div className="relative mb-6">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {loading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 4 }).map((_, idx) => (
                                        <SkeletonListItem key={idx} />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredMembers.map(member => (
                                        <div key={member.id} className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 hover:border-orange-200 transition-all">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 flex-shrink-0">
                                                    {member.username?.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-slate-900 truncate">{member.username}</h4>
                                                    <p className="text-xs text-slate-500 truncate">{member.email}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 xl:mt-0">
                                                {/* Credential Toggle */}
                                                <button
                                                    onClick={() => handleUpdate(member.member_id, { credential_access: !member.credential_access })}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${member.credential_access ? 'bg-orange-50 border-orange-100 text-orange-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                                >
                                                    <Key size={14} />
                                                    <span className="text-[10px] font-black uppercase">Credentials</span>
                                                </button>

                                                {/* Status Select */}
                                                <select
                                                    value={member.status}
                                                    onChange={(e) => handleUpdate(member.member_id, { status: e.target.value })}
                                                    className="bg-slate-50 border-slate-200 text-[10px] font-black uppercase px-3 py-2 rounded-xl outline-none"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="hold">Hold</option>
                                                    <option value="inactive">Inactive</option>
                                                </select>

                                                <button onClick={() => handleDelete(member)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <CreateTeamMemberModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    onMemberAdded={fetchMembers}
                    clientId={clientId}
                />
            </main>
        </div>
    );
}