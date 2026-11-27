import { useEffect, useMemo, useState } from 'react'
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react'

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-[#183c99] text-white hover:bg-[#12327f] shadow-sm shadow-blue-900/15',
    secondary: 'bg-white text-ink border border-line hover:bg-slate-50',
    subtle: 'text-muted hover:bg-slate-100 hover:text-ink',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
    success: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  }
  return <button className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition duration-200 hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${styles[variant]} ${className}`} {...props}>{children}</button>
}

export function Badge({ children, tone, className = '' }) {
  const normalized = tone ?? String(children).toLowerCase()
  const styles = {
    present: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    'on premises': 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    absent: 'bg-rose-50 text-rose-700 ring-rose-100',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-100',
    pending: 'bg-amber-50 text-amber-700 ring-amber-100',
    offline: 'bg-rose-50 text-rose-700 ring-rose-100',
    online: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    'checked out': 'bg-slate-100 text-slate-600 ring-slate-200',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[normalized] ?? 'bg-slate-100 text-slate-600 ring-slate-200'} ${className}`}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />{children}</span>
}

export function StatCard({ label, value, note, icon: Icon, accent = 'blue' }) {
  const accents = { blue: 'bg-blue-50 text-blue-700', violet: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700', rose: 'bg-rose-50 text-rose-700' }
  return <div className="group rounded-xl border border-line bg-white p-4 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted">{label}</p><p className="mt-2 font-display text-[30px] font-bold leading-none tracking-tight text-ink">{value}</p></div>
      {Icon && <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ring-black/[.025] ${accents[accent]}`}><Icon size={18} /></span>}
    </div>
    {note && <p className="mt-3 text-xs text-muted">{note}</p>}
  </div>
}

export function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-header mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
    <div className="min-w-0">{eyebrow && <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-blue-700">{eyebrow}</p>}<h1 className="font-display text-[25px] font-bold leading-tight tracking-[-.025em] text-ink sm:text-[29px]">{title}</h1>{description && <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-muted">{description}</p>}</div>
    {action}
  </div>
}

export function Panel({ title, subtitle, action, children, className = '' }) {
  return <section className={`overflow-hidden rounded-xl border border-line bg-white shadow-card ${className}`}>
    {(title || action) && <div className="flex flex-col justify-between gap-3 border-b border-line px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"><div>{title && <h2 className="font-display text-[16px] font-bold leading-snug tracking-[-.015em] text-ink">{title}</h2>}{subtitle && <p className="mt-1 text-[11px] text-muted">{subtitle}</p>}</div>{action}</div>}
    <div className="p-4 sm:p-5">{children}</div>
  </section>
}

export function Field({ label, className = '', ...props }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-sm font-medium text-ink">{label}</span><input className="field" {...props} /></label>
}

export function SelectField({ label, children, className = '', ...props }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-sm font-medium text-ink">{label}</span><select className="field" {...props}>{children}</select></label>
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div className={`w-full rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
      <div className="flex items-center justify-between border-b border-line px-5 py-4"><h2 className="font-semibold text-ink">{title}</h2><button className="rounded-lg p-2 text-muted hover:bg-slate-100" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
    </div>
  </div>
}

export function DataTable({ columns, rows, searchable = true, pageSize = 8, emptyMessage = 'No records found' }) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim().toLowerCase()), 250)
    return () => window.clearTimeout(timer)
  }, [query])
  const filtered = useMemo(() => rows.filter((row) => columns.some((column) => {
    if (column.searchable === false) return false
    const value = column.value ? column.value(row) : row[column.key]
    return String(value ?? '').toLowerCase().includes(debounced)
  })), [rows, columns, debounced])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => setPage(1), [debounced])
  return <div>
    {searchable && <div className="mb-4 flex items-center justify-between gap-3"><label className="relative block w-full max-w-sm"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." className="field pl-9" /></label><span className="shrink-0 text-xs text-muted">{filtered.length.toLocaleString()} records</span></div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-wide text-muted">{columns.map((column) => <th key={column.key} className="px-3 py-3 font-semibold">{column.label}</th>)}</tr></thead>
      <tbody className="divide-y divide-line">{visible.length ? visible.map((row, index) => <tr key={row.id ?? index} className="hover:bg-slate-50/80">{columns.map((column) => <td key={column.key} className="px-3 py-3.5 text-ink">{column.render ? column.render(row) : column.value ? column.value(row) : row[column.key]}</td>)}</tr>) : <tr><td colSpan={columns.length} className="px-3 py-12 text-center text-muted">{emptyMessage}</td></tr>}</tbody>
    </table></div>
    <div className="mt-4 flex items-center justify-between text-xs text-muted"><span>Showing {filtered.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filtered.length)} of {filtered.length.toLocaleString()}</span><div className="flex items-center gap-2"><button aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-md border border-line p-2 disabled:opacity-40"><ChevronLeft size={15} /></button><span>Page {page} of {pageCount}</span><button aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} className="rounded-md border border-line p-2 disabled:opacity-40"><ChevronRight size={15} /></button></div></div>
  </div>
}

export function Skeleton({ className = '' }) { return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} /> }

export function Toast({ message }) {
  return message ? <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-navy px-5 py-3 text-sm font-medium text-white shadow-xl">{message}</div> : null
}

export function EmptyState({ icon: Icon, title, children }) {
  return <div className="py-10 text-center">{Icon && <Icon className="mx-auto mb-3 text-slate-400" size={28} />}<p className="font-semibold text-ink">{title}</p>{children && <p className="mt-1 text-sm text-muted">{children}</p>}</div>
}
