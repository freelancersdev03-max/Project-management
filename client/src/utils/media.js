import api from '../api';

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || api.defaults.baseURL || '').replace(/\/+$/, '');

export const resolveMediaUrl = (assetPath) => {
  if (!assetPath) return '';

  const normalizedPath = String(assetPath).trim();
  if (!normalizedPath) return '';

  if (/^(https?:)?\/\//i.test(normalizedPath) || normalizedPath.startsWith('data:') || normalizedPath.startsWith('blob:')) {
    return normalizedPath;
  }

  const prefixedPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return API_ORIGIN ? `${API_ORIGIN}${prefixedPath}` : prefixedPath;
};

export const getDisplayInitial = (...candidates) => {
  for (const candidate of candidates) {
    const normalized = String(candidate || '').trim();
    if (normalized) {
      return normalized.charAt(0).toUpperCase();
    }
  }

  return 'U';
};