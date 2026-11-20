import { createContext, useContext, useMemo, useState } from 'react'
import { API_ENABLED, setAccessToken } from '../services/api'

const AuthContext = createContext(null)

export const roles = [
  { id: 'principal', label: 'School Principal', short: 'Principal', email: 'demo.principal@centralcollege.edu' },
  { id: 'teacher', label: 'Teacher', short: 'Teacher', email: 'demo.teacher@centralcollege.edu' },
  { id: 'office', label: 'Office Staff', short: 'Office staff', email: 'demo.office@centralcollege.edu' },
  { id: 'security', label: 'Security Personnel', short: 'Security', email: 'demo.security@centralcollege.edu' },
  { id: 'student', label: 'Student', short: 'Student', email: 'demo.student@centralcollege.edu' },
  { id: 'parent', label: 'Parent', short: 'Parent', email: 'demo.parent@centralcollege.edu' },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!API_ENABLED || typeof window === 'undefined') return null
    const storedUser = window.sessionStorage.getItem('authenticatedUser')
    return storedUser ? JSON.parse(storedUser) : null
  })
  const signIn = (roleId, email) => {
    const role = roles.find((item) => item.id === roleId) ?? roles[0]
    setUser({ ...role, email: email || role.email })
  }
  const signInWithCredentials = (result) => {
    setAccessToken(result.access_token)
    window.sessionStorage.setItem('authenticatedUser', JSON.stringify(result.user))
    setUser(result.user)
  }
  const signOut = () => {
    setAccessToken(null)
    if (typeof window !== 'undefined') window.sessionStorage.removeItem('authenticatedUser')
    setUser(null)
  }
  const value = useMemo(() => ({ user, signIn, signInWithCredentials, signOut }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
