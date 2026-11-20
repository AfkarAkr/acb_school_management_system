import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { BellRing, CalendarDays, GraduationCap, MessageSquareText, TrendingUp } from 'lucide-react'
import { Badge, Button, DataTable, PageHeader, Panel, SelectField, StatCard } from '../../components/common/UI'
import { useAppData } from '../../context/AppDataContext'
import { subjects } from '../../data/mockData'
import { downloadCsv } from '../../utils/downloadCsv'
import { useAuth } from '../../context/AuthContext'

function ParentPortal() {
  const { grades, gateEvents, students, attendanceRecords, announcements, systemSettings } = useAppData()
  const { user } = useAuth()
  const [childId, setChildId] = useState(students[0].id)
  const child = students.find((student) => student.id === childId) ?? students[0]
  const marks = grades[child.id] ?? {}
  const history = attendanceRecords.filter((record) => record.student_id === child.id)
  const presentDays = history.filter((record) => record.status === 'Present').length
  const attendanceRate = history.length ? Math.round((presentDays / history.length) * 1000) / 10 : 0
  const average = Object.keys(marks).length ? Math.round(Object.values(marks).reduce((total, mark) => total + Number(mark), 0) / Object.keys(marks).length) : 0
  const latestEvent = gateEvents.find((event) => event.student.id === child.id)
  return <><PageHeader eyebrow="Family portal" title={`Good morning, ${user?.name ?? 'Parent'}`} description="Stay connected with your child’s school day and progress." action={<div className="min-w-[190px]"><SelectField label="Viewing child" value={childId} onChange={(event) => setChildId(event.target.value)}>{students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}</SelectField></div>} />
    {latestEvent?.type === 'Entry' && systemSettings.parentAlerts !== false && <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-blue-700"><BellRing size={18} /></span><div className="flex-1"><p className="text-sm font-semibold text-blue-950">Your child arrived at school</p><p className="mt-1 text-xs text-blue-800">{child.name} scanned their student QR card at the gate at {latestEvent.time}.</p></div><Badge tone="present">Verified</Badge></div>}
    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Term average" value={`${average}%`} note={`${child.name} · Term 3`} icon={TrendingUp} accent="blue" /><StatCard label="Attendance" value={`${attendanceRate}%`} note={`${presentDays} of ${history.length} recorded school days`} icon={CalendarDays} accent="green" /><StatCard label="Class" value={child.className.replace('Grade ', '')} note={`Student ID ${child.id}`} icon={GraduationCap} accent="violet" /></div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_.8fr]"><Panel title={`${child.name.split(' ')[0]}’s academic results`} subtitle="Term 3 · 2026"><DataTable searchable={false} pageSize={6} rows={subjects.map((subject) => ({ subject, mark: marks[subject] }))} columns={[{ key: 'subject', label: 'Subject' }, { key: 'mark', label: 'Score', render: (row) => row.mark !== undefined ? `${row.mark} / 100` : 'Not published' }, { key: 'grade', label: 'Grade', render: (row) => row.mark === undefined ? '—' : <Badge tone={row.mark >= 80 ? 'present' : 'pending'}>{row.mark >= 90 ? 'A' : row.mark >= 80 ? 'B' : row.mark >= 70 ? 'C' : 'D'}</Badge> }]} /></Panel>
      <Panel title="School announcements" subtitle="Updates from Central College"><div className="space-y-4">{announcements.map((announcement) => <div key={announcement.id} className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600"><MessageSquareText size={15} /></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-ink">{announcement.title}</p><span className="text-[10px] text-muted">{new Date(announcement.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span></div><p className="mt-1 text-xs leading-relaxed text-muted">{announcement.body}</p></div></div>)}</div></Panel></div>
  </>
}

function ParentAcademics() {
  const { grades, students } = useAppData()
  const child = students[0]
  const marks = grades[child.id] ?? {}
  return <><PageHeader eyebrow="Family portal" title="Academic performance" description={`Read-only results for ${child.name}.`} action={<Button variant="secondary" onClick={() => downloadCsv(`${child.id}-report-card.csv`, [['Subject', 'Score'], ...subjects.map((subject) => [subject, marks[subject] ?? 'Not published'])])}>Download report card</Button>} /><Panel title="Term 3 examination results" subtitle={`${child.className} · 2026`}><DataTable searchable={false} rows={subjects.map((subject) => ({ subject, mark: marks[subject] }))} columns={[{ key: 'subject', label: 'Subject' }, { key: 'mark', label: 'Marks', render: (row) => row.mark !== undefined ? `${row.mark} / 100` : 'Not published' }, { key: 'grade', label: 'Grade', render: (row) => row.mark === undefined ? '—' : <Badge tone={row.mark >= 80 ? 'present' : 'pending'}>{row.mark >= 90 ? 'A' : row.mark >= 80 ? 'B' : row.mark >= 70 ? 'C' : 'D'}</Badge> }]} /></Panel></>
}

function ParentAttendance() {
  const { students, attendanceRecords } = useAppData()
  const child = students[0]
  const history = attendanceRecords.filter((record) => record.student_id === child.id)
  const presentDays = history.filter((record) => record.status === 'Present').length
  const absentDays = history.filter((record) => record.status === 'Absent').length
  const rate = history.length ? Math.round((presentDays / history.length) * 1000) / 10 : 0
  const recent = history.map((record) => ({ ...record, time: record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—', date: new Date(`${record.date}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) }))
  return <><PageHeader eyebrow="Family portal" title="Attendance records" description={`Read-only attendance history for ${child.name}.`} /><div className="mb-5 grid gap-4 sm:grid-cols-3"><StatCard label="Attendance rate" value={`${rate}%`} note="Based on recorded school days" icon={CalendarDays} accent="green" /><StatCard label="Present" value={`${presentDays} days`} note={`Out of ${history.length} recorded days`} icon={GraduationCap} accent="blue" /><StatCard label="Absent" value={`${absentDays} days`} note="Based on attendance records" icon={CalendarDays} accent="amber" /></div><Panel title="Recent attendance" subtitle={`Child: ${child.name}`}><DataTable searchable={false} rows={recent} columns={[{ key: 'date', label: 'Date' }, { key: 'time', label: 'Gate scan' }, { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> }]} /></Panel></>
}

function Announcements() {
  const { announcements } = useAppData()
  return <><PageHeader eyebrow="Stay informed" title="School announcements" description="News, notices and upcoming events from Central College." /><Panel title="Latest updates" subtitle="For parents and guardians"><div className="space-y-5">{announcements.map((announcement) => <article key={announcement.id} className="flex gap-4 border-b border-line pb-5 last:border-0 last:pb-0"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700"><MessageSquareText size={18} /></span><div><p className="font-semibold text-ink">{announcement.title}</p><p className="mt-1 text-xs leading-relaxed text-muted">{announcement.body}</p><p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-blue-700">{new Date(announcement.published_at).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p></div></article>)}</div></Panel></>
}

export default function ParentPages() {
  const path = useLocation().pathname
  if (path.endsWith('/academics')) return <ParentAcademics />
  if (path.endsWith('/attendance')) return <ParentAttendance />
  if (path.endsWith('/announcements')) return <Announcements />
  return <ParentPortal />
}
