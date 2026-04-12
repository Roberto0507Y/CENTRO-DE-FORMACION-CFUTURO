import type { CalendarEvent } from "./calendar.types";

export const WEEKDAYS_ES = ["LUN.", "MAR.", "MIÉ.", "JUE.", "VIE.", "SÁB.", "DOM."] as const;

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map((v) => Number(v));
  // Local midnight
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 0, 0, 0, 0);
}

// weekStart = 1 (Monday). JS: 0 Sunday ... 6 Saturday
export function startOfWeek(date: Date, weekStart = 1) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day - weekStart + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isToday(date: Date) {
  return isSameDay(date, new Date());
}

export function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-GT", { month: "long", year: "numeric" }).format(date);
}

export function miniMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("es-GT", { month: "long", year: "numeric" }).format(date);
}

export function createId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export function sortEvents(a: CalendarEvent, b: CalendarEvent) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const ta = a.allDay ? "00:00" : a.startTime ?? "99:99";
  const tb = b.allDay ? "00:00" : b.startTime ?? "99:99";
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.title.localeCompare(b.title);
}

export function withinInclusive(dateYmd: string, startYmd: string, endYmd: string) {
  return dateYmd >= startYmd && dateYmd <= endYmd;
}

