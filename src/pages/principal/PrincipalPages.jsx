import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Activity, Check, Clock3, GraduationCap, Pencil, Plus, ShieldCheck, Trash2, UserRound, Users, X } from 'lucide-react'
import { Badge, Button, DataTable, Field, Modal, PageHeader, Panel, SelectField, StatCard } from '../../components/common/UI'
import { useAppData } from '../../context/AppDataContext'
import { classes } from '../../data/mockData'

function Overview() {
  const { leaves, staff, students, visitors, gateEvents, dashboard } = useAppData()
  const pending = leaves.filter((leave) => leave.status === 'Pending').length
  const activeVisitors = visitors.filter((visitor) => visitor.status === 'On premises').length
  return <><PageHeader eyebrow={new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} title="Good morning, Principal" description="Here’s your school-wide overview for today." action={<Button variant="secondary"><Activity size={15} />View live activity</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[
      ['Total students', (dashboard?.students ?? students.length).toLocaleString(), 'Active student records', Users, 'blue'],
      ['Teaching staff', dashboard?.teachers ?? staff.filter((person) => person.role === 'Teacher').length, 'Active teacher records', GraduationCap, 'violet'],
      ['Office staff', dashboard?.officeStaff ?? staff.filter((person) => person.role === 'Office Staff').length, 'Active office records', UserRound, 'amber'],
      ["Today's student attendance", `${dashboard?.attendancePercent ?? 0}%`, `${dashboard?.presentStudents ?? 0} present today`, Check, 'green'],
      ['Pending short leaves', pending, 'Needs your review', Clock3, 'rose'],
      ['Active visitors', activeVisitors, 'Currently on campus', ShieldCheck, 'blue'],
    ].map(([label, value, note, icon, accent]) => <StatCard key={label} {...{ label, value, note, icon, accent }} />)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.35fr_.8fr]">    <Panel title="Recent gate activity" subtitle="Student QR scans · live updates"><div className="space-y-4">{gateEvents.slice(0, 5).map((event) => <div key={event.id} className="flex items-center gap-3"><img src={event.student.avatar} alt="" className="h-9 w-9 rounded-full" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{event.student.name}</p><p className="text-xs text-muted">{event.student.id} · {event.student.className}</p></div><Badge tone={event.type === 'Entry' ? 'present' : 'pending'}>{event.type}</Badge><span className="text-xs text-muted">{event.time}</span></div>)}</div></Panel>
      <Panel title="Pending approvals" subtitle="Short leave requests"><div className="space-y-4">{leaves.filter((leave) => leave.status === 'Pending').slice(0, 3).map((leave) => <div key={leave.id} className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"><Clock3 size={17} /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{leave.name}</p><p className="mt-0.5 text-xs text-muted">{leave.slot} · {leave.reason}</p></div><Badge>Pending</Badge></div>)}{!pending && <p className="text-sm text-muted">You’re all caught up.</p>}</div></Panel></div>
  </>
}

function LeaveApprovals() {
  const { leaves, reviewLeave } = useAppData()
  const [selected, setSelected] = useState(null)
  const [remarks, setRemarks] = useState('')
  const act = async (status) => {
    if (await reviewLeave(selected.id, status, remarks)) {
      setSelected(null)
      setRemarks('')
    }
  }
  const columns = [
    { key: 'name', label: 'Teacher', render: (row) => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">{row.id}</p></div> },
    { key: 'date', label: 'Date' }, { key: 'slot', label: 'Time slot' }, { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> },
    { key: 'actions', label: '', searchable: false, render: (row) => row.status === 'Pending' ? <div className="flex gap-1"><Button variant="success" className="min-h-8 px-2.5 py-1 text-xs" onClick={() => { setSelected(row); setRemarks('') }}>Review</Button></div> : <span className="text-xs text-muted">{row.remarks || '—'}</span> },
  ]
  return <><PageHeader eyebrow="People & attendance" title="Short leave approvals" description="Review and respond to teacher leave requests." /><Panel title="All requests" subtitle={`${leaves.filter((leave) => leave.status === 'Pending').length} requests awaiting a decision`}><DataTable columns={columns} rows={leaves} pageSize={8} /></Panel>
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Review short leave request">
      {selected && <div className="space-y-4"><div className="rounded-lg bg-slate-50 p-4 text-sm"><p className="font-semibold text-ink">{selected.name}</p><p className="mt-1 text-muted">{selected.date} · {selected.slot}</p><p className="mt-3 text-ink">{selected.reason}</p></div><label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">Remarks (optional)</span><textarea rows="3" value={remarks} onChange={(event) => setRemarks(event.target.value)} className="field" placeholder="Add a note for the teacher" /></label><div className="flex gap-2"><Button variant="danger" className="flex-1" onClick={() => act('Rejected')}><X size={15} />Reject</Button><Button variant="success" className="flex-1" onClick={() => act('Approved')}><Check size={15} />Approve</Button></div></div>}
    </Modal>
  </>
}

function StudentDirectory() {
  const { students, addStudent, updateStudent, deleteStudent } = useAppData()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ name: '', className: classes[0], email: '' })
  const rows = useMemo(() => students, [students])
  const edit = (student) => { setSelected(student); setForm({ name: student.name, className: student.className, email: student.email }); setOpen(true) }
  const close = () => { setOpen(false); setSelected(null) }
  const columns = [{ key: 'name', label: 'Student', render: (row) => <div className="flex items-center gap-2.5"><img src={row.avatar} alt="" className="h-8 w-8 rounded-full" /><div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">{row.id}</p></div></div> }, { key: 'className', label: 'Class' }, { key: 'email', label: 'Email' }, { key: 'attendance', label: 'Today', render: (row) => <Badge>{row.attendance}</Badge> }, { key: 'actions', label: 'Manage', searchable: false, render: (row) => <div className="flex gap-1"><Button variant="secondary" className="min-h-8 px-2 py-1" aria-label={`Edit ${row.name}`} onClick={() => edit(row)}><Pencil size={14} /></Button><Button variant="danger" className="min-h-8 px-2 py-1" aria-label={`Delete ${row.name}`} onClick={() => { if (window.confirm(`Delete ${row.name}'s profile?`)) deleteStudent(row.id) }}><Trash2 size={14} /></Button></div> }]
  return <><PageHeader eyebrow="School directory" title="Students" description="Search and manage the Central College student directory." action={<Button onClick={() => { setSelected(null); setForm({ name: '', className: classes[0], email: '' }); setOpen(true) }}><Plus size={16} />Add student</Button>} /><Panel title="Student records" subtitle="2,000+ student profiles · search, edit and paginate"><DataTable rows={rows} columns={columns} pageSize={10} /></Panel>
    <Modal open={open} onClose={close} title={selected ? 'Edit student profile' : 'Create student profile'}><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const student = { ...form, avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(form.name)}&backgroundColor=e7edf7` }; const saved = selected ? await updateStudent(selected.id, student) : await addStudent(student); if (saved) close() }}><Field label="Student full name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><SelectField label="Class" value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })}>{classes.map((name) => <option key={name}>{name}</option>)}</SelectField><Field label="Email address" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /><Button type="submit" className="w-full">{selected ? 'Save changes' : 'Create profile'}</Button></form></Modal>
  </>
}

function StaffDirectory() {
  const { staff, addStaffMember, updateStaffMember, deleteStaffMember } = useAppData()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'Teacher', department: 'Mathematics' })
  const edit = (person) => { setSelected(person); setForm({ name: person.name, email: person.email ?? '', role: person.role, department: person.department ?? '' }); setOpen(true) }
  const close = () => { setOpen(false); setSelected(null) }
  const columns = [{ key: 'name', label: 'Staff member', render: (row) => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">{row.id}</p></div> }, { key: 'role', label: 'Role' }, { key: 'department', label: 'Department' }, { key: 'status', label: 'Status', render: (row) => <Badge tone="online">{row.status}</Badge> }, { key: 'actions', label: 'Manage', searchable: false, render: (row) => <div className="flex gap-1"><Button variant="secondary" className="min-h-8 px-2 py-1" aria-label={`Edit ${row.name}`} onClick={() => edit(row)}><Pencil size={14} /></Button><Button variant="danger" className="min-h-8 px-2 py-1" aria-label={`Delete ${row.name}`} onClick={() => { if (window.confirm(`Delete ${row.name}'s profile?`)) deleteStaffMember(row.id) }}><Trash2 size={14} /></Button></div> }]
  return <><PageHeader eyebrow="People & attendance" title="Staff directory" description={`Manage ${staff.length} staff records.`} action={<Button onClick={() => { setSelected(null); setForm({ name: '', email: '', role: 'Teacher', department: 'Mathematics' }); setOpen(true) }}><Plus size={16} />Add staff member</Button>} /><Panel title="All staff" subtitle={`${staff.filter((person) => person.role === 'Teacher').length} teachers · ${staff.filter((person) => person.role === 'Office Staff').length} office staff`}><DataTable rows={staff} columns={columns} pageSize={10} /></Panel><Modal open={open} onClose={close} title={selected ? 'Edit staff profile' : 'Create staff profile'}><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const payload = { ...form, email: form.email || null }; const saved = selected ? await updateStaffMember(selected.id, payload) : await addStaffMember(payload); if (saved) close() }}><Field label="Staff member name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /><Field label="Email address" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><SelectField label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>Teacher</option><option>Office Staff</option><option>Security</option><option>Principal</option></SelectField><Field label="Department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} required /><Button type="submit" className="w-full">{selected ? 'Save changes' : 'Create profile'}</Button></form></Modal></>
}

function SecurityLogs() {
  const { gateEvents, visitors } = useAppData()
  return <><PageHeader eyebrow="Campus safety" title="Security & gate logs" description="A real-time overview of student entries and campus visitors." /><div className="grid gap-5 xl:grid-cols-2"><Panel title="Student gate scans" subtitle="Most recent QR verified entries"><div className="space-y-4">{gateEvents.slice(0, 12).map((event) => <div key={event.id} className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><ShieldCheck size={17} /></div><div className="flex-1"><p className="text-sm font-semibold">{event.student.name}</p><p className="text-xs text-muted">{event.student.id} · {event.student.className}</p></div><Badge tone="present">{event.type}</Badge><span className="text-xs text-muted">{event.time}</span></div>)}</div></Panel><Panel title="Visitor logbook" subtitle="Campus visitor check-in status"><DataTable rows={visitors} searchable={false} pageSize={10} columns={[{ key: 'name', label: 'Visitor' }, { key: 'purpose', label: 'Purpose' }, { key: 'person', label: 'Meeting' }, { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> }]} /></Panel></div></>
}

function SystemConfig() {
  const { systemSettings, updateSystemSetting } = useAppData()
  const [saving, setSaving] = useState('')
  const toggle = async (key) => {
    setSaving(key)
    await updateSystemSetting(key, !(systemSettings[key] ?? true))
    setSaving('')
  }
  const settings = [['studentQr', 'Student QR gate verification', 'Allow QR-based student arrival and departure logging.'], ['biometric', 'Teacher biometric attendance', 'Enable fingerprint terminal attendance simulation.'], ['parentAlerts', 'Parent gate notifications', 'Notify linked parents when a child is verified at the gate.'], ['leaveApprovals', 'Principal leave approval workflow', 'Require principal review for all short leave requests.']]
  return <><PageHeader eyebrow="Administration" title="System configuration" description="Manage school-wide features and policies." /><div className="max-w-3xl"><Panel title="Feature controls" subtitle="Saved to the school database"><div className="divide-y divide-line">{settings.map(([key, title, description]) => { const enabled = systemSettings[key] ?? true; return <div key={key} className="flex items-center justify-between gap-5 py-4 first:pt-0 last:pb-0"><div><p className="text-sm font-semibold text-ink">{title}</p><p className="mt-1 text-xs text-muted">{description}</p></div><button role="switch" aria-checked={enabled} disabled={Boolean(saving)} onClick={() => toggle(key)} className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${enabled ? 'bg-blue-700' : 'bg-slate-300'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${enabled ? 'left-6' : 'left-1'}`} /></button></div> })}</div></Panel><p className="mt-3 text-xs text-muted">Changes are written to the database immediately.</p></div></>
}

export default function PrincipalPages() {
  const path = useLocation().pathname
  if (path.endsWith('/students')) return <StudentDirectory />
  if (path.endsWith('/staff')) return <StaffDirectory />
  if (path.endsWith('/leaves')) return <LeaveApprovals />
  if (path.endsWith('/security')) return <SecurityLogs />
  if (path.endsWith('/config')) return <SystemConfig />
  return <Overview />
}
