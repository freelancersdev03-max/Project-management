const RC7_PREVIEW_PREFIX = 'rc7_preview';
const RC7_PREVIEW_LATEST_KEY = `${RC7_PREVIEW_PREFIX}:latest`;

export const formatRc7PreviewDateTime = (isoString) => {
  if (!isoString) return '';

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const getRc7PreviewStorageKey = ({ employeeId = '', planType = '', submittedAt = '' } = {}) => {
  const normalizedEmployeeId = String(employeeId || '').trim();
  const normalizedType = String(planType || '').trim().toLowerCase();
  const normalizedTimestamp = String(submittedAt || '').trim();

  if (!normalizedEmployeeId || !normalizedType || !normalizedTimestamp) {
    return '';
  }

  return `${RC7_PREVIEW_PREFIX}:${normalizedEmployeeId}:${normalizedType}:${normalizedTimestamp}`;
};

export const saveRc7PreviewSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') return;

  try {
    const serialized = JSON.stringify(snapshot);
    localStorage.setItem(RC7_PREVIEW_LATEST_KEY, serialized);

    const scopedKey = getRc7PreviewStorageKey(snapshot);
    if (scopedKey) {
      localStorage.setItem(scopedKey, serialized);
      localStorage.setItem(`${RC7_PREVIEW_PREFIX}:latest:${snapshot.employeeId}:${snapshot.planType}`, serialized);
    }
  } catch (error) {
    console.error('Failed to save RC7 preview snapshot:', error);
  }
};

export const loadRc7PreviewSnapshot = ({ employeeId = '', planType = '', submittedAt = '' } = {}) => {
  try {
    const scopedKey = getRc7PreviewStorageKey({ employeeId, planType, submittedAt });
    if (scopedKey) {
      const scopedValue = localStorage.getItem(scopedKey);
      if (scopedValue) return JSON.parse(scopedValue);
    }

    const latestScopedKey = employeeId && planType
      ? `${RC7_PREVIEW_PREFIX}:latest:${String(employeeId).trim()}:${String(planType).trim().toLowerCase()}`
      : '';

    if (latestScopedKey) {
      const latestScopedValue = localStorage.getItem(latestScopedKey);
      if (latestScopedValue) return JSON.parse(latestScopedValue);
    }

    const latestValue = localStorage.getItem(RC7_PREVIEW_LATEST_KEY);
    return latestValue ? JSON.parse(latestValue) : null;
  } catch (error) {
    console.error('Failed to load RC7 preview snapshot:', error);
    return null;
  }
};
