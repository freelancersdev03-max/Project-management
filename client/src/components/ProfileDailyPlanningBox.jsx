import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

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
    task: 'k-pill',
    normal: 'k-pill-grey',
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
        <div className="k-card h-full p-3 lg:p-4 hover:!transform-none">
            <p className="k-eyebrow">Today's Planning</p>

            <div className="mt-3">
                <p className="k-eyebrow">MCTC (Task + Normal)</p>
                <div className="mt-2 k-card-grey p-3 h-[132px] overflow-y-scroll scroll-smooth k-scroll pr-2">
                    {isLoading ? (
                        <p className="rounded-lg border px-3 py-1.5 text-xs italic font-semibold" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-white)', color: 'var(--k-grey-500)' }}>
                            Loading MCTC entries...
                        </p>
                    ) : todayMctcEntries.length ? (
                        <AnimatePresence>
                            {todayMctcEntries.map((entry, index) => {
                                const entryType = String(entry?.entry_type || '').toLowerCase();
                                const pillClass = typePillStyles[entryType] || 'k-pill-grey';
                                const entryLabel = formatRc7SyncedLabel(entry.label) || 'Untitled entry';

                                return (
                                    <motion.div
                                        key={`mctc-${entry.id}`}
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ delay: index * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                        whileHover={{ x: 3 }}
                                        className="mt-1 flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold first:mt-0 k-hover-slide"
                                        style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-white)', color: 'var(--k-grey-700)' }}
                                    >
                                        <span
                                            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                                            title={entryLabel}
                                        >
                                            {entryLabel}
                                        </span>
                                        <span className={`shrink-0 ${pillClass}`}>
                                            {entryType === 'task' ? 'Task' : entryType === 'normal' ? 'Normal' : 'Entry'}
                                        </span>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    ) : (
                        <p className="rounded-lg border px-3 py-1.5 text-xs italic font-semibold" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-white)', color: 'var(--k-grey-500)' }}>
                            No MCTC entries today.
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-3">
                <p className="k-eyebrow">Today's RC7</p>
                <div className="mt-2 k-card-grey p-3 h-[132px] overflow-y-scroll scroll-smooth k-scroll pr-2">
                    {isLoading ? (
                        <p className="rounded-lg border px-3 py-1.5 text-xs italic font-semibold" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-white)', color: 'var(--k-grey-500)' }}>
                            Loading RC7 deliverables...
                        </p>
                    ) : todayRc7Deliverables.length ? (
                        <AnimatePresence>
                            {todayRc7Deliverables.map((item, index) => (
                                <motion.div
                                    key={`rc7-${index}-${item}`}
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: index * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                    whileHover={{ x: 3 }}
                                    className="mt-1 rounded-lg border px-3 py-1.5 text-xs font-semibold first:mt-0 k-hover-slide"
                                    style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-white)', color: 'var(--k-grey-700)' }}
                                    title={item}
                                >
                                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{item}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <p className="rounded-lg border px-3 py-1.5 text-xs italic font-semibold" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-white)', color: 'var(--k-grey-500)' }}>
                            No RC7 deliverables today.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileDailyPlanningBox;
