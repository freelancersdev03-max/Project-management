import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import { Award, CheckCircle2, CircleDot } from 'lucide-react';
import api from '../../api';

const STORAGE_KEY = 'achievements_store_v1';

const Achievement = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [allAchievements, setAllAchievements] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to parse achievements:', error);
      return [];
    }
  });
  const [formData, setFormData] = useState({
    employeeId: '',
    employeeName: '',
    title: '',
    description: '',
  });
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const role = (localStorage.getItem('role') || '').toUpperCase();
  const canAssign = ['SGM', 'HQEPL', 'ADMIN'].includes(role);
  const isAdmin = role === 'ADMIN';
  const isEmployee = role === 'EMPLOYEE';
  const currentUserId = (localStorage.getItem('user_id') || '').toString();

  const currentEmail = (localStorage.getItem('email') || '').toLowerCase();
  const currentUsername = (localStorage.getItem('username') || '').toLowerCase();
  const currentName = currentEmail ? currentEmail.split('@')[0].toLowerCase() : currentUsername;

  useEffect(() => {
    const loadEmployees = async () => {
      if (!canAssign) {
        setEmployeeOptions([]);
        return;
      }

      try {
        setLoadingEmployees(true);

        let employees = [];

        if (role === 'SGM') {
          const response = await api.get('sgm/employees/');
          employees = Array.isArray(response.data)
            ? response.data
            : Array.isArray(response.data?.results)
              ? response.data.results
              : [];
        } else {
          try {
            const response = await api.get('admin/users/?role=EMPLOYEE');
            employees = Array.isArray(response.data)
              ? response.data
              : Array.isArray(response.data?.results)
                ? response.data.results
                : [];
          } catch {
            const fallback = await api.get('admin/users/');
            const allUsers = Array.isArray(fallback.data)
              ? fallback.data
              : Array.isArray(fallback.data?.results)
                ? fallback.data.results
                : [];
            employees = allUsers.filter((user) => (user.role || '').toLowerCase() === 'employee');
          }
        }

        const normalized = employees
          .map((employee) => {
            const id = employee.user_id || employee.id;
            const firstName = employee.first_name || '';
            const lastName = employee.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const username = employee.username || '';
            const email = employee.email || '';

            return {
              id: String(id || ''),
              name: fullName || username || email,
            };
          })
          .filter((employee) => employee.id && employee.name);

        setEmployeeOptions(normalized);
      } catch (error) {
        console.error('Failed to load employees:', error);
        setEmployeeOptions([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, [canAssign, role]);

  const persist = (nextData) => {
    setAllAchievements(nextData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
  };

  const visibleAchievements = useMemo(() => {
    if (isAdmin || role === 'SGM' || role === 'HQEPL') {
      return [...allAchievements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (isEmployee) {
      return [...allAchievements]
        .filter((item) => {
          const targetEmployeeId = (item.employeeId || '').toString();
          const targetEmail = (item.employeeEmail || '').toLowerCase();
          const targetName = (item.employeeName || '').toLowerCase();
          return (
            (currentUserId && targetEmployeeId === currentUserId) ||
            (currentEmail && targetEmail === currentEmail) ||
            (currentName && targetName === currentName) ||
            (currentUsername && targetName === currentUsername)
          );
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return [];
  }, [allAchievements, currentEmail, currentName, currentUserId, currentUsername, isAdmin, isEmployee, role]);

  const handleEmployeeSelect = (event) => {
    const selectedId = event.target.value;
    const selectedEmployee = employeeOptions.find((employee) => employee.id === selectedId);

    setFormData((prev) => ({
      ...prev,
      employeeId: selectedId,
      employeeName: selectedEmployee?.name || '',
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssign = (event) => {
    event.preventDefault();

    if (!canAssign) {
      return;
    }

    const newItem = {
      id: Date.now(),
      employeeId: formData.employeeId,
      employeeName: formData.employeeName.trim(),
      title: formData.title.trim(),
      description: formData.description.trim(),
      assignedByRole: role,
      assignedBy: localStorage.getItem('email') || localStorage.getItem('username') || role,
      tokenShared: false,
      createdAt: new Date().toISOString(),
    };

    if (
      !newItem.employeeId ||
      !newItem.employeeName ||
      !newItem.title ||
      !newItem.description
    ) {
      return;
    }

    persist([newItem, ...allAchievements]);

    setFormData({
      employeeId: '',
      employeeName: '',
      title: '',
      description: '',
    });
  };

  const toggleTokenShared = (achievementId) => {
    if (!isAdmin) {
      return;
    }

    const nextData = allAchievements.map((item) =>
      item.id === achievementId ? { ...item, tokenShared: !item.tokenShared } : item
    );

    persist(nextData);
  };

  return (
    <div className="h-screen w-screen bg-slate-50 antialiased font-sans flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <main className="flex-1 overflow-y-auto py-8">
        <div className="max-w-6xl mx-auto px-6 md:px-10 space-y-8 mt-10">
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-50 text-[#F58A4B] flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Achievement Management</h1>
                <p className="text-sm text-slate-500">
                  SGM, HQEPL and Admin can assign achievements. Employees can see assigned achievements.
                </p>
              </div>
            </div>
          </section>

          {canAssign && (
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
              <h2 className="text-lg font-black text-slate-900 mb-4">Assign Achievement</h2>
              <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleEmployeeSelect}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F58A4B]/30"
                >
                  <option value="">
                    {loadingEmployees ? 'Loading employees...' : 'Select employee'}
                  </option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Achievement title"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#F58A4B]/30"
                />
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Achievement description"
                  className="md:col-span-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm min-h-28 resize-none focus:outline-none focus:ring-2 focus:ring-[#F58A4B]/30"
                />
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
                  >
                    Assign Achievement
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
            <h2 className="text-lg font-black text-slate-900 mb-4">
              {isEmployee ? 'My Achievements' : 'Achievement List'}
            </h2>

            {visibleAchievements.length === 0 ? (
              <p className="text-sm text-slate-500">No achievements available yet.</p>
            ) : (
              <div className="space-y-4">
                {visibleAchievements.map((item) => (
                  <article
                    key={item.id}
                    className="border border-slate-200 rounded-2xl p-4 md:p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base md:text-lg font-black text-slate-900">{item.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
                        {item.assignedByRole}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <p className="text-slate-700">
                        <span className="font-bold">Employee:</span> {item.employeeName}
                      </p>
                      <p className="text-slate-500 text-xs md:col-span-2">
                        Assigned by {item.assignedBy} on {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg ${
                          item.tokenShared
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.tokenShared ? <CheckCircle2 size={14} /> : <CircleDot size={14} />}
                        {item.tokenShared ? 'Token Shared' : 'Token Not Shared'}
                      </span>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => toggleTokenShared(item.id)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
                        >
                          Mark as {item.tokenShared ? 'Not Shared' : 'Shared'}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Achievement;