import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { initialGrades, initialLeaves, initialVisitors, staff as mockStaff, students as mockStudents } from '../data/mockData'
import { useAuth } from './AuthContext'
import { API_ENABLED, api } from '../services/api'

const AppDataContext = createContext(null)
const formatTime = (value) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
const formatDate = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}
const defaultSystemSettings = { studentQr: true, biometric: true, parentAlerts: true, leaveApprovals: true }
const mockAttendance = mockStudents.slice(0, 3).flatMap((student) => Array.from({ length: 14 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - index)
  return {
    student_id: student.id,
    date: date.toISOString().slice(0, 10),
    status: index === 8 ? 'Absent' : 'Present',
    check_in: index === 8 ? null : new Date(date.setHours(7, 42 + (index % 12), 0, 0)).toISOString(),
    check_out: null,
  }
}))
const mockAnnouncements = [
  { id: 'notice-1', title: 'Term 3 parent-teacher meetings', body: 'Meet your child’s teachers and contact the school office to select a time.', published_at: '2026-11-04T09:00:00Z' },
  { id: 'notice-2', title: 'Inter-house athletics meet', body: 'The annual athletics meet takes place on November 20. Students should arrive by 7:30 AM.', published_at: '2026-11-02T09:00:00Z' },
  { id: 'notice-3', title: 'Library hours update', body: 'The school library remains open until 4:00 PM on weekdays this term.', published_at: '2026-10-28T09:00:00Z' },
]
const formatGrades = (records) => records.reduce((result, grade) => {
  const studentId = grade.studentId ?? grade.student_id
  result[studentId] = { ...result[studentId], [grade.subject]: grade.score }
  return result
}, {})
const normalizeAttendanceRecord = (record) => ({
  ...record,
  student_id: record.studentId ?? record.student_id,
  check_in: record.checkIn ?? record.check_in,
  check_out: record.checkOut ?? record.check_out,
})

export function AppDataProvider({ children }) {
  const { user } = useAuth()
  const [leaves, setLeaves] = useState(API_ENABLED ? [] : initialLeaves)
  const [grades, setGrades] = useState(API_ENABLED ? {} : initialGrades)
  const [students, setStudents] = useState(API_ENABLED ? [] : mockStudents)
  const [staff, setStaff] = useState(API_ENABLED ? [] : mockStaff)
  const [visitors, setVisitors] = useState(API_ENABLED ? [] : initialVisitors)
  const [gateEvents, setGateEvents] = useState(API_ENABLED ? [] : [
    { id: 1, student: mockStudents[0], time: '9:32 AM', type: 'Entry' },
    { id: 2, student: mockStudents[1], time: '9:27 AM', type: 'Entry' },
    { id: 3, student: mockStudents[2], time: '9:18 AM', type: 'Entry' },
  ])
  const [attendanceRecords, setAttendanceRecords] = useState(API_ENABLED ? [] : mockAttendance)
  const [staffAttendance, setStaffAttendance] = useState(API_ENABLED ? [] : mockStaff.slice(0, 5).map((person) => ({
    id: `mock-${person.id}`,
    staffId: person.id,
    name: person.name,
    role: person.role,
    checkIn: new Date().setHours(7, 45, 0, 0),
    checkOut: null,
  })))
  const [announcements, setAnnouncements] = useState(API_ENABLED ? [] : mockAnnouncements)
  const [dashboard, setDashboard] = useState(API_ENABLED ? null : {
    students: 2000,
    staff: 100,
    teachers: 90,
    officeStaff: 10,
    presentStudents: 1936,
    attendancePercent: 96.8,
    pendingLeaves: 2,
    activeVisitors: 2,
  })
  const [systemSettings, setSystemSettings] = useState(API_ENABLED ? {} : defaultSystemSettings)
  const [loading, setLoading] = useState(API_ENABLED)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const notify = useCallback((message) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(''), 2800)
  }, [])

  useEffect(() => {
    if (!API_ENABLED) return
    if (!user) {
      setStudents([])
      setLeaves([])
      setGateEvents([])
      setGrades({})
      setStaff([])
      setVisitors([])
      setAttendanceRecords([])
      setStaffAttendance([])
      setAnnouncements([])
      setDashboard(null)
      setSystemSettings({})
      setLoadError('')
      setLoading(false)
      return
    }

    let active = true
    let loadingInitialData = true
    let requestInProgress = false
    let syncFailed = false
    setLoadError('')
    setLoading(true)
    const role = user.role ?? user.id
    const loadRecords = async () => {
      if (requestInProgress) return
      requestInProgress = true
      try {
        const [
          studentRecords,
          leaveRecords,
          events,
          attendance,
          notices,
          staffRecords,
          visitorRecords,
          staffRecordsToday,
          summary,
          gradeRecords,
          settings,
        ] = await Promise.all([
          api.students.list(),
          api.leaves.list(),
          api.attendance.list(),
          api.attendance.history(),
          api.announcements.list(),
          ['principal', 'office', 'teacher'].includes(role) ? api.staff.list() : Promise.resolve([]),
          ['principal', 'office', 'security'].includes(role) ? api.visitors.list() : Promise.resolve([]),
          ['principal', 'office', 'teacher'].includes(role) ? api.staffAttendance.list() : Promise.resolve([]),
          ['principal', 'office', 'teacher', 'security'].includes(role) ? api.dashboard.summary() : Promise.resolve(null),
          ['principal', 'office', 'teacher', 'student', 'parent'].includes(role)
            ? api.grades.list()
            : Promise.resolve([]),
          api.settings.list(),
        ])
        if (!active) return
        setStudents(studentRecords)
        setLeaves(leaveRecords.map((leave) => ({ ...leave, date: formatDate(leave.date) })))
        setGateEvents(events.map((event) => ({ ...event, time: formatTime(event.time) })))
        setAttendanceRecords(attendance.map(normalizeAttendanceRecord))
        setAnnouncements(notices.map((notice) => ({
          ...notice,
          published_at: notice.publishedAt ?? notice.published_at,
        })))
        setStaff(staffRecords)
        setVisitors(visitorRecords.map((visitor) => ({
          ...visitor,
          time: formatTime(visitor.time),
          checkout: visitor.checkout ? formatTime(visitor.checkout) : null,
        })))
        setStaffAttendance(staffRecordsToday)
        setDashboard(summary)
        setGrades(formatGrades(gradeRecords))
        setSystemSettings({
          ...defaultSystemSettings,
          ...Object.fromEntries(settings.map((setting) => [setting.key, setting.enabled])),
        })
        setLoadError('')
        if (syncFailed) notify('Live data sync restored')
        syncFailed = false
      } catch (error) {
        if (active && loadingInitialData) {
          setLoadError(`Could not load school records: ${error.message}`)
        } else if (active && !syncFailed) {
          notify(`Live data sync failed: ${error.message}`)
        }
        syncFailed = true
      } finally {
        requestInProgress = false
        if (active && loadingInitialData) {
          loadingInitialData = false
          setLoading(false)
        }
      }
    }

    void loadRecords()
    const refreshTimer = window.setInterval(loadRecords, 5000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [user, notify])

  const addLeave = async (leave) => {
    if (API_ENABLED) {
      try {
        const saved = await api.leaves.create({
          date: leave.date,
          start: leave.start,
          end: leave.end,
          reason: leave.reason,
        })
        setLeaves((current) => [{ ...saved, date: formatDate(saved.date) }, ...current])
        notify('Leave request sent to the principal')
        return true
      } catch (error) {
        notify(`Could not submit leave request: ${error.message}`)
        return false
      }
    }
    setLeaves((current) => [{ ...leave, id: `LV-${Date.now().toString().slice(-5)}`, status: 'Pending' }, ...current])
    notify('Leave request sent to the principal')
    return true
  }

  const reviewLeave = async (id, status, remarks = '') => {
    if (API_ENABLED) {
      try {
        const saved = await api.leaves.review(id, { status, remarks })
        setLeaves((current) => current.map((leave) => leave.id === id ? { ...saved, date: formatDate(saved.date) } : leave))
        notify(`Request ${status.toLowerCase()}`)
        return true
      } catch (error) {
        notify(`Could not review leave request: ${error.message}`)
        return false
      }
    }
    setLeaves((current) => current.map((leave) => leave.id === id ? { ...leave, status, remarks } : leave))
    notify(`Request ${status.toLowerCase()}`)
    return true
  }

  const updateGrade = async (studentId, subject, score) => {
    const value = Number(score)
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      notify('Enter a mark between 0 and 100')
      return false
    }
    if (API_ENABLED) {
      try {
        const saved = await api.grades.save({
          studentId,
          subject,
          academicYear: 2026,
          term: 'Term 3',
          score: value,
        })
        setGrades((current) => ({
          ...current,
          [saved.studentId ?? saved.student_id]: {
            ...(current[saved.studentId ?? saved.student_id] ?? {}),
            [saved.subject]: saved.score,
          },
        }))
        notify('Grade saved')
        return true
      } catch (error) {
        notify(`Could not save grade: ${error.message}`)
        return false
      }
    }
    setGrades((current) => ({ ...current, [studentId]: { ...(current[studentId] ?? {}), [subject]: value } }))
    return true
  }

  const recordGateEntry = async (student, type = 'Entry') => {
    if (API_ENABLED) {
      try {
        const saved = await api.attendance.record({ studentId: student.id, type })
        setGateEvents((current) => [{ ...saved, time: formatTime(saved.time) }, ...current])
        setStudents((current) => current.map((item) => item.id === student.id
          ? { ...item, attendance: type === 'Entry' ? 'Present' : item.attendance }
          : item))
        setAttendanceRecords((current) => {
          const today = new Date().toISOString().slice(0, 10)
          const existing = current.find((record) => record.student_id === student.id && record.date === today)
          if (!existing) return [{ student_id: student.id, date: today, status: 'Present', check_in: saved.time, check_out: null }, ...current]
          return current.map((record) => record === existing
            ? { ...record, ...(type === 'Entry' ? { check_in: saved.time, status: 'Present' } : { check_out: saved.time }) }
            : record)
        })
        notify(`${student.name} verified — gate ${type.toLowerCase()} logged`)
        return true
      } catch (error) {
        notify(`Could not record gate event: ${error.message}`)
        return false
      }
    }
    const event = { id: Date.now(), student, time: formatTime(new Date()), type }
    setGateEvents((current) => [event, ...current])
    setStudents((current) => current.map((item) => item.id === student.id ? { ...item, attendance: 'Present' } : item))
    notify(`${student.name} verified — gate ${type.toLowerCase()} logged`)
    return true
  }

  const addVisitor = async (visitor) => {
    if (API_ENABLED) {
      try {
        const saved = await api.visitors.create(visitor)
        setVisitors((current) => [{ ...saved, time: formatTime(saved.time), checkout: null }, ...current])
        notify('Visitor check-in recorded')
        return true
      } catch (error) {
        notify(`Could not register visitor: ${error.message}`)
        return false
      }
    }
    setVisitors((current) => [{ ...visitor, id: `VS-${Date.now().toString().slice(-4)}`, time: formatTime(new Date()), status: 'On premises' }, ...current])
    notify('Visitor check-in recorded')
    return true
  }

  const checkoutVisitor = async (id) => {
    if (API_ENABLED) {
      try {
        const saved = await api.visitors.checkout(id)
        setVisitors((current) => current.map((visitor) => visitor.id === id
          ? { ...saved, time: visitor.time, checkout: formatTime(saved.checkout) }
          : visitor))
        notify('Visitor checked out')
        return true
      } catch (error) {
        notify(`Could not check out visitor: ${error.message}`)
        return false
      }
    }
    setVisitors((current) => current.map((visitor) => visitor.id === id ? { ...visitor, status: 'Checked out', checkout: formatTime(new Date()) } : visitor))
    notify('Visitor checked out')
    return true
  }

  const addStudent = async (student) => {
    if (API_ENABLED) {
      try {
        const saved = await api.students.create(student)
        setStudents((current) => [saved, ...current])
        notify('Student profile created')
        return true
      } catch (error) {
        notify(`Could not create student profile: ${error.message}`)
        return false
      }
    }
    setStudents((current) => {
      const lastId = current.reduce((max, item) => Math.max(max, Number(item.id.slice(3)) || 0), 0)
      return [{ ...student, id: `CC-${String(lastId + 1).padStart(4, '0')}`, attendance: 'Present' }, ...current]
    })
    notify('Student profile created')
    return true
  }

  const updateStudent = async (id, changes) => {
    if (API_ENABLED) {
      try {
        const saved = await api.students.update(id, changes)
        setStudents((current) => current.map((student) => student.id === id ? saved : student))
        notify('Student profile updated')
        return true
      } catch (error) {
        notify(`Could not update student profile: ${error.message}`)
        return false
      }
    }
    setStudents((current) => current.map((student) => student.id === id ? { ...student, ...changes } : student))
    notify('Student profile updated')
    return true
  }

  const deleteStudent = async (id) => {
    if (API_ENABLED) {
      try {
        await api.students.delete(id)
        setStudents((current) => current.filter((student) => student.id !== id))
        notify('Student profile deleted')
        return true
      } catch (error) {
        notify(`Could not delete student profile: ${error.message}`)
        return false
      }
    }
    setStudents((current) => current.filter((student) => student.id !== id))
    notify('Student profile deleted')
    return true
  }

  const addStaffMember = async (person) => {
    if (API_ENABLED) {
      try {
        const saved = await api.staff.create(person)
        setStaff((current) => [saved, ...current])
        notify('Staff profile created')
        return true
      } catch (error) {
        notify(`Could not create staff profile: ${error.message}`)
        return false
      }
    }
    setStaff((current) => {
      const lastId = current.reduce((max, item) => Math.max(max, Number(item.id.slice(3)) || 0), 0)
      return [{ ...person, id: `ST-${String(lastId + 1).padStart(3, '0')}`, status: 'Active' }, ...current]
    })
    notify('Staff profile created')
    return true
  }

  const updateStaffMember = async (id, changes) => {
    if (API_ENABLED) {
      try {
        const saved = await api.staff.update(id, changes)
        setStaff((current) => current.map((person) => person.id === id ? saved : person))
        notify('Staff profile updated')
        return true
      } catch (error) {
        notify(`Could not update staff profile: ${error.message}`)
        return false
      }
    }
    setStaff((current) => current.map((person) => person.id === id ? { ...person, ...changes } : person))
    notify('Staff profile updated')
    return true
  }

  const deleteStaffMember = async (id) => {
    if (API_ENABLED) {
      try {
        await api.staff.delete(id)
        setStaff((current) => current.filter((person) => person.id !== id))
        notify('Staff profile deleted')
        return true
      } catch (error) {
        notify(`Could not delete staff profile: ${error.message}`)
        return false
      }
    }
    setStaff((current) => current.filter((person) => person.id !== id))
    notify('Staff profile deleted')
    return true
  }

  const recordStaffAttendance = async (type) => {
    if (API_ENABLED) {
      try {
        const saved = await api.staffAttendance.record(type)
        setStaffAttendance((current) => [
          saved,
          ...current.filter((record) => record.staffId !== saved.staffId),
        ])
        notify(`Staff ${type === 'in' ? 'check-in' : 'check-out'} saved`)
        return saved
      } catch (error) {
        notify(`Could not record staff attendance: ${error.message}`)
        return null
      }
    }
    return { checkIn: type === 'in' ? new Date().toISOString() : null, checkOut: type === 'out' ? new Date().toISOString() : null }
  }

  const updateSystemSetting = async (key, enabled) => {
    if (API_ENABLED) {
      try {
        const saved = await api.settings.update(key, enabled)
        setSystemSettings((current) => ({ ...current, [saved.key]: saved.enabled }))
        notify('System setting saved')
        return true
      } catch (error) {
        notify(`Could not save system setting: ${error.message}`)
        return false
      }
    }
    setSystemSettings((current) => ({ ...current, [key]: enabled }))
    notify('System setting saved')
    return true
  }

  const value = useMemo(() => ({
    leaves, grades, students, staff, visitors, gateEvents, attendanceRecords,
    staffAttendance, announcements, dashboard, systemSettings, loading, loadError, toast,
    addLeave, reviewLeave, updateGrade, recordGateEntry, addVisitor, checkoutVisitor,
    addStudent, updateStudent, deleteStudent, addStaffMember, updateStaffMember,
    deleteStaffMember, recordStaffAttendance, updateSystemSetting, notify,
  }), [leaves, grades, students, staff, visitors, gateEvents, attendanceRecords, staffAttendance, announcements, dashboard, systemSettings, loading, loadError, toast])
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData() {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData must be used within AppDataProvider')
  return context
}
