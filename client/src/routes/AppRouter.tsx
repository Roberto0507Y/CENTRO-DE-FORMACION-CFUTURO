import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { PublicLayout } from "../layouts/PublicLayout";
import { StudentLayout } from "../layouts/StudentLayout";
import { TeacherLayout } from "../layouts/TeacherLayout";
import { AdminLayout } from "../layouts/AdminLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { RouteErrorPage } from "./RouteErrorPage";

import { HomePage } from "../pages/public/HomePage";
import { CoursesPage } from "../pages/public/CoursesPage";
import { CourseDetailPage } from "../pages/public/CourseDetailPage";
import { ContactPage } from "../pages/public/ContactPage";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage";
import { StudentDashboardPage } from "../pages/student/StudentDashboardPage";
import { MyCoursesPage } from "../pages/student/MyCoursesPage";
import { CourseTasksStudentPage } from "../pages/student/CourseTasksStudentPage";
import { CourseGradesStudentPage } from "../pages/student/CourseGradesStudentPage";
import { CourseQuizzesStudentPage } from "../pages/student/CourseQuizzesStudentPage";
import { CourseForumStudentPage } from "../pages/student/CourseForumStudentPage";
import { StudentAccountPage } from "../pages/student/StudentAccountPage";
import { StudentGroupsPage } from "../pages/student/StudentGroupsPage";
import { StudentCalendarPage } from "../pages/student/StudentCalendarPage";
import { StudentInboxPage } from "../pages/student/StudentInboxPage";
import { StudentHistoryPage } from "../pages/student/StudentHistoryPage";
import { MyPaymentsPage } from "../pages/student/MyPaymentsPage";
import { TeacherDashboardPage } from "../pages/teacher/TeacherDashboardPage";
import { TeacherCoursesPage } from "../pages/teacher/TeacherCoursesPage";
import { TeacherAccountPage } from "../pages/teacher/TeacherAccountPage";
import { TeacherGroupsPage } from "../pages/teacher/TeacherGroupsPage";
import { TeacherCalendarPage } from "../pages/teacher/TeacherCalendarPage";
import { TeacherInboxPage } from "../pages/teacher/TeacherInboxPage";
import { TeacherHistoryPage } from "../pages/teacher/TeacherHistoryPage";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage";
import { AdminAccountPage } from "../pages/admin/AdminAccountPage";
import { AdminCoursesPage } from "../pages/admin/AdminCoursesPage";
import { AdminCourseCreatePage } from "../pages/admin/AdminCourseCreatePage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { AdminCategoriesPage } from "../pages/admin/AdminCategoriesPage";
import { AdminPaymentsPage } from "../pages/admin/AdminPaymentsPage";
import { AdminPricingPage } from "../pages/admin/AdminPricingPage";
import { AdminReportsPage } from "../pages/admin/AdminReportsPage";
import { AdminGroupsPage } from "../pages/admin/AdminGroupsPage";
import { AdminCalendarPage } from "../pages/admin/AdminCalendarPage";
import { AdminInboxPage } from "../pages/admin/AdminInboxPage";
import { AdminHistoryPage } from "../pages/admin/AdminHistoryPage";
import { CourseTasksPage } from "../pages/shared/CourseTasksPage";
import { CourseAnnouncementsPage } from "../pages/shared/CourseAnnouncementsPage";
import { CourseAttendancePage } from "../pages/shared/CourseAttendancePage";
import { CourseQuizzesPage } from "../pages/shared/CourseQuizzesPage";
import { CourseMaterialsPage } from "../pages/shared/CourseMaterialsPage";
import { CourseForumPage } from "../pages/shared/CourseForumPage";
import { CourseHomePage } from "../pages/shared/CourseHomePage";
import { CourseStudentsPage } from "../pages/shared/CourseStudentsPage";
import { CourseManageLayout } from "../layouts/CourseManageLayout";
import { CourseHomeStudentPage } from "../pages/student/CourseHomeStudentPage";

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/courses", element: <CoursesPage /> },
      { path: "/courses/:slug", element: <CourseDetailPage /> },
      { path: "/contact", element: <ContactPage /> },
      { path: "/auth/login", element: <LoginPage /> },
      { path: "/auth/register", element: <RegisterPage /> },
      { path: "/auth/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/auth/reset-password", element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute roles={["estudiante"]} />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <StudentLayout />,
        children: [
          { path: "/student", element: <StudentDashboardPage /> },
          { path: "/student/account", element: <StudentAccountPage /> },
          { path: "/student/my-courses", element: <MyCoursesPage /> },
          { path: "/student/groups", element: <StudentGroupsPage /> },
          { path: "/student/calendar", element: <StudentCalendarPage /> },
          { path: "/student/inbox", element: <StudentInboxPage /> },
          { path: "/student/history", element: <StudentHistoryPage /> },
          { path: "/student/payments", element: <MyPaymentsPage /> },
        ],
      },
      // Curso (layout propio, mismo estilo que admin/docente)
      {
        path: "/student/course/:courseId",
        element: <CourseManageLayout base="student" />,
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: "home", element: <CourseHomeStudentPage /> },
          { path: "announcements", element: <CourseAnnouncementsPage /> },
          { path: "materials", element: <CourseMaterialsPage /> },
          // (suspendido) mantenemos la ruta por compatibilidad, pero sin opción en el menú
          { path: "lessons", element: <Navigate to="../materials" replace /> },
          { path: "tasks", element: <CourseTasksStudentPage /> },
          { path: "grades", element: <CourseGradesStudentPage /> },
          { path: "quizzes", element: <CourseQuizzesStudentPage /> },
          { path: "forum", element: <CourseForumStudentPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute roles={["docente"]} />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <TeacherLayout />,
        children: [
          { path: "/teacher", element: <TeacherDashboardPage /> },
          { path: "/teacher/account", element: <TeacherAccountPage /> },
          { path: "/teacher/courses", element: <TeacherCoursesPage /> },
          { path: "/teacher/groups", element: <TeacherGroupsPage /> },
          { path: "/teacher/calendar", element: <TeacherCalendarPage /> },
          { path: "/teacher/inbox", element: <TeacherInboxPage /> },
          { path: "/teacher/history", element: <TeacherHistoryPage /> },
        ],
      },
      // Gestión de curso: layout propio (sin sidebar/topbar global)
      {
        path: "/teacher/course/:courseId",
        element: <CourseManageLayout base="teacher" />,
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: "home", element: <CourseHomePage /> },
          { path: "students", element: <CourseStudentsPage /> },
          { path: "tasks", element: <CourseTasksPage /> },
          { path: "announcements", element: <CourseAnnouncementsPage /> },
          { path: "materials", element: <CourseMaterialsPage /> },
          { path: "forum", element: <CourseForumPage /> },
          { path: "attendance", element: <CourseAttendancePage /> },
          { path: "quizzes", element: <CourseQuizzesPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute roles={["admin"]} />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: "/admin", element: <AdminDashboardPage /> },
          { path: "/admin/account", element: <AdminAccountPage /> },
          { path: "/admin/users", element: <AdminUsersPage /> },
          { path: "/admin/categories", element: <AdminCategoriesPage /> },
          { path: "/admin/course-create", element: <AdminCourseCreatePage /> },
          { path: "/admin/courses", element: <AdminCoursesPage /> },
          { path: "/admin/pricing", element: <AdminPricingPage /> },
          { path: "/admin/payments", element: <AdminPaymentsPage /> },
          { path: "/admin/reports", element: <AdminReportsPage /> },
          { path: "/admin/groups", element: <AdminGroupsPage /> },
          { path: "/admin/calendar", element: <AdminCalendarPage /> },
          { path: "/admin/inbox", element: <AdminInboxPage /> },
          { path: "/admin/history", element: <AdminHistoryPage /> },
        ],
      },
      // Gestión de curso: layout propio (sin sidebar/topbar global)
      {
        path: "/admin/course/:courseId",
        element: <CourseManageLayout base="admin" />,
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: "home", element: <CourseHomePage /> },
          { path: "students", element: <CourseStudentsPage /> },
          { path: "tasks", element: <CourseTasksPage /> },
          { path: "announcements", element: <CourseAnnouncementsPage /> },
          { path: "materials", element: <CourseMaterialsPage /> },
          { path: "forum", element: <CourseForumPage /> },
          { path: "attendance", element: <CourseAttendancePage /> },
          { path: "quizzes", element: <CourseQuizzesPage /> },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
