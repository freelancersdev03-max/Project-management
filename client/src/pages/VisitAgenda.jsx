import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, Download, X, ArrowLeft } from "lucide-react";
import api from "../api";
import { resolveMediaUrl } from "../utils/media";

const VisitAgenda = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
    const [companyName, setCompanyName] = useState("Jacktech Hydraulic");
    const [hqeplOptions, setHqeplOptions] = useState([]);
    const [clientLogoUrl, setClientLogoUrl] = useState(null);
    const [agendaLoaded, setAgendaLoaded] = useState(false);
    const [modalRowIndex, setModalRowIndex] = useState(null);
    const saveTimerRef = useRef(null);

    const emptyRow = useMemo(() => ({
        id: 1,
        activity: "",
        startTime: "",
        endTime: "",
        output: "",
        teamMembers: "",
        hqeplReps: [],
        priorTasks: "",
    }), []);

    const [rows, setRows] = useState([emptyRow]);

    useEffect(() => {
        const loadClient = async () => {
            if (!clientId) return;
            try {
                const response = await api.get(`/clients/${clientId}/`);
                setCompanyName(response.data.company_name || "");
                if (response.data.logo) {
                    setClientLogoUrl(response.data.logo);
                }
            } catch (error) {
                console.error("Failed to load client:", error);
            }
        };

        loadClient();
    }, [clientId]);

    useEffect(() => {
        const loadHQEPL = async () => {
            if (!clientId) return;
            try {
                const response = await api.get(`/visit-agenda/clients/${clientId}/team/`);
                setHqeplOptions(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error("Failed to load team members:", error);
            }
        };

        loadHQEPL();
    }, [clientId]);

    useEffect(() => {
        const loadAgenda = async () => {
            if (!clientId) return;
            try {
                const response = await api.get(`/visit-agenda/clients/${clientId}/`);
                const agenda = response.data;

                if (agenda?.visit_date) {
                    setVisitDate(agenda.visit_date);
                }

                if (Array.isArray(agenda?.items) && agenda.items.length > 0) {
                    const mappedRows = agenda.items.map((item, index) => ({
                        id: index + 1,
                        activity: item.activity || "",
                        startTime: item.start_time || "",
                        endTime: item.end_time || "",
                        output: item.output || "",
                        teamMembers: item.team_members || "",
                        hqeplReps: Array.isArray(item.hqepl_reps) ? item.hqepl_reps : [],
                        priorTasks: item.prior_tasks || "",
                    }));
                    setRows(mappedRows);
                } else {
                    setRows([emptyRow]);
                }
                setAgendaLoaded(true);
            } catch (error) {
                console.error("Failed to load visit agenda:", error);
                setAgendaLoaded(true);
            }
        };

        loadAgenda();
    }, [clientId, emptyRow]);

    useEffect(() => {
        if (!agendaLoaded || !clientId) return;

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(async () => {
            try {
                await api.put(`/visit-agenda/clients/${clientId}/`, {
                    visit_date: visitDate,
                    items: rows.map((row, index) => ({
                        activity: row.activity,
                        start_time: row.startTime,
                        end_time: row.endTime,
                        output: row.output,
                        team_members: row.teamMembers,
                        hqepl_reps: Array.isArray(row.hqeplReps) ? row.hqeplReps : [],
                        prior_tasks: row.priorTasks,
                        order: index + 1,
                    })),
                });
            } catch (error) {
                console.error("Failed to auto-save visit agenda:", error);
            }
        }, 600);

        return () => clearTimeout(saveTimerRef.current);
    }, [rows, visitDate, clientId, agendaLoaded]);

    const addRow = () => {
        setRows([
            ...rows,
            {
                id: rows.length + 1,
                activity: "",
                startTime: "",
                endTime: "",
                output: "",
                teamMembers: "",
                hqeplReps: [],
                priorTasks: "",
            },
        ]);
    };

    const deleteRow = (index) => {
        const newRows = [...rows];
        newRows.splice(index, 1);
        const reindexed = newRows.map((row, i) => ({ ...row, id: i + 1 }));
        setRows(reindexed.length ? reindexed : [emptyRow]);
    };

    const updateRow = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const handleDownloadPDF = async () => {
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");

        const doc = jsPDF({ orientation: "landscape" });

        // Add Header
        doc.setFillColor(79, 127, 179); // #4f7fb3
        doc.rect(0, 0, doc.internal.pageSize.width, 40, "F");

        // HQEPL Logo (Left)
        try {
            const hqeplLogo = "/HqeplLOGO.png";
            doc.addImage(hqeplLogo, "PNG", 10, 5, 30, 30);
        } catch (e) {
            console.warn("Failed to add HQEPL logo to PDF", e);
        }

        // Client Logo (Right)
        if (clientLogoUrl) {
            try {
                doc.addImage(clientLogoUrl, "JPEG", doc.internal.pageSize.width - 40, 5, 30, 30);
            } catch (e) {
                console.warn("Failed to add client logo to PDF", e);
            }
        }

        // Title and Info
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text(companyName, doc.internal.pageSize.width / 2, 20, { align: "center" });

        doc.setFontSize(14);
        doc.text("VISIT AGENDA", doc.internal.pageSize.width / 2, 30, { align: "center" });

        doc.setFontSize(10);
        doc.text(`Visit Date: ${visitDate}`, doc.internal.pageSize.width - 15, 30, { align: "right" });

        // Table
        const tableData = rows.map(row => {
            const reps = hqeplOptions
                .filter(opt => Array.isArray(row.hqeplReps) && row.hqeplReps.includes(opt.id))
                .map(opt => opt.full_name)
                .join(", ");

            return [
                row.id,
                row.activity,
                `${row.startTime} - ${row.endTime}`,
                row.output,
                row.teamMembers,
                reps || "-",
                row.priorTasks
            ];
        });

        autoTable(doc, {
            startY: 45,
            head: [
                ["Sr. No.", "Activity", "Tentative Time", "Output", "Required Team Members", "HQEPL Rep", "Prior Tasks"]
            ],
            body: tableData,
            theme: "grid",
            headStyles: { fillColor: [79, 127, 179], textColor: [255, 255, 255], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { halign: "center", cellWidth: 15 },
                2: { cellWidth: 25 },
            }
        });

        doc.save(`Visit_Agenda_${companyName.replace(/\s+/g, "_")}_${visitDate}.pdf`);
    };

    return (
        <div className="h-screen w-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative">
                    {/* Navigation & Actions Row */}
                    <div className="flex items-center justify-between mb-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 text-slate-500 hover:text-slate-900"
                        >
                            <ArrowLeft size={18} />
                            <span className="text-xs font-bold">Back</span>
                        </button>

                        <button
                            onClick={handleDownloadPDF}
                            className="px-5 py-2.5 bg-[#4f7fb3] text-white rounded-xl shadow-lg hover:shadow-blue-200 hover:bg-blue-600 transition-all flex items-center gap-2 group"
                        >
                            <Download size={18} className="group-hover:scale-110 transition-transform" />
                            <span className="text-xs font-black uppercase tracking-wider">Download PDF</span>
                        </button>
                    </div>

                    {/* Main Header Content */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 border-t border-slate-50 pt-8">
                        {/* Left: HQEPL Logo */}
                        <div className="w-full lg:w-48 flex justify-center lg:justify-start">
                            <img src="/HqeplLOGO.png" alt="HQEPL Logo" className="h-16 md:h-20 object-contain" />
                        </div>

                        {/* Center: Client Info */}
                        <div className="flex-1 flex flex-col items-center text-center gap-4">
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="text-4xl md:text-5xl font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-100 focus:border-blue-400 focus:outline-none transition-all text-center w-full px-2"
                                placeholder="Company Name"
                            />
                            <span className="bg-[#4f7fb3]/10 text-[#4f7fb3] border border-[#4f7fb3]/20 px-6 py-1.5 rounded-full text-sm font-black uppercase tracking-[0.2em] shadow-sm">
                                Visit Agenda
                            </span>
                        </div>

                        {/* Right: Client Logo & Date */}
                        <div className="w-full lg:w-64 flex flex-col items-center lg:items-end gap-5 mt-4 lg:mt-0">
                            {clientLogoUrl ? (
                                <img
                                    src={resolveMediaUrl(clientLogoUrl)}
                                    alt="Client Logo"
                                    className="h-14 md:h-16 object-contain"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="h-14 w-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase">
                                    No Logo
                                </div>
                            )}
                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shadow-sm w-fit">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Visit Date</span>
                                <input
                                    type="date"
                                    value={visitDate}
                                    onChange={(e) => setVisitDate(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto pb-2">
                        <table className="w-full min-w-[1000px] lg:min-w-full">
                            <thead>
                                <tr className="bg-[#4f7fb3] text-white text-xs uppercase tracking-wider text-left">
                                    <th className="p-4 w-16 text-center font-bold border-r border-white/30">Sr. No.</th>
                                    <th className="p-4 w-1/5 font-bold border-r border-white/30">Activity</th>
                                    <th className="p-4 w-32 font-bold border-r border-white/30">Tentative Time</th>
                                    <th className="p-4 w-1/5 font-bold border-r border-white/30">Output</th>
                                    <th className="p-4 w-40 font-bold border-r border-white/30">Required Team Members</th>
                                    <th className="p-4 w-1/5 font-bold border-r border-white/30">HQEPL Representative</th>
                                    <th className="p-4 font-bold">Tasks to be completed by Team Prior to Visit</th>
                                    <th className="p-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row, index) => (
                                    <tr
                                        key={index}
                                        className={`group transition-colors ${index % 2 === 0 ? "bg-[#dbe7f4]" : "bg-[#eef4fb]"} hover:bg-blue-100/70`}
                                    >
                                        <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-100">
                                            {row.id}
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.activity}
                                                onChange={(e) => updateRow(index, "activity", e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Activity details..."
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <div className="flex flex-col gap-1 p-2">
                                                <input
                                                    type="time"
                                                    value={row.startTime}
                                                    onChange={(e) => updateRow(index, "startTime", e.target.value)}
                                                    className="w-full p-2 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm font-medium rounded"
                                                    placeholder="Start"
                                                />
                                                <input
                                                    type="time"
                                                    value={row.endTime}
                                                    onChange={(e) => updateRow(index, "endTime", e.target.value)}
                                                    className="w-full p-2 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm font-medium rounded"
                                                    placeholder="End"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.output}
                                                onChange={(e) => updateRow(index, "output", e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Expected output..."
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.teamMembers}
                                                onChange={(e) => updateRow(index, "teamMembers", e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Names..."
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => setModalRowIndex(index)}
                                                className="w-full h-full p-3 text-left bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px] flex flex-col justify-center"
                                            >
                                                {Array.isArray(row.hqeplReps) && row.hqeplReps.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {hqeplOptions
                                                            .filter(opt => row.hqeplReps.includes(opt.id))
                                                            .map(opt => (
                                                                <span key={opt.id} className="bg-white/50 px-2 py-0.5 rounded border border-blue-200 text-[11px] font-medium text-blue-700">
                                                                    {opt.full_name}
                                                                </span>
                                                            ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Select HQEPL Rep</span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="p-0">
                                            <textarea
                                                value={row.priorTasks}
                                                onChange={(e) => updateRow(index, "priorTasks", e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Pre-requisites..."
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                onClick={() => deleteRow(index)}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <button
                            onClick={addRow}
                            className="px-6 py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-sm w-full hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={18} /> Add New Activity Row
                        </button>
                    </div>
                </div>
            </main>

            {/* HQEPL Rep Selection Modal */}
            {modalRowIndex !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800">Select HQEPL Representatives</h3>
                            <button
                                onClick={() => setModalRowIndex(null)}
                                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {hqeplOptions.map((rep) => {
                                const row = rows[modalRowIndex];
                                const isChecked = Array.isArray(row?.hqeplReps) && row.hqeplReps.includes(rep.id);
                                return (
                                    <label
                                        key={rep.id}
                                        className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const currentReps = Array.isArray(row.hqeplReps) ? [...row.hqeplReps] : [];
                                                if (e.target.checked) {
                                                    updateRow(modalRowIndex, "hqeplReps", [...currentReps, rep.id]);
                                                } else {
                                                    updateRow(modalRowIndex, "hqeplReps", currentReps.filter(id => id !== rep.id));
                                                }
                                            }}
                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700 font-medium">{rep.full_name}</span>
                                    </label>
                                );
                            })}
                            {hqeplOptions.length === 0 && (
                                <div className="text-center py-8 text-slate-400">No team members available</div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200">
                            <button
                                onClick={() => setModalRowIndex(null)}
                                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitAgenda;
