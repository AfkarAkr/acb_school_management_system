import { useState } from 'react'
import { BellRing, CalendarDays, GraduationCap, MessageSquareText, TrendingUp } from 'lucide-react'
import { Badge, DataTable, PageHeader, Panel, SelectField, StatCard } from '../../components/common/UI'
import { useAppData } from '../../context/AppDataContext'
import { subjects } from '../../data/mockData'
import { useAuth } from '../../context/AuthContext'

export default function FamilyDashboard() {
  const { announcements, attendanceRecords, gateEvents, grades, students, systemSettings } = useAppData()
  const { user } = useAuth()
  const [childId, setChildId] = useState(students[0]?.id ?? '')
  const child = students.find((student) => student.id === childId)

  if (!child) {
    return <><PageHeader eyebrow="Family portal" title={`Welcome, ${user?.name ?? 'Parent'}`} description="Stay connected with your child’s school day and progress." /><Panel title="Student record unavailable"><p className="text-sm text-muted">No student record is currently available for this family portal.</p></Panel></>
  }

  const marks = grades[child.id] ?? {}
  const publishedMarks = Object.values(marks).map(Number).filter(Number.isFinite)
  const average = publishedMarks.length ? Math.round(publishedMarks.reduce((sum, mark) => sum + mark, 0) / publishedMarks.length) : null
  const history = attendanceRecords.filter((record) => record.student_id === child.id)
  const presentDays = history.filter((record) => record.status === 'Present').length
  const attendanceRate = history.length ? Math.round((presentDays / history.length) * 1000) / 10 : 0
  const latestEvent = gateEvents.find((event) => event.student.id === child.id)
  const subjectsWithScores = subjects.filter((subject) => marks[subject] !== undefined)
  const resultRows = subjectsWithScores.map((subject) => ({ subject, score: marks[subject] }))
  const recentAttendance = history.slice(0, 5).map((record) => ({
    ...record,
    dateLabel: new Date(`${record.date}T00:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    checkInLabel: record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—',
  }))

  return <>
    <PageHeader
      eyebrow="Parent & guardian portal · Family overview"
      title={`Family overview & ${child.name.split(' ')[0]}’s progress`}
      description={`${child.name} · ${child.className} · Student ID ${child.id}`}
      action={<div className="min-w-[190px]"><SelectField label="Viewing child" value={childId} onChange={(event) => setChildId(event.target.value)}>{students.map((student) => <option value={student.id} key={student.id}>{student.name}</option>)}</SelectField></div>}
    />

    {latestEvent?.type === 'Entry' && systemSettings.parentAlerts !== false && <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-blue-700"><BellRing size={18} /></span>
      <div className="flex-1"><p className="text-sm font-semibold text-blue-950">Gate entry recorded</p><p className="mt-1 text-xs text-blue-800">{child.name} checked in at {latestEvent.time}.</p></div><Badge tone="present">Verified</Badge>
    </div>}

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Attendance" value={`${attendanceRate}%`} note={`${presentDays} of ${history.length} recorded days present`} icon={CalendarDays} accent="green" />
      <StatCard label="Term average" value={average === null ? '—' : `${average}%`} note={`${publishedMarks.length} of ${subjects.length} subjects published`} icon={TrendingUp} accent="blue" />
      <StatCard label="Class" value={child.className.replace('Grade ', '')} note={`Student ID ${child.id}`} icon={GraduationCap} accent="violet" />
      <StatCard label="Latest gate event" value={latestEvent?.type ?? '—'} note={latestEvent ? latestEvent.time : 'No gate scan recorded'} icon={BellRing} accent={latestEvent?.type === 'Entry' ? 'green' : 'amber'} />
    </div>

    <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1.35fr_.8fr]">
      <div className="space-y-4">
        <Panel title={`${child.name.split(' ')[0]}’s academic results`} subtitle="Published subject scores · Term 3">
          {resultRows.length ? <DataTable searchable={false} pageSize={subjects.length} rows={resultRows} columns={[
            { key: 'subject', label: 'Subject' },
            { key: 'score', label: 'Score', render: (row) => `${row.score} / 100` },
            { key: 'grade', label: 'Grade', render: (row) => <Badge tone={row.score >= 80 ? 'present' : row.score >= 60 ? 'pending' : 'absent'}>{row.score >= 90 ? 'A' : row.score >= 80 ? 'B' : row.score >= 70 ? 'C' : row.score >= 60 ? 'D' : 'E'}</Badge> },
          ]} /> : <p className="py-5 text-center text-sm text-muted">Results have not been published yet.</p>}
        </Panel>

        <Panel title="Recent attendance" subtitle={`${child.name} · School attendance records`}>
          {recentAttendance.length ? <DataTable searchable={false} pageSize={5} rows={recentAttendance} columns={[
            { key: 'dateLabel', label: 'Date' },
            { key: 'checkInLabel', label: 'Gate check-in' },
            { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> },
          ]} /> : <p className="py-5 text-center text-sm text-muted">Attendance records will appear here.</p>}
        </Panel>
      </div>

      <Panel title="School announcements" subtitle="Updates from Central College">
        {announcements.length ? <div className="space-y-4">{announcements.slice(0, 5).map((announcement) => <article key={announcement.id} className="flex gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><MessageSquareText size={15} /></span>
          <div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-1"><p className="text-xs font-semibold text-ink">{announcement.title}</p><time className="text-[10px] text-muted">{new Date(announcement.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</time></div><p className="mt-1 text-[11px] leading-relaxed text-muted">{announcement.body}</p></div>
        </article>)}</div> : <p className="py-5 text-center text-sm text-muted">No announcements yet.</p>}
      </Panel>
    </div>
  </>
}
