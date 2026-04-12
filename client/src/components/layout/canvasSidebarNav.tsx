import type { ReactNode } from "react";
import type { CanvasNavItem, CanvasSidebarEntry } from "./canvasSidebar.types";

function navIcon(children: ReactNode, viewBox = "0 0 24 24") {
  return (
    <svg
      viewBox={viewBox}
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function makeItem(item: Omit<CanvasNavItem, "icon"> & { icon: ReactNode }): CanvasNavItem {
  return {
    to: item.to,
    label: item.label,
    end: item.end,
    icon: item.icon,
  };
}

const accountIcon = navIcon(
  <>
    <circle cx="12" cy="8.25" r="3.25" />
    <path d="M5 19a7 7 0 0 1 14 0" />
  </>
);

const dashboardIcon = navIcon(
  <>
    <rect x="3.75" y="4" width="7.25" height="7.25" rx="2.2" />
    <rect x="13" y="4" width="7.25" height="5.25" rx="2.2" />
    <rect x="13" y="11.25" width="7.25" height="8.75" rx="2.2" />
    <rect x="3.75" y="13.25" width="7.25" height="6.75" rx="2.2" />
  </>
);

const coursesIcon = navIcon(
  <>
    <path d="M5 6.75A2.75 2.75 0 0 1 7.75 4H19v14H7.75A2.75 2.75 0 0 0 5 20.75V6.75Z" />
    <path d="M5 6.75A2.75 2.75 0 0 1 7.75 4" />
    <path d="M8.5 8.25h6.5" />
    <path d="M8.5 11.75h7" />
  </>
);

const paymentsIcon = navIcon(
  <>
    <rect x="3.5" y="5.25" width="17" height="13.5" rx="3" />
    <path d="M3.5 9.5h17" />
    <path d="M7.5 14.25h4.5" />
    <path d="M15.5 14.25h1" />
  </>
);

const groupsIcon = navIcon(
  <>
    <circle cx="9" cy="8.5" r="2.75" />
    <path d="M4.75 18a4.25 4.25 0 0 1 8.5 0" />
    <circle cx="16.75" cy="9.25" r="2.25" />
    <path d="M15 15.5a3.6 3.6 0 0 1 4.25 2.5" />
  </>
);

const calendarIcon = navIcon(
  <>
    <rect x="3.5" y="4.75" width="17" height="15.75" rx="3" />
    <path d="M7.75 3v3.5" />
    <path d="M16.25 3v3.5" />
    <path d="M3.5 9.25h17" />
    <path d="M8 13h.01" />
    <path d="M12 13h.01" />
    <path d="M16 13h.01" />
  </>
);

const exploreIcon = navIcon(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m14.75 9.25-4.5 1.5-1.5 4.5 4.5-1.5 1.5-4.5Z" />
  </>
);

const categoriesIcon = navIcon(
  <>
    <rect x="4" y="4.25" width="6.75" height="6.75" rx="2" />
    <rect x="13.25" y="4.25" width="6.75" height="6.75" rx="2" />
    <rect x="4" y="13.5" width="6.75" height="6.75" rx="2" />
    <rect x="13.25" y="13.5" width="6.75" height="6.75" rx="2" />
  </>
);

const createIcon = navIcon(
  <>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8v8" />
    <path d="M8 12h8" />
  </>
);

const adminCoursesIcon = navIcon(
  <>
    <path d="M4 8 12 4.5 20 8 12 11.5 4 8Z" />
    <path d="M7 10.5V15c0 1.7 2.35 3.5 5 3.5s5-1.8 5-3.5v-4.5" />
  </>
);

const pricingIcon = navIcon(
  <>
    <path d="M10.5 4H7a3 3 0 0 0-3 3v3.5l7 7a2.5 2.5 0 0 0 3.5 0l4-4a2.5 2.5 0 0 0 0-3.5l-7-7Z" />
    <circle cx="8.25" cy="8.25" r="1" fill="currentColor" stroke="none" />
  </>
);

const reportsIcon = navIcon(
  <>
    <path d="M5 4.5h14v15H5z" />
    <path d="M8.5 8.5h7" />
    <path d="M8.5 12h7" />
    <path d="M8.5 15.5h4.25" />
    <path d="M16.5 15.5h.01" />
  </>
);

export const studentNav: CanvasSidebarEntry[] = [
  makeItem({ to: "/student", label: "Tablero", end: true, icon: dashboardIcon }),
  makeItem({ to: "/student/my-courses", label: "Cursos", icon: coursesIcon }),
  makeItem({ to: "/student/payments", label: "Mis pagos", icon: paymentsIcon }),
  makeItem({ to: "/student/calendar", label: "Calendario", icon: calendarIcon }),
  makeItem({ to: "/student/account", label: "Cuenta", icon: accountIcon }),
  makeItem({ to: "/courses", label: "Explorar", icon: exploreIcon }),
];

export const teacherNav: CanvasSidebarEntry[] = [
  makeItem({ to: "/teacher", label: "Tablero", end: true, icon: dashboardIcon }),
  makeItem({ to: "/teacher/courses", label: "Cursos", icon: coursesIcon }),
  makeItem({ to: "/teacher/calendar", label: "Calendario", icon: calendarIcon }),
  makeItem({ to: "/teacher/account", label: "Cuenta", icon: accountIcon }),
];

export const adminNav: CanvasSidebarEntry[] = [
  {
    type: "section",
    label: "General",
    items: [
      makeItem({ to: "/admin", label: "Tablero", end: true, icon: dashboardIcon }),
      makeItem({ to: "/admin/account", label: "Cuenta", icon: accountIcon }),
      makeItem({ to: "/admin/calendar", label: "Calendario", icon: calendarIcon }),
    ],
  },
  {
    type: "section",
    label: "Gestión",
    items: [
      makeItem({ to: "/admin/users", label: "Usuarios", icon: groupsIcon }),
      makeItem({ to: "/admin/categories", label: "Categorías", icon: categoriesIcon }),
      makeItem({ to: "/admin/course-create", label: "Crear curso", icon: createIcon }),
      makeItem({ to: "/admin/courses", label: "Cursos", icon: adminCoursesIcon }),
      makeItem({ to: "/admin/payments", label: "Pagos", icon: paymentsIcon }),
      makeItem({ to: "/admin/pricing", label: "Precios", icon: pricingIcon }),
      makeItem({ to: "/admin/reports", label: "Reportes", icon: reportsIcon }),
    ],
  },
];
