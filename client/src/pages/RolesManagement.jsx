import React, { useState } from 'react';
import { Shield, ShieldCheck, ShieldAlert, Plus, Users, Layout, Search, Key, ChevronRight, Lock } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const RolesManagement = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fixed system roles based on existing backend architecture
  const systemRoles = [
    {
      id: 'ADMIN',
      name: 'System Administrator',
      description: 'Full unrestricted access to all organizations, users, and system settings.',
      users: 1,
      badge: 'Tier 1'
    },
    {
      id: 'HQEPL',
      name: 'Organization Admin',
      description: 'High-level overseer capable of creating projects and assigning Project Managers.',
      users: 4,
      badge: 'Tier 2'
    },
    {
      id: 'MLS',
      name: 'Team Lead',
      description: 'Internal leadership equivalent to Organization Admin with cross-project visibility.',
      users: 2,
      badge: 'Tier 2'
    },
    {
      id: 'SGM',
      name: 'Project Manager',
      description: 'Manages specific assigned projects, creates tasks, and oversees Team Members.',
      users: 8,
      badge: 'Tier 3'
    },
    {
      id: 'EMPLOYEE',
      name: 'Team Member',
      description: 'Execution team. Completes assigned tasks and earns achievements.',
      users: 45,
      badge: 'Tier 4'
    },
    {
      id: 'CLIENT',
      name: 'Organization Owner',
      description: 'Primary stakeholder with high-level dashboard access for their specific entity.',
      users: 12,
      badge: 'External'
    },
    {
      id: 'SENIOR',
      name: 'Client Leadership',
      description: 'External upper management overseeing specific client-side deliverables.',
      users: 5,
      badge: 'External'
    },
    {
      id: 'EXTERNAL',
      name: 'External Collaborator',
      description: 'External team members who collaborate on shared project tasks.',
      users: 18,
      badge: 'External'
    }
  ];

  const [activeRole, setActiveRole] = useState(systemRoles[0]);

  // Permission matrix mock based on current architecture
  const permissionCategories = [
    {
      category: 'Projects',
      permissions: [
        { name: 'View Projects', levels: { ADMIN: 'All', HQEPL: 'All', MLS: 'All', SGM: 'Assigned', EMPLOYEE: 'Assigned', CLIENT: 'Owned', SENIOR: 'Assigned', EXTERNAL: 'Assigned' } },
        { name: 'Create Projects', levels: { ADMIN: 'Yes', HQEPL: 'Yes', MLS: 'Yes', SGM: 'No', EMPLOYEE: 'No', CLIENT: 'No', SENIOR: 'No', EXTERNAL: 'No' } },
        { name: 'Delete Projects', levels: { ADMIN: 'Yes', HQEPL: 'No', MLS: 'No', SGM: 'No', EMPLOYEE: 'No', CLIENT: 'No', SENIOR: 'No', EXTERNAL: 'No' } },
      ]
    },
    {
      category: 'Tasks & Milestones',
      permissions: [
        { name: 'View Tasks', levels: { ADMIN: 'All', HQEPL: 'All', MLS: 'All', SGM: 'Project', EMPLOYEE: 'Assigned', CLIENT: 'Project', SENIOR: 'Project', EXTERNAL: 'Assigned' } },
        { name: 'Create Tasks', levels: { ADMIN: 'Yes', HQEPL: 'Yes', MLS: 'Yes', SGM: 'Yes', EMPLOYEE: 'No', CLIENT: 'No', SENIOR: 'No', EXTERNAL: 'No' } },
        { name: 'Approve Tasks', levels: { ADMIN: 'Yes', HQEPL: 'Yes', MLS: 'Yes', SGM: 'Yes', EMPLOYEE: 'No', CLIENT: 'Yes', SENIOR: 'Yes', EXTERNAL: 'No' } },
      ]
    },
    {
      category: 'Users & Roles',
      permissions: [
        { name: 'Invite Users', levels: { ADMIN: 'Yes', HQEPL: 'No', MLS: 'No', SGM: 'No', EMPLOYEE: 'No', CLIENT: 'No', SENIOR: 'No', EXTERNAL: 'No' } },
        { name: 'Assign Roles', levels: { ADMIN: 'Yes', HQEPL: 'No', MLS: 'No', SGM: 'No', EMPLOYEE: 'No', CLIENT: 'No', SENIOR: 'No', EXTERNAL: 'No' } },
        { name: 'View Internal Directory', levels: { ADMIN: 'Yes', HQEPL: 'Yes', MLS: 'Yes', SGM: 'Yes', EMPLOYEE: 'Yes', CLIENT: 'No', SENIOR: 'No', EXTERNAL: 'No' } },
      ]
    },
    {
      category: 'Reports & Analytics',
      permissions: [
        { name: 'View System KPIs', levels: { ADMIN: 'Yes', HQEPL: 'Yes', MLS: 'Yes', SGM: 'No', EMPLOYEE: 'No', CLIENT: 'No', SENIOR: 'No', EXTERNAL: 'No' } },
        { name: 'View Project Reports', levels: { ADMIN: 'Yes', HQEPL: 'Yes', MLS: 'Yes', SGM: 'Yes', EMPLOYEE: 'No', CLIENT: 'Yes', SENIOR: 'Yes', EXTERNAL: 'No' } },
      ]
    }
  ];

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
              <span className="text-slate-900 font-medium">Roles</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm opacity-50 cursor-not-allowed" title="Custom roles require backend expansion">
              <Plus size={16} />
              Create Custom Role
            </button>
          </div>
        </header>

        {/* Content Split View */}
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
              {systemRoles.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).map((role) => (
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
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      role.badge.includes('Tier') 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {role.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                    <Users size={14} />
                    <span>{role.users} Active Users</span>
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
                      <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">System Identifier: {activeRole.id}</p>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg border border-slate-200">
                      <Lock size={14} /> System Managed
                    </span>
                  </div>
                  <p className="mt-4 text-slate-600 text-sm leading-relaxed max-w-2xl">
                    {activeRole.description}
                  </p>
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Key size={18} className="text-slate-400" /> Active Permissions
                  </h3>
                </div>
                
                <div className="p-0">
                  {permissionCategories.map((cat, idx) => (
                    <div key={idx} className="border-b border-slate-100 last:border-0">
                      <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{cat.category}</h4>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {cat.permissions.map((perm, pIdx) => (
                          <div key={pIdx} className="px-6 py-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                            <span className="text-sm font-medium text-slate-700">{perm.name}</span>
                            
                            {/* Permission Logic Render */}
                            {perm.levels[activeRole.id] === 'Yes' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                Granted
                              </span>
                            )}
                            {perm.levels[activeRole.id] === 'No' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-100">
                                Denied
                              </span>
                            )}
                            {perm.levels[activeRole.id] !== 'Yes' && perm.levels[activeRole.id] !== 'No' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                {perm.levels[activeRole.id]}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default RolesManagement;
