import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, GraduationCap, Users } from 'lucide-react'
import { Badge, Button, DataTable, PageHeader, Panel, StatCard } from '../../components/common/UI'
import BiometricSim from '../../components/modules/BiometricSim'
import ShortLeaveForm from '../../components/modules/ShortLeaveForm'
import { useAppData } from '../../context/AppDataContext'
import { useAuth } from '../../context/AuthContext'
import { subjects } from '../../data/mockData'

function TeacherDashboard() {
  const { leaves, timetable } = useAppData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const pending = leaves.filter((leave) => leave.status === 'Pending' && leave.name === user?.name).length
  const today = new Date().toLocaleDateString('en', { weekday: 'long' })
  const todayEntries = timetable
    .filter((entry) => entry.dayOfWeek === today && (!user?.staffId || entry.teacherId === user.staffId))
    .sort((left, right) => left.startTime.localeCompare(right.startTime))
  return <><PageHeader eyebrow="Teaching tools" title={`Good morning, ${user?.name ?? 'Teacher'}`} description="Your teaching day at a glance." action={<Button variant="secondary" onClick={() => navigate('/teacher/timetable')}><CalendarDays size={15} />Open timetable</Button>} /><div className="grid gap-4 sm:grid-cols-3"><StatCard label="Assigned classes" value={new Set(timetable.map((entry) => entry.className)).size} note="From your weekly schedule" icon={Users} accent="blue" /><StatCard label="Students" value="126" note="Across all sections" icon={GraduationCap} accent="violet" /><StatCard label="Leave requests" value={pending} note="Awaiting principal review" icon={CalendarDays} accent="amber" /></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><BiometricSim /><Panel title="Today’s timetable" subtitle={new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}>{todayEntries.length ? <div className="space-y-3">{todayEntries.map((entry) => <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-line p-3"><span className="h-9 w-1 rounded-full bg-blue-600" /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{entry.subject}</p><p className="text-xs text-muted">{entry.className} · {entry.room}</p></div><span className="text-xs font-medium text-muted">{entry.startTime.slice(0, 5)} – {entry.endTime.slice(0, 5)}</span></div>)}</div> : <p className="py-8 text-center text-sm text-muted">No classes are scheduled for today.</p>}</Panel></div></>
}

function TeacherTimetable() {
  const { timetable } = useAppData()
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  return <><PageHeader eyebrow="Teaching tools" title="My timetable" description="Your weekly classes, synced from the school schedule." />{days.map((day) => {
    const entries = timetable
      .filter((entry) => entry.dayOfWeek === day)
      .sort((left, right) => left.startTime.localeCompare(right.startTime))
    return <Panel key={day} title={day} className="mb-4">{entries.length ? <div className="divide-y divide-line">{entries.map((entry) => <div key={entry.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="w-28 text-sm font-semibold text-ink">{entry.startTime.slice(0, 5)} – {entry.endTime.slice(0, 5)}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{entry.subject}</p><p className="text-xs text-muted">{entry.className} · {entry.room}</p></div></div>)}</div> : <p className="text-sm text-muted">No classes scheduled.</p>}</Panel>
  })}</>
}

function GradeManagement() {
  const { grades, students, updateGrade } = useAppData()
  const roster = students.filter((student) => student.className === 'Grade 9A')
  return <><PageHeader eyebrow="Teaching tools" title="Gradebook" description="Term 3 assessment · Updates are saved to the school database and student and parent portals." /><Panel title="Grade 9A · Mathematics" subtitle="Enter scores from 0 to 100. Changes save to the database when you leave a score field."><div className="overflow-x-auto"><table className="w-full min-w-[790px] text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase text-muted"><th className="px-3 py-3">Student</th>{subjects.map((subject) => <th className="px-3 py-3" key={subject}>{subject}</th>)}</tr></thead><tbody className="divide-y divide-line">{roster.map((student) => <tr key={student.id}><td className="px-3 py-3"><div className="flex items-center gap-2"><img src={student.avatar} alt="" className="h-8 w-8 rounded-full" /><div><p className="font-semibold text-ink">{student.name}</p><p className="text-[11px] text-muted">{student.id}</p></div></div></td>{subjects.map((subject) => <td className="px-3 py-3" key={subject}><input aria-label={`${student.name} ${subject} mark`} type="number" min="0" max="100" defaultValue={grades[student.id]?.[subject] ?? ''} onBlur={(event) => { if (event.target.value !== '' && Number(event.target.value) !== (grades[student.id]?.[subject] ?? '')) updateGrade(student.id, subject, event.target.value) }} className="w-[66px] rounded-md border border-line px-2 py-1.5 text-center text-sm outline-none focus:border-blue-500" /></td>)}</tr>)}</tbody></table>{roster.length === 0 && <p className="py-8 text-center text-sm text-muted">No students are enrolled in Grade 9A yet.</p>}</div></Panel></>
}

function TeacherLeave() {
  const { leaves } = useAppData()
  const { user } = useAuth()
  const mine = leaves.filter((leave) => leave.name === user?.name)
  return <><PageHeader eyebrow="Time away" title="Short leave requests" description="Request time away during the school day and track the approval status." /><div className="grid items-start gap-5 xl:grid-cols-[.8fr_1.2fr]"><Panel title="New request" subtitle="7:00 AM – 5:00 PM"><ShortLeaveForm /></Panel><Panel title="Request tracker" subtitle="Your submitted short leave requests">{mine.length ? <div className="space-y-3">{mine.map((leave) => <div key={leave.id} className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-ink">{leave.date}</p><p className="mt-1 text-sm text-muted">{leave.slot}</p></div><Badge>{leave.status}</Badge></div><p className="mt-3 text-sm text-ink">{leave.reason}</p>{leave.remarks && <p className="mt-2 text-xs text-muted">Principal: {leave.remarks}</p>}</div>)}</div> : <p className="py-8 text-center text-sm text-muted">Your requests will appear here.</p>}</Panel></div></>
}

function ClassAttendance() {
  const { students } = useAppData()
  const roster = students.filter((student) => student.className === 'Grade 9A')
  const columns = [{ key: 'name', label: 'Student', render: (student) => <div><p className="font-semibold">{student.name}</p><p className="text-xs text-muted">{student.id}</p></div> }, { key: 'className', label: 'Class' }, { key: 'attendance', label: 'Today', render: (student) => <Badge>{student.attendance}</Badge> }]
  return <><PageHeader eyebrow="Teaching tools" title="Class attendance" description="Attendance snapshot for your assigned students." /><Panel title="Grade 9A roster" subtitle="Live attendance records"><DataTable rows={roster} columns={columns} /></Panel></>
}

export default function TeacherPages() {
  const path = useLocation().pathname
  if (path.endsWith('/timetable')) return <TeacherTimetable />
  if (path.endsWith('/grades')) return <GradeManagement />
  if (path.endsWith('/leaves')) return <TeacherLeave />
  if (path.endsWith('/attendance')) return <ClassAttendance />
  return <TeacherDashboard />
}
