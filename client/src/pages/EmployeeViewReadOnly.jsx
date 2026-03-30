import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Mail, Phone, Calendar, Clock,
  CheckCircle2, AlertCircle, TrendingUp, Briefcase
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api';

export default function EmployeeViewReadOnly() {
  const { employeeId } = useParams();
  const navigate = useNavigate();
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
      <div className="bg-slate-50 min-h-screen antialiased">
        <Navbar hideLogin />
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-400 font-bold uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="bg-slate-50 min-h-screen antialiased">
        <Navbar hideLogin />
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-400 font-bold uppercase">Employee not found</p>
        </div>
      </div>
    );
  }

  const completionRate = tasks.active.length + tasks.completed.length > 0
    ? Math.round((tasks.completed.length / (tasks.active.length + tasks.completed.length)) * 100)
    : 0;

  return (
    <div className="bg-slate-50 min-h-screen antialiased pb-20">
      <Navbar hideLogin />

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest hover:text-[#F58A4B] mb-4 md:mb-6"
        >
          <ChevronLeft size={14} /> Back
        </button>

        {/* Employee Header */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 p-5 md:p-8 mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
                {employee.full_name || employee.username}
              </h1>
              <p className="text-[9px] md:text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1 md:mt-2">
                Performance Overview (Read-Only)
              </p>
            </div>
            <div className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border shrink-0 ${employee.is_active
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-red-50 text-red-600 border-red-200'
              }`}>
              {employee.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] text-slate-600 font-bold flex items-center gap-2 uppercase tracking-wider">
              <Mail size={14} className="text-[#F58A4B]" /> {employee.email}
            </p>
            {employee.phone && (
              <p className="text-[11px] text-slate-600 font-bold flex items-center gap-2 uppercase tracking-wider">
                <Phone size={14} className="text-[#F58A4B]" /> {employee.phone}
              </p>
            )}
            {employee.date_joined && (
              <p className="text-[11px] text-slate-600 font-bold flex items-center gap-2 uppercase tracking-wider">
                <Calendar size={14} className="text-[#F58A4B]" />
                Joined {new Date(employee.date_joined).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 p-4 md:p-6">
            <p className="text-[9px] md:text-[11px] text-slate-500 font-black uppercase tracking-wider mb-1 md:mb-2">Active Tasks</p>
            <p className="text-2xl md:text-4xl font-black text-[#F58A4B]">{tasks.active.length}</p>
          </div>

          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 p-4 md:p-6">
            <p className="text-[9px] md:text-[11px] text-slate-500 font-black uppercase tracking-wider mb-1 md:mb-2">Completed</p>
            <p className="text-2xl md:text-4xl font-black text-emerald-600">{tasks.completed.length}</p>
          </div>

          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 p-4 md:p-6">
            <p className="text-[9px] md:text-[11px] text-slate-500 font-black uppercase tracking-wider mb-1 md:mb-2">Overdue</p>
            <p className="text-2xl md:text-4xl font-black text-red-600">{tasks.overdue.length}</p>
          </div>

          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 p-4 md:p-6">
            <p className="text-[9px] md:text-[11px] text-slate-500 font-black uppercase tracking-wider mb-1 md:mb-2">Completion Rate</p>
            <p className="text-2xl md:text-4xl font-black text-slate-900">{completionRate}%</p>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 p-5 md:p-8 mb-6 md:mb-8">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase mb-6 flex items-center gap-3">
            <Clock size={24} className="text-[#F58A4B]" /> Active Tasks ({tasks.active.length})
          </h2>

          {tasks.active.length === 0 ? (
            <p className="text-slate-400 text-center py-8 font-bold">No active tasks</p>
          ) : (
            <div className="space-y-3">
              {tasks.active.map(task => {
                const isOverdue = tasks.overdue.some(t => t.id === task.id);
                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all ${isOverdue
                      ? 'bg-red-50 border-red-200'
                      : 'bg-slate-50 border-slate-200 hover:border-[#F58A4B]/30'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-slate-900">{task.task || task.title}</h3>
                      {isOverdue && (
                        <span className="px-2 py-1 text-[8px] font-black uppercase bg-red-600 text-white rounded-full flex items-center gap-1">
                          <AlertCircle size={10} /> Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-2">
                      <Calendar size={12} />
                      Target: {task.target_date ? new Date(task.target_date).toLocaleDateString() : 'No deadline'}
                    </p>
                    {task.client_name && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-1">
                        <Briefcase size={12} /> {task.client_name}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-600 font-bold mt-2">
                      Status: <span className={task.status === 'Completed' ? 'text-emerald-600' : 'text-[#F58A4B]'}>
                        {task.status || 'Pending'}
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Tasks */}
        <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 p-5 md:p-8">
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase mb-6 flex items-center gap-3">
            <CheckCircle2 size={24} className="text-emerald-600" /> Completed Tasks ({tasks.completed.length})
          </h2>

          {tasks.completed.length === 0 ? (
            <p className="text-slate-400 text-center py-8 font-bold">No completed tasks</p>
          ) : (
            <div className="space-y-3">
              {tasks.completed.map(task => (
                <div
                  key={task.id}
                  className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 opacity-75"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-slate-900 line-through">{task.task || task.title}</h3>
                    <span className="px-2 py-1 text-[8px] font-black uppercase bg-emerald-600 text-white rounded-full">
                      ✓ Done
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-2">
                    <Calendar size={12} />
                    Completed: {task.completed_date ? new Date(task.completed_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
