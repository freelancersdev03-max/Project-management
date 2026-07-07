import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Mail, Phone, Calendar, Clock,
  CheckCircle2, AlertCircle, TrendingUp, Briefcase
} from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../api';
import { formatDateDDMMYYYY } from '../utils/dateFormat';
import { PageHeader, Band, Bands } from '../components/kayaara/Band';
import KpiCard from '../components/kayaara/KpiCard';

export default function EmployeeViewReadOnly() {
  const { employeeId } = useParams();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [tasks, setTasks] = useState({ active: [], completed: [], overdue: [] });

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        // Fetch employee info
        const empRes = await api.get(`admin/users/${employeeId}/`);
        setEmployee(empRes.data);

        // Fetch all tasks for this employee
        const tasksRes = await api.get('tasks/');
        const allTasks = tasksRes.data || [];

        // Filter tasks by employee
        const employeeTasks = allTasks.filter(t =>
          t.assigned_to === employeeId ||
          t.assigned_to_employee === employeeId ||
          (t.assigned_to_user && t.assigned_to_user.id === employeeId)
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeTasks = employeeTasks.filter(t => t.status !== 'Completed');
        const completedTasks = employeeTasks.filter(t => t.status === 'Completed');
        const overdueTasks = activeTasks.filter(t => {
          if (!t.target_date) return false;
          const targetDate = new Date(t.target_date);
          targetDate.setHours(0, 0, 0, 0);
          return targetDate < today;
        });

        setTasks({
          active: activeTasks,
          completed: completedTasks,
          overdue: overdueTasks
        });
      } catch (error) {
        console.error("Failed to fetch employee data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployeeData();
    }
  }, [employeeId]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto k-band-grey k-band-pad">
          <div className="k-skeleton h-[120px] mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[...Array(4)].map((_, i) => <div key={i} className="k-skeleton h-[92px]" />)}
          </div>
          <div className="k-skeleton h-[220px]" />
        </main>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-3">
          <img src="/kayaara-mark.png" alt="Kayaara" className="w-14 h-14 opacity-40 k-float" />
          <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-500)' }}>Employee not found</p>
        </main>
      </div>
    );
  }

  const completionRate = tasks.active.length + tasks.completed.length > 0
    ? Math.round((tasks.completed.length / (tasks.active.length + tasks.completed.length)) * 100)
    : 0;

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title={employee.full_name || employee.username}
          subtitle="Performance overview (read-only)"
          actions={
            employee.is_active
              ? <span className="k-pill">Active</span>
              : <span className="k-pill-grey">Inactive</span>
          }
        />

        <main className="flex-1 overflow-y-auto k-scroll">
          <Bands>
            {/* Contact + Stats */}
            <Band tone="grey" eyebrow="Overview">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="k-card p-5 mb-4"
              >
                <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                  <p className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--k-grey-700)' }}>
                    <Mail size={14} style={{ color: 'var(--k-blue)' }} /> {employee.email}
                  </p>
                  {employee.phone && (
                    <p className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--k-grey-700)' }}>
                      <Phone size={14} style={{ color: 'var(--k-blue)' }} /> {employee.phone}
                    </p>
                  )}
                  {employee.date_joined && (
                    <p className="text-xs font-medium flex items-center gap-2" style={{ color: 'var(--k-grey-700)' }}>
                      <Calendar size={14} style={{ color: 'var(--k-blue)' }} />
                      Joined {formatDateDDMMYYYY(employee.date_joined)}
                    </p>
                  )}
                </div>
              </motion.div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard index={0} label="Active tasks" value={tasks.active.length} icon={<Clock />} accent />
                <KpiCard index={1} label="Completed" value={tasks.completed.length} icon={<CheckCircle2 />} accent />
                <KpiCard index={2} label="Overdue" value={tasks.overdue.length} icon={<AlertCircle />} />
                <KpiCard index={3} label="Completion rate" value={completionRate} suffix="%" icon={<TrendingUp />} />
              </div>
            </Band>

            {/* Active Tasks */}
            <Band tone="white" title={`Active tasks (${tasks.active.length})`} eyebrow="In flight">
              {tasks.active.length === 0 ? (
                <div className="k-card-grey flex flex-col items-center justify-center py-12 text-center gap-3">
                  <img src="/kayaara-mark.png" alt="Kayaara" className="w-10 h-10 opacity-40" />
                  <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-500)' }}>No active tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.active.map((task, index) => {
                    const isOverdue = tasks.overdue.some(t => t.id === task.id);
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        className="k-card-grey p-4"
                        style={isOverdue ? { borderColor: 'var(--k-ink)' } : undefined}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-sm font-semibold" style={{ color: 'var(--k-ink)' }}>{task.task || task.title}</h3>
                          {isOverdue && (
                            <span className="k-pill-ink">
                              <AlertCircle size={10} /> Overdue
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] flex items-center gap-2 mt-2" style={{ color: 'var(--k-grey-500)' }}>
                          <Calendar size={12} />
                          Target: {task.target_date ? formatDateDDMMYYYY(task.target_date) : 'No deadline'}
                        </p>
                        {task.client_name && (
                          <p className="text-[11px] flex items-center gap-2 mt-1" style={{ color: 'var(--k-grey-500)' }}>
                            <Briefcase size={12} /> {task.client_name}
                          </p>
                        )}
                        <p className="text-[11px] font-semibold mt-2" style={{ color: 'var(--k-grey-700)' }}>
                          Status: <span style={{ color: 'var(--k-blue)' }}>{task.status || 'Pending'}</span>
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </Band>

            {/* Completed Tasks */}
            <Band tone="grey" title={`Completed tasks (${tasks.completed.length})`} eyebrow="Done">
              {tasks.completed.length === 0 ? (
                <div className="k-card flex flex-col items-center justify-center py-12 text-center gap-3">
                  <img src="/kayaara-mark.png" alt="Kayaara" className="w-10 h-10 opacity-40" />
                  <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-500)' }}>No completed tasks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.completed.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      className="k-card-static p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-sm font-semibold line-through" style={{ color: 'var(--k-grey-500)' }}>{task.task || task.title}</h3>
                        <span className="k-pill-solid">
                          <CheckCircle2 size={10} /> Done
                        </span>
                      </div>
                      <p className="text-[11px] flex items-center gap-2 mt-2" style={{ color: 'var(--k-grey-500)' }}>
                        <Calendar size={12} />
                        Completed: {task.completed_date ? formatDateDDMMYYYY(task.completed_date) : 'N/A'}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </Band>
          </Bands>
        </main>
      </div>
    </div>
  );
}
