import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip
} from 'recharts';
import {
  Filter, BarChart3, Plus, User, LayoutGrid,
  CheckCircle, Clock, AlertCircle, TrendingUp,
  FileText, Paperclip, X, Send, Download, ChevronRight, Upload
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

  // Updated Action Plan Table Data
  const actionTasks = [
    { id: 1, action: "Annual Budget Reconciliation", assignedBy: "Rajesh Kumar", assignedTo: "Kamlesh C.", targetDate: "2024-03-15", doc: "budget_v1.pdf" },
    { id: 2, action: "Client Feedback Implementation", assignedBy: "Sarah Jenkins", assignedTo: "Amit Shah", targetDate: "2024-03-20", doc: "feedback.docx" },
    { id: 3, action: "Security Compliance Audit", assignedBy: "Priyanka M.", assignedTo: "Rahul V.", targetDate: "2024-03-10", doc: null },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 antialiased pb-20">
      <Navbar hideLogin={true} />

      {/* ===== MAIN ANALYTICS SECTION (UNCHANGED) ===== */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-4">

        {/* PIE CHART CARD */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="font-black text-slate-900 tracking-tighter text-lg uppercase italic">
                Action Plan Distribution
              </h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Live Analytics</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl text-[#F58A4B]">
              <BarChart3 size={16} />
            </div>
          </div>

          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>



        </div>

        {/* KPI CARDS GRID */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-2 lg:grid-cols-3 gap-3">
          <KPICard title="Total Task" value="12" color="border-indigo-500" icon={<LayoutGrid size={18} />} />
          <KPICard title="On Time Task" value="05" color="border-green-500" icon={<CheckCircle size={18} />} />
          <KPICard title="Delay Completion" value="03" color="border-yellow-400" icon={<Clock size={18} />} />
          <KPICard title="In Progress" value="02" color="border-blue-500" icon={<TrendingUp size={18} />} />
          <KPICard title="Over Due" value="02" color="border-red-500" icon={<AlertCircle size={18} />} />
          <KPICard title="Efficiency" value="84%" color="border-purple-500" icon={<User size={18} />} />
        </div>

        {/* ===== UPDATED: ACTION PLAN TABLE SECTION ===== */}
        <div className="col-span-12 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mt-2">
          <div className="p-5 border-b border-slate-50 flex flex-wrap justify-between items-center gap-4 bg-white">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Action Matrix</h2>
              <p className="text-slate-400 text-[9px] font-bold tracking-[0.2em] uppercase mt-0.5">Execution & Monitoring</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-[#F58A4B] transition-all shadow-lg active:scale-95"
            >
              <Plus size={14} /> New Action Entry
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Sr. No.</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action / Task</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned By</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Assign To</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Target Date</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">File Updation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {actionTasks.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/30 transition-all group">
                    <td className="px-6 py-4 text-center">
                      <span className="text-[10px] font-black text-slate-300">#{idx + 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm group-hover:text-[#F58A4B] transition-colors">{item.action}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400 uppercase">
                          {item.assignedBy.charAt(0)}
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 tracking-tight">{item.assignedBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#F58A4B]/10 flex items-center justify-center text-[8px] font-black text-[#F58A4B] uppercase">
                          {item.assignedTo.charAt(0)}
                        </div>
                        <span className="text-[10px] font-black text-slate-900 tracking-tight">{item.assignedTo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 bg-slate-50 rounded-lg text-[10px] font-black text-slate-600 border border-slate-100">
                        {item.targetDate}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.doc ? (
                          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all">
                            <Download size={12} />
                            <span className="text-[8px] font-black uppercase">View</span>
                          </button>
                        ) : (
                          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg border border-slate-100 border-dashed hover:border-[#F58A4B] hover:text-[#F58A4B] transition-all">
                            <Upload size={12} />
                            <span className="text-[8px] font-black uppercase">Upload</span>
                          </button>
                        )}
                      </div>
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
          <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-lg font-black uppercase italic tracking-tighter">New Action Plan Entry</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <form className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Action Description</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:border-[#F58A4B] outline-none transition-all font-bold text-sm" placeholder="What needs to be done?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Date</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Assign To</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none appearance-none">
                    <option>Kamlesh C.</option>
                    <option>Amit Shah</option>
                    <option>Rahul V.</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Initial File</label>
                <div className="border border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-center gap-2 text-slate-400 hover:border-[#F58A4B] cursor-pointer transition-all">
                  <Paperclip size={16} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Attach Supporting Document</span>
                </div>
              </div>
              <button className="w-full bg-slate-900 text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-[#F58A4B] transition-all shadow-lg mt-2 text-xs">
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
  <div className={`bg-white rounded-[1.5rem] shadow-sm p-4 border-l-[4px] ${color} border border-y-slate-100 border-r-slate-100 flex items-center justify-between group hover:shadow-md transition-all`}>
    <div>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">{title}</span>
      <h2 className="text-2xl font-black text-slate-900 tracking-tighter mt-0.5">{value}</h2>
    </div>
    <div className="text-slate-200 group-hover:text-slate-900 transition-colors">
      {icon}
    </div>
  </div>
);

export default ActionPlanDashboard;