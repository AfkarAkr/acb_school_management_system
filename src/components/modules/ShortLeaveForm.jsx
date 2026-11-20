import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Button, Field, SelectField } from '../common/UI'
import { useAuth } from '../../context/AuthContext'
import { useAppData } from '../../context/AppDataContext'

export default function ShortLeaveForm() {
  const { user } = useAuth()
  const { addLeave } = useAppData()
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), start: '10:00', end: '11:00', reason: '' })
  const [error, setError] = useState('')
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const timeOptions = Array.from({ length: 41 }, (_, i) => {
    const minutes = 7 * 60 + i * 15
    const hour = String(Math.floor(minutes / 60)).padStart(2, '0')
    const minute = String(minutes % 60).padStart(2, '0')
    return `${hour}:${minute}`
  })
  const submit = async (event) => {
    event.preventDefault()
    if (form.reason.trim().length < 10) return setError('Please provide a reason of at least 10 characters.')
    if (form.start >= form.end) return setError('The end time must be after the start time.')
    setError('')
    const pretty = (time) => new Date(`2026-01-01T${time}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const saved = await addLeave({
      name: user?.label === 'Teacher' ? 'Amaya Perera' : user?.label,
      date: form.date,
      start: form.start,
      end: form.end,
      slot: `${pretty(form.start)} – ${pretty(form.end)}`,
      reason: form.reason.trim(),
    })
    if (saved) setForm((current) => ({ ...current, reason: '' }))
  }
  return <form onSubmit={submit} className="space-y-4">
    <div className="rounded-lg bg-blue-50 p-3 text-xs leading-relaxed text-blue-800"><CalendarClock size={15} className="mr-1 inline" />Requests are available between <strong>7:00 AM and 5:00 PM</strong>. Your request will be sent to the principal for approval.</div>
    <Field label="Leave date" type="date" value={form.date} onChange={update('date')} required />
    <div className="grid grid-cols-2 gap-3"><SelectField label="From" value={form.start} onChange={update('start')}>{timeOptions.map((time) => <option key={time} value={time}>{new Date(`2026-01-01T${time}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>)}</SelectField><SelectField label="Until" value={form.end} onChange={update('end')}>{timeOptions.map((time) => <option key={time} value={time}>{new Date(`2026-01-01T${time}:00`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>)}</SelectField></div>
    <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink">Reason / description <span className="text-rose-600">*</span></span><textarea rows="3" maxLength="400" value={form.reason} onChange={update('reason')} className="field resize-y" placeholder="Please explain the reason for your request…" required /></label>
    {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
    <Button type="submit" className="w-full">Submit leave request</Button>
  </form>
}
