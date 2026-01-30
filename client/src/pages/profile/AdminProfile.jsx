import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import api from '../../api'; // Import your api instance
import { 
  Users, Briefcase, LayoutGrid, UserPlus, 
  ChevronRight, Globe, ShieldCheck, Mail 
} from 'lucide-react';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [employeeCount, setEmployeeCount] = useState(0); // State for dynamic count
  const [adminData, setAdminData] = useState({
    name: "Admin User",
    email: "admin@system.com",
    role: "ADMIN"
  });

  useEffect(() => {
    // 1. Existing Profile Logic
    const storedEmail = localStorage.getItem('email') || "";
    const storedRole = localStorage.getItem('role') || "ADMIN";
    
    if (storedEmail) {
      const namePart = storedEmail.split('.')[0];
      setAdminData({
        name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
        email: storedEmail,
        role: storedRole
      });
    }

    // 2. Fetch Total Employees Logic
    const fetchEmployeeCount = async () => {
      try {
        const response = await api.get("admin/users/");
        const allUsers = response.data; // Assuming backend returns an array of user objects
        
        // Filter roles: SGM, HQEPL, EMPLOYEE (Case insensitive check)
        const validRoles = ['SGM', 'HQEPL', 'EMPLOYEE'];
        const filteredUsers = allUsers.filter(user => 
          validRoles.includes(user.role?.toUpperCase())
        );

        setEmployeeCount(filteredUsers.length);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      }
    };

    fetchEmployeeCount();
  }, []);

  const actionStats = [
    { 
      label: "Main Interface", 
      value: "Admin Dashboard", 
      icon: <LayoutGrid size={24} />, 
      path: "/admin/dashboard",
      color: "bg-slate-900" 
    },
    { 
      label: "User Management", 
      value: "Create New User", 
      icon: <UserPlus size={24} />, 
      path: "/admin/createuser",
      color: "bg-[#F58A4B]" 
    },
  ];

  // Dynamically use employeeCount here
  const metrics = [
    { 
      label: "Total Employees", 
      value: employeeCount.toString(), 
      icon: <Users size={20} />, 
      color: "text-slate-900", 
      bg: "bg-slate-100" 
    },
    { label: "Total Projects", value: "42", icon: <Briefcase size={20} />, color: "text-[#F58A4B]", bg: "bg-orange-50" },
    { label: "Total Clients", value: "18", icon: <Globe size={20} />, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans">
      <Navbar hideLogin={true} />

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        
        {/* ACTION CARDS (Top) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {actionStats.map((action, index) => (
            <button 
              key={index}
              onClick={() => navigate(action.path)}
              className={`${action.color} p-8 rounded-3xl text-white flex items-center justify-between group transition-all hover:shadow-2xl hover:-translate-y-1`}
            >
              <div className="flex items-center gap-6">
                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                  {action.icon}
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-bold uppercase tracking-widest opacity-70">{action.label}</p>
                  <h2 className="text-2xl font-bold mt-1">{action.value}</h2>
                </div>
              </div>
              <ChevronRight className="opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
            </button>
          ))}
        </div>

        {/* PROFILE & METRICS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-sm flex flex-col md:flex-row items-center gap-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-[#F58A4B] rounded-full translate-x-1 translate-y-1 opacity-20"></div>
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256" 
                alt="Admin" 
                className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white object-cover shadow-xl"
              />
            </div>

            <div className="flex-1 text-center md:text-left z-10">
              <span className="bg-[#F58A4B] text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-lg">
                {adminData.role}
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mt-4">
                {adminData.name}
              </h1>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-center md:justify-start gap-2 text-slate-500">
                  <Mail size={16} className="text-[#F58A4B]" />
                  <span className="font-medium">{adminData.email}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            {metrics.map((metric, index) => (
              <div 
                key={index} 
                className="bg-white border border-slate-100 p-6 rounded-[1.5rem] shadow-sm flex items-center gap-5 hover:border-[#F58A4B]/40 transition-all group"
              >
                <div className={`w-12 h-12 ${metric.bg} ${metric.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  {metric.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{metric.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminProfile;