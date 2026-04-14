import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { CanvasSidebar } from "../components/layout/CanvasSidebar";
import { CanvasMobileDrawer } from "../components/layout/CanvasMobileDrawer";
import { teacherNav } from "../components/layout/canvasSidebarNav";
import "../styles/admin-dark-scope.css";
import "../styles/internal-shell.css";

export function TeacherLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const title =
    pathname.startsWith("/teacher/account")
      ? "Cuenta"
      : pathname.startsWith("/teacher/courses")
        ? "Cursos"
        : pathname.startsWith("/teacher/course/")
          ? "Curso"
          : pathname.startsWith("/teacher/calendar")
            ? "Calendario"
              : "Tablero";

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-slate-100 xl:flex xl:h-[100dvh] xl:overflow-hidden dark:bg-slate-950">
      <CanvasSidebar brand="C.FUTURO" role="Docente" items={teacherNav} logoSrc="/logo-horizontal.png" logoAlt="C.FUTURO" showHelp={false} />
      <CanvasMobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        brand="C.FUTURO"
        role="Docente"
        items={teacherNav}
        logoSrc="/logo-horizontal.png"
        logoAlt="C.FUTURO"
        showHelp={false}
      />
      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col xl:min-h-0 xl:pl-[17rem]">
        <Topbar title={title} onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="cf-admin-dark-scope cf-app-shell-main min-h-0 min-w-0 flex-1 overflow-visible xl:overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
