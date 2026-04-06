export const formatDateDDMMYYYY = (value, fallback = '-') => {
  if (!value) return fallback;

  const raw = String(value).slice(0, 10);
  const parts = raw.split('-');
  if (parts.length !== 3) return fallback;

  const [year, month, day] = parts;
  if (!year || !month || !day) return fallback;

  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
};

export const formatDateTimeDDMMYYYY = (value, fallback = '-') => {
  if (!value) return fallback;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};
