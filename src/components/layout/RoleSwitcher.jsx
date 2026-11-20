import { ChevronDown, ShieldCheck } from 'lucide-react'
import { roles, useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { API_ENABLED } from '../../services/api'

export default function RoleSwitcher({ compact = false }) {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  if (API_ENABLED) return null
  return <label className={`relative flex items-center gap-2 ${compact ? '' : 'rounded-lg border border-line bg-white px-3 py-2'}`}>
    {!compact && <ShieldCheck size={15} className="text-blue-200" />}
    <select aria-label="Quick role switcher" value={user?.id ?? ''} onChange={(event) => {
      const role = roles.find((item) => item.id === event.target.value)
      signIn(role.id, role.email)
      navigate(`/${role.id}`)
    }} className={`appearance-none bg-transparent pr-5 text-sm font-medium text-ink outline-none ${compact ? 'h-10 w-full rounded-lg border border-slate-200 px-3 focus:border-blue-500' : 'max-w-[110px] sm:max-w-[150px]'}`}>
      {!user && <option value="" disabled>Switch role</option>}
      {roles.map((role) => <option className="text-ink" value={role.id} key={role.id}>{role.label}</option>)}
    </select>
    {!compact && <ChevronDown size={14} className="pointer-events-none absolute right-3 text-slate-300" />}
  </label>
}
