import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Activity, Plus, Users } from 'lucide-react'
import { Badge, Button, DataTable, Field, Modal, PageHeader, Panel, SelectField, StatCard } from '../../components/common/UI'
import VisitorForm from '../../components/modules/VisitorForm'
import { useAppData } from '../../context/AppDataContext'

function SecurityDashboard() {
  const { visitors, gateEvents } = useAppData()
  const onsite = visitors.filter((visitor) => visitor.status === 'On premises').length
  return <><PageHeader eyebrow="Campus safety" title="Gate operations" description="Student arrivals and visitor access, all in one place." /><div className="grid gap-4 sm:grid-cols-2"><StatCard label="Recent gate events" value={gateEvents.length.toLocaleString()} note="Logged student entries and exits" icon={Activity} accent="blue" /><StatCard label="Visitors on campus" value={onsite} note="Active check-ins" icon={Users} accent="amber" /></div><div className="mt-5"><GateScanPanel /></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><Panel title="Live gate event feed" subtitle="Recent student entries and exits"><div className="space-y-4">{gateEvents.slice(0, 7).map((event) => <div key={event.id} className="flex items-center gap-3"><img src={event.student.avatar} alt="" className="h-9 w-9 rounded-full" /><div className="flex-1"><p className="text-sm font-semibold">{event.student.name}</p><p className="text-xs text-muted">{event.student.id} · {event.student.className}</p></div><Badge tone={event.type === 'Entry' ? 'present' : 'pending'}>{event.type}</Badge><span className="text-xs text-muted">{event.time}</span></div>)}</div></Panel><VisitorPanel /></div></>
}

function GateScanPanel() {
  const { students, recordGateEntry } = useAppData()
  const [studentId, setStudentId] = useState('')
  const [type, setType] = useState('Entry')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const scan = async (event) => {
    event.preventDefault()
    const id = studentId.trim().replace(/^CENTRAL-COLLEGE:/i, '')
    const student = students.find((record) => record.id.toLowerCase() === id.toLowerCase())
    if (!student) {
      setError('No student was found for that ID or QR value.')
      return
    }
    setSaving(true)
    setError('')
    if (await recordGateEntry(student, type)) setStudentId('')
    setSaving(false)
  }
  return <Panel title="Student gate scan" subtitle="Enter a student ID or the value encoded in their QR ID card."><form className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end" onSubmit={scan}><Field label="Student ID / QR value" value={studentId} onChange={(event) => setStudentId(event.target.value)} placeholder="e.g. DEMO-0001 or CENTRAL-COLLEGE:DEMO-0001" required /><SelectField label="Gate event" value={type} onChange={(event) => setType(event.target.value)}><option value="Entry">Entry</option><option value="Exit">Exit</option></SelectField><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Record scan'}</Button></form>{error && <p role="alert" className="mt-3 text-xs text-rose-600">{error}</p>}</Panel>
}

function VisitorPanel() {
  const { visitors, checkoutVisitor, addVisitor } = useAppData()
  const [open, setOpen] = useState(false)
  const columns = [{ key: 'name', label: 'Visitor', render: (row) => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">{row.idNumber || row.id} · {row.phone || ''}</p></div> }, { key: 'purpose', label: 'Purpose' }, { key: 'person', label: 'Meeting' }, { key: 'time', label: 'Check-in' }, { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> }, { key: 'actions', label: '', searchable: false, render: (row) => row.status === 'On premises' ? <Button variant="secondary" className="min-h-8 px-2 py-1 text-xs" onClick={() => checkoutVisitor(row.id)}>Check out</Button> : row.checkout }]
  return <Panel title="Visitor logbook" subtitle="Active on-premises visitors" action={<Button onClick={() => setOpen(true)} className="min-h-9 px-3 text-xs"><Plus size={14} />Check in</Button>}><DataTable rows={visitors} columns={columns} pageSize={6} /><Modal open={open} onClose={() => setOpen(false)} title="Register visitor"><VisitorForm onSubmit={async (form) => { const saved = await addVisitor(form); if (saved) setOpen(false); return saved }} onCancel={() => setOpen(false)} /></Modal></Panel>
}

function VisitorLogs() {
  const { visitors, checkoutVisitor, addVisitor } = useAppData()
  const [open, setOpen] = useState(false)
  const columns = [{ key: 'name', label: 'Visitor', render: (row) => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">{row.idNumber || row.id} · {row.phone || '—'}</p></div> }, { key: 'purpose', label: 'Purpose' }, { key: 'person', label: 'Person to meet' }, { key: 'vehicle', label: 'Vehicle' }, { key: 'time', label: 'Check-in' }, { key: 'checkout', label: 'Check-out', value: (row) => row.checkout ?? '—' }, { key: 'status', label: 'Status', render: (row) => <Badge>{row.status}</Badge> }, { key: 'action', label: '', searchable: false, render: (row) => row.status === 'On premises' ? <Button variant="secondary" className="min-h-8 px-2 py-1 text-xs" onClick={() => checkoutVisitor(row.id)}>Check out</Button> : '—' }]
  return <><PageHeader eyebrow="Campus visitor access" title="Visitor logbook" description="Fast check-in, clear on-premises status and complete visitor history." action={<Button onClick={() => setOpen(true)}><Plus size={16} />Register visitor</Button>} /><Panel title="Visitor records" subtitle={`${visitors.filter((visitor) => visitor.status === 'On premises').length} currently on campus`}><DataTable rows={visitors} columns={columns} pageSize={10} /></Panel><Modal open={open} onClose={() => setOpen(false)} title="Visitor check-in"><VisitorForm onSubmit={async (form) => { const saved = await addVisitor(form); if (saved) setOpen(false); return saved }} onCancel={() => setOpen(false)} /></Modal></>
}

export default function SecurityPages() {
  const path = useLocation().pathname
  if (path.endsWith('/visitors')) return <VisitorLogs />
  return <SecurityDashboard />
}
