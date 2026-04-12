export type CalendarViewMode = "week" | "month" | "agenda";

export type CalendarSource = {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
};

export type CalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  allDay: boolean;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  readOnly?: boolean;
  url?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
};
