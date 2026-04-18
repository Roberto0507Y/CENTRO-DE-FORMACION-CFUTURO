import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmDeleteModal } from "../../components/ui/ConfirmDeleteModal";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PaginationControls } from "../../components/ui/PaginationControls";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";
import type { ApiResponse } from "../../types/api";
import { getApiErrorMessage } from "../../utils/apiError";
import type { CourseManageOutletContext } from "./courseManage.types";

const PAGE_SIZE = 10;

type CourseStudentItem = {
  id: number;
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
  const toast = useToast();
  const ctx = useOutletContext<CourseManageOutletContext>();

  const [items, setItems] = useState<CourseStudentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [page, setPage] = useState(1);
  const [pendingExpelStudent, setPendingExpelStudent] = useState<CourseStudentItem | null>(null);
  const [expellingId, setExpellingId] = useState<number | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get<ApiResponse<CourseStudentItem[]>>(`/enrollments/course/${ctx.courseId}/students`, {
          signal,
        });
        if (signal?.aborted) return;
        setItems(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        if ((err as { code?: string }).code === "ERR_CANCELED" || signal?.aborted) return;
        setItems([]);
        setError(getApiErrorMessage(err, "No se pudo cargar el listado de estudiantes."));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [api, ctx.courseId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const filtered = useMemo(() => {
    const q = deferredSearch;
    if (!q) return items;
    return items.filter((s) => `${s.nombres} ${s.apellidos} ${s.correo}`.toLowerCase().includes(q));
  }, [deferredSearch, items]);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const expelStudent = async (student: CourseStudentItem) => {
    try {
      setExpellingId(student.id);
      await api.delete<ApiResponse<{ id: number }>>(`/enrollments/${student.id}`);
      setItems((current) => current.filter((item) => item.id !== student.id));
      setPendingExpelStudent(null);
      toast.push({
        kind: "success",
        title: "Alumno expulsado",
        description: `La inscripción de ${student.nombres} ${student.apellidos} fue cancelada y eliminada del curso.`,
      });
    } catch (err) {
      toast.push({
        kind: "error",
        title: "No se pudo expulsar al alumno",
        description: getApiErrorMessage(err, "Intenta de nuevo."),
      });
    } finally {
      setExpellingId(null);
    }
  };

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
          <div className="w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <table className="min-w-[920px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Estudiante</th>
                  <th className="px-6 py-3">Progreso</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((s) => (
                  <StudentRow key={s.id} student={s} onExpel={() => setPendingExpelStudent(s)} />
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={safePage}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            isLoading={loading}
            onPageChange={setPage}
          />
        </Card>
      )}

      <ConfirmDeleteModal
        open={Boolean(pendingExpelStudent)}
        title="¿Expulsar y eliminar inscripción?"
        description={`Vas a quitar a ${pendingExpelStudent?.nombres ?? "este alumno"} ${pendingExpelStudent?.apellidos ?? ""} de ${ctx.courseTitle}.\nSe cancelará y eliminará la inscripción del curso. La cuenta del alumno no se eliminará del sistema.`}
        confirmLabel="Expulsar"
        isLoading={pendingExpelStudent ? expellingId === pendingExpelStudent.id : false}
        onCancel={() => setPendingExpelStudent(null)}
        onConfirm={() => {
          if (pendingExpelStudent) void expelStudent(pendingExpelStudent);
        }}
      />
    </div>
  );
}

const StudentRow = memo(function StudentRow({
  student,
  onExpel,
}: {
  student: CourseStudentItem;
  onExpel: () => void;
}) {
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
            {student.foto_url ? (
              <img src={student.foto_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-black text-slate-600">
                {(student.nombres?.[0] ?? "E").toUpperCase()}
                {(student.apellidos?.[0] ?? "S").toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate font-black text-slate-900">
              {student.apellidos}, {student.nombres}
            </div>
            <div className="truncate text-xs text-slate-500">{student.correo}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 font-semibold text-slate-900">{student.progreso}%</td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
          {student.tipo_inscripcion}
        </span>
      </td>
      <td className="px-6 py-4 text-slate-700">{student.fecha_inscripcion}</td>
      <td className="px-6 py-4 text-right">
        <Button
          variant="danger"
          size="sm"
          onClick={onExpel}
          className="rounded-xl px-4 font-black"
        >
          Expulsar
        </Button>
      </td>
    </tr>
  );
});
