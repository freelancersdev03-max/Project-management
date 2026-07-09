import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText } from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import { PageHeader, Band } from "../components/kayaara/Band";

const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return dateValue;
    return `${day}-${month}-${year}`;
};

const VisitAgendaLogDetail = () => {
    const { clientId, logId } = useParams();

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

    const tableHeaders = [
        "Sr. No.",
        "Activity",
        "Tentative Time",
        "Output",
        "Required Team Members",
        "KAYAARA Representative",
        "Tasks to be completed by Team Prior to Visit",
    ];

    return (
        <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <PageHeader
                    title="Saved"
                    accent="Visit"
                    subtitle={companyName}
                    backTo={`/visitagenda/${clientId}/logs`}
                    actions={
                        <div className="text-right">
                            <p className="k-eyebrow">Visit Date</p>
                            <p className="text-base font-bold" style={{ color: "var(--k-ink)" }}>{formatDate(logData?.visit_date)}</p>
                        </div>
                    }
                />

                <main className="flex-1 overflow-y-auto k-scroll">
                    <Band tone="grey">
                        {loading && (
                            <div className="k-card overflow-hidden">
                                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--k-grey-200)", background: "var(--k-band-grey)" }}>
                                    <div className="space-y-2">
                                        <div className="k-skeleton h-3 w-24" />
                                        <div className="k-skeleton h-5 w-32" />
                                    </div>
                                    <div className="k-skeleton h-5 w-5" />
                                </div>
                                <div className="p-4 space-y-3">
                                    {Array.from({ length: 4 }).map((_, idx) => (
                                        <div key={idx} className="k-skeleton h-10 w-full" />
                                    ))}
                                </div>
                            </div>
                        )}

                        {!loading && error && (
                            <div className="k-card-static px-4 py-3 text-sm font-semibold" style={{ color: "var(--k-ink)" }}>
                                {error}
                            </div>
                        )}

                        {!loading && !error && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                className="k-card overflow-hidden"
                            >
                                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--k-grey-200)", background: "var(--k-band-grey)" }}>
                                    <div>
                                        <p className="k-eyebrow">Saved Visit Table</p>
                                        <h3 className="text-lg font-bold" style={{ color: "var(--k-ink)" }}>{formatDate(logData?.visit_date)}</h3>
                                    </div>
                                    <FileText size={20} style={{ color: "var(--k-grey-500)" }} />
                                </div>

                                {rows.length > 0 ? (
                                    <div className="overflow-x-auto k-scroll">
                                        <table className="k-table w-full min-w-[980px]">
                                            <thead>
                                                <tr>
                                                    <th className="text-center w-16">{tableHeaders[0]}</th>
                                                    <th className="w-1/5">{tableHeaders[1]}</th>
                                                    <th className="w-32">{tableHeaders[2]}</th>
                                                    <th className="w-1/5">{tableHeaders[3]}</th>
                                                    <th className="w-40">{tableHeaders[4]}</th>
                                                    <th className="w-1/5">{tableHeaders[5]}</th>
                                                    <th>{tableHeaders[6]}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((row, index) => {
                                                    const repNames = Array.isArray(row.kayaara_rep_names) ? row.kayaara_rep_names.join(", ") : "";
                                                    return (
                                                        <motion.tr
                                                            key={`${row.order || index}-${index}`}
                                                            initial={{ opacity: 0, y: 12 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.05, duration: 0.4 }}
                                                        >
                                                            <td className="text-center font-semibold whitespace-pre-wrap" style={{ color: "var(--k-ink)" }}>{row.order || index + 1}</td>
                                                            <td className="whitespace-pre-wrap">{row.activity || "-"}</td>
                                                            <td className="whitespace-pre-wrap">
                                                                {(row.start_time || "--:--") + "\n" + (row.end_time || "--:--")}
                                                            </td>
                                                            <td className="whitespace-pre-wrap">{row.output || "-"}</td>
                                                            <td className="whitespace-pre-wrap">{row.team_members || "-"}</td>
                                                            <td className="whitespace-pre-wrap">{repNames || "-"}</td>
                                                            <td className="whitespace-pre-wrap">{row.prior_tasks || "-"}</td>
                                                        </motion.tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-sm font-semibold" style={{ color: "var(--k-grey-500)" }}>
                                        No saved rows found for this visit date.
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </Band>
                </main>
            </div>
        </div>
    );
};

export default VisitAgendaLogDetail;
