import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../api";

const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return dateValue;
    return `${day}-${month}-${year}`;
};

const VisitAgendaLogDetail = () => {
    const { clientId, logId } = useParams();
    const navigate = useNavigate();

    const [companyName, setCompanyName] = useState("Company");
    const [logData, setLogData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const loadDetail = async () => {
            if (!clientId || !logId) return;
            try {
                setLoading(true);
                setError("");

                const [clientRes, logRes] = await Promise.all([
                    api.get(`/clients/${clientId}/`),
                    api.get(`/visit-agenda/clients/${clientId}/logs/${logId}/`),
                ]);

                setCompanyName(clientRes.data?.company_name || "Company");
                setLogData(logRes.data || null);
            } catch (err) {
                console.error("Failed to load visit log detail:", err);
                setError("Unable to load saved visit table.");
            } finally {
                setLoading(false);
            }
        };

        loadDetail();
    }, [clientId, logId]);

    const rows = useMemo(() => {
        if (!Array.isArray(logData?.items)) return [];
        return [...logData.items].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [logData]);

    return (
        <div className="h-screen w-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
                <div className="max-w-[1500px] mx-auto space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(`/visitagenda/${clientId}/logs`)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 text-slate-500 hover:text-slate-900"
                            >
                                <ArrowLeft size={18} />
                                <span className="text-xs font-bold">Back</span>
                            </button>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Saved Visit</p>
                                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{companyName}</h1>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Visit Date</p>
                            <p className="text-xl font-black text-slate-900">{formatDate(logData?.visit_date)}</p>
                        </div>
                    </div>

                    {loading && (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                <div>
                                    <div className="h-3 bg-slate-200 w-24 rounded" />
                                    <div className="h-5 bg-slate-200 w-32 rounded mt-1" />
                                </div>
                                <div className="h-5 w-5 bg-slate-200 rounded" />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[980px]">
                                    <thead>
                                        <tr className="bg-[#4f7fb3] text-white text-xs uppercase tracking-wider text-left">
                                            <th className="p-4 w-16 text-center font-bold border-r border-white/30">Sr. No.</th>
                                            <th className="p-4 w-1/5 font-bold border-r border-white/30">Activity</th>
                                            <th className="p-4 w-32 font-bold border-r border-white/30">Tentative Time</th>
                                            <th className="p-4 w-1/5 font-bold border-r border-white/30">Output</th>
                                            <th className="p-4 w-40 font-bold border-r border-white/30">Required Team Members</th>
                                            <th className="p-4 w-1/5 font-bold border-r border-white/30">HQEPL Representative</th>
                                            <th className="p-4 font-bold">Tasks to be completed by Team Prior to Visit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-[#eef4fb]">
                                        {Array.from({ length: 4 }).map((_, idx) => (
                                            <tr key={idx} className={idx % 2 === 0 ? "bg-[#dbe7f4]" : "bg-[#eef4fb]"}>
                                                <td className="p-3 text-center border-r border-slate-100"><div className="h-4 bg-slate-200 w-4 rounded mx-auto" /></td>
                                                <td className="p-3 border-r border-slate-100"><div className="h-4 bg-slate-200 w-full rounded" /></td>
                                                <td className="p-3 border-r border-slate-100"><div className="h-4 bg-slate-200 w-12 rounded mx-auto" /></td>
                                                <td className="p-3 border-r border-slate-100"><div className="h-4 bg-slate-200 w-full rounded" /></td>
                                                <td className="p-3 border-r border-slate-100"><div className="h-4 bg-slate-200 w-full rounded" /></td>
                                                <td className="p-3 border-r border-slate-100"><div className="h-4 bg-slate-200 w-full rounded" /></td>
                                                <td className="p-3"><div className="h-4 bg-slate-200 w-full rounded" /></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                            {error}
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Saved Visit Table</p>
                                    <h3 className="text-lg font-black text-slate-900">{formatDate(logData?.visit_date)}</h3>
                                </div>
                                <FileText size={20} className="text-slate-400" />
                            </div>

                            {rows.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[980px]">
                                        <thead>
                                            <tr className="bg-[#4f7fb3] text-white text-xs uppercase tracking-wider text-left">
                                                <th className="p-4 w-16 text-center font-bold border-r border-white/30">Sr. No.</th>
                                                <th className="p-4 w-1/5 font-bold border-r border-white/30">Activity</th>
                                                <th className="p-4 w-32 font-bold border-r border-white/30">Tentative Time</th>
                                                <th className="p-4 w-1/5 font-bold border-r border-white/30">Output</th>
                                                <th className="p-4 w-40 font-bold border-r border-white/30">Required Team Members</th>
                                                <th className="p-4 w-1/5 font-bold border-r border-white/30">HQEPL Representative</th>
                                                <th className="p-4 font-bold">Tasks to be completed by Team Prior to Visit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {rows.map((row, index) => {
                                                const repNames = Array.isArray(row.hqepl_rep_names) ? row.hqepl_rep_names.join(", ") : "";
                                                return (
                                                    <tr
                                                        key={`${row.order || index}-${index}`}
                                                        className={index % 2 === 0 ? "bg-[#dbe7f4]" : "bg-[#eef4fb]"}
                                                    >
                                                        <td className="p-3 text-center font-bold text-slate-600 border-r border-slate-100">{row.order || index + 1}</td>
                                                        <td className="p-3 text-sm text-slate-700 border-r border-slate-100 whitespace-pre-wrap">{row.activity || "-"}</td>
                                                        <td className="p-3 text-sm text-slate-700 border-r border-slate-100 whitespace-pre-wrap">
                                                            {(row.start_time || "--:--") + "\n" + (row.end_time || "--:--")}
                                                        </td>
                                                        <td className="p-3 text-sm text-slate-700 border-r border-slate-100 whitespace-pre-wrap">{row.output || "-"}</td>
                                                        <td className="p-3 text-sm text-slate-700 border-r border-slate-100 whitespace-pre-wrap">{row.team_members || "-"}</td>
                                                        <td className="p-3 text-sm text-slate-700 border-r border-slate-100 whitespace-pre-wrap">{repNames || "-"}</td>
                                                        <td className="p-3 text-sm text-slate-700 whitespace-pre-wrap">{row.prior_tasks || "-"}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-sm text-slate-500 font-semibold">
                                    No saved rows found for this visit date.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default VisitAgendaLogDetail;
