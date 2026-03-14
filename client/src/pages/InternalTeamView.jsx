import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import api from '../api';

export default function InternalTeamView() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [internalTeam, setInternalTeam] = useState([]);

  const fetchInternalTeam = async () => {
    try {
      const response = await api.get(`clients/${clientId}/`);
      const teamData = response.data.internal_team_details || [];
      console.log("Internal Team Data:", teamData);
      if (teamData.length > 0) {
        console.log("First Team Member:", teamData[0]);
        teamData.forEach((m, idx) => {
          console.log(`Member ${idx}:`, m.id, m.full_name, m.username);
        });
      }
      setInternalTeam(teamData);
    } catch (error) {
      console.error("Failed to fetch internal team:", error);
      setInternalTeam([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInternalTeam();
  }, [clientId]);

  const handleMemberClick = (member) => {
    // Navigate to full EmployeeDashboard for that member
    console.log("====== NAVIGATING TO MEMBER DASHBOARD ======");
    console.log("Clicked member:", member);
    console.log("Member ID:", member.id);
    console.log("Member Name:", member.full_name);
    const newUrl = `/employeedashboard?member=${member.id}`;
    console.log("Navigating to URL:", newUrl);
    navigate(newUrl);
  };

  return (
    <div className="flex bg-slate-50 min-h-screen antialiased">
      <Sidebar />

      <div className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-6">
          <button
            onClick={() => navigate(`/clients/${clientId}`)}
            className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-[#F58A4B] mb-6"
          >
            <ChevronLeft size={14} /> Back to Dashboard
          </button>

          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
            Internal <span className="text-[#F58A4B]">Team Members</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm flex items-center gap-2 mb-12">
            <Users size={16} /> Click to view performance & tasks
          </p>

          {loading ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-slate-400 font-bold uppercase">Loading...</p>
            </div>
          ) : internalTeam.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-dashed border-slate-300 p-16 text-center">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-wider">
                No internal team members assigned
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {internalTeam.map(member => (
                <button
                  key={member.id}
                  onClick={() => handleMemberClick(member)}
                  className="p-6 bg-white rounded-[2rem] border border-slate-200 hover:border-[#F58A4B] hover:shadow-lg transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#F58A4B]/10 flex items-center justify-center font-black text-[#F58A4B] text-lg group-hover:bg-[#F58A4B] group-hover:text-white transition-all">
                      {(member.full_name || member.username)?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black text-slate-900 group-hover:text-[#F58A4B] transition-colors truncate">
                        {member.full_name || member.username}
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-1 truncate">{member.email}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
