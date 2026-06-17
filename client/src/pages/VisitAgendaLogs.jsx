import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { SkeletonListItem } from "../components/SkeletonLoader";
import Sidebar from "../components/Sidebar";
import api from "../api";

const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return dateValue;
    return `${day}-${month}-${year}`;
};

const VisitAgendaLogs = () => {
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
                    api.get(`/visit-agenda/clients/${clientId}/logs/`),
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
        <div className="h-screen w-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
                <div className="max-w-[1500px] mx-auto space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/visitagenda')}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 text-slate-500 hover:text-slate-900"
                            >
                                <ArrowLeft size={18} />
                                <span className="text-xs font-bold">Back</span>
                            </button>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Visit Log</p>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{companyName}</h1>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/visitagenda/${clientId}`)}
                            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                        >
                            Open New Visit Agenda
                        </button>
                    </div>

                    {loading && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-3">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Saved Visits</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {Array.from({ length: 6 }).map((_, idx) => (
                                    <SkeletonListItem key={idx} />
                                ))}
                            </div>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 space-y-3">
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Saved Visits</h2>

                            {logs.length === 0 && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                                    No visit logs found yet.
                                </div>
                            )}

                            {logs.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {logs.map((log) => (
                                        <button
                                            key={log.id}
                                            onClick={() => navigate(`/visitagenda/${clientId}/logs/${log.id}`)}
                                            className="w-full text-left rounded-xl border px-4 py-3 transition-all border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                        >
                                            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Visit Date</p>
                                            <p className="text-base font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                                                <CalendarDays size={16} className="text-blue-600" />
                                                {formatDate(log.visit_date)}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default VisitAgendaLogs;
