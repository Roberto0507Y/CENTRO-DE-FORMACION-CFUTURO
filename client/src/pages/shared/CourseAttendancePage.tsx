import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import type { AttendanceItem, AttendanceListResponse, AttendanceStatus } from "../../types/attendance";
import { getApiErrorMessage } from "../../utils/apiError";
import type { CourseManageOutletContext } from "./courseManage.types";

type Banner = { tone: "success" | "error"; text: string } | null;
const ATTENDANCE_PAGE_SIZE = 10;

function todayValue(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function statusBadge(s: AttendanceStatus) {
  if (s === "presente") return <Badge variant="green">Presente</Badge>;
  if (s === "tarde") return <Badge variant="amber">Tarde</Badge>;
  if (s === "justificado") return <Badge variant="blue">Justificado</Badge>;
  return <Badge variant="rose">Ausente</Badge>;
}

export function CourseAttendancePage() {
  const { api } = useAuth();
  const ctx = useOutletContext<CourseManageOutletContext>();

  const [date, setDate] = useState<string>(todayValue());
  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [draft, setDraft] = useState<
    Record<number, { estado: AttendanceStatus; comentario: string }>
  >({});

  const load = async (d: string) => {
    try {
      setLoading(true);
      setBanner(null);
      const res = await api.get<ApiResponse<AttendanceListResponse>>(
        `/courses/${ctx.courseId}/attendance`,
        { params: { date: d } }
      );
      setDate(res.data.data.date);
      setItems(res.data.data.items);
      const nextDraft: Record<number, { estado: AttendanceStatus; comentario: string }> = {};
      res.data.data.items.forEach((it) => {
        nextDraft[it.estudiante.id] = {
          estado: it.asistencia?.estado ?? "ausente",
          comentario: it.asistencia?.comentario ?? "",
        };
      });
      setDraft(nextDraft);
    } catch (err) {
      setItems([]);
      setDraft({});
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo cargar la asistencia.") });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.courseId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const full = `${it.estudiante.nombres} ${it.estudiante.apellidos} ${it.estudiante.correo}`.toLowerCase();
      return full.includes(q);
    });
  }, [items, search]);

  useEffect(() => {
    setPage(1);
  }, [date, items.length, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ATTENDANCE_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * ATTENDANCE_PAGE_SIZE;
    return filtered.slice(start, start + ATTENDANCE_PAGE_SIZE);
  }, [filtered, safePage]);
  const pageStart = filtered.length === 0 ? 0 : (safePage - 1) * ATTENDANCE_PAGE_SIZE + 1;
  const pageEnd = Math.min(filtered.length, safePage * ATTENDANCE_PAGE_SIZE);

  const totals = useMemo(() => {
    let presente = 0;
    let tarde = 0;
    let justificado = 0;
    let ausente = 0;
    items.forEach((it) => {
      const s = draft[it.estudiante.id]?.estado ?? "ausente";
      if (s === "presente") presente += 1;
      else if (s === "tarde") tarde += 1;
      else if (s === "justificado") justificado += 1;
      else ausente += 1;
    });
    return { presente, tarde, justificado, ausente, total: items.length };
  }, [draft, items]);

  const saveRows = async (
    rows: Array<{ estudiante_id: number; estado: AttendanceStatus; comentario: string | null }>,
    successText: string
  ) => {
    if (rows.length === 0) return;
    try {
      setSaving(true);
      setBanner(null);
      await api.post(`/courses/${ctx.courseId}/attendance`, { date, items: rows });
      setBanner({ tone: "success", text: successText });
    } catch (err) {
      setBanner({ tone: "error", text: getApiErrorMessage(err, "No se pudo guardar la asistencia.") });
      await load(date);
    } finally {
      setSaving(false);
    }
  };

  const updateStudentStatus = (studentId: number, estado: AttendanceStatus) => {
    const cur = draft[studentId] ?? { estado: "ausente" as AttendanceStatus, comentario: "" };
    setDraft((prev) => ({
      ...prev,
      [studentId]: { ...cur, estado },
    }));
    void saveRows(
      [
        {
          estudiante_id: studentId,
          estado,
          comentario: cur.comentario.trim() || null,
        },
      ],
      "Asistencia actualizada."
    );
  };

  const updateStudentComment = (studentId: number, comentario: string) => {
    const cur = draft[studentId] ?? { estado: "ausente" as AttendanceStatus, comentario: "" };
    setDraft((prev) => ({
      ...prev,
      [studentId]: { ...cur, comentario },
    }));
  };

  const saveStudentComment = (studentId: number) => {
    const cur = draft[studentId] ?? { estado: "ausente" as AttendanceStatus, comentario: "" };
    void saveRows(
      [
        {
          estudiante_id: studentId,
          estado: cur.estado,
          comentario: cur.comentario.trim() || null,
        },
      ],
      "Comentario actualizado."
    );
  };

  const setAll = (estado: AttendanceStatus) => {
    setDraft((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        const cur = next[it.estudiante.id] ?? { estado: "ausente" as AttendanceStatus, comentario: "" };
        next[it.estudiante.id] = { ...cur, estado };
      });
      return next;
    });
    void saveRows(
      items.map((it) => ({
        estudiante_id: it.estudiante.id,
        estado,
        comentario: (draft[it.estudiante.id]?.comentario ?? "").trim() || null,
      })),
      "Asistencia actualizada para todos."
    );
  };

  return (
    <div className="cf-course-scope grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 space-y-4">
        <Card className="overflow-hidden border-white/80 bg-white/88 shadow-[0_26px_80px_-56px_rgba(15,23,42,0.7)] dark:border-slate-800/80 dark:bg-slate-900/92">
          <div className="border-b border-slate-200 bg-white/90 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/90">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">Asistencia</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Registra la asistencia del curso <span className="font-semibold">“{ctx.courseTitle}”</span>.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[170px]" />
                <Button variant="secondary" onClick={() => void load(date)} disabled={saving}>
                  Buscar
                </Button>
              </div>
            </div>

            {banner ? (
              <div
                className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                  banner.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/35 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/35 dark:text-rose-200"
                }`}
                role="status"
              >
                {banner.text}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAll("presente")} disabled={saving}>
                Marcar todos presente
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAll("ausente")} disabled={saving}>
                Marcar todos ausente
              </Button>
              <div className="ml-auto w-full sm:w-auto">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar estudiante…"
                  className="w-full sm:w-[280px]"
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-6">
            {loading ? (
              <div className="grid place-items-center py-10">
                <Spinner />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                title="Sin estudiantes inscritos"
                description="No hay inscripciones activas para este curso."
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="Sin resultados"
                description="No encontramos estudiantes con ese filtro."
              />
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 md:hidden">
                  {paginated.map((it) => {
                    const sId = it.estudiante.id;
                    const cur = draft[sId] ?? { estado: "ausente" as AttendanceStatus, comentario: "" };
                    return (
                      <div
                        key={sId}
                        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
                      >
                        <div>
                          <div className="font-black text-slate-900 dark:text-slate-100">
                            {it.estudiante.apellidos}, {it.estudiante.nombres}
                          </div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{it.estudiante.correo}</div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Estado
                          </div>
                          <div className="mt-2 flex flex-col gap-2">
                            <div>{statusBadge(cur.estado)}</div>
                            <select
                              value={cur.estado}
                              disabled={saving}
                              onChange={(e) => updateStudentStatus(sId, e.target.value as AttendanceStatus)}
                              className="w-full rounded-xl border border-slate-200 bg-white/92 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-blue-500 transition-colors focus:ring-2 dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100"
                            >
                              <option value="presente">Presente</option>
                              <option value="ausente">Ausente</option>
                              <option value="tarde">Tarde</option>
                              <option value="justificado">Justificado</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Comentario
                          </div>
                          <textarea
                            value={cur.comentario}
                            disabled={saving}
                            onChange={(e) => updateStudentComment(sId, e.target.value)}
                            onBlur={() => saveStudentComment(sId)}
                            rows={3}
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-white/92 px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 transition-colors focus:ring-2 dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100"
                            placeholder="Opcional…"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-slate-800 md:block">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                      <tr className="[&>th]:px-4 [&>th]:py-3">
                        <th>Estudiante</th>
                        <th>Estado</th>
                        <th className="min-w-[260px]">Comentario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {paginated.map((it) => {
                        const sId = it.estudiante.id;
                        const cur = draft[sId] ?? { estado: "ausente" as AttendanceStatus, comentario: "" };
                        return (
                          <tr key={sId} className="[&>td]:px-4 [&>td]:py-3 align-top">
                            <td className="font-semibold text-slate-900 dark:text-slate-100">
                              {it.estudiante.apellidos}, {it.estudiante.nombres}
                              <div className="text-xs font-normal text-slate-500 dark:text-slate-400">{it.estudiante.correo}</div>
                            </td>
                            <td>
                              <div className="flex flex-col gap-2">
                                <div>{statusBadge(cur.estado)}</div>
                                <select
                                  value={cur.estado}
                                  disabled={saving}
                                  onChange={(e) => updateStudentStatus(sId, e.target.value as AttendanceStatus)}
                                  className="w-[190px] rounded-xl border border-slate-200 bg-white/92 px-3 py-2 text-sm font-semibold text-slate-900 outline-none ring-blue-500 transition-colors focus:ring-2 dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100"
                                >
                                  <option value="presente">Presente</option>
                                  <option value="ausente">Ausente</option>
                                  <option value="tarde">Tarde</option>
                                  <option value="justificado">Justificado</option>
                                </select>
                              </div>
                            </td>
                            <td>
                              <textarea
                                value={cur.comentario}
                                disabled={saving}
                                onChange={(e) => updateStudentComment(sId, e.target.value)}
                                onBlur={() => saveStudentComment(sId)}
                                rows={2}
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-white/92 px-4 py-3 text-sm text-slate-900 outline-none ring-blue-500 transition-colors focus:ring-2 dark:border-slate-700 dark:bg-slate-950/85 dark:text-slate-100"
                                placeholder="Opcional…"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Mostrando {pageStart}-{pageEnd} de {filtered.length} estudiantes
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <div className="rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-200 dark:ring-slate-800">
                      {safePage} / {totalPages}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </section>

      <aside className="min-w-0 space-y-4">
        <Card className="border-white/80 bg-white/88 p-5 shadow-[0_24px_72px_-52px_rgba(15,23,42,0.68)] dark:border-slate-800/80 dark:bg-slate-900/92">
          <div className="text-sm font-black text-slate-900 dark:text-slate-100">Resumen</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Para la fecha seleccionada</div>

          <div className="mt-4 grid gap-2">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/55">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Presentes</div>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100">{totals.presente}</div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/55">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Tarde</div>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100">{totals.tarde}</div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/55">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Justificado</div>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100">{totals.justificado}</div>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/55">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Ausentes</div>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100">{totals.ausente}</div>
            </div>
          </div>

          <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Total estudiantes: <span className="font-bold text-slate-700 dark:text-slate-200">{totals.total}</span>
          </div>
        </Card>
      </aside>
    </div>
  );
}
