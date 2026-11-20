import { useLocation } from 'react-router-dom'
import { useState } from 'react'
import { CalendarDays, Download, GraduationCap, TrendingUp } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Badge, Button, DataTable, PageHeader, Panel, StatCard } from '../../components/common/UI'
import { useAppData } from '../../context/AppDataContext'
import { subjects } from '../../data/mockData'
import { downloadQrSvg } from '../../utils/downloadQr'
import { downloadCsv } from '../../utils/downloadCsv'

function StudentPortal() {
  const { grades, students, attendanceRecords } = useAppData()
  const student = students[0]
  const marks = grades[student.id] ?? {}
  const history = attendanceRecords.filter((record) => record.student_id === student.id)
  const presentDays = history.filter((record) => record.status === 'Present').length
  const attendanceRate = history.length ? Math.round((presentDays / history.length) * 1000) / 10 : 0
  const columns = [{ key: 'subject', label: 'Subject' }, { key: 'teacher', label: 'Teacher' }, { key: 'marks', label: 'Term 3 score', render: (row) => marks[row.subject] !== undefined ? <span className="font-semibold">{marks[row.subject]} / 100</span> : <span className="text-muted">Not published</span> }, { key: 'grade', label: 'Grade', render: (row) => { const mark = marks[row.subject]; return mark === undefined ? '—' : <Badge tone={mark >= 80 ? 'present' : mark >= 60 ? 'pending' : 'absent'}>{mark >= 90 ? 'A' : mark >= 80 ? 'B' : mark >= 70 ? 'C' : mark >= 60 ? 'D' : 'E'}</Badge> } }]
  return <><PageHeader eyebrow="Student learning portal" title={`Welcome back, ${student.name.split(' ')[0]}`} description="Your learning, attendance and school identity in one place." /><div className="grid gap-5 xl:grid-cols-[1.4fr_.8fr]"><Panel title="My student profile" subtitle="Your Central College identity"><div className="flex flex-col gap-5 sm:flex-row sm:items-center"><img src={student.avatar} alt="" className="h-16 w-16 rounded-2xl border border-line" /><div className="flex-1"><h2 className="text-lg font-bold text-ink">{student.name}</h2><p className="mt-1 text-sm text-muted">{student.className} · Student ID {student.id}</p><p className="mt-1 text-xs text-muted">{student.email}</p><Badge tone="present" className="mt-3">Active student</Badge></div><div id="student-profile-qr" className="self-center rounded-lg border border-line bg-white p-2"><QRCodeSVG value={`CENTRAL-COLLEGE:${student.id}`} size={84} /></div></div></Panel><Panel title="Attendance this term" subtitle="Personal attendance record"><div className="flex items-center justify-between"><div><p className="text-4xl font-bold tracking-tight text-ink">{attendanceRate}<span className="text-2xl">%</span></p><p className="mt-1 text-xs text-muted">{presentDays} of {history.length} recorded school days</p></div><span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarDays size={22} /></span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${attendanceRate}%` }} /></div></Panel></div><div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.8fr]"><Panel title="Academic progress" subtitle="Term 3 · 2026" action={<Button variant="secondary" className="min-h-8 px-3 py-1 text-xs" onClick={() => downloadCsv(`${student.id}-report-card.csv`, [['Subject', 'Teacher', 'Score'], ...subjects.map((subject) => [subject, subject === 'Mathematics' ? 'Ms. Perera' : 'Mr. Silva', marks[subject] ?? 'Not published'])])}><Download size={14} />Report card</Button>}><DataTable searchable={false} pageSize={6} rows={subjects.map((subject) => ({ subject, teacher: subject === 'Mathematics' ? 'Ms. Perera' : 'Mr. Silva' }))} columns={columns} /></Panel><Panel title="Digital ID card" subtitle="Your QR code for quick gate access"><div className="rounded-xl bg-navy p-4 text-white"><div className="flex items-center gap-2"><GraduationCap size={19} /><p className="text-xs font-bold tracking-wide">CENTRAL COLLEGE</p></div><div className="mt-4 flex items-center justify-between"><div><p className="text-sm font-bold">{student.name}</p><p className="mt-1 text-xs text-slate-300">{student.className}</p><p className="mt-3 font-mono text-xs text-blue-200">{student.id}</p></div><div id="student-portal-qr" className="rounded-md bg-white p-1.5"><QRCodeSVG value={`CENTRAL-COLLEGE:${student.id}`} size={70} /></div></div></div><Button variant="secondary" className="mt-3 w-full" onClick={() => downloadQrSvg(document.querySelector('#student-portal-qr svg'), `${student.id}-digital-id.svg`)}><Download size={14} />Download digital ID</Button></Panel></div></>
}

function Academics() {
  const { grades, students } = useAppData()
  const student = students[0]
  const marks = grades[student.id] ?? {}
  const average = Object.keys(marks).length ? Math.round(Object.values(marks).reduce((total, value) => total + Number(value), 0) / Object.keys(marks).length) : 0
  return <><PageHeader eyebrow="Learning & achievement" title="Academic results" description="Your subject-wise progress and assessment results." action={<Button variant="secondary" onClick={() => downloadCsv(`${student.id}-report-card.csv`, [['Subject', 'Teacher', 'Score'], ...subjects.map((subject) => [subject, subject === 'Mathematics' ? 'Ms. Perera' : 'Mr. Silva', marks[subject] ?? 'Not published'])])}><Download size={15} />Download report card</Button>} /><div className="mb-5 grid gap-4 sm:grid-cols-3"><StatCard label="Term average" value={`${average}%`} note="Across published subjects" icon={TrendingUp} accent="blue" /><StatCard label="Overall grade" value={average >= 80 ? 'B+' : average >= 70 ? 'B' : 'C'} note="Term 3 · 2026" icon={GraduationCap} accent="violet" /><StatCard label="Subjects" value={subjects.length} note="Results update live" icon={CalendarDays} accent="green" /></div><Panel title="Term 3 subject results" subtitle={`${student.name} · ${student.className}`}><DataTable rows={subjects.map((subject) => ({ subject, teacher: subject === 'Mathematics' ? 'Ms. Perera' : 'Mr. Silva', marks: marks[subject] }))} columns={[{ key: 'subject', label: 'Subject' }, { key: 'teacher', label: 'Teacher' }, { key: 'marks', label: 'Score', render: (row) => row.marks !== undefined ? `${row.marks} / 100` : 'Not published' }, { key: 'grade', label: 'Grade', render: (row) => row.marks === undefined ? '—' : <Badge tone={row.marks >= 80 ? 'present' : 'pending'}>{row.marks >= 90 ? 'A' : row.marks >= 80 ? 'B' : row.marks >= 70 ? 'C' : 'D'}</Badge> }]} searchable={false} /></Panel></>
}

function Attendance() {
  const { students, attendanceRecords } = useAppData()
  const student = students[0]
  const history = attendanceRecords.filter((record) => record.student_id === student.id)
  const presentDays = history.filter((record) => record.status === 'Present').length
  const absentDays = history.filter((record) => record.status === 'Absent').length
  const rate = history.length ? Math.round((presentDays / history.length) * 1000) / 10 : 0
  const recent = history.map((record) => ({ ...record, checkin: record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—', date: new Date(`${record.date}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) }))
  return <><PageHeader eyebrow="Personal records" title="Attendance history" description={`${student.name} · school day attendance, updated by QR gate check-in.`} /><div className="mb-5 grid gap-4 sm:grid-cols-3"><StatCard label="Attendance rate" value={`${rate}%`} note="Based on recorded school days" icon={CalendarDays} accent="green" /><StatCard label="Days present" value={presentDays} note={`Of ${history.length} recorded days`} icon={GraduationCap} accent="blue" /><StatCard label="Days absent" value={absentDays} note="Based on attendance records" icon={CalendarDays} accent="rose" /></div><Panel title="Recent attendance log" subtitle={`${student.name} · ${history.length} recorded school days`}><DataTable rows={recent} columns={[{ key: 'date', label: 'Date' }, { key: 'checkin', label: 'Gate check-in' }, { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> }]} searchable={false} pageSize={10} /></Panel></>
}

export default function StudentPages() {
  const path = useLocation().pathname
  if (path.endsWith('/academics')) return <Academics />
  if (path.endsWith('/attendance')) return <Attendance />
  if (path.endsWith('/id')) return <StudentPortal />
  return <StudentPortal />
}
