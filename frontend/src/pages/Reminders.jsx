import { useState, useEffect, useCallback } from 'react'
import { useBusiness } from '../components/BusinessContext'
import { getPendingWhatsAppReminders, markWhatsAppReminderSent, getWhatsAppSession } from '../api/client'
import { formatWallTime } from '../api/dateTime'
import { WhatsAppIcon, BellIcon } from '../components/Icons'

const ES_TZ = 'America/El_Salvador'
const WA_STATUS = { Connected: 3 }

// API now returns wall-clock El Salvador strings (no Z) — display them verbatim.
const formatLocalTime = formatWallTime

function tomorrowLabel() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ES_TZ,
  })
}

export default function Reminders() {
  const { business } = useBusiness()
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [sentIds, setSentIds] = useState(new Set())
  const [sendingIds, setSendingIds] = useState(new Set())
  const [errorMap, setErrorMap] = useState(new Map())
  const [autoEnabled, setAutoEnabled] = useState(false)

  const load = useCallback(async () => {
    if (!business?.id) return
    setLoading(true)
    try {
      const [data, session] = await Promise.all([
        getPendingWhatsAppReminders(business.id),
        getWhatsAppSession(business.id).catch(() => null),
      ])
      setReminders(data)
      setAutoEnabled(
        session?.status === WA_STATUS.Connected && session?.autoRemindersEnabled === true
      )
      const alreadySent = new Set(data.filter((r) => r.whatsAppReminderSent).map((r) => r.appointmentId))
      setSentIds(alreadySent)
    } catch {
      setReminders([])
    } finally {
      setLoading(false)
    }
  }, [business?.id])

  useEffect(() => { load() }, [load])

  const handleSend = async (reminder) => {
    if (sendingIds.has(reminder.appointmentId)) return
    setSendingIds((prev) => new Set([...prev, reminder.appointmentId]))
    setErrorMap((prev) => { const m = new Map(prev); m.delete(reminder.appointmentId); return m })
    try {
      await markWhatsAppReminderSent(reminder.appointmentId, business.id)
      setSentIds((prev) => new Set([...prev, reminder.appointmentId]))
    } catch (err) {
      setErrorMap((prev) => new Map([...prev, [reminder.appointmentId, err.message ?? 'Error al enviar']]))
    } finally {
      setSendingIds((prev) => { const s = new Set(prev); s.delete(reminder.appointmentId); return s })
    }
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <BellIcon className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-gray-500">Selecciona un negocio para ver los recordatorios.</p>
      </div>
    )
  }

  const pending = reminders.filter((r) => !sentIds.has(r.appointmentId))
  const sent = reminders.filter((r) => sentIds.has(r.appointmentId))

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Recordatorios</h1>
          {autoEnabled ? (
            <span className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              <WhatsAppIcon className="w-3.5 h-3.5" />
              Enviando automáticamente
            </span>
          ) : pending.length > 0 ? (
            <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Citas de mañana ({tomorrowLabel()}) con número de WhatsApp
        </p>
      </div>

      {autoEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
          La sesión de WhatsApp está conectada y los recordatorios se envían automáticamente.
          Los botones manuales están disponibles como respaldo.
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Cargando recordatorios...
        </div>
      ) : reminders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <BellIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay citas para mañana con WhatsApp</p>
          <p className="text-gray-400 text-sm mt-1">
            Cuando tus clientes ingresen su número al reservar, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">
                  {autoEnabled ? 'Pendientes de envío automático' : 'Por enviar'}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {pending.map((r) => (
                  <ReminderRow
                    key={r.appointmentId}
                    reminder={r}
                    onSend={handleSend}
                    sent={false}
                    sending={sendingIds.has(r.appointmentId)}
                    errorMsg={errorMap.get(r.appointmentId)}
                    autoEnabled={autoEnabled}
                  />
                ))}
              </div>
            </div>
          )}

          {sent.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-500">Ya enviados</span>
              </div>
              <div className="divide-y divide-gray-100 opacity-60">
                {sent.map((r) => (
                  <ReminderRow
                    key={r.appointmentId}
                    reminder={r}
                    onSend={handleSend}
                    sent
                    sending={sendingIds.has(r.appointmentId)}
                    errorMsg={errorMap.get(r.appointmentId)}
                    autoEnabled={autoEnabled}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!autoEnabled && (
        <p className="text-xs text-gray-400 mt-6 text-center">
          El mensaje se envía desde el número conectado en la sesión de WhatsApp.
        </p>
      )}
    </div>
  )
}

function ReminderRow({ reminder, onSend, sent, sending, errorMsg, autoEnabled }) {
  const initials = reminder.customerName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-800 text-sm truncate">{reminder.customerName}</p>
            <p className="text-xs text-gray-500 truncate">
              {reminder.serviceName}
              <span className="mx-1">·</span>
              {formatLocalTime(reminder.appointmentDateUtc)}
            </p>
            <p className="text-xs text-gray-400">{reminder.customerPhone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {sent && !errorMsg && (
            <div className="flex items-center gap-1 text-green-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
              </svg>
              <span className="text-xs font-medium">Enviado</span>
            </div>
          )}
          <button
            onClick={() => onSend(reminder)}
            disabled={sending}
            title={autoEnabled && !sent ? 'Envío automático activo — click para enviar manualmente ahora' : undefined}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              sent
                ? 'bg-gray-100 hover:bg-green-50 text-gray-500 hover:text-green-700'
                : autoEnabled
                  ? 'bg-gray-100 hover:bg-green-50 text-gray-500 hover:text-green-700'
                  : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {sending ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <WhatsAppIcon className="w-4 h-4" />
            )}
            <span>{sending ? 'Enviando…' : sent ? 'Reenviar' : autoEnabled ? 'Manual' : 'Enviar'}</span>
          </button>
        </div>
      </div>
      {errorMsg && (
        <p className="mt-1.5 ml-12 text-xs text-red-500">{errorMsg}</p>
      )}
    </div>
  )
}
