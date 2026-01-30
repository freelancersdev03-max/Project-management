import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, ChevronLeft, Search, Filter, Calendar, 
  UserCheck, Clock, CheckCircle2, Circle, 
  MoreVertical, ArrowRight, AlertCircle, LayoutList
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api';

const TaskManagement = () => {
  const navigate = useNavigate();
  const { clientId, projectName } = useParams();
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // One-to-One Task Creation State
  const [newTask, setNewTask] = useState({
    title: '',
    assignedTo: '', // ID of the specific person
    deadline: '',
    priority: 'Medium', // High, Medium, Low
    description: ''
  });

  useEffect(() => {
    // Logic to fetch tasks linked to this specific project
    const fetchTasks = async () => {
      try {
        setLoading(true);
        // Replace with your actual endpoint e.g., api.get(`projects/${projectId}/tasks/`)
        // For now using mock logic
        setTasks([
          { id: 1, title: "Initial Site Audit", assigned: "Sarah Jenkins", status: "Completed", deadline: "2026-02-10", priority: "High" },
          { id: 2, title: "Documentation Review", assigned: "Marcus Thorne", status: "In Progress", deadline: "2026-02-15", priority: "Medium" },
        ]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans pb-20">
      <Navbar hideLogin={true} />

      <main className="max-w-[1400px] mx-auto px-6 md:px-10 pt-8 space-y-8">
        
        {/* Header & Navigation */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <button 
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-400 font-bold text-[11px] uppercase tracking-widest hover:text-[#F58A4B] transition-colors group"
            >
              <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Project Detail
            </button>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
              Task <span className="text-[#F58A4B]">Flow</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2">
              <LayoutList size={14} className="text-[#F58A4B]"/> Project: {decodeURIComponent(projectName)}
            </p>
          </div>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#F58A4B] transition-all shadow-xl flex items-center gap-3"
          >
            <Plus size={18} /> Assign New Task
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="w-full pl-14 pr-6 py-3 bg-slate-50 border-none rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#F58A4B]/20 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
            <Filter size={14} /> All Members
          </div>
        </div>

        {/* Task List Structure */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Assignment Identity</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Priority</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Timeline</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="group hover:bg-slate-50/50 transition-all">
                  <td className="px-10 py-6">
                    <div className="flex items-start gap-5">
                      <div className="mt-1">
                        {task.status === 'Completed' ? (
                          <CheckCircle2 className="text-emerald-500" size={22} />
                        ) : (
                          <Circle className="text-slate-200 group-hover:text-[#F58A4B] transition-colors" size={22} />
                        )}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 text-lg tracking-tight uppercase italic">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <UserCheck size={12} className="text-[#F58A4B]" />
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{task.assigned}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      task.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-orange-50 text-[#F58A4B] border-orange-100'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                        <Clock size={14} className="text-[#F58A4B]"/> {task.deadline}
                      </div>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-tighter mt-1">Target End-date</p>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button className="p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* CREATE TASK MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Task <span className="text-[#F58A4B]">Assignment</span></h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">One-to-One Flow Protocol</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X /></button>
              </div>

              <form className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Task Title</label>
                  <input required className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-[#F58A4B] outline-none" placeholder="e.g., Risk Assessment Draft" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Assign Member</label>
                    <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-[#F58A4B] appearance-none">
                      <option>Select Member</option>
                      {/* Map your team members here */}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Priority Level</label>
                    <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-[#F58A4B] appearance-none text-[#F58A4B]">
                      <option>Low</option>
                      <option selected>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] uppercase font-black text-slate-400 ml-4 tracking-widest">Due Date</label>
                  <input type="date" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:border-[#F58A4B] outline-none" />
                </div>

                <button type="button" className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] hover:bg-[#F58A4B] transition-all shadow-xl shadow-slate-200 mt-4">
                  Deploy Task Assignment
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManagement;