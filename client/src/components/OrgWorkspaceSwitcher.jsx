import React, { useState, useRef, useEffect } from 'react';
import { Building2, Layers, Check, ChevronDown, Plus, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const OrgWorkspaceSwitcher = () => {
  const {
    currentOrg,
    currentWorkspace,
    availableOrgs,
    availableWorkspaces,
    switchOrg,
    switchWorkspace,
    user
  } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrg = async (orgId) => {
    await switchOrg(orgId);
    setIsOpen(false);
  };

  const handleSelectWorkspace = async (wsId) => {
    await switchWorkspace(wsId);
    setIsOpen(false);
  };

  const canManageOrg = user?.role === 'ADMIN' || user?.is_superuser;

  return (
    <div className="relative px-3 py-2 border-b border-slate-200/80" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-100/70 hover:bg-slate-200/60 transition-all text-left group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
            {currentOrg?.name ? currentOrg.name.charAt(0).toUpperCase() : <Building2 size={16} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 truncate leading-snug">
              {currentOrg?.name || 'Select Organization'}
            </div>
            <div className="text-[11px] font-medium text-slate-500 truncate flex items-center gap-1">
              <Layers size={10} className="text-blue-500" />
              <span>{currentWorkspace?.name || 'Select Workspace'}</span>
            </div>
          </div>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs max-h-96 overflow-y-auto">
          {/* Organizations section */}
          <div className="p-2 border-b border-slate-100">
            <div className="px-2 py-1 font-bold text-[10px] uppercase text-slate-400 tracking-wider">
              Organizations
            </div>
            <div className="space-y-0.5 mt-1">
              {availableOrgs.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrg(org.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                    org.is_current ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="truncate">{org.name}</span>
                  {org.is_current && <Check size={14} className="text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Workspaces section */}
          {currentOrg && (
            <div className="p-2 border-b border-slate-100">
              <div className="px-2 py-1 font-bold text-[10px] uppercase text-slate-400 tracking-wider">
                Workspaces ({currentOrg.name})
              </div>
              <div className="space-y-0.5 mt-1">
                {availableWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSelectWorkspace(ws.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                      ws.is_current ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ws.color || '#0086FF' }}></span>
                      {ws.name}
                    </span>
                    {ws.is_current && <Check size={14} className="text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Settings / Management */}
          {canManageOrg && (
            <div className="p-1 bg-slate-50 border-t border-slate-100 space-y-0.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/organization-settings');
                }}
                className="w-full flex items-center gap-2 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg font-medium transition-colors"
              >
                <Settings size={14} />
                <span>Organization Settings</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrgWorkspaceSwitcher;
