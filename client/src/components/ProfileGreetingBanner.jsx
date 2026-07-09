import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ClipboardList, X, Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import api from '../api';

const IST_TIMEZONE = 'Asia/Kolkata';
const NOTIFICATION_POLL_INTERVAL = 60 * 1000;
const MAX_VISIBLE_NOTIFICATIONS = 8;

const getTodayDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const notificationTimeFormatter = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
});

const getGreetingForHour = (hour) => {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

const getGreetingIcon = (hour) => {
    if (hour < 6) return Moon;
    if (hour < 12) return Sunrise;
    if (hour < 17) return Sun;
    if (hour < 20) return Sunset;
    return Moon;
};

const getDisplayName = (name) => {
    const normalized = String(name || '').trim();
    return normalized || 'User';
};

const parsePositiveInt = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getNotificationTargetPath = (notification) => {
    const metadata = notification?.metadata && typeof notification.metadata === 'object'
        ? notification.metadata
        : {};
    const notificationType = String(notification?.notification_type || '').toUpperCase();

    if (
        notificationType === 'DDTME_SUBMITTED'
        || notificationType === 'DDTME_APPROVED'
        || notificationType === 'DDTME_REJECTED'
    ) {
        const clientId = parsePositiveInt(metadata.client_id);
        return clientId ? `/ddtme/client/${clientId}` : '/ddtme';
    }

    if (notificationType === 'PROJECT_INCLUDED') {
        const projectId = parsePositiveInt(metadata.project_id);
        return projectId ? `/projects/${projectId}` : '/clients';
    }

    if (notificationType === 'VISIT_AGENDA_INCLUDED') {
        const clientId = parsePositiveInt(metadata.client_id);
        return clientId ? `/meetingagenda/${clientId}` : '/meetingagenda';
    }

    if (notificationType === 'ACHIEVEMENT_AWARDED') {
        return '/achievement';
    }

    if (notificationType === 'TASK_ASSIGNED') {
        const sourceModule = String(metadata.source_module || '').toUpperCase();
        const projectId = parsePositiveInt(metadata.project_id);

        if (sourceModule === 'ACTION_TASK' && projectId) {
            return `/projects/${projectId}`;
        }

        const params = new URLSearchParams();
        if (metadata.task_title) {
            params.set('task', String(metadata.task_title));
        }
        if (metadata.task_id) {
            params.set('taskId', String(metadata.task_id));
        }
        if (projectId) {
            params.set('project', String(projectId));
        }

        const queryString = params.toString();
        return queryString ? `/employeedashboard?${queryString}` : '/employeedashboard';
    }

    return '/employeedashboard';
};

const formatNotificationTime = (value) => {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = date.getTime() - Date.now();
    const diffMinutes = Math.round(diffMs / (60 * 1000));
    const absDiffMinutes = Math.abs(diffMinutes);

    if (absDiffMinutes < 60) {
        return notificationTimeFormatter.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
        return notificationTimeFormatter.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    if (Math.abs(diffDays) < 7) {
        return notificationTimeFormatter.format(diffDays, 'day');
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
};

const ProfileGreetingBanner = ({ name }) => {
    const navigate = useNavigate();
    const [clockTick, setClockTick] = useState(Date.now());
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [notificationsError, setNotificationsError] = useState('');
    const [isTodayTasksOpen, setIsTodayTasksOpen] = useState(false);
    const [todayTasks, setTodayTasks] = useState([]);
    const [todayTasksLoading, setTodayTasksLoading] = useState(false);
    const [todayTasksError, setTodayTasksError] = useState('');
    const notificationPanelRef = useRef(null);
    const isMountedRef = useRef(true);
    const currentRole = String(localStorage.getItem('role') || '').toUpperCase();
    const shouldShowTodayTaskButton = currentRole !== 'ADMIN';

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setClockTick(Date.now());
        }, 60 * 1000);

        return () => window.clearInterval(intervalId);
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const syncNotifications = async (showLoader = false) => {
        if (showLoader && isMountedRef.current) {
            setNotificationsLoading(true);
        }

        try {
            const response = await api.get('/notifications/');
            const items = Array.isArray(response.data)
                ? response.data
                : response.data?.results || [];

            if (!isMountedRef.current) {
                return items;
            }

            setNotifications(items);
            setNotificationsError('');
            return items;
        } catch (error) {
            if (isMountedRef.current) {
                setNotificationsError('Unable to load notifications right now.');
            }
            return [];
        } finally {
            if (showLoader && isMountedRef.current) {
                setNotificationsLoading(false);
            }
        }
    };

    const markAllNotificationsRead = async () => {
        try {
            await api.post('/notifications/mark-all-read/');
            if (!isMountedRef.current) {
                return;
            }

            setNotifications((currentNotifications) =>
                currentNotifications.map((notification) => ({
                    ...notification,
                    is_read: true,
                }))
            );
        } catch (error) {
            // Keep the existing state when mark-as-read fails.
        }
    };

    useEffect(() => {
        void syncNotifications(true);

        const pollId = window.setInterval(() => {
            void syncNotifications(false);
        }, NOTIFICATION_POLL_INTERVAL);

        return () => window.clearInterval(pollId);
    }, []);

    useEffect(() => {
        if (!isNotificationOpen) {
            return undefined;
        }

        const handleOutsideClick = (event) => {
            if (!notificationPanelRef.current?.contains(event.target)) {
                setIsNotificationOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isNotificationOpen]);

    const unreadCount = useMemo(
        () => notifications.reduce((count, notification) => count + (notification.is_read ? 0 : 1), 0),
        [notifications]
    );

    const visibleNotifications = useMemo(
        () => notifications.slice(0, MAX_VISIBLE_NOTIFICATIONS),
        [notifications]
    );

    const handleNotificationToggle = async () => {
        const nextOpenState = !isNotificationOpen;
        setIsNotificationOpen(nextOpenState);

        if (!nextOpenState) {
            return;
        }

        const latestNotifications = await syncNotifications(false);
        if (latestNotifications.some((notification) => !notification.is_read)) {
            await markAllNotificationsRead();
        }
    };

    const handleNotificationClick = (notification) => {
        const targetPath = getNotificationTargetPath(notification);
        setIsNotificationOpen(false);
        navigate(targetPath);
    };

    const loadTodayTasks = async () => {
        setTodayTasksLoading(true);
        setTodayTasksError('');

        try {
            const meRes = await api.get('/me/');
            const myUserId = meRes?.data?.id;

            if (!myUserId) {
                throw new Error('Unable to resolve current user.');
            }

            const tasksRes = await api.get('/tasks/', {
                params: {
                    assigned_to: myUserId,
                },
            });

            const allTasks = Array.isArray(tasksRes.data)
                ? tasksRes.data
                : tasksRes.data?.results || [];

            const todayKey = getTodayDateKey();
            const scopedTodayTasks = allTasks.filter((task) => {
                const rawTargetDate = String(task?.target_date || '').slice(0, 10);
                return rawTargetDate === todayKey;
            });

            if (!isMountedRef.current) return;
            setTodayTasks(scopedTodayTasks);
        } catch (error) {
            if (!isMountedRef.current) return;
            setTodayTasksError('Unable to load today\'s tasks right now.');
            setTodayTasks([]);
        } finally {
            if (isMountedRef.current) {
                setTodayTasksLoading(false);
            }
        }
    };

    const handleOpenTodayTasks = async () => {
        setIsTodayTasksOpen(true);
        await loadTodayTasks();
    };

    const { greeting, dateLabel, GreetingIcon } = useMemo(() => {
        const now = new Date(clockTick);
        const hourInIst = Number(
            new Intl.DateTimeFormat('en-US', {
                timeZone: IST_TIMEZONE,
                hour: '2-digit',
                hour12: false,
            }).format(now)
        );

        const formattedDate = new Intl.DateTimeFormat('en-US', {
            timeZone: IST_TIMEZONE,
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        }).format(now);

        const safeHour = Number.isNaN(hourInIst) ? 0 : hourInIst;

        return {
            greeting: getGreetingForHour(safeHour),
            dateLabel: formattedDate,
            GreetingIcon: getGreetingIcon(safeHour),
        };
    }, [clockTick]);

    const displayName = getDisplayName(name);

    return (
        <motion.section
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="k-card relative mt-2 md:-mt-5 px-3 py-2 md:px-4 md:py-2.5 hover:!transform-none overflow-hidden"
            style={{ background: 'var(--k-blue-tint)', borderColor: 'var(--k-grey-200)' }}
        >
            {/* Slow drifting blue-tint glow blob (pure transform, subtle) */}
            <motion.div
                aria-hidden="true"
                className="pointer-events-none absolute -left-10 -top-16 w-48 h-48 rounded-full blur-3xl"
                style={{ background: 'var(--k-blue-glow)', opacity: 0.35 }}
                animate={{ x: [0, 24, 0], y: [0, 14, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div ref={notificationPanelRef} className="absolute right-2 top-2 z-20">
                <button
                    type="button"
                    aria-label="Notifications"
                    aria-expanded={isNotificationOpen}
                    onClick={() => {
                        void handleNotificationToggle();
                    }}
                    className="k-btn-icon relative !bg-white"
                    style={{ borderColor: 'var(--k-grey-200)' }}
                >
                    <Bell size={18} />
                    {unreadCount > 0 ? (
                        <span
                            className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black"
                            style={{ background: 'var(--k-blue)', color: 'var(--k-white)' }}
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    ) : null}
                </button>

                <AnimatePresence>
                    {isNotificationOpen ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            className="absolute right-0 top-11 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border k-scroll"
                            style={{ background: 'var(--k-white)', borderColor: 'var(--k-grey-200)', boxShadow: 'var(--k-shadow-modal)' }}
                        >
                            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--k-grey-200)' }}>
                                <div>
                                    <p className="text-sm font-bold" style={{ color: 'var(--k-ink)' }}>Notifications</p>
                                    <p className="k-eyebrow">Latest updates for you</p>
                                </div>
                                <span className="k-pill-grey">{notifications.length}</span>
                            </div>

                            <div className="h-[400px] overflow-y-auto k-scroll pr-1">
                                {notificationsLoading ? (
                                    <div className="px-4 py-6 text-sm font-medium" style={{ color: 'var(--k-grey-500)' }}>
                                        Loading notifications...
                                    </div>
                                ) : notificationsError ? (
                                    <div className="px-4 py-6 text-sm font-medium" style={{ color: 'var(--k-ink)' }}>{notificationsError}</div>
                                ) : visibleNotifications.length ? (
                                    visibleNotifications.map((notification, index) => (
                                        <button
                                            key={notification.id}
                                            type="button"
                                            onClick={() => handleNotificationClick(notification)}
                                            className="w-full px-4 py-3 text-left transition-colors"
                                            style={{
                                                background: !notification.is_read ? 'var(--k-blue-tint)' : 'var(--k-white)',
                                                borderBottom: index !== visibleNotifications.length - 1 ? '1px solid var(--k-grey-100)' : 'none',
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="k-eyebrow">{notification.title}</p>
                                                    <p className="mt-1 text-sm font-semibold leading-5" style={{ color: 'var(--k-grey-700)' }}>
                                                        {notification.message}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-[11px] font-semibold" style={{ color: 'var(--k-grey-500)' }}>
                                                    {formatNotificationTime(notification.created_at)}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-6 text-sm font-medium" style={{ color: 'var(--k-grey-500)' }}>
                                        No notifications yet.
                                    </div>
                                )}
                            </div>

                            {notifications.length > MAX_VISIBLE_NOTIFICATIONS ? (
                                <div className="border-t px-4 py-2 k-eyebrow" style={{ borderColor: 'var(--k-grey-200)' }}>
                                    Showing latest {MAX_VISIBLE_NOTIFICATIONS}
                                </div>
                            ) : null}
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            <div className="relative z-10 pl-10 md:pl-0 pr-12">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <motion.span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                            style={{ background: 'var(--k-white)', color: 'var(--k-blue)' }}
                            animate={{ y: [0, -3, 0], rotate: [0, 8, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <GreetingIcon size={17} />
                        </motion.span>
                        <div>
                            <h2 className="text-base md:text-lg font-bold tracking-tight lg:text-xl" style={{ color: 'var(--k-ink)' }}>
                                {greeting}, <span className="k-underline relative" style={{ color: 'var(--k-blue)' }}>
                                    {displayName}
                                    <motion.span
                                        aria-hidden="true"
                                        className="absolute left-0 -bottom-0.5 h-[2px] rounded-full"
                                        style={{ background: 'var(--k-blue)', width: '100%' }}
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                    />
                                </span>!
                            </h2>
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={dateLabel}
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-0.5 text-xs font-semibold"
                                    style={{ color: 'var(--k-grey-500)' }}
                                >
                                    {dateLabel}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    </div>

                    {shouldShowTodayTaskButton ? (
                        <button
                            type="button"
                            onClick={() => {
                                void handleOpenTodayTasks();
                            }}
                            className="k-btn-primary inline-flex items-center gap-2 !py-2 !px-3 text-[11px]"
                        >
                            <ClipboardList size={14} />
                            Today&apos;s Task
                        </button>
                    ) : null}
                </div>
            </div>

            <AnimatePresence>
                {isTodayTasksOpen ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="k-backdrop"
                        onClick={() => setIsTodayTasksOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.96, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.96, opacity: 0, y: 10 }}
                            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                            className="k-modal w-full max-w-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--k-grey-200)' }}>
                                <div>
                                    <p className="text-lg font-bold" style={{ color: 'var(--k-ink)' }}>Today&apos;s Task</p>
                                    <p className="k-eyebrow">Tasks assigned for today</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsTodayTasksOpen(false)}
                                    className="k-btn-icon border"
                                    style={{ borderColor: 'var(--k-grey-200)' }}
                                    aria-label="Close today's tasks"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 k-scroll">
                                {todayTasksLoading ? (
                                    <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-500)' }}>Loading today&apos;s tasks...</p>
                                ) : todayTasksError ? (
                                    <p className="text-sm font-semibold" style={{ color: 'var(--k-ink)' }}>{todayTasksError}</p>
                                ) : todayTasks.length ? (
                                    <div className="space-y-3">
                                        {todayTasks.map((task, index) => {
                                            const isDone = Boolean(task?.completion_date);
                                            return (
                                                <motion.div
                                                    key={task?.id || `${task?.title || 'task'}-${task?.target_date || ''}`}
                                                    initial={{ opacity: 0, y: 12 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05, duration: 0.4 }}
                                                    className="k-card-grey px-4 py-3"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="text-sm font-bold" style={{ color: 'var(--k-ink)' }}>{task?.title || 'Untitled task'}</p>
                                                        <span className={isDone ? 'k-pill' : 'k-pill-grey'}>
                                                            {isDone ? 'Completed' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--k-grey-500)' }}>
                                                        Due: {String(task?.target_date || '').slice(0, 10) || 'N/A'}
                                                    </p>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-sm font-semibold" style={{ color: 'var(--k-grey-500)' }}>No tasks assigned for today.</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </motion.section>
    );
};

export default ProfileGreetingBanner;
