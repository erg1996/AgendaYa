import { useState, useEffect } from 'react'
import { useBusiness } from '../components/BusinessContext'
import {
  createBusiness,
  createService,
  deleteService,
  createWorkingHours,
  getWorkingHours,
  updateWorkingHours,
  deleteWorkingHours,
  getBlockedDates,
  createBlockedDate,
  deleteBlockedDate,
  getAllBusinesses,
  updateBusiness,
  updateBusinessWhatsAppTemplate,
  uploadLogo,
} from '../api/client'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function BusinessPanel() {
  const { business, setBusiness, services, refreshServices } = useBusiness()
  const [tab, setTab] = useState('info')
  const [showSwitcher, setShowSwitcher] = useState(false)

  if (!business) {
    return <BusinessSelector onSelected={setBusiness} />
  }

  if (showSwitcher) {
    return <BusinessSelector onSelected={(b) => { setBusiness(b); setShowSwitcher(false) }} currentId={business.id} />
  }

  const tabs = [
    { key: 'info', label: 'Negocio' },
    { key: 'services', label: 'Servicios' },
    { key: 'hours', label: 'Horarios' },
    { key: 'blocked', label: 'Dias Bloqueados' },
    { key: 'whatsapp', label: 'WhatsApp' },
  ]

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-800 break-words flex-1">{business.name}</h1>
        <button
          onClick={() => setShowSwitcher(true)}
          className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap"
        >
          Cambiar negocio
        </button>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && <BusinessInfo business={business} />}
      {tab === 'services' && (
        <ServicesTab
          businessId={business.id}
          services={services}
          onRefresh={refreshServices}
        />
      )}
      {tab === 'hours' && <WorkingHoursTab businessId={business.id} />}
      {tab === 'blocked' && <BlockedDatesTab businessId={business.id} />}
      {tab === 'whatsapp' && <WhatsAppTab business={business} />}
    </div>
  )
}

function BusinessSelector({ onSelected, currentId }) {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    loadBusinesses()
  }, [])

  const loadBusinesses = async () => {
    try {
      const data = await getAllBusinesses()
      setBusinesses(data)
      if (data.length === 0) setShowCreate(true)
    } catch {
      setShowCreate(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <p className="text-center text-gray-400 py-12">Cargando negocios...</p>
  }

  if (showCreate) {
    return (
      <div>
        {businesses.length > 0 && (
          <button
            onClick={() => setShowCreate(false)}
            className="text-sm text-indigo-600 hover:underline mb-4"
          >
            Ver negocios existentes
          </button>
        )}
        <CreateBusinessForm onCreated={(b) => { onSelected(b); loadBusinesses() }} />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Seleccionar Negocio</h1>
      <div className="space-y-2 mb-6">
        {businesses.map((b) => (
          <button
            key={b.id}
            onClick={() => onSelected(b)}
            className={`w-full bg-white border rounded-xl p-4 text-left transition-colors ${
              b.id === currentId
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <span className="font-medium text-gray-800">{b.name}</span>
                <span className="text-gray-400 text-sm ml-2">/{b.slug}</span>
              </div>
              {b.id === currentId && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">Actual</span>
              )}
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={() => setShowCreate(true)}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors text-sm font-medium"
      >
        + Crear nuevo negocio
      </button>
    </div>
  )
}

function CreateBusinessForm({ onCreated }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await createBusiness({ name: name.trim() })
      onCreated(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">Crear Negocio</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nombre del negocio
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Mi Barbería"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full mt-4 bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Creando...' : 'Crear Negocio'}
        </button>
      </form>
    </div>
  )
}

function BusinessInfo({ business }) {
  const { setBusiness } = useBusiness()
  const publicUrl = `${window.location.origin}/book/${business.slug}`
  const [copied, setCopied] = useState(false)
  const [color, setColor] = useState(business.brandColor ?? '#4F46E5')
  const [logoPreview, setLogoPreview] = useState(business.logoUrl ?? null)
  const [logoFile, setLogoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState({ type: '', text: '' })

  const getLogoUrl = (url) => {
    if (!url) return null
    if (url.startsWith('http')) return url
    return `${import.meta.env.VITE_API_URL ?? ''}${url}`
  }

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSaveBranding = async () => {
    setSaving(true)
    setSaveMsg({ type: '', text: '' })
    try {
      let logoUrl = business.logoUrl ?? null
      if (logoFile) {
        const uploaded = await uploadLogo(logoFile)
        logoUrl = uploaded.url
      }
      const updated = await updateBusiness(business.id, {
        name: business.name,
        brandColor: color,
        logoUrl,
      })
      setBusiness(updated)
      setSaveMsg({ type: 'success', text: 'Personalización guardada' })
    } catch (err) {
      setSaveMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Public booking link */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
        <h2 className="font-semibold text-indigo-800 mb-2">Link de Reserva para Clientes</h2>
        <p className="text-indigo-600 text-sm mb-3">
          Comparte este link para que tus clientes agenden citas:
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={publicUrl}
            readOnly
            className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm text-gray-700 font-mono"
          />
          <button
            onClick={copyLink}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              copied ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm sm:text-base">Personalización</h2>
        <div className="space-y-6 sm:space-y-0 sm:flex sm:gap-6 sm:items-start sm:flex-wrap">
          {/* Logo */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Logo</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img src={getLogoUrl(logoPreview)} alt="Logo" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-gray-200" />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                  Logo
                </div>
              )}
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors">
                {logoPreview ? 'Cambiar' : 'Subir logo'}
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              </label>
            </div>
          </div>
          {/* Color */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Color de marca</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-9 sm:w-12 sm:h-10 rounded-lg border border-gray-300 cursor-pointer p-1"
              />
              <span className="text-xs sm:text-sm font-mono text-gray-600">{color}</span>
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-gray-200"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        </div>
        {saveMsg.text && (
          <p className={`text-sm mt-3 ${saveMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {saveMsg.text}
          </p>
        )}
        <button
          onClick={handleSaveBranding}
          disabled={saving}
          className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar personalización'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Información del Negocio</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">ID</span>
            <span className="font-mono text-gray-700 text-xs">{business.id}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Nombre</span>
            <span className="text-gray-800 font-medium">{business.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Slug</span>
            <span className="font-mono text-gray-700">{business.slug}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Creado</span>
            <span className="text-gray-700">
              {new Date(business.createdAt).toLocaleDateString('es')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ServicesTab({ businessId, services, onRefresh }) {
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(30)
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await createService({
        businessId,
        name: name.trim(),
        durationMinutes: Number(duration),
        price: price !== '' ? Number(price) : null,
      })
      setName('')
      setDuration(30)
      setPrice('')
      onRefresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Agregar Servicio</h2>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Corte de cabello"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="5"
              step="5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="w-28">
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio (opt)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : 'Agregar'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">
          Servicios ({services.length})
        </h2>
        {services.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay servicios registrados</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3">
                <span className="font-medium text-gray-800">{s.name}</span>
                <div className="flex items-center gap-2">
                  {s.price != null && (
                    <span className="text-sm text-green-700 font-medium">
                      ${Number(s.price).toLocaleString('es', { minimumFractionDigits: 0 })}
                    </span>
                  )}
                  <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                    {s.durationMinutes} min
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function WorkingHoursTab({ businessId }) {
  const [day, setDay] = useState(1)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [hours, setHours] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  useEffect(() => {
    loadHours()
  }, [businessId])

  const loadHours = async () => {
    try {
      const data = await getWorkingHours(businessId)
      setHours(data)
    } catch {}
  }

  const formatTime = (ts) => {
    // ts comes as "HH:mm:ss" or similar
    const parts = ts.split(':')
    return `${parts[0]}:${parts[1]}`
  }

  const usedDays = hours.map((h) => h.dayOfWeek)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      await createWorkingHours({
        businessId,
        dayOfWeek: Number(day),
        startTime: `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`,
        endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`,
      })
      setMessage({ type: 'success', text: `Horario de ${DAY_NAMES[day]} guardado` })
      loadHours()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id, dayOfWeek) => {
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const [sh, sm] = editStart.split(':').map(Number)
      const [eh, em] = editEnd.split(':').map(Number)
      await updateWorkingHours(id, {
        businessId,
        dayOfWeek,
        startTime: `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`,
        endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`,
      })
      setEditingId(null)
      setMessage({ type: 'success', text: 'Horario actualizado' })
      loadHours()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteWorkingHours(id)
      loadHours()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const startEdit = (h) => {
    setEditingId(h.id)
    setEditStart(formatTime(h.startTime))
    setEditEnd(formatTime(h.endTime))
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Agregar Horario Laboral</h2>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end flex-wrap">
          <div className="w-44">
            <label className="block text-sm font-medium text-gray-700 mb-1">Día</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {DAY_NAMES.map((name, i) => (
                <option key={i} value={i} disabled={usedDays.includes(i)}>
                  {name} {usedDays.includes(i) ? '(ya configurado)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Apertura</label>
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cierre</label>
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || usedDays.includes(Number(day))}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : 'Agregar'}
          </button>
        </form>
        {message.text && (
          <p className={`text-sm mt-3 ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Horarios Configurados ({hours.length})</h2>
        {hours.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay horarios configurados</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {hours.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-3">
                <span className="font-medium text-gray-800 w-28">{DAY_NAMES[h.dayOfWeek]}</span>
                {editingId === h.id ? (
                  <div className="flex items-center gap-2">
                    <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm" />
                    <span className="text-gray-400">—</span>
                    <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm" />
                    <button onClick={() => handleUpdate(h.id, h.dayOfWeek)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium">Guardar</button>
                    <button onClick={() => setEditingId(null)}
                      className="text-gray-400 hover:text-gray-600 text-sm">Cancelar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {formatTime(h.startTime)} — {formatTime(h.endTime)}
                    </span>
                    <button onClick={() => startEdit(h)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Editar</button>
                    <button onClick={() => handleDelete(h.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium">Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const DEFAULT_TEMPLATE = `Hola {cliente} 👋

Te recordamos tu cita en *{negocio}* mañana:

📅 {fecha}
🕐 {hora}
💈 {servicio}

Si necesitas cancelar o cambiar tu cita, por favor contáctanos.

¡Te esperamos!`

function WhatsAppTab({ business }) {
  const { setBusiness } = useBusiness()
  const [template, setTemplate] = useState(business.whatsAppReminderTemplate ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const previewText = (template || DEFAULT_TEMPLATE)
    .replace('{cliente}', 'María García')
    .replace('{negocio}', business.name)
    .replace('{servicio}', 'Corte de cabello')
    .replace('{fecha}', 'lunes 14 de abril')
    .replace('{hora}', '10:00 AM')

  const handleSave = async () => {
    setSaving(true)
    setMessage({ type: '', text: '' })
    try {
      const updated = await updateBusinessWhatsAppTemplate(business.id, template.trim() || null)
      setBusiness(updated)
      setMessage({ type: 'success', text: 'Mensaje de WhatsApp guardado' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
        <h2 className="font-semibold text-gray-800 mb-1">Mensaje de recordatorio</h2>
        <p className="text-sm text-gray-500 mb-4">
          Este mensaje se enviará a tus clientes desde la sección{' '}
          <span className="font-medium text-gray-700">Recordatorios</span>.
          Usa los siguientes marcadores que se reemplazan automáticamente:
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {['{cliente}', '{negocio}', '{servicio}', '{fecha}', '{hora}'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTemplate((t) => t + p)}
              className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-mono hover:bg-indigo-100 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={10}
          placeholder={DEFAULT_TEMPLATE}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
        />

        <p className="text-xs text-gray-400 mt-1">
          Si dejas el campo vacío se usará el mensaje predeterminado.
        </p>

        {message.text && (
          <p className={`text-sm mt-2 ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar mensaje'}
          </button>
          <button
            type="button"
            onClick={() => setTemplate('')}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Restablecer predeterminado
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
        <h2 className="font-semibold text-gray-800 mb-3">Vista previa</h2>
        <div className="bg-[#ECE5DD] rounded-xl p-4 max-w-sm">
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
            {previewText}
          </div>
          <p className="text-right text-[10px] text-gray-400 mt-1">10:00 AM ✓✓</p>
        </div>
      </div>
    </div>
  )
}

function BlockedDatesTab({ businessId }) {
  const [dates, setDates] = useState([])
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadDates()
  }, [businessId])

  const loadDates = async () => {
    try {
      const data = await getBlockedDates(businessId)
      setDates(data)
    } catch {}
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!date) return
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await createBlockedDate({ businessId, date, reason: reason.trim() })
      setDate('')
      setReason('')
      setMessage({ type: 'success', text: 'Fecha bloqueada' })
      loadDates()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteBlockedDate(id, businessId)
      loadDates()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-2">Bloquear Fecha</h2>
        <p className="text-sm text-gray-500 mb-4">Bloquea días feriados o cuando no hay servicio. No se mostrarán slots disponibles.</p>
        <form onSubmit={handleSubmit} className="flex gap-3 items-end flex-wrap">
          <div className="w-44">
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Día feriado, Vacaciones..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !date}
            className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '...' : 'Bloquear'}
          </button>
        </form>
        {message.text && (
          <p className={`text-sm mt-3 ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Fechas Bloqueadas ({dates.length})</h2>
        {dates.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay fechas bloqueadas</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {dates.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <span className="font-medium text-gray-800">
                    {new Date(d.date).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  {d.reason && <span className="text-gray-400 text-sm ml-2">— {d.reason}</span>}
                </div>
                <button onClick={() => handleDelete(d.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium">Eliminar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
