import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";

export function AdminGroupsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Grupos" subtitle="Gestión (admin)" />
      <Card className="p-5 text-sm text-slate-600">
        Próximamente: grupos/secciones, asignaciones y reportes.
      </Card>
    </div>
  );
}

