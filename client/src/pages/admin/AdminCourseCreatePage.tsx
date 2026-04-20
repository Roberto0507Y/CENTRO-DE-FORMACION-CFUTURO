import { Suspense } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Spinner } from "../../components/ui/Spinner";
import { useAuth } from "../../hooks/useAuth";
import { lazyNamed } from "../../utils/lazyNamed";

const CourseCreateForm = lazyNamed(
  () => import("../../components/course/CourseCreateForm"),
  "CourseCreateForm",
);

export function AdminCourseCreatePage() {
  const { api, user } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader title="Crear curso" subtitle="Crea un curso y asígnalo a un docente." align="center" />

      {user ? (
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
