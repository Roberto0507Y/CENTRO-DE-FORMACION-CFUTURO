import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";

export function StudentGroupsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Grupos" subtitle="Trabajo colaborativo" />
      <Card className="p-5 text-sm text-slate-600">
        Próximamente: grupos, compañeros y espacios de trabajo por curso.
      </Card>
    </div>
  );
}

