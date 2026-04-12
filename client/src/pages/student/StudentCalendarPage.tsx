import { PageHeader } from "../../components/ui/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { MyEnrollmentItem } from "../../types/enrollment";
import type { CalendarEvent, CalendarSource } from "../../components/calendar/calendar.types";
import type { Task } from "../../types/task";
import { CalendarApp } from "../../components/calendar/CalendarApp";
import { taskToCalendarEvent } from "../../utils/taskCalendarEvents";

const sourcePalette = ["#7c3aed", "#0ea5e9", "#059669", "#f59e0b", "#ef4444", "#14b8a6", "#8b5cf6", "#22c55e"];

export function StudentCalendarPage() {
  const { user, api } = useAuth();
  const [items, setItems] = useState<MyEnrollmentItem[]>([]);
  const [taskEvents, setTaskEvents] = useState<CalendarEvent[]>([]);
  const [sourceEnabledState, setSourceEnabledState] = useState<Record<string, boolean>>({
    personal: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ApiResponse<MyEnrollmentItem[]>>("/enrollments/my-courses");
        setItems(res.data.data);
      } catch {
        setItems([]);
      }
    })();
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (items.length === 0) {
        if (!cancelled) setTaskEvents([]);
        return;
      }

      const results = await Promise.allSettled(
        items.map(async (enrollment) => {
          const res = await api.get<ApiResponse<Task[]>>(`/tasks/course/${enrollment.curso.id}`);
          return res.data.data.map((task) =>
            taskToCalendarEvent(task, {
              sourceId: `course:${enrollment.curso.id}`,
              courseTitle: enrollment.curso.titulo,
              taskUrl: `/student/course/${enrollment.curso.id}/tasks`,
            }),
          );
        }),
      );

      if (cancelled) return;
      setTaskEvents(results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
    })();

    return () => {
      cancelled = true;
    };
  }, [api, items]);

  const sources = useMemo<CalendarSource[]>(() => {
    const next: CalendarSource[] = [
      {
        id: "personal",
        name: "Mi calendario",
        color: "#2563eb",
        enabled: sourceEnabledState.personal ?? true,
      },
    ];

    items.forEach((enrollment, idx) => {
      const id = `course:${enrollment.curso.id}`;
      next.push({
        id,
        name: enrollment.curso.titulo,
        color: sourcePalette[idx % sourcePalette.length] ?? "#0ea5e9",
        enabled: sourceEnabledState[id] ?? true,
      });
    });

    return next;
  }, [items, sourceEnabledState]);

  const handleSourcesChange = (next: CalendarSource[]) => {
    setSourceEnabledState((prev) => {
      const draft = { ...prev };
      for (const source of next) {
        draft[source.id] = source.enabled;
      }
      return draft;
    });
  };

  const storageKey = useMemo(() => `cfuturo_calendar_events_student_${user?.id ?? "anon"}`, [user?.id]);

  return (
    <div className="space-y-4">
      <PageHeader title="Calendario" subtitle="Fechas importantes" />
      <CalendarApp
        storageKey={storageKey}
        sources={sources}
        externalEvents={taskEvents}
        onSourcesChange={handleSourcesChange}
        view="month"
      />
    </div>
  );
}
