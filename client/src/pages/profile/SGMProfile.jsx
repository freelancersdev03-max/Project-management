import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../api'; // Assuming you use the api instance we set up
import { 
  Users, Briefcase, Box, Eye, LayoutGrid, 
  Target, ChevronRight, Mail, ShieldCheck, UserPlus, TrendingUp
} from 'lucide-react';

const SGMProfile = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [userProfile, setUserProfile] = useState({
    name: "SGM User",
    email: "",
    role: "Senior General Manager"
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("access_token");
        
        // 1. Profile Setup
        const storedEmail = localStorage.getItem("email") || "";
        const storedRole = localStorage.getItem("role") || "SGM";
        if (storedEmail) {
          const namePart = storedEmail.split('.')[0];
          setUserProfile({
            name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
            email: storedEmail,
            role: storedRole === "SGM" ? "Senior General Manager" : storedRole
          });
        }

        // 2. Parallel API calls to your new endpoints
        const [projectsRes, employeesRes] = await Promise.all([
          api.get("sgm/projects/"),
          api.get("sgm/employees/")
        ]);

        setProjects(projectsRes.data);
        setEmployees(employeesRes.data);
      } catch (err) {
        console.error("Dashboard Load Error:", err);
        setError("Failed to synchronize with central server.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Function to handle team assignment (logic for your assign-team/ endpoint)
  const handleAssignTeam = (projectId) => {
    // This would typically open a modal to select employees and then:
    // api.post(`sgm/projects/${projectId}/assign-team/`, { employee_ids: [...] })
    navigate(`/clients`);
  };

  const sgmStats = [
    { label: "Active Fleet", value: `${projects.length} Projects`, icon: <Briefcase size={20} />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Workforce", value: `${employees.length} Staff`, icon: <Users size={20} />, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Efficiency", value: "98%", icon: <Target size={20} />, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans">
      <Navbar hideLogin={true} />

      <main className="max-w-[1600px] mx-auto px-6 md:px-10 py-8 space-y-10 animate-in fade-in duration-700">
        
        {/* 1. EXECUTIVE OVERVIEW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sgmStats.map((stat, index) => (
            <div key={index} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}>
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* 2. SGM IDENTITY CARD */}
        <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#F58A4B] rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="relative shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=256" 
                alt="SGM" 
                className="w-40 h-40 rounded-full border-4 border-white/10 object-cover shadow-2xl"
              />
              <div className="absolute bottom-4 right-4 bg-emerald-500 w-5 h-5 rounded-full border-4 border-slate-900 shadow-lg animate-pulse"></div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <span className="bg-[#F58A4B] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg">
                {userProfile.role}
              </span>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase italic mt-4">
                {userProfile.name}
              </h1>
              <div className="mt-4 flex items-center justify-center md:justify-start gap-4 text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-[#F58A4B]" />
                  <span className="text-sm font-bold">{userProfile.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span className="text-xs uppercase font-black tracking-tighter">Verified Lead</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* 3. ASSIGNED PROJECTS (LEFT - 8 COLS) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <Briefcase className="text-[#F58A4B]" /> Project Portfolio
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {loading ? (
                [1, 2].map(i => <div key={i} className="h-40 bg-white border border-slate-100 animate-pulse rounded-[2rem]" />)
              ) : projects.map((project) => (
                <div key={project.id} className="bg-white border border-slate-200 rounded-[2rem] p-6 hover:shadow-xl transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-[#F58A4B] transition-colors">
                      {project.name}
                    </h3>
                    <span className="text-[9px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">
                      ID: {project.id}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-50">
                    <button 
                      onClick={() => handleAssignTeam(project.id)}
                      className="flex items-center gap-2 text-[10px] font-black text-[#F58A4B] uppercase tracking-widest hover:translate-x-1 transition-transform"
                    >
                      <UserPlus size={14} /> Assign Team
                    </button>
                    <button 
                      onClick={() => navigate(`/clients/${project.name}/`)}
                      className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-[#F58A4B] group-hover:text-white transition-all"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. TEAM MEMBERS (RIGHT - 4 COLS) */}
          <div className="lg:col-span-4 space-y-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <TrendingUp className="text-purple-600" /> Team Performance
            </h2>
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm divide-y divide-slate-50">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-xl mb-4" />)
              ) : employees.map((emp) => (
                <div key={emp.id} className="py-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-black text-sm">
                      {emp.username?.[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{emp.username}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.role}</p>
                    </div>
                  </div>
                  <div className="text-emerald-500">
                    <Target size={16} />
                  </div>
                </div>
              ))}
              <button className="w-full mt-6 py-4 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                View Full Team Directory
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default SGMProfile;