import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// import emailjs from '@emailjs/browser'; // Commented out
import {
  Plus, MoreHorizontal, Briefcase, FileText,
  ArrowRight, X, Building2, Image as ImageIcon,
  Mail, Globe, MapPin, User, Lock, Search, Sparkles, Phone
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api';

/* ───────────────────────── CREATE WORKSPACE MODAL ───────────────────────── */

const CreateWorkspaceModal = ({ isOpen, onClose, onClientCreated }) => {
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    company_name: '',
    contact_email: '',
    phone: '',
    website: '',
    address: '',
    logo: null,
  });

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, logo: file });
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append('username', formData.username);
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('company_name', formData.company_name);
    data.append('contact_email', formData.contact_email);
    data.append('phone', formData.phone);
    data.append('website', formData.website);
    data.append('address', formData.address);
    if (formData.logo) data.append('logo', formData.logo);

    try {
      const token = localStorage.getItem('access_token');
      await api.post('clients/create/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      onClientCreated();

      /* ───────────────────────── EMAILJS DISABLED ─────────────────────────
      try {
        const templateParams = {
          to_name: formData.username,
          user_email: formData.email,
          user_password: formData.password,
          project_name: formData.company_name
        };

        await emailjs.send(
          'service_oczgldo',
          'template_nl49nvu',
          templateParams,
          'GmA-Cd5MqIElqmX5b'
        );
      } catch (emailErr) {
        console.warn("Email notify failed:", emailErr);
      }
      ────────────────────────────────────────────────────────────────────── */

      onClose();
    } catch (error) {
      console.error("Backend Error:", error.response?.data);
      alert("Registration Error: " + JSON.stringify(error.response?.data || "Server unreachable"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 border border-slate-100">
        <div className="p-8 md:p-12">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter">New <span className="text-[#F58A4B]">Workspace</span></h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Environment Deployment Wizard</p>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="p-8 bg-slate-50/50 rounded-[2rem] space-y-5 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={14} className="text-[#F58A4B]" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Security Credentials</p>
              </div>
              <Input icon={User} label="Admin Username" placeholder="admin_user" onChange={(v) => setFormData({ ...formData, username: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input icon={Mail} label="Access Email" placeholder="user@company.com" onChange={(v) => setFormData({ ...formData, email: v, contact_email: v })} />
                <Input icon={Lock} label="Master Password" placeholder="••••••••" type="password" onChange={(v) => setFormData({ ...formData, password: v })} />
              </div>
            </div>

            <div className="space-y-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Corporate Identity</p>
              <div className="grid md:grid-cols-2 gap-6">
                <Input icon={Building2} label="Company Name" placeholder="Acme Inc" onChange={(v) => setFormData({ ...formData, company_name: v })} />
                <Input icon={Phone} label="Contact Phone" placeholder="+91..." onChange={(v) => setFormData({ ...formData, phone: v })} />
              </div>

              <div className="grid md:grid-cols-2 gap-6 items-end">
                <Input icon={Globe} label="Official Website" placeholder="www.acme.com" onChange={(v) => setFormData({ ...formData, website: v })} />
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-4">Brand Assets (Logo)</label>
                  <div className="relative group">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-[10px] p-3 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer file:hidden hover:border-[#F58A4B] transition-colors" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {logoPreview ? <img src={logoPreview} className="w-7 h-7 rounded-lg object-cover shadow-sm border border-white" alt="prev" /> : <ImageIcon size={16} className="text-slate-300" />}
                    </div>
                  </div>
                </div>
              </div>

              <Textarea label="Registered Address" onChange={(v) => setFormData({ ...formData, address: v })} />
            </div>

            <button disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-[#F58A4B] transition-all shadow-xl shadow-slate-200 disabled:opacity-50 group flex items-center justify-center gap-3">
              {loading ? 'Initializing Data Systems...' : <>Deploy Workspace <Sparkles size={16} className="group-hover:animate-pulse" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── MAIN PAGE ───────────────────────── */

export default function ClientManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await api.get('clients/list/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const filteredClients = clients.filter(c =>
    c?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 antialiased pb-20 font-sans">
      <Navbar hideLogin />
      <CreateWorkspaceModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onClientCreated={fetchClients} />

      <div className="pt-8 px-6 md:px-10 max-w-[1600px] mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-black uppercase italic tracking-tighter text-slate-900">Client <span className="text-[#F58A4B]">Management</span></h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
              <Building2 size={14} className="text-[#F58A4B]" /> Enterprise Workspace Directory
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#F58A4B] transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search workspaces..."
                className="pl-14 pr-8 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-semibold focus:outline-none focus:border-[#F58A4B] w-full md:w-80 shadow-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={() => setIsModalOpen(true)} className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl hover:bg-[#F58A4B] transition-all">
              <Plus size={18} /> Create Workspace
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white border border-slate-100 rounded-[2.5rem] animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredClients.map((client) => (
              <ClientCard key={client.id} data={client} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── HELPERS ───────────────────────── */

const ClientCard = ({ data }) => {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 hover:shadow-2xl hover:border-[#F58A4B]/20 transition-all group relative overflow-hidden flex flex-col h-full">
      <div className="flex justify-between items-start mb-8">
        <div className="flex gap-4 items-center">
          {data?.logo ? (
            <img src={data.logo} className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm transition-transform group-hover:scale-105" alt="logo" />
          ) : (
            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-[#F58A4B] font-black text-xl shadow-lg">
              {data?.company_name?.[0] || 'C'}
            </div>
          )}
          <div className="max-w-[150px]">
            <h3 className="font-black text-lg text-slate-900 leading-tight uppercase truncate">{data?.company_name || 'Unnamed Client'}</h3>
            <p className="text-[10px] text-slate-400 font-bold truncate tracking-tight">{data?.contact_email || data?.email}</p>
          </div>
        </div>
        <button className="p-2 text-slate-300 hover:text-slate-900 transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <MiniCard icon={Phone} label="Contact" value={data?.phone || "N/A"} />
        <div className="bg-slate-50 p-3 rounded-2xl border border-transparent hover:border-orange-100 transition-colors">
          <Globe size={14} className="text-[#F58A4B] mb-1" />
          <p className="text-[8px] uppercase font-black text-slate-400 tracking-tighter">Network</p>
          {data?.website ? (
            <a
              href={`https://${data.website.replace(/^https?:\/\//, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-black text-slate-900 hover:text-[#F58A4B] underline underline-offset-2 truncate block"
            >
              Visit Site
            </a>
          ) : (
            <p className="text-[10px] font-black text-slate-900">N/A</p>
          )}
        </div>
      </div>

      <div className="bg-slate-50/50 p-4 rounded-2xl mb-8 flex gap-3 items-center border border-slate-100/50">
        <MapPin size={14} className="text-[#F58A4B] shrink-0" />
        <div className="truncate">
          <p className="text-[8px] uppercase font-black text-slate-400 tracking-tighter leading-none mb-1">HQ Location</p>
          <p className="text-[10px] font-bold text-slate-600 truncate">{data?.address || "No address provided"}</p>
        </div>
      </div>

      <div className="mt-auto flex justify-between items-center border-t border-slate-50 pt-6">
        <div className="bg-slate-100 px-3 py-1 rounded-full">
          <span className="text-[9px] uppercase text-slate-500 font-black tracking-widest">ID: #{data?.id}</span>
        </div>
        <button onClick={() => navigate(`/clients/${data?.id}`)} className="bg-slate-900 text-white p-3.5 rounded-xl hover:bg-[#F58A4B] transition-all shadow-lg active:scale-95 group/btn">
          <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

const Input = ({ icon: Icon, label, placeholder, onChange, type = "text" }) => (
  <div className="space-y-1.5 group">
    <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest transition-colors group-focus-within:text-[#F58A4B]">{label}</label>
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-[#F58A4B]" size={16} />
      <input
        required type={type}
        className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-900 placeholder:text-slate-300 focus:border-[#F58A4B] outline-none transition-all shadow-sm"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  </div>
);

const Textarea = ({ label, onChange }) => (
  <div className="space-y-1.5 group">
    <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest transition-colors group-focus-within:text-[#F58A4B]">{label}</label>
    <textarea
      rows="2"
      className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-900 placeholder:text-slate-300 focus:border-[#F58A4B] outline-none shadow-sm transition-all"
      onChange={(e) => onChange(e.target.value)}
      placeholder="Full office address..."
    />
  </div>
);

const MiniCard = ({ icon: Icon, label, value }) => (
  <div className="bg-slate-50 p-3 rounded-2xl border border-transparent hover:border-orange-100 transition-colors">
    <Icon size={14} className="text-[#F58A4B] mb-1" />
    <p className="text-[8px] uppercase font-black text-slate-400 tracking-tighter">{label}</p>
    <p className="text-[10px] font-black text-slate-900 truncate uppercase">{value}</p>
  </div>
);