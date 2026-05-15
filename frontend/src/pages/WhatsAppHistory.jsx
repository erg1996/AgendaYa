import { useState, useEffect, useCallback } from 'react'
import { useBusiness } from '../components/BusinessContext'
import { getWhatsAppLog } from '../api/client'
import { formatWallDateTime } from '../api/dateTime'
import { WhatsAppIcon } from '../components/Icons'

const TYPE_LABELS = {
  Confirmation:   { label: 'Confirmación',   color: 'bg-indigo-100 text-indigo-700' },
  AutoReminder:   { label: 'Recordatorio auto', color: 'bg-blue-100 text-blue-700' },
  ManualReminder: { label: 'Recordatorio manual', color: 'bg-purple-100 text-purple-700' },
  Campaign:       { label: 'Campaña',         color: 'bg-orange-100 text-orange-700' },
}

const FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'confirmation', label: 'Confirmaciones' },
  { value: 'autoreminder', label: 'Recordatorios auto' },
  { value: 'manualreminder', label: 'Recordatorios manuales' },
]

const PAGE_SIZE = 50

export default function WhatsAppHistory() {
  const { business } = useBusiness()
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!business?.id) return
    setLoading(true)
    try {
      const data = await getWhatsAppLog(business.id, page, PAGE_SIZE, filter || null)
      setLogs(data.items)
      setTotal(data.total)
    } catch {
      setLogs([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [business?.id, page, filter])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const handleFilterChange = (v) => {
    setFilter(v)
    setPage(1)
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <WhatsAppIcon className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-gray-500">Selecciona un negocio para ver el historial.</p>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-4xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <WhatsAppIcon className="w-6 h-6 text-green-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Historial WhatsApp</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">Mensajes enviados desde la sesión conectada</p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleFilterChange(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          Cargando historial...
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <WhatsAppIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay mensajes enviados aún</p>
          <p className="text-gray-400 text-sm mt-1">
            Los mensajes de confirmación, recordatorios y envíos manuales aparecerán aquí.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                {total} mensaje{total !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {logs.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LogRow({ log }) {
  const typeInfo = TYPE_LABELS[log.messageType] ?? { label: log.messageType, color: 'bg-gray-100 text-gray-600' }
  const initials = log.recipientName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-800 text-sm truncate">{log.recipientName}</p>
          <p className="text-xs text-gray-400 truncate">
            {log.recipientPhone}
            {log.senderPhone && <span className="ml-2 text-gray-300">desde {log.senderPhone}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`hidden sm:inline text-xs font-medium px-2.5 py-1 rounded-full ${typeInfo.color}`}>
          {typeInfo.label}
        </span>
        {log.success ? (
          <div className="flex items-center gap-1 text-green-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
            </svg>
            <span className="text-xs font-medium hidden sm:inline">Enviado</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-red-500" title={log.errorReason ?? ''}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            <span className="text-xs font-medium hidden sm:inline">Falló</span>
          </div>
        )}
        <span className="text-xs text-gray-400 whitespace-nowrap">{formatWallDateTime(log.sentAt)}</span>
      </div>
    </div>
  )
}
