import { Suspense, useMemo, useState } from "react";
import { Card } from "../../components/ui/Card";
import { useAuth } from "../../hooks/useAuth";
import type { CalendarSource } from "../../components/calendar/calendar.types";
import { PageHeader } from "../../components/ui/PageHeader";
import { Spinner } from "../../components/ui/Spinner";
import { lazyNamed } from "../../utils/lazyNamed";

const CalendarApp = lazyNamed(() => import("../../components/calendar/CalendarApp"), "CalendarApp");

export function AdminCalendarPage() {
  const { user } = useAuth();
  const [sources, setSources] = useState<CalendarSource[]>([
    { id: "personal", name: "Mi calendario", color: "#2563eb", enabled: true },
    { id: "system", name: "Sistema", color: "#f59e0b", enabled: true },
  ]);
  const storageKey = useMemo(() => `cfuturo_calendar_events_admin_${user?.id ?? "anon"}`, [user?.id]);
  return (
    <div className="space-y-4">
      <PageHeader title="Calendario" subtitle="Gestión (admin)" />
      <Suspense
        fallback={
          <Card className="grid min-h-[24rem] place-items-center">
            <Spinner />
          </Card>
        }
      >
        <CalendarApp storageKey={storageKey} sources={sources} onSourcesChange={setSources} view="month" />
      </Suspense>
    </div>
  );
}
