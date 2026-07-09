import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

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
    <div
      className="min-h-screen w-screen antialiased overflow-y-auto k-scroll"
      style={{ background: 'var(--k-white)', fontFamily: 'Poppins, sans-serif' }}
    >
      <main className="mx-auto max-w-[96vw] px-2 py-2 md:px-3 md:py-3">
        <div className="mb-2">
          <button
            type="button"
            onClick={() => navigate('/rc7')}
            className="k-btn-ghost !inline-flex items-center gap-1.5 !rounded-full !px-2.5 !py-1 text-[11px] font-bold"
          >
            <ArrowLeft size={13} /> Back to Weekly Plan
          </button>
        </div>

        {!previewPayload ? (
          <div
            className="rounded-2xl border border-dashed p-10 text-center"
            style={{ borderColor: 'var(--k-grey-300)', background: 'var(--k-white)', boxShadow: 'var(--k-shadow-card)' }}
          >
            <img
              src="/kayaara-mark.png"
              alt="Kayaara"
              className="mx-auto h-14 w-14 object-contain k-float"
            />
            <h2 className="mt-4 text-lg font-bold" style={{ color: 'var(--k-ink)' }}>No preview found</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--k-grey-500)' }}>
                Open this page using the Preview button on Weekly Plan.
            </p>
          </div>
        ) : (
          <div className="k-card-static !rounded-xl overflow-hidden">
            <div className="overflow-x-auto k-scroll">
              <table className="w-full border-collapse text-left text-[11px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <thead className="sticky top-0 z-20" style={{ background: 'var(--k-ink)', color: 'var(--k-white)' }}>
                    <tr>
                      <th
                        className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest sticky left-0 z-30 min-w-24"
                        style={{ background: 'var(--k-ink)', borderBottom: '2px solid var(--k-blue)' }}
                      >
                        Item
                      </th>
                      {dayColumns.map((day, index) => (
                        <th
                          key={`${day.dayLabel}-${day.dateLabel}-${index}`}
                          className="px-2 py-1.5 min-w-44 align-top"
                          style={{ borderBottom: '2px solid var(--k-blue)' }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-wide whitespace-nowrap">
                            {day.dayLabel} <span style={{ color: 'var(--k-blue-light)' }}>{formatHours(day.totalHours)}h</span>
                          </div>
                          <div className="mt-0.5 text-[10px] font-semibold normal-case tracking-normal whitespace-nowrap" style={{ color: 'var(--k-grey-300)' }}>
                            {day.dateLabel}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ background: 'var(--k-band-grey)' }}>
                      <th
                        className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest sticky left-0 z-20"
                        style={{ background: 'var(--k-band-grey)', borderBottom: '1px solid var(--k-grey-200)', color: 'var(--k-grey-700)' }}
                      >
                        Office
                      </th>
                      {dayColumns.map((day, index) => (
                        <td
                          key={`office-${index}`}
                          className="px-2 py-1.5 text-[11px] font-semibold"
                          style={{ borderBottom: '1px solid var(--k-grey-200)', color: 'var(--k-grey-700)' }}
                        >
                          {day.office || '-'}
                        </td>
                      ))}
                    </tr>

                    {Array.from({ length: deliverableRowCount }).map((_, rowIndex) => (
                      <tr
                        key={`deliverable-row-${rowIndex}`}
                        style={{ background: rowIndex % 2 === 0 ? 'var(--k-white)' : 'var(--k-band-grey)' }}
                      >
                        <th
                          className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest sticky left-0 z-20"
                          style={{ background: 'var(--k-band-grey)', borderBottom: '1px solid var(--k-grey-200)', color: 'var(--k-grey-700)' }}
                        >
                          Deliverable {rowIndex + 1}
                        </th>
                        {dayColumns.map((day, dayIndex) => {
                          const item = day.items?.[rowIndex];
                          return (
                            <td
                              key={`cell-${rowIndex}-${dayIndex}`}
                              className="px-2 py-1 align-top"
                              style={{ borderBottom: '1px solid var(--k-grey-200)' }}
                            >
                              {item ? (
                                <div
                                  className="rounded-md px-2 py-1.5"
                                  style={{ border: '1px solid var(--k-grey-200)', background: 'var(--k-white)' }}
                                >
                                  <div className="text-[11px] leading-snug whitespace-pre-wrap" style={{ color: 'var(--k-ink)' }}>{item.deliverable}</div>
                                  <div
                                    className="mt-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                                    style={{ background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }}
                                  >
                                    {formatHours(item.estimatedHours)}h
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px]" style={{ color: 'var(--k-grey-300)' }}>—</span>
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
