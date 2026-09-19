import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { FirstLoginGate } from './FirstLoginGate';
import { OnboardingGate } from './OnboardingGate';
import { ForcePasswordChangePage } from '../pages/ForcePasswordChangePage';
import { SetupWhatsAppPage } from '../pages/SetupWhatsAppPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { StaffLoginPage } from '../pages/StaffLoginPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import { RegisterPage } from '../pages/RegisterPage';
import { TeacherRegisterPage } from '../pages/TeacherRegisterPage';
import { TeacherOnboardingPage } from '../pages/teacher/TeacherOnboardingPage';
import { DashboardPage } from '../pages/DashboardPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { UsersPage } from '../pages/principal/UsersPage';
import { BulkUploadPage } from '../pages/principal/BulkUploadPage';
import { BulkAccountGenerator } from '../components/users/BulkAccountGenerator';
import { AuditLogsPage } from '../pages/principal/AuditLogsPage';
import { ImportExportCenterPage } from '../pages/principal/ImportExportCenterPage';
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
import { LeaderboardBoardPage } from '../pages/leaderboard/LeaderboardBoardPage';
import { StudentsPage } from '../pages/teacher/StudentsPage';
import { TeacherAnalyticsPage } from '../pages/teacher/TeacherAnalyticsPage';
import { TeacherActivityLogPage } from '../pages/teacher/TeacherActivityLogPage';
import { TeacherLessonPlanPage } from '../pages/teacher/TeacherLessonPlanPage';
import { TeacherAiAssistantPage } from '../pages/teacher/TeacherAiAssistantPage';
import { VerifyDocumentPage } from '../pages/VerifyDocumentPage';
import { PointsLogPage } from '../pages/admin/PointsLogPage';
import { TeachersReportPage } from '../pages/admin/TeachersReportPage';
import { OlympiadReportsHubPage } from '../pages/admin/OlympiadReportsHubPage';
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
import { AcademicSetupGate } from './AcademicSetupGate';
import { AcademicTeacherSetupPage } from '../pages/academic/AcademicTeacherSetupPage';
import { AcademicStaffHubPage } from '../pages/academic/AcademicStaffHubPage';
import { AcademicHomeworkPage } from '../pages/academic/AcademicHomeworkPage';
import { AcademicWeeklyPlansPage } from '../pages/academic/AcademicWeeklyPlansPage';
import { AcademicMyWeeklyPlansPage } from '../pages/academic/AcademicMyWeeklyPlansPage';
import { AcademicSchedulePage } from '../pages/academic/AcademicSchedulePage';
import { AcademicLessonTopicsPage } from '../pages/academic/AcademicLessonTopicsPage';
import { AcademicExamReviewsPage } from '../pages/academic/AcademicExamReviewsPage';
import { AcademicCommunicationPage } from '../pages/academic/AcademicCommunicationPage';
import { AcademicReportsPage } from '../pages/academic/AcademicReportsPage';
import { AcademicExportPage } from '../pages/academic/AcademicExportPage';
import { AcademicTemplatesHubPage } from '../pages/academic/AcademicTemplatesHubPage';
import { AcademicTemplatesEditorPage } from '../pages/academic/AcademicTemplatesEditorPage';
import { AcademicSearchPage } from '../pages/academic/AcademicSearchPage';
import { AcademicCommunicationDetailPage } from '../pages/academic/AcademicCommunicationDetailPage';
import { AcademicReportDetailPage } from '../pages/academic/AcademicReportDetailPage';
import { PrincipalAcademicHubPage } from '../pages/principal/academic/PrincipalAcademicHubPage';
import { PrincipalAcademicSubjectsPage } from '../pages/principal/academic/PrincipalAcademicSubjectsPage';
import { PrincipalAcademicSectionsPage } from '../pages/principal/academic/PrincipalAcademicSectionsPage';
import { PrincipalAcademicStaffPage } from '../pages/principal/academic/PrincipalAcademicStaffPage';
import { PrincipalAcademicSettingsPage } from '../pages/principal/academic/PrincipalAcademicSettingsPage';
import { PrincipalAcademicAssignmentsPage } from '../pages/principal/academic/PrincipalAcademicAssignmentsPage';
import { PrincipalAcademicMonitoringPage } from '../pages/principal/academic/PrincipalAcademicMonitoringPage';
import { PrincipalAcademicExportTemplatesPage } from '../pages/principal/academic/PrincipalAcademicExportTemplatesPage';
import { PrincipalWhatsAppRemindersPage } from '../pages/principal/academic/PrincipalWhatsAppRemindersPage';
import { PrincipalAiSettingsPage } from '../pages/principal/academic/PrincipalAiSettingsPage';
import { ParentAcademicObservationPage } from '../pages/parent/ParentAcademicObservationPage';
import { ParentAcademicRequestsPage } from '../pages/parent/ParentAcademicRequestsPage';
import { ParentAcademicReviewsPage } from '../pages/parent/ParentAcademicReviewsPage';
import { ParentAcademicHomeworkPage } from '../pages/parent/ParentAcademicHomeworkPage';
import { ParentAcademicHubPage } from '../pages/parent/ParentAcademicHubPage';
import { ParentLinkChildPage } from '../pages/parent/ParentLinkChildPage';
import { AcademicObservationInboxPage } from '../pages/academic/AcademicObservationInboxPage';
import { TeacherObservationTasksPage } from '../pages/academic/TeacherObservationTasksPage';
import { StudentAcademicPage } from '../pages/student/StudentAcademicPage';
import { StudentAcademicReviewsPage } from '../pages/student/StudentAcademicReviewsPage';
import { DeputyExamResultsPage } from '../pages/academic/DeputyExamResultsPage';
import { DeputyAttendancePage } from '../pages/deputy/DeputyAttendancePage';
import { DeputyStudentsPage } from '../pages/deputy/DeputyStudentsPage';
import { DeputyTeacherEvaluationPage } from '../pages/academic/DeputyTeacherEvaluationPage';
import { PrincipalAttendanceMonitorPage } from '../pages/principal/academic/PrincipalAttendanceMonitorPage';
import { PrincipalStudentsRosterPage } from '../pages/principal/academic/PrincipalStudentsRosterPage';
import { PrincipalEvaluationHubPage } from '../pages/principal/evaluation/PrincipalEvaluationHubPage';
import { PrincipalEvaluationSettingsPage } from '../pages/principal/evaluation/PrincipalEvaluationSettingsPage';
import { PrincipalEvaluationCyclePage } from '../pages/principal/evaluation/PrincipalEvaluationCyclePage';
import { TeacherEvaluationPage } from '../pages/teacher/TeacherEvaluationPage';
import { PromoTourStartPage } from '../pages/promo/PromoTourStartPage';
import { ClassScreenPage } from '../pages/competition/ClassScreenPage';
import { AnswerScreenPage } from '../pages/competition/AnswerScreenPage';
import { CompLeaderboardPage } from '../pages/competition/CompLeaderboardPage';
import { CompAdminPage } from '../pages/competition/CompAdminPage';
import { DevLayout } from '../layouts/DevLayout';
import { DeveloperDashboard } from '../pages/dev/DeveloperDashboard';
import { DevVersionPage } from '../pages/dev/DevVersionPage';
import { DevEnvironmentPage } from '../pages/dev/DevEnvironmentPage';
import { DevDebugModePage } from '../pages/dev/DevDebugModePage';
import { DevHealthPage } from '../pages/dev/DevHealthPage';
import { DevJobsPage } from '../pages/dev/DevJobsPage';
import { DevQueuePage } from '../pages/dev/DevQueuePage';
import { DevWhatsAppMonitorPage } from '../pages/dev/DevWhatsAppMonitorPage';
import { DevFilesPage } from '../pages/dev/DevFilesPage';
import { DevStoragePage } from '../pages/dev/DevStoragePage';
import { DevErrorsPage } from '../pages/dev/DevErrorsPage';
import { DevKnowledgePage } from '../pages/dev/DevKnowledgePage';
import { DevAiUsagePage } from '../pages/dev/DevAiUsagePage';
import { DevPipelinePage } from '../pages/dev/DevPipelinePage';
import { DevAuditPage } from '../pages/dev/DevAuditPage';
import { DevQuestionsMonitorPage } from '../pages/dev/DevQuestionsMonitorPage';
import { DevImportExportPage } from '../pages/dev/DevImportExportPage';
import { DevPerformancePage } from '../pages/dev/DevPerformancePage';
import { DevRealtimeMonitorPage } from '../pages/dev/DevRealtimeMonitorPage';
import { DevSupabaseMonitorPage } from '../pages/dev/DevSupabaseMonitorPage';
import { DevAiServicesMonitorPage } from '../pages/dev/DevAiServicesMonitorPage';
import { DevSchedulesPage } from '../pages/dev/DevSchedulesPage';
import { DevDbExplorerPage } from '../pages/dev/DevDbExplorerPage';
import { DevSandboxPage } from '../pages/dev/DevSandboxPage';
import { DevLogsPage } from '../pages/dev/DevLogsPage';
import { DevCachePage } from '../pages/dev/DevCachePage';
import { DevPermissionsPage } from '../pages/dev/DevPermissionsPage';
import { DevFeatureFlagsPage } from '../pages/dev/DevFeatureFlagsPage';
import { DevBackupPage } from '../pages/dev/DevBackupPage';
import { DevSupportPage } from '../pages/dev/DevSupportPage';
import { SupportPage } from '../pages/SupportPage';
import { AdminBackupPage } from '../pages/admin/AdminBackupPage';

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
  {
    path: '/start',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/login/staff',
    element: <StaffLoginPage />,
  },
  {
    path: '/auth/callback',
    element: <AuthCallbackPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/register/teacher',
    element: <TeacherRegisterPage />,
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
    // شاشة كبيرة — لوحة المتصدرين فقط (عام، بدون تسجيل دخول)
    path: '/display/leaderboard',
    element: <LeaderboardBoardPage />,
  },
  {
    // المسابقة الفصلية — شاشات عامة (BenQ / ممثل الفصل / ترتيب)
    path: '/class/:slug',
    element: <ClassScreenPage />,
  },
  {
    path: '/answer/:slug',
    element: <AnswerScreenPage />,
  },
  {
    path: '/competition/leaderboard',
    element: <CompLeaderboardPage />,
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
        path: '/setup-whatsapp',
        element: <SetupWhatsAppPage />,
      },
      {
        path: '/onboarding',
        element: <OnboardingPage />,
      },
{
            element: <FirstLoginGate />,
            children: [
          {
            element: <OnboardingGate />,
            children: [
          // ─── Platform Developer Workspace (منفصل عن AppLayout المدرسي) ───
          {
            element: <ProtectedRoute allowedRoles={['platform_developer']} />,
            children: [
              {
                element: <DevLayout />,
                children: [
                  { path: '/dev', element: <DeveloperDashboard /> },
                  { path: '/dev/health', element: <DevHealthPage /> },
                  { path: '/dev/errors', element: <DevErrorsPage /> },
                  { path: '/dev/performance', element: <DevPerformancePage /> },
                  { path: '/dev/monitor/realtime', element: <DevRealtimeMonitorPage /> },
                  { path: '/dev/monitor/supabase', element: <DevSupabaseMonitorPage /> },
                  { path: '/dev/monitor/whatsapp', element: <DevWhatsAppMonitorPage /> },
                  { path: '/dev/monitor/ai', element: <DevAiServicesMonitorPage /> },
                  { path: '/dev/jobs', element: <DevJobsPage /> },
                  { path: '/dev/queue', element: <DevQueuePage /> },
                  { path: '/dev/schedules', element: <DevSchedulesPage /> },
                  { path: '/dev/files', element: <DevFilesPage /> },
                  { path: '/dev/storage', element: <DevStoragePage /> },
                  { path: '/dev/db', element: <DevDbExplorerPage /> },
                  { path: '/dev/knowledge', element: <DevKnowledgePage /> },
                  { path: '/dev/pipeline', element: <DevPipelinePage /> },
                  { path: '/dev/ai/usage', element: <DevAiUsagePage /> },
                  { path: '/dev/questions', element: <DevQuestionsMonitorPage /> },
                  { path: '/dev/import-export', element: <DevImportExportPage /> },
                  { path: '/dev/support', element: <DevSupportPage /> },
                  { path: '/dev/sandbox', element: <DevSandboxPage /> },
                  { path: '/dev/debug', element: <DevDebugModePage /> },
                  { path: '/dev/logs', element: <DevLogsPage /> },
                  { path: '/dev/tools/cache', element: <DevCachePage /> },
                  { path: '/dev/audit', element: <DevAuditPage /> },
                  { path: '/dev/tools/permissions', element: <DevPermissionsPage /> },
                  { path: '/dev/tools/feature-flags', element: <DevFeatureFlagsPage /> },
                  { path: '/dev/version', element: <DevVersionPage /> },
                  { path: '/dev/environment', element: <DevEnvironmentPage /> },
                  { path: '/dev/backup', element: <DevBackupPage /> },
                ],
              },
            ],
          },
          {
            path: '/promo-tour',
            element: <PromoTourStartPage />,
          },
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
          {
            path: '/support',
            element: <SupportPage />,
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
              {
                path: '/competition/admin',
                element: <CompAdminPage />,
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
                path: '/principal/import-export',
                element: <ImportExportCenterPage />,
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
                path: '/admin/reports-hub',
                element: <OlympiadReportsHubPage />,
              },
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
              {
                path: '/admin/backup',
                element: <AdminBackupPage />,
              },
              {
                path: '/principal/backup',
                element: <AdminBackupPage />,
              },
            ],
          },

          // ─── Shared Points Granting Routes ───────────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['activity_leader', 'teacher', 'admin', 'principal']} />
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
              {
                path: '/teacher/ai-assistant',
                element: <TeacherAiAssistantPage />,
              },
              {
                path: '/teacher/evaluation',
                element: <TeacherEvaluationPage />,
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
              {
                path: '/student/academic',
                element: <StudentAcademicPage />,
              },
              {
                path: '/student/academic/reviews',
                element: <StudentAcademicReviewsPage />,
              },
            ],
          },

          // ─── Academic Staff Module ───────────────────────────
          {
            element: (
              <ProtectedRoute allowedRoles={['teacher']} />
            ),
            children: [
              {
                path: '/teacher/onboarding',
                element: <TeacherOnboardingPage />,
              },
              {
                path: '/academic/teacher-setup',
                element: <AcademicTeacherSetupPage />,
              },
            ],
          },
          // صفحات أكاديمية مشتركة (المشرف: عرض فقط) — متاحة لكل الأدوار الأكاديمية
          {
            element: (
              <ProtectedRoute allowedRoles={['teacher', 'deputy', 'principal', 'supervisor']} />
            ),
            children: [
              {
                element: <AcademicSetupGate />,
                children: [
                  { path: '/academic', element: <AcademicStaffHubPage /> },
                  { path: '/academic/templates', element: <AcademicTemplatesHubPage /> },
                  { path: '/academic/templates/editor', element: <AcademicTemplatesEditorPage /> },
                  { path: '/academic/homework', element: <AcademicHomeworkPage /> },
                  { path: '/academic/weekly-plans', element: <AcademicWeeklyPlansPage /> },
                  { path: '/academic/my-weekly-plans', element: <AcademicMyWeeklyPlansPage /> },
                  { path: '/academic/search', element: <AcademicSearchPage /> },
                  { path: '/academic/observation-inbox', element: <AcademicObservationInboxPage /> },
                  { path: '/academic/reports', element: <AcademicReportsPage /> },
                  { path: '/academic/reports/:id', element: <AcademicReportDetailPage /> },
                ],
              },
            ],
          },
          // صفحات الطاقم الأكاديمي فقط (بدون المشرف)
          {
            element: (
              <ProtectedRoute allowedRoles={['teacher', 'deputy', 'principal']} />
            ),
            children: [
              {
                element: <AcademicSetupGate />,
                children: [
                  { path: '/academic/schedule', element: <AcademicSchedulePage /> },
                  { path: '/academic/lesson-topics', element: <AcademicLessonTopicsPage /> },
                  { path: '/academic/communication', element: <AcademicCommunicationPage /> },
                  { path: '/academic/communication/:id', element: <AcademicCommunicationDetailPage /> },
                  { path: '/academic/observation-tasks', element: <TeacherObservationTasksPage /> },
                  { path: '/academic/export', element: <AcademicExportPage /> },
                  { path: '/academic/exam-results', element: <DeputyExamResultsPage /> },
                ],
              },
            ],
          },
          // مراجعات PDF — معلم / مراجع / مدير / وكيل
          {
            element: (
              <ProtectedRoute allowedRoles={['teacher', 'deputy', 'principal', 'reviewer']} />
            ),
            children: [
              {
                element: <AcademicSetupGate />,
                children: [
                  { path: '/academic/reviews', element: <AcademicExamReviewsPage /> },
                ],
              },
            ],
          },
          {
            element: (
              <ProtectedRoute allowedRoles={['deputy', 'supervisor', 'principal']} />
            ),
            children: [
              { path: '/academic/teacher-evaluation', element: <DeputyTeacherEvaluationPage /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['deputy']} />,
            children: [
              { path: '/academic/attendance', element: <DeputyAttendancePage /> },
              { path: '/academic/students', element: <DeputyStudentsPage /> },
            ],
          },
          {
            element: (
              <ProtectedRoute allowedRoles={['principal']} />
            ),
            children: [
              { path: '/principal/academic', element: <PrincipalAcademicHubPage /> },
              { path: '/principal/academic/subjects', element: <PrincipalAcademicSubjectsPage /> },
              { path: '/principal/academic/sections', element: <PrincipalAcademicSectionsPage /> },
              { path: '/principal/academic/staff', element: <PrincipalAcademicStaffPage /> },
              { path: '/principal/academic/assignments', element: <PrincipalAcademicAssignmentsPage /> },
              { path: '/principal/academic/monitoring', element: <PrincipalAcademicMonitoringPage /> },
              { path: '/principal/academic/whatsapp-reminders', element: <PrincipalWhatsAppRemindersPage /> },
              { path: '/principal/academic/attendance', element: <PrincipalAttendanceMonitorPage /> },
              { path: '/principal/academic/students', element: <PrincipalStudentsRosterPage /> },
              { path: '/principal/academic/settings', element: <PrincipalAcademicSettingsPage /> },
              { path: '/principal/ai-settings', element: <PrincipalAiSettingsPage /> },
              { path: '/principal/academic/export-templates', element: <PrincipalAcademicExportTemplatesPage /> },
              { path: '/principal/evaluation', element: <PrincipalEvaluationHubPage /> },
              { path: '/principal/evaluation/settings', element: <PrincipalEvaluationSettingsPage /> },
              { path: '/principal/evaluation/cycle', element: <PrincipalEvaluationCyclePage /> },
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
                path: '/parent/link-child',
                element: <ParentLinkChildPage />,
              },
              {
                path: '/attendance/view',
                element: <ParentAttendancePage />,
              },
              {
                path: '/exams/results',
                element: <ParentExamResultsPage />,
              },
              {
                path: '/parent/academic',
                element: <ParentAcademicHubPage />,
                children: [
                  {
                    index: true,
                    element: <Navigate to="/parent/academic/homework" replace />,
                  },
                  {
                    path: 'homework',
                    element: <ParentAcademicHomeworkPage />,
                  },
                  {
                    path: 'request',
                    element: <ParentAcademicObservationPage />,
                  },
                  {
                    path: 'requests',
                    element: <ParentAcademicRequestsPage />,
                  },
                  {
                    path: 'reviews',
                    element: <ParentAcademicReviewsPage />,
                  },
                ],
              },
            ],
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
