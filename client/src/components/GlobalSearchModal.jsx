import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, CheckCircle, Clock, Building2, User, FileText, ChevronRight, Command } from 'lucide-react';
import api from '../api';

export default function GlobalSearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ tasks: [], projects: [], clients: [], users: [] });
  const [activeTab, setActiveTab] = useState('all');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults({ tasks: [], projects: [], clients: [], users: [] });
    }
  }, [isOpen]);

  // Global Ctrl + K / Cmd + K listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or custom event
          const event = new CustomEvent('open-global-search');
          window.dispatchEvent(event);
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search API fetch
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ tasks: [], projects: [], clients: [], users: [] });
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`tasks/global_search/?q=${encodeURIComponent(query.trim())}`);
        setResults(res.data || { tasks: [], projects: [], clients: [], users: [] });
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalResults =
    (results.tasks?.length || 0) +
    (results.projects?.length || 0) +
    (results.clients?.length || 0) +
    (results.users?.length || 0);

  const handleSelectResult = (path) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="k-backdrop !z-[400] flex items-start justify-center pt-16 md:pt-24 px-4">
      <div className="k-modal !max-w-2xl w-full p-0 overflow-hidden shadow-2xl rounded-3xl border border-white/20 bg-white">
        {/* Top Search Input Header */}
        <div className="p-4 border-b border-[var(--k-grey-200)] flex items-center gap-3 bg-[var(--k-band-grey)]/60">
          <Search size={20} className="text-[var(--k-blue)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks, projects, clients, or team members... (Ctrl + K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-base font-semibold outline-none text-[var(--k-ink)] placeholder-[var(--k-grey-500)]"
          />
          {loading && (
            <span className="w-4 h-4 rounded-full border-2 border-[var(--k-blue)] border-t-transparent animate-spin shrink-0" />
          )}
          {query && !loading && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-[var(--k-grey-500)] hover:text-[var(--k-ink)] hover:bg-[var(--k-grey-200)]"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--k-grey-200)] text-[var(--k-grey-700)] hover:bg-[var(--k-grey-300)] transition-colors shrink-0"
          >
            ESC
          </button>
        </div>

        {/* Tab Filters */}
        {query.trim().length >= 2 && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--k-grey-200)] bg-white text-xs font-bold overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full transition-all ${activeTab === 'all' ? 'bg-[var(--k-blue)] text-white' : 'text-[var(--k-grey-500)] hover:bg-[var(--k-grey-100)]'}`}
            >
              All ({totalResults})
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-1 rounded-full transition-all ${activeTab === 'tasks' ? 'bg-[var(--k-blue)] text-white' : 'text-[var(--k-grey-500)] hover:bg-[var(--k-grey-100)]'}`}
            >
              Tasks ({results.tasks?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3 py-1 rounded-full transition-all ${activeTab === 'projects' ? 'bg-[var(--k-blue)] text-white' : 'text-[var(--k-grey-500)] hover:bg-[var(--k-grey-100)]'}`}
            >
              Projects ({results.projects?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('clients')}
              className={`px-3 py-1 rounded-full transition-all ${activeTab === 'clients' ? 'bg-[var(--k-blue)] text-white' : 'text-[var(--k-grey-500)] hover:bg-[var(--k-grey-100)]'}`}
            >
              Clients ({results.clients?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1 rounded-full transition-all ${activeTab === 'users' ? 'bg-[var(--k-blue)] text-white' : 'text-[var(--k-grey-500)] hover:bg-[var(--k-grey-100)]'}`}
            >
              People ({results.users?.length || 0})
            </button>
          </div>
        )}

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto k-scroll p-4 space-y-4">
          {query.trim().length < 2 && (
            <div className="py-12 text-center text-xs font-semibold text-[var(--k-grey-500)] flex flex-col items-center gap-2">
              <Command size={28} className="text-[var(--k-blue)] opacity-60 mb-1" />
              <p className="text-sm font-bold text-[var(--k-ink)]">Search across your entire workspace</p>
              <p>Type at least 2 characters to search tasks, projects, clients, or team members.</p>
            </div>
          )}

          {query.trim().length >= 2 && totalResults === 0 && !loading && (
            <div className="py-12 text-center text-xs font-semibold text-[var(--k-grey-500)]">
              No matching records found for "{query}".
            </div>
          )}

          {/* TASKS SECTION */}
          {(activeTab === 'all' || activeTab === 'tasks') && results.tasks?.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--k-grey-500)] mb-2 px-1">
                Tasks ({results.tasks.length})
              </div>
              <div className="space-y-1.5">
                {results.tasks.map((t) => (
                  <div
                    key={`task-res-${t.id}`}
                    onClick={() => handleSelectResult('/employeedashboard')}
                    className="p-3 rounded-2xl border border-[var(--k-grey-200)] hover:border-[var(--k-blue)] bg-white hover:bg-[var(--k-blue-tint)]/40 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#212121] text-white">
                        #{t.task_id}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--k-ink)] truncate group-hover:text-[var(--k-blue)]">
                          {t.title}
                        </h4>
                        <p className="text-[11px] text-[var(--k-grey-500)] truncate">
                          {t.project_name || 'No Project'} • Assigned to: {t.assigned_to_name || 'Unassigned'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--k-grey-500)] group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROJECTS SECTION */}
          {(activeTab === 'all' || activeTab === 'projects') && results.projects?.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--k-grey-500)] mb-2 px-1">
                Projects ({results.projects.length})
              </div>
              <div className="space-y-1.5">
                {results.projects.map((p) => (
                  <div
                    key={`proj-res-${p.id}`}
                    onClick={() => handleSelectResult(`/projects/${p.id}`)}
                    className="p-3 rounded-2xl border border-[var(--k-grey-200)] hover:border-[var(--k-blue)] bg-white hover:bg-[var(--k-blue-tint)]/40 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[var(--k-blue-tint)] flex items-center justify-center text-[var(--k-blue)] shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--k-ink)] truncate group-hover:text-[var(--k-blue)]">
                          {p.name}
                        </h4>
                        <p className="text-[11px] text-[var(--k-grey-500)] truncate">
                          Code: {p.code || 'N/A'} • Client: {p.client_name}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--k-grey-500)] group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLIENTS SECTION */}
          {(activeTab === 'all' || activeTab === 'clients') && results.clients?.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--k-grey-500)] mb-2 px-1">
                Clients ({results.clients.length})
              </div>
              <div className="space-y-1.5">
                {results.clients.map((c) => (
                  <div
                    key={`client-res-${c.id}`}
                    onClick={() => handleSelectResult(`/clients/${c.id}`)}
                    className="p-3 rounded-2xl border border-[var(--k-grey-200)] hover:border-[var(--k-blue)] bg-white hover:bg-[var(--k-blue-tint)]/40 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                        <Building2 size={16} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--k-ink)] truncate group-hover:text-[var(--k-blue)]">
                          {c.company_name}
                        </h4>
                        <p className="text-[11px] text-[var(--k-grey-500)] truncate">
                          Contact: {c.contact_person || 'N/A'} • Email: {c.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--k-grey-500)] group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USERS / PEOPLE SECTION */}
          {(activeTab === 'all' || activeTab === 'users') && results.users?.length > 0 && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-[var(--k-grey-500)] mb-2 px-1">
                People ({results.users.length})
              </div>
              <div className="space-y-1.5">
                {results.users.map((u) => (
                  <div
                    key={`user-res-${u.id}`}
                    onClick={() => handleSelectResult('/staff')}
                    className="p-3 rounded-2xl border border-[var(--k-grey-200)] hover:border-[var(--k-blue)] bg-white hover:bg-[var(--k-blue-tint)]/40 transition-all cursor-pointer flex items-center justify-between group shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
                        {u.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--k-ink)] truncate group-hover:text-[var(--k-blue)]">
                          {u.name}
                        </h4>
                        <p className="text-[11px] text-[var(--k-grey-500)] truncate">
                          Role: {u.role} • Email: {u.email}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-[var(--k-grey-500)] group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
