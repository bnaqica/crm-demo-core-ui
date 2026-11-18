import type { AppRoute } from './shell/AppRoutes'
import { HomePage } from './pages/HomePage'
import { SubmissionsPage } from './submissions/SubmissionsPage'
import { SubmissionDetailPage } from './submissions/SubmissionDetailPage'
import { RoutingRulesPage } from './routing-rules/RoutingRulesPage'

export const appRoutes: AppRoute[] = [
  { path: '/', label: 'Home', element: <HomePage /> },
  {
    path: '/submissions',
    label: 'Submissions',
    permission: 'submissions:read',
    element: <SubmissionsPage />,
    children: [{ path: ':id', element: <SubmissionDetailPage /> }],
  },
  { path: '/routing-rules', label: 'Routing rules', permission: 'routing-rules:write', element: <RoutingRulesPage /> },
]
