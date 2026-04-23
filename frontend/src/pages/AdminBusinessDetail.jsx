import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAdminBusinessDetail } from '../api/client'
import { ChevronLeftIcon } from '../components/Icons'

const fmtDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}
const fmtDateTime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
const fmtMoney = (n) =>
  `$${Number(n ?? 0).toLocaleString('es', { minimumFractionDigits: 0 })}`

const STATUS_BADGE = {
  Pending: 'bg-yellow-50 text-yellow-700',
  Confirmed: 'bg-blue-50 text-blue-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Cancelled: 'bg-red-50 text-red-600',
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  )
}

export default function AdminBusinessDetail() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    getAdminBusinessDetail(id).then(setData).catch((e) => setErr(e.message))
  }, [id])

  if (err) return <div className="text-red-600 text-sm">{err}</div>
  if (!data) return <div className="text-gray-500">Cargando…</div>

  return (
    <div className="space-y-6">
      <Link to="/admin/businesses" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ChevronLeftIcon className="w-4 h-4" /> Volver
      </Link>

      <div className="flex items-center gap-3">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-lg" style={{ background: data.brandColor || '#6366f1' }} />
        )}
        <div>
          <h2 className="text-xl font-bold text-gray-900">{data.name}</h2>
          <div className="text-xs text-gray-500">/{data.slug} · creado {fmtDate(data.createdAt)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Citas totales" value={data.totalAppointments} />
        <Stat label="Activas" value={data.active} />
        <Stat label="Completadas" value={data.completed} />
        <Stat label="Canceladas" value={data.cancelled} />
        <Stat label="Citas 7d" value={data.appointments7d} />
        <Stat label="Citas 30d" value={data.appointments30d} />
        <Stat label="Ingresos 30d" value={fmtMoney(data.revenue30d)} />
        <Stat label="Ingresos totales" value={fmtMoney(data.totalRevenue)} />
        <Stat label="Servicios" value={data.serviceCount} />
        <Stat label="Días bloqueados" value={data.blockedDateCount} />
        <Stat label="Última cita" value={fmtDate(data.lastAppointmentAt)} />
      </div>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Usuarios ({data.users.length})</h3>
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {data.users.map((u) => (
            <div key={u.id} className="px-4 py-2 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium text-gray-900">{u.fullName}</div>
                <div className="text-xs text-gray-500">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                {u.isSuperAdmin && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs">super</span>
                )}
                <span className="text-xs text-gray-500">{fmtDate(u.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Servicios más usados</h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Servicio</th>
                <th className="text-right px-3 py-2 font-medium">Citas</th>
                <th className="text-right px-3 py-2 font-medium">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {data.topServices.map((s) => (
                <tr key={s.serviceId} className="border-t border-gray-100">
                  <td className="px-4 py-2">{s.serviceName}</td>
                  <td className="text-right px-3 py-2">{s.count}</td>
                  <td className="text-right px-3 py-2">{fmtMoney(s.revenue)}</td>
                </tr>
              ))}
              {data.topServices.length === 0 && (
                <tr><td colSpan="3" className="text-center py-6 text-gray-500">Sin datos</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Citas recientes</h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Cliente</th>
                <th className="text-left px-3 py-2 font-medium">Servicio</th>
                <th className="text-left px-3 py-2 font-medium">Fecha</th>
                <th className="text-left px-3 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.recentAppointments.map((a) => (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{a.customerName}</td>
                  <td className="px-3 py-2 text-gray-600">{a.serviceName}</td>
                  <td className="px-3 py-2 text-gray-600">{fmtDateTime(a.appointmentDate)}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_BADGE[a.status] || 'bg-gray-50 text-gray-600'}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.recentAppointments.length === 0 && (
                <tr><td colSpan="4" className="text-center py-6 text-gray-500">Sin citas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
