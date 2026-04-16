import { useState } from 'react'
import { useBusiness } from '../components/BusinessContext'
import { getAvailability, createAppointment } from '../api/client'
import { Link } from 'react-router-dom'
import { CalendarIcon, ClockIcon, SettingsIcon, CheckCircleIcon } from '../components/Icons'

export default function BookAppointment() {
  const { business, services, refreshAppointments } = useBusiness()
  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [booking, setBooking] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [slotsError, setSlotsError] = useState('')

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

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <SettingsIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 mb-5">No hay servicios registrados</p>
        <Link to="/business" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all">
          Agregar Servicios
        </Link>
      </div>
    )
  }

  const fetchSlots = async () => {
    if (!serviceId || !date) return
    setLoadingSlots(true)
    setSlotsError('')
    setSelectedSlot(null)
    setSlots([])
    try {
      const data = await getAvailability(business.id, date, serviceId)
      setSlots(data)
      if (data.length === 0) setSlotsError('No hay horarios disponibles para esta fecha')
    } catch (err) {
      setSlotsError(err.message)
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleBook = async () => {
    if (!selectedSlot || !customerName.trim()) return
    setBooking(true)
    setMessage({ type: '', text: '' })
    try {
      await createAppointment({
        businessId: business.id,
        serviceId,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        appointmentDate: selectedSlot.startTime,
      })
      setMessage({
        type: 'success',
        text: customerEmail.trim() ? 'Cita reservada. Confirmación enviada por email.' : 'Cita reservada exitosamente',
      })
      setCustomerName('')
      setCustomerEmail('')
      setSelectedSlot(null)
      refreshAppointments()
      fetchSlots()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setBooking(false)
    }
  }

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  const today = new Date().toISOString().split('T')[0]
  const morningSlots = slots.filter((s) => new Date(s.startTime).getHours() < 12)
  const afternoonSlots = slots.filter((s) => new Date(s.startTime).getHours() >= 12)

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reservar Cita</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registro manual de cita para un cliente</p>
      </div>

      {/* Step 1 */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
          Servicio y fecha
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Servicio</label>
            <select
              value={serviceId}
              onChange={(e) => { setServiceId(e.target.value); setSlots([]); setSelectedSlot(null) }}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="">Seleccionar servicio…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Fecha</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => { setDate(e.target.value); setSlots([]); setSelectedSlot(null) }}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchSlots}
                disabled={!serviceId || !date || loadingSlots}
                className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all whitespace-nowrap"
              >
                {loadingSlots ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Buscando
                  </span>
                ) : 'Ver horarios'}
              </button>
            </div>
          </div>
        </div>

        {slotsError && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            {slotsError}
          </div>
        )}
      </div>

      {/* Step 2 */}
      {slots.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
            Horario <span className="text-gray-400 font-normal">({slots.length} disponibles)</span>
          </h2>
          <div className="space-y-3">
            {morningSlots.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">☀️ Mañana</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {morningSlots.map((slot) => {
                    const sel = selectedSlot?.startTime === slot.startTime
                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                          sel
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        {formatTime(slot.startTime)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {afternoonSlots.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-2">🌤️ Tarde</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {afternoonSlots.map((slot) => {
                    const sel = selectedSlot?.startTime === slot.startTime
                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
                          sel
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        {formatTime(slot.startTime)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3 */}
      {selectedSlot && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2 text-sm">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
            Datos del cliente
          </h2>

          <div className="bg-indigo-50 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-sm">
            <ClockIcon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            <span className="text-indigo-700 font-medium">
              {formatTime(selectedSlot.startTime)} — {formatTime(selectedSlot.endTime)}
            </span>
            <span className="text-indigo-400 mx-1">·</span>
            <span className="text-indigo-600 truncate">{services.find((s) => s.id === serviceId)?.name}</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre del cliente *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email (opcional)</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Ej: juan@email.com"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          {message.text && (
            <div className={`mt-3 rounded-xl px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.type === 'success' && <CheckCircleIcon className="w-4 h-4 inline mr-1.5" />}
              {message.text}
            </div>
          )}

          <button
            onClick={handleBook}
            disabled={booking || !customerName.trim()}
            className="mt-4 w-full sm:w-auto bg-green-600 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {booking ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Reservando…
              </span>
            ) : 'Confirmar Cita'}
          </button>
        </div>
      )}
    </div>
  )
}
