import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminBusinesses } from '../api/client'

const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

const fmtMoney = (n) =>
  `$${Number(n ?? 0).toLocaleString('es', { minimumFractionDigits: 0 })}`

export default function AdminBusinesses() {
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState(null)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('createdAt')

  useEffect(() => {
    getAdminBusinesses().then(setRows).catch((e) => setErr(e.message))
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return []
    const term = q.trim().toLowerCase()
    let list = term
      ? rows.filter((r) => r.name.toLowerCase().includes(term) || r.slug.toLowerCase().includes(term))
      : [...rows]
    list.sort((a, b) => {
      switch (sort) {
        case 'name': return a.name.localeCompare(b.name)
        case 'appointments': return b.totalAppointments - a.totalAppointments
        case 'revenue30d': return b.revenue30d - a.revenue30d
        case 'last7d': return b.last7dAppointments - a.last7dAppointments
        default: return new Date(b.createdAt) - new Date(a.createdAt)
      }
    })
    return list
  }, [rows, q, sort])

  if (err) return <div className="text-red-600 text-sm">{err}</div>
  if (!rows) return <div className="text-gray-500">Cargando…</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o slug…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="createdAt">Más recientes</option>
          <option value="name">Nombre</option>
          <option value="appointments">Citas totales</option>
          <option value="revenue30d">Ingresos 30d</option>
          <option value="last7d">Actividad 7d</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Negocio</th>
                <th className="text-right px-3 py-2 font-medium">Usuarios</th>
                <th className="text-right px-3 py-2 font-medium">Citas</th>
                <th className="text-right px-3 py-2 font-medium">Activas</th>
                <th className="text-right px-3 py-2 font-medium">7d</th>
                <th className="text-right px-3 py-2 font-medium">30d</th>
                <th className="text-right px-3 py-2 font-medium">Ingresos 30d</th>
                <th className="text-left px-3 py-2 font-medium">Última cita</th>
                <th className="text-left px-3 py-2 font-medium">Creado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr key={b.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/admin/businesses/${b.id}`} className="font-medium text-indigo-700 hover:underline">
                      {b.name}
                    </Link>
                    <div className="text-xs text-gray-500">/{b.slug}</div>
                  </td>
                  <td className="text-right px-3 py-2">{b.userCount}</td>
                  <td className="text-right px-3 py-2">{b.totalAppointments}</td>
                  <td className="text-right px-3 py-2">{b.active}</td>
                  <td className="text-right px-3 py-2">{b.last7dAppointments}</td>
                  <td className="text-right px-3 py-2">{b.last30dAppointments}</td>
                  <td className="text-right px-3 py-2">{fmtMoney(b.revenue30d)}</td>
                  <td className="px-3 py-2 text-gray-600">{fmtDate(b.lastAppointmentAt)}</td>
                  <td className="px-3 py-2 text-gray-600">{fmtDate(b.createdAt)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="9" className="text-center py-8 text-gray-500">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
