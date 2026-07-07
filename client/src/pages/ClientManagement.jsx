import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Building2, Mail, Briefcase,
  Search, MoreHorizontal, Edit2, ArrowRight, Trash2, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../api';
import CreateWorkspaceModal from './createuser/CreateWorkspaceModal';
import { resolveMediaUrl } from '../utils/media';
import { PageHeader, Band, Bands } from '../components/kayaara/Band';

export default function ClientManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = (localStorage.getItem('role') || '').toUpperCase();

  const fetchClients = async () => {
    try {
      setLoading(true);
      if (!localStorage.getItem('access_token')) return;

      let endpoint = 'clients/list/';
      // SGM now uses the main list endpoint which filters by assigned_sgm
      // if (role === 'SGM') endpoint = 'sgm/clients/';
      if (role === 'EMPLOYEE') endpoint = 'employees/clients/';

      const response = await api.get(endpoint);
      setClients(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Fetch Error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleEdit = (client) => {
    setSelectedClient(client);
    setIsModalOpen(true);
  };

  /* New State for Delete Confirmation */
  const [clientToDelete, setClientToDelete] = useState(null);

  const confirmDelete = (clientId) => {
    setClientToDelete(clientId);
  };

  const executeDelete = async () => {
    if (!clientToDelete) return;
    try {
      // Headers handled by api.js interceptor
      await api.delete(`clients/${clientToDelete}/`);
      fetchClients();
    } catch (error) {
      console.error("Delete Error:", error);
      alert("Failed to delete client: " + JSON.stringify(error.response?.data || error.message));
    } finally {
      setClientToDelete(null);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedClient(null);
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeFilter === 'All' ||
      (activeFilter === 'Active' && c?.status?.toLowerCase() === 'active') ||
      (activeFilter === 'Hold' && c?.status?.toLowerCase() === 'hold') ||
      (activeFilter === 'Inactive' && c?.status?.toLowerCase() === 'inactive');
    return matchesSearch && matchesStatus;
  });

  const handleStatusToggle = async (client) => {
    try {
      const nextStatus = client.status === 'active' ? 'hold' : 'active';
      await api.patch(`clients/${client.id}/`, { status: nextStatus });
      fetchClients();
    } catch (error) {
      console.error("Status Update Error:", error.response?.data || error.message);
      alert("Failed to update status: " + JSON.stringify(error.response?.data || error.message));
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* DELETE CONFIRMATION MODAL */}
        <AnimatePresence>
          {clientToDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="k-backdrop"
              onClick={() => setClientToDelete(null)}
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 12 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="k-modal max-w-md p-6 md:p-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--k-blue-tint)' }}>
                    <Trash2 size={26} style={{ color: 'var(--k-blue)' }} />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--k-ink)' }}>Delete workspace?</h3>
                  <p className="text-sm" style={{ color: 'var(--k-grey-500)' }}>
                    Are you sure you want to delete this workspace? This action cannot be undone and will remove all associated data.
                  </p>

                  <div className="grid grid-cols-2 gap-3 w-full pt-2">
                    <button onClick={() => setClientToDelete(null)} className="k-btn-ghost w-full">
                      Cancel
                    </button>
                    <button
                      onClick={executeDelete}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                      style={{ background: 'var(--k-ink)' }}
                    >
                      Yes, delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <CreateWorkspaceModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onClientCreated={fetchClients}
          initialData={selectedClient}
        />

        <PageHeader
          title="Client"
          accent="Management"
          subtitle="Enterprise workspace directory"
          actions={
            ['ADMIN', 'KAYAARA', 'MLS'].includes(role) ? (
              <button
                onClick={() => { setSelectedClient(null); setIsModalOpen(true); }}
                className="k-btn-primary flex items-center gap-2 text-sm"
              >
                <Plus size={16} /> Create workspace
              </button>
            ) : null
          }
        />

        <main className="flex-1 overflow-y-auto k-scroll">
          <Bands>
            <Band tone="grey">
              {/* Controls Section */}
              <div className="k-card p-3 md:p-4 flex flex-col xl:flex-row items-center justify-between gap-3 md:gap-4 mb-6">
                <div className="relative w-full xl:w-[420px] group">
                  <Search
                    className="absolute inset-y-0 left-4 my-auto"
                    style={{ color: 'var(--k-grey-500)' }}
                    size={18}
                  />
                  <input
                    type="text"
                    placeholder="Search by company, email, or ID..."
                    className="k-input"
                    style={{ paddingLeft: '2.75rem' }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1.5 rounded-xl p-1.5 overflow-x-auto w-full md:w-auto" style={{ background: 'var(--k-band-grey)' }}>
                  {['All', 'Active', 'Hold', 'Inactive'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter(filter)}
                      className="px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all"
                      style={activeFilter === filter
                        ? { background: 'var(--k-white)', color: 'var(--k-blue)', boxShadow: 'var(--k-shadow-card)' }
                        : { color: 'var(--k-grey-500)' }}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Client Grid */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="k-skeleton h-[220px]" />
                  ))}
                </div>
              ) : filteredClients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {filteredClients.map((client, index) => (
                    <ClientCard
                      key={client.id}
                      data={client}
                      index={index}
                      onEdit={() => handleEdit(client)}
                      onDelete={() => confirmDelete(client.id)}
                      onToggleStatus={() => handleStatusToggle(client)}
                      canToggleStatus={role === 'SGM' || role === 'ADMIN'}
                    />
                  ))}
                </div>
              ) : (
                <div className="k-card flex flex-col items-center justify-center py-24 text-center gap-3">
                  <Building2 size={48} style={{ color: 'var(--k-grey-300)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-500)' }}>No workspaces found matching your criteria.</p>
                </div>
              )}
            </Band>
          </Bands>
        </main>
      </div>
    </div>
  );
}

const ClientCard = ({ data, index, onEdit, onDelete, onToggleStatus, canToggleStatus }) => {
  const navigate = useNavigate();
  const isActive = data?.status?.toLowerCase() === 'active';
  const isAdmin = ['ADMIN', 'KAYAARA', 'MLS'].includes((localStorage.getItem('role') || '').toUpperCase());
  const isHold = data?.status?.toLowerCase() === 'hold';
  const [showMenu, setShowMenu] = useState(false);

  const statusDotColor = isActive ? 'var(--k-blue)' : isHold ? 'var(--k-blue-light)' : 'var(--k-grey-300)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => navigate(`/clients/${data?.id}`)}
      className="k-card group relative p-5 md:p-6 cursor-pointer flex flex-col gap-5 h-full"
    >
      {/* Header: Logo + Name + Menu */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {/* Logo */}
          <div className="relative shrink-0">
            {data?.logo ? (
              <img
                src={resolveMediaUrl(data.logo)}
                className="w-14 h-14 rounded-2xl object-cover"
                style={{ border: '1px solid var(--k-grey-200)' }}
                alt="logo"
                onError={(e) => { e.target.onerror = null; e.target.src = ""; e.target.className = "hidden"; }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg"
                style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
              >
                {data?.company_name?.[0] || 'C'}
              </div>
            )}
            <span
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full"
              style={{ border: '2px solid var(--k-white)', background: statusDotColor }}
            />
          </div>

          {/* Name & Email */}
          <div className="min-w-0 space-y-1">
            <h3 className="font-bold text-base truncate transition-colors" style={{ color: 'var(--k-ink)' }}>
              {data?.company_name}
            </h3>

            <div className="space-y-1">
              <p className="text-xs truncate flex items-center gap-2" style={{ color: 'var(--k-grey-500)' }}>
                <Mail size={12} className="shrink-0" />
                <span className="truncate">{data?.contact_email || data?.email || 'No email'}</span>
              </p>
              <p className="text-xs font-semibold truncate flex items-center gap-2" style={{ color: 'var(--k-grey-700)' }}>
                <Briefcase size={12} className="shrink-0" style={{ color: 'var(--k-blue)' }} />
                <span>{data?.project_count || 0} active projects</span>
              </p>
            </div>
          </div>
        </div>

        {/* Admin Menu */}
        {(isAdmin || canToggleStatus) && (
          <div onClick={e => e.stopPropagation()} className="relative shrink-0 -mt-1 -mr-1">
            <button
              onClick={() => setShowMenu(!showMenu)}
              onBlur={() => setTimeout(() => setShowMenu(false), 200)}
              className="k-btn-icon"
            >
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div
                className="absolute right-0 top-full mt-2 w-40 rounded-2xl overflow-hidden z-50 p-1"
                style={{ background: 'var(--k-white)', border: '1px solid var(--k-grey-200)', boxShadow: 'var(--k-shadow-modal)' }}
              >
                {canToggleStatus && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setShowMenu(false);
                      onToggleStatus();
                    }}
                    disabled={data?.status?.toLowerCase() === 'inactive'}
                    className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-2 transition-colors"
                    style={{
                      color: 'var(--k-blue)',
                      opacity: data?.status?.toLowerCase() === 'inactive' ? 0.5 : 1,
                      cursor: data?.status?.toLowerCase() === 'inactive' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isActive ? 'Hold' : 'Active'}
                  </button>
                )}
                {isAdmin && (
                  <>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setShowMenu(false); onEdit(); }}
                      className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-2"
                      style={{ color: 'var(--k-grey-700)' }}
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider rounded-xl flex items-center gap-2"
                      style={{ color: 'var(--k-ink)' }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SGM Info or Spacer */}
      <div className="pt-4 flex items-center justify-between mt-auto" style={{ borderTop: '1px solid var(--k-grey-100)' }}>
        <div className="flex items-center gap-3 min-w-0">
          {data?.assigned_sgms_details?.length > 0 ? (
            <>
              <div className="flex -space-x-2.5 shrink-0 pl-1">
                {data.assigned_sgms_details.slice(0, 3).map((sgm, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold uppercase shrink-0"
                    style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)', border: '2px solid var(--k-white)' }}
                    title={sgm.full_name}
                  >
                    {sgm.full_name?.[0]}
                  </div>
                ))}
                {data.assigned_sgms_details.length > 3 && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ background: 'var(--k-band-grey)', color: 'var(--k-grey-500)', border: '2px solid var(--k-white)' }}
                  >
                    +{data.assigned_sgms_details.length - 3}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--k-grey-500)' }}>Assigned team</span>
            </>
          ) : (
            <span className="text-[10px] font-semibold italic flex items-center gap-2" style={{ color: 'var(--k-grey-300)' }}>
              <Users size={14} /> No agents assigned
            </span>
          )}
        </div>

        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          style={{ background: 'var(--k-band-grey)', color: 'var(--k-grey-500)' }}
        >
          <ArrowRight size={16} />
        </div>
      </div>
    </motion.div>
  );
};
