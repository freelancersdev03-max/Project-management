import React, { useState } from 'react';
import { Download, CheckCircle, LayoutGrid, Users, Check, Clock, UserCheck } from 'lucide-react';

// --- DUMMY DATA ---
const DUMMY_OBJECTIVES = [
  { id: 1, text: "Finalize Q3 product roadmap and feature prioritization" },
  { id: 2, text: "Reduce API latency by 20% across all core endpoints" }
];

const DUMMY_TASKS = [
  { id: 101, title: "Design System Architecture", type: "big" },
  { id: 102, title: "Backend Database Migration", type: "big" },
  { id: 103, title: "User Acceptance Testing (UAT)", type: "add" },
  { id: 104, title: "Sprint Planning & Retro", type: "add" },
];

const DUMMY_EMPLOYEES = [
  { id: "u-10", name: "Alice Johnson", initials: "AJ", color: "bg-blue-100 text-blue-700" },
  { id: "u-15", name: "Bob Smith", initials: "BS", color: "bg-purple-100 text-purple-700" },
  { id: "u-22", name: "Charlie Davis", initials: "CD", color: "bg-emerald-100 text-emerald-700" },
  { id: "u-30", name: "Diana Prince", initials: "DP", color: "bg-rose-100 text-rose-700" },
  { id: "u-45", name: "Ethan Hunt", initials: "EH", color: "bg-amber-100 text-amber-700" },
];

const INITIAL_MANDAY_DATA = {
  'big_101_u-10': { on: '5', off: '0' },
  'big_101_u-15': { on: '0', off: '2' },
  'big_102_u-15': { on: '8', off: '0' },
  'add_103_u-22': { on: '3', off: '4' },
  'add_103_u-10': { on: '0', off: '0' },
  'big_102_u-45': { on: '6', off: '2' },
  'add_104_u-30': { on: '4', off: '1' }
};

export default function CapacityPlanner() {
  const [manDayData, setManDayData] = useState(INITIAL_MANDAY_DATA);
  const [viewMode, setViewMode] = useState('task'); // 'task' | 'employee'

  // Standard hour update logic using the requested state format
  const handleHourChange = (taskId, empId, field, value, type) => {
    const normalizedValue = value.replace(/[^0-9.]/g, ''); // basic number parsing
    const key = `${type}_${taskId}_${empId}`;
    setManDayData(prev => ({
      ...prev,
      [key]: {
        ...prev[key] || { on: '0', off: '0' },
        [field]: normalizedValue
      }
    }));
  };

  const getHours = (taskId, empId, field, type) => {
    const key = `${type}_${taskId}_${empId}`;
    return manDayData[key]?.[field] || '0';
  };

  const parseHour = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Analytics Calculations
  let totalHours = 0;
  Object.values(manDayData).forEach(val => {
    totalHours += parseHour(val.on) + parseHour(val.off);
  });
  
  const activeResources = new Set();
  Object.keys(manDayData).forEach(key => {
    const [, , empId] = key.split('_');
    const data = manDayData[key];
    if (parseHour(data.on) > 0 || parseHour(data.off) > 0) {
      activeResources.add(empId);
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 p-6 md:p-10">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* --- 1. HEADER NAVIGATION --- */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Capacity Planner</h1>
              <p className="text-sm text-slate-500 font-medium">Project Lead: <span className="text-slate-800">Sarah Jenkins</span></p>
            </div>
            <div className="hidden md:block h-10 w-px bg-slate-200 mx-2"></div>
            {/* Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
              <CheckCircle size={14} className="text-green-600" />
              <span className="text-xs font-bold text-green-700 tracking-wide uppercase">Approved</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
              <Download size={16} />
              Download
            </button>
            <button className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-md">
              <Check size={16} />
              Submit Approval
            </button>
          </div>
        </header>

        {/* --- 2. BENTO GRID TOP SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card 1: Sprint Goals */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-400 tracking-widest uppercase mb-4">Sprint Goals</h2>
              <ul className="space-y-3">
                {DUMMY_OBJECTIVES.map(obj => (
                  <li key={obj.id} className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                    <span className="text-slate-700 font-medium">{obj.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          {/* Card 2: Summary Metrics */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
            <h2 className="text-sm font-bold text-slate-400 tracking-widest uppercase">Summary Metrics</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Total Hours</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{totalHours}</div>
              </div>
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <UserCheck size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Resources</span>
                </div>
                <div className="text-3xl font-black text-slate-900">{activeResources.size}</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- 3. TEAM CAPACITY ALLOCATION (DATA GRID) --- */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Grid Header & Toggle */}
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Team Capacity Allocation</h2>
            
            {/* View Toggle */}
            <div className="flex bg-slate-200 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('task')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'task' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <LayoutGrid size={16} />
                View by Task
              </button>
              <button 
                onClick={() => setViewMode('employee')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'employee' ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Users size={16} />
                View by Employee
              </button>
            </div>
          </div>

          {/* Grid Scrollable Area */}
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-sm text-left border-collapse min-w-max">
              <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                <tr>
                  {/* Sticky First Column Header */}
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider sticky left-0 z-30 bg-slate-50 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                    {viewMode === 'task' ? 'Action Item' : 'Team Member'}
                  </th>
                  
                  {/* Dynamic Headers */}
                  {viewMode === 'task' ? (
                    DUMMY_EMPLOYEES.map(emp => (
                      <th key={emp.id} className="px-4 py-4 text-center border-r border-slate-200 min-w-[140px]">
                        <div className="flex flex-col items-center gap-2" title={emp.name}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${emp.color}`}>
                            {emp.initials}
                          </div>
                          <div className="flex gap-4 mt-2 text-[10px] uppercase font-bold text-slate-400">
                            <span>Core</span>
                            <span>Ad-hoc</span>
                          </div>
                        </div>
                      </th>
                    ))
                  ) : (
                    DUMMY_TASKS.map(task => (
                      <th key={task.id} className="px-4 py-4 text-center border-r border-slate-200 min-w-[160px]">
                        <div className="flex flex-col items-center gap-2" title={task.title}>
                          <span className="font-semibold text-slate-700 truncate max-w-[140px]">{task.title}</span>
                          <div className="flex gap-4 mt-2 text-[10px] uppercase font-bold text-slate-400">
                            <span>Core</span>
                            <span>Ad-hoc</span>
                          </div>
                        </div>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {viewMode === 'task' ? (
                  // TASK VIEW (Rows = Tasks, Cols = Employees)
                  DUMMY_TASKS.map(task => (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 font-medium text-slate-900 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                        {task.title}
                      </td>
                      {DUMMY_EMPLOYEES.map(emp => {
                        const coreVal = getHours(task.id, emp.id, 'on', task.type);
                        const adHocVal = getHours(task.id, emp.id, 'off', task.type);
                        
                        return (
                          <td key={emp.id} className="px-4 py-3 border-r border-slate-100">
                            <div className="flex justify-center gap-2">
                              {/* Core Input */}
                              <input 
                                type="text"
                                value={coreVal}
                                onChange={(e) => handleHourChange(task.id, emp.id, 'on', e.target.value, task.type)}
                                className={`w-12 text-center py-1.5 rounded-md border font-semibold text-sm transition-all outline-none focus:ring-2 focus:ring-blue-100 ${
                                  parseHour(coreVal) === 0 ? 'border-transparent bg-transparent text-slate-300' : 'border-slate-200 bg-white text-slate-800 focus:border-blue-400'
                                }`}
                              />
                              {/* Ad-hoc Input */}
                              <input 
                                type="text"
                                value={adHocVal}
                                onChange={(e) => handleHourChange(task.id, emp.id, 'off', e.target.value, task.type)}
                                className={`w-12 text-center py-1.5 rounded-md border font-semibold text-sm transition-all outline-none focus:ring-2 focus:ring-purple-100 ${
                                  parseHour(adHocVal) === 0 ? 'border-transparent bg-transparent text-slate-300' : 'border-slate-200 bg-white text-slate-800 focus:border-purple-400'
                                }`}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  // EMPLOYEE VIEW (Rows = Employees, Cols = Tasks)
                  DUMMY_EMPLOYEES.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50/50 border-r border-slate-200 shadow-[1px_0_0_0_#e2e8f0]">
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${emp.color}`}>
                            {emp.initials}
                          </div>
                          <span className="font-medium text-slate-900">{emp.name}</span>
                        </div>
                      </td>
                      {DUMMY_TASKS.map(task => {
                        const coreVal = getHours(task.id, emp.id, 'on', task.type);
                        const adHocVal = getHours(task.id, emp.id, 'off', task.type);
                        
                        return (
                          <td key={task.id} className="px-4 py-3 border-r border-slate-100">
                            <div className="flex justify-center gap-2">
                              {/* Core Input */}
                              <input 
                                type="text"
                                value={coreVal}
                                onChange={(e) => handleHourChange(task.id, emp.id, 'on', e.target.value, task.type)}
                                className={`w-12 text-center py-1.5 rounded-md border font-semibold text-sm transition-all outline-none focus:ring-2 focus:ring-blue-100 ${
                                  parseHour(coreVal) === 0 ? 'border-transparent bg-transparent text-slate-300' : 'border-slate-200 bg-white text-slate-800 focus:border-blue-400'
                                }`}
                              />
                              {/* Ad-hoc Input */}
                              <input 
                                type="text"
                                value={adHocVal}
                                onChange={(e) => handleHourChange(task.id, emp.id, 'off', e.target.value, task.type)}
                                className={`w-12 text-center py-1.5 rounded-md border font-semibold text-sm transition-all outline-none focus:ring-2 focus:ring-purple-100 ${
                                  parseHour(adHocVal) === 0 ? 'border-transparent bg-transparent text-slate-300' : 'border-slate-200 bg-white text-slate-800 focus:border-purple-400'
                                }`}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
              
              {/* Sticky Footer */}
              <tfoot className="bg-slate-50 sticky bottom-0 z-20 shadow-[0_-1px_0_0_#e2e8f0]">
                <tr>
                  <td className="px-6 py-4 font-black text-slate-900 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 uppercase tracking-widest text-xs">
                    Total Hours
                  </td>
                  {viewMode === 'task' ? (
                     DUMMY_EMPLOYEES.map(emp => {
                       let empCore = 0; let empAdhoc = 0;
                       DUMMY_TASKS.forEach(task => {
                         empCore += parseHour(getHours(task.id, emp.id, 'on', task.type));
                         empAdhoc += parseHour(getHours(task.id, emp.id, 'off', task.type));
                       });
                       return (
                         <td key={emp.id} className="px-4 py-4 border-r border-slate-200 text-center">
                           <div className="flex justify-center gap-4 text-sm font-bold text-slate-700">
                             <span className="w-10 text-center">{empCore}</span>
                             <span className="w-10 text-center">{empAdhoc}</span>
                           </div>
                         </td>
                       );
                     })
                  ) : (
                     DUMMY_TASKS.map(task => {
                       let taskCore = 0; let taskAdhoc = 0;
                       DUMMY_EMPLOYEES.forEach(emp => {
                         taskCore += parseHour(getHours(task.id, emp.id, 'on', task.type));
                         taskAdhoc += parseHour(getHours(task.id, emp.id, 'off', task.type));
                       });
                       return (
                         <td key={task.id} className="px-4 py-4 border-r border-slate-200 text-center">
                           <div className="flex justify-center gap-4 text-sm font-bold text-slate-700">
                             <span className="w-10 text-center">{taskCore}</span>
                             <span className="w-10 text-center">{taskAdhoc}</span>
                           </div>
                         </td>
                       );
                     })
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        
      </div>
    </div>
  );
}
