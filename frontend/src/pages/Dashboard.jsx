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

const STATUS_BADGE = {
  Pending: { cls: 'bg-yellow-50 text-yellow-700', label: 'Pendiente' },
  Confirmed: { cls: 'bg-blue-50 text-blue-700', label: 'Confirmada' },
}

function StatCard({ label, sub, value, Icon, color }) {
  return (
    <div className={`${color} rounded-2xl p-4 sm:p-5`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-5 h-5 opacity-70" />
      </div>
      <div className="text-2xl sm:text-3xl font-bold">{value}</div>
      <div className="text-xs sm:text-sm font-medium mt-1 opacity-80">{label}</div>
      {sub && <div className="text-xs mt-0.5 opacity-50 hidden sm:block">{sub}</div>}
    </div>
  )
}

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
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
          <StoreIcon className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Bienvenido a AgendaYa</h1>
        <p className="text-gray-500 mb-8 max-w-xs">Configura tu negocio para comenzar a recibir citas online</p>
        <Link
          to="/business"
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
        >
          Crear mi negocio
        </Link>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const active = appointments.filter((a) => a.status === 'Pending' || a.status === 'Confirmed')
  const completed = appointments.filter((a) => a.status === 'Completed')
  const cancelled = appointments.filter((a) => a.status === 'Cancelled')
  const todayActive = active.filter((a) => a.appointmentDate.split('T')[0] === today)

  const revenueValue = analytics?.monthRevenue != null
    ? `$${Number(analytics.monthRevenue).toLocaleString('es', { minimumFractionDigits: 0 })}`
    : '—'

  const timeStats = [
    { label: 'Hoy', value: analytics?.todayAppointments ?? todayActive.length, Icon: ClockIcon, color: 'bg-amber-50 text-amber-700' },
    { label: 'Esta semana', value: analytics?.weekAppointments ?? 0, Icon: CalendarIcon, color: 'bg-blue-50 text-blue-700' },
    { label: 'Este mes', value: analytics?.monthAppointments ?? 0, Icon: CalendarDaysIcon, color: 'bg-indigo-50 text-indigo-700' },
    { label: 'Servicios', value: analytics?.totalServices ?? services.length, Icon: SettingsIcon, color: 'bg-gray-100 text-gray-700' },
  ]

  const statusStats = [
    { label: 'Activas', sub: 'Pendientes + Confirmadas', value: analytics?.activeAppointments ?? active.length, Icon: CheckCircleIcon, color: 'bg-green-50 text-green-700' },
    { label: 'Completadas', sub: 'Realizadas', value: analytics?.completedAppointments ?? completed.length, Icon: FlagIcon, color: 'bg-emerald-50 text-emerald-700' },
    { label: 'Canceladas', sub: 'No realizadas', value: analytics?.cancelledAppointments ?? cancelled.length, Icon: BanIcon, color: 'bg-red-50 text-red-600' },
    { label: 'Ingresos mes', sub: 'Citas completadas', value: revenueValue, Icon: DollarIcon, color: 'bg-purple-50 text-purple-700' },
  ]

  const formatHour = (hour) => {
    const h = hour % 12 || 12
    return `${h}:00 ${hour < 12 ? 'AM' : 'PM'}`
  }

  const formatDateTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const upcoming = active
    .filter((a) => new Date(a.appointmentDate) >= new Date())
    .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{business.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Panel de control</p>
      </div>

      {/* Temporal stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {timeStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Status & revenue */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statusStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Insights */}
      {analytics && (analytics.topService || analytics.busiestHour || analytics.quietestHour) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {analytics.topService && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Servicio más agendado</div>
              <div className="text-base sm:text-lg font-bold text-gray-900 truncate">{analytics.topService.name}</div>
              <div className="text-sm text-indigo-600 font-medium mt-1">
                {analytics.topService.count} cita{analytics.topService.count !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          {analytics.busiestHour && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Hora más agendada</div>
              <div className="text-base sm:text-lg font-bold text-gray-900">{formatHour(analytics.busiestHour.hour)}</div>
              <div className="text-sm text-green-600 font-medium mt-1">
                {analytics.busiestHour.count} cita{analytics.busiestHour.count !== 1 ? 's' : ''}
              </div>
            </div>
          )}
          {analytics.quietestHour && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5">
              <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Hora menos agendada</div>
              <div className="text-base sm:text-lg font-bold text-gray-900">{formatHour(analytics.quietestHour.hour)}</div>
              <div className="text-sm text-amber-600 font-medium mt-1">
                {analytics.quietestHour.count} cita{analytics.quietestHour.count !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upcoming */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Próximas citas</h2>
          {upcoming.length > 0 && (
            <Link to="/appointments" className="text-xs text-indigo-600 hover:underline">Ver todas</Link>
          )}
        </div>
        {upcoming.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400 text-sm">No hay citas próximas activas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map((a) => {
              const cfg = STATUS_BADGE[a.status]
              return (
                <div key={a.id} className="flex items-center justify-between px-5 py-3.5 gap-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{a.customerName}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{a.durationMinutes} min</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg?.cls ?? 'bg-gray-100 text-gray-500'}`}>
                      {cfg?.label ?? a.status}
                    </span>
                    <span className="text-xs text-gray-500 hidden sm:block">{formatDateTime(a.appointmentDate)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
