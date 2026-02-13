import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, CheckCircle, MapPin, Calendar,
  Mail, Phone, Globe, ShieldCheck, CreditCard,
  LayoutDashboard, Edit3, TrendingUp
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import api from '../../api';

// Placeholder Logo (Replace if you have a real one)
const COMPANY_LOGO = "/HqeplLOGO.png"; // Ensure this path is correct or use a fallback

const HQEPLProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    clients: 0,
    employees: 0,
    projects: 0
  });

  const [adminProfile, setAdminProfile] = useState({
    name: "System Admin",
    email: "admin@hqepl.com",
    joined: "2024-01-12",
    role: "ENTERPRISE"
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Real Counts (Parallel Calls with individual error handling)
        const fetchStats = async () => {
          let clientCount = 0;
          let employeeCount = 0;
          let projectCount = 0;

          try {
            const res = await api.get('clients/list/');
            clientCount = res.data.length || 0;
          } catch (e) { console.error("Failed clients fetch", e); }

          try {
            const res = await api.get('admin/users/');
            const validRoles = ["HQEPL", "SGM", "EMPLOYEE"];
            // Filter users who match the valid roles (case-insensitive check just in case)
            const staffOnly = res.data.filter(u => validRoles.includes(u.role?.toUpperCase()));
            employeeCount = staffOnly.length || 0;
          } catch (e) { console.error("Failed users fetch", e); }

          try {
            const res = await api.get('projects/');
            projectCount = res.data.length || 0;
          } catch (e) { console.error("Failed projects fetch", e); }

          setStats({
            clients: clientCount,
            employees: employeeCount,
            projects: projectCount
          });
        };

        await fetchStats();

        // 2. Fetch Current User / Admin Details
        // 2. Fetch Administration Details
        try {
          // Try to find the specific "admin" user or fallback to current user
          const meRes = await api.get('me/');
          // If the current user is an ADMIN/HQEPL, show their details. 
          // OR fetch the list of admins. For now, showing current logged-in user if valid.
          if (meRes.data) {
            const u = meRes.data;
            setAdminProfile({
              name: u.username || "System Admin",
              email: u.email || "admin@hqepl.com",
              joined: u.date_joined || new Date().toISOString(),
              role: u.role || "ENTERPRISE"
            });
          }
        } catch (e) {
          // Fallback to local storage if API fails
          const storedEmail = localStorage.getItem('email');
          const storedRole = localStorage.getItem('role');
          if (storedEmail) {
            const namePart = storedEmail.split('.')[0];
            setAdminProfile(prev => ({
              ...prev,
              name: namePart.charAt(0).toUpperCase() + namePart.slice(1),
              email: storedEmail,
              role: storedRole || "ENTERPRISE"
            }));
          }
        }

      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 antialiased font-sans pb-20 selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar hideLogin={true} />

      <main className="max-w-[1600px] mx-auto px-6 md:px-10 pt-8 space-y-8 animate-in fade-in duration-500">

        {/* ─── 1. HEADER CARD ─── */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-32 h-32 bg-indigo-50 rounded-3xl flex items-center justify-center p-4 border border-indigo-100 shadow-inner shrink-0">
            <img src={COMPANY_LOGO} alt="HQEPL" className="w-full h-full object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }} />
            <Building2 size={40} className="text-indigo-600 hidden" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">HQEPL</h1>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                </span>
                <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-widest">
                  Parent Company
                </span>
              </div>
            </div>
            <p className="text-lg text-slate-500 font-medium">Leading Project Excellence & Hindustan Quality Engineering Private Limited</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-6 text-sm font-bold text-slate-400 pt-2">
              <span className="flex items-center gap-2"><MapPin size={16} /> Vadodara, Gujarat</span>
              <span className="flex items-center gap-2"><Calendar size={16} /> Since idk</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ─── 2. LEFT COLUMN: OFFICIAL DETAILS ─── */}
          <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm h-fit">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-8">
              <ShieldCheck className="text-indigo-600" size={20} /> Official Details
            </h3>

            <div className="space-y-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Registered Office</p>
                <p className="text-sm font-bold text-slate-600 leading-relaxed">
                  401, Sahyog Elina Above Reliance Digital <br />
                  VIP Road Karelibaugh beside Tanishq <br />
                  Karelibaugh Vadodara 390018 Gujarat
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Corporate Email</p>
                    <p className="text-sm font-bold text-slate-900">business@herequality.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Direct Line</p>
                    <p className="text-sm font-bold text-slate-900">+91 98240 11121</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                    <Globe size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Website</p>
                    <a href="https://herequality.com/" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-900">herequality.com</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl overflow-hidden h-64 bg-slate-100 relative shadow-inner border border-slate-200">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight="0"
                marginWidth="0"
                src="https://maps.google.com/maps?q=Here+Quality+Excellence+Pvt.+Ltd.,+Sahyog+Elina,+VIP+Road,+Karelibaugh,+Vadodara,+Gujarat&t=&z=16&ie=UTF8&iwloc=&output=embed"
                title="HQEPL Location"
                className="w-full h-full"
              ></iframe>
            </div>
          </div>

          {/* ─── 3. RIGHT COLUMN: SUMMARY & ADMIN ─── */}
          <div className="lg:col-span-2 space-y-8">

            {/* A. System Ownership Summary (Stats) */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-8">
                <LayoutDashboard className="text-blue-600" size={20} /> System Ownership Summary
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Clients Stat */}
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Clients</p>
                    <Users size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                  <p className="text-4xl font-black text-slate-900 mb-2">{loading ? "..." : stats.clients}</p>

                </div>

                {/* Employees Stat */}
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Employees</p>
                    <Building2 size={16} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
                  </div>
                  <p className="text-4xl font-black text-slate-900 mb-2">{loading ? "..." : stats.employees}</p>

                </div>

                {/* Projects Stat */}
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Projects</p>
                    <CheckCircle size={16} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <p className="text-4xl font-black text-slate-900 mb-2">{loading ? "..." : stats.projects}</p>

                </div>
              </div>
            </div>

            {/* B. Administration Details */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-8">
                <ShieldCheck className="text-indigo-600" size={20} /> Administration Details
              </h3>

              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white text-2xl font-black border-4 border-slate-100 shadow-lg">
                    {adminProfile.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Primary System Owner</p>
                    <h4 className="text-xl font-black text-slate-900">{adminProfile.name}</h4>
                    <p className="text-xs font-bold text-slate-400">{adminProfile.email}</p>
                  </div>
                </div>

                <div className="hidden md:block w-px h-12 bg-slate-100"></div>

                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">System Created</p>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" /> {new Date(adminProfile.joined).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="hidden md:block w-px h-12 bg-slate-100"></div>

                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">License Type</p>
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                    {adminProfile.role}
                  </span>
                </div>

                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                >
                  <Edit3 size={14} /> Manage Access
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default HQEPLProfile;