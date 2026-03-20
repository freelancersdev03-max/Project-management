import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Building2, Mail, Briefcase,
  Search, MoreHorizontal, Edit2, Loader2, ArrowRight, Trash2, Users
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import api from '../api';
import CreateWorkspaceModal from './createuser/CreateWorkspaceModal';
import { resolveMediaUrl } from '../utils/media';

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
      if (role === 'EXTERNAL') endpoint = 'employees/external-clients/';

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
    <div className="h-screen w-screen bg-slate-50 antialiased font-sans flex overflow-hidden selection:bg-[#F58A4B] selection:text-white">
      <Sidebar />

      <main className="flex-1 overflow-y-auto transition-all duration-300 pb-20">

        {/* DELETE CONFIRMATION MODAL */}
        {clientToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 max-w-md w-full shadow-2xl border border-slate-100">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                  <Trash2 size={32} className="text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">Delete Workspace?</h3>
                <p className="text-sm font-medium text-slate-500">
                  Are you sure you want to delete this workspace? This action cannot be undone and will remove all associated data.
                </p>

                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                  <button
                    onClick={() => setClientToDelete(null)}
                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDelete}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <CreateWorkspaceModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onClientCreated={fetchClients}
          initialData={selectedClient}
        />

        {/* HEADER */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-[1400px] xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10 py-4 md:py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Client <span className="text-[#F58A4B]">Management</span></h1>
                <p className="text-slate-500 font-medium text-sm flex items-center gap-2"><Briefcase size={16} /> Enterprise Workspace Directory</p>
              </div>

              {((localStorage.getItem('role') || '').toUpperCase() === 'ADMIN') && (
                <button
                  onClick={() => { setSelectedClient(null); setIsModalOpen(true); }}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-[#F58A4B] transition-all shadow-lg flex items-center gap-2"
                >
                  <Plus size={16} /> Create Workspace
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] xl:max-w-[1600px] mx-auto px-4 md:px-6 lg:px-10 pt-6 md:pt-10 space-y-8 md:space-y-12">

          {/* Controls Section */}
          <div className="sticky top-24 z-30 bg-white/80 backdrop-blur-xl p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] border border-white/50 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 transition-all duration-500">
            <div className="relative w-full md:w-[480px] group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="text-slate-300 group-focus-within:text-[#F58A4B] transition-colors duration-300" size={20} />
              </div>
              <input
                type="text"
                placeholder="Search by company, email, or ID..."
                className="block w-full pl-14 pr-6 py-4 bg-slate-50/50 border-0 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-[#F58A4B]/20 focus:bg-white transition-all duration-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1 md:gap-1.5 bg-slate-100/50 p-1 md:p-1.5 rounded-xl md:rounded-2xl overflow-x-auto w-full md:w-auto">
              {['All', 'Active', 'Hold', 'Inactive'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeFilter === filter
                    ? 'bg-white text-[#F58A4B] shadow-lg shadow-black/5 ring-1 ring-black/5 scale-100'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50 scale-95 hover:scale-100'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Client Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <Loader2 className="animate-spin text-[#F58A4B]" size={48} />
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 animate-pulse">Syncing Directory...</p>
            </div>
          ) : filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
              {filteredClients.map((client) => (
                <ClientCard
                  key={client.id}
                  data={client}
                  onEdit={() => handleEdit(client)}
                  onDelete={() => confirmDelete(client.id)}
                  onToggleStatus={() => handleStatusToggle(client)}
                  canToggleStatus={role === 'SGM' || role === 'ADMIN'}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center space-y-4 opacity-50">
              <Building2 size={64} className="text-slate-300" />
              <p className="text-sm font-bold text-slate-400">No workspaces found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const ClientCard = ({ data, onEdit, onDelete, onToggleStatus, canToggleStatus }) => {
  const navigate = useNavigate();
  const isActive = data?.status?.toLowerCase() === 'active';
  const isAdmin = (localStorage.getItem('role') || '').toUpperCase() === 'ADMIN';
  const isHold = data?.status?.toLowerCase() === 'hold';
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={() => navigate(`/clients/${data?.id}`)}
      className="group relative bg-white rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 hover:shadow-2xl hover:shadow-slate-200/50 border border-slate-100 hover:border-[#F58A4B]/30 transition-all duration-300 cursor-pointer flex flex-col gap-4 md:gap-6 h-full"
    >
      {/* Header: Logo + Name + Menu */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {/* Logo */}
          <div className="relative shrink-0">
            {data?.logo ? (
              <img
                src={resolveMediaUrl(data.logo)}
                className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-slate-50 border border-slate-100 ring-4 ring-slate-50/50 group-hover:ring-white transition-all"
                alt="logo"
                onError={(e) => { e.target.onerror = null; e.target.src = ""; e.target.className = "hidden"; }}
              />
            ) : (
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-[#F58A4B] font-black text-xl shadow-sm border border-slate-800 ring-4 ring-slate-50/50 group-hover:ring-white transition-all">
                {data?.company_name?.[0] || 'C'}
              </div>
            )}
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] border-white ${isActive ? 'bg-emerald-400' : isHold ? 'bg-yellow-400' : 'bg-slate-300'}`} />
          </div>

          {/* Name & Email */}
          <div className="min-w-0 space-y-1">
            <h3 className="font-black text-lg text-slate-900 uppercase truncate group-hover:text-[#F58A4B] transition-colors leading-tight tracking-tight">
              {data?.company_name}
            </h3>

            <div className="space-y-1.5">
              <p className="text-xs text-slate-400 font-bold truncate flex items-center gap-2">
                <Mail size={12} className="shrink-0" />
                <span className="truncate">{data?.contact_email || data?.email || 'No email'}</span>
              </p>
              <p className="text-xs text-slate-500 font-black truncate flex items-center gap-2">
                <Briefcase size={12} className="shrink-0 text-[#F58A4B]" />
                <span>{data?.project_count || 0} Active Projects</span>
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
              className="p-2 text-slate-300 hover:text-[#F58A4B] hover:bg-orange-50 rounded-xl transition-all"
            >
              <MoreHorizontal size={20} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[50] p-1">
                {canToggleStatus && (
                  <>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setShowMenu(false);
                        onToggleStatus();
                      }}
                      disabled={data?.status?.toLowerCase() === 'inactive'}
                      className={`w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-yellow-50 flex items-center gap-2 text-yellow-700 rounded-xl ${data?.status?.toLowerCase() === 'inactive' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isActive ? 'Hold' : 'Active'}
                    </button>
                  </>
                )}
                {isAdmin && (
                  <>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setShowMenu(false); onEdit(); }}
                      className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 flex items-center gap-2 text-slate-600 rounded-xl"
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
                      className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-red-50 flex items-center gap-2 text-red-500 rounded-xl"
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
      <div className="pt-4 border-t border-slate-50 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-3 min-w-0">
          {data?.assigned_sgms_details?.length > 0 ? (
            <>
              <div className="flex -space-x-2.5 shrink-0 pl-1">
                {data.assigned_sgms_details.slice(0, 3).map((sgm, i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-purple-50 border-[3px] border-white flex items-center justify-center text-[10px] font-black text-purple-600 uppercase shadow-sm" title={sgm.full_name}>
                    {sgm.full_name?.[0]}
                  </div>
                ))}
                {data.assigned_sgms_details.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-slate-100 border-[3px] border-white flex items-center justify-center text-[9px] font-black text-slate-500 shadow-sm">
                    +{data.assigned_sgms_details.length - 3}
                  </div>
                )}
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">Assigned Team</span>
            </>
          ) : (
            <span className="text-[10px] font-bold text-slate-300 italic flex items-center gap-2 ml-1"><Users size={14} /> No Agents Assigned</span>
          )}
        </div>

        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#F58A4B] group-hover:text-white transition-colors shrink-0 shadow-sm">
          <ArrowRight size={16} />
        </div>
      </div>
    </div>
  );
};
