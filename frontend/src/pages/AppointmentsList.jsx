import { useBusiness } from '../components/BusinessContext'
import { updateAppointmentStatus, updateAppointmentNotes, downloadReportCsv } from '../api/client'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { ListIcon, InboxIcon, XIcon } from '../components/Icons'

const STATUS_CONFIG = {
  Pending:   { label: 'Pendiente',  bg: 'bg-yellow-50 text-yellow-700 border-yellow-200',  dot: 'bg-yellow-400' },
  Confirmed: { label: 'Confirmada', bg: 'bg-blue-50 text-blue-700 border-blue-200',         dot: 'bg-blue-400' },
  Cancelled: { label: 'Cancelada',  bg: 'bg-red-50 text-red-600 border-red-200',            dot: 'bg-red-400' },
  Completed: { label: 'Completada', bg: 'bg-green-50 text-green-700 border-green-200',      dot: 'bg-green-400' },
}

const STATUS_ACTIONS = {
  Pending:   [{ label: 'Confirmar', to: 'Confirmed', cls: 'text-blue-600 hover:text-blue-800 border-blue-200 hover:bg-blue-50' },
              { label: 'Cancelar',  to: 'Cancelled', cls: 'text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50' }],
  Confirmed: [{ label: 'Completar', to: 'Completed', cls: 'text-green-600 hover:text-green-800 border-green-200 hover:bg-green-50' },
              { label: 'Cancelar',  to: 'Cancelled', cls: 'text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50' }],
}

export default function AppointmentsList() {
  const { business, appointments, services, refreshAppointments } = useBusiness()
  const [updating, setUpdating] = useState(null)
  const [filter, setFilter] = useState('all')
  const [editingNotes, setEditingNotes] = useState(null)
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [downloading, setDownloading] = useState(false)

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
          <ListIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 mb-5">Primero debes configurar un negocio</p>
        <Link to="/business" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-all">
          Ir a Mi Negocio
        </Link>
      </div>
    )
  }

  const getServiceName = (id) => services.find((s) => s.id === id)?.name ?? 'Servicio'
  const formatDate = (iso) => new Date(iso).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
  const formatTime = (iso) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  const handleStatusChange = async (id, newStatus) => {
    setUpdating(id)
    try {
      await updateAppointmentStatus(id, business.id, newStatus)
      refreshAppointments()
    } catch {}
    setUpdating(null)
  }

  const startEditNotes = (a) => {
    setEditingNotes(a.id)
    setNotesValue(a.notes ?? '')
  }

  const saveNotes = async (id) => {
    setSavingNotes(true)
    try {
      await updateAppointmentNotes(id, business.id, notesValue)
      refreshAppointments()
      setEditingNotes(null)
    } catch {}
    setSavingNotes(false)
  }

  const handleDownloadCsv = async () => {
    setDownloading(true)
    try {
      const now = new Date()
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      await downloadReportCsv(business.id, from, to)
    } catch {}
    setDownloading(false)
  }

  const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter)
  const sorted = [...filtered].sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))

  const statusBadge = (status) => {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${cfg.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {cfg.label}
      </span>
    )
  }

  const actionButtons = (a) => {
    if (updating === a.id) return <span className="text-xs text-gray-400 animate-pulse">…</span>
    const actions = STATUS_ACTIONS[a.status] ?? []
    if (!actions.length) return null
    return (
      <div className="flex gap-1.5 flex-wrap">
        {actions.map((act) => (
          <button
            key={act.to}
            onClick={() => handleStatusChange(a.id, act.to)}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${act.cls}`}
          >
            {act.label}
          </button>
        ))}
      </div>
    )
  }

  const filters = [
    { key: 'all', label: 'Todas' },
    ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, label: v.label })),
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{appointments.length} registradas</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleDownloadCsv}
            disabled={downloading}
            className="text-sm bg-white border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300 px-3 py-2 rounded-xl font-medium transition-all disabled:opacity-50"
          >
            {downloading ? 'Descargando…' : 'Exportar CSV'}
          </button>
          <button
            onClick={refreshAppointments}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-2 rounded-xl hover:bg-indigo-50 transition-all"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              filter === f.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <InboxIcon className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-500">{filter === 'all' ? 'No hay citas registradas' : 'No hay citas con este estado'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Cliente', 'Servicio', 'Fecha', 'Hora', 'Estado', 'Notas', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sorted.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.customerName}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{getServiceName(a.serviceId)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(a.appointmentDate)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatTime(a.appointmentDate)} — {formatTime(a.endTime)}</td>
                    <td className="px-4 py-3">{statusBadge(a.status)}</td>
                    <td className="px-4 py-3 max-w-[160px]">
                      {editingNotes === a.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            placeholder="Nota interna…"
                            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 w-32 focus:ring-1 focus:ring-indigo-400 outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveNotes(a.id)
                              if (e.key === 'Escape') setEditingNotes(null)
                            }}
                          />
                          <button onClick={() => saveNotes(a.id)} disabled={savingNotes}
                            className="text-xs text-green-600 hover:text-green-800 font-medium">
                            {savingNotes ? '…' : 'OK'}
                          </button>
                          <button onClick={() => setEditingNotes(null)} className="text-gray-400 hover:text-gray-600" aria-label="Cancelar">
                            <XIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditNotes(a)}
                          className="text-xs text-left truncate block w-full max-w-[140px] transition-colors"
                          title={a.notes ?? 'Agregar nota'}
                        >
                          {a.notes
                            ? <span className="italic text-gray-500">{a.notes}</span>
                            : <span className="text-gray-300 group-hover:text-indigo-400">+ nota</span>}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">{actionButtons(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-100">
            {sorted.map((a) => (
              <div key={a.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{a.customerName}</div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">{getServiceName(a.serviceId)} · {a.durationMinutes} min</div>
                  </div>
                  {statusBadge(a.status)}
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  📅 {formatDate(a.appointmentDate)} · {formatTime(a.appointmentDate)}
                </div>

                {a.notes && (
                  <div className="text-xs text-gray-500 italic bg-gray-50 rounded-lg px-3 py-2">
                    "{a.notes}"
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex gap-1.5 flex-wrap">{actionButtons(a)}</div>
                  <button
                    onClick={() => startEditNotes(a)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                  >
                    {a.notes ? 'Editar nota' : '+ nota'}
                  </button>
                </div>

                {editingNotes === a.id && (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Nota interna…"
                      className="flex-1 min-w-0 text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-400 outline-none"
                    />
                    <button onClick={() => saveNotes(a.id)} disabled={savingNotes}
                      className="text-xs text-green-600 font-semibold px-2">{savingNotes ? '…' : 'OK'}</button>
                    <button onClick={() => setEditingNotes(null)} aria-label="Cancelar" className="text-gray-400">
                      <XIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
