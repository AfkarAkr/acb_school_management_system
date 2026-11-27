import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, GraduationCap, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Button, Field, SelectField } from '../../components/common/UI'
import ThemeToggle from '../../components/layout/ThemeToggle'
import { roles, useAuth } from '../../context/AuthContext'
import { API_ENABLED, api } from '../../services/api'

const DEMO_PASSWORD = 'DemoSchool!2026'

export default function LoginPage() {
  const { signIn, signInWithCredentials } = useAuth()
  const navigate = useNavigate()
  const [roleId, setRoleId] = useState('principal')
  const [email, setEmail] = useState(roles[0].email)
  const [password, setPassword] = useState(API_ENABLED ? DEMO_PASSWORD : '')
  const [error, setError] = useState('')
  const selectRole = (id) => {
    setRoleId(id)
    setEmail(roles.find((role) => role.id === id)?.email ?? '')
    setPassword(API_ENABLED ? DEMO_PASSWORD : '')
    setError('')
  }
  const submit = async (event) => {
    event.preventDefault()
    if (!email.includes('@') || !password) return setError('Enter a valid email address and password to continue.')
    if (API_ENABLED) {
      try {
        const result = await api.auth.login({ email, password })
        signInWithCredentials(result)
        navigate(`/${result.user.id}`)
      } catch (requestError) {
        setError(requestError.message)
      }
      return
    }
    signIn(roleId, email)
    navigate(`/${roleId}`)
  }
  const role = roles.find((item) => item.id === roleId)
  return <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[1.05fr_.95fr]">
    <div className="relative hidden min-h-screen overflow-hidden bg-navy px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-20">
      <div className="absolute -right-36 -top-32 h-[500px] w-[500px] rounded-full border border-white/[.07]" /><div className="absolute -right-12 -top-8 h-[330px] w-[330px] rounded-full border border-white/[.08]" /><div className="absolute bottom-28 right-24 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_72%,rgba(59,130,246,.13),transparent_35%)]" />
      <div className="relative flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-[14px] bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg shadow-blue-950/30"><GraduationCap size={25} /></span><div><p className="font-bold tracking-wide">CENTRAL COLLEGE</p><p className="mt-0.5 text-[10px] uppercase tracking-[.2em] text-slate-400">School management</p></div></div>
      <div className="relative max-w-xl"><span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-xs text-blue-100"><Sparkles size={13} />A better way to move education forward</span><h1 className="font-display mt-6 text-5xl font-semibold leading-[1.12] tracking-[-.045em] xl:text-[58px]">One campus.<br /><span className="text-blue-300">Every connection.</span></h1><p className="mt-5 max-w-md text-base leading-7 text-slate-300">A thoughtful, connected experience for the people who make Central College extraordinary.</p>
        <div className="mt-10 grid max-w-md grid-cols-3 gap-5 rounded-2xl border border-white/[.08] bg-white/[.035] p-5 backdrop-blur-sm">{[['2,000', 'Active students'], ['100', 'Staff members'], ['6', 'Connected portals']].map(([value, label]) => <div key={label}><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-slate-400">{label}</p></div>)}</div>
      </div>
      <p className="relative text-xs text-slate-500">© 2026 Central College · Learning with purpose</p>
    </div>
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-5 py-10 lg:bg-white">
      <ThemeToggle className="absolute right-5 top-5" />
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-[13px] bg-navy text-white"><GraduationCap size={22} /></span><div><p className="text-sm font-bold text-ink">CENTRAL COLLEGE</p><p className="text-[10px] uppercase tracking-widest text-muted">School management</p></div></div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:rounded-[22px] sm:p-8">
          <div className="mb-7"><p className="mb-2 text-[10px] font-bold uppercase tracking-[.17em] text-blue-700">Welcome back</p><h2 className="font-display text-[26px] font-bold tracking-[-.035em] text-ink">Sign in to your portal</h2><p className="mt-2 text-[13px] text-muted">Use your Central College account to continue.</p></div>
          <form onSubmit={submit} className="space-y-4">
            <SelectField label={API_ENABLED ? 'Demo account' : 'Quick role switcher'} value={roleId} onChange={(event) => selectRole(event.target.value)}>{roles.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</SelectField>
            <Field label="Email address" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Field label="Password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            <div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-muted"><input type="checkbox" className="rounded border-slate-300 text-blue-700 focus:ring-blue-600" />Remember me</label><button type="button" className="font-semibold text-blue-700 hover:text-blue-900">Forgot password?</button></div>
            {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
            <Button className="w-full" type="submit">Sign in <ArrowRight size={16} /></Button>
          </form>
          {!API_ENABLED && <><div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-line" />Preview a portal instantly<span className="h-px flex-1 bg-line" /></div>
          <div className="grid grid-cols-3 gap-2">{roles.map((item) => <button key={item.id} onClick={() => { signIn(item.id, item.email); navigate(`/${item.id}`) }} className={`rounded-lg border px-2 py-2.5 text-[11px] font-semibold transition ${roleId === item.id ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-line text-muted hover:bg-slate-50 hover:text-ink'}`}>{item.short}</button>)}</div></>}
          <p className="mt-5 text-center text-[11px] text-muted"><ShieldCheck size={13} className="mr-1 inline" />{API_ENABLED ? 'Sign in with your school account' : `Secure access for ${role?.label.toLowerCase()}s`}</p>
        </div>
        <p className="mt-5 text-center text-[11px] text-muted">{API_ENABLED ? `Demo accounts use the shared password ${DEMO_PASSWORD}; it is prefilled when you select an account.` : <><Mail size={12} className="mr-1 inline" /><LockKeyhole size={12} className="mr-1 inline" />Demo mode · enter any password</>}</p>
      </div>
    </div>
  </div>
}
