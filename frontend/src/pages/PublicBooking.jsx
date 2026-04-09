import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getBusinessBySlug,
  getServices,
  getAvailability,
  createAppointment,
} from '../api/client'
import { SearchIcon } from '../components/Icons'

export default function PublicBooking() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Booking state
  const [step, setStep] = useState(1) // 1: service, 2: date+slots, 3: confirm
  const [selectedService, setSelectedService] = useState(null)
  const [date, setDate] = useState('')
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')

  useEffect(() => {
    loadBusiness()
  }, [slug])

  const loadBusiness = async () => {
    try {
      const biz = await getBusinessBySlug(slug)
      setBusiness(biz)
      const svcs = await getServices(biz.id)
      setServices(svcs)
    } catch {
      setError('Negocio no encontrado')
    } finally {
      setLoading(false)
    }
  }

  const selectService = (svc) => {
    setSelectedService(svc)
    setStep(2)
    setSelectedSlot(null)
    setSlots([])
    setDate('')
  }

  const fetchSlots = async (selectedDate) => {
    setDate(selectedDate)
    if (!selectedDate || !selectedService) return
    setLoadingSlots(true)
    setSelectedSlot(null)
    try {
      const data = await getAvailability(business.id, selectedDate, selectedService.id)
      setSlots(data)
    } catch {
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const selectSlot = (slot) => {
    setSelectedSlot(slot)
    setStep(3)
  }

  const handleBook = async (e) => {
    e.preventDefault()
    if (!selectedSlot || !customerName.trim()) return
    setBooking(true)
    setBookingError('')
    try {
      const result = await createAppointment({
        businessId: business.id,
        serviceId: selectedService.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        appointmentDate: selectedSlot.startTime,
      })
      navigate(`/book/${slug}/confirmed`, {
        state: {
          business: business.name,
          service: selectedService.name,
          date: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          duration: selectedService.durationMinutes,
          customer: customerName.trim(),
          email: customerEmail.trim() || null,
          brandColor: business.brandColor ?? '#4F46E5',
          logoUrl: business.logoUrl ?? null,
        },
      })
    } catch (err) {
      setBookingError(err.message)
    } finally {
      setBooking(false)
    }
  }

  const formatTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  const today = new Date().toISOString().split('T')[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Cargando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <SearchIcon className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-gray-600 text-lg">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="border-b border-gray-200"
        style={{ backgroundColor: business.brandColor ?? '#4F46E5' }}
      >
        <div className="max-w-lg mx-auto px-4 py-6 text-center">
          {business.logoUrl && (
            <img
              src={business.logoUrl}
              alt={business.name}
              className="w-16 h-16 rounded-xl object-cover mx-auto mb-3 border-2 border-white/30"
            />
          )}
          <h1 className="text-2xl font-bold text-white">{business.name}</h1>
          <p className="text-white/80 text-sm mt-1">Reserva tu cita online</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? 'text-white' : 'bg-gray-200 text-gray-500'
                }`}
              style={step >= s ? { backgroundColor: business.brandColor ?? '#4F46E5' } : {}}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 ${
                    step > s ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Service */}
        {step >= 1 && (
          <div className={`mb-6 ${step > 1 ? 'opacity-60' : ''}`}>
            <h2 className="font-semibold text-gray-800 mb-3">
              {step === 1 ? 'Elige un servicio' : `Servicio: ${selectedService?.name}`}
            </h2>
            {step === 1 ? (
              <div className="space-y-2">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => selectService(svc)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{svc.name}</span>
                      <span className="text-sm text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                        {svc.durationMinutes} min
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => { setStep(1); setSelectedSlot(null) }}
                className="text-sm text-indigo-600 hover:underline"
              >
                Cambiar servicio
              </button>
            )}
          </div>
        )}

        {/* Step 2: Select Date + Slot */}
        {step >= 2 && (
          <div className={`mb-6 ${step > 2 ? 'opacity-60' : ''}`}>
            <h2 className="font-semibold text-gray-800 mb-3">Elige fecha y horario</h2>

            <div className="mb-4">
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => fetchSlots(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            {loadingSlots && (
              <p className="text-gray-400 text-sm text-center py-4">Buscando horarios...</p>
            )}

            {!loadingSlots && date && slots.length === 0 && (
              <div className="bg-amber-50 text-amber-700 rounded-lg p-4 text-sm text-center">
                No hay horarios disponibles para esta fecha
              </div>
            )}

            {slots.length > 0 && step === 2 && (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    onClick={() => selectSlot(slot)}
                    className="py-3 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    {formatTime(slot.startTime)}
                  </button>
                ))}
              </div>
            )}

            {step > 2 && selectedSlot && (
              <div>
                <p className="text-sm text-gray-600">
                  {new Date(selectedSlot.startTime).toLocaleDateString('es', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}{' '}
                  a las {formatTime(selectedSlot.startTime)}
                </p>
                <button
                  onClick={() => { setStep(2); setSelectedSlot(null) }}
                  className="text-sm text-indigo-600 hover:underline mt-1"
                >
                  Cambiar horario
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && selectedSlot && (
          <div>
            <h2 className="font-semibold text-gray-800 mb-3">Confirma tu cita</h2>

            <div className="bg-indigo-50 rounded-xl p-4 mb-4">
              <div className="text-sm text-indigo-700 space-y-1">
                <p><strong>Servicio:</strong> {selectedService.name}</p>
                <p>
                  <strong>Fecha:</strong>{' '}
                  {new Date(selectedSlot.startTime).toLocaleDateString('es', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
                <p>
                  <strong>Hora:</strong> {formatTime(selectedSlot.startTime)} — {formatTime(selectedSlot.endTime)}
                </p>
                <p><strong>Duración:</strong> {selectedService.durationMinutes} min</p>
              </div>
            </div>

            <form onSubmit={handleBook} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tu nombre *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (para confirmación)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Ej: juan@email.com"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ej: 809-555-1234"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              {bookingError && (
                <p className="text-red-500 text-sm">{bookingError}</p>
              )}

              <button
                type="submit"
                disabled={booking || !customerName.trim()}
                className="w-full text-white py-3 rounded-lg font-medium disabled:opacity-50 transition-colors text-sm"
              style={{ backgroundColor: business.brandColor ?? '#4F46E5' }}
              >
                {booking ? 'Reservando...' : 'Confirmar Cita'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
