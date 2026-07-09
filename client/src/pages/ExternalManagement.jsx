import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    UserPlus, Search, Key, Activity, Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../api';
import CreateTeamMemberModal from '../components/CreateTeamMemberModal';
import { PageHeader, Band, Bands } from '../components/kayaara/Band';

export default function ExternalManagement() {
    const { clientId } = useParams();
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
        <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <PageHeader
                    title="External"
                    accent="Team Management"
                    subtitle="Control access levels and manage credentials for client-side users"
                    actions={
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="k-btn-primary flex items-center gap-2 text-sm"
                        >
                            <UserPlus size={16} /> Register member
                        </button>
                    }
                />

                <main className="flex-1 overflow-y-auto k-scroll">
                    <Bands>
                        <Band tone="grey">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                                {/* Sidebar Info */}
                                <div className="lg:col-span-1 space-y-4">
                                    <div className="k-card p-5">
                                        <h4 className="k-eyebrow mb-4">Access guidelines</h4>
                                        <div className="space-y-4">
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
                                                    <Key size={14} />
                                                </div>
                                                <p className="text-xs leading-relaxed" style={{ color: 'var(--k-grey-700)' }}>
                                                    <strong>Credential access:</strong> allows users to view sensitive project passwords and keys.
                                                </p>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}>
                                                    <Activity size={14} />
                                                </div>
                                                <p className="text-xs leading-relaxed" style={{ color: 'var(--k-grey-700)' }}>
                                                    <strong>Status:</strong> set to 'Hold' to temporarily revoke all platform access.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main List */}
                                <div className="lg:col-span-3 space-y-3">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--k-grey-500)' }} size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search by name or email..."
                                            className="k-input"
                                            style={{ paddingLeft: '2.75rem' }}
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {loading ? (
                                        <div className="space-y-3">
                                            {Array.from({ length: 4 }).map((_, idx) => (
                                                <div key={idx} className="k-skeleton h-[72px]" />
                                            ))}
                                        </div>
                                    ) : filteredMembers.length === 0 ? (
                                        <div className="k-card flex flex-col items-center justify-center py-16 text-center gap-3">
                                            <UserPlus size={36} style={{ color: 'var(--k-grey-300)' }} />
                                            <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-500)' }}>
                                                No external members found
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredMembers.map((member, index) => (
                                                <motion.div
                                                    key={member.id}
                                                    initial={{ opacity: 0, y: 16 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ duration: 0.45, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                                                    className="k-card p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                                                >
                                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                                        <div
                                                            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0"
                                                            style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                                                        >
                                                            {member.username?.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-semibold truncate" style={{ color: 'var(--k-ink)' }}>{member.username}</h4>
                                                            <p className="text-xs truncate" style={{ color: 'var(--k-grey-500)' }}>{member.email}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                        {/* Credential Toggle */}
                                                        <button
                                                            onClick={() => handleUpdate(member.member_id, { credential_access: !member.credential_access })}
                                                            className="flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all"
                                                            style={member.credential_access
                                                                ? { background: 'var(--k-blue-tint)', color: 'var(--k-blue)', border: '1px solid var(--k-blue-tint)' }
                                                                : { background: 'var(--k-band-grey)', color: 'var(--k-grey-500)', border: '1px solid var(--k-grey-200)' }}
                                                        >
                                                            <Key size={14} />
                                                            <span className="text-[10px] font-bold uppercase tracking-wider">Credentials</span>
                                                        </button>

                                                        {/* Status Select */}
                                                        <select
                                                            value={member.status}
                                                            onChange={(e) => handleUpdate(member.member_id, { status: e.target.value })}
                                                            className="k-select !w-auto text-[10px] font-bold uppercase tracking-wider"
                                                        >
                                                            <option value="active">Active</option>
                                                            <option value="hold">Hold</option>
                                                            <option value="inactive">Inactive</option>
                                                        </select>

                                                        <button onClick={() => handleDelete(member)} className="k-btn-icon">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Band>
                    </Bands>
                </main>
            </div>

            <CreateTeamMemberModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onMemberAdded={fetchMembers}
                clientId={clientId}
            />
        </div>
    );
}
