import re

file_path = r'd:\PMS\Project-management\client\src\pages\MandaysPlanning.jsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update imports
text = re.sub(
    r"import {([^}]+)} from 'lucide-react';",
    r"import {\1, Users, Briefcase, LayoutGrid, Clock, Calendar, ArrowRight, UserCheck} from 'lucide-react';",
    text
)

# 2. Extract top half
return_idx = text.find('  return (\n    <div className="h-screen')
if return_idx == -1:
    print("Return not found!")
    exit(1)

top_half = text[:return_idx]

# 3. New UI
new_ui = """  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-[1400px] mx-auto space-y-8">
          
          {/* --- 1. HEADER NAVIGATION --- */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                <CalendarDays size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {currentUserDisplayName ? `${currentUserDisplayName} - Mandays Planning` : 'Mandays Planning'}
                </h1>
                <p className="text-sm text-slate-500 font-medium">Source: Monthly DDTME Summary</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all"
                  title="Previous Month"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="px-4 font-bold text-sm text-slate-700 min-w-[140px] text-center">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-600 transition-all"
                  title="Next Month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <button
                onClick={handleDownloadExcel}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md active:scale-95 text-sm"
              >
                <Download size={16} />
                Export Data
              </button>
            </div>
          </header>

          {/* --- 2. BENTO GRID SUMMARY STATS --- */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider">Employees</span>
                <Users size={16} className="text-indigo-500" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">{summaryStats.employeeCount}</div>
                <div className="text-xs font-medium text-slate-400 mt-1">Active resources</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-emerald-200 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider">Clients</span>
                <Briefcase size={16} className="text-emerald-500" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">{summaryStats.clientCount}</div>
                <div className="text-xs font-medium text-slate-400 mt-1">Total active clients</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-sky-200 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider">Onsite Days</span>
                <LayoutGrid size={16} className="text-sky-500" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">{formatDaysNum(summaryStats.totalOnsite)}</div>
                <div className="text-xs font-medium text-slate-400 mt-1">Total across all clients</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-orange-200 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider">Offsite Days</span>
                <Clock size={16} className="text-orange-500" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900">{formatDaysNum(summaryStats.totalOffsite)}</div>
                <div className="text-xs font-medium text-slate-400 mt-1">Total across all clients</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-purple-200 transition-colors bg-gradient-to-br from-white to-slate-50">
              <div className="flex items-center justify-between text-slate-500 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">Total Days</span>
                <Calendar size={16} className="text-purple-600" />
              </div>
              <div>
                <div className="text-3xl font-black text-indigo-600">{formatDaysNum(summaryStats.totalDays)}</div>
                <div className="text-xs font-medium text-slate-500 mt-1">Overall planned capacity</div>
              </div>
            </div>
          </div>

          {/* --- 3. DATA GRID --- */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Resource Allocation Breakdown</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-sky-400"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Onsite</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Offsite</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" style={{ minWidth: `${250 + clients.length * 160 + 240}px` }}>
                <thead>
                  {/* Row 1: Client names */}
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th rowSpan={2} className="px-4 py-3 text-left font-black text-slate-400 text-[11px] uppercase tracking-wider w-16 border-r border-slate-200">#</th>
                    <th rowSpan={2} className="px-4 py-3 text-left font-black text-slate-500 text-xs uppercase tracking-wider min-w-[200px] sticky left-0 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] z-10">Resource Name</th>
                    {clients.map((c) => (
                      <th key={c.id} colSpan={2} className="px-4 py-3 text-center font-black text-slate-700 text-[11px] uppercase tracking-wider border-r border-slate-200 bg-slate-50/50">
                        {c.name}
                      </th>
                    ))}
                    <th colSpan={3} className="px-4 py-3 text-center font-black text-indigo-700 bg-indigo-50/50 text-[11px] uppercase tracking-wider border-l-2 border-indigo-100">
                      Summary Totals
                    </th>
                  </tr>
                  {/* Row 2: Sub-headers */}
                  <tr className="bg-white border-b-2 border-slate-200">
                    {clients.map((c) => (
                      <React.Fragment key={`sub-${c.id}`}>
                        <th className="px-2 py-2.5 text-center font-bold text-slate-400 text-[10px] uppercase tracking-widest border-t border-slate-100 border-r border-slate-100">OnSite</th>
                        <th className="px-2 py-2.5 text-center font-bold text-slate-400 text-[10px] uppercase tracking-widest border-t border-slate-100 border-r border-slate-200">Offsite</th>
                      </React.Fragment>
                    ))}
                    <th className="px-2 py-2.5 text-center font-bold text-indigo-600 bg-indigo-50/30 text-[10px] uppercase tracking-widest border-t border-indigo-100 border-l-2 border-indigo-100 border-r border-indigo-50">Onsite</th>
                    <th className="px-2 py-2.5 text-center font-bold text-indigo-600 bg-indigo-50/30 text-[10px] uppercase tracking-widest border-t border-indigo-100 border-r border-indigo-50">Offsite</th>
                    <th className="px-2 py-2.5 text-center font-black text-indigo-700 bg-indigo-100/30 text-[10px] uppercase tracking-widest border-t border-indigo-100">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <SkeletonTableRow key={idx} columns={totalColSpan || 8} />
                    ))
                  ) : employees.length > 0 ? (
                    <>
                      {employees.map((emp, index) => (
                        <tr key={emp.employee_id} className="bg-white hover:bg-slate-50/80 transition-colors group">
                          <td className="px-4 py-3 font-bold text-slate-400 text-xs border-r border-slate-100">{index + 1}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50/80 shadow-[1px_0_0_0_#f1f5f9] transition-colors z-10">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                                {emp.employee_name ? emp.employee_name.substring(0, 2).toUpperCase() : 'NA'}
                              </div>
                              {emp.employee_name}
                            </div>
                          </td>
                          {clients.map((c) => {
                            const pc = emp.per_client?.[c.id];
                            const onVal = Number(pc?.onsite_days || 0);
                            const offVal = Number(pc?.offsite_days || 0);
                            
                            return (
                              <React.Fragment key={`${emp.employee_id}-${c.id}`}>
                                <td className="px-2 py-3 text-center border-r border-slate-100">
                                  {onVal > 0 ? (
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-sky-50 text-sky-700 min-w-[32px]">{formatDays(pc.onsite_days)}</span>
                                  ) : <span className="text-slate-300 text-xs">-</span>}
                                </td>
                                <td className="px-2 py-3 text-center border-r border-slate-200">
                                  {offVal > 0 ? (
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-700 min-w-[32px]">{formatDays(pc.offsite_days)}</span>
                                  ) : <span className="text-slate-300 text-xs">-</span>}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          
                          {/* Row Totals */}
                          <td className="px-2 py-3 text-center border-l-2 border-indigo-100 border-r border-slate-100 bg-indigo-50/10">
                            {Number(emp.total_onsite_days) > 0 ? (
                              <span className="text-xs font-bold text-sky-700">{formatDays(emp.total_onsite_days)}</span>
                            ) : <span className="text-slate-300 text-xs">-</span>}
                          </td>
                          <td className="px-2 py-3 text-center border-r border-slate-100 bg-indigo-50/10">
                            {Number(emp.total_offsite_days) > 0 ? (
                              <span className="text-xs font-bold text-orange-700">{formatDays(emp.total_offsite_days)}</span>
                            ) : <span className="text-slate-300 text-xs">-</span>}
                          </td>
                          <td className="px-2 py-3 text-center bg-indigo-50/30">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-black bg-indigo-100 text-indigo-700 min-w-[40px] shadow-sm">
                              {formatDays(emp.total_days)}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* Total row (All Employees) */}
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td className="px-4 py-4 text-slate-400 font-bold border-r border-slate-200"></td>
                        <td className="px-4 py-4 text-slate-700 font-bold uppercase tracking-wider text-xs sticky left-0 bg-slate-50 shadow-[1px_0_0_0_#e2e8f0] z-10">
                          Total (All Resources)
                        </td>
                        {clients.map((c) => (
                          <React.Fragment key={`total-${c.id}`}>
                            <td className="px-2 py-4 text-center border-r border-slate-200">
                              <span className="text-xs font-bold text-slate-700">{formatDaysNum(columnTotals.perClient[c.id]?.onsite)}</span>
                            </td>
                            <td className="px-2 py-4 text-center border-r border-slate-200">
                              <span className="text-xs font-bold text-slate-700">{formatDaysNum(columnTotals.perClient[c.id]?.offsite)}</span>
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="px-2 py-4 text-center bg-indigo-50 border-l-2 border-indigo-200 border-r border-indigo-100">
                          <span className="text-xs font-black text-indigo-700">{formatDaysNum(columnTotals.totalOnsite)}</span>
                        </td>
                        <td className="px-2 py-4 text-center bg-indigo-50 border-r border-indigo-100">
                          <span className="text-xs font-black text-indigo-700">{formatDaysNum(columnTotals.totalOffsite)}</span>
                        </td>
                        <td className="px-2 py-4 text-center bg-indigo-100">
                          <span className="text-sm font-black text-indigo-900">{formatDaysNum(columnTotals.totalDays)}</span>
                        </td>
                      </tr>

                      {/* Overall Days row */}
                      <tr className="bg-slate-800 text-white border-t border-slate-700">
                        <td className="px-4 py-4 border-r border-slate-700"></td>
                        <td className="px-4 py-4 font-black uppercase tracking-widest text-xs sticky left-0 bg-slate-800 shadow-[1px_0_0_0_#334155] z-10">
                          Overall Capacity
                        </td>
                        {clients.map((c) => (
                          <React.Fragment key={`overall-${c.id}`}>
                            <td colSpan={2} className="px-2 py-4 text-center border-r border-slate-700">
                              <span className="text-sm font-black text-white bg-slate-700/50 px-3 py-1 rounded-lg shadow-inner">{formatDaysNum(overallPerClient[c.id])}</span>
                            </td>
                          </React.Fragment>
                        ))}
                        <td className="px-2 py-4 text-center border-l-2 border-slate-600 bg-slate-900/50">
                          <span className="text-slate-500 font-bold">-</span>
                        </td>
                        <td className="px-2 py-4 text-center bg-slate-900/50">
                          <span className="text-slate-500 font-bold">-</span>
                        </td>
                        <td className="px-2 py-4 text-center bg-indigo-600">
                          <span className="text-lg font-black text-white">{formatDaysNum(columnTotals.totalDays)}</span>
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td colSpan={totalColSpan} className="px-4 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                          <UserCheck size={32} className="text-slate-300" />
                          <p className="font-semibold text-sm">No planning records found for the selected month.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
              <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default MandaysPlanning;
"""

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(top_half + new_ui)

print("Done")
