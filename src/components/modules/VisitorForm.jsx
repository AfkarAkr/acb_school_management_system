import { useState } from 'react'
import { Button, Field } from '../common/UI'

const initialForm = { name: '', idNumber: '', phone: '', purpose: '', person: '', vehicle: '' }

export default function VisitorForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState(initialForm)
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    const saved = await onSubmit(form)
    if (saved !== false) setForm(initialForm)
  }
  return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
    <Field label="Visitor name" value={form.name} onChange={update('name')} required />
    <Field label="NIC / ID number" value={form.idNumber} onChange={update('idNumber')} required />
    <Field label="Phone number" type="tel" value={form.phone} onChange={update('phone')} required />
    <Field label="Purpose of visit" value={form.purpose} onChange={update('purpose')} required />
    <Field label="Person to meet" value={form.person} onChange={update('person')} required />
    <Field label="Vehicle number" value={form.vehicle} onChange={update('vehicle')} placeholder="Optional" />
    <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button><Button type="submit">Register visitor</Button></div>
  </form>
}
