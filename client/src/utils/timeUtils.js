/**
 * Formats total seconds into HH:MM:SS format.
 */
export const formatSeconds = (totalSeconds) => {
  const secs = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  const pad = (num) => String(num).padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Formats duration minutes into human readable text (e.g. 2h 30m or 45m).
 */
export const formatDuration = (totalMinutes) => {
  const mins = Math.max(0, Math.floor(totalMinutes || 0));
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours > 0) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
  return `${remainingMins}m`;
};

/**
 * Formats decimal hours (e.g., 2.5) to human readable string (e.g., 2h 30m).
 */
export const formatDecimalHours = (decimalHours) => {
  const totalMins = Math.round((Number(decimalHours) || 0) * 60);
  return formatDuration(totalMins);
};
