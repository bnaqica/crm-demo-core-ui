import type { ReactNode } from 'react'
import { NavLink, Outlet, Route, Routes } from 'react-router'
import { useCan, useCapabilities } from '../capabilities'
import { SignOutButton } from '../auth/SignOutButton'
import { NotAuthorizedPage, NotFoundPage } from '../pages/StatusPages'
import { TeamProvider } from './TeamContext'
import { TeamSwitcher } from './TeamSwitcher'

/** One declaration per page: the menu and the route guard both read `permission`. */
export type AppRoute = {
  path: string
  label: string
  permission?: string
  element: ReactNode
  /** Child pages (e.g. a detail route) guarded by the same permission but not shown in the menu. */
  children?: { path: string; element: ReactNode }[]
}

function RequirePermission({ permission, children }: { permission?: string; children: ReactNode }) {
  const allowed = useCan(permission ?? '', undefined)
  if (permission && !allowed) return <NotAuthorizedPage />
  return <>{children}</>
}

function NavItem({ route }: { route: AppRoute }) {
  const allowed = useCan(route.permission ?? '')
  if (route.permission && !allowed) return null
  return (
    <li>
      <NavLink to={route.path} end={route.path === '/'}>
        {route.label}
      </NavLink>
    </li>
  )
}

function Layout({ routes }: { routes: AppRoute[] }) {
  const caps = useCapabilities()
  return (
    <div className="app">
      <header className="app-header">
        <strong className="brand">CRM</strong>
        <nav aria-label="Main">
          <ul>
            {routes.map((route) => (
              <NavItem key={route.path} route={route} />
            ))}
          </ul>
        </nav>
        <TeamSwitcher />
        <span className="user-name">{caps.name}</span>
        <SignOutButton />
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

export function AppRoutes({ routes }: { routes: AppRoute[] }) {
  return (
    <TeamProvider>
      <Routes>
        <Route element={<Layout routes={routes} />}>
          {routes.map((route) => (
            <Route key={route.path} path={route.path}>
              <Route index element={<RequirePermission permission={route.permission}>{route.element}</RequirePermission>} />
              {route.children?.map((child) => (
                <Route
                  key={child.path}
                  path={child.path}
                  element={<RequirePermission permission={route.permission}>{child.element}</RequirePermission>}
                />
              ))}
            </Route>
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </TeamProvider>
  )
}
