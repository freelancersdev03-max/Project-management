import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Briefcase, Info, Users, ShieldCheck } from 'lucide-react';
import api from '../api';

const ProjectDetailModal = ({ isOpen, onClose, onProjectCreated, clientId }) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [sgms, setSgms] = useState([]);
  const [externalTeam, setExternalTeam] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client: clientId || '',
    assigned_sgm: '',
    external_lead: '',
    team_members: [],
    start_date: '',
    end_date: '',
    status: 'ACTIVE'
  });

  useEffect(() => {
    if (isOpen) {
      const fetchDropdownData = async () => {
        try {
          const token = localStorage.getItem('access_token');
          const headers = { Authorization: `Bearer ${token}` };

          // 1. Fetch Clients
          const clientRes = await api.get('clients/list/', { headers });
          setClients(clientRes.data);

          // 2. Fetch All Staff and Filter for SGMs
          const staffRes = await api.get('admin/users/', { headers });
          setSgms(staffRes.data.filter(u => u.role?.toUpperCase() === 'SGM'));

          // 3. Fetch External Team members for this specific client
          const teamRes = await api.get(`clients/${clientId}/members/`, { headers });
          setExternalTeam(teamRes.data);
        } catch (err) {
          console.error("Error loading dropdowns", err);
        }
      };
      fetchDropdownData();
    }
  }, [isOpen, clientId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      await api.post(`projects/`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onProjectCreated();
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || "Failed to create project.");
    } finally {
      setLoading(false);
    }
  };

  const handleMultiSelect = (id) => {
    const current = [...formData.team_members];
    if (current.includes(id)) {
      setFormData({ ...formData, team_members: current.filter(item => item !== id) });
    } else {
      setFormData({ ...formData, team_members: [...current, id] });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 border border-slate-100">
        <div className="p-8 md:p-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">Initialize <span className="text-[#f5914e]">Project</span></h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Strategic Asset Configuration</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20}/></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Identity */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Project Name</label>
                <input required className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-[#f5914e] outline-none transition-all"
                  placeholder="e.g., ISO 27001 Certification" onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Description</label>
                <textarea rows="2" className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-[#f5914e] outline-none"
                  placeholder="Project scope and objectives..." onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
            </div>

            {/* Dropdowns Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Target Client</label>
                <select value={formData.client} className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold appearance-none outline-none focus:border-[#f5914e]" 
                   onChange={(e) => setFormData({ ...formData, client: e.target.value })}>
                   {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Assigned SGM</label>
                <select required className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold appearance-none outline-none focus:border-[#f5914e]"
                  onChange={(e) => setFormData({ ...formData, assigned_sgm: e.target.value })}>
                  <option value="">Select SGM</option>
                  {sgms.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                </select>
              </div>
            </div>

            {/* External Leads */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">External Lead</label>
                <select required className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold appearance-none outline-none focus:border-[#f5914e]"
                   onChange={(e) => setFormData({ ...formData, external_lead: e.target.value })}>
                  <option value="">Select External Lead</option>
                  {externalTeam.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Status</label>
                <select className="w-full px-6 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold appearance-none outline-none focus:border-[#f5914e]"
                   onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="HOLD">HOLD</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>
            </div>

            {/* Multi-Select External Team */}
            <div className="space-y-2">
              <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Team Access (Multi-Select)</label>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-100 rounded-3xl min-h-[80px]">
                {externalTeam.map(m => (
                  <button type="button" key={m.id} onClick={() => handleMultiSelect(m.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                      formData.team_members.includes(m.id) 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white text-slate-400 border-slate-200'
                    }`}>
                    {m.username}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Start Date</label>
                <input type="date" required className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold"
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">End Date</label>
                <input type="date" required className="w-full px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold"
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>

            <button disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-[#f5914e] transition-all shadow-xl shadow-slate-200">
              {loading ? 'Processing...' : 'Deploy Project Instance'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;