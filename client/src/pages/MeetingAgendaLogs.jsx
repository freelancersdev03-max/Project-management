import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import { PageHeader, Band } from "../components/kayaara/Band";

const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return dateValue;
    return `${day}-${month}-${year}`;
};

const MeetingAgendaLogs = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();

    const [companyName, setCompanyName] = useState("Company");
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadClientAndLogs = async () => {
            if (!clientId) return;
            try {
                setLoading(true);
                setError("");

                const [clientRes, logsRes] = await Promise.all([
                    api.get(`/clients/${clientId}/`),
                    api.get(`/meeting-agenda/clients/${clientId}/logs/`),
                ]);

                setCompanyName(clientRes.data?.company_name || "Company");
                const logEntries = Array.isArray(logsRes.data) ? logsRes.data : [];
                setLogs(logEntries);
            } catch (err) {
                console.error("Failed to load visit logs:", err);
                setError("Unable to load visit log data.");
            } finally {
                setLoading(false);
            }
        };

        loadClientAndLogs();
    }, [clientId]);

    return (
        <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <PageHeader
                    title="Visit"
                    accent="Log"
                    subtitle={companyName}
                    backTo="/meetingagenda"
                    actions={
                        <button
                            onClick={() => navigate(`/meetingagenda/${clientId}`)}
                            className="k-btn-primary text-xs"
                        >
                            Open New Meeting Agenda
                        </button>
                    }
                />

                <main className="flex-1 overflow-y-auto k-scroll">
                    <Band tone="grey" title="Saved visits">
                        {loading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {Array.from({ length: 6 }).map((_, idx) => (
                                    <div key={idx} className="k-skeleton h-[64px]" />
                                ))}
                            </div>
                        )}

                        {!loading && error && (
                            <div className="k-card-static px-4 py-3 text-sm font-semibold" style={{ color: "var(--k-ink)" }}>
                                {error}
                            </div>
                        )}

                        {!loading && !error && (
                            <>
                                {logs.length === 0 && (
                                    <div className="k-card flex flex-col items-center justify-center text-center py-14 px-6">
                                        <img src="/kayaara-mark.png" alt="" className="w-12 h-12 opacity-70 mb-3" />
                                        <p className="text-sm font-semibold" style={{ color: "var(--k-ink)" }}>No visit logs found yet</p>
                                        <p className="text-xs mt-1" style={{ color: "var(--k-grey-500)" }}>
                                            Saved visits for {companyName} will appear here.
                                        </p>
                                    </div>
                                )}

                                {logs.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {logs.map((log, index) => (
                                            <motion.button
                                                key={log.id}
                                                initial={{ opacity: 0, y: 16 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                                onClick={() => navigate(`/meetingagenda/${clientId}/logs/${log.id}`)}
                                                className="k-card w-full text-left px-4 py-3"
                                            >
                                                <p className="k-eyebrow">Visit Date</p>
                                                <p className="text-base font-bold mt-1 flex items-center gap-2" style={{ color: "var(--k-ink)" }}>
                                                    <CalendarDays size={16} style={{ color: "var(--k-blue)" }} />
                                                    {formatDate(log.visit_date)}
                                                </p>
                                            </motion.button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </Band>
                </main>
            </div>
        </div>
    );
};

export default MeetingAgendaLogs;
