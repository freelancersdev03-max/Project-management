import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

const formatHours = (value) => {
  const hours = Number(value);
  if (!Number.isFinite(hours)) return '0';
  if (Number.isInteger(hours)) return String(hours);
  return hours.toFixed(1);
};

const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return '';

  return dt.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const RC7Preview = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const previewPayload = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const rawPayload = params.get('payload');
    if (!rawPayload) return null;

    try {
      return JSON.parse(decodeURIComponent(rawPayload));
    } catch (error) {
      console.error('Failed to parse RC7 preview payload:', error);
      return null;
    }
  }, [location.search]);

  const dayColumns = previewPayload?.days || [];
  const maxDeliverableRows = dayColumns.reduce((max, day) => {
    const count = Array.isArray(day?.items) ? day.items.length : 0;
    return Math.max(max, count);
  }, 0);
  const deliverableRowCount = Math.max(maxDeliverableRows, 1);

  return (
    <div className="min-h-screen w-screen bg-[#f7f7f7] antialiased overflow-y-auto">
      <main className="mx-auto max-w-[96vw] px-2 py-2 md:px-3 md:py-3">
        <div className="mb-2">
          <button
            type="button"
            onClick={() => navigate('/rc7')}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={13} /> Back to RC7
          </button>
        </div>

        {!previewPayload ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <FileText size={24} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">No preview found</h2>
            <p className="mt-2 text-sm text-slate-500">
                Open this page using the Preview button on RC7.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="sticky top-0 z-20 bg-slate-900 text-white">
                    <tr>
                      <th className="border-b border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest sticky left-0 z-30 min-w-24">
                        Item
                      </th>
                      {dayColumns.map((day, index) => (
                        <th key={`${day.dayLabel}-${day.dateLabel}-${index}`} className="border-b border-slate-700 px-2 py-1.5 min-w-44 align-top">
                          <div className="text-[10px] font-black uppercase tracking-wide whitespace-nowrap">
                            {day.dayLabel} {formatHours(day.totalHours)}h
                          </div>
                          <div className="mt-0.5 text-[10px] font-semibold text-slate-300 normal-case tracking-normal whitespace-nowrap">
                            {day.dateLabel}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-50/70">
                      <th className="border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 sticky left-0 z-20">
                        Office
                      </th>
                      {dayColumns.map((day, index) => (
                        <td key={`office-${index}`} className="border-b border-slate-200 px-2 py-1.5 text-[11px] font-semibold text-slate-700">
                          {day.office || '-'}
                        </td>
                      ))}
                    </tr>

                    {Array.from({ length: deliverableRowCount }).map((_, rowIndex) => (
                      <tr key={`deliverable-row-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                        <th className="border-b border-slate-200 bg-slate-100 px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-600 sticky left-0 z-20">
                          Deliverable {rowIndex + 1}
                        </th>
                        {dayColumns.map((day, dayIndex) => {
                          const item = day.items?.[rowIndex];
                          return (
                            <td key={`cell-${rowIndex}-${dayIndex}`} className="border-b border-slate-200 px-2 py-1 align-top">
                              {item ? (
                                <div className="rounded-md border border-slate-200 bg-white px-2 py-1.5">
                                  <div className="text-[11px] leading-snug text-slate-800 whitespace-pre-wrap">{item.deliverable}</div>
                                  <div className="mt-1 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                    {formatHours(item.estimatedHours)}h
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-300 text-[11px]">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default RC7Preview;
