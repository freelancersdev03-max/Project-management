import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Building2, Mail, Briefcase,
  Search, MoreHorizontal, Edit2, ArrowRight, Trash2, Users, CheckCircle2, XCircle
} from 'lucide-react';
import { SkeletonCard } from '../components/SkeletonLoader';
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

  const [clientToDelete, setClientToDelete] = useState(null);

  const confirmDelete = (clientId) => {
    setClientToDelete(clientId);
  };

  const executeDelete = async () => {
    if (!clientToDelete) return;
    try {
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
    <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        
        {/* DELETE CONFIRMATION MODAL */}
        {clientToDelete && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                  <Trash2 size={32} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Delete Workspace?</h3>
                  <p className="text-sm font-medium text-slate-500 mt-2">
                    Are you sure you want to delete this workspace? This action cannot be undone and will remove all associated data.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full pt-4">
                  <button
                    onClick={() => setClientToDelete(null)}
                    className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={executeDelete}
                    className="w-full py-3 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
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

        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Organization Management</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span>Directory</span>
              <ArrowRight size={14} className="text-slate-400" />
              <span className="text-slate-900 font-medium">All Workspaces</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {['ADMIN', 'HQEPL', 'MLS'].includes(role) && (
              <button
                onClick={() => { setSelectedClient(null); setIsModalOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus size={16} /> New Workspace
              </button>
            )}
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
          
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="relative w-full md:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
              {['All', 'Active', 'Hold', 'Inactive'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeFilter === filter
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* Client Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <SkeletonCard key={idx} />
              ))}
            </div>
          ) : filteredClients.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Building2 size={32} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No organizations found</h3>
              <p className="text-slate-500 mt-1 text-sm max-w-sm">
                We couldn't find any organizations matching your current filters.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const ClientCard = ({ data, onEdit, onDelete, onToggleStatus, canToggleStatus }) => {
  const navigate = useNavigate();
  const isActive = data?.status?.toLowerCase() === 'active';
  const isHold = data?.status?.toLowerCase() === 'hold';
  const isAdmin = ['ADMIN', 'HQEPL', 'MLS'].includes((localStorage.getItem('role') || '').toUpperCase());
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={() => navigate(`/clients/${data?.id}`)}
      className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer flex flex-col group relative"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            {data?.logo ? (
              <img
                src={resolveMediaUrl(data.logo)}
                className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                alt="logo"
                onError={(e) => { e.target.onerror = null; e.target.src = ""; e.target.className = "hidden"; }}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold border border-blue-100">
                {data?.company_name?.[0] || 'C'}
              </div>
            )}
            <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${isActive ? 'bg-emerald-500' : isHold ? 'bg-amber-500' : 'bg-slate-400'}`} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {data?.company_name}
            </h3>
            <span className="text-xs text-slate-500 inline-block px-2 py-0.5 bg-slate-100 rounded mt-1 font-medium">
              ID: {data?.id}
            </span>
          </div>
        </div>

        {(isAdmin || canToggleStatus) && (
          <div onClick={e => e.stopPropagation()} className="relative -mt-2 -mr-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              onBlur={() => setTimeout(() => setShowMenu(false), 200)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
                {canToggleStatus && (
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setShowMenu(false); onToggleStatus(); }}
                    disabled={data?.status?.toLowerCase() === 'inactive'}
                    className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2 ${data?.status?.toLowerCase() === 'inactive' ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-700'}`}
                  >
                    {isActive ? <XCircle size={14} className="text-amber-500"/> : <CheckCircle2 size={14} className="text-emerald-500"/>}
                    {isActive ? 'Mark Hold' : 'Mark Active'}
                  </button>
                )}
                {isAdmin && (
                  <>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setShowMenu(false); onEdit(); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <Edit2 size={14} className="text-blue-500"/> Edit
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-red-50 flex items-center gap-2 text-red-600"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4 flex-1">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Mail size={14} className="text-slate-400" />
          <span className="truncate">{data?.contact_email || data?.email || 'No email provided'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Briefcase size={14} className="text-slate-400" />
          <span>{data?.project_count || 0} Active Projects</span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data?.assigned_sgms_details?.length > 0 ? (
            <div className="flex -space-x-2">
              {data.assigned_sgms_details.slice(0, 3).map((sgm, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-indigo-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-indigo-600" title={sgm.full_name}>
                  {sgm.full_name?.[0]}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1"><Users size={12}/> Unassigned</span>
          )}
        </div>
        
        <div className="text-blue-600 text-xs font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
          View <ArrowRight size={14}/>
        </div>
      </div>
    </div>
  );
};
