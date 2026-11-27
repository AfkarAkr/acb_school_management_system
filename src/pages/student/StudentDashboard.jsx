import { CalendarDays, Clock3, Download, GraduationCap, Megaphone, TrendingUp } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Badge, Button, DataTable, PageHeader, Panel, StatCard } from '../../components/common/UI'
import { useAppData } from '../../context/AppDataContext'
import { subjects } from '../../data/mockData'
import { downloadCsv } from '../../utils/downloadCsv'
import { downloadQrSvg } from '../../utils/downloadQr'

export default function StudentDashboard() {
  const { announcements, attendanceRecords, gateEvents, grades, students, timetable } = useAppData()
  const student = students[0]

  if (!student) {
    return <><PageHeader eyebrow="Student learning portal" title="Student dashboard" description="Your learning, attendance and school identity in one place." /><Panel title="Student profile unavailable"><p className="text-sm text-muted">No student record is currently linked to this portal.</p></Panel></>
  }

  const marks = grades[student.id] ?? {}
  const publishedMarks = Object.values(marks).map(Number).filter(Number.isFinite)
  const average = publishedMarks.length ? Math.round(publishedMarks.reduce((sum, mark) => sum + mark, 0) / publishedMarks.length) : null
  const history = attendanceRecords.filter((record) => record.student_id === student.id)
  const presentDays = history.filter((record) => record.status === 'Present').length
  const attendanceRate = history.length ? Math.round((presentDays / history.length) * 1000) / 10 : 0
  const today = new Date().toLocaleDateString('en', { weekday: 'long' })
  const classesToday = timetable
    .filter((entry) => entry.className === student.className && entry.dayOfWeek?.toLowerCase() === today.toLowerCase())
    .sort((first, second) => first.startTime.localeCompare(second.startTime))
  const recentEvents = gateEvents.filter((event) => event.student.id === student.id).slice(0, 3)
  const reportRows = subjects.map((subject) => [subject, marks[subject] ?? 'Not published'])

  return <>
    <PageHeader
      eyebrow={`${student.className} · Student portal`}
      title={`Welcome back, ${student.name.split(' ')[0]}`}
      description={`Your student ID is ${student.id}. Here’s your learning and attendance overview.`}
      action={<div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => downloadCsv(`${student.id}-report-card.csv`, [['Subject', 'Score'], ...reportRows])}><Download size={15} />Term report</Button>
        <Button onClick={() => downloadQrSvg(document.querySelector('#student-dashboard-qr svg'), `${student.id}-digital-id.svg`)}><Download size={15} />Digital ID</Button>
      </div>}
    />

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Term average" value={average === null ? '—' : `${average}%`} note={`${publishedMarks.length} of ${subjects.length} subjects published`} icon={TrendingUp} accent="blue" />
      <StatCard label="Term attendance" value={`${attendanceRate}%`} note={`${presentDays} of ${history.length} recorded days present`} icon={CalendarDays} accent="green" />
      <StatCard label="Class" value={student.className.replace('Grade ', '')} note={`Student ID ${student.id}`} icon={GraduationCap} accent="violet" />
      <StatCard label="Subjects" value={subjects.length} note="Term 3 · 2026" icon={Clock3} accent="amber" />
    </div>

    <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.45fr_.75fr]">
      <div className="space-y-4">
        <Panel title="Today’s class schedule" subtitle={`${today} · ${student.className}`}>
          {classesToday.length ? <div className="space-y-2">{classesToday.map((entry) => <div key={entry.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-blue-50/70 px-3 py-3">
            <span className="w-24 shrink-0 text-[11px] font-semibold text-blue-800">{entry.startTime.slice(0, 5)} – {entry.endTime.slice(0, 5)}</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{entry.subject}</p><p className="text-[11px] text-muted">{entry.className}{entry.room ? ` · ${entry.room}` : ''}</p></div>
            <Badge tone="active">{entry.teacherName || 'Scheduled'}</Badge>
          </div>)}</div> : <p className="py-5 text-center text-sm text-muted">No classes are scheduled for your class today.</p>}
        </Panel>

        <Panel title="Academic results" subtitle="Published subject scores · Term 3">
          <DataTable searchable={false} pageSize={subjects.length} rows={subjects.map((subject) => ({ subject, score: marks[subject] }))} columns={[
            { key: 'subject', label: 'Subject' },
            { key: 'score', label: 'Score', render: (row) => row.score !== undefined ? `${row.score} / 100` : <span className="text-muted">Not published</span> },
            { key: 'grade', label: 'Grade', render: (row) => row.score === undefined ? '—' : <Badge tone={row.score >= 80 ? 'present' : row.score >= 60 ? 'pending' : 'absent'}>{row.score >= 90 ? 'A' : row.score >= 80 ? 'B' : row.score >= 70 ? 'C' : row.score >= 60 ? 'D' : 'E'}</Badge> },
          ]} />
        </Panel>

        <Panel title="Recent gate activity" subtitle="Student ID check-ins and check-outs">
          {recentEvents.length ? <div className="space-y-2">{recentEvents.map((event) => <div key={event.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-700"><CalendarDays size={15} /></span>
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-ink">{event.type} recorded</p><p className="text-[11px] text-muted">{event.time}</p></div>
            <Badge tone={event.type === 'Entry' ? 'present' : 'pending'}>{event.type}</Badge>
          </div>)}</div> : <p className="py-5 text-center text-sm text-muted">Gate activity will appear here when recorded.</p>}
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Digital student ID" subtitle="QR code for school gate check-in">
          <div className="rounded-xl bg-navy p-4 text-white">
            <div className="flex items-center gap-2"><GraduationCap size={18} /><span className="font-display text-sm font-bold">Central College</span></div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div><p className="text-sm font-semibold">{student.name}</p><p className="mt-1 text-xs text-slate-300">{student.className}</p><p className="mt-2 font-mono text-xs text-blue-200">{student.id}</p></div>
              <div id="student-dashboard-qr" className="rounded-md bg-white p-2"><QRCodeSVG value={`CENTRAL-COLLEGE:${student.id}`} size={84} /></div>
            </div>
          </div>
        </Panel>

        <Panel title="Campus announcements" subtitle="Latest updates from Central College">
          {announcements.length ? <div className="space-y-4">{announcements.slice(0, 4).map((announcement) => <article key={announcement.id} className="flex gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><Megaphone size={15} /></span>
            <div className="min-w-0"><p className="text-xs font-semibold text-ink">{announcement.title}</p><p className="mt-1 text-[11px] leading-relaxed text-muted">{announcement.body}</p><p className="mt-2 text-[10px] text-muted">{new Date(announcement.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p></div>
          </article>)}</div> : <p className="py-5 text-center text-sm text-muted">No announcements yet.</p>}
        </Panel>
      </div>
    </div>
  </>
}
