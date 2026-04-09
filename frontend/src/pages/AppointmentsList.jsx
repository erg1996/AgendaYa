import { useBusiness } from '../components/BusinessContext'
import { updateAppointmentStatus, updateAppointmentNotes, downloadReportCsv } from '../api/client'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { ListIcon, InboxIcon, XIcon } from '../components/Icons'

const STATUS_CONFIG = {
  Pending: { label: 'Pendiente', bg: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-400' },
  Confirmed: { label: 'Confirmada', bg: 'bg-blue-50 text-blue-700', dot: 'bg-blue-400' },
  Cancelled: { label: 'Cancelada', bg: 'bg-red-50 text-red-600', dot: 'bg-red-400' },
  Completed: { label: 'Completada', bg: 'bg-green-50 text-green-700', dot: 'bg-green-400' },
}

export default function AppointmentsList() {
  const { business, appointments, services, refreshAppointments } = useBusiness()
  const [updating, setUpdating] = useState(null)
  const [filter, setFilter] = useState('all')
  const [editingNotes, setEditingNotes] = useState(null) // appointment id
  const [notesValue, setNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [downloading, setDownloading] = useState(false)

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ListIcon className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Primero debes configurar un negocio</p>
        <Link to="/business" className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Ir a Mi Negocio
        </Link>
      </div>
    )
  }

  const getServiceName = (serviceId) => services.find((s) => s.id === serviceId)?.name ?? 'Servicio'

  const formatDate = (iso) => new Date(iso).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
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
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${cfg.bg}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    )
  }

  const statusActions = (a) => {
    if (updating === a.id) return <span className="text-xs text-gray-400">...</span>
    const actions = []
    if (a.status === 'Pending') {
      actions.push({ label: 'Confirmar', status: 'Confirmed', cls: 'text-blue-600 hover:text-blue-800' })
      actions.push({ label: 'Cancelar', status: 'Cancelled', cls: 'text-red-500 hover:text-red-700' })
    }
    if (a.status === 'Confirmed') {
      actions.push({ label: 'Completar', status: 'Completed', cls: 'text-green-600 hover:text-green-800' })
      actions.push({ label: 'Cancelar', status: 'Cancelled', cls: 'text-red-500 hover:text-red-700' })
    }
    return (
      <div className="flex gap-2">
        {actions.map((act) => (
          <button key={act.status} onClick={() => handleStatusChange(a.id, act.status)} className={`text-xs font-medium ${act.cls}`}>
            {act.label}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Citas</h1>
          <p className="text-gray-500 text-sm">{appointments.length} citas registradas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadCsv}
            disabled={downloading}
            className="text-sm bg-white border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-300 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {downloading ? 'Descargando...' : 'Exportar CSV'}
          </button>
          <button onClick={refreshAppointments} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-2">
            Actualizar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {[{ key: 'all', label: 'Todas' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <InboxIcon className="w-14 h-14 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{filter === 'all' ? 'No hay citas registradas' : 'No hay citas con este estado'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full hidden sm:table">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Cliente</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Servicio</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Fecha</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Hora</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Estado</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Notas</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((a) => (
                <>
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{a.customerName}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{getServiceName(a.serviceId)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatDate(a.appointmentDate)}</td>
                    <td className="px-5 py-3 text-sm text-gray-600">{formatTime(a.appointmentDate)} — {formatTime(a.endTime)}</td>
                    <td className="px-5 py-3">{statusBadge(a.status)}</td>
                    <td className="px-5 py-3">
                      {editingNotes === a.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            placeholder="Agregar nota..."
                            className="text-xs border border-gray-300 rounded px-2 py-1 w-40 focus:ring-1 focus:ring-indigo-400 outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveNotes(a.id)
                              if (e.key === 'Escape') setEditingNotes(null)
                            }}
                          />
                          <button onClick={() => saveNotes(a.id)} disabled={savingNotes}
                            className="text-xs text-green-600 hover:text-green-800 font-medium">
                            {savingNotes ? '...' : 'OK'}
                          </button>
                          <button onClick={() => setEditingNotes(null)} className="text-xs text-gray-400 hover:text-gray-600" aria-label="Cancelar"><XIcon className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditNotes(a)}
                          className="text-xs text-gray-500 hover:text-indigo-600 transition-colors text-left max-w-[150px] truncate block"
                          title={a.notes ?? 'Agregar nota'}
                        >
                          {a.notes ? (
                            <span className="italic">{a.notes}</span>
                          ) : (
                            <span className="text-gray-300 hover:text-indigo-400">+ nota</span>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3">{statusActions(a)}</td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>

          {/* Mobile */}
          <div className="sm:hidden divide-y divide-gray-100">
            {sorted.map((a) => (
              <div key={a.id} className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-800">{a.customerName}</span>
                  {statusBadge(a.status)}
                </div>
                <div className="text-sm text-gray-500">{getServiceName(a.serviceId)} · {a.durationMinutes} min</div>
                <div className="text-sm text-gray-500">{formatDate(a.appointmentDate)} · {formatTime(a.appointmentDate)}</div>
                {a.notes && <div className="text-xs text-gray-400 italic bg-gray-50 rounded px-2 py-1">{a.notes}</div>}
                <div className="flex justify-between items-center pt-1">
                  {statusActions(a)}
                  <button onClick={() => startEditNotes(a)} className="text-xs text-gray-400 hover:text-indigo-600">
                    {a.notes ? 'Editar nota' : '+ nota'}
                  </button>
                </div>
                {editingNotes === a.id && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      autoFocus
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Nota interna..."
                      className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-400 outline-none"
                    />
                    <button onClick={() => saveNotes(a.id)} disabled={savingNotes}
                      className="text-xs text-green-600 font-medium">{savingNotes ? '...' : 'OK'}</button>
                    <button onClick={() => setEditingNotes(null)} aria-label="Cancelar" className="text-xs text-gray-400"><XIcon className="w-3.5 h-3.5" /></button>
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
