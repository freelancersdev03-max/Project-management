import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Users, UserCheck, Calendar, CalendarIcon,
  ShieldCheck, Briefcase, Edit3, Share2, 
  Clock, Target, CheckCircle2, Mail, Loader2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../api';

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { clientId, clientName, projectName } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);

  const fetchData = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Projects and filter using your specific logic
      const projRes = await api.get(`projects/`, { headers });
      
      // Filter by client ID (matching your logic: p.client)
      const clientProjects = projRes.data.filter(
        p => String(p.client) === String(clientId)
      );

      // Find the specific project by name from the URL
      const decodedProjectName = decodeURIComponent(projectName);
      const currentProject = clientProjects.find(p => p.name === decodedProjectName);
      
      if (currentProject) {
        setProject(currentProject);
      }

      // 2. Fetch Team Members for this client
      const teamRes = await api.get(`clients/${clientId}/members/`, { headers });
      setTeamMembers(teamRes.data);

    } catch (error) {
      console.error("Fetch error:", error.response || error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId, projectName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-[#F58A4B]" size={40} />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Decrypting Project Data...</p>
        </div>
      </div>
    );
  }

  if (!project) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black uppercase text-slate-400">
      Project Instance Not Found
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans pb-20">
      <Navbar hideLogin={true} />

      <main className="max-w-[1400px] mx-auto px-6 md:px-10 pt-8 space-y-8">
        
        {/* Navigation */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mb-4 hover:text-[#f5914e] transition-all group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> BACK TO {decodeURIComponent(clientName).toUpperCase()}
        </button>

        {/* HERO SECTION */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-slate-50 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start gap-12">
            <div className="space-y-6 max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-emerald-50 text-emerald-600 border-emerald-100">
                  {project.status || 'ACTIVE'}
                </span>
                <p className="text-[#f5914e] font-black flex items-center gap-2 text-xs uppercase tracking-widest">
                  <Briefcase size={16} /> {decodeURIComponent(clientName)}
                </p>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                {project.name}
              </h1>
              
              <p className="text-slate-500 font-medium text-lg leading-relaxed border-l-4 border-[#F58A4B] pl-6">
                {project.description || "Project environment initialized. Awaiting detailed scope documentation for this specific instance."}
              </p>
            </div>

            <div className="w-full lg:w-80 space-y-5 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Overall <br/> Completion</span>
                <span className="text-4xl font-black text-slate-900">{project.overall_progress || 0}%</span>
              </div>
              <div className="w-full bg-white h-3 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#f5914e] transition-all duration-1000 ease-out" 
                  style={{ width: `${project.overall_progress || 0}%` }} 
                />
              </div>
              <div className="pt-2 flex items-center gap-2 text-emerald-600 font-bold text-[10px] uppercase tracking-tighter">
                <CheckCircle2 size={14}/> System Health: Operational
              </div>
            </div>
          </div>
        </div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Timeline Tracking */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm h-full">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-10 flex items-center gap-2">
                <CalendarIcon className="text-[#f5914e]" size={16} /> Timeline Protocol
              </h3>
              
              <div className="space-y-10 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                <div className="relative pl-14">
                  <div className="absolute left-0 top-0.5 w-10 h-10 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center">
                    <Calendar size={16} className="text-slate-400" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initialization</p>
                  <p className="text-base font-extrabold text-slate-900 mt-1">{project.start_date || 'N/A'}</p>
                </div>
                
                <div className="relative pl-14">
                  <div className="absolute left-0 top-0.5 w-10 h-10 bg-white border-2 border-[#f5914e] rounded-2xl flex items-center justify-center">
                    <Clock size={16} className="text-[#f5914e]" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Deadline</p>
                  <p className="text-base font-extrabold text-slate-900 mt-1">{project.end_date || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stakeholder Directory */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-sm h-full">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-10 flex items-center gap-2 pb-4 border-b border-slate-50">
                <Users className="text-[#f5914e]" size={18} /> Management Directory
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Leads */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Strategic Leads</h4>
                  <div className="bg-slate-50 p-5 rounded-2xl flex items-center gap-4 border border-slate-100">
                    <div className="w-12 h-12 bg-slate-900 text-[#f5914e] rounded-2xl flex items-center justify-center font-black">
                      S
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Internal SGM</p>
                      <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{project.assigned_sgm_email || 'Not Assigned'}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl flex items-center gap-4 border border-slate-100">
                    <div className="w-12 h-12 bg-[#f5914e] text-white rounded-2xl flex items-center justify-center font-black">
                      E
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">External Lead</p>
                      <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{project.external_lead_email || 'Not Assigned'}</p>
                    </div>
                  </div>
                </div>

                {/* Provisioned Team */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">External Team Access</h4>
                  <div className="space-y-3">
                    {teamMembers.length > 0 ? (
                      teamMembers.map((member, i) => (
                        <div key={i} className="flex items-center justify-between p-3.5 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-black group-hover:bg-slate-900 group-hover:text-[#F58A4B] transition-colors">
                              {member.username?.[0].toUpperCase()}
                            </div>
                            <p className="text-[12px] font-extrabold text-slate-800 uppercase tracking-tighter">{member.username}</p>
                          </div>
                          <ShieldCheck size={14} className="text-emerald-500" />
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] font-bold text-slate-300 italic uppercase">No external members provisioned</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-12 pt-8 border-t border-slate-50 flex flex-wrap gap-4">
                 <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#f5914e] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3">
                    <Edit3 size={18} /> Update Instance
                 </button>
                 <button className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
                    <Share2 size={18} /> Export Data
                 </button>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}