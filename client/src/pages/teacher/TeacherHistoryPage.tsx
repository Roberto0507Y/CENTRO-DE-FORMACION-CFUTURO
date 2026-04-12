import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";

export function TeacherHistoryPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Historial" subtitle="Actividad reciente" />
      <Card className="p-5 text-sm text-slate-600">
        Próximamente: historial de publicaciones, revisiones y calificaciones.
      </Card>
    </div>
  );
}

