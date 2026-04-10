import { useLocation, useParams, Link } from 'react-router-dom'
import { CalendarIcon } from '../components/Icons'

export default function BookingConfirmation() {
  const { slug } = useParams()
  const { state } = useLocation()

  const brandColor = state?.brandColor ?? '#4F46E5'

  const getLogoUrl = (url) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${import.meta.env.VITE_API_URL ?? ''}${url}`
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <CalendarIcon className="w-12 sm:w-14 h-12 sm:h-14 text-gray-300 mb-4" />
        <p className="text-sm sm:text-base text-gray-500 mb-4">No hay datos de confirmación</p>
        <Link
          to={`/book/${slug}`}
          className="text-white px-5 py-2.5 rounded-lg font-medium transition-colors text-sm"
          style={{ backgroundColor: brandColor }}
        >
          Reservar una cita
        </Link>
      </div>
    )
  }

  const formatDate = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTime = (iso) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-6">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Branded header */}
          <div className="py-4 sm:py-6 px-4 sm:px-8" style={{ backgroundColor: brandColor }}>
            {state.logoUrl && (
              <img
                src={getLogoUrl(state.logoUrl)}
                alt={state.business}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover mx-auto mb-3 border-2 border-white/30"
              />
            )}
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white">¡Cita Agendada!</h1>
            <p className="text-white/80 text-xs sm:text-sm mt-1 truncate">{state.business}</p>
          </div>

          <div className="p-4 sm:p-8">
            <div className="bg-gray-50 rounded-xl p-4 sm:p-5 text-left space-y-3 mb-6">
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-500">Servicio</span>
                <span className="font-medium text-gray-800 text-right">{state.service}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-500">Fecha</span>
                <span className="font-medium text-gray-800">{formatDate(state.date)}</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-500">Hora</span>
                <span className="font-medium text-gray-800">
                  {formatTime(state.date)} — {formatTime(state.endTime)}
                </span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-500">Duración</span>
                <span className="font-medium text-gray-800">{state.duration} min</span>
              </div>
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-500">Cliente</span>
                <span className="font-medium text-gray-800 text-right">{state.customer}</span>
              </div>
            </div>

            {state.email && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-xs sm:text-sm text-blue-700">
                Se ha enviado una confirmación a <strong className="break-all">{state.email}</strong>
              </div>
            )}

            <Link
              to={`/book/${slug}`}
              className="inline-block text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-xs sm:text-sm"
              style={{ backgroundColor: brandColor }}
            >
              Reservar otra cita
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
