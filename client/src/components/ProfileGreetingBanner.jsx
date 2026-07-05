import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ClipboardList, X } from 'lucide-react';
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
        return clientId ? `/visitagenda/${clientId}` : '/visitagenda';
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
        return queryString ? `/dashboard?${queryString}` : '/dashboard';
    }

    return '/dashboard';
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

    const { greeting, dateLabel } = useMemo(() => {
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

        return {
            greeting: getGreetingForHour(Number.isNaN(hourInIst) ? 0 : hourInIst),
            dateLabel: formattedDate,
        };
    }, [clockTick]);

    const displayName = getDisplayName(name);

    return (
        <section className="relative mt-2 md:-mt-5 rounded-2xl border border-slate-200/80 bg-inherit px-3 py-2 md:px-4 md:py-2.5">
            <div ref={notificationPanelRef} className="absolute right-2 top-2 z-20">
                <button
                    type="button"
                    aria-label="Notifications"
                    aria-expanded={isNotificationOpen}
                    onClick={() => {
                        void handleNotificationToggle();
                    }}
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-700"
                >
                    <Bell size={18} />
                    {unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-black text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    ) : null}
                </button>

                {isNotificationOpen ? (
                    <div className="absolute right-0 top-11 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)]">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <div>
                                <p className="text-sm font-black text-slate-900">Notifications</p>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Latest updates for you
                                </p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                                {notifications.length}
                            </span>
                        </div>

                        <div className="h-[400px] overflow-y-auto custom-scrollbar pr-1">
                            {notificationsLoading ? (
                                <div className="px-4 py-6 text-sm font-medium text-slate-500">
                                    Loading notifications...
                                </div>
                            ) : notificationsError ? (
                                <div className="px-4 py-6 text-sm font-medium text-rose-500">{notificationsError}</div>
                            ) : visibleNotifications.length ? (
                                visibleNotifications.map((notification, index) => (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${!notification.is_read ? 'bg-amber-50/70' : 'bg-white'
                                            } ${index !== visibleNotifications.length - 1 ? 'border-b border-slate-100' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                                                    {notification.title}
                                                </p>
                                                <p className="mt-1 text-sm font-semibold leading-5 text-slate-700">
                                                    {notification.message}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                                                {formatNotificationTime(notification.created_at)}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="px-4 py-6 text-sm font-medium text-slate-500">
                                    No notifications yet.
                                </div>
                            )}
                        </div>

                        {notifications.length > MAX_VISIBLE_NOTIFICATIONS ? (
                            <div className="border-t border-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Showing latest {MAX_VISIBLE_NOTIFICATIONS}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className="pl-10 md:pl-0 pr-12">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base md:text-lg font-black tracking-tight text-slate-900 lg:text-xl">
                            {greeting}, {displayName}!
                        </h2>
                        <p className="mt-0.5 text-xs font-semibold text-slate-500">{dateLabel}</p>
                    </div>

                    {shouldShowTodayTaskButton ? (
                        <button
                            type="button"
                            onClick={() => {
                                void handleOpenTodayTasks();
                            }}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                            <ClipboardList size={14} />
                            Today&apos;s Task
                        </button>
                    ) : null}
                </div>
            </div>

            {isTodayTasksOpen ? (
                <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/45 p-4">
                    <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div>
                                <p className="text-lg font-black text-slate-900">Today&apos;s Task</p>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                    Tasks assigned for today
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTodayTasksOpen(false)}
                                className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
                                aria-label="Close today's tasks"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 custom-scrollbar">
                            {todayTasksLoading ? (
                                <p className="text-sm font-semibold text-slate-500">Loading today&apos;s tasks...</p>
                            ) : todayTasksError ? (
                                <p className="text-sm font-semibold text-rose-500">{todayTasksError}</p>
                            ) : todayTasks.length ? (
                                <div className="space-y-3">
                                    {todayTasks.map((task) => {
                                        const isDone = Boolean(task?.completion_date);
                                        return (
                                            <div
                                                key={task?.id || `${task?.title || 'task'}-${task?.target_date || ''}`}
                                                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="text-sm font-bold text-slate-800">{task?.title || 'Untitled task'}</p>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {isDone ? 'Completed' : 'Pending'}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                                    Due: {String(task?.target_date || '').slice(0, 10) || 'N/A'}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-sm font-semibold text-slate-500">No tasks assigned for today.</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
};

export default ProfileGreetingBanner;
