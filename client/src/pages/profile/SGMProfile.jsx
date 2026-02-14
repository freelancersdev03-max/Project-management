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
        const [projectsRes, employeesRes, meRes] = await Promise.all([
          api.get("sgm/projects/"),
          api.get("sgm/employees/"),
          api.get("me/")
        ]);

        const meData = meRes.data;
        let displayName = meData.username;
        if (meData.first_name || meData.last_name) {
          displayName = `${meData.first_name} ${meData.last_name}`.trim();
        } else if (meData.email) {
          const namePart = meData.email.split('.')[0];
          displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }

        setUserProfile({
          name: displayName,
          email: meData.email,
          role: meData.role === "SGM" ? "Senior General Manager" : meData.role
        });

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
    { label: "Task Manage", value: "Dashboard", icon: <LayoutGrid size={20} />, color: "text-blue-600", bg: "bg-blue-50", path: "/employeedashboard" },
    { label: "Clients / Project", value: "Portfolio", icon: <Briefcase size={20} />, color: "text-purple-600", bg: "bg-purple-50", path: "/clients" },
    { label: "KPI Performance", value: "Metrics", icon: <Target size={20} />, color: "text-emerald-600", bg: "bg-emerald-50", path: "/weekly-score" },
    { label: "DDTME Approval", value: "Review", icon: <Box size={20} />, color: "text-orange-600", bg: "bg-orange-50", path: "/ddtme" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans">
      <Navbar hideLogin={true} />

      <main className="max-w-[1600px] mx-auto px-6 md:px-10 py-8 space-y-10 animate-in fade-in duration-700">

        {/* 1. EXECUTIVE OVERVIEW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {sgmStats.map((stat, index) => (
            <button
              key={index}
              onClick={() => navigate(stat.path)}
              className="text-left bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-xl hover:border-[#F58A4B]/30 hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-black text-slate-900 tracking-tight mt-1">{stat.value}</p>
            </button>
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


      </main>
    </div>
  );
};

export default SGMProfile;