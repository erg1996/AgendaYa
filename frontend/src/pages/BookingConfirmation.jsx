import { useLocation, useParams, Link } from 'react-router-dom'
import { CalendarIcon } from '../components/Icons'

export default function BookingConfirmation() {
  const { slug } = useParams()
  const { state } = useLocation()

  const brandColor = state?.brandColor ?? '#4F46E5'

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <CalendarIcon className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">No hay datos de confirmación</p>
        <Link
          to={`/book/${slug}`}
          className="text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Branded header */}
          <div className="py-6 px-8" style={{ backgroundColor: brandColor }}>
            {state.logoUrl && (
              <img
                src={state.logoUrl}
                alt={state.business}
                className="w-12 h-12 rounded-lg object-cover mx-auto mb-3 border-2 border-white/30"
              />
            )}
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">¡Cita Agendada!</h1>
            <p className="text-white/80 text-sm mt-1">{state.business}</p>
          </div>

          <div className="p-8">
            <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Servicio</span>
                <span className="text-sm font-medium text-gray-800">{state.service}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Fecha</span>
                <span className="text-sm font-medium text-gray-800">{formatDate(state.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Hora</span>
                <span className="text-sm font-medium text-gray-800">
                  {formatTime(state.date)} — {formatTime(state.endTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Duración</span>
                <span className="text-sm font-medium text-gray-800">{state.duration} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Cliente</span>
                <span className="text-sm font-medium text-gray-800">{state.customer}</span>
              </div>
            </div>

            {state.email && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-700">
                Se ha enviado una confirmación a <strong>{state.email}</strong>
              </div>
            )}

            <Link
              to={`/book/${slug}`}
              className="inline-block text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm"
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
