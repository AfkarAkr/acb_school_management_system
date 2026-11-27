import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Activity, Bell, BookOpen, CalendarDays, CheckSquare, ChevronRight, ClipboardList, CreditCard, Fingerprint, GraduationCap, LayoutDashboard, LogOut, Menu, Settings, Shield, ShieldCheck, UserRound, Users, X } from 'lucide-react'
import { useAuth, roles } from '../../context/AuthContext'
import RoleSwitcher from './RoleSwitcher'
import ThemeToggle from './ThemeToggle'
import { Button, Skeleton, Toast } from '../common/UI'
import { useAppData } from '../../context/AppDataContext'

const iconMap = { LayoutDashboard, Users, CheckSquare, Settings, BookOpen, CalendarDays, Fingerprint, UserRound, Shield, ClipboardList, CreditCard, Activity }
const navByRole = {
  principal: [{ label: 'Overview', path: '/principal', icon: 'LayoutDashboard' }, { label: 'Students', path: '/principal/students', icon: 'Users' }, { label: 'Staff directory', path: '/principal/staff', icon: 'UserRound' }, { label: 'Timetable', path: '/principal/timetable', icon: 'CalendarDays' }, { label: 'Leave approvals', path: '/principal/leaves', icon: 'CheckSquare' }, { label: 'Security logs', path: '/principal/security', icon: 'Shield' }, { label: 'System settings', path: '/principal/config', icon: 'Settings' }],
  teacher: [{ label: 'My dashboard', path: '/teacher', icon: 'LayoutDashboard' }, { label: 'Timetable', path: '/teacher/timetable', icon: 'CalendarDays' }, { label: 'Gradebook', path: '/teacher/grades', icon: 'BookOpen' }, { label: 'Short leave', path: '/teacher/leaves', icon: 'CalendarDays' }, { label: 'Class attendance', path: '/teacher/attendance', icon: 'CheckSquare' }],
  office: [{ label: 'Overview', path: '/office', icon: 'LayoutDashboard' }, { label: 'Enrollment', path: '/office/enrollment', icon: 'Users' }, { label: 'Staff directory', path: '/office/staff', icon: 'UserRound' }, { label: 'Timetable', path: '/office/timetable', icon: 'CalendarDays' }, { label: 'Biometric devices', path: '/office/devices', icon: 'Fingerprint' }],
  security: [{ label: 'Gate overview', path: '/security', icon: 'LayoutDashboard' }, { label: 'Visitor logbook', path: '/security/visitors', icon: 'ClipboardList' }],
  student: [{ label: 'My portal', path: '/student', icon: 'LayoutDashboard' }, { label: 'Academic results', path: '/student/academics', icon: 'BookOpen' }, { label: 'Attendance', path: '/student/attendance', icon: 'CalendarDays' }, { label: 'Digital ID card', path: '/student/id', icon: 'CreditCard' }],
  parent: [{ label: 'Family overview', path: '/parent', icon: 'LayoutDashboard' }, { label: 'Academic results', path: '/parent/academics', icon: 'BookOpen' }, { label: 'Attendance', path: '/parent/attendance', icon: 'CalendarDays' }, { label: 'Announcements', path: '/parent/announcements', icon: 'Activity' }],
}

export default function AppLayout() {
  const { user, signOut } = useAuth()
  const { toast, loading, loadError } = useAppData()
  const [drawer, setDrawer] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const role = roles.find((item) => item.id === user?.id)
  const links = navByRole[user?.id] ?? []
  const closeAndGo = () => setDrawer(false)
  if (loading) {
    return <main className="min-h-screen bg-canvas p-8"><Skeleton className="mx-auto h-8 max-w-sm" /><Skeleton className="mx-auto mt-4 h-4 max-w-md" /><Skeleton className="mx-auto mt-10 h-64 max-w-5xl" /></main>
  }
  if (loadError) {
    return <main className="grid min-h-screen place-items-center bg-canvas p-6"><section className="max-w-lg rounded-2xl border border-line bg-white p-7 shadow-card"><h1 className="text-xl font-bold text-ink">School records are unavailable</h1><p role="alert" className="mt-3 text-sm text-muted">{loadError}</p><div className="mt-5 flex gap-2"><Button onClick={() => window.location.reload()}>Retry</Button><Button variant="secondary" onClick={() => { signOut(); navigate('/login') }}>Sign out</Button></div></section></main>
  }
  const sidebar = <div className="flex h-full flex-col bg-navy text-white">
    <div className="flex h-[68px] items-center gap-3 border-b border-white/[.08] px-4">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#304a9a] text-white"><GraduationCap size={20} /></div>
      <div><p className="font-display text-[15px] font-bold tracking-[-.02em]">Central College</p><p className="mt-0.5 text-[9px] uppercase tracking-[.16em] text-slate-400">Campus workspace</p></div>
    </div>
    <div className="mx-3 mt-4 flex items-center justify-between rounded-lg border border-white/[.09] bg-white/[.05] px-3 py-2"><span className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-300">{role?.label} portal</span><span className="flex items-center gap-1.5 text-[9px] text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" />Online</span></div>
    <p className="mb-2 mt-6 px-5 text-[9px] font-bold uppercase tracking-[.17em] text-slate-400">Workspace</p>
    <nav className="flex-1 space-y-1 px-2.5">{links.map(({ label, path, icon }) => {
      const Icon = iconMap[icon]
      return <NavLink key={path} to={path} end={path === `/${user?.id}`} onClick={closeAndGo} className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] transition ${isActive ? 'bg-[#263e89] text-white font-semibold shadow-sm' : 'text-slate-300 hover:bg-white/[.06] hover:text-white'}`}><Icon size={16} className="opacity-80 group-hover:opacity-100" />{label}</NavLink>
    })}</nav>
    <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg bg-white/[.05] px-3 py-2 text-[9px] font-medium text-slate-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />All campus systems online</div>
    <div className="border-t border-white/[.08] p-3"><div className="flex items-center gap-2.5"><img src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.label ?? 'User')}&backgroundColor=334766`} className="h-8 w-8 rounded-full bg-slate-600 ring-2 ring-white/10" alt="" /><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold">{user?.label}</p><p className="truncate text-[9px] text-slate-400">{user?.email}</p></div><button onClick={() => { signOut(); navigate('/login') }} aria-label="Sign out" className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"><LogOut size={15} /></button></div><p className="mt-3 font-display text-[11px] italic text-slate-400">Learning with purpose.</p></div>
  </div>
  return <div className="min-h-screen bg-canvas">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] lg:block">{sidebar}</aside>
    {drawer && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/50" onClick={() => setDrawer(false)} aria-label="Close menu" /><aside className="absolute inset-y-0 left-0 w-[280px] shadow-2xl">{sidebar}<button onClick={() => setDrawer(false)} className="absolute right-3 top-5 rounded-lg p-2 text-slate-300" aria-label="Close menu"><X size={18} /></button></aside></div>}
    <div className="lg:pl-[260px]">
      <header className="sticky top-0 z-20 flex h-[64px] items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-3"><button onClick={() => setDrawer(true)} className="rounded-xl p-2 text-ink hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu size={20} /></button><div className="hidden items-center gap-2 text-xs text-muted sm:flex"><span className="font-medium">Central College</span><ChevronRight size={13} /><span className="font-semibold text-ink">{links.find((item) => item.path === location.pathname)?.label ?? role?.short}</span></div><p className="text-sm font-semibold text-ink sm:hidden">{role?.short} portal</p></div>
        <div className="flex items-center gap-2 sm:gap-3"><span className="hidden rounded-full bg-slate-50 px-3 py-2 text-xs font-medium text-muted md:inline">{new Date().toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</span><RoleSwitcher /><ThemeToggle /><button className="relative rounded-xl border border-line bg-white p-2.5 text-muted transition hover:bg-slate-50 hover:text-ink" aria-label="Notifications"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" /></button><div className="hidden h-8 w-px bg-line sm:block" /><span className="hidden text-xs font-semibold text-ink sm:block">{user?.label}</span></div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6 lg:px-7"><Outlet /></main>
    </div>
    <Toast message={toast} />
  </div>
}
