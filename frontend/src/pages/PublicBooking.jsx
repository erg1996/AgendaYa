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
  const [whatsAppConsent, setWhatsAppConsent] = useState(false)
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
    // Phone requires consent; consent without phone is ignored
    if (customerPhone.trim() && !whatsAppConsent) {
      setBookingError('Debes aceptar recibir recordatorios por WhatsApp para ingresar tu número.')
      return
    }
    setBooking(true)
    setBookingError('')
    try {
      const result = await createAppointment({
        businessId: business.id,
        serviceId: selectedService.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        // Only send phone when consent is given
        customerPhone: whatsAppConsent && customerPhone.trim() ? customerPhone.trim() : null,
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div
        className="border-b border-gray-200"
        style={{ backgroundColor: business.brandColor ?? '#4F46E5' }}
      >
        <div className="max-w-lg mx-auto px-4 py-4 sm:py-6 text-center">
          {business.logoUrl && (
            <img
              src={
                business.logoUrl.startsWith('http')
                  ? business.logoUrl
                  : `${import.meta.env.VITE_API_URL ?? ''}${business.logoUrl}`
              }
              alt={business.name}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover mx-auto mb-2 sm:mb-3 border-2 border-white/30"
            />
          )}
          <h1 className="text-lg sm:text-2xl font-bold text-white">{business.name}</h1>
          <p className="text-white/80 text-xs sm:text-sm mt-1">Reserva tu cita online</p>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-4 sm:py-6">
        {/* Progress */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1 sm:gap-2">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                  step >= s ? 'text-white' : 'bg-gray-200 text-gray-500'
                }`}
              style={step >= s ? { backgroundColor: business.brandColor ?? '#4F46E5' } : {}}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-8 sm:w-12 h-0.5 ${
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
            <h2 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">
              {step === 1 ? 'Elige un servicio' : `Servicio: ${selectedService?.name}`}
            </h2>
            {step === 1 ? (
              <div className="space-y-2">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => selectService(svc)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 sm:p-4 text-left hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium text-gray-800 text-sm sm:text-base truncate">{svc.name}</span>
                      <span className="text-xs sm:text-sm text-indigo-600 bg-indigo-50 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap">
                        {svc.durationMinutes} min
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => { setStep(1); setSelectedSlot(null) }}
                className="text-xs sm:text-sm text-indigo-600 hover:underline"
              >
                Cambiar servicio
              </button>
            )}
          </div>
        )}

        {/* Step 2: Select Date + Slot */}
        {step >= 2 && (
          <div className={`mb-6 ${step > 2 ? 'opacity-60' : ''}`}>
            <h2 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Elige fecha y horario</h2>

            <div className="mb-4">
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => fetchSlots(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>

            {loadingSlots && (
              <p className="text-gray-400 text-xs sm:text-sm text-center py-4">Buscando horarios...</p>
            )}

            {!loadingSlots && date && slots.length === 0 && (
              <div className="bg-amber-50 text-amber-700 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-center">
                No hay horarios disponibles para esta fecha
              </div>
            )}

            {slots.length > 0 && step === 2 && (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.startTime}
                    onClick={() => selectSlot(slot)}
                    className="py-2 sm:py-3 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    {formatTime(slot.startTime)}
                  </button>
                ))}
              </div>
            )}

            {step > 2 && selectedSlot && (
              <div>
                <p className="text-xs sm:text-sm text-gray-600">
                  {new Date(selectedSlot.startTime).toLocaleDateString('es', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}{' '}
                  a las {formatTime(selectedSlot.startTime)}
                </p>
                <button
                  onClick={() => { setStep(2); setSelectedSlot(null) }}
                  className="text-xs sm:text-sm text-indigo-600 hover:underline mt-1"
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
            <h2 className="font-semibold text-gray-800 mb-3 text-sm sm:text-base">Confirma tu cita</h2>

            <div className="bg-indigo-50 rounded-xl p-3 sm:p-4 mb-4">
              <div className="text-xs sm:text-sm text-indigo-700 space-y-1">
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
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Tu nombre *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Email (para confirmación)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Ej: juan@email.com"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Número de WhatsApp
                  <span className="text-gray-400 font-normal ml-1">(para recordatorio)</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value)
                    // Clear consent if phone is cleared
                    if (!e.target.value.trim()) setWhatsAppConsent(false)
                  }}
                  placeholder="Ej: 7890-1234"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
                {customerPhone.trim() && (
                  <label className="flex items-start gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={whatsAppConsent}
                      onChange={(e) => setWhatsAppConsent(e.target.checked)}
                      required={!!customerPhone.trim()}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <span className="text-xs text-gray-500">
                      Acepto recibir un recordatorio de mi cita por WhatsApp al número ingresado.
                    </span>
                  </label>
                )}
              </div>

              {bookingError && (
                <p className="text-red-500 text-xs sm:text-sm">{bookingError}</p>
              )}

              <button
                type="submit"
                disabled={booking || !customerName.trim()}
                className="w-full text-white py-2.5 sm:py-3 rounded-lg font-medium disabled:opacity-50 transition-colors text-sm"
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
