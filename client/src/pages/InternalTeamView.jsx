import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import api from '../api';
import { PageHeader, Band, Bands } from '../components/kayaara/Band';

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
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Internal"
          accent="Team Members"
          subtitle="Click to view performance & tasks"
          backTo={`/clients/${clientId}`}
        />

        <main className="flex-1 overflow-y-auto k-scroll">
          <Bands>
            <Band tone="grey">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="k-skeleton h-[84px]" />
                  ))}
                </div>
              ) : internalTeam.length === 0 ? (
                <div className="k-card flex flex-col items-center justify-center py-16 text-center gap-3">
                  <Users size={40} style={{ color: 'var(--k-grey-300)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-500)' }}>
                    No internal team members assigned
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {internalTeam.map((member, index) => (
                    <motion.button
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -3 }}
                      onClick={() => handleMemberClick(member)}
                      className="k-card p-5 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0"
                          style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                        >
                          {(member.full_name || member.username)?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--k-ink)' }}>
                            {member.full_name || member.username}
                          </h3>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--k-grey-500)' }}>
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </Band>
          </Bands>
        </main>
      </div>
    </div>
  );
}
