import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Mail, Briefcase, Search, Loader2, ArrowRight, Users, Zap, ExternalLink
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import api from '../../api';
import { resolveMediaUrl } from '../../utils/media';

export default function DDTMEBasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const role = (localStorage.getItem('role') || '').toUpperCase();
      if (!localStorage.getItem('access_token')) return;

      let endpoint = 'clients/list/';
      if (role === 'EMPLOYEE') {
        endpoint = 'employees/clients/';
      }

      const response = await api.get(endpoint);
      setClients(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Fetch Error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = clients.filter(c => {
    const matchesSearch = c?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeFilter === 'All' ||
      (activeFilter === 'Active' && c?.status?.toLowerCase() === 'active') ||
      (activeFilter === 'Inactive' && c?.status?.toLowerCase() === 'inactive');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-screen w-screen bg-[#FBFBFB] antialiased font-sans flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto transition-all duration-300 pb-20">

        <div className="max-w-[1400px] mx-auto px-6 pt-4 space-y-4">

          {/* Modern Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-slate-200 pb-6 md:pb-10">
            <div className="space-y-1 md:space-y-2">
              <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-widest text-[9px] md:text-[10px] uppercase">
                <Zap size={14} fill="currentColor" />
                <span>Digital Transformation Metrics</span>
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                DDTME <span className="text-slate-400 font-light">Workspaces</span>
              </h1>
            </div>

            {/* Styled Search Bar */}
            <div className="relative group w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Search companies..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filters and Client Count */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {['All', 'Active', 'Inactive'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 md:px-5 md:py-2 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-wider transition-all ${activeFilter === filter
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Showing {filteredClients.length} Organizations
            </p>
          </div>

          {/* Client Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Data</p>
            </div>
          ) : filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filteredClients.map((client) => (
                <DDTMEClientCard key={client.id} data={client} />
              ))}
            </div>
          ) : (
            <div className="py-40 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
              <Building2 size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-bold">No workspaces found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const DDTMEClientCard = ({ data }) => {
  const navigate = useNavigate();
  const isActive = data?.status?.toLowerCase() === 'active';

  return (
    <div
      // UPDATED NAVIGATION: Navigates to the DDTME specific route
      onClick={() => navigate(`/ddtme/client/${data?.id}`)}
      className="group bg-white border border-slate-200 rounded-[2rem] p-6 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[220px] relative overflow-hidden"
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
        <Zap size={120} />
      </div>

      <div className="flex items-start justify-between relative z-10">
        <div className="flex gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
            {data?.logo ? (
              <img src={resolveMediaUrl(data.logo)} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-black text-indigo-600">{data?.company_name?.[0]}</span>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base md:text-lg text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight truncate max-w-[120px] sm:max-w-[200px]">
              {data?.company_name}
            </h3>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Mail size={12} />
              <span className="truncate max-w-[150px]">{data?.contact_email || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}>
          {data?.status || 'Pending'}
        </div>
      </div>

      <div className="flex items-center justify-between mt-8 relative z-10">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (data?.id) {
                navigate(`/ddtme/client/${data.id}/ryg`);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl hover:bg-indigo-600 hover:text-white transition-all"
          >
            <span className="text-[10px] font-black uppercase tracking-widest">DDTMERYG</span>
            <ExternalLink size={14} />
          </button>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Active Metrics</span>
          <div className="flex items-center gap-2">
            <Briefcase size={14} className="text-indigo-500" />
            <span className="text-sm font-bold text-slate-700">{data?.project_count || 0} Managed Projects</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
          <span className="text-[10px] font-black uppercase tracking-widest">Open DDTME</span>
          <ExternalLink size={14} />
        </div>
      </div>
    </div>
  );
};
