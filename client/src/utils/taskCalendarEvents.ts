import type { CalendarEvent } from "../components/calendar/calendar.types";
import type { Task } from "../types/task";

function splitMysqlDateTime(value: string): { date: string; time?: string } {
  const normalized = value.replace("T", " ");
  const [date = "", rawTime = ""] = normalized.split(" ");
  const time = rawTime.slice(0, 5);
  return {
    date: date.slice(0, 10),
    time: /^\d{2}:\d{2}$/.test(time) ? time : undefined,
  };
}

export function taskToCalendarEvent(
  task: Task,
  options: {
    sourceId: string;
    courseTitle?: string;
    taskUrl: string;
  },
): CalendarEvent {
  const due = splitMysqlDateTime(task.fecha_entrega);
  const now = task.updated_at || task.created_at || new Date().toISOString();

  return {
    id: `task:${task.id}:due`,
    calendarId: options.sourceId,
    title: `Entrega: ${task.titulo}`,
    description: options.courseTitle
      ? `Fecha de entrega de la tarea en ${options.courseTitle}.`
      : "Fecha de entrega de la tarea.",
    date: due.date,
    allDay: !due.time,
    startTime: due.time,
    createdAt: task.created_at || now,
    updatedAt: task.updated_at || now,
    readOnly: true,
    url: options.taskUrl,
  };
}

