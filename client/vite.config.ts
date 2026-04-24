import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

const FRAME_SOURCES = [
  'https://pay.ebi.com.gt',
  'https://link.ebi.com.gt',
  'https://www.youtube.com',
  'https://player.vimeo.com',
]

function parseOrigin(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    return new URL(raw).origin
  } catch {
    return null
  }
}

function buildContentSecurityPolicy(apiOrigin: string | null): string {
  const connectSources = ["'self'", ...(apiOrigin ? [apiOrigin] : [])].join(' ')
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "script-src 'self'",
    "script-src-attr 'none'",
    "style-src 'self'",
    "style-src-elem 'self'",
    "style-src-attr 'none'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    `frame-src 'self' ${FRAME_SOURCES.join(' ')}`,
    "media-src 'self' blob: data: https:",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join('; ')
}

function includesAny(value: string, patterns: string[]) {
  return patterns.some((pattern) => value.includes(pattern))
}

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy':
    'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), browsing-topics=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-site',
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = parseOrigin(env.VITE_API_URL)
  const previewSecurityHeaders = {
    ...securityHeaders,
    'Content-Security-Policy': buildContentSecurityPolicy(apiOrigin),
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      headers: securityHeaders,
    },
    preview: {
      headers: previewSecurityHeaders,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/')

            if (!normalizedId.includes('/node_modules/')) {
              if (normalizedId.includes('/src/pages/admin/reports/')) {
                return 'module-report-export'
              }

              if (normalizedId.includes('/src/components/calendar/')) {
                return 'module-calendar'
              }

              if (normalizedId.includes('/src/components/account/')) {
                return 'module-account'
              }

              if (normalizedId.includes('/src/components/payment/')) {
                return 'module-payment'
              }

              if (normalizedId.includes('/src/components/course/')) {
                return 'module-course-editor'
              }

              if (
                normalizedId.includes('/src/pages/auth/')
              ) {
                return 'route-auth'
              }

              if (
                includesAny(normalizedId, [
                  '/src/pages/public/CoursesPage',
                  '/src/pages/public/ContactPage',
                ])
              ) {
                return 'route-public-browse'
              }

              if (normalizedId.includes('/src/pages/public/CourseDetailPage')) {
                return 'route-public-detail'
              }

              if (
                includesAny(normalizedId, [
                  '/src/pages/student/StudentDashboardPage',
                  '/src/pages/student/MyCoursesPage',
                  '/src/pages/student/MyPaymentsPage',
                  '/src/pages/student/StudentGroupsPage',
                  '/src/pages/student/StudentHistoryPage',
                  '/src/pages/student/StudentInboxPage',
                ]) ||
                normalizedId.includes('/src/layouts/StudentLayout')
              ) {
                return 'route-student-core'
              }

              if (
                includesAny(normalizedId, [
                  '/src/pages/student/CourseHomeStudentPage',
                  '/src/pages/student/CourseTasksStudentPage',
                  '/src/pages/student/CourseGradesStudentPage',
                  '/src/pages/student/CourseQuizzesStudentPage',
                  '/src/pages/student/CourseForumStudentPage',
                ])
              ) {
                return 'route-student-learning'
              }

              if (
                normalizedId.includes('/src/pages/student/') ||
                normalizedId.includes('/src/pages/student/CoursePlayerPage')
              ) {
                return 'route-student'
              }

              if (
                normalizedId.includes('/src/pages/teacher/') ||
                normalizedId.includes('/src/layouts/TeacherLayout')
              ) {
                return 'route-teacher'
              }

              if (
                normalizedId.includes('/src/pages/admin/') ||
                normalizedId.includes('/src/layouts/AdminLayout')
              ) {
                return 'route-admin'
              }

              if (
                includesAny(normalizedId, [
                  '/src/pages/shared/CourseHomePage',
                  '/src/pages/shared/CourseAnnouncementsPage',
                  '/src/pages/shared/CourseMaterialsPage',
                  '/src/pages/shared/CourseForumPage',
                ])
              ) {
                return 'route-course-manage-content'
              }

              if (
                includesAny(normalizedId, [
                  '/src/pages/shared/CourseTasksPage',
                  '/src/components/task/',
                  '/src/components/course/CourseTaskModals',
                ])
              ) {
                return 'route-course-manage-tasks'
              }

              if (
                includesAny(normalizedId, [
                  '/src/pages/shared/CourseQuizzesPage',
                  '/src/pages/shared/CourseAttendancePage',
                ])
              ) {
                return 'route-course-manage-assessment'
              }

              if (
                includesAny(normalizedId, [
                  '/src/pages/shared/CourseStudentsPage',
                ])
              ) {
                return 'route-course-manage-roster'
              }

              if (
                normalizedId.includes('/src/pages/shared/') ||
                normalizedId.includes('/src/layouts/CourseManageLayout')
              ) {
                return 'route-course-manage'
              }

              return
            }

            if (normalizedId.includes('react-router')) return 'router'
            if (normalizedId.includes('/node_modules/lucide-react/')) return 'icons'
            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/scheduler/')
            ) {
              return 'react-core'
            }
            if (
              normalizedId.includes('framer-motion') ||
              normalizedId.includes('motion-dom') ||
              normalizedId.includes('motion-utils')
            ) {
              return 'motion'
            }
            if (normalizedId.includes('axios')) return 'http'
            return
          },
        },
      },
    },
  }
})
