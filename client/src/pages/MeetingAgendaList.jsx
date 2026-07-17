import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Mail, Phone, ArrowRight, History, Video } from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import { PageHeader, Band } from "../components/kayaara/Band";

const MeetingAgendaList = () => {
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                setLoading(true);
                setError(null);

                const role = (localStorage.getItem("role") || "").toUpperCase();
                let endpoint = "clients/list/";

                if (role === "SGM") endpoint = "sgm/clients/";
                if (role === "EMPLOYEE") endpoint = "employees/clients/";

                const response = await api.get(endpoint);
                setClients(Array.isArray(response.data) ? response.data : []);
            } catch (err) {
                console.error("Meeting Agenda list load error:", err);
                setError("Unable to load assigned companies.");
            } finally {
                setLoading(false);
            }
        };

        fetchClients();
    }, []);

    return (
        <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <PageHeader title="Meeting" accent="Agenda" subtitle="Assigned companies" />

                <main className="flex-1 overflow-y-auto k-scroll">
                    <Band tone="grey">
                        {loading && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                                {Array.from({ length: 6 }).map((_, idx) => (
                                    <div key={idx} className="k-skeleton h-[200px]" />
                                ))}
                            </div>
                        )}

                        {error && (
                            <div className="k-card-static px-4 py-3 text-sm font-semibold" style={{ color: "var(--k-ink)", borderColor: "var(--k-grey-200)" }}>
                                {error}
                            </div>
                        )}

                        {!loading && !error && clients.length === 0 && (
                            <div className="k-card flex flex-col items-center justify-center text-center py-14 px-6">
                                <img src="/kayaara-mark.png" alt="" className="w-12 h-12 opacity-70 mb-3" />
                                <p className="text-sm font-semibold" style={{ color: "var(--k-ink)" }}>No assigned companies found</p>
                                <p className="text-xs mt-1" style={{ color: "var(--k-grey-500)" }}>
                                    Companies assigned to your account will appear here.
                                </p>
                            </div>
                        )}

                        {!loading && !error && clients.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                                {clients.map((client, index) => (
                                    <motion.div
                                        key={client.id}
                                        initial={{ opacity: 0, y: 24 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
                                        className="k-card p-6 flex flex-col gap-5"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                                                style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}
                                            >
                                                <Building2 size={20} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="k-eyebrow">Company</p>
                                                <h2 className="text-xl font-bold mt-1" style={{ color: "var(--k-ink)" }}>
                                                    {client.company_name || "Unnamed Company"}
                                                </h2>
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm" style={{ color: "var(--k-grey-700)" }}>
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} style={{ color: "var(--k-grey-500)" }} />
                                                <span>{client.contact_email || client.email || "No email"}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} style={{ color: "var(--k-grey-500)" }} />
                                                <span>{client.phone || "No phone"}</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto grid grid-cols-3 gap-3">
                                            <button
                                                onClick={() => navigate(`/meetingagenda/${client.id}`)}
                                                className="k-btn-primary w-full flex items-center justify-center gap-2 text-xs"
                                            >
                                                Meeting Agenda
                                                <ArrowRight size={16} />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/meetingagenda/${client.id}/logs`)}
                                                className="k-btn-ghost w-full flex items-center justify-center gap-2 text-xs"
                                            >
                                                MOM
                                                <History size={16} />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/meetingagenda/${client.id}/meeting`)}
                                                className="k-btn-primary w-full flex items-center justify-center gap-2 text-xs"
                                                style={{ background: "#22c55e", borderColor: "#22c55e" }}
                                            >
                                                <Video size={16} />
                                                Start Meeting
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </Band>
                </main>
            </div>
        </div>
    );
};

export default MeetingAgendaList;
