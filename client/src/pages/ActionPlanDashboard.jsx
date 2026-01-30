import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';
import { 
  Filter, BarChart3, Plus, User, LayoutGrid, 
  CheckCircle, Clock, AlertCircle, TrendingUp, 
  FileText, Paperclip, X, Send, Download, ChevronRight
} from 'lucide-react';

const ActionPlanDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Original Chart Data
  const chartData = [
    { name: "On Time", value: 40, color: "#22c55e" },
    { name: "In Progress", value: 30, color: "#3b82f6" },
    { name: "Delayed", value: 20, color: "#facc15" },
    { name: "Overdue", value: 10, color: "#ef4444" },
  ];

  // Action Plan Table Data
  const actionTasks = [
    { id: 1, task: "Annual Budget Reconciliation", targetDate: "2024-03-15", status: "In Progress", assignedBy: "Rajesh Kumar", assignedTo: "Kamlesh C.", doc: "budget_v1.pdf" },
    { id: 2, task: "Client Feedback Implementation", targetDate: "2024-03-20", status: "On Time", assignedBy: "Sarah Jenkins", assignedTo: "Amit Shah", doc: "feedback.docx" },
    { id: 3, task: "Security Compliance Audit", targetDate: "2024-03-10", status: "Delayed", assignedBy: "Priyanka M.", assignedTo: "Rahul V.", doc: null },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 antialiased pb-20">
      <Navbar hideLogin={true} />

      {/* ===== MAIN ANALYTICS SECTION (SAME GRID STRUCTURE) ===== */}
      <main className="max-w-7xl mx-auto px-6 lg:px-10 py-12 grid grid-cols-12 gap-8">

        {/* PIE CHART CARD - Occupies 5 columns (Same as original) */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm p-8 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-black text-slate-900 tracking-tighter text-xl uppercase italic">
                Task Distribution
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Live Analytics</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl text-[#F58A4B]">
              <BarChart3 size={20} />
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={90}
                  outerRadius={125}
                  paddingAngle={8}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 6 KPI CARDS GRID - Occupies 7 columns (Same as original) */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
          <KPICard title="Total Task" value="12" color="border-indigo-500" icon={<LayoutGrid size={22}/>} />
          <KPICard title="On Time Task" value="05" color="border-green-500" icon={<CheckCircle size={22}/>} />
          <KPICard title="Delay Completion" value="03" color="border-yellow-400" icon={<Clock size={22}/>} />
          <KPICard title="In Progress" value="02" color="border-blue-500" icon={<TrendingUp size={22}/>} />
          <KPICard title="Over Due" value="02" color="border-red-500" icon={<AlertCircle size={22}/>} />
          <KPICard title="Efficiency" value="84%" color="border-purple-500" icon={<User size={22}/>} />
        </div>

        {/* ===== NEW: ACTION PLAN MATRIX SECTION (BOTTOM) ===== */}
        <div className="col-span-12 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden mt-4">
          <div className="p-8 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4 bg-white">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Action Plan Matrix</h2>
              <p className="text-slate-400 text-[10px] font-bold tracking-[0.2em] uppercase mt-1">Operational Flow & Assignments</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-[#F58A4B] transition-all active:scale-95 shadow-xl shadow-slate-200"
            >
              <Plus size={16} /> Assign New Task
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sr.</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Task / Objective</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Target Date</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignment Status</th>
                  <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Files</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {actionTasks.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-all group">
                    <td className="px-8 py-7 text-center">
                      <span className="text-xs font-black text-slate-300">#0{idx + 1}</span>
                    </td>
                    <td className="px-8 py-7">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 text-base group-hover:text-[#F58A4B] transition-colors">{item.task}</p>
                        <div className="flex items-center gap-3">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">By: {item.assignedBy}</span>
                            <ChevronRight size={10} className="text-slate-300" />
                            <span className="text-[10px] text-slate-900 font-black uppercase tracking-wider">To: {item.assignedTo}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-7 text-center">
                       <span className="inline-block px-4 py-2 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 border border-slate-100">
                          {item.targetDate}
                       </span>
                    </td>
                    <td className="px-8 py-7">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-8 py-7 text-center">
                      {item.doc ? (
                        <button className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-xl transition-all">
                          <Download size={18} />
                        </button>
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ===== FORM MODAL ===== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">New Action Plan Entry</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Task Details</label>
                <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 focus:border-[#F58A4B] outline-none transition-all font-bold" placeholder="Define the task..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Deadline</label>
                    <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Assign To</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold outline-none">
                        <option>Kamlesh C.</option>
                        <option>Team Alpha</option>
                    </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Attachment</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex items-center justify-center gap-3 text-slate-400 hover:border-[#F58A4B] cursor-pointer transition-all">
                    <Paperclip size={18} />
                    <span className="text-[10px] font-black uppercase">Upload Support Doc</span>
                </div>
              </div>
              <button className="w-full bg-slate-900 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-[#F58A4B] transition-all shadow-lg mt-2">
                Submit Action Plan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* --- SUB-COMPONENTS --- */

const KPICard = ({ title, value, color, icon }) => (
  <div className={`bg-white rounded-[2rem] shadow-sm p-8 border-l-[6px] ${color} border-2 border-y-slate-100 border-r-slate-100 flex items-center justify-between group hover:shadow-md transition-all`}>
    <div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{title}</span>
      <h2 className="text-4xl font-black text-slate-900 tracking-tighter mt-1">{value}</h2>
    </div>
    <div className="text-slate-200 group-hover:text-slate-900 transition-colors">
      {icon}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    "On Time": "bg-green-50 text-green-600 border-green-100",
    "In Progress": "bg-blue-50 text-blue-600 border-blue-100",
    "Delayed": "bg-yellow-50 text-yellow-600 border-yellow-100",
    "Overdue": "bg-red-50 text-red-600 border-red-100",
  };
  
  return (
    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles[status]}`}>
      {status}
    </span>
  );
};

export default ActionPlanDashboard;