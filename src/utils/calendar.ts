export const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function weekKey(now = Date.now()): string {
  const date = new Date(now);
  const weekday = (date.getUTCDay() + 6) % 7;
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - weekday);
  return date.toISOString().slice(0, 10);
}

export function nextDayAt(now = Date.now()): number {
  const date = new Date(now);
  date.setUTCHours(24, 0, 0, 0);
  return date.getTime();
}

export function nextWeekAt(now = Date.now()): number {
  return Date.parse(`${weekKey(now)}T00:00:00Z`) + 7 * DAY_MS;
}

export function remainingTime(end: number, now = Date.now()): string {
  const minutes = Math.max(0, Math.ceil((end - now) / 60000));
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  return days > 0 ? `${days}g ${hours}sa` : `${hours}sa ${mins}dk`;
}