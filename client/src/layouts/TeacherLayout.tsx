import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { Topbar } from "../components/layout/Topbar";
import { CanvasSidebar } from "../components/layout/CanvasSidebar";
import { CanvasMobileDrawer } from "../components/layout/CanvasMobileDrawer";
import { teacherNav } from "../components/layout/canvasSidebarNav";

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
        <main className="cf-admin-dark-scope min-h-0 min-w-0 flex-1 overflow-visible bg-[radial-gradient(circle_at_18%_0%,rgba(59,130,246,0.10),transparent_30%),linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,1))] xl:overflow-y-auto dark:bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.12),transparent_30%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,1))]">
          <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
