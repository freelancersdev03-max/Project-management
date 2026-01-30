import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, ChevronLeft, Filter, ArrowRight, X, User, Briefcase, FileText, Mail, Shield, Key, Eye, EyeOff, Users, Calendar as CalendarIcon, ShieldCheck, Activity } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api';
import ProjectDetailModal from './ProjectDetailModal';

/* ───────────────────────── 1. CREATE TEAM MEMBER MODAL ───────────────────────── */
const CreateTeamMemberModal = ({ isOpen, onClose, onMemberAdded, clientId }) => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      await api.post(`clients/${clientId}/members/`, { email: formData.email, username: formData.username, password: formData.password, }, { headers: { Authorization: `Bearer ${token}` } });
      onMemberAdded();
      onClose();
    } catch (error) {
      console.error("Error creating team member:", error);
      alert("Failed to create credentials. Check if email is unique.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Client <span className="text-[#F58A4B]">Access</span></h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 ml-4 tracking-widest">Full Name</label>
              <input required className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-[#F58A4B] outline-none" placeholder="Michael Chen" onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 ml-4 tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input required type="email" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-[#F58A4B] outline-none" placeholder="m.chen@client.com" onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black text-slate-400 ml-4 tracking-widest">Set Password</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input required type={showPassword ? "text" : "password"} className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-[#F58A4B] outline-none" placeholder="••••••••" onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-[#F58A4B] transition-all shadow-xl">{loading ? 'Provisioning...' : 'Generate Credentials'}</button>
          </form>
        </div>
      </div>
    </div>
  );
};


/* ───────────────────────── MAIN PAGE COMPONENT ───────────────────────── */
export default function ClientProjects() {
  const { clientId, clientName } = useParams();
  const navigate = useNavigate();
  const [filterQuery, setFilterQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchData = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };
      const projRes = await api.get(`projects/`, { headers });
      const clientProjects = projRes.data.filter(p => String(p.client) === String(clientId));
      setProjects(clientProjects);
      const teamRes = await api.get(`clients/${clientId}/members/`, { headers });
      setTeamMembers(teamRes.data);
    } catch (error) {
      console.error("Fetch error:", error.response || error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, [clientId]);
  const filteredProjects = projects.filter(p => p.name?.toLowerCase().includes(filterQuery.toLowerCase()));
  return (
    <div className="bg-slate-50 min-h-screen antialiased font-sans pb-20">
      <Navbar hideLogin />
      <ProjectDetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onProjectCreated={fetchData} clientId={clientId} />
      <CreateTeamMemberModal isOpen={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} onMemberAdded={fetchData} clientId={clientId} />
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 pt-8">
        <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-slate-400 font-bold text-[11px] uppercase tracking-widest mb-10 hover:text-[#F58A4B] transition-all group">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Workspace Directory
        </button>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{decodeURIComponent(clientName)} <span className="text-[#F58A4B]">Portfolio</span></h1>
            <div className="flex items-center gap-4">
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2"><Activity size={14} className="text-[#F58A4B]" /> Strategic Asset Management</p>
              <div className="h-4 w-[1px] bg-slate-200"></div>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{filteredProjects.length} Active Projects</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button onClick={() => setIsTeamModalOpen(true)} className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:border-[#F58A4B] transition-all flex items-center gap-2 shadow-sm"><Shield size={14} className="text-[#F58A4B]" /> Team Credentials</button>
            <button onClick={() => setIsModalOpen(true)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-[#F58A4B] transition-all flex items-center gap-3 shadow-xl active:scale-95"><Plus size={18} strokeWidth={3} /> New Project Instance</button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-3 space-y-10">
            <div className="relative max-w-md group">
              <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#F58A4B] transition-colors" size={18} />
              <input type="text" placeholder="Search projects in this workspace..." className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold outline-none focus:border-[#F58A4B] shadow-sm transition-all" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} />
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">{[1, 2].map(i => (<div key={i} className="h-64 bg-white border border-slate-100 rounded-[2.5rem] animate-pulse" />))}</div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white/50">
                <Briefcase size={32} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">No project instances found for this workspace</p>
                <button onClick={() => setIsModalOpen(true)} className="mt-6 text-[#F58A4B] text-[10px] font-black uppercase tracking-widest hover:underline">Launch first project</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredProjects.map(proj => (
                  <div key={proj.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm flex flex-col transition-all hover:shadow-2xl hover:border-[#F58A4B]/20 group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="max-w-[70%]">
                        <h3 className="font-black text-slate-900 text-xl tracking-tight leading-tight uppercase italic group-hover:text-[#F58A4B] transition-colors">{proj.name}</h3>
                        <p className="text-slate-400 text-[9px] font-black uppercase mt-1 tracking-[0.2em]">Active Compliance Instance</p>
                      </div>
                      <span className="text-[9px] px-3 py-1.5 rounded-lg font-black bg-emerald-50 text-emerald-600 uppercase tracking-widest border border-emerald-100">{proj.status || "ACTIVE"}</span>
                    </div>
                    <div className="space-y-4 mb-8 pt-6 border-t border-slate-50 text-[10px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Internal SGM</span>
                        <span className="font-black text-slate-900 truncate max-w-[150px]">{proj.assigned_sgm_email || "Not Assigned"}</span>
                      </div>
                    </div>
                    <button onClick={() => navigate(`/clients/${clientId}/${encodeURIComponent(proj.name)}`)} className="w-full py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-2 hover:bg-[#F58A4B] transition-all group/btn">
                      View Project Analysis <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm sticky top-28">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2"><Users size={16} className="text-[#F58A4B]" /> External Team</h3>
                <span className="text-[10px] font-black text-slate-300">{teamMembers.length}</span>
              </div>
              <div className="space-y-5">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-4 group">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 text-[#F58A4B] flex items-center justify-center font-black text-xs group-hover:bg-[#F58A4B] group-hover:text-white transition-all shadow-md">{member.username?.charAt(0).toUpperCase() || 'U'}</div>
                    <div className="overflow-hidden">
                      <p className="text-[12px] font-black text-slate-900 truncate uppercase">{member.username}</p>
                      <p className="text-[10px] text-slate-400 font-bold truncate lowercase flex items-center gap-1"><Mail size={10} /> {member.email}</p>
                    </div>
                  </div>
                ))}
                {teamMembers.length === 0 && (<div className="text-center py-4"><p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">No members provisioned</p></div>)}
                <button onClick={() => setIsTeamModalOpen(true)} className="w-full mt-4 py-3 border-2 border-dashed border-slate-100 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest hover:border-[#F58A4B] hover:text-[#F58A4B] transition-all flex items-center justify-center gap-2"><Plus size={14} /> Add Access Key</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}