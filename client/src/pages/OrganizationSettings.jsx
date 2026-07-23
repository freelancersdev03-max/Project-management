import React, { useState, useEffect } from 'react';
import { Building2, Layers, Users, Mail, Save, Plus, ShieldCheck, ChevronRight, Check, Trash2, RefreshCw } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import API from '../api';
import { useAuth } from '../context/AuthContext';

const OrganizationSettings = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { currentOrg, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('details');

  // Org form state
  const [orgData, setOrgData] = useState({
    name: '',
    industry: '',
    company_size: '',
    country: '',
    timezone: 'UTC',
  });

  // Members & Workspaces state
  const [members, setMembers] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('org_member');
  const [newWsName, setNewWsName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (currentOrg) {
      setOrgData({
        name: currentOrg.name || '',
        industry: currentOrg.industry || '',
        company_size: currentOrg.company_size || '',
        country: currentOrg.country || '',
        timezone: currentOrg.timezone || 'UTC',
      });
      fetchMembers();
      fetchWorkspaces();
      fetchInvitations();
    }
  }, [currentOrg]);

  const fetchMembers = async () => {
    if (!currentOrg) return;
    try {
      const res = await API.get(`/organizations/organizations/${currentOrg.id}/memberships/`);
      setMembers(res.data || []);
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  const fetchWorkspaces = async () => {
    if (!currentOrg) return;
    try {
      const res = await API.get('/organizations/workspaces/');
      setWorkspaces(res.data || []);
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    }
  };

  const fetchInvitations = async () => {
    if (!currentOrg) return;
    try {
      const res = await API.get('/organizations/invitations/');
      setInvitations(res.data || []);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!currentOrg) return;
    try {
      setSaving(true);
      await API.patch(`/organizations/organizations/${currentOrg.id}/`, orgData);
      setMsg({ type: 'success', text: 'Organization details updated successfully!' });
      await refreshUser();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to update organization.' });
    } finally {
      setSaving(false);
    }
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !currentOrg) return;
    try {
      await API.post(`/organizations/organizations/${currentOrg.id}/bulk_invite/`, {
        emails: [inviteEmail],
        role: inviteRole,
      });
      setInviteEmail('');
      setMsg({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
      fetchInvitations();
      fetchMembers();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to send invitation.' });
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWsName) return;
    try {
      await API.post('/organizations/workspaces/', {
        name: newWsName,
      });
      setNewWsName('');
      setMsg({ type: 'success', text: 'Workspace created successfully!' });
      fetchWorkspaces();
      await refreshUser();
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to create workspace.' });
    }
  };

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] antialiased flex overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Organization Settings</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <span>{currentOrg?.name || 'Organization'}</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-medium">Settings & Members</span>
            </div>
          </div>
        </header>

        {/* Tab Header */}
        <div className="bg-white border-b border-slate-200 px-6 flex gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={16} /> Details & Profile
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'members' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={16} /> Members & Invitations ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'workspaces' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={16} /> Workspaces ({workspaces.length})
          </button>
        </div>

        {msg && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-xs font-semibold flex items-center justify-between ${
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <form onSubmit={handleSaveDetails} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
                <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Company Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Organization Name</label>
                    <input
                      type="text"
                      value={orgData.name}
                      onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Industry</label>
                    <input
                      type="text"
                      value={orgData.industry}
                      onChange={(e) => setOrgData({ ...orgData, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      placeholder="e.g. Technology, Pharma, Finance"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={orgData.country}
                      onChange={(e) => setOrgData({ ...orgData, country: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Timezone</label>
                    <select
                      value={orgData.timezone}
                      onChange={(e) => setOrgData({ ...orgData, timezone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="UTC">UTC</option>
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                {/* Invite Form */}
                <form onSubmit={handleInviteUser} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-3">
                  <div className="relative flex-1">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Enter user email to invite..."
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
                  >
                    <option value="org_member">Member</option>
                    <option value="org_admin">Admin</option>
                    <option value="org_viewer">Viewer</option>
                  </select>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Plus size={16} /> Send Invite
                  </button>
                </form>

                {/* Members List */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 font-bold text-xs uppercase text-slate-500 tracking-wider">
                    Active Members ({members.length})
                  </div>
                  <div className="divide-y divide-slate-100">
                    {members.map((m) => (
                      <div key={m.id} className="px-6 py-3.5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {m.user?.first_name ? m.user.first_name.charAt(0) : (m.user?.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">
                              {m.user?.first_name ? `${m.user.first_name} ${m.user.last_name}` : m.user?.username}
                            </div>
                            <div className="text-xs text-slate-500">{m.user?.email}</div>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold uppercase">
                          {m.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pending Invitations */}
                {invitations.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 font-bold text-xs uppercase text-slate-500 tracking-wider">
                      Pending Invitations ({invitations.length})
                    </div>
                    <div className="divide-y divide-slate-100">
                      {invitations.map((inv) => (
                        <div key={inv.id} className="px-6 py-3.5 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{inv.email}</div>
                            <div className="text-xs text-slate-400">Invited by {inv.invited_by_name} &bull; Role: {inv.role}</div>
                          </div>
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md text-xs font-semibold uppercase">
                            {inv.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Workspaces Tab */}
            {activeTab === 'workspaces' && (
              <div className="space-y-6">
                {/* Create Workspace Form */}
                <form onSubmit={handleCreateWorkspace} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="New Workspace Name..."
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <Plus size={16} /> Create Workspace
                  </button>
                </form>

                {/* Workspaces List */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workspaces.map((ws) => (
                    <div key={ws.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative hover:border-slate-300 transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm"
                            style={{ backgroundColor: ws.color || '#0086FF' }}
                          >
                            {ws.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-slate-800">{ws.name}</h4>
                            <p className="text-xs text-slate-500">{ws.member_count || 0} Members &bull; {ws.project_count || 0} Projects</p>
                          </div>
                        </div>
                        {ws.is_default && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded-md border border-blue-100">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrganizationSettings;
