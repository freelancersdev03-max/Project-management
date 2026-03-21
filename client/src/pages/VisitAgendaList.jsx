import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Mail, Phone, ArrowRight, Loader2, ChevronLeft } from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../api";

const VisitAgendaList = () => {
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
                if (role === "EXTERNAL") endpoint = "employees/external-clients/";

                const response = await api.get(endpoint);
                setClients(Array.isArray(response.data) ? response.data : []);
            } catch (err) {
                console.error("Visit Agenda list load error:", err);
                setError("Unable to load assigned companies.");
            } finally {
                setLoading(false);
            }
        };

        fetchClients();
    }, []);

    return (
        <div className="h-screen w-screen bg-slate-50 antialiased font-sans flex overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 space-y-6 sm:space-y-10">
                <div className="max-w-[1400px] mx-auto space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 pb-6 border-b border-slate-200/70">
                        <div className="flex justify-start">
                            <button
                                onClick={() => navigate(-1)}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                        </div>
                        <div className="space-y-2 text-center">
                            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">
                                Assigned Companies
                            </p>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                                Visit Agenda
                            </h1>
                        </div>
                        <div className="hidden md:block" />
                    </div>

                    {loading && (
                        <div className="flex items-center gap-3 text-slate-500 text-sm font-bold uppercase tracking-widest">
                            <Loader2 size={20} className="animate-spin" /> Loading companies...
                        </div>
                    )}

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold">
                            {error}
                        </div>
                    )}

                    {!loading && !error && clients.length === 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-slate-500 text-sm font-semibold">
                            No assigned companies found for your account.
                        </div>
                    )}

                    {!loading && !error && clients.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                            {clients.map((client) => (
                                <div
                                    key={client.id}
                                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Building2 size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Company</p>
                                            <h2 className="text-xl font-black text-slate-900 mt-1">
                                                {client.company_name || "Unnamed Company"}
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-slate-400" />
                                            <span>{client.contact_email || client.email || "No email"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-slate-400" />
                                            <span>{client.phone || "No phone"}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate(`/visitagenda/${client.id}`)}
                                        className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                                    >
                                        Visit Agenda
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default VisitAgendaList;
