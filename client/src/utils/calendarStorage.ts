import type { CalendarEvent } from "../components/calendar/calendar.types";

type Stored = {
  events: CalendarEvent[];
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadCalendarState(storageKey: string): Stored {
  const parsed = safeParse<Stored>(localStorage.getItem(storageKey));
  if (!parsed || !Array.isArray(parsed.events)) return { events: [] };
  return { events: parsed.events };
}

export function saveCalendarState(storageKey: string, next: Stored) {
  localStorage.setItem(storageKey, JSON.stringify(next));
}

