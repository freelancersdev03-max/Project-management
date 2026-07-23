import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Search, Key, ChevronRight, Lock, Save, Loader2, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import API from '../api';
import { useAuth } from '../context/AuthContext';

const SYSTEM_ROLES = [
  { id: 'ADMIN', name: 'System Administrator', description: 'Full unrestricted access to all organizations, users, and system settings.', badge: 'Tier 1' },
  { id: 'KAYAARA', name: 'Organization Admin', description: 'High-level overseer capable of creating projects and assigning Project Managers.', badge: 'Tier 2' },
  { id: 'MLS', name: 'Team Lead', description: 'Internal leadership equivalent to Organization Admin with cross-project visibility.', badge: 'Tier 2' },
  { id: 'SGM', name: 'Project Manager', description: 'Manages specific assigned projects, creates tasks, and oversees Team Members.', badge: 'Tier 3' },
  { id: 'EMPLOYEE', name: 'Team Member', description: 'Execution team. Completes assigned tasks and earns achievements.', badge: 'Tier 4' },
  { id: 'CLIENT', name: 'Client Owner', description: 'Primary stakeholder with high-level dashboard access for their specific entity.', badge: 'External' },
  { id: 'SENIOR', name: 'Client Leadership', description: 'External upper management overseeing specific client-side deliverables.', badge: 'External' },
  { id: 'EXTERNAL', name: 'External Collaborator', description: 'External team members who collaborate on shared project tasks.', badge: 'External' },
  { id: 'FREELANCER', name: 'Freelancer', description: 'Independent contractor assigned to specific tasks.', badge: 'External' },
  { id: 'VENDOR', name: 'Vendor', description: 'Third-party vendor with restricted access to vendor tasks.', badge: 'External' },
  { id: 'GUEST', name: 'Guest', description: 'Read-only access to assigned shared items.', badge: 'Guest' },
];

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'assigned', label: 'Assigned', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'owned', label: 'Owned', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'project', label: 'Project', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'denied', label: 'Denied', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const RolesManagement = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRole, setActiveRole] = useState(SYSTEM_ROLES[0]);
  const [matrix, setMatrix] = useState({});
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser;

  // Fetch full permission matrix
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [permsRes, matrixRes] = await Promise.all([
          API.get('/permissions/'),
          API.get('/permissions/roles/'),
        ]);
        setPermissions(permsRes.data || []);
        setMatrix(matrixRes.data || {});
      } catch (err) {
        console.error('Error fetching permissions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleScopeChange = async (roleId, permissionId, codename, newScope) => {
    if (!isAdmin) return;

    try {
      setSaving(true);
      await API.post(`/permissions/roles/${roleId}/`, {
        permission_id: permissionId,
        codename,
        scope: newScope,
      });

      // Update local state
      setMatrix((prev) => {
        const roleData = prev[roleId] || { users_count: 0, permissions: [] };
        const updatedPerms = roleData.permissions.map((p) =>
          p.permission === permissionId || p.permission_codename === codename
            ? { ...p, scope: newScope }
            : p
        );
        return {
          ...prev,
          [roleId]: { ...roleData, permissions: updatedPerms },
        };
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error('Error updating permission scope:', err);
    } finally {
      setSaving(false);
    }
  };

  // Group permissions by category
  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  const currentRoleMatrix = matrix[activeRole.id]?.permissions || [];
  const currentRoleUserCount = matrix[activeRole.id]?.users_count || 0;

  const getScopeForPerm = (permId) => {
    const found = currentRoleMatrix.find((p) => p.permission === permId);
    return found ? found.scope : 'denied';
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Roles & Permissions</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span>Administration</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-medium">Role Matrix</span>
            </div>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200">
              <Save size={14} /> Saved successfully
            </div>
          )}
        </header>

        {/* Content Split View */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left Column: Roles List */}
            <div className="w-full md:w-80 border-r border-slate-200 bg-white flex flex-col flex-shrink-0 overflow-y-auto">
              <div className="p-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="p-2 space-y-1">
                {SYSTEM_ROLES.filter((r) =>
                  r.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setActiveRole(role)}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      activeRole.id === role.id
                        ? 'bg-blue-50 border border-blue-100 shadow-sm'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm font-bold ${activeRole.id === role.id ? 'text-blue-700' : 'text-slate-800'}`}>
                        {role.name}
                      </h3>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          role.badge.includes('Tier')
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {role.badge}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                      <Users size={14} />
                      <span>{matrix[role.id]?.users_count || 0} Active Users</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Role Details & Permissions */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8">
              <div className="max-w-4xl mx-auto">
                {/* Role Header */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6 flex items-start gap-5">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{activeRole.name}</h2>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">
                          Role Identifier: {activeRole.id} &bull; {currentRoleUserCount} Active Users
                        </p>
                      </div>
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200">
                        <Lock size={14} /> {isAdmin ? 'Editable Matrix' : 'Read Only'}
                      </span>
                    </div>
                    <p className="mt-3 text-slate-600 text-sm leading-relaxed max-w-2xl">
                      {activeRole.description}
                    </p>
                  </div>
                </div>

                {/* Permissions Matrix Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                      <Key size={18} className="text-slate-400" /> Granular Permission Matrix
                    </h3>
                  </div>

                  <div>
                    {categories.map((cat, idx) => {
                      const catPerms = permissions.filter((p) => p.category === cat);
                      return (
                        <div key={idx} className="border-b border-slate-100 last:border-0">
                          <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{cat}</h4>
                          </div>
                          <div className="divide-y divide-slate-50">
                            {catPerms.map((perm) => {
                              const currentScope = getScopeForPerm(perm.id);
                              return (
                                <div key={perm.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-800">{perm.name}</div>
                                    <div className="text-xs text-slate-400 font-mono mt-0.5">{perm.codename}</div>
                                  </div>

                                  {/* Scope Select or Display Badge */}
                                  {isAdmin && activeRole.id !== 'ADMIN' ? (
                                    <select
                                      value={currentScope}
                                      onChange={(e) => handleScopeChange(activeRole.id, perm.id, perm.codename, e.target.value)}
                                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                                    >
                                      {SCOPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.label}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span
                                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
                                        SCOPE_OPTIONS.find((s) => s.value === currentScope)?.color || 'bg-slate-100 text-slate-600'
                                      }`}
                                    >
                                      {activeRole.id === 'ADMIN' ? 'All (Admin)' : (SCOPE_OPTIONS.find((s) => s.value === currentScope)?.label || currentScope)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RolesManagement;
