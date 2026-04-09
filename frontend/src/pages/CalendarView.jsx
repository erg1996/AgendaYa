import { useBusiness } from '../components/BusinessContext'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarIcon, XIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons'

const STATUS_COLOR = {
  Pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  Confirmed: 'bg-blue-100 border-blue-300 text-blue-800',
  Completed: 'bg-green-100 border-green-300 text-green-800',
  Cancelled: 'bg-red-50 border-red-200 text-red-600 opacity-50',
}

const STATUS_DOT = {
  Pending: 'bg-yellow-400',
  Confirmed: 'bg-blue-400',
  Completed: 'bg-green-400',
  Cancelled: 'bg-red-300',
}

// Calendar shows 8am–9pm (13 hours × 60px = 780px height per column)
const START_HOUR = 8
const END_HOUR = 21
const TOTAL_HOURS = END_HOUR - START_HOUR
const HOUR_HEIGHT = 64 // px per hour

function getWeekDays(referenceDate) {
  const day = referenceDate.getDay() // 0=Sun
  const monday = new Date(referenceDate)
  monday.setDate(referenceDate.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function appointmentTop(appointment) {
  const d = new Date(appointment.appointmentDate)
  const hours = d.getHours() + d.getMinutes() / 60 - START_HOUR
  return Math.max(0, hours * HOUR_HEIGHT)
}

function appointmentHeight(durationMinutes) {
  return Math.max(20, (durationMinutes / 60) * HOUR_HEIGHT)
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate()
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default function CalendarView() {
  const { business, appointments, services } = useBusiness()
  const [weekRef, setWeekRef] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [selectedAppt, setSelectedAppt] = useState(null)

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <CalendarIcon className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Primero debes configurar un negocio</p>
        <Link to="/business" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Ir a Mi Negocio
        </Link>
      </div>
    )
  }

  const weekDays = getWeekDays(weekRef)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const prevWeek = () => {
    const d = new Date(weekRef)
    d.setDate(d.getDate() - 7)
    setWeekRef(d)
    setSelectedAppt(null)
  }
  const nextWeek = () => {
    const d = new Date(weekRef)
    d.setDate(d.getDate() + 7)
    setWeekRef(d)
    setSelectedAppt(null)
  }
  const goToday = () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    setWeekRef(d)
    setSelectedAppt(null)
  }

  const getServiceName = (serviceId) => services.find((s) => s.id === serviceId)?.name ?? 'Servicio'
  const formatTime = (iso) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  const weekLabel = `${weekDays[0].getDate()} ${MONTHS[weekDays[0].getMonth()]} — ${weekDays[6].getDate()} ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calendario</h1>
          <p className="text-gray-500 text-sm">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} aria-label="Semana anterior" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
            Hoy
          </button>
          <button onClick={nextWeek} aria-label="Semana siguiente" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {Object.entries({ Pending: 'Pendiente', Confirmed: 'Confirmada', Completed: 'Completada', Cancelled: 'Cancelada' }).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[k]}`} />
            {v}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Day headers */}
          <div className="grid border-b border-gray-200" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
            <div className="py-3" />
            {weekDays.map((d, i) => {
              const isToday = sameDay(d, today)
              return (
                <div key={i} className={`py-3 text-center border-l border-gray-100 ${isToday ? 'bg-indigo-50' : ''}`}>
                  <div className="text-xs text-gray-400 font-medium">{DAY_NAMES[i]}</div>
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
            {/* Hour lines */}
            {hours.map((h) => (
              <div
                key={h}
                className="absolute w-full border-t border-gray-100 flex"
                style={{ top: `${(h - START_HOUR) * HOUR_HEIGHT}px` }}
              >
                <div className="w-14 flex-shrink-0 pr-2 text-right">
                  <span className="text-xs text-gray-400 -mt-2.5 block">
                    {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                  </span>
                </div>
              </div>
            ))}

            {/* Day columns */}
            <div
              className="absolute inset-0"
              style={{ display: 'grid', gridTemplateColumns: '56px repeat(7, 1fr)' }}
            >
              <div /> {/* time gutter */}
              {weekDays.map((day, colIdx) => {
                const dayAppts = appointments.filter((a) => {
                  const d = new Date(a.appointmentDate)
                  return sameDay(d, day)
                })
                const isToday = sameDay(day, today)

                return (
                  <div key={colIdx} className={`relative border-l border-gray-100 ${isToday ? 'bg-indigo-50/30' : ''}`}>
                    {dayAppts.map((a) => {
                      const top = appointmentTop(a)
                      const height = appointmentHeight(a.durationMinutes)
                      const colorClass = STATUS_COLOR[a.status] ?? STATUS_COLOR.Pending
                      const isSelected = selectedAppt?.id === a.id

                      return (
                        <button
                          key={a.id}
                          onClick={() => setSelectedAppt(isSelected ? null : a)}
                          className={`absolute left-0.5 right-0.5 rounded border text-left px-1.5 py-0.5 overflow-hidden transition-shadow ${colorClass} ${
                            isSelected ? 'shadow-md ring-2 ring-indigo-400 z-10' : 'hover:shadow-sm z-0'
                          }`}
                          style={{ top: `${top}px`, height: `${height}px` }}
                        >
                          <div className="text-xs font-semibold leading-tight truncate">{a.customerName}</div>
                          {height > 30 && (
                            <div className="text-xs opacity-70 truncate">{getServiceName(a.serviceId)}</div>
                          )}
                          {height > 48 && (
                            <div className="text-xs opacity-60">{formatTime(a.appointmentDate)}</div>
                          )}
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

      {/* Appointment detail popup */}
      {selectedAppt && (
        <div className="mt-4 bg-white rounded-xl border border-indigo-200 p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-800 text-lg">{selectedAppt.customerName}</h3>
              <p className="text-gray-500 text-sm">{getServiceName(selectedAppt.serviceId)} · {selectedAppt.durationMinutes} min</p>
            </div>
            <button onClick={() => setSelectedAppt(null)} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600"><XIcon className="w-5 h-5" /></button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Fecha</span>
              <p className="text-gray-700 font-medium">
                {new Date(selectedAppt.appointmentDate).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Hora</span>
              <p className="text-gray-700 font-medium">
                {formatTime(selectedAppt.appointmentDate)} — {formatTime(selectedAppt.endTime)}
              </p>
            </div>
            {selectedAppt.customerEmail && (
              <div>
                <span className="text-gray-400">Email</span>
                <p className="text-gray-700">{selectedAppt.customerEmail}</p>
              </div>
            )}
            {selectedAppt.customerPhone && (
              <div>
                <span className="text-gray-400">Teléfono</span>
                <p className="text-gray-700">{selectedAppt.customerPhone}</p>
              </div>
            )}
            <div>
              <span className="text-gray-400">Estado</span>
              <span className={`inline-flex items-center gap-1 mt-0.5 text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[selectedAppt.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[selectedAppt.status]}`} />
                {{ Pending: 'Pendiente', Confirmed: 'Confirmada', Completed: 'Completada', Cancelled: 'Cancelada' }[selectedAppt.status]}
              </span>
            </div>
            {selectedAppt.notes && (
              <div className="col-span-2">
                <span className="text-gray-400">Nota interna</span>
                <p className="text-gray-700 italic text-sm mt-0.5">{selectedAppt.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
