import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { Plus, Trash2, Save, Printer, Calendar, Download } from "lucide-react";

const VisitAgenda = () => {
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
    const [companyName, setCompanyName] = useState("Jacktech Hydraulic"); // Editable? Assuming static for now or editable state

    const [rows, setRows] = useState([
        {
            id: 1,
            activity: "To Conduct Opening Meeting for ZED Milestone 1.",
            tentativeTime: "09:00 am to 09:30 am",
            output: "Clarity related to Milestone 1 activity & Parameter Status",
            teamMembers: "Ashish Sir",
            hqeplRep: "Mr. Sameep Sir, Mr. Manoj Sir and Mr. Aniket Kahar",
            priorTasks: ""
        },
        {
            id: 2,
            activity: "To conduct Site Tour",
            tentativeTime: "09:30 am to 10:00 am",
            output: "Capture 20 photos of the site and uploaded on the ZED portal",
            teamMembers: "-",
            hqeplRep: "Mr. Sameep Sir, Mr. Manoj Sir and Mr. Aniket Kahar",
            priorTasks: ""
        }
    ]);

    const addRow = () => {
        setRows([
            ...rows,
            {
                id: rows.length + 1,
                activity: "",
                tentativeTime: "",
                output: "",
                teamMembers: "",
                hqeplRep: "",
                priorTasks: ""
            }
        ]);
    };

    const deleteRow = (index) => {
        const newRows = [...rows];
        newRows.splice(index, 1);
        // Re-index
        const reindexed = newRows.map((row, i) => ({ ...row, id: i + 1 }));
        setRows(reindexed);
    };

    const updateRow = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            <Navbar hideLogin />

            <main className="max-w-[1800px] mx-auto px-4 md:px-8 py-8 space-y-8">

                {/* HEADER SECTION */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="text-4xl md:text-5xl font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none transition-all w-full md:w-auto"
                        />
                        <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-sm">
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Visit Agenda</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-400 uppercase ml-2">Visit Date:</span>
                            <input
                                type="date"
                                value={visitDate}
                                onChange={(e) => setVisitDate(e.target.value)}
                                className="bg-white border text-sm font-bold border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-sm">
                                <Download size={16} /> Download
                            </button>
                            <button className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all text-sm">
                                <Save size={16} /> Save Agenda
                            </button>
                        </div>
                    </div>
                </div>

                {/* TABLE SECTION */}
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1200px]">
                            <thead>
                                <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider text-left">
                                    <th className="p-4 w-16 text-center font-bold border-r border-slate-700">Sr. No.</th>
                                    <th className="p-4 w-1/5 font-bold border-r border-slate-700">Activity</th>
                                    <th className="p-4 w-32 font-bold border-r border-slate-700">Tentative Time</th>
                                    <th className="p-4 w-1/5 font-bold border-r border-slate-700">Output</th>
                                    <th className="p-4 w-40 font-bold border-r border-slate-700">Req. Team Members</th>
                                    <th className="p-4 w-1/5 font-bold border-r border-slate-700">HQEPL Rep</th>
                                    <th className="p-4 font-bold">Tasks to be completed by Team Prior to Visit</th>
                                    <th className="p-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row, index) => (
                                    <tr key={index} className="group hover:bg-blue-50/30 transition-colors">
                                        <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-100">
                                            {row.id}
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.activity}
                                                onChange={(e) => updateRow(index, 'activity', e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Activity details..."
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <input
                                                type="text"
                                                value={row.tentativeTime}
                                                onChange={(e) => updateRow(index, 'tentativeTime', e.target.value)}
                                                className="w-full h-full p-3 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm font-medium"
                                                placeholder="09:00 - 10:00"
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.output}
                                                onChange={(e) => updateRow(index, 'output', e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Expected output..."
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.teamMembers}
                                                onChange={(e) => updateRow(index, 'teamMembers', e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Names..."
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.hqeplRep}
                                                onChange={(e) => updateRow(index, 'hqeplRep', e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Rep Names..."
                                            />
                                        </td>
                                        <td className="p-0">
                                            <textarea
                                                value={row.priorTasks}
                                                onChange={(e) => updateRow(index, 'priorTasks', e.target.value)}
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
        </div>
    );
};

export default VisitAgenda;
