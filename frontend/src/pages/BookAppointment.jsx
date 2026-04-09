import { useState } from 'react'
import { useBusiness } from '../components/BusinessContext'
import { getAvailability, createAppointment } from '../api/client'
import { Link } from 'react-router-dom'
import { CalendarIcon, SettingsIcon } from '../components/Icons'

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
      <div className="flex flex-col items-center justify-center py-20">
        <CalendarIcon className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Primero debes configurar un negocio</p>
        <Link
          to="/business"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Ir a Mi Negocio
        </Link>
      </div>
    )
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <SettingsIcon className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">No hay servicios registrados</p>
        <Link
          to="/business"
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
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
    try {
      const data = await getAvailability(business.id, date, serviceId)
      setSlots(data)
      if (data.length === 0) {
        setSlotsError('No hay horarios disponibles para esta fecha')
      }
    } catch (err) {
      setSlotsError(err.message)
      setSlots([])
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
      setMessage({ type: 'success', text: customerEmail.trim() ? 'Cita reservada. Confirmación enviada por email.' : 'Cita reservada exitosamente' })
      setCustomerName('')
      setCustomerEmail('')
      setSelectedSlot(null)
      refreshAppointments()
      // Refresh slots
      fetchSlots()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setBooking(false)
    }
  }

  const formatTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Reservar Cita</h1>

      {/* Step 1: Select service and date */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-4">1. Selecciona servicio y fecha</h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicio</label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              <option value="">Seleccionar...</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMinutes} min)
                </option>
              ))}
            </select>
          </div>
          <div className="w-44">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <button
            onClick={fetchSlots}
            disabled={!serviceId || !date || loadingSlots}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loadingSlots ? 'Buscando...' : 'Ver Disponibilidad'}
          </button>
        </div>
        {slotsError && <p className="text-red-500 text-sm mt-3">{slotsError}</p>}
      </div>

      {/* Step 2: Pick a slot */}
      {slots.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            2. Elige un horario ({slots.length} disponibles)
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {slots.map((slot) => {
              const isSelected =
                selectedSlot && selectedSlot.startTime === slot.startTime
              return (
                <button
                  key={slot.startTime}
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
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

      {/* Step 3: Confirm */}
      {selectedSlot && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">3. Confirma tu cita</h2>
          <div className="bg-indigo-50 rounded-lg p-4 mb-4 text-sm">
            <span className="text-indigo-700 font-medium">
              {formatTime(selectedSlot.startTime)} — {formatTime(selectedSlot.endTime)}
            </span>
            <span className="text-indigo-500 ml-2">
              · {services.find((s) => s.id === serviceId)?.name}
            </span>
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del cliente
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email (opcional)
              </label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Ej: juan@email.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <button
              onClick={handleBook}
              disabled={booking || !customerName.trim()}
              className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {booking ? 'Reservando...' : 'Confirmar Cita'}
            </button>
          </div>
          {message.text && (
            <p
              className={`text-sm mt-3 ${
                message.type === 'success' ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {message.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
