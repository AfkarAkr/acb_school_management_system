import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, DataTable, Field, Modal, PageHeader, Panel, SelectField } from '../../components/common/UI'
import { useAppData } from '../../context/AppDataContext'
import { classes, subjects } from '../../data/mockData'

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function TimetableManagement() {
  const { timetable, staff, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = useAppData()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({
    className: classes[0],
    subject: subjects[0],
    teacherId: '',
    dayOfWeek: 'Monday',
    startTime: '08:00',
    endTime: '08:45',
    room: '',
  })
  const teachers = staff.filter((person) => person.role === 'Teacher' && person.status === 'Active')
  const orderedEntries = useMemo(() => timetable.slice().sort((left, right) => {
    const dayDifference = days.indexOf(left.dayOfWeek) - days.indexOf(right.dayOfWeek)
    return dayDifference || left.startTime.localeCompare(right.startTime)
  }), [timetable])
  const close = () => { setOpen(false); setSelected(null) }
  const edit = (entry) => {
    setSelected(entry)
    setForm({
      className: entry.className,
      subject: entry.subject,
      teacherId: entry.teacherId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime.slice(0, 5),
      endTime: entry.endTime.slice(0, 5),
      room: entry.room,
    })
    setOpen(true)
  }
  const columns = [
    { key: 'dayOfWeek', label: 'Day' },
    { key: 'startTime', label: 'Time', value: (entry) => `${entry.startTime.slice(0, 5)} – ${entry.endTime.slice(0, 5)}` },
    { key: 'className', label: 'Class' },
    { key: 'subject', label: 'Subject' },
    { key: 'teacherName', label: 'Teacher' },
    { key: 'room', label: 'Room' },
    { key: 'actions', label: 'Manage', searchable: false, render: (entry) => <div className="flex gap-1"><Button variant="secondary" className="min-h-8 px-2 py-1" aria-label={`Edit ${entry.subject} for ${entry.className}`} onClick={() => edit(entry)}><Pencil size={14} /></Button><Button variant="danger" className="min-h-8 px-2 py-1" aria-label={`Delete ${entry.subject} for ${entry.className}`} onClick={() => { if (window.confirm(`Delete ${entry.subject} for ${entry.className}?`)) deleteTimetableEntry(entry.id) }}><Trash2 size={14} /></Button></div> },
  ]
  return <><PageHeader eyebrow="School schedule" title="Timetable management" description="Create and maintain weekly class schedules. Overlapping classes, teachers, and room bookings are rejected." action={<Button onClick={() => { setSelected(null); setForm({ className: classes[0], subject: subjects[0], teacherId: teachers[0]?.id ?? '', dayOfWeek: 'Monday', startTime: '08:00', endTime: '08:45', room: '' }); setOpen(true) }} disabled={!teachers.length}><Plus size={16} />Add class</Button>} /><Panel title="Weekly schedule" subtitle={`${timetable.length} scheduled classes`}><DataTable rows={orderedEntries} columns={columns} pageSize={10} emptyMessage="No timetable entries yet. Add the first class to get started." /></Panel><Modal open={open} onClose={close} title={selected ? 'Edit timetable entry' : 'Add timetable entry'}><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); const saved = selected ? await updateTimetableEntry(selected.id, form) : await addTimetableEntry(form); if (saved) close() }}><SelectField label="Class" value={form.className} onChange={(event) => setForm({ ...form, className: event.target.value })}>{classes.map((className) => <option key={className}>{className}</option>)}</SelectField><SelectField label="Subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })}>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</SelectField><SelectField label="Teacher" value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })} required>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</SelectField><SelectField label="Day" value={form.dayOfWeek} onChange={(event) => setForm({ ...form, dayOfWeek: event.target.value })}>{days.map((day) => <option key={day}>{day}</option>)}</SelectField><div className="grid grid-cols-2 gap-3"><Field label="Start time" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} required /><Field label="End time" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} required /></div><Field label="Room" value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} maxLength="30" required /><Button type="submit" className="w-full">{selected ? 'Save changes' : 'Create timetable entry'}</Button></form></Modal></>
}
