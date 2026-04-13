import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { ConfirmDeleteModal } from "../ui/ConfirmDeleteModal";
import type { CalendarEvent, CalendarSource, CalendarViewMode } from "./calendar.types";
import {
  WEEKDAYS_ES,
  addDays,
  createId,
  endOfMonth,
  formatYmd,
  isSameDay,
  isToday,
  miniMonthLabel,
  monthLabel,
  pad2,
  parseYmd,
  sortEvents,
  startOfMonth,
  startOfWeek,
  withinInclusive,
} from "./calendar.utils";
import { loadCalendarState, saveCalendarState } from "../../utils/calendarStorage";

type Props = {
  storageKey: string;
  sources: CalendarSource[];
  externalEvents?: CalendarEvent[];
  view?: CalendarViewMode;
  onSourcesChange?: (next: CalendarSource[]) => void;
};

type ModalState =
  | { open: false }
  | {
      open: true;
      mode: "create" | "edit" | "view" | "day";
      eventId?: string;
      presetDate?: string; // YYYY-MM-DD
    };

function classNames(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function ColorDot({ color }: { color: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />;
}

function ButtonGroup({
  value,
  onChange,
}: {
  value: CalendarViewMode;
  onChange: (v: CalendarViewMode) => void;
}) {
  const items: Array<{ id: CalendarViewMode; label: string }> = [
    { id: "week", label: "Semana" },
    { id: "month", label: "Mes" },
    { id: "agenda", label: "Agenda" },
  ];
  return (
    <div className="inline-flex rounded-[1rem] border border-slate-200/80 bg-white/90 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-black/20">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className={classNames(
              "rounded-lg px-3 py-2 text-xs font-extrabold transition",
              active
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/35" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-start justify-center p-4 md:p-8 overflow-hidden">
        <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/95 shadow-[0_36px_120px_-70px_rgba(15,23,42,0.8)] ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-950/95 dark:ring-white/10 dark:shadow-[0_36px_120px_-64px_rgba(2,6,23,0.95)]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/90">
            <div className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Cerrar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="p-5 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function CalendarApp({ storageKey, sources, externalEvents = [], view = "month", onSourcesChange }: Props) {
  const [mode, setMode] = useState<CalendarViewMode>(view);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(() => new Date());
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [deletePromptOpen, setDeletePromptOpen] = useState(false);

  const [events, setEvents] = useState<CalendarEvent[]>(() => loadCalendarState(storageKey).events);

  useEffect(() => {
    saveCalendarState(storageKey, { events });
  }, [events, storageKey]);

  const allEvents = useMemo(() => [...events, ...externalEvents], [events, externalEvents]);
  const enabledCalendarIds = useMemo(() => new Set(sources.filter((s) => s.enabled).map((s) => s.id)), [sources]);
  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s] as const)), [sources]);

  const range = useMemo(() => {
    if (mode === "week") {
      const s = startOfWeek(selected, 1);
      const e = addDays(s, 6);
      return { start: formatYmd(s), end: formatYmd(e) };
    }
    if (mode === "agenda") {
      const s = startOfMonth(cursor);
      const e = endOfMonth(cursor);
      return { start: formatYmd(s), end: formatYmd(e) };
    }
    const s = startOfMonth(cursor);
    const e = endOfMonth(cursor);
    return { start: formatYmd(s), end: formatYmd(e) };
  }, [cursor, mode, selected]);

  const visibleEvents = useMemo(() => {
    return allEvents
      .filter((e) => enabledCalendarIds.has(e.calendarId))
      .filter((e) => withinInclusive(e.date, range.start, range.end))
      .slice()
      .sort(sortEvents);
  }, [allEvents, enabledCalendarIds, range.end, range.start]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of visibleEvents) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [visibleEvents]);

  const openCreate = (date?: Date) => {
    const targetDate = date ? formatYmd(date) : formatYmd(new Date());
    setForm((prev) => ({
      ...prev,
      title: "",
      date: targetDate,
      calendarId: sources.find((s) => s.enabled)?.id ?? sources[0]?.id ?? prev.calendarId,
      allDay: true,
      startTime: "09:00",
      endTime: "10:00",
    }));
    setModal({
      open: true,
      mode: "create",
      presetDate: targetDate,
    });
  };

  const openEdit = (eventId: string) => {
    const event = allEvents.find((e) => e.id === eventId);
    if (event?.readOnly) {
      setModal({ open: true, mode: "view", eventId });
      return;
    }
    if (event) {
      setForm({
        title: event.title,
        date: event.date,
        calendarId: event.calendarId,
        allDay: event.allDay,
        startTime: event.startTime ?? "09:00",
        endTime: event.endTime ?? "10:00",
      });
    }
    setModal({ open: true, mode: "edit", eventId });
  };
  const closeModal = () => {
    setDeletePromptOpen(false);
    setModal({ open: false });
  };

  const openDayEvents = (date: Date) => {
    setSelected(date);
    setModal({ open: true, mode: "day", presetDate: formatYmd(date) });
  };

  const goToday = () => {
    const now = new Date();
    setSelected(now);
    setCursor(startOfMonth(now));
  };

  const goPrev = () => {
    if (mode === "week") {
      const d = addDays(selected, -7);
      setSelected(d);
      setCursor(startOfMonth(d));
    } else {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
    }
  };

  const goNext = () => {
    if (mode === "week") {
      const d = addDays(selected, 7);
      setSelected(d);
      setCursor(startOfMonth(d));
    } else {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
    }
  };

  const toggleSource = (id: string) => {
    const next = sources.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    onSourcesChange?.(next);
  };

  const modalEvent = useMemo(() => {
    if (!modal.open || (modal.mode !== "edit" && modal.mode !== "view") || !modal.eventId) return null;
    return allEvents.find((e) => e.id === modal.eventId) ?? null;
  }, [allEvents, modal]);

  const modalDayEvents = useMemo(() => {
    if (!modal.open || modal.mode !== "day" || !modal.presetDate) return [];
    return allEvents
      .filter((e) => e.date === modal.presetDate)
      .filter((e) => enabledCalendarIds.has(e.calendarId))
      .slice()
      .sort(sortEvents);
  }, [allEvents, enabledCalendarIds, modal]);

  const [form, setForm] = useState<{
    title: string;
    date: string;
    calendarId: string;
    allDay: boolean;
    startTime: string;
    endTime: string;
  }>({
    title: "",
    date: formatYmd(new Date()),
    calendarId: sources[0]?.id ?? "personal",
    allDay: true,
    startTime: "09:00",
    endTime: "10:00",
  });

  const saveEvent = () => {
    const title = form.title.trim();
    if (!title) return;
    if (!form.calendarId) return;
    const now = new Date().toISOString();
    if (modal.open && modal.mode === "edit" && modalEvent) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === modalEvent.id
            ? {
                ...e,
                title,
                date: form.date,
                calendarId: form.calendarId,
                allDay: form.allDay,
                startTime: form.allDay ? undefined : form.startTime,
                endTime: form.allDay ? undefined : form.endTime,
                updatedAt: now,
              }
            : e
        )
      );
      closeModal();
      return;
    }
    const id = createId();
    const ev: CalendarEvent = {
      id,
      calendarId: form.calendarId,
      title,
      date: form.date,
      allDay: form.allDay,
      startTime: form.allDay ? undefined : form.startTime,
      endTime: form.allDay ? undefined : form.endTime,
      createdAt: now,
      updatedAt: now,
    };
    setEvents((prev) => [...prev, ev]);
    closeModal();
  };

  const deleteEvent = () => {
    if (!modal.open || modal.mode !== "edit" || !modalEvent) return;
    setEvents((prev) => prev.filter((e) => e.id !== modalEvent.id));
    setDeletePromptOpen(false);
    closeModal();
  };

  // Mini month grid
  const miniDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), 1);
    const end = addDays(startOfWeek(endOfMonth(cursor), 1), 6);
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [cursor]);

  // Main month grid
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), 1);
    const end = addDays(startOfWeek(endOfMonth(cursor), 1), 6);
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const s = startOfWeek(selected, 1);
    return Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }, [selected]);

  return (
    <div className="cf-calendar-scope grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0">
        <Card className="overflow-hidden border-white/80 bg-white/88 shadow-[0_26px_90px_-56px_rgba(15,23,42,0.48)] dark:border-slate-800 dark:bg-slate-900/92 dark:shadow-[0_26px_90px_-56px_rgba(2,6,23,0.92)]">
          <div className="border-b border-slate-200 bg-white/90 px-4 py-3 md:px-5 dark:border-slate-800 dark:bg-slate-950/90">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={goToday}>
                  Hoy
                </Button>
                <div className="inline-flex rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={goPrev}
                    className="rounded-l-xl px-3 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    aria-label="Anterior"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="rounded-r-xl px-3 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                    aria-label="Siguiente"
                  >
                    →
                  </button>
                </div>
                <div className="ml-1 text-sm font-extrabold capitalize text-slate-900 dark:text-white">
                  {mode === "week"
                    ? `${monthLabel(selected)}`
                    : `${monthLabel(cursor)}`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ButtonGroup value={mode} onChange={setMode} />
                <Button variant="primary" onClick={() => openCreate(selected)}>
                  + Evento
                </Button>
              </div>
            </div>
          </div>

          {mode === "month" ? (
            <div className="bg-white/80 dark:bg-slate-950/85">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                {WEEKDAYS_ES.map((d) => (
                  <div key={d} className="px-3 py-2 text-xs font-extrabold text-slate-600 dark:text-slate-400">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {monthDays.map((d) => {
                  const ymd = formatYmd(d);
                  const inMonth = d.getMonth() === cursor.getMonth();
                  const dayEvents = eventsByDate.get(ymd) ?? [];
                  const show = dayEvents.slice(0, 2);
                  const extra = Math.max(0, dayEvents.length - show.length);

                  return (
                    <button
                      key={ymd}
                      type="button"
                      onClick={() => setSelected(d)}
                      onDoubleClick={() => openCreate(d)}
                      className={classNames(
                        "min-h-[120px] border-b border-r border-slate-200 p-2 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 dark:border-slate-800 dark:hover:bg-slate-900/70",
                        !inMonth && "bg-slate-50/60 dark:bg-slate-900/45"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={classNames(
                            "grid h-7 w-7 place-items-center rounded-lg text-xs font-extrabold",
                            isSameDay(d, selected)
                              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                              : isToday(d)
                                ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-cyan-400/10 dark:text-cyan-200 dark:ring-cyan-300/20"
                                : "text-slate-800 dark:text-slate-200"
                          )}
                        >
                          {d.getDate()}
                        </div>
                        {isToday(d) ? (
                          <span className="text-[11px] font-bold text-blue-700 dark:text-cyan-300">Hoy</span>
                        ) : null}
                      </div>

                      <div className="mt-2 grid gap-1">
                        {show.map((ev) => {
                          const src = sourceById.get(ev.calendarId);
                          return (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(ev.id);
                              }}
                              className="w-full truncate rounded-lg bg-white px-2 py-1 text-left text-[11px] font-extrabold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"
                              title={ev.title}
                              style={{
                                borderLeft: `4px solid ${src?.color ?? "#0ea5e9"}`,
                              }}
                            >
                              {ev.title}
                            </button>
                          );
                        })}
                        {extra > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDayEvents(d);
                            }}
                            className="text-left text-[11px] font-bold text-blue-700 hover:underline dark:text-cyan-300"
                          >
                            +{extra} más
                          </button>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : mode === "week" ? (
            <div className="bg-white/80 dark:bg-slate-950/85">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
                {weekDays.map((d, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelected(d)}
                    className={classNames(
                      "px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-900/70",
                      isSameDay(d, selected) && "bg-slate-50 dark:bg-slate-900"
                    )}
                  >
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{WEEKDAYS_ES[idx]}</div>
                    <div className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white">
                      {d.getDate()}/{pad2(d.getMonth() + 1)}
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {weekDays.map((d) => {
                  const ymd = formatYmd(d);
                  const dayEvents = (eventsByDate.get(ymd) ?? []).slice().sort(sortEvents);
                  return (
                    <div key={ymd} className="min-h-[420px] border-r border-slate-200 p-2 last:border-r-0 dark:border-slate-800">
                      <div className="grid gap-1">
                        {dayEvents.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400">
                            Sin eventos
                          </div>
                        ) : (
                          dayEvents.map((ev) => {
                            const src = sourceById.get(ev.calendarId);
                            return (
                              <button
                                key={ev.id}
                                type="button"
                                onClick={() => openEdit(ev.id)}
                                className="w-full rounded-xl bg-white px-3 py-2 text-left text-xs font-extrabold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"
                                style={{ borderLeft: `4px solid ${src?.color ?? "#0ea5e9"}` }}
                              >
                                <div className="truncate">{ev.title}</div>
                                <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                  {ev.allDay ? "Todo el día" : `${ev.startTime ?? "—"} - ${ev.endTime ?? "—"}`}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white/80 p-4 md:p-5 dark:bg-slate-950/85">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Agenda · {monthLabel(cursor)}
              </div>
              <div className="mt-3 grid gap-2">
                {visibleEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                    No hay eventos para este periodo.
                  </div>
                ) : (
                  visibleEvents.map((ev) => {
                    const src = sourceById.get(ev.calendarId);
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => openEdit(ev.id)}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-slate-900 truncate dark:text-white">{ev.title}</div>
                          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {parseYmd(ev.date).toLocaleDateString("es-GT", {
                              weekday: "short",
                              day: "2-digit",
                              month: "short",
                            })}{" "}
                            · {ev.allDay ? "Todo el día" : `${ev.startTime ?? "—"} - ${ev.endTime ?? "—"}`}
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                          <ColorDot color={src?.color ?? "#0ea5e9"} />
                          <span className="hidden sm:inline">{src?.name ?? "Calendario"}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </Card>
      </section>

      <aside className="space-y-4">
        <Card className="overflow-hidden border-white/80 bg-white/88 dark:border-slate-800 dark:bg-slate-900/92">
          <div className="border-b border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/90">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                className="rounded-xl px-2 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Mes anterior"
              >
                ‹
              </button>
              <div className="text-sm font-extrabold capitalize text-slate-900 dark:text-white">{miniMonthLabel(cursor)}</div>
              <button
                type="button"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                className="rounded-xl px-2 py-2 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                aria-label="Mes siguiente"
              >
                ›
              </button>
            </div>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
              {WEEKDAYS_ES.map((d) => (
                <div key={d}>{d.slice(0, 3)}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {miniDays.map((d) => {
                const inMonth = d.getMonth() === cursor.getMonth();
                const active = isSameDay(d, selected);
                const today = isToday(d);
                return (
                  <button
                    key={formatYmd(d)}
                    type="button"
                    onClick={() => {
                      setSelected(d);
                      setCursor(startOfMonth(d));
                    }}
                    className={classNames(
                      "grid h-8 place-items-center rounded-xl text-[11px] font-extrabold transition",
                      active
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                        : today
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-cyan-400/10 dark:text-cyan-200 dark:ring-cyan-300/20"
                          : inMonth
                            ? "text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                            : "text-slate-400 hover:bg-slate-50 dark:text-slate-600 dark:hover:bg-slate-900"
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden border-white/80 bg-white/88 dark:border-slate-800 dark:bg-slate-900/92">
          <div className="border-b border-slate-200 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/90">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Calendarios</div>
          </div>
          <div className="p-4">
            <div className="grid gap-2">
              {sources.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSource(s.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <ColorDot color={s.color} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{s.enabled ? "Visible" : "Oculto"}</div>
                    </div>
                  </div>
                  <span
                    className={classNames(
                      "rounded-full px-3 py-1 text-xs font-extrabold ring-1",
                      s.enabled
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                        : "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
                    )}
                  >
                    {s.enabled ? "ON" : "OFF"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </aside>

      <Modal
        open={modal.open}
        title={
          modal.open && modal.mode === "view"
            ? "Detalle de evento"
            : modal.open && modal.mode === "day"
              ? "Eventos del día"
            : modal.open && modal.mode === "edit"
              ? "Editar evento"
              : "Nuevo evento"
        }
        onClose={closeModal}
      >
        {modal.open && modal.mode === "day" ? (
          <div className="grid gap-4">
            <div className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
              {modal.presetDate
                ? parseYmd(modal.presetDate).toLocaleDateString("es-GT", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : ""}
            </div>

            <div className="grid gap-2">
              {modalDayEvents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                  No hay eventos visibles para este día.
                </div>
              ) : (
                modalDayEvents.map((ev) => {
                  const src = sourceById.get(ev.calendarId);
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        if (ev.readOnly) {
                          setModal({ open: true, mode: "view", eventId: ev.id });
                          return;
                        }
                        openEdit(ev.id);
                      }}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                    >
                      <div className="min-w-0">
                        <div className="line-clamp-2 text-sm font-extrabold text-slate-900 dark:text-white">{ev.title}</div>
                        <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          {ev.allDay ? "Todo el día" : `${ev.startTime ?? "—"}${ev.endTime ? ` - ${ev.endTime}` : ""}`}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                        <ColorDot color={src?.color ?? "#0ea5e9"} />
                        <span className="hidden sm:inline">{src?.name ?? "Calendario"}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={closeModal}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : modal.open && modal.mode === "view" && modalEvent ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
                <ColorDot color={sourceById.get(modalEvent.calendarId)?.color ?? "#0ea5e9"} />
                {sourceById.get(modalEvent.calendarId)?.name ?? "Calendario"}
              </div>
              <div className="mt-3 text-lg font-black text-slate-950 dark:text-white">{modalEvent.title}</div>
              {modalEvent.description ? (
                <div className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{modalEvent.description}</div>
              ) : null}
              <div className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {parseYmd(modalEvent.date).toLocaleDateString("es-GT", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
                {" · "}
                {modalEvent.allDay
                  ? "Todo el día"
                  : `${modalEvent.startTime ?? "—"}${modalEvent.endTime ? ` - ${modalEvent.endTime}` : ""}`}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={closeModal}>
                Cerrar
              </Button>
              {modalEvent.url ? (
                <a href={modalEvent.url}>
                  <Button variant="primary">Abrir tarea</Button>
                </a>
              ) : null}
            </div>
          </div>
        ) : (
        <div className="grid gap-3">
          <div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Título</div>
            <div className="mt-1">
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ej: Quiz de Matemática"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Fecha</div>
              <div className="mt-1">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Calendario</div>
              <div className="mt-1">
                <select
                  value={form.calendarId}
                  onChange={(e) => setForm((p) => ({ ...p, calendarId: e.target.value }))}
                  className="w-full rounded-[1rem] border border-slate-200/80 bg-white/92 px-3 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.48)] outline-none transition focus:ring-4 focus:ring-blue-500/15 dark:border-slate-800 dark:bg-slate-900/92 dark:text-slate-100 dark:shadow-[0_20px_40px_-34px_rgba(2,6,23,0.95)] dark:focus:ring-cyan-400/15"
                >
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-700"
              checked={form.allDay}
              onChange={(e) => setForm((p) => ({ ...p, allDay: e.target.checked }))}
            />
            Todo el día
          </label>

          {!form.allDay ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Inicio</div>
                <div className="mt-1">
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Fin</div>
                <div className="mt-1">
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {modal.open && modal.mode === "edit" ? (
                <Button variant="danger" onClick={() => setDeletePromptOpen(true)}>
                  Eliminar
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={closeModal}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={saveEvent}
                disabled={!form.title.trim() || !form.date || !form.calendarId}
              >
                Guardar
              </Button>
            </div>
          </div>
        </div>
        )}
      </Modal>

      <ConfirmDeleteModal
        open={deletePromptOpen}
        title="¿Eliminar evento?"
        description={`Vas a eliminar "${modalEvent?.title ?? "este evento"}".\nEsta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onCancel={() => setDeletePromptOpen(false)}
        onConfirm={deleteEvent}
      />
    </div>
  );
}
