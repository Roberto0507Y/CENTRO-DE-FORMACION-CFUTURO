import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import { getApiErrorMessage } from "../../utils/apiError";
import type { CourseManageOutletContext } from "./courseManage.types";

type CourseStudentItem = {
  usuario_id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  foto_url: string | null;
  progreso: string;
  tipo_inscripcion: "gratis" | "pagada";
  fecha_inscripcion: string;
};

export function CourseStudentsPage() {
  const { api } = useAuth();
  const ctx = useOutletContext<CourseManageOutletContext>();

  const [items, setItems] = useState<CourseStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get<ApiResponse<CourseStudentItem[]>>(`/enrollments/course/${ctx.courseId}/students`);
      setItems(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      setItems([]);
      setError(getApiErrorMessage(err, "No se pudo cargar el listado de estudiantes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.courseId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) => `${s.nombres} ${s.apellidos} ${s.correo}`.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-base font-black text-slate-900">Estudiantes</div>
            <div className="mt-1 text-sm text-slate-600">
              Inscripciones activas · <span className="font-semibold">{ctx.courseTitle}</span>
            </div>
          </div>
          <div className="w-full md:w-[360px]">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar estudiante…" />
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="grid place-items-center py-10">
          <Spinner />
        </Card>
      ) : error ? (
        <Card className="p-6">
          <EmptyState title="No se pudo cargar" description={error} actionLabel="Reintentar" onAction={() => void load()} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="Sin estudiantes inscritos"
            description={items.length === 0 ? "No hay inscripciones activas para este curso." : "No hay resultados con ese filtro."}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Estudiante</th>
                  <th className="px-6 py-3">Progreso</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.usuario_id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                          {s.foto_url ? (
                            <img src={s.foto_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-black text-slate-600">
                              {(s.nombres?.[0] ?? "E").toUpperCase()}
                              {(s.apellidos?.[0] ?? "S").toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-black text-slate-900">
                            {s.apellidos}, {s.nombres}
                          </div>
                          <div className="truncate text-xs text-slate-500">{s.correo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">{s.progreso}%</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                        {s.tipo_inscripcion}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{s.fecha_inscripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

