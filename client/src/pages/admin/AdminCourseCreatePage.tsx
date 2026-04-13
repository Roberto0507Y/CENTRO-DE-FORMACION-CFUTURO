import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import type { ApiResponse } from "../../types/api";
import { lazyNamed } from "../../utils/lazyNamed";

const CourseCreateForm = lazyNamed(
  () => import("../../components/course/CourseCreateForm"),
  "CourseCreateForm",
);

export function AdminCourseCreatePage() {
  const { api, user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Asegura que haya sesión válida (evita pantallazo en blanco cuando el token aún se hidrata)
    let alive = true;
    (async () => {
      try {
        await api.get<ApiResponse<{ ok: true }>>("/health/db");
      } catch {
        // ignore: si falla health, el formulario igual mostrará errores al guardar
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [api]);

  return (
    <div className="space-y-6">
      <PageHeader title="Crear curso" subtitle="Crea un curso y asígnalo a un docente." align="center" />

      {!ready ? (
        <Card className="grid place-items-center py-10">
          <Spinner />
        </Card>
      ) : user ? (
        <Suspense
          fallback={
            <Card className="grid min-h-[18rem] place-items-center">
              <Spinner />
            </Card>
          }
        >
          <CourseCreateForm api={api} currentUser={user} variant="admin" hideHeaderText onCreated={() => null} />
        </Suspense>
      ) : (
        <Card className="p-4 text-sm text-slate-600">Cargando sesión…</Card>
      )}
    </div>
  );
}
