import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";

export function TeacherGroupsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Grupos" subtitle="Secciones y grupos por curso" />
      <Card className="p-5 text-sm text-slate-600">
        Próximamente: creación de grupos, asignación de estudiantes y seguimiento.
      </Card>
    </div>
  );
}

