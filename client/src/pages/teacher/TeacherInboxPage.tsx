import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";

export function TeacherInboxPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Bandeja" subtitle="Mensajes con estudiantes" />
      <Card className="p-5 text-sm text-slate-600">
        Próximamente: mensajería, conversaciones y notificaciones.
      </Card>
    </div>
  );
}

