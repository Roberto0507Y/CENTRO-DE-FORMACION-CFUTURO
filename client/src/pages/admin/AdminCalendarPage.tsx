import { PageHeader } from "../../components/ui/PageHeader";
import { useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import type { CalendarSource } from "../../components/calendar/calendar.types";
import { CalendarApp } from "../../components/calendar/CalendarApp";

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
      <CalendarApp storageKey={storageKey} sources={sources} onSourcesChange={setSources} view="month" />
    </div>
  );
}
