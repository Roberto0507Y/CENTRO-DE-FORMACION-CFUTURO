import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { CanvasSidebar } from "../components/layout/CanvasSidebar";
import { CanvasMobileDrawer } from "../components/layout/CanvasMobileDrawer";
import { adminNav } from "../components/layout/canvasSidebarNav";
import "../styles/admin-dark-scope.css";
import "../styles/internal-shell.css";

export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const title =
    pathname.startsWith("/admin/account")
      ? "Cuenta"
      : pathname.startsWith("/admin/users")
        ? "Usuarios"
        : pathname.startsWith("/admin/categories")
          ? "Categorías"
      : pathname.startsWith("/admin/course-create")
        ? "Crear curso"
      : pathname.startsWith("/admin/courses")
        ? "Curso"
        : pathname.startsWith("/admin/payments")
          ? "Pagos"
        : pathname.startsWith("/admin/reports")
          ? "Reportes"
        : pathname.startsWith("/admin/course/")
          ? "Curso"
        : pathname.startsWith("/admin/groups")
          ? "Grupos"
        : pathname.startsWith("/admin/calendar")
          ? "Calendario"
                : "Administración";

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-slate-100 xl:flex xl:h-[100dvh] xl:overflow-hidden dark:bg-slate-950">
      <CanvasSidebar
        brand="C.FUTURO"
        role="Admin"
        items={adminNav}
        logoSrc="/logo-horizontal.png"
        logoAlt="C.FUTURO"
        showHelp={false}
      />
      <CanvasMobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        brand="C.FUTURO"
        role="Admin"
        items={adminNav}
        logoSrc="/logo-horizontal.png"
        logoAlt="C.FUTURO"
        showHelp={false}
      />
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col xl:min-h-0 xl:pl-[17rem]">
        <Topbar title={title} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="cf-admin-dark-scope cf-app-shell-main min-h-0 min-w-0 flex-1 overflow-visible xl:overflow-y-auto">
          <div className="cf-internal-content mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
