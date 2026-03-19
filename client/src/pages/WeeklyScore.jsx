import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Activity
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import api from '../api';

// Pure helper: mirrors dashboard_stats OTC & ATS formulas
// OTC  = truncate(on_time / (total - in_progress) * 100, 1 decimal)
// ATS  = round((on_time*100 + delayed_ats_sum) / (total - in_progress), 1 decimal)
const computeAtsOtc = (tasks) => {
  if (!tasks.length) return { ats: '-', otc: '-' };
  const total = tasks.length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const denominator = total - inProgressCount;
  if (denominator === 0) return { ats: '-', otc: '-' };

  const onTimeCount = tasks.filter(t => t.status === 'On Time' || t.status === 'Completed').length;
  const delayedAtsSum = tasks
    .filter(t => t.status === 'Delayed')
    .reduce((sum, t) => sum + (parseFloat(t.ats_score) || 0), 0);

  const atsVal = Math.round(((onTimeCount * 100 + delayedAtsSum) / denominator) * 10) / 10;
  const otcVal = Math.trunc((onTimeCount / denominator) * 1000) / 10; // truncate to 1 decimal

  return {
    ats: atsVal.toFixed(1) + '%',
    otc: otcVal.toFixed(1) + '%',
  };
};

// Overall must average only numeric weekly columns and ignore '-' weeks.
const computeOverallFromWeeklyData = (weeklyData) => {
  const getAverage = (key) => {
    const values = weeklyData
      .map(item => Number.parseFloat(item[key]))
      .filter(value => Number.isFinite(value));

    if (!values.length) return '-';

    const sum = values.reduce((acc, value) => acc + value, 0);
    return `${(sum / values.length).toFixed(1)}%`;
  };

  return {
    ats: getAverage('ats'),
    otc: getAverage('otc'),
  };
};

// Pure helper: week boundaries (same logic as before)
const getWeeksInMonth = (year, month) => {
  const weeks = [];
  const lastDay = new Date(year, month + 1, 0);
  let start = new Date(year, month, 1);
  if (start.getDay() === 0) start.setDate(2);

  let weekCount = 1;
  while (start <= lastDay) {
    let end = new Date(start);
    if (weekCount === 1) {
      let daysToSunday = 7 - end.getDay();
      if (daysToSunday === 7) daysToSunday = 0;
      end.setDate(end.getDate() + daysToSunday);
    } else {
      end.setDate(end.getDate() + 6);
    }
    if (end > lastDay) end = new Date(lastDay);
    const totalDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    weeks.push({ label: `W${weekCount}`, start: start.getDate(), end: end.getDate(), isShort: totalDays < 7 });
    start = new Date(end);
    start.setDate(start.getDate() + 1);
    weekCount++;
  }
  return weeks;
};

const WeeklyScore = () => {
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [members, setMembers] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [scopedClients, setScopedClients] = useState([]);
  const [scopedProjects, setScopedProjects] = useState([]);
  const [selectedClient, setSelectedClient] = useState('all');
  const [loading, setLoading] = useState(true);

  const weeks = useMemo(
    () => getWeeksInMonth(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();

        const response = await api.get('tasks/weekly-score-data/', { params: { month, year } });
        const memberList = Array.isArray(response.data?.members) ? response.data.members : [];
        const taskList = Array.isArray(response.data?.tasks) ? response.data.tasks : [];
        const clientList = Array.isArray(response.data?.clients) ? response.data.clients : [];
        const projectList = Array.isArray(response.data?.projects) ? response.data.projects : [];

        setMembers(memberList);
        setAllTasks(taskList);
        setScopedClients(clientList);
        setScopedProjects(projectList);
      } catch (err) {
        console.error('Failed to fetch tasks:', err);
        setMembers([]);
        setAllTasks([]);
        setScopedClients([]);
        setScopedProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [currentDate]);

  const clientOptions = useMemo(() => {
    if (scopedClients.length > 0) {
      return scopedClients
        .map(client => ({
          id: String(client.id),
          name: client.name || `Client ${client.id}`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const map = new Map();
    allTasks.forEach(task => {
      if (!task.client_org) return;
      const id = String(task.client_org);
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: task.client_name || `Client ${id}`,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allTasks, scopedClients]);

  const projectOptions = useMemo(() => {
    if (scopedProjects.length > 0) {
      return scopedProjects
        .map(project => ({
          id: String(project.id),
          name: project.name || `Project ${project.id}`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const map = new Map();
    allTasks.forEach(task => {
      if (!task.project) return;
      const id = String(task.project);
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: task.project_name || `Project ${id}`,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allTasks, scopedProjects]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (selectedClient !== 'all' && String(task.client_org) !== selectedClient) return false;
      return true;
    });
  }, [allTasks, selectedClient]);

  const teamData = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    // If "All Clients" selected: Group by employee
    if (selectedClient === 'all') {
      const employeeMap = {};
      
      filteredTasks.forEach(task => {
        if (!task.assigned_to) return;
        const employeeId = task.assigned_to;
        
        if (!employeeMap[employeeId]) {
          employeeMap[employeeId] = {
            id: employeeId,
            name: task.assigned_to_name || `Employee ${employeeId}`,
            tasks: []
          };
        }
        employeeMap[employeeId].tasks.push(task);
      });

      return Object.values(employeeMap)
        .map(employee => {
          const weeklyData = weeks.map(week => {
            const weekTasks = employee.tasks.filter(task => {
              if (!task.target_date) return false;
              const d = new Date(task.target_date);
              if (d.getMonth() !== month || d.getFullYear() !== year) return false;
              const day = d.getDate();
              return day >= week.start && day <= week.end;
            });
            return computeAtsOtc(weekTasks);
          });

          return {
            id: employee.id,
            name: employee.name,
            weeklyData,
            overall: computeOverallFromWeeklyData(weeklyData),
            isEmployee: true,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    // If specific client selected: Group by project
    const projectMap = {};
    
    filteredTasks.forEach(task => {
      let groupKey = null;
      let groupName = null;
      
      if (task.project) {
        groupKey = `project_${task.project}`;
        groupName = task.project_name || `Project ${task.project}`;
      } else {
        // If no project, group as unassigned
        groupKey = 'unassigned_projects';
        groupName = 'Unassigned Projects';
      }
      
      if (!projectMap[groupKey]) {
        projectMap[groupKey] = {
          id: groupKey,
          name: groupName,
          tasks: []
        };
      }
      projectMap[groupKey].tasks.push(task);
    });

    return Object.values(projectMap)
      .map(project => {
        const weeklyData = weeks.map(week => {
          const weekTasks = project.tasks.filter(task => {
            if (!task.target_date) return false;
            const d = new Date(task.target_date);
            if (d.getMonth() !== month || d.getFullYear() !== year) return false;
            const day = d.getDate();
            return day >= week.start && day <= week.end;
          });
          return computeAtsOtc(weekTasks);
        });

        return {
          id: project.id,
          name: project.name,
          weeklyData,
          overall: computeOverallFromWeeklyData(weeklyData),
          isEmployee: false,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTasks, weeks, currentDate, selectedClient]);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const shortMonth = currentDate.toLocaleString('default', { month: 'short' });

  // Color based on 0-100% scale
  const getScoreColor = (scoreStr) => {
    if (scoreStr === '-') return 'text-slate-400';
    const val = parseFloat(scoreStr);
    if (isNaN(val)) return 'text-slate-400';
    if (val >= 80) return 'text-green-600 font-semibold';
    if (val >= 60) return 'text-amber-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const totalCols = 2 + weeks.length * 2 + 2; // Sr.No + Name + weeks*2 + overall*2

  return (
    <div className="h-screen w-screen bg-gray-50 font-sans text-slate-800 flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto transition-all duration-300">
        <div className="max-w-full mx-auto px-6 py-8 space-y-6">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-200">
                <CalendarDays size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Planning Period</p>
                <h1 className="text-2xl font-bold text-slate-900">{monthName}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <button
                onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 text-sm font-medium text-slate-600 min-w-25 text-center">Navigate</span>
              <button
                onClick={() => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* FILTERS */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
              <div className="w-full lg:max-w-sm">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  Client View
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => {
                    setSelectedClient(e.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="all">All Clients</option>
                  {clientOptions.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 lg:ml-auto">
                Showing {filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'} in this view
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Activity className="text-blue-600" size={20} />
                Performance Overview
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase">
                  {/* Row 1: group headers */}
                  <tr>
                    <th rowSpan={2} className="px-4 py-3 border border-slate-200 text-center whitespace-nowrap w-16">
                      Sr. No.
                    </th>
                    <th rowSpan={2} className="px-6 py-3 border border-slate-200 whitespace-nowrap">
                      Name
                    </th>
                    {weeks.map((wk, i) => (
                      <th key={i} colSpan={2} className="px-4 py-3 border border-slate-200 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={wk.isShort ? 'text-amber-600' : ''}>{wk.label}</span>
                          <span className="text-[10px] font-normal normal-case text-slate-400">
                            {wk.start}–{wk.end} {shortMonth}
                          </span>
                          {wk.isShort && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 rounded-full">SHORT</span>
                          )}
                        </div>
                      </th>
                    ))}
                    <th colSpan={2} className="px-4 py-3 border border-slate-200 text-center whitespace-nowrap">
                      Overall Avg.
                    </th>
                  </tr>
                  {/* Row 2: ATS / OTC sub-headers */}
                  <tr>
                    {weeks.map((_, i) => (
                      <React.Fragment key={i}>
                        <th className="px-3 py-2 border border-slate-200 text-center text-[11px] tracking-wide">ATS</th>
                        <th className="px-3 py-2 border border-slate-200 text-center text-[11px] tracking-wide">OTC</th>
                      </React.Fragment>
                    ))}
                    <th className="px-3 py-2 border border-slate-200 text-center text-[11px] tracking-wide">ATS</th>
                    <th className="px-3 py-2 border border-slate-200 text-center text-[11px] tracking-wide">OTC</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={totalCols} className="px-6 py-8 text-center text-slate-500">
                        <div className="flex justify-center items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-slate-900 rounded-full" />
                          Loading team performance...
                        </div>
                      </td>
                    </tr>
                  ) : teamData.length === 0 ? (
                    <tr>
                      <td colSpan={totalCols} className="px-6 py-8 text-center text-slate-500">
                        No team data available for this period.
                      </td>
                    </tr>
                  ) : (
                    teamData.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                        <td className="px-4 py-3 border border-slate-100 text-center text-slate-500 text-xs">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-3 border border-slate-100">
                          {item.isEmployee ? (
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                                {(item.name || 'U').trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-700">{item.name}</span>
                            </div>
                          ) : (
                            <span className="font-medium text-slate-700">{item.name}</span>
                          )}
                        </td>
                        {item.weeklyData.map((wd, i) => (
                          <React.Fragment key={i}>
                            <td className={`px-3 py-3 border border-slate-100 text-center text-xs ${getScoreColor(wd.ats)}`}>
                              {wd.ats}
                            </td>
                            <td className={`px-3 py-3 border border-slate-100 text-center text-xs ${getScoreColor(wd.otc)}`}>
                              {wd.otc}
                            </td>
                          </React.Fragment>
                        ))}
                        <td className={`px-3 py-3 border border-slate-100 text-center text-xs ${getScoreColor(item.overall.ats)}`}>
                          {item.overall.ats}
                        </td>
                        <td className={`px-3 py-3 border border-slate-100 text-center text-xs ${getScoreColor(item.overall.otc)}`}>
                          {item.overall.otc}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default WeeklyScore;