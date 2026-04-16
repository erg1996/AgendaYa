import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getBusinessBySlug,
  getServices,
  getAvailability,
  createAppointment,
} from '../api/client'
import { ClockIcon, CalendarIcon, AgendaYaLogo } from '../components/Icons'

// Derive a readable text color (white or near-black) from any hex brand color
function textOnColor(hex) {
  if (!hex) return '#ffffff'
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#1f2937' : '#ffffff'
}

function hexWithAlpha(hex, alpha) {
  if (!hex) return `rgba(79,70,229,${alpha})`
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

const fmtPrice = (p) =>
  p != null ? `$${Number(p).toLocaleString('es', { minimumFractionDigits: 0 })}` : null

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

const fmtDateLong = (iso) =>
  new Date(iso).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })

const STEP_LABELS = ['Servicio', 'Horario', 'Datos']

export default function PublicBooking() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [step, setStep] = useState(1)
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

  useEffect(() => { loadBusiness() }, [slug])

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

  const brand = business?.brandColor ?? '#4F46E5'
  const onBrand = textOnColor(brand)
  const brandAlpha10 = hexWithAlpha(brand, 0.08)
  const brandAlpha20 = hexWithAlpha(brand, 0.18)

  const selectService = (svc) => {
    setSelectedService(svc)
    setStep(2)
    setSelectedSlot(null)
    setSlots([])
    setDate('')
  }

  const fetchSlots = async (d) => {
    setDate(d)
    if (!d || !selectedService) return
    setLoadingSlots(true)
    setSelectedSlot(null)
    try {
      const data = await getAvailability(business.id, d, selectedService.id)
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
    if (customerPhone.trim() && !whatsAppConsent) {
      setBookingError('Acepta recibir recordatorios por WhatsApp para continuar.')
      return
    }
    setBooking(true)
    setBookingError('')
    try {
      await createAppointment({
        businessId: business.id,
        serviceId: selectedService.id,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || null,
        customerPhone: whatsAppConsent && customerPhone.trim() ? customerPhone.trim() : null,
        appointmentDate: selectedSlot.startTime,
      })
      navigate(`/book/${slug}/confirmed`, {
        state: {
          business: business.name,
          service: selectedService.name,
          price: selectedService.price,
          date: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          duration: selectedService.durationMinutes,
          customer: customerName.trim(),
          email: customerEmail.trim() || null,
          brandColor: brand,
          logoUrl: business.logoUrl ?? null,
        },
      })
    } catch (err) {
      setBookingError(err.message)
    } finally {
      setBooking(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-sm text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // ── Not found ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 px-4">
        <div className="text-6xl">😕</div>
        <h1 className="text-xl font-bold text-gray-800">Página no encontrada</h1>
        <p className="text-gray-500 text-sm">El negocio "{slug}" no existe o fue desactivado.</p>
      </div>
    )
  }

  const logoSrc = business.logoUrl
    ? (business.logoUrl.startsWith('http') ? business.logoUrl : `${import.meta.env.VITE_API_URL ?? ''}${business.logoUrl}`)
    : null

  // slot groups
  const morningSlots = slots.filter(s => new Date(s.startTime).getHours() < 12)
  const afternoonSlots = slots.filter(s => new Date(s.startTime).getHours() >= 12)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>

      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ background: brand }}>
        {/* subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                              radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
          }}
        />
        <div className="relative max-w-lg mx-auto px-4 py-8 sm:py-12 text-center">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={business.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover mx-auto mb-4 shadow-lg"
              style={{ border: `3px solid ${hexWithAlpha(onBrand === '#ffffff' ? '#fff' : '#000', 0.25)}` }}
            />
          ) : (
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg text-2xl font-bold"
              style={{ background: hexWithAlpha(onBrand === '#ffffff' ? '#fff' : '#000', 0.15), color: onBrand }}
            >
              {business.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: onBrand }}
          >
            {business.name}
          </h1>
          <p
            className="mt-1.5 text-sm sm:text-base"
            style={{ color: hexWithAlpha(onBrand === '#ffffff' ? '#fff' : '#000', 0.75) }}
          >
            Reserva tu cita online · rápido y sin llamadas
          </p>
        </div>

        {/* curved bottom */}
        <div
          className="h-6 sm:h-8"
          style={{
            background: '#f8fafc',
            clipPath: 'ellipse(55% 100% at 50% 100%)',
          }}
        />
      </div>

      {/* ── Step progress ────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto w-full px-4 -mt-1 mb-6">
        <div className="flex items-center">
          {STEP_LABELS.map((label, idx) => {
            const n = idx + 1
            const done = step > n
            const active = step === n
            return (
              <div key={n} className="flex-1 flex items-center">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                    style={
                      done
                        ? { background: brand, color: onBrand }
                        : active
                        ? { background: brand, color: onBrand, boxShadow: `0 0 0 4px ${brandAlpha20}` }
                        : { background: '#e5e7eb', color: '#9ca3af' }
                    }
                  >
                    {done ? '✓' : n}
                  </div>
                  <span className={`text-xs ${active ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
                    {label}
                  </span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div
                    className="flex-1 h-0.5 mx-2 mb-5 transition-all"
                    style={{ background: step > n ? brand : '#e5e7eb' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 pb-12 space-y-4">

        {/* STEP 1: Services */}
        {step === 1 && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">
              ¿Qué servicio necesitas?
            </p>
            <div className="space-y-2.5">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => selectService(svc)}
                  className="w-full text-left rounded-2xl p-4 sm:p-5 transition-all group border border-gray-200 bg-white hover:shadow-md"
                  style={{ '--brand': brand }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm sm:text-base group-hover:text-[var(--brand)] transition-colors truncate">
                        {svc.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <ClockIcon className="w-3 h-3" />
                          {svc.durationMinutes} min
                        </span>
                        {fmtPrice(svc.price) && (
                          <span className="text-xs font-medium" style={{ color: brand }}>
                            {fmtPrice(svc.price)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0"
                      style={{ background: brandAlpha10, color: brand }}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
              {services.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Este negocio no tiene servicios disponibles aún.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: Date + slots */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Selected service summary */}
            <div
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{ background: brandAlpha10 }}
            >
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Servicio seleccionado</div>
                <div className="font-semibold text-gray-900 text-sm">{selectedService.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{selectedService.durationMinutes} min</span>
                  {fmtPrice(selectedService.price) && (
                    <span className="text-xs font-medium" style={{ color: brand }}>
                      {fmtPrice(selectedService.price)}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-xs underline text-gray-500 hover:text-gray-800"
              >
                Cambiar
              </button>
            </div>

            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                ¿Qué día?
              </p>
              <div className="relative">
                <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  min={today}
                  onChange={(e) => fetchSlots(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': brand }}
                  onFocus={e => e.target.style.borderColor = brand}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {loadingSlots && (
              <div className="flex items-center justify-center gap-2 py-8 text-gray-400">
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 border-t-gray-500 animate-spin" />
                <span className="text-sm">Buscando horarios…</span>
              </div>
            )}

            {!loadingSlots && date && slots.length === 0 && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center">
                <div className="text-2xl mb-2">📅</div>
                <p className="text-sm font-medium text-amber-800">Sin disponibilidad</p>
                <p className="text-xs text-amber-600 mt-1">Prueba con otra fecha</p>
              </div>
            )}

            {!loadingSlots && slots.length > 0 && (
              <div className="space-y-3">
                {morningSlots.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                      <span>☀️</span> Mañana
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {morningSlots.map((slot) => (
                        <button
                          key={slot.startTime}
                          onClick={() => selectSlot(slot)}
                          className="py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all hover:shadow-sm"
                          style={{
                            background: hexWithAlpha(brand, 0.06),
                            borderColor: hexWithAlpha(brand, 0.2),
                            color: brand,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = brand; e.currentTarget.style.color = onBrand }}
                          onMouseLeave={e => { e.currentTarget.style.background = hexWithAlpha(brand, 0.06); e.currentTarget.style.color = brand }}
                        >
                          {fmtTime(slot.startTime)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {afternoonSlots.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                      <span>🌤️</span> Tarde
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {afternoonSlots.map((slot) => (
                        <button
                          key={slot.startTime}
                          onClick={() => selectSlot(slot)}
                          className="py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all hover:shadow-sm"
                          style={{
                            background: hexWithAlpha(brand, 0.06),
                            borderColor: hexWithAlpha(brand, 0.2),
                            color: brand,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = brand; e.currentTarget.style.color = onBrand }}
                          onMouseLeave={e => { e.currentTarget.style.background = hexWithAlpha(brand, 0.06); e.currentTarget.style.color = brand }}
                        >
                          {fmtTime(slot.startTime)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Customer form */}
        {step === 3 && selectedSlot && (
          <div className="space-y-4">
            {/* Summary card */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
              <div className="px-4 py-3" style={{ background: brand }}>
                <p className="text-xs font-semibold" style={{ color: hexWithAlpha(onBrand === '#ffffff' ? '#fff' : '#000', 0.7) }}>
                  Tu reserva
                </p>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Servicio</span>
                  <span className="font-medium text-gray-900">{selectedService.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Fecha</span>
                  <span className="font-medium text-gray-900 capitalize">{fmtDateLong(selectedSlot.startTime)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Hora</span>
                  <span className="font-medium text-gray-900">
                    {fmtTime(selectedSlot.startTime)} — {fmtTime(selectedSlot.endTime)}
                  </span>
                </div>
                {fmtPrice(selectedService.price) && (
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-2">
                    <span className="text-gray-500">Total</span>
                    <span className="font-bold" style={{ color: brand }}>{fmtPrice(selectedService.price)}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => { setStep(2); setSelectedSlot(null) }}
              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
            >
              ← Cambiar horario
            </button>

            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Tus datos</p>

            <form onSubmit={handleBook} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej: María López"
                  required
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  onFocus={e => e.target.style.borderColor = brand}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email <span className="text-gray-400 font-normal">— para confirmación</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  onFocus={e => e.target.style.borderColor = brand}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  WhatsApp <span className="text-gray-400 font-normal">— para recordatorio</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value)
                    if (!e.target.value.trim()) setWhatsAppConsent(false)
                  }}
                  placeholder="7890-1234"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                  onFocus={e => e.target.style.borderColor = brand}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
                {customerPhone.trim() && (
                  <label className="flex items-start gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={whatsAppConsent}
                      onChange={(e) => setWhatsAppConsent(e.target.checked)}
                      className="mt-0.5 rounded"
                      style={{ accentColor: brand }}
                    />
                    <span className="text-xs text-gray-500">
                      Acepto recibir un recordatorio de mi cita por WhatsApp.
                    </span>
                  </label>
                )}
              </div>

              {bookingError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                  {bookingError}
                </div>
              )}

              <button
                type="submit"
                disabled={booking || !customerName.trim()}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md active:scale-[0.98]"
                style={{ background: brand, color: onBrand }}
              >
                {booking ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Reservando…
                  </span>
                ) : (
                  'Confirmar Cita'
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="py-5 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <AgendaYaLogo className="w-3.5 h-3.5" />
          Powered by AgendaYa
        </a>
      </div>
    </div>
  )
}
