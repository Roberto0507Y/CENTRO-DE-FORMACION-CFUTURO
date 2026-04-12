import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function RouteErrorPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10 text-slate-950 dark:bg-slate-950 dark:text-white">
      <Card className="w-full max-w-xl overflow-hidden p-0">
        <div className="relative p-8 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.14),transparent_36%)] dark:bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_36%)]" />
          <div className="relative">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            </div>

            <div className="mt-6 text-2xl font-black tracking-tight">No se pudo cargar esta pantalla</div>
            <div className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              Ocurrió un problema inesperado. Puedes recargar la página o volver al inicio.
            </div>

            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto" onClick={() => window.location.reload()}>
                Recargar
              </Button>
              <Link to="/" className="w-full sm:w-auto">
                <Button className="w-full" variant="secondary">
                  Ir al inicio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
