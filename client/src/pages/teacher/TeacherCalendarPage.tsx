import { Suspense, useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { CourseListItem } from "../../types/course";
import type { CalendarEvent, CalendarSource } from "../../components/calendar/calendar.types";
import type { Task } from "../../types/task";
import { taskToCalendarEvent } from "../../utils/taskCalendarEvents";
import { lazyNamed } from "../../utils/lazyNamed";

const sourcePalette = ["#7c3aed", "#0ea5e9", "#059669", "#f59e0b", "#ef4444", "#14b8a6", "#8b5cf6", "#22c55e"];
const CalendarApp = lazyNamed(() => import("../../components/calendar/CalendarApp"), "CalendarApp");

export function TeacherCalendarPage() {
  const { user, api } = useAuth();
  const [items, setItems] = useState<Array<CourseListItem & { estado: string }>>([]);
  const [taskEvents, setTaskEvents] = useState<CalendarEvent[]>([]);
  const [sourceEnabledState, setSourceEnabledState] = useState<Record<string, boolean>>({
    personal: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<ApiResponse<{ items: Array<CourseListItem & { estado: string }> }>>(
          "/courses/my/teaching",
          { params: { page: 1, limit: 100 } }
        );
        setItems(res.data.data.items);
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
        items.map(async (course) => {
          const res = await api.get<ApiResponse<Task[]>>(`/tasks/course/${course.id}`);
          return res.data.data.map((task) =>
            taskToCalendarEvent(task, {
              sourceId: `teach:${course.id}`,
              courseTitle: course.titulo,
              taskUrl: `/teacher/course/${course.id}/tasks`,
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

    items.forEach((course, idx) => {
      const id = `teach:${course.id}`;
      next.push({
        id,
        name: course.titulo,
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

  const storageKey = useMemo(() => `cfuturo_calendar_events_teacher_${user?.id ?? "anon"}`, [user?.id]);

  return (
    <div className="space-y-4">
      <PageHeader title="Calendario" subtitle="Eventos y fechas de tus cursos" />
      <Suspense
        fallback={
          <Card className="grid min-h-[24rem] place-items-center">
            <Spinner />
          </Card>
        }
      >
        <CalendarApp
          storageKey={storageKey}
          sources={sources}
          externalEvents={taskEvents}
          onSourcesChange={handleSourcesChange}
          view="month"
        />
      </Suspense>
    </div>
  );
}
