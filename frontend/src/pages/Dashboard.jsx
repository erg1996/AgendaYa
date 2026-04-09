import { useBusiness } from '../components/BusinessContext'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getDashboardAnalytics } from '../api/client'
import {
  StoreIcon,
  ClockIcon,
  CalendarIcon,
  CalendarDaysIcon,
  SettingsIcon,
  CheckCircleIcon,
  FlagIcon,
  BanIcon,
  DollarIcon,
} from '../components/Icons'

export default function Dashboard() {
  const { business, services, appointments } = useBusiness()
  const [analytics, setAnalytics] = useState(null)

  useEffect(() => {
    if (business?.id) {
      getDashboardAnalytics(business.id).then(setAnalytics).catch(() => {})
    }
  }, [business?.id, appointments.length])

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <StoreIcon className="w-16 h-16 text-indigo-400 mb-6" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Bienvenido a AgendaYa</h1>
        <p className="text-gray-500 mb-6">Configura tu negocio para comenzar a recibir citas</p>
        <Link to="/business" className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Crear Negocio
        </Link>
      </div>
    )
  }

  // Fallback local counts (before analytics loads)
  const today = new Date().toISOString().split('T')[0]
  const active = appointments.filter((a) => a.status === 'Pending' || a.status === 'Confirmed')
  const completed = appointments.filter((a) => a.status === 'Completed')
  const cancelled = appointments.filter((a) => a.status === 'Cancelled')
  const todayActive = active.filter((a) => a.appointmentDate.split('T')[0] === today)

  // Row 1 — temporal metrics
  const timeStats = [
    { label: 'Hoy', value: analytics?.todayAppointments ?? todayActive.length, Icon: ClockIcon, color: 'bg-amber-50 text-amber-700' },
    { label: 'Esta Semana', value: analytics?.weekAppointments ?? 0, Icon: CalendarIcon, color: 'bg-blue-50 text-blue-700' },
    { label: 'Este Mes', value: analytics?.monthAppointments ?? 0, Icon: CalendarDaysIcon, color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Servicios', value: analytics?.totalServices ?? services.length, Icon: SettingsIcon, color: 'bg-gray-50 text-gray-700' },
  ]

  // Row 2 — status & revenue
  const revenueValue = analytics?.monthRevenue != null
    ? `$${Number(analytics.monthRevenue).toLocaleString('es', { minimumFractionDigits: 0 })}`
    : '—'

  const statusStats = [
    { label: 'Activas', sub: 'Pendientes + Confirmadas', value: analytics?.activeAppointments ?? active.length, Icon: CheckCircleIcon, color: 'bg-green-50 text-green-700' },
    { label: 'Completadas', sub: 'Realizadas', value: analytics?.completedAppointments ?? completed.length, Icon: FlagIcon, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Canceladas', sub: 'No realizadas', value: analytics?.cancelledAppointments ?? cancelled.length, Icon: BanIcon, color: 'bg-red-50 text-red-600' },
    { label: 'Ingresos mes', sub: 'Citas completadas', value: revenueValue, Icon: DollarIcon, color: 'bg-purple-50 text-purple-700' },
  ]

  const formatHour = (hour) => {
    const h = hour % 12 || 12
    const ampm = hour < 12 ? 'AM' : 'PM'
    return `${h}:00 ${ampm}`
  }

  const formatDateTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const STATUS_BADGE = {
    Pending: 'bg-yellow-50 text-yellow-700',
    Confirmed: 'bg-blue-50 text-blue-700',
  }

  const upcoming = active
    .filter((a) => new Date(a.appointmentDate) >= new Date())
    .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
    .slice(0, 5)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">{business.name}</h1>
        <p className="text-gray-500">Panel de control</p>
      </div>

      {/* Row 1 — Temporal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {timeStats.map(({ label, value, Icon, color }) => (
          <div key={label} className={`${color} rounded-xl p-5 text-center`}>
            <Icon className="w-7 h-7 mx-auto mb-1" />
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm mt-1 opacity-75">{label}</div>
          </div>
        ))}
      </div>

      {/* Row 2 — Status & revenue */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statusStats.map(({ label, sub, value, Icon, color }) => (
          <div key={label} className={`${color} rounded-xl p-5 text-center`}>
            <Icon className="w-7 h-7 mx-auto mb-1" />
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-sm mt-1 opacity-75">{label}</div>
            <div className="text-xs mt-0.5 opacity-50">{sub}</div>
          </div>
        ))}
      </div>

      {/* Insights */}
      {analytics && (analytics.topService || analytics.busiestHour || analytics.quietestHour) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {analytics.topService && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Servicio mas agendado</div>
              <div className="text-xl font-bold text-gray-800">{analytics.topService.name}</div>
              <div className="text-sm text-indigo-600 font-medium mt-1">
                {analytics.topService.count} cita{analytics.topService.count !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          {analytics.busiestHour && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Hora mas agendada</div>
              <div className="text-xl font-bold text-gray-800">{formatHour(analytics.busiestHour.hour)}</div>
              <div className="text-sm text-green-600 font-medium mt-1">
                {analytics.busiestHour.count} cita{analytics.busiestHour.count !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          {analytics.quietestHour && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm text-gray-500 mb-1">Hora menos agendada</div>
              <div className="text-xl font-bold text-gray-800">{formatHour(analytics.quietestHour.hour)}</div>
              <div className="text-sm text-amber-600 font-medium mt-1">
                {analytics.quietestHour.count} cita{analytics.quietestHour.count !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Proximas Citas</h2>
        {upcoming.length === 0 ? (
          <p className="text-gray-400 text-center py-6">No hay citas proximas activas</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcoming.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium text-gray-800">{a.customerName}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-sm text-gray-500">{a.durationMinutes} min</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {a.status === 'Pending' ? 'Pendiente' : 'Confirmada'}
                  </span>
                  <span className="text-sm text-gray-500">{formatDateTime(a.appointmentDate)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
