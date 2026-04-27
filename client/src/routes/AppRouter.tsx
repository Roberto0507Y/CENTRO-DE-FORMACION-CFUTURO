import { Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { Spinner } from "../components/ui/Spinner";
import { PublicLayout } from "../layouts/PublicLayout";
import { HomePage } from "../pages/public/HomePage";
import { lazyNamed } from "../utils/lazyNamed";
import { ProtectedRoute } from "./ProtectedRoute";
import { RouteErrorPage } from "./RouteErrorPage";

function RouteLoadingFallback() {
  return (
    <div className="grid min-h-[35vh] place-items-center">
      <Spinner size={24} />
    </div>
  );
}

function suspenseElement(element: ReactNode) {
  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>;
}

const CoursesPage = lazyNamed(() => import("../pages/public/CoursesPage"), "CoursesPage");
const CourseDetailPage = lazyNamed(
  () => import("../pages/public/CourseDetailPage"),
  "CourseDetailPage",
);
const ContactPage = lazyNamed(() => import("../pages/public/ContactPage"), "ContactPage");
const LoginPage = lazyNamed(() => import("../pages/auth/LoginPage"), "LoginPage");
const RegisterPage = lazyNamed(() => import("../pages/auth/RegisterPage"), "RegisterPage");
const ForgotPasswordPage = lazyNamed(
  () => import("../pages/auth/ForgotPasswordPage"),
  "ForgotPasswordPage",
);
const ResetPasswordPage = lazyNamed(
  () => import("../pages/auth/ResetPasswordPage"),
  "ResetPasswordPage",
);
const VerifyEmailPage = lazyNamed(
  () => import("../pages/auth/VerifyEmailPage"),
  "VerifyEmailPage",
);

const StudentLayout = lazyNamed(() => import("../layouts/StudentLayout"), "StudentLayout");
const TeacherLayout = lazyNamed(() => import("../layouts/TeacherLayout"), "TeacherLayout");
const AdminLayout = lazyNamed(() => import("../layouts/AdminLayout"), "AdminLayout");
const CourseManageLayout = lazyNamed(
  () => import("../layouts/CourseManageLayout"),
  "CourseManageLayout",
);

const StudentDashboardPage = lazyNamed(
  () => import("../pages/student/StudentDashboardPage"),
  "StudentDashboardPage",
);
const MyCoursesPage = lazyNamed(() => import("../pages/student/MyCoursesPage"), "MyCoursesPage");
const CourseTasksStudentPage = lazyNamed(
  () => import("../pages/student/CourseTasksStudentPage"),
  "CourseTasksStudentPage",
);
const CourseGradesStudentPage = lazyNamed(
  () => import("../pages/student/CourseGradesStudentPage"),
  "CourseGradesStudentPage",
);
const CourseQuizzesStudentPage = lazyNamed(
  () => import("../pages/student/CourseQuizzesStudentPage"),
  "CourseQuizzesStudentPage",
);
const CourseForumStudentPage = lazyNamed(
  () => import("../pages/student/CourseForumStudentPage"),
  "CourseForumStudentPage",
);
const StudentAccountPage = lazyNamed(
  () => import("../pages/student/StudentAccountPage"),
  "StudentAccountPage",
);
const StudentGroupsPage = lazyNamed(
  () => import("../pages/student/StudentGroupsPage"),
  "StudentGroupsPage",
);
const StudentCalendarPage = lazyNamed(
  () => import("../pages/student/StudentCalendarPage"),
  "StudentCalendarPage",
);
const StudentInboxPage = lazyNamed(
  () => import("../pages/student/StudentInboxPage"),
  "StudentInboxPage",
);
const StudentHistoryPage = lazyNamed(
  () => import("../pages/student/StudentHistoryPage"),
  "StudentHistoryPage",
);
const MyPaymentsPage = lazyNamed(() => import("../pages/student/MyPaymentsPage"), "MyPaymentsPage");
const CourseHomeStudentPage = lazyNamed(
  () => import("../pages/student/CourseHomeStudentPage"),
  "CourseHomeStudentPage",
);

const TeacherDashboardPage = lazyNamed(
  () => import("../pages/teacher/TeacherDashboardPage"),
  "TeacherDashboardPage",
);
const TeacherCoursesPage = lazyNamed(
  () => import("../pages/teacher/TeacherCoursesPage"),
  "TeacherCoursesPage",
);
const TeacherAccountPage = lazyNamed(
  () => import("../pages/teacher/TeacherAccountPage"),
  "TeacherAccountPage",
);
const TeacherGroupsPage = lazyNamed(
  () => import("../pages/teacher/TeacherGroupsPage"),
  "TeacherGroupsPage",
);
const TeacherCalendarPage = lazyNamed(
  () => import("../pages/teacher/TeacherCalendarPage"),
  "TeacherCalendarPage",
);
const TeacherInboxPage = lazyNamed(
  () => import("../pages/teacher/TeacherInboxPage"),
  "TeacherInboxPage",
);
const TeacherHistoryPage = lazyNamed(
  () => import("../pages/teacher/TeacherHistoryPage"),
  "TeacherHistoryPage",
);

const AdminDashboardPage = lazyNamed(
  () => import("../pages/admin/AdminDashboardPage"),
  "AdminDashboardPage",
);
const AdminAccountPage = lazyNamed(
  () => import("../pages/admin/AdminAccountPage"),
  "AdminAccountPage",
);
const AdminCoursesPage = lazyNamed(
  () => import("../pages/admin/AdminCoursesPage"),
  "AdminCoursesPage",
);
const AdminCourseCreatePage = lazyNamed(
  () => import("../pages/admin/AdminCourseCreatePage"),
  "AdminCourseCreatePage",
);
const AdminUsersPage = lazyNamed(() => import("../pages/admin/AdminUsersPage"), "AdminUsersPage");
const AdminCategoriesPage = lazyNamed(
  () => import("../pages/admin/AdminCategoriesPage"),
  "AdminCategoriesPage",
);
const AdminPaymentsPage = lazyNamed(
  () => import("../pages/admin/AdminPaymentsPage"),
  "AdminPaymentsPage",
);
const AdminPricingPage = lazyNamed(
  () => import("../pages/admin/AdminPricingPage"),
  "AdminPricingPage",
);
const AdminReportsPage = lazyNamed(
  () => import("../pages/admin/AdminReportsPage"),
  "AdminReportsPage",
);
const AdminGroupsPage = lazyNamed(
  () => import("../pages/admin/AdminGroupsPage"),
  "AdminGroupsPage",
);
const AdminCalendarPage = lazyNamed(
  () => import("../pages/admin/AdminCalendarPage"),
  "AdminCalendarPage",
);
const AdminInboxPage = lazyNamed(() => import("../pages/admin/AdminInboxPage"), "AdminInboxPage");
const AdminHistoryPage = lazyNamed(
  () => import("../pages/admin/AdminHistoryPage"),
  "AdminHistoryPage",
);

const CourseTasksPage = lazyNamed(() => import("../pages/shared/CourseTasksPage"), "CourseTasksPage");
const CourseAnnouncementsPage = lazyNamed(
  () => import("../pages/shared/CourseAnnouncementsPage"),
  "CourseAnnouncementsPage",
);
const CourseAttendancePage = lazyNamed(
  () => import("../pages/shared/CourseAttendancePage"),
  "CourseAttendancePage",
);
const CourseQuizzesPage = lazyNamed(
  () => import("../pages/shared/CourseQuizzesPage"),
  "CourseQuizzesPage",
);
const CourseAdmissionsPage = lazyNamed(
  () => import("../pages/shared/CourseAdmissionsPage"),
  "CourseAdmissionsPage",
);
const CourseMaterialsPage = lazyNamed(
  () => import("../pages/shared/CourseMaterialsPage"),
  "CourseMaterialsPage",
);
const CourseForumPage = lazyNamed(() => import("../pages/shared/CourseForumPage"), "CourseForumPage");
const CourseHomePage = lazyNamed(() => import("../pages/shared/CourseHomePage"), "CourseHomePage");
const CourseStudentsPage = lazyNamed(
  () => import("../pages/shared/CourseStudentsPage"),
  "CourseStudentsPage",
);

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/courses", element: suspenseElement(<CoursesPage />) },
      { path: "/courses/:slug", element: suspenseElement(<CourseDetailPage />) },
      { path: "/contact", element: suspenseElement(<ContactPage />) },
      { path: "/auth/login", element: suspenseElement(<LoginPage />) },
      { path: "/auth/register", element: suspenseElement(<RegisterPage />) },
      { path: "/auth/forgot-password", element: suspenseElement(<ForgotPasswordPage />) },
      { path: "/auth/reset-password", element: suspenseElement(<ResetPasswordPage />) },
      { path: "/auth/verify-email", element: suspenseElement(<VerifyEmailPage />) },
    ],
  },
  {
    element: <ProtectedRoute roles={["estudiante"]} />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: suspenseElement(<StudentLayout />),
        children: [
          { path: "/student", element: suspenseElement(<StudentDashboardPage />) },
          { path: "/student/account", element: suspenseElement(<StudentAccountPage />) },
          { path: "/student/my-courses", element: suspenseElement(<MyCoursesPage />) },
          { path: "/student/groups", element: suspenseElement(<StudentGroupsPage />) },
          { path: "/student/calendar", element: suspenseElement(<StudentCalendarPage />) },
          { path: "/student/inbox", element: suspenseElement(<StudentInboxPage />) },
          { path: "/student/history", element: suspenseElement(<StudentHistoryPage />) },
          { path: "/student/payments", element: suspenseElement(<MyPaymentsPage />) },
        ],
      },
      {
        path: "/student/course/:courseId",
        element: suspenseElement(<CourseManageLayout base="student" />),
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: "home", element: suspenseElement(<CourseHomeStudentPage />) },
          { path: "announcements", element: suspenseElement(<CourseAnnouncementsPage />) },
          { path: "materials", element: suspenseElement(<CourseMaterialsPage />) },
          { path: "lessons", element: <Navigate to="../materials" replace /> },
          { path: "tasks", element: suspenseElement(<CourseTasksStudentPage />) },
          { path: "grades", element: suspenseElement(<CourseGradesStudentPage />) },
          { path: "quizzes", element: suspenseElement(<CourseQuizzesStudentPage />) },
          { path: "forum", element: suspenseElement(<CourseForumStudentPage />) },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute roles={["docente"]} />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: suspenseElement(<TeacherLayout />),
        children: [
          { path: "/teacher", element: suspenseElement(<TeacherDashboardPage />) },
          { path: "/teacher/account", element: suspenseElement(<TeacherAccountPage />) },
          { path: "/teacher/courses", element: suspenseElement(<TeacherCoursesPage />) },
          { path: "/teacher/groups", element: suspenseElement(<TeacherGroupsPage />) },
          { path: "/teacher/calendar", element: suspenseElement(<TeacherCalendarPage />) },
          { path: "/teacher/inbox", element: suspenseElement(<TeacherInboxPage />) },
          { path: "/teacher/history", element: suspenseElement(<TeacherHistoryPage />) },
        ],
      },
      {
        path: "/teacher/course/:courseId",
        element: suspenseElement(<CourseManageLayout base="teacher" />),
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: "home", element: suspenseElement(<CourseHomePage />) },
          { path: "students", element: suspenseElement(<CourseStudentsPage />) },
          { path: "tasks", element: suspenseElement(<CourseTasksPage />) },
          { path: "announcements", element: suspenseElement(<CourseAnnouncementsPage />) },
          { path: "materials", element: suspenseElement(<CourseMaterialsPage />) },
          { path: "forum", element: suspenseElement(<CourseForumPage />) },
          { path: "attendance", element: suspenseElement(<CourseAttendancePage />) },
          { path: "quizzes", element: suspenseElement(<CourseQuizzesPage />) },
          { path: "admissions", element: suspenseElement(<CourseAdmissionsPage />) },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute roles={["admin"]} />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: suspenseElement(<AdminLayout />),
        children: [
          { path: "/admin", element: suspenseElement(<AdminDashboardPage />) },
          { path: "/admin/account", element: suspenseElement(<AdminAccountPage />) },
          { path: "/admin/users", element: suspenseElement(<AdminUsersPage />) },
          { path: "/admin/categories", element: suspenseElement(<AdminCategoriesPage />) },
          { path: "/admin/course-create", element: suspenseElement(<AdminCourseCreatePage />) },
          { path: "/admin/courses", element: suspenseElement(<AdminCoursesPage />) },
          { path: "/admin/pricing", element: suspenseElement(<AdminPricingPage />) },
          { path: "/admin/payments", element: suspenseElement(<AdminPaymentsPage />) },
          { path: "/admin/reports", element: suspenseElement(<AdminReportsPage />) },
          { path: "/admin/groups", element: suspenseElement(<AdminGroupsPage />) },
          { path: "/admin/calendar", element: suspenseElement(<AdminCalendarPage />) },
          { path: "/admin/inbox", element: suspenseElement(<AdminInboxPage />) },
          { path: "/admin/history", element: suspenseElement(<AdminHistoryPage />) },
        ],
      },
      {
        path: "/admin/course/:courseId",
        element: suspenseElement(<CourseManageLayout base="admin" />),
        children: [
          { index: true, element: <Navigate to="home" replace /> },
          { path: "home", element: suspenseElement(<CourseHomePage />) },
          { path: "students", element: suspenseElement(<CourseStudentsPage />) },
          { path: "tasks", element: suspenseElement(<CourseTasksPage />) },
          { path: "announcements", element: suspenseElement(<CourseAnnouncementsPage />) },
          { path: "materials", element: suspenseElement(<CourseMaterialsPage />) },
          { path: "forum", element: suspenseElement(<CourseForumPage />) },
          { path: "attendance", element: suspenseElement(<CourseAttendancePage />) },
          { path: "quizzes", element: suspenseElement(<CourseQuizzesPage />) },
          { path: "admissions", element: suspenseElement(<CourseAdmissionsPage />) },
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
