import { Download, GraduationCap } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '../common/UI'
import { downloadQrSvg } from '../../utils/downloadQr'

export default function IDCardPreview({ student, onClose }) {
  const download = () => {
    const svg = document.querySelector('#student-qr svg')
    if (!svg) return
    downloadQrSvg(svg, `${student.id}-qr.svg`)
  }
  return <div>
    <div className="mx-auto max-w-[340px] overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
      <div className="bg-navy px-5 py-5 text-white"><div className="flex items-center gap-2"><GraduationCap size={22} /><div><p className="text-sm font-bold tracking-wide">CENTRAL COLLEGE</p><p className="text-[9px] uppercase tracking-[.18em] text-blue-200">Student identification</p></div></div></div>
      <div className="flex items-center gap-3 px-5 pt-5"><img src={student.avatar} alt="" className="h-14 w-14 rounded-xl border border-line bg-slate-50" /><div><p className="font-bold text-ink">{student.name}</p><p className="mt-1 text-xs text-muted">{student.className}</p></div></div>
      <div className="flex items-center justify-between px-5 py-4"><div><p className="text-[10px] uppercase tracking-wider text-muted">Student ID</p><p className="mt-1 font-mono text-sm font-bold text-ink">{student.id}</p><p className="mt-3 text-[10px] uppercase tracking-wider text-muted">Academic year</p><p className="mt-1 text-xs font-semibold text-ink">2026</p></div><div id="student-qr" className="rounded-lg border border-line p-2"><QRCodeSVG value={`CENTRAL-COLLEGE:${student.id}`} size={92} level="M" /></div></div>
      <div className="border-t border-dashed border-line px-5 py-3 text-center text-[10px] text-muted">This card is property of Central College</div>
    </div>
    <div className="mt-4 flex gap-2"><Button onClick={download} className="flex-1"><Download size={15} />Download QR</Button>{onClose && <Button variant="secondary" onClick={onClose}>Close</Button>}</div>
  </div>
}
