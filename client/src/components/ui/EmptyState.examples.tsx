import { EmptyState } from "./EmptyState";

export function ExampleNoCourses() {
  return (
    <EmptyState
      title="No se encontraron cursos"
      description="Aún no hay cursos para mostrar. Crea tu primer curso y empieza a publicar contenido."
      actionLabel="Crear curso"
      onAction={() => {
        // ejemplo: navegar a /admin/courses o abrir modal
        window.location.href = "/admin/courses";
      }}
      secondaryActionLabel="Explorar catálogo"
      onSecondaryAction={() => {
        window.location.href = "/courses";
      }}
    />
  );
}

export function ExampleNoUsers() {
  return (
    <EmptyState
      title="No hay usuarios registrados"
      description="Cuando se registren usuarios, aparecerán aquí. Puedes crear un usuario docente o admin desde la base de datos."
      actionLabel="Actualizar"
      onAction={() => window.location.reload()}
    />
  );
}

export function ExampleNoPayments() {
  return (
    <EmptyState
      title="No hay pagos todavía"
      description="Aún no se han registrado transacciones. Cuando existan pagos, podrás verlos y conciliarlos desde este panel."
      actionLabel="Ver cursos"
      onAction={() => {
        window.location.href = "/admin/courses";
      }}
    />
  );
}

