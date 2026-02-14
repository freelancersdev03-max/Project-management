import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, ArrowLeft, Trash2 } from 'lucide-react';
import Navbar from '../../components/Navbar';
import api from '../../api';


const DDTMETable = () => {
  const [objectives, setObjectives] = useState([
    { sr: 1, objective: 'Create the sales & marketing structure' },
    { sr: 2, objective: 'Association meeting for ZED marketing mail' }
  ]);

  const [deliverables, setDeliverables] = useState([
    {
      sr: 1,
      name: 'Prepare calling and meeting scripts',
      weekly: 'Week 1',
      yash: { on: 4, off: 2 },
      rahul: { on: 3, off: 1 },
      amit: { on: 2, off: 2 }
    }
  ]);

  const [newObjective, setNewObjective] = useState('');
  const [showAddObjective, setShowAddObjective] = useState(false);
  const [newDeliverable, setNewDeliverable] = useState({ name: '', weekly: '', yash: { on: 0, off: 0 }, rahul: { on: 0, off: 0 }, amit: { on: 0, off: 0 } });
  const [showAddDeliverable, setShowAddDeliverable] = useState(false);

  const addObjective = () => {
    if (newObjective.trim()) {
      setObjectives([...objectives, { sr: objectives.length + 1, objective: newObjective }]);
      setNewObjective('');
      setShowAddObjective(false);
    }
  };

  const addDeliverable = () => {
    if (newDeliverable.name.trim() && newDeliverable.weekly.trim()) {
      setDeliverables([...deliverables, { sr: deliverables.length + 1, ...newDeliverable }]);
      setNewDeliverable({ name: '', weekly: '', yash: { on: 0, off: 0 }, rahul: { on: 0, off: 0 }, amit: { on: 0, off: 0 } });
      setShowAddDeliverable(false);
    }
  };



  const deleteDeliverable = (index) => {
    // Kept for backward compatibility if we still want to edit local state deliverables
    // But for dynamic view, this might be disabled or handled differently
    const updated = deliverables.filter((_, i) => i !== index);
    setDeliverables(updated.map((del, idx) => ({ ...del, sr: idx + 1 })));
  };

  const deleteObjective = (index) => {
    const updated = objectives.filter((_, i) => i !== index);
    setObjectives(updated.map((obj, idx) => ({ ...obj, sr: idx + 1 })));
  };

  // --- DYNAMIC DATA FETCHING ---
  const [clientBigTasks, setClientBigTasks] = useState([]);
  const [clientEmployees, setClientEmployees] = useState([]);
  const { clientId } = useParams();

  // Month/Year Selection
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  // Generate years (current year +/- 2)
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  useEffect(() => {
    if (clientId) {
      const fetchData = async () => {
        try {
          const token = localStorage.getItem('access_token');
          const headers = { Authorization: `Bearer ${token}` };

          // 1. Fetch Big Tasks (Rows) with Month/Year Filter
          const tasksRes = await api.get(`ddtme/big-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`, { headers });
          // Handle pagination if present
          const tasksData = Array.isArray(tasksRes.data) ? tasksRes.data : (tasksRes.data.results || []);
          setClientBigTasks(tasksData);

          // 2. Fetch Client Employees (Columns)
          const empsRes = await api.get(`clients/${clientId}/employees/`, { headers });
          const empsData = Array.isArray(empsRes.data) ? empsRes.data : (empsRes.data.results || []);
          setClientEmployees(empsData);

        } catch (error) {
          console.error("Failed to fetch DDTME data", error);
        }
      };
      fetchData();
    }
  }, [clientId, selectedMonth, selectedYear]);

  // Helper to safely get Hours (Plan/Off)
  const [manDayData, setManDayData] = useState({});

  const handleHourChange = (taskId, empId, field, value) => {
    const key = `${taskId}_${empId}`;
    setManDayData(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: parseInt(value) || 0
      }
    }));
  };

  const getHours = (taskId, empId, field) => {
    return manDayData[`${taskId}_${empId}`]?.[field] || 0;
  };

  const getTotalHoursForEmp = (empId) => {
    let total = 0;
    if (Array.isArray(clientBigTasks)) {
      clientBigTasks.forEach(task => {
        total += getHours(task.id, empId, 'on');
      });
    }
    return total;
  };

  const getTotalOffHoursForEmp = (empId) => {
    let total = 0;
    if (Array.isArray(clientBigTasks)) {
      clientBigTasks.forEach(task => {
        total += getHours(task.id, empId, 'off');
      });
    }
    return total;
  };

  const grandTotal = Array.isArray(clientEmployees) ? clientEmployees.reduce((acc, emp) => acc + getTotalHoursForEmp(emp.id), 0) : 0;

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans pb-20">
      <Navbar hideLogin />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 pt-4 space-y-4">

        {/* Header */}
        <div className="space-y-4 pb-8 border-b-2 border-slate-200">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-semibold text-xs"
          >
            <ArrowLeft size={14} /> BACK
          </button>

          <div>
            <span className="inline-block bg-black text-white text-[10px] font-black uppercase px-3 py-1 rounded-full mb-4">
              Man-Days Estimation
            </span>
            <h1 className="text-5xl font-black text-slate-900">DDTME</h1>
            <p className="text-slate-400 text-xs font-semibold mt-2 italic">Deliverable Distribution Table</p>
          </div>
        </div>

        {/* Monthly Major Objectives */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-900">Monthly Major Objectives</h2>
            <button
              onClick={() => setShowAddObjective(!showAddObjective)}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all"
            >
              <Plus size={14} /> Add Objective
            </button>
          </div>

          {showAddObjective && (
            <div className="flex gap-3 bg-slate-100 p-4 rounded-xl">
              <input
                type="text"
                value={newObjective}
                onChange={(e) => setNewObjective(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addObjective()}
                placeholder="Enter new objective..."
                className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg text-sm font-semibold focus:border-black focus:outline-none"
                autoFocus
              />
              <button
                onClick={addObjective}
                className="px-4 py-2 bg-black text-white rounded-lg text-xs font-bold uppercase hover:bg-slate-800"
              >
                Add
              </button>
            </div>
          )}

          <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-6 py-4 text-left text-xs font-black uppercase w-16">SR</th>
                  <th className="px-6 py-4 text-left text-xs font-black uppercase">Objective</th>
                  <th className="px-6 py-4 text-center text-xs font-black uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {objectives.map((obj, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{obj.sr}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{obj.objective}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => deleteObjective(idx)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete objective"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* DYNAMIC MAN-DAYS PLAN */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Man-days Plan <span className="text-slate-400">({new Date().toLocaleString('default', { month: 'long' })} {new Date().getFullYear()})</span>
              </h2>
              <p className="text-slate-500 text-xs font-semibold mt-1">Grand Total: {grandTotal} hrs</p>
            </div>
          </div>

          <div className="border-2 border-slate-900 rounded-lg overflow-x-auto">
            <table className="w-full min-w-max">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase sticky left-0 bg-slate-900 z-10">SR</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black uppercase sticky left-10 bg-slate-900 z-10">IT Deliverable (Big Tasks)</th>
                  <th className="px-4 py-3 text-left text-[10px] font-black uppercase">Start Date</th>

                  {/* Dynamic Employee Headers */}
                  {clientEmployees.length === 0 ? (
                    <th className="px-4 py-3 text-center text-[10px] font-black uppercase border-l border-slate-700 text-slate-400">
                      No Employees Assigned
                    </th>
                  ) : (
                    clientEmployees.map(emp => (
                      <th key={emp.id} colSpan="2" className="px-4 py-3 text-center text-[10px] font-black uppercase border-l border-slate-700">
                        {emp.first_name} {emp.last_name || ''}
                      </th>
                    ))
                  )}

                  <th className="px-4 py-3 text-center text-[10px] font-black uppercase border-l border-slate-700">Action</th>
                </tr>
                <tr className="bg-slate-800 text-white">
                  <th colSpan="3" className="sticky left-0 bg-slate-800 z-10"></th>
                  {clientEmployees.map(emp => (
                    <React.Fragment key={emp.id}>
                      <th className="px-3 py-2 text-center text-[9px] font-bold border-l border-slate-700">Plan</th>
                      <th className="px-3 py-2 text-center text-[9px] font-bold">Off</th>
                    </React.Fragment>
                  ))}
                  {clientEmployees.length === 0 && <th></th>}
                  <th className="border-l border-slate-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clientBigTasks.length === 0 ? (
                  <tr>
                    <td colSpan={4 + (clientEmployees.length * 2)} className="px-6 py-8 text-center text-slate-500 font-bold">
                      No Big Tasks found. Add Big Tasks in the Project view first.
                    </td>
                  </tr>
                ) : (
                  clientBigTasks.map((task, idx) => (
                    <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-bold text-slate-900 text-center sticky left-0 bg-white group-hover:bg-slate-50">{idx + 1}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700 sticky left-10 bg-white group-hover:bg-slate-50">
                        {task.title}
                        <div className="text-[10px] text-indigo-500 font-bold uppercase mt-1">{task.project_name}</div>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600 font-mono">{task.start_date || '-'}</td>

                      {/* Dynamic Employee Inputs */}
                      {clientEmployees.length > 0 ? clientEmployees.map(emp => (
                        <React.Fragment key={emp.id}>
                          <td className="px-2 py-4 text-center border-l border-slate-100">
                            <input
                              type="number"
                              value={getHours(task.id, emp.id, 'on')}
                              onChange={(e) => handleHourChange(task.id, emp.id, 'on', e.target.value)}
                              className="w-12 text-center bg-blue-50 text-slate-800 font-bold text-xs p-1 rounded border-transparent focus:border-blue-500 focus:bg-white transition-all outline-none"
                            />
                          </td>
                          <td className="px-2 py-4 text-center">
                            <input
                              type="number"
                              value={getHours(task.id, emp.id, 'off')}
                              onChange={(e) => handleHourChange(task.id, emp.id, 'off', e.target.value)}
                              className="w-12 text-center bg-yellow-50 text-slate-800 font-bold text-xs p-1 rounded border-transparent focus:border-yellow-500 focus:bg-white transition-all outline-none"
                            />
                          </td>
                        </React.Fragment>
                      )) : (
                        <td className="text-center text-xs text-slate-400 italic">No employees</td>
                      )}

                      <td className="px-4 py-4 text-center border-l border-slate-100">
                        <span className="text-slate-300 text-xs">View Only</span>
                      </td>
                    </tr>
                  ))
                )}

                {/* Totals Row */}
                {clientBigTasks.length > 0 && clientEmployees.length > 0 && (
                  <tr className="bg-yellow-50 font-bold sticky bottom-0 z-10 shadow-t">
                    <td colSpan="3" className="px-6 py-4 text-right text-sm sticky left-0 bg-yellow-50 z-20">Total Hours</td>

                    {clientEmployees.map(emp => (
                      <React.Fragment key={emp.id}>
                        <td className="px-3 py-4 text-center text-sm border-l border-yellow-100 text-blue-800">
                          {getTotalHoursForEmp(emp.id)}
                        </td>
                        <td className="px-3 py-4 text-center text-sm text-slate-500">
                          {getTotalOffHoursForEmp(emp.id)}
                        </td>
                      </React.Fragment>
                    ))}

                    <td className="border-l border-yellow-100"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DDTMETable;
