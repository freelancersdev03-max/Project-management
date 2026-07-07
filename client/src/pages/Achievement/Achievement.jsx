import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../../components/Sidebar';
import { Award, CheckCircle2, CircleDot } from 'lucide-react';
import api from '../../api';
import { formatDateTimeDDMMYYYY } from '../../utils/dateFormat';
import { PageHeader, Band } from '../../components/kayaara/Band';
import AnimatedNumber from '../../components/kayaara/AnimatedNumber';

const Achievement = () => {
  const [allAchievements, setAllAchievements] = useState([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const [savingAchievement, setSavingAchievement] = useState(false);
  const [updatingTokenId, setUpdatingTokenId] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    title: '',
    description: '',
  });
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const role = (localStorage.getItem('role') || '').toUpperCase();
  const canAssign = ['SGM', 'KAYAARA', 'MLS', 'ADMIN'].includes(role);
  const isAdmin = role === 'ADMIN';
  const isEmployee = role === 'EMPLOYEE';

  const loadAchievements = async () => {
    try {
      setLoadingAchievements(true);
      const response = await api.get('achievement/achievements/');
      const records = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.results)
          ? response.data.results
          : [];

      setAllAchievements(records);
    } catch (error) {
      console.error('Failed to load achievements:', error);
      setAllAchievements([]);
    } finally {
      setLoadingAchievements(false);
    }
  };

  useEffect(() => {
    loadAchievements();
  }, []);

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

  const visibleAchievements = useMemo(() => {
    return [...allAchievements].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [allAchievements]);

  const handleEmployeeSelect = (event) => {
    setFormData((prev) => ({
      ...prev,
      employeeId: event.target.value,
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssign = async (event) => {
    event.preventDefault();

    if (!canAssign) {
      return;
    }

    const payload = {
      employeeId: formData.employeeId,
      title: formData.title.trim(),
      description: formData.description.trim(),
    };

    if (
      !payload.employeeId ||
      !payload.title ||
      !payload.description
    ) {
      return;
    }

    try {
      setSavingAchievement(true);
      const response = await api.post('achievement/achievements/', payload);
      setAllAchievements((prev) => [response.data, ...prev]);

      setFormData({
        employeeId: '',
        title: '',
        description: '',
      });
    } catch (error) {
      console.error('Failed to assign achievement:', error);
    } finally {
      setSavingAchievement(false);
    }
  };

  const toggleTokenShared = async (achievementId) => {
    if (!isAdmin) {
      return;
    }

    try {
      setUpdatingTokenId(achievementId);
      const response = await api.post(`achievement/achievements/${achievementId}/toggle-token-shared/`);
      setAllAchievements((prev) =>
        prev.map((item) => (item.id === achievementId ? response.data : item))
      );
    } catch (error) {
      console.error('Failed to update token sharing state:', error);
    } finally {
      setUpdatingTokenId(null);
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Achievement"
          accent="Management"
          subtitle="SGM, KAYAARA and Admin can assign achievements. Employees can see assigned achievements."
        />

        <main className="flex-1 overflow-y-auto k-scroll">
          <Band tone="grey" eyebrow="Recognition" title="Achievement overview">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0, ease: [0.22, 1, 0.36, 1] }}
                className="k-card px-4 py-3.5 flex flex-col justify-between min-h-[92px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="k-eyebrow">Total achievements</p>
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                  >
                    <Award size={15} />
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mt-1 tabular-nums" style={{ color: 'var(--k-blue)' }}>
                  <AnimatedNumber value={visibleAchievements.length} />
                </h2>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
                className="k-card px-4 py-3.5 flex flex-col justify-between min-h-[92px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="k-eyebrow">Token shared</p>
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                  >
                    <CheckCircle2 size={15} />
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mt-1 tabular-nums" style={{ color: 'var(--k-ink)' }}>
                  <AnimatedNumber value={visibleAchievements.filter((item) => item.tokenShared).length} />
                </h2>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
                className="k-card px-4 py-3.5 flex flex-col justify-between min-h-[92px]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="k-eyebrow">Pending share</p>
                  <span
                    className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                  >
                    <CircleDot size={15} />
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mt-1 tabular-nums" style={{ color: 'var(--k-ink)' }}>
                  <AnimatedNumber value={visibleAchievements.filter((item) => !item.tokenShared).length} />
                </h2>
              </motion.div>
            </div>
          </Band>

          {canAssign && (
            <Band tone="white" title="Assign achievement">
              <div className="k-card-grey p-5 md:p-6">
                <form onSubmit={handleAssign} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="k-label">Employee</label>
                    <select
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleEmployeeSelect}
                      className="k-select"
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
                  </div>
                  <div>
                    <label className="k-label">Achievement title</label>
                    <input
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Achievement title"
                      className="k-input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="k-label">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Achievement description"
                      className="k-textarea min-h-28 resize-none"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={savingAchievement}
                      className="k-btn-primary text-sm"
                    >
                      {savingAchievement ? 'Assigning...' : 'Assign Achievement'}
                    </button>
                  </div>
                </form>
              </div>
            </Band>
          )}

          <Band tone="grey" title={isEmployee ? 'My achievements' : 'Achievement list'}>
            {loadingAchievements ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="k-skeleton h-[110px]" />
                ))}
              </div>
            ) : visibleAchievements.length === 0 ? (
              <div className="k-card flex flex-col items-center justify-center text-center py-14 px-6">
                <img src="/kayaara-mark.png" alt="" className="w-12 h-12 opacity-70 mb-3" />
                <p className="text-sm font-semibold" style={{ color: 'var(--k-ink)' }}>No achievements available yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--k-grey-500)' }}>
                  Assigned achievements will show up here once created.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {visibleAchievements.map((item, index) => (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      className="k-card p-4 md:p-5 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span
                            className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                            style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                          >
                            <Award size={18} />
                          </span>
                          <div>
                            <h3 className="text-base md:text-lg font-bold" style={{ color: 'var(--k-ink)' }}>{item.title}</h3>
                            <p className="text-sm mt-1" style={{ color: 'var(--k-grey-500)' }}>{item.description}</p>
                          </div>
                        </div>
                        <span className="k-pill-grey uppercase tracking-widest">
                          {item.assignedByRole}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <p style={{ color: 'var(--k-grey-700)' }}>
                          <span className="font-semibold" style={{ color: 'var(--k-ink)' }}>Employee:</span> {item.employeeName}
                        </p>
                        <p className="text-xs md:col-span-2" style={{ color: 'var(--k-grey-500)' }}>
                          Assigned by {item.assignedBy} on {formatDateTimeDDMMYYYY(item.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={item.tokenShared ? 'k-pill' : 'k-pill-grey'}>
                          {item.tokenShared ? <CheckCircle2 size={14} /> : <CircleDot size={14} />}
                          {item.tokenShared ? 'Token Shared' : 'Token Not Shared'}
                        </span>

                        {isAdmin && (
                          <button
                            type="button"
                            disabled={updatingTokenId === item.id}
                            onClick={() => toggleTokenShared(item.id)}
                            className="k-btn-ghost !py-1.5 !px-3 text-xs"
                          >
                            {updatingTokenId === item.id
                              ? 'Updating...'
                              : `Mark as ${item.tokenShared ? 'Not Shared' : 'Shared'}`}
                          </button>
                        )}
                      </div>
                    </motion.article>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Band>

          <footer className="k-band-white px-5 md:px-8 py-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
            <span className="text-[11px]" style={{ color: 'var(--k-grey-500)' }}>
              Kayaara PMS · Innovating beyond systems
            </span>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--k-blue)' }}>
              Kayaara Innovations Pvt Ltd
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default Achievement;
