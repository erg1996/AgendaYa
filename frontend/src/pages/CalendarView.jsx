import { useBusiness } from '../components/BusinessContext'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarIcon, XIcon, ChevronLeftIcon, ChevronRightIcon, ListIcon } from '../components/Icons'

const STATUS_COLOR = {
  Pending:   'bg-yellow-100 border-yellow-300 text-yellow-800',
  Confirmed: 'bg-blue-100 border-blue-300 text-blue-800',
  Completed: 'bg-green-100 border-green-300 text-green-800',
  Cancelled: 'bg-red-50 border-red-200 text-red-500 opacity-60',
}
const STATUS_DOT = {
  Pending: 'bg-yellow-400', Confirmed: 'bg-blue-400',
  Completed: 'bg-green-400', Cancelled: 'bg-red-300',
}
const STATUS_LABEL = { Pending: 'Pendiente', Confirmed: 'Confirmada', Completed: 'Completada', Cancelled: 'Cancelada' }

const START_HOUR = 8
const END_HOUR = 21
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 64

function getWeekDays(ref) {
  const day = ref.getDay()
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate()
}

const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

export default function CalendarView() {
  const { business, appointments, services } = useBusiness()
  const [weekRef, setWeekRef] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d
  })
  const [selectedAppt, setSelectedAppt] = useState(null)
  const [mobileView, setMobileView] = useState('list') // 'list' | 'grid'

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <CalendarIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 mb-5">Primero debes configurar un negocio</p>
        <Link to="/business" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all">
          Ir a Mi Negocio
        </Link>
      </div>
    )
  }

  const weekDays = getWeekDays(weekRef)
  const today = new Date(); today.setHours(0,0,0,0)
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)

  const prevWeek = () => { const d = new Date(weekRef); d.setDate(d.getDate()-7); setWeekRef(d); setSelectedAppt(null) }
  const nextWeek = () => { const d = new Date(weekRef); d.setDate(d.getDate()+7); setWeekRef(d); setSelectedAppt(null) }
  const goToday  = () => { const d = new Date(); d.setHours(0,0,0,0); setWeekRef(d); setSelectedAppt(null) }

  const getServiceName = (id) => services.find((s) => s.id === id)?.name ?? 'Servicio'
  const formatTime = (iso) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  const weekLabel = `${weekDays[0].getDate()} ${MONTHS[weekDays[0].getMonth()]} — ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`

  // All appts for this week
  const weekAppts = appointments.filter((a) => {
    const d = new Date(a.appointmentDate)
    return d >= weekDays[0] && d < new Date(weekDays[6].getTime() + 86400000)
  }).sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario</h1>
          <p className="text-sm text-gray-500 mt-0.5">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Mobile view toggle */}
          <button
            onClick={() => setMobileView(v => v === 'list' ? 'grid' : 'list')}
            className="sm:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all"
            aria-label="Cambiar vista"
          >
            {mobileView === 'list' ? <CalendarIcon className="w-4 h-4" /> : <ListIcon className="w-4 h-4" />}
          </button>
          <button onClick={prevWeek} aria-label="Semana anterior" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
            Hoy
          </button>
          <button onClick={nextWeek} aria-label="Semana siguiente" className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-all">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[k]}`} />
            {v}
          </div>
        ))}
      </div>

      {/* ── MOBILE LIST VIEW ───────────────────────────────────────────── */}
      <div className={`sm:hidden ${mobileView === 'grid' ? 'hidden' : ''}`}>
        {weekAppts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm">No hay citas esta semana</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {weekAppts.map((a) => {
              const cfg = STATUS_COLOR[a.status] ?? STATUS_COLOR.Pending
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAppt(selectedAppt?.id === a.id ? null : a)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[a.status]}`} />
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{a.customerName}</div>
                        <div className="text-xs text-gray-500 truncate">{getServiceName(a.serviceId)}</div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-medium text-gray-700">
                        {new Date(a.appointmentDate).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-xs text-gray-500">{formatTime(a.appointmentDate)}</div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── WEEK GRID (desktop + mobile grid mode) ──────────────────────── */}
      <div className={`${mobileView === 'list' ? 'hidden sm:block' : ''}`}>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <div className="min-w-[560px]">
            {/* Day headers */}
            <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: '48px repeat(7, 1fr)' }}>
              <div className="py-3" />
              {weekDays.map((d, i) => {
                const isToday = sameDay(d, today)
                return (
                  <div key={i} className={`py-3 text-center border-l border-gray-100 ${isToday ? 'bg-indigo-50' : ''}`}>
                    <div className="text-xs text-gray-400 font-medium">{DAY_SHORT[i]}</div>
                    <div className={`text-sm font-bold mt-0.5 mx-auto w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-indigo-600 text-white' : 'text-gray-700'
                    }`}>
                      {d.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Time grid */}
            <div className="relative" style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-gray-100 flex"
                  style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
                >
                  <div className="w-12 flex-shrink-0 pr-2 text-right">
                    <span className="text-xs text-gray-400 -mt-2.5 block">
                      {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`}
                    </span>
                  </div>
                </div>
              ))}

              <div className="absolute inset-0" style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)' }}>
                <div />
                {weekDays.map((day, colIdx) => {
                  const dayAppts = appointments.filter((a) => sameDay(new Date(a.appointmentDate), day))
                  const isToday = sameDay(day, today)
                  return (
                    <div key={colIdx} className={`relative border-l border-gray-100 ${isToday ? 'bg-indigo-50/40' : ''}`}>
                      {dayAppts.map((a) => {
                        const d = new Date(a.appointmentDate)
                        const topPct = ((d.getHours() + d.getMinutes() / 60 - START_HOUR) / TOTAL_HOURS) * 100
                        const heightPx = Math.max(20, (a.durationMinutes / 60) * HOUR_HEIGHT)
                        const top = Math.max(0, d.getHours() + d.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT
                        const colorClass = STATUS_COLOR[a.status] ?? STATUS_COLOR.Pending
                        const isSelected = selectedAppt?.id === a.id
                        return (
                          <button
                            key={a.id}
                            onClick={() => setSelectedAppt(isSelected ? null : a)}
                            className={`absolute left-0.5 right-0.5 rounded-lg border text-left px-1.5 py-0.5 overflow-hidden transition-all ${colorClass} ${
                              isSelected ? 'shadow-md ring-2 ring-indigo-400 z-10' : 'hover:shadow-sm z-0'
                            }`}
                            style={{ top: `${top}px`, height: `${heightPx}px` }}
                          >
                            <div className="text-xs font-semibold leading-tight truncate">{a.customerName}</div>
                            {heightPx > 30 && <div className="text-xs opacity-70 truncate">{getServiceName(a.serviceId)}</div>}
                            {heightPx > 48 && <div className="text-xs opacity-60">{formatTime(a.appointmentDate)}</div>}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment detail */}
      {selectedAppt && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">{selectedAppt.customerName}</h3>
              <p className="text-gray-500 text-sm">{getServiceName(selectedAppt.serviceId)} · {selectedAppt.durationMinutes} min</p>
            </div>
            <button onClick={() => setSelectedAppt(null)} aria-label="Cerrar" className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Fecha</div>
              <div className="font-medium text-gray-800 capitalize">
                {new Date(selectedAppt.appointmentDate).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Hora</div>
              <div className="font-medium text-gray-800">
                {formatTime(selectedAppt.appointmentDate)} — {formatTime(selectedAppt.endTime)}
              </div>
            </div>
            {selectedAppt.customerEmail && (
              <div className="col-span-2 sm:col-span-1">
                <div className="text-xs text-gray-400 mb-0.5">Email</div>
                <div className="text-gray-700 break-all">{selectedAppt.customerEmail}</div>
              </div>
            )}
            {selectedAppt.customerPhone && (
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Teléfono</div>
                <div className="text-gray-700">{selectedAppt.customerPhone}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-gray-400 mb-0.5">Estado</div>
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${STATUS_COLOR[selectedAppt.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selectedAppt.status]}`} />
                {STATUS_LABEL[selectedAppt.status]}
              </span>
            </div>
            {selectedAppt.notes && (
              <div className="col-span-2">
                <div className="text-xs text-gray-400 mb-0.5">Nota interna</div>
                <div className="text-gray-600 italic text-sm bg-gray-50 rounded-lg px-3 py-2">{selectedAppt.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
