import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminActivity } from '../api/client'
import { CalendarIcon, StoreIcon } from '../components/Icons'

const fmtDateTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AdminActivity() {
  const [items, setItems] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    getAdminActivity(100).then(setItems).catch((e) => setErr(e.message))
  }, [])

  if (err) return <div className="text-red-600 text-sm">{err}</div>
  if (!items) return <div className="text-gray-500">Cargando…</div>

  return (
    <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
      {items.map((it, idx) => {
        const Icon = it.type === 'business' ? StoreIcon : CalendarIcon
        const tone = it.type === 'business' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
        return (
          <div key={idx} className="px-4 py-3 flex items-start gap-3">
            <div className={`p-1.5 rounded-md ${tone}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-900">
                <Link to={`/admin/businesses/${it.businessId}`} className="font-medium hover:underline">
                  {it.businessName}
                </Link>
                <span className="text-gray-500"> — {it.summary}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{fmtDateTime(it.at)}</div>
            </div>
          </div>
        )
      })}
      {items.length === 0 && <div className="px-4 py-8 text-center text-gray-500">Sin actividad</div>}
    </div>
  )
}
