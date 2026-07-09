import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail, Briefcase, Search, Zap, ExternalLink
} from 'lucide-react';
import { SkeletonCard } from '../../components/SkeletonLoader';
import Sidebar from '../../components/Sidebar';
import api from '../../api';
import { resolveMediaUrl } from '../../utils/media';
import { PageHeader } from '../../components/kayaara/Band';

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
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Monthly"
          accent="Planning"
          subtitle="Monthly planning and deliverables tracking"
          actions={
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" size={16} style={{ color: 'var(--k-grey-500)' }} />
              <input
                type="text"
                placeholder="Search companies..."
                className="k-input !pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          }
        />

        <main className="flex-1 overflow-y-auto k-scroll">
          <div className="k-band-grey k-band-pad">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <div className="flex flex-wrap gap-2">
                {['All', 'Active', 'Inactive'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={activeFilter === filter ? 'k-pill-solid !px-4 !py-2 !text-[11px]' : 'k-btn-ghost !px-4 !py-2 !text-[11px] !rounded-full'}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <p className="k-eyebrow">
                Showing {filteredClients.length} organizations
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <SkeletonCard key={idx} />
                ))}
              </div>
            ) : filteredClients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {filteredClients.map((client, index) => (
                  <DDTMEClientCard key={client.id} data={client} index={index} />
                ))}
              </div>
            ) : (
              <div className="py-32 text-center rounded-[2rem] border" style={{ borderStyle: 'dashed', borderColor: 'var(--k-grey-200)', background: 'var(--k-white)' }}>
                <img src="/kayaara-mark.png" alt="" className="w-14 h-14 mx-auto mb-4 opacity-30" />
                <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-500)' }}>No workspaces found matching your criteria.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const DDTMEClientCard = ({ data, index = 0 }) => {
  const navigate = useNavigate();
  const isActive = data?.status?.toLowerCase() === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.06, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(`/ddtme/client/${data?.id}`)}
      className="k-card group p-6 cursor-pointer flex flex-col justify-between min-h-[220px] relative overflow-hidden"
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.04] group-hover:opacity-[0.1] transition-opacity" style={{ color: 'var(--k-blue)' }}>
        <Zap size={120} />
      </div>

      <div className="flex items-start justify-between relative z-10">
        <div className="flex gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform"
            style={{ background: 'var(--k-blue-tint)', border: '1px solid var(--k-grey-200)' }}
          >
            {data?.logo ? (
              <img src={resolveMediaUrl(data.logo)} alt="logo" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold" style={{ color: 'var(--k-blue)' }}>{data?.company_name?.[0]}</span>
            )}
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base md:text-lg leading-tight truncate max-w-[120px] sm:max-w-[200px]" style={{ color: 'var(--k-ink)' }}>
              {data?.company_name}
            </h3>
            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--k-grey-500)' }}>
              <Mail size={12} />
              <span className="truncate max-w-[150px]">{data?.contact_email || 'N/A'}</span>
            </div>
          </div>
        </div>

        <span className={isActive ? 'k-pill' : 'k-pill-grey'}>
          {data?.status || 'Pending'}
        </span>
      </div>

      <div className="flex items-center justify-between mt-8 relative z-10 gap-3">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (data?.id) {
                navigate(`/ddtme/client/${data.id}/ryg`);
              }
            }}
            className="k-btn-ghost !px-3.5 !py-2 flex items-center gap-2 !text-[10px] uppercase tracking-widest"
          >
            <span>DDTMERYG</span>
            <ExternalLink size={13} />
          </button>
          <span className="k-eyebrow">Active metrics</span>
          <div className="flex items-center gap-2">
            <Briefcase size={14} style={{ color: 'var(--k-blue)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--k-grey-700)' }}>{data?.project_count || 0} Managed projects</span>
          </div>
        </div>

        <div
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all shrink-0"
          style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">Open DDTME</span>
          <ExternalLink size={13} />
        </div>
      </div>
    </motion.div>
  );
};
