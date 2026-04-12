import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";

export function StudentInboxPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Bandeja" subtitle="Mensajes y notificaciones" />
      <Card className="p-5 text-sm text-slate-600">
        Próximamente: conversaciones, mensajes y notificaciones del sistema.
      </Card>
    </div>
  );
}

