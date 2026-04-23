import { useLocation, useParams, Link } from 'react-router-dom'
import { AgendaYaLogo } from '../components/Icons'

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

export default function BookingConfirmation() {
  const { slug } = useParams()
  const { state } = useLocation()

  const brand = state?.brandColor ?? '#4F46E5'
  const onBrand = textOnColor(brand)

  const getLogoUrl = (url) => {
    if (!url) return null
    return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL ?? ''}${url}`
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('es', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  if (!state) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 gap-4">
        <div className="text-5xl">🗓️</div>
        <p className="text-gray-600">No hay datos de confirmación</p>
        <Link
          to={`/book/${slug}`}
          className="px-6 py-2.5 rounded-xl font-medium text-sm"
          style={{ background: brand, color: onBrand }}
        >
          Hacer una reserva
        </Link>
      </div>
    )
  }

  const logoUrl = getLogoUrl(state.logoUrl)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f8fafc' }}>

      {/* Branded hero */}
      <div className="relative overflow-hidden" style={{ background: brand }}>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px),
                              radial-gradient(circle at 80% 20%, white 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
          }}
        />
        <div className="relative max-w-lg mx-auto px-4 pt-10 pb-16 text-center">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={state.business}
              className="w-14 h-14 rounded-2xl object-cover mx-auto mb-4 shadow-lg"
              style={{ border: `3px solid ${hexWithAlpha(onBrand === '#ffffff' ? '#fff' : '#000', 0.25)}` }}
            />
          )}
          {/* Success checkmark */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner"
            style={{ background: hexWithAlpha(onBrand === '#ffffff' ? '#fff' : '#000', 0.15) }}
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke={onBrand} strokeWidth={2.5}>
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: onBrand }}>
            ¡Cita confirmada!
          </h1>
          <p
            className="mt-1.5 text-sm"
            style={{ color: hexWithAlpha(onBrand === '#ffffff' ? '#fff' : '#000', 0.75) }}
          >
            {state.business}
          </p>
        </div>
        <div
          className="h-8"
          style={{ background: '#f8fafc', clipPath: 'ellipse(55% 100% at 50% 100%)' }}
        />
      </div>

      {/* Detail card */}
      <div className="max-w-lg mx-auto w-full px-4 -mt-2 pb-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 space-y-3">
            {[
              { label: 'Servicio', value: state.service },
              { label: 'Cliente', value: state.customer },
              {
                label: 'Fecha',
                value: <span className="capitalize">{formatDate(state.date)}</span>,
              },
              {
                label: 'Hora',
                value: `${formatTime(state.date)} — ${formatTime(state.endTime)}`,
              },
              { label: 'Duración', value: `${state.duration} min` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <span className="text-gray-500 flex-shrink-0">{label}</span>
                <span className="font-medium text-gray-900 text-right">{value}</span>
              </div>
            ))}
            {fmtPrice(state.price) && (
              <div className="flex justify-between gap-4 text-sm border-t border-gray-100 pt-3">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-base" style={{ color: brand }}>
                  {fmtPrice(state.price)}
                </span>
              </div>
            )}
          </div>

          {state.email && (
            <div className="mx-5 mb-5 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
              📧 Confirmación enviada a <strong className="break-all">{state.email}</strong>
            </div>
          )}

          <div className="px-5 pb-5">
            <Link
              to={`/book/${slug}`}
              className="block w-full text-center py-3 rounded-xl font-semibold text-sm transition-all hover:shadow-md active:scale-[0.98]"
              style={{ background: brand, color: onBrand }}
            >
              Reservar otra cita
            </Link>
          </div>
        </div>

        {/* Calendar hint */}
        <div
          className="mt-4 rounded-2xl p-4 text-center text-xs"
          style={{ background: hexWithAlpha(brand, 0.07) }}
        >
          <p style={{ color: brand }}>
            💡 Guarda esta fecha en tu calendario para no olvidarla.
          </p>
        </div>
      </div>

      {/* Footer */}
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
