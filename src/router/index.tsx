import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { FirstLoginGate } from './FirstLoginGate';
import { ForcePasswordChangePage } from '../pages/ForcePasswordChangePage';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { UsersPage } from '../pages/principal/UsersPage';
import { BulkUploadPage } from '../pages/principal/BulkUploadPage';
import { BulkAccountGenerator } from '../components/users/BulkAccountGenerator';
import { AuditLogsPage } from '../pages/principal/AuditLogsPage';
import { ReportsPage } from '../pages/principal/ReportsPage';
import { PrincipalExecutivePage } from '../pages/principal/PrincipalExecutivePage';
import { ProgramSettingsPage } from '../pages/admin/ProgramSettingsPage';
import { PrincipalClassesHubPage } from '../pages/principal/PrincipalClassesHubPage';
import { Student360Page } from '../pages/principal/Student360Page';
import { StaffInvitePage } from '../pages/StaffInvitePage';
import { ActivitiesPage } from '../pages/activities/ActivitiesPage';
import { GrantPointsPage } from '../pages/points/GrantPointsPage';
import { ApprovePointsPage } from '../pages/points/ApprovePointsPage';
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { SkillsPage } from '../pages/supervisor/SkillsPage';
import { SubjectsByGradePage } from '../pages/supervisor/SubjectsByGradePage';
import { QuestionBankPage } from '../pages/supervisor/QuestionBankPage';
import { ExamBuilderPage } from '../pages/supervisor/ExamBuilderPage';
import { TakeExamPage } from '../pages/student/TakeExamPage';
import { StudentExamsPage } from '../pages/student/StudentExamsPage';
import { PrepExamPage } from '../pages/student/PrepExamPage';
import { AnalyticsPage } from '../pages/supervisor/AnalyticsPage';
import { LeaderboardPage } from '../pages/leaderboard/LeaderboardPage';
import { LeaderboardDisplayPage } from '../pages/leaderboard/LeaderboardDisplayPage';
import { StudentsPage } from '../pages/teacher/StudentsPage';
import { TeacherAnalyticsPage } from '../pages/teacher/TeacherAnalyticsPage';
import { TeacherActivityLogPage } from '../pages/teacher/TeacherActivityLogPage';
import { TeacherLessonPlanPage } from '../pages/teacher/TeacherLessonPlanPage';
import { VerifyDocumentPage } from '../pages/VerifyDocumentPage';
import { PointsLogPage } from '../pages/admin/PointsLogPage';
import { TeachersReportPage } from '../pages/admin/TeachersReportPage';
import { PointsHubPage } from '../pages/admin/PointsHubPage';
import { EquityReportPage } from '../pages/admin/EquityReportPage';
import { ClassesReportPage } from '../pages/admin/ClassesReportPage';
import { ClassDetailReportPage } from '../pages/admin/ClassDetailReportPage';
import { ActivitySuggestionsPage } from '../pages/admin/ActivitySuggestionsPage';
import { ClassBulkGrantPage } from '../pages/admin/ClassBulkGrantPage';
import { EventCheckInPage } from '../pages/admin/EventCheckInPage';
import { RewardsManagementPage } from '../pages/admin/RewardsManagementPage';
import { AdminAttendanceHubPage } from '../pages/admin/AdminAttendanceHubPage';
import { MyProfilePage } from '../pages/student/MyProfilePage';
import { StudentPortfolioPage } from '../pages/student/StudentPortfolioPage';
import { StudentRewardsPage } from '../pages/student/StudentRewardsPage';
import { StudentProfilePage } from '../pages/parent/StudentProfilePage';
import { ParentAttendancePage } from '../pages/parent/ParentAttendancePage';
import { ParentExamResultsPage } from '../pages/parent/ParentExamResultsPage';

// Olympiad 1448H components
import { AdminDashboard } from '../components/admin/AdminDashboard';
import { AddPointsForm } from '../components/teacher/AddPointsForm';
import { ActivitiesManagement } from '../components/admin/ActivitiesManagement';
import { AdminUsersHub } from '../pages/admin/AdminUsersHub';
import { Leaderboard } from '../components/admin/Leaderboard';
import { AdminIdCardsHubPage } from '../pages/admin/AdminIdCardsHubPage';
import { Reports } from '../components/admin/Reports';
import { StudentDashboard } from '../components/student/StudentDashboard';
import { StudentCardPage } from '../components/shared/StudentCardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { QaSimulatorPage } from '../pages/qa/QaSimulatorPage';
import { UserGuidesPage } from '../pages/admin/UserGuidesPage';

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    path: '/invite/:token',
    element: <StaffInvitePage />,
  },
  {
    path: '/card/t/:qrToken',
    element: <StudentCardPage />,
  },
  {
    // Public card QR scanning route (bypasses auth checks)
    path: '/card/:studentId',
    element: <StudentCardPage />,
  },
  {
    path: '/verify/:code',
    element: <VerifyDocumentPage />,
  },
  {
    // All authenticated routes
    element: <ProtectedRoute />,
    children: [
      {
        path: '/force-password-change',
        element: <ForcePasswordChangePage />,
      },
      {
        element: <FirstLoginGate />,
        children: [
          {
            path: '/board/leaderboard',
            element: <LeaderboardDisplayPage />,
          },
          {
            element: <AppLayout />,
            children: [
          {
            path: '/',
            element: <DashboardPage />,
          },
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },

          // ─── توليد حسابات الفصل (مدير المدرسة) ─────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['principal']} />
            ),
            children: [
              {
                path: '/principal/bulk-accounts',
                element: <BulkAccountGenerator />,
              },
            ],
          },

          // ─── QA Simulator (قبل النشر) ───────────────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['principal', 'admin', 'activity_leader']} />
            ),
            children: [
              {
                path: '/qa/simulator',
                element: <QaSimulatorPage />,
              },
            ],
          },

          // ─── Principal Routes ───────────────────────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['principal']} />
            ),
            children: [
              {
                path: '/principal/users',
                element: <UsersPage />,
              },
              {
                path: '/principal/bulk-upload',
                element: <BulkUploadPage />,
              },
              {
                path: '/principal/reports',
                element: <ReportsPage />,
              },
              {
                path: '/principal/executive',
                element: <PrincipalExecutivePage />,
              },
              {
                path: '/principal/settings',
                element: <PrincipalClassesHubPage />,
              },
              {
                path: '/principal/student/:studentId',
                element: <Student360Page />,
              },
              {
                path: '/principal/audit-logs',
                element: <AuditLogsPage />,
              },
            ],
          },

          // ─── Activity Leader Routes (Deprecated/Fallback) ──
          {
            element: (
              <ProtectedRoute allowedRoles={['activity_leader', 'admin']} />
            ),
            children: [
              {
                path: '/activities',
                element: <ActivitiesPage />,
              },
              {
                path: '/points/approve',
                element: <ApprovePointsPage />,
              },
              {
                path: '/attendance',
                element: <AttendancePage />,
              },
            ],
          },

          // ─── تقارير الفصول والمعلمين (مشتركة) ─────────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['admin', 'activity_leader', 'supervisor', 'principal']} />
            ),
            children: [
              {
                path: '/admin/classes-report',
                element: <ClassesReportPage />,
              },
              {
                path: '/admin/class-report',
                element: <ClassDetailReportPage />,
              },
              {
                path: '/admin/teachers-report',
                element: <TeachersReportPage />,
              },
              {
                path: '/admin/equity',
                element: <EquityReportPage />,
              },
            ],
          },

          // ─── Admin (رائد النشاط) Routes (Olympiad 1448H) ────
          {
            element: (
              <ProtectedRoute allowedRoles={['admin', 'activity_leader']} />
            ),
            children: [
              {
                path: '/admin/user-guides',
                element: <UserGuidesPage />,
              },
              {
                path: '/admin',
                element: <AdminDashboard />,
              },
              {
                path: '/admin/add-points',
                element: <AddPointsForm adminMode={true} />,
              },
              {
                path: '/admin/activities',
                element: <ActivitiesManagement />,
              },
              {
                path: '/admin/users',
                element: <AdminUsersHub />,
              },
              {
                path: '/admin/bulk-accounts',
                element: <Navigate to="/admin/users?tab=bulk" replace />,
              },
              {
                path: '/admin/leaderboard',
                element: <Leaderboard />,
              },
              {
                path: '/admin/id-cards',
                element: <AdminIdCardsHubPage />,
              },
              {
                path: '/admin/reports',
                element: <Reports />,
              },
              {
                path: '/admin/points-log',
                element: <PointsLogPage />,
              },
              {
                path: '/admin/points',
                element: <PointsHubPage />,
              },
              {
                path: '/admin/settings',
                element: <ProgramSettingsPage />,
              },
              {
                path: '/admin/suggestions',
                element: <ActivitySuggestionsPage />,
              },
              {
                path: '/admin/bulk-grant',
                element: <ClassBulkGrantPage />,
              },
              {
                path: '/admin/event-checkin',
                element: <EventCheckInPage />,
              },
              {
                path: '/admin/rewards',
                element: <RewardsManagementPage />,
              },
              {
                path: '/admin/attendance',
                element: <AdminAttendanceHubPage />,
              },
            ],
          },

          // ─── Shared Points Granting Routes ───────────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['activity_leader', 'teacher', 'admin']} />
            ),
            children: [
              {
                path: '/points/grant',
                element: <GrantPointsPage />,
              },
            ],
          },

          // ─── Teacher Routes ─────────────────────────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['teacher', 'principal']} />
            ),
            children: [
              {
                path: '/students',
                element: <StudentsPage />,
              },
              {
                path: '/students/class-board',
                element: <StudentsPage />,
              },
              {
                path: '/students/messages',
                element: <StudentsPage />,
              },
              {
                path: '/teacher/analytics',
                element: <TeacherAnalyticsPage />,
              },
              {
                path: '/teacher/activity-log',
                element: <TeacherActivityLogPage />,
              },
              {
                path: '/teacher/lesson-plan',
                element: <TeacherLessonPlanPage />,
              },
            ],
          },

          // ─── Supervisor Routes ──────────────────────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['supervisor', 'principal']} />
            ),
            children: [
              {
                path: '/grade-subjects',
                element: <SubjectsByGradePage />,
              },
              {
                path: '/skills',
                element: <SkillsPage />,
              },
              {
                path: '/questions',
                element: <QuestionBankPage />,
              },
              {
                path: '/exams',
                element: <ExamBuilderPage />,
              },
              {
                path: '/analytics',
                element: <Navigate to="/analytics/class" replace />,
              },
              {
                path: '/analytics/:tab',
                element: <AnalyticsPage />,
              },
            ],
          },

          // ─── Student Routes (Olympiad 1448H) ────────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['student', 'admin', 'principal']} />
            ),
            children: [
              {
                path: '/student',
                element: <StudentDashboard />,
              },
              {
                path: '/student/exams',
                element: <StudentExamsPage />,
              },
              {
                path: '/student/exams/prep',
                element: <PrepExamPage />,
              },
              {
                path: '/student/exams/:examId/practice',
                element: <TakeExamPage practiceMode />,
              },
              {
                path: '/student/exams/:examId',
                element: <TakeExamPage />,
              },
              {
                path: '/exams/take',
                element: <Navigate to="/student/exams" replace />,
              },
              {
                path: '/leaderboard',
                element: <LeaderboardPage />,
              },
              {
                path: '/my-profile',
                element: <MyProfilePage />,
              },
              {
                path: '/student/portfolio',
                element: <StudentPortfolioPage />,
              },
              {
                path: '/student/rewards',
                element: <StudentRewardsPage />,
              },
            ],
          },

          // ─── Parent Routes ──────────────────────────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['parent', 'principal']} />
            ),
            children: [
              {
                path: '/student-profile',
                element: <StudentProfilePage />,
              },
              {
                path: '/attendance/view',
                element: <ParentAttendancePage />,
              },
              {
                path: '/exams/results',
                element: <ParentExamResultsPage />,
              },
            ],
          },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
    ],
  },
]);
