import React, { useEffect, useState } from 'react';
import api from '../api';

// Custom scrollbar styles
const scrollbarStyles = `
  .planning-scroll::-webkit-scrollbar {
    width: 8px;
  }
  .planning-scroll::-webkit-scrollbar-track {
    background: #e2e8f0;
    border-radius: 999px;
  }
  .planning-scroll::-webkit-scrollbar-thumb {
    background: #94a3b8;
    border-radius: 999px;
    border: 2px solid #e2e8f0;
  }
  .planning-scroll::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
  .planning-scroll {
    scrollbar-width: thin;
    scrollbar-color: #94a3b8 #e2e8f0;
    scrollbar-gutter: stable;
  }
`;

const getTodayParts = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    return {
        year,
        month,
        todayKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    };
};

const extractRc7ForToday = (payload, userId, todayKey) => {
    if (!payload || typeof payload !== 'object' || !userId) {
        return [];
    }

    const normalizedPayload = payload?.plans && typeof payload.plans === 'object'
        ? payload.plans
        : payload;

    const dayCell = normalizedPayload?.[String(userId)]?.[todayKey];
    if (!dayCell || typeof dayCell !== 'object') {
        return [];
    }

    if (Array.isArray(dayCell.deliverables)) {
        return dayCell.deliverables
            .map((item) => String(item || '').trim())
            .filter(Boolean);
    }

    if (typeof dayCell.deliverable === 'string') {
        return dayCell.deliverable
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

const formatRc7SyncedLabel = (label) => {
    const rawLabel = String(label || '').trim();
    const rc7Prefix = '__RC7_SYNC__:';

    if (rawLabel.startsWith(rc7Prefix)) {
        return rawLabel.slice(rc7Prefix.length).trim();
    }

    return rawLabel;
};

const typePillStyles = {
    task: 'bg-[#0086FF]/20 text-[#B94A1A]',
    normal: 'bg-emerald-100 text-emerald-700',
};

const ProfileDailyPlanningBox = ({ userId }) => {
    const [todayMctcEntries, setTodayMctcEntries] = useState([]);
    const [todayRc7Deliverables, setTodayRc7Deliverables] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const fetchPlanning = async () => {
            if (!userId) {
                setTodayMctcEntries([]);
                setTodayRc7Deliverables([]);
                return;
            }

            try {
                setIsLoading(true);
                const { year, month, todayKey } = getTodayParts();

                const [mctcRes, rc7SatRes, rc7WedRes] = await Promise.allSettled([
                    api.get('mctc/entries/', { params: { year, month } }),
                    api.get('rc7/planning/', {
                        params: { type: 'sat', start: todayKey, end: todayKey },
                    }),
                    api.get('rc7/planning/', {
                        params: { type: 'wed', start: todayKey, end: todayKey },
                    }),
                ]);

                if (!isMounted) {
                    return;
                }

                if (mctcRes.status === 'fulfilled') {
                    const entries = Array.isArray(mctcRes.value?.data)
                        ? mctcRes.value.data
                        : mctcRes.value?.data?.results || [];

                    const todayEntries = entries.filter((entry) => entry?.entry_date === todayKey);
                    setTodayMctcEntries(todayEntries);
                } else {
                    setTodayMctcEntries([]);
                }

                const satItems = rc7SatRes.status === 'fulfilled'
                    ? extractRc7ForToday(rc7SatRes.value?.data, userId, todayKey)
                    : [];
                const wedItems = rc7WedRes.status === 'fulfilled'
                    ? extractRc7ForToday(rc7WedRes.value?.data, userId, todayKey)
                    : [];

                setTodayRc7Deliverables(Array.from(new Set([...satItems, ...wedItems])));
            } catch (error) {
                if (!isMounted) {
                    return;
                }
                console.error('Failed to load daily planning:', error);
                setTodayMctcEntries([]);
                setTodayRc7Deliverables([]);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchPlanning();

        return () => {
            isMounted = false;
        };
    }, [userId]);

    return (
        <>
            <style>{scrollbarStyles}</style>
            <div className="h-full rounded-[1.5rem] lg:rounded-[2rem] border border-slate-200 bg-white p-3 lg:p-4 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.18em]">Today's Planning</p>

                <div className="mt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">MCTC (Task + Normal)</p>
                    <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 h-[132px] overflow-y-scroll scroll-smooth planning-scroll pr-2">
                        {isLoading ? (
                            <p className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs italic font-semibold text-slate-400">
                                Loading MCTC entries...
                            </p>
                        ) : todayMctcEntries.length ? (
                            todayMctcEntries.map((entry) => {
                                const entryType = String(entry?.entry_type || '').toLowerCase();
                                const pillClass = typePillStyles[entryType] || 'bg-slate-200 text-slate-700';
                                const entryLabel = formatRc7SyncedLabel(entry.label) || 'Untitled entry';

                                return (
                                    <div
                                        key={`mctc-${entry.id}`}
                                        className="mt-1 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 first:mt-0"
                                    >
                                        <span
                                            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                                            title={entryLabel}
                                        >
                                            {entryLabel}
                                        </span>
                                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${pillClass}`}>
                                            {entryType === 'task' ? 'Task' : entryType === 'normal' ? 'Normal' : 'Entry'}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs italic font-semibold text-slate-400">
                                No MCTC entries today.
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Today's RC7</p>
                    <div className="mt-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 h-[132px] overflow-y-scroll scroll-smooth planning-scroll pr-2">
                        {isLoading ? (
                            <p className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs italic font-semibold text-slate-400">
                                Loading RC7 deliverables...
                            </p>
                        ) : todayRc7Deliverables.length ? (
                            todayRc7Deliverables.map((item, index) => (
                                <div
                                    key={`rc7-${index}-${item}`}
                                    className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 first:mt-0"
                                    title={item}
                                >
                                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{item}</span>
                                </div>
                            ))
                        ) : (
                            <p className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs italic font-semibold text-slate-400">
                                No RC7 deliverables today.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProfileDailyPlanningBox;
