import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import {
  ArrowLeft, Mail, Globe, MapPin, Phone,
  ShieldCheck, UserCheck, Clock, Calendar,
  ExternalLink, Building2
} from 'lucide-react';
import api from '../../api';

const ClientProfile = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]); // Added to handle the employees table
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('access_token');

        let clientUrl = `clients/me/`;
        let projectsUrl = `projects/`;

        if (clientId) {
          clientUrl = `clients/${clientId}/`;
          projectsUrl = `clients/${clientId}/projects/`;
        }

        const [clientRes, projectsRes] = await Promise.all([
          api.get(clientUrl, { headers: { Authorization: `Bearer ${token}` } }),
          api.get(projectsUrl, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setClient(clientRes.data);
        setProjects(projectsRes.data);

        // Mocking employees data as logic wasn't changed, but UI needs it
        // In a real scenario, you'd fetch this from a related endpoint
        setEmployees(clientRes.data.employees || []);

      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (clientId || localStorage.getItem('access_token')) {
      fetchProfileData();
    }
  }, [clientId, navigate]);

  const projectsLoading = false; // logic simplified

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F58A4B]"></div>
    </div>
  );

  if (!client) return <div className="p-20 text-center font-bold text-slate-400">Client Profile Not Found</div>;

  return (
    <div className="min-h-screen bg-slate-50 antialiased pb-20 font-sans">
      <Navbar hideLogin={true} />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-6">

        {/* Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold text-[10px] uppercase tracking-[0.2em] transition-all group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Back to Admin Dashboard
        </button>

        {/* 1. HEADER CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
          <div className="w-28 h-28 bg-slate-900 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
            {client.logo ? (
              <img
                src={client.logo.startsWith('http') ? client.logo : `http://127.0.0.1:8000${client.logo}`}
                alt="logo"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
              />
            ) : (
              <Building2 className="text-[#F58A4B]" size={40} />
            )}
            <Building2 className="text-[#F58A4B] hidden" size={40} />
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-slate-900">{client.company_name || "Global Tech Solutions"}</h1>
              <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase px-3 py-1 rounded-full">Active</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-12">
              <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                <Mail size={16} className="text-slate-400" /> {client.contact_email}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                <Phone size={16} className="text-slate-400" /> {client.phone}
              </div>
              <div className="flex items-center gap-3 text-sm text-blue-600 font-medium hover:underline cursor-pointer">
                <Globe size={16} className="text-blue-500" /> {client.website || "www.globaltech.com"}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                <MapPin size={16} className="text-slate-400" /> {client.address || "123 Corporate Blvd, Suite 400"}
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic font-medium pt-2 border-t border-slate-50">
              Client since {new Date(client.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* 2. CLIENT EMPLOYEES TABLE */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-50 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 tracking-tight">Client Employees</h2>
            <span className="bg-slate-50 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-lg border border-slate-100">
              {employees.length} Total Members
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-50">
                <tr>
                  <th className="px-8 py-4">Employee Name</th>
                  <th className="px-8 py-4">Email</th>
                  <th className="px-8 py-4">Role</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Assigned Project</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {employees.length === 0 ? (
                  <tr><td colSpan="5" className="px-8 py-6 text-center text-slate-400 text-xs font-bold uppercase">No team members assigned</td></tr>
                ) : employees.map((emp, i) => (
                  <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-800 text-sm">{emp.name}</td>
                    <td className="px-8 py-5 text-sm text-slate-500">{emp.email}</td>
                    <td className="px-8 py-5 text-sm text-slate-500">{emp.role}</td>
                    <td className="px-8 py-5">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${emp.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-blue-600 font-semibold hover:underline cursor-pointer">{emp.project}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. CLIENT PROJECTS TABLE */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 tracking-tight">Client Projects</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 text-[10px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-50">
                <tr>
                  <th className="px-8 py-4">Project Name</th>
                  <th className="px-8 py-4">Assigned SGM</th>
                  <th className="px-8 py-4 text-center">Status</th>
                  <th className="px-8 py-4 text-right">Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {projects.length === 0 ? (
                  <tr><td colSpan="4" className="px-8 py-10 text-center text-slate-300 font-bold uppercase text-xs">No active projects</td></tr>
                ) : projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-6 font-bold text-slate-800 text-sm">{project.name || "Untitled Project"}</td>
                    <td className="px-8 py-6 text-sm text-slate-500">{project.assigned_sgm_email || "Not Assigned"}</td>
                    <td className="px-8 py-6 text-center">
                      <span className={`text-[9px] font-bold uppercase px-3 py-1.5 rounded-md ${project.status?.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                        project.status?.toLowerCase() === 'hold' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                        {project.status || "N/A"}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right text-xs text-slate-400 font-bold">
                      {project.start_date || "TBD"} - {project.end_date || "TBD"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};

export default ClientProfile;