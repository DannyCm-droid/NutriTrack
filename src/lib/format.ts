export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export function formatMacro(value: number) {
  return round1(value).toLocaleString('es-MX', { maximumFractionDigits: 1 });
}

export function formatToday(timestamp = Date.now()) {
  const text = new Date(timestamp).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDay(timestamp: number) {
  const today = new Date();
  const date = new Date(timestamp);
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - date.getTime()) / 86400000);

  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';

  const text = new Date(timestamp).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
}

export function formatIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function startOfDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function daysUntil(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return 0;
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function sumMacros<T extends MacrosLike>(items: T[]) {
  return items.reduce(
    (total, item) => ({
      calories: total.calories + item.calories,
      protein: total.protein + item.protein,
      carbs: total.carbs + item.carbs,
      fat: total.fat + item.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

type MacrosLike = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
