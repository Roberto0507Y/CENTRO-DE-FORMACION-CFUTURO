import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";

export function StudentHistoryPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Historial" subtitle="Tu actividad reciente" />
      <Card className="p-5 text-sm text-slate-600">
        Próximamente: historial de accesos, lecciones completadas y evaluaciones.
      </Card>
    </div>
  );
}

