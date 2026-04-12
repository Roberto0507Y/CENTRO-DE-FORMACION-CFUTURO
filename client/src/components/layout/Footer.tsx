import { Container } from "../ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-extrabold text-slate-900">C.FUTURO</div>
          <div className="text-xs text-slate-500">© 2026 · Todos los derechos reservados</div>
        </div>
      </Container>
    </footer>
  );
}
