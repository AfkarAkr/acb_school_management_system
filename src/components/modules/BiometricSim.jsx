import { useState } from 'react'
import { Check, Fingerprint, LoaderCircle } from 'lucide-react'
import { Badge, Button, Panel } from '../common/UI'
import { useAppData } from '../../context/AppDataContext'
import { useAuth } from '../../context/AuthContext'

export default function BiometricSim() {
  const { staffAttendance, recordStaffAttendance } = useAppData()
  const { user } = useAuth()
  const todayRecord = staffAttendance.find((record) => record.staffId === user?.staffId)
  const [checkIn, setCheckIn] = useState(todayRecord?.checkIn ? new Date(todayRecord.checkIn).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')
  const [checkOut, setCheckOut] = useState(todayRecord?.checkOut ? new Date(todayRecord.checkOut).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '')
  const [scanning, setScanning] = useState('')
  const [verified, setVerified] = useState('')
  const simulate = async (type) => {
    if (scanning) return
    setScanning(type)
    setVerified('')
    window.setTimeout(() => {
      recordStaffAttendance(type).then((record) => {
        if (record) {
          const time = new Date(type === 'in' ? record.checkIn : record.checkOut).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          if (type === 'in') setCheckIn(time)
          else setCheckOut(time)
          setVerified(type)
        }
        setScanning('')
      })
    }, 1400)
  }
  return <Panel title="Biometric attendance" subtitle="Simulated fingerprint terminal · latency under 2 sec">
    <div className="mb-5 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800"><span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Terminal connected</span><span className="font-semibold">Online · 0.8s</span></div>
    <div className="grid gap-3 sm:grid-cols-2">
      {[{ type: 'in', title: 'Morning check-in', time: checkIn }, { type: 'out', title: 'Evening check-out', time: checkOut }].map(({ type, title, time }) => <div key={type} className="rounded-xl border border-line p-4 text-center">
        <p className="text-sm font-semibold text-ink">{title}</p><div className={`mx-auto my-3 grid h-14 w-14 place-items-center rounded-full ${scanning === type ? 'animate-pulse bg-blue-50 text-blue-700' : verified === type ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{scanning === type ? <LoaderCircle className="animate-spin" size={25} /> : verified === type ? <Check size={25} /> : <Fingerprint size={27} />}</div>
        {time ? <p className="text-xs font-medium text-emerald-700">Verified at {time}</p> : <p className="text-xs text-muted">Awaiting scan</p>}
        <Button className="mt-3 w-full" variant={time ? 'secondary' : 'primary'} disabled={Boolean(scanning) || Boolean(time)} onClick={() => simulate(type)}>{scanning === type ? 'Verifying…' : time ? 'Recorded' : 'Scan fingerprint'}</Button>
      </div>)}
    </div>
    <div className="mt-4 flex items-center gap-2 text-xs text-muted"><Badge tone={checkIn ? 'present' : 'pending'}>{checkIn ? 'Present' : 'Pending'}</Badge>{checkIn ? `Morning check-in recorded at ${checkIn}` : 'Your morning check-in has not been recorded yet'}</div>
  </Panel>
}
