// Un decimal: multiplica por 10, redondea al entero más cercano y divide entre 10.
export function round1(value: number) {
  return Math.round(value * 10) / 10;
}

// El mismo redondeo, escrito con el formato de números de es-MX.
export function formatMacro(value: number) {
  return round1(value).toLocaleString('es-MX', { maximumFractionDigits: 1 });
}

// Fecha larga en español. La primera letra queda en mayúscula.
// Si no llega un timestamp, usa el instante actual.
export function formatToday(timestamp = Date.now()) {
  const text = new Date(timestamp).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Compara el día del timestamp con hoy. Las dos fechas se ponen a medianoche local.
// La diferencia se redondea a días enteros: 0 es Hoy y 1 es Ayer. El resto se escribe como fecha.
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

// Hora y minutos en formato es-MX.
export function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Día y mes corto. La pantalla de progreso lo usa bajo cada barra.
export function formatShortDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  });
}

// Recibe una fecha AAAA-MM-DD. En JavaScript el mes empieza en 0, por eso se resta 1.
// Si el año, el mes o el día no es un número mayor que 0, devuelve el texto original.
export function formatIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Medianoche local de ese instante, en milisegundos. Inicio la usa para separar las comidas de hoy.
export function startOfDay(timestamp = Date.now()) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Días desde hoy hasta una fecha AAAA-MM-DD. Hoy vale 0 y una fecha pasada sale negativa.
// 86400000 son los milisegundos de un día. Si la fecha no se puede leer, devuelve 0.
export function daysUntil(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return 0;
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// Comprueba el texto AAAA-MM-DD y que ese día exista.
// Una fecha imposible, como 2026-02-31, no pasa: JavaScript la mueve a otro día y ya no coincide.
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

// Suma calorías, proteína, carbohidratos y grasa. Sirve para cualquier lista que traiga esos cuatro números.
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
