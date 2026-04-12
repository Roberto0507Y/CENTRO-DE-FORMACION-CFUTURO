import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";

export function AdminHistoryPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Historial" subtitle="Auditoría y actividad" />
      <Card className="p-5 text-sm text-slate-600">
        Próximamente: auditoría de acciones, accesos y cambios.
      </Card>
    </div>
  );
}

