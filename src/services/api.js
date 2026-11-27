const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
export const API_ENABLED = Boolean(import.meta.env.VITE_API_BASE_URL)

let accessToken = typeof window === 'undefined' ? null : window.sessionStorage.getItem('accessToken')

export function setAccessToken(token) {
  accessToken = token
  if (typeof window !== 'undefined') {
    if (token) window.sessionStorage.setItem('accessToken', token)
    else window.sessionStorage.removeItem('accessToken')
  }
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const body = await response.json()
      detail = body.detail ?? detail
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
    }
    throw new Error(typeof detail === 'string' ? detail : `API request failed (${response.status})`)
  }
  if (response.status === 204) return null
  return response.json()
}

export const api = {
  auth: {
    login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  },
  students: {
    list: (params = '') => request(`/students${params ? `?${params}` : ''}`),
    get: (id) => request(`/students/${encodeURIComponent(id)}`),
    create: (student) => request('/students', { method: 'POST', body: JSON.stringify(student) }),
    update: (id, student) => request(`/students/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(student) }),
    delete: (id) => request(`/students/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  attendance: {
    list: () => request('/attendance'),
    record: (event) => request('/attendance', { method: 'POST', body: JSON.stringify(event) }),
    history: (studentId) => request(`/attendance/records${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`),
  },
  grades: {
    list: (studentId) => request(`/grades${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ''}`),
    save: (grade) => request('/grades', { method: 'PUT', body: JSON.stringify(grade) }),
  },
  timetable: {
    list: () => request('/timetable'),
    create: (entry) => request('/timetable', { method: 'POST', body: JSON.stringify(entry) }),
    update: (id, entry) => request(`/timetable/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(entry) }),
    delete: (id) => request(`/timetable/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  staff: {
    list: () => request('/staff'),
    create: (staff) => request('/staff', { method: 'POST', body: JSON.stringify(staff) }),
    update: (id, staff) => request(`/staff/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(staff) }),
    delete: (id) => request(`/staff/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },
  visitors: {
    list: () => request('/visitors'),
    create: (visitor) => request('/visitors', { method: 'POST', body: JSON.stringify(visitor) }),
    checkout: (id) => request(`/visitors/${encodeURIComponent(id)}/checkout`, { method: 'PATCH' }),
  },
  staffAttendance: {
    list: () => request('/staff-attendance'),
    record: (type) => request('/staff-attendance', { method: 'POST', body: JSON.stringify({ type }) }),
  },
  announcements: { list: () => request('/announcements') },
  dashboard: { summary: () => request('/dashboard') },
  settings: {
    list: () => request('/settings'),
    update: (key, enabled) => request(`/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    }),
  },
  leaves: {
    list: () => request('/leaves'),
    create: (leave) => request('/leaves', { method: 'POST', body: JSON.stringify(leave) }),
    review: (id, decision) => request(`/leaves/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(decision) }),
  },
}
