import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, CalendarRange, FileText } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { formatRc7PreviewDateTime, loadRc7PreviewSnapshot } from '../utils/rc7Preview';

const formatHours = (value) => {
  const hours = Number(value);
  if (!Number.isFinite(hours)) return '0';
  if (Number.isInteger(hours)) return String(hours);
  return hours.toFixed(1);
};

const RC7Preview = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const previewSnapshot = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return loadRc7PreviewSnapshot({
      employeeId: params.get('employeeId') || '',
      planType: params.get('type') || '',
      submittedAt: params.get('ts') || '',
    });
  }, [location.search]);

  const rows = previewSnapshot?.rows || [];

  return (
    <div className="flex min-h-screen w-screen overflow-hidden bg-[#f7f7f7] antialiased">
      <Sidebar />

      <main className="flex-1 overflow-y-auto pb-12">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-8">
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 md:p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => navigate('/rc7')}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <ArrowLeft size={14} /> Back to RC7
                </button>
                <div>
                  <h1 className="flex items-center gap-2 text-lg md:text-2xl font-black text-slate-900">
                    <CalendarRange size={22} className="text-rose-500" /> RC7 Preview
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Read-only snapshot of the last submitted plan.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-colors hover:bg-black"
                >
                  <Printer size={14} /> Print
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employee</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{previewSnapshot?.employeeLabel || 'Unknown'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cycle</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{previewSnapshot?.planLabel || previewSnapshot?.planType?.toUpperCase() || 'RC7'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Submitted At</div>
                <div className="mt-1 text-sm font-bold text-slate-900">{formatRc7PreviewDateTime(previewSnapshot?.submittedAt) || '—'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Range</div>
                <div className="mt-1 text-sm font-bold text-slate-900">
                  {previewSnapshot?.startDate && previewSnapshot?.endDate
                    ? `${previewSnapshot.startDate} to ${previewSnapshot.endDate}`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {!previewSnapshot ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FileText size={24} />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">No preview found</h2>
              <p className="mt-2 text-sm text-slate-500">
                Submit an RC7 plan first, then open Preview to view the saved snapshot.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="max-h-[72vh] overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-20 bg-slate-900 text-white">
                    <tr>
                      <th className="border-b border-slate-700 px-4 py-3 text-[11px] font-black uppercase tracking-widest">Day</th>
                      <th className="border-b border-slate-700 px-4 py-3 text-[11px] font-black uppercase tracking-widest">Date</th>
                      <th className="border-b border-slate-700 px-4 py-3 text-[11px] font-black uppercase tracking-widest">Office</th>
                      <th className="border-b border-slate-700 px-4 py-3 text-[11px] font-black uppercase tracking-widest">Deliverable</th>
                      <th className="border-b border-slate-700 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-right">Estimated Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row, index) => (
                      <tr key={`${row.date}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-800">{row.day || '—'}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">{row.date || '—'}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">{row.office || '—'}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap">{row.deliverable || '—'}</td>
                        <td className="border-b border-slate-200 px-4 py-3 text-right text-sm font-bold text-slate-900 tabular-nums">{formatHours(row.estimatedHours)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RC7Preview;
