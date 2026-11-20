import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Skeleton } from './components/common/UI'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import { useAuth } from './context/AuthContext'

const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'))
const PrincipalPages = lazy(() => import('./pages/principal/PrincipalPages.jsx'))
const TeacherPages = lazy(() => import('./pages/teacher/TeacherPages.jsx'))
const OfficePages = lazy(() => import('./pages/office/OfficePages.jsx'))
const SecurityPages = lazy(() => import('./pages/security/SecurityPages.jsx'))
const StudentPages = lazy(() => import('./pages/student/StudentPages.jsx'))
const ParentPages = lazy(() => import('./pages/parent/ParentPages.jsx'))

function RouteSkeleton() {
  return <div className="space-y-5"><div><Skeleton className="h-3 w-32" /><Skeleton className="mt-3 h-8 w-64" /><Skeleton className="mt-2 h-4 w-80 max-w-full" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Skeleton className="h-32" key={index} />)}</div><Skeleton className="h-64" /></div>
}

function LazyPage({ children }) {
  return <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
}

function roleRoutes(role, Page) {
  return <Route path={role} element={<ProtectedRoute role={role}><AppLayout /></ProtectedRoute>}>
    <Route index element={<LazyPage><Page /></LazyPage>} />
    <Route path="*" element={<LazyPage><Page /></LazyPage>} />
  </Route>
}

export default function App() {
  const { user } = useAuth()
  return <Routes>
    <Route path="/login" element={<LazyPage><LoginPage /></LazyPage>} />
    {roleRoutes('principal', PrincipalPages)}
    {roleRoutes('teacher', TeacherPages)}
    {roleRoutes('office', OfficePages)}
    {roleRoutes('security', SecurityPages)}
    {roleRoutes('student', StudentPages)}
    {roleRoutes('parent', ParentPages)}
    <Route path="/" element={<Navigate to={user ? `/${user.id}` : '/login'} replace />} />
    <Route path="*" element={<Navigate to={user ? `/${user.id}` : '/login'} replace />} />
  </Routes>
}
