import { useState, useEffect } from 'react'
import { useBusiness } from '../components/BusinessContext'
import {
  createBusiness,
  createService,
  deleteService,
  getBlockedDates,
  createBlockedDate,
  deleteBlockedDate,
  getAllBusinesses,
  updateBusiness,
  updateBusinessWhatsAppTemplate,
  updateBusinessLocation,
  clearBusinessLocation,
  uploadLogo,
  pingWhatsAppService,
  getWhatsAppSession,
  startWhatsAppSession,
  disconnectWhatsAppSession,
  updateWhatsAppSessionSettings,
  getWhatsAppQrBlobUrl,
  sendWhatsAppTestMessage,
  getEmployees,
  createEmployee,
  updateEmployee,
  uploadEmployeeAvatar,
  getEmployeeWorkingHours,
  addEmployeeWorkingHours,
  updateEmployeeWorkingHours,
  deleteEmployeeWorkingHours,
} from '../api/client'
import LocationPicker from '../components/LocationPicker'

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function BusinessPanel() {
  const { business, setBusiness, services, refreshServices } = useBusiness()
  const [tab, setTab] = useState('info')
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [autoWhatsAppEnabled, setAutoWhatsAppEnabled] = useState(false)

  useEffect(() => {
    // Probe: show Automatización tab only if backend feature flag is on
    pingWhatsAppService()
      .then((res) => setAutoWhatsAppEnabled(res !== null))
      .catch(() => setAutoWhatsAppEnabled(false))
  }, [])

  if (!business) {
    return <BusinessSelector onSelected={setBusiness} />
  }

  if (showSwitcher) {
    return <BusinessSelector onSelected={(b) => { setBusiness(b); setShowSwitcher(false) }} currentId={business.id} />
  }

  const tabs = [
    { key: 'info', label: 'Negocio' },
    { key: 'services', label: 'Servicios' },
    { key: 'team', label: 'Equipo' },
    { key: 'blocked', label: 'Dias Bloqueados' },
    { key: 'whatsapp', label: 'WhatsApp' },
    ...(autoWhatsAppEnabled ? [{ key: 'whatsappAuto', label: 'Automatización WA' }] : []),
    { key: 'location', label: 'Ubicación' },
    { key: 'notifications', label: 'Notificaciones' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 break-words">{business.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configuración del negocio</p>
        </div>
        <button
          onClick={() => setShowSwitcher(true)}
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium whitespace-nowrap px-4 py-2 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-all"
        >
          Cambiar negocio
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
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
      {tab === 'team' && <EmployeesTab businessId={business.id} services={services} />}
      {tab === 'blocked' && <BlockedDatesTab businessId={business.id} />}
      {tab === 'whatsapp' && <WhatsAppTab business={business} />}
      {tab === 'whatsappAuto' && <WhatsAppAutoTab />}
      {tab === 'location' && <LocationTab business={business} />}
      {tab === 'notifications' && <NotificationsTab business={business} />}
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
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5">
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
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
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
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-gray-300 cursor-pointer p-1"
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

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
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

function EmployeesTab({ businessId, services }) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadEmployees() }, [businessId])

  const loadEmployees = async () => {
    try {
      const data = await getEmployees(businessId, true)
      setEmployees(data)
    } catch {} finally {
      setLoading(false)
    }
  }

  if (loading) return <p className="text-center text-gray-400 py-12">Cargando equipo...</p>

  return (
    <div className="space-y-4">
      {employees.map((emp) => (
        <EmployeeCard
          key={emp.id}
          employee={emp}
          businessId={businessId}
          services={services}
          expanded={expandedId === emp.id}
          onToggle={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
          onRefresh={loadEmployees}
        />
      ))}

      {showCreate ? (
        <CreateEmployeeForm
          businessId={businessId}
          onCreated={() => { setShowCreate(false); loadEmployees() }}
          onCancel={() => setShowCreate(false)}
        />
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors text-sm font-medium"
        >
          + Agregar empleado
        </button>
      )}
    </div>
  )
}

function EmployeeAvatar({ avatarUrl, color, name, size = 'md' }) {
  const sz = size === 'lg' ? 'w-16 h-16 text-xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sz} rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm`}
      />
    )
  }
  return (
    <div
      className={`${sz} rounded-full flex-shrink-0 flex items-center justify-center font-semibold text-white`}
      style={{ backgroundColor: color ?? '#6366f1' }}
    >
      {name?.charAt(0)?.toUpperCase() ?? '?'}
    </div>
  )
}

function EmployeeCard({ employee: emp, businessId, services, expanded, onToggle, onRefresh }) {
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(emp.name)
  const [color, setColor] = useState(emp.color ?? '#6366f1')
  const [isActive, setIsActive] = useState(emp.isActive)
  const [commissionPercent, setCommissionPercent] = useState(emp.commissionPercent ?? 100)
  const [specialization, setSpecialization] = useState(emp.specialization ?? '')
  const [avatarUrl, setAvatarUrl] = useState(emp.avatarUrl ?? null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [empServices, setEmpServices] = useState(
    emp.services.map((s) => ({ serviceId: s.serviceId, overridePrice: s.overridePrice ?? '', overrideDurationMinutes: s.overrideDurationMinutes ?? '' }))
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const toggleService = (svcId) => {
    setEmpServices((prev) =>
      prev.some((s) => s.serviceId === svcId)
        ? prev.filter((s) => s.serviceId !== svcId)
        : [...prev, { serviceId: svcId, overridePrice: '', overrideDurationMinutes: '' }]
    )
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    setMsg({ type: '', text: '' })
    try {
      const { url } = await uploadEmployeeAvatar(file)
      setAvatarUrl(url)
    } catch (err) {
      setMsg({ type: 'error', text: `Foto: ${err.message}` })
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg({ type: '', text: '' })
    try {
      await updateEmployee(emp.id, businessId, {
        name: name.trim(),
        color,
        isActive,
        displayOrder: emp.displayOrder,
        commissionPercent: Number(commissionPercent),
        specialization: specialization.trim() || null,
        avatarUrl,
        services: empServices.map((s) => ({
          serviceId: s.serviceId,
          overridePrice: s.overridePrice !== '' ? Number(s.overridePrice) : null,
          overrideDurationMinutes: s.overrideDurationMinutes !== '' ? Number(s.overrideDurationMinutes) : null,
        })),
      })
      setMsg({ type: 'success', text: 'Guardado' })
      setEditMode(false)
      onRefresh()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <EmployeeAvatar avatarUrl={emp.avatarUrl} color={emp.color} name={emp.name} />
          <div>
            <span className="font-medium text-gray-900">{emp.name}</span>
            {!emp.isActive && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactivo</span>
            )}
            {emp.specialization && (
              <p className="text-xs text-indigo-500 font-medium mt-0.5">{emp.specialization}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">
              {emp.services.length === 0 ? 'Sin servicios' : emp.services.map((s) => s.serviceName).join(', ')}
            </p>
          </div>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-5">
          {editMode ? (
            <div className="space-y-4">
              {/* Avatar upload */}
              <div className="flex items-center gap-4">
                <EmployeeAvatar avatarUrl={avatarUrl} color={color} name={name} size="lg" />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Foto de perfil</label>
                  <label className={`cursor-pointer inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    avatarUploading
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                  }`}>
                    {avatarUploading ? 'Subiendo...' : 'Subir foto'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={avatarUploading}
                      onChange={handleAvatarChange}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      onClick={() => setAvatarUrl(null)}
                      className="ml-2 text-xs text-red-400 hover:text-red-600 transition-colors"
                    >
                      Quitar foto
                    </button>
                  )}
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG o WebP — máx. 2 MB</p>
                </div>
              </div>

              <div className="flex gap-4 flex-wrap items-end">
                <div className="flex-1 min-w-[160px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-1" />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Comisión %</label>
                  <input
                    type="number" min="0" max="100" step="1"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded" />
                  <span className="text-sm text-gray-700">Activo</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Especialización <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="Ej: Colorista, Masaje deportivo, Barbería clásica…"
                  maxLength={500}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Servicios que ofrece</p>
                <div className="space-y-2">
                  {services.map((svc) => {
                    const linked = empServices.find((s) => s.serviceId === svc.id)
                    return (
                      <div key={svc.id} className="flex items-center gap-3 flex-wrap">
                        <label className="flex items-center gap-2 cursor-pointer min-w-[180px]">
                          <input type="checkbox" checked={!!linked}
                            onChange={() => toggleService(svc.id)}
                            className="w-4 h-4 text-indigo-600 rounded" />
                          <span className="text-sm text-gray-800">{svc.name}</span>
                          <span className="text-xs text-gray-400">{svc.durationMinutes}min</span>
                        </label>
                        {linked && (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">Precio:</span>
                              <input
                                type="number" placeholder={svc.price ?? '—'} min="0" step="0.01"
                                value={linked.overridePrice}
                                onChange={(e) => setEmpServices((prev) =>
                                  prev.map((s) => s.serviceId === svc.id ? { ...s, overridePrice: e.target.value } : s)
                                )}
                                className="w-20 border border-gray-200 rounded px-2 py-1 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-400">Duración:</span>
                              <input
                                type="number" placeholder={svc.durationMinutes} min="5" step="5"
                                value={linked.overrideDurationMinutes}
                                onChange={(e) => setEmpServices((prev) =>
                                  prev.map((s) => s.serviceId === svc.id ? { ...s, overrideDurationMinutes: e.target.value } : s)
                                )}
                                className="w-16 border border-gray-200 rounded px-2 py-1 text-xs"
                              />
                              <span className="text-xs text-gray-400">min</span>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {msg.text && (
                <p className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>
              )}
              <div className="flex gap-3">
                <button onClick={handleSave} disabled={saving || avatarUploading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button onClick={() => { setEditMode(false); setMsg({ type: '', text: '' }) }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {emp.specialization && (
                <p className="text-sm text-gray-600 italic">"{emp.specialization}"</p>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Comisión:</span> {emp.commissionPercent}%
                </div>
                <button onClick={() => setEditMode(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                  Editar información
                </button>
              </div>
            </div>
          )}

          <EmployeeWorkingHours employeeId={emp.id} businessId={businessId} />
        </div>
      )}
    </div>
  )
}

function EmployeeWorkingHours({ employeeId, businessId }) {
  const [hours, setHours] = useState([])
  const [day, setDay] = useState(1)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [editingId, setEditingId] = useState(null)
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => { loadHours() }, [employeeId])

  const loadHours = async () => {
    try {
      const data = await getEmployeeWorkingHours(employeeId, businessId)
      setHours(data)
    } catch {}
  }

  const fmtTime = (ts) => { const p = ts.split(':'); return `${p[0]}:${p[1]}` }
  const toTimeStr = (t) => { const [h, m] = t.split(':').map(Number); return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00` }

  const handleAdd = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg({ type: '', text: '' })
    try {
      await addEmployeeWorkingHours(employeeId, businessId, {
        employeeId,
        dayOfWeek: Number(day),
        startTime: toTimeStr(start),
        endTime: toTimeStr(end),
      })
      setMsg({ type: 'success', text: `Horario de ${DAY_NAMES[day]} agregado` })
      loadHours()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (wh) => {
    setLoading(true)
    setMsg({ type: '', text: '' })
    try {
      await updateEmployeeWorkingHours(employeeId, wh.id, businessId, {
        employeeId,
        dayOfWeek: wh.dayOfWeek,
        startTime: toTimeStr(editStart),
        endTime: toTimeStr(editEnd),
      })
      setEditingId(null)
      setMsg({ type: 'success', text: 'Horario actualizado' })
      loadHours()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteEmployeeWorkingHours(employeeId, id, businessId)
      loadHours()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  return (
    <div className="border-t border-gray-100 pt-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Horarios laborales</h3>

      {hours.length > 0 && (
        <div className="divide-y divide-gray-100 mb-3">
          {hours.map((h) => (
            <div key={h.id} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700 w-24">{DAY_NAMES[h.dayOfWeek]}</span>
              {editingId === h.id ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm" />
                  <span className="text-gray-400">—</span>
                  <input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm" />
                  <button onClick={() => handleUpdate(h)} className="text-green-600 hover:text-green-800 text-xs font-medium">Guardar</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancelar</button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{fmtTime(h.startTime)} — {fmtTime(h.endTime)}</span>
                  <button onClick={() => { setEditingId(h.id); setEditStart(fmtTime(h.startTime)); setEditEnd(fmtTime(h.endTime)) }}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Editar</button>
                  <button onClick={() => handleDelete(h.id)}
                    className="text-red-500 hover:text-red-700 text-xs font-medium">Eliminar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 items-end flex-wrap">
        <div className="w-36">
          <select value={day} onChange={(e) => setDay(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            {DAY_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
          </select>
        </div>
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
        <button type="submit" disabled={loading}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          + Agregar
        </button>
      </form>

      {msg.text && (
        <p className={`text-xs mt-2 ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>
      )}
    </div>
  )
}

function CreateEmployeeForm({ businessId, onCreated, onCancel }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await createEmployee({ businessId, name: name.trim(), color })
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border-2 border-indigo-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-3">Nuevo empleado</h3>
      <form onSubmit={handleSubmit} className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: María López"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-1" />
        </div>
        <button type="submit" disabled={loading || !name.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {loading ? 'Creando...' : 'Crear'}
        </button>
        <button type="button" onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors py-2">
          Cancelar
        </button>
      </form>
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
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
  const [template, setTemplate] = useState(business.whatsAppReminderTemplate ?? DEFAULT_TEMPLATE)
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

function LocationTab({ business }) {
  const { setBusiness } = useBusiness()
  const [pending, setPending] = useState(null) // { lat, lng, address }
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const hasLocation = business.latitude != null && business.longitude != null

  const handleChange = (lat, lng, address) => {
    setPending({ lat, lng, address })
    setMsg({ type: '', text: '' })
  }

  const handleSave = async () => {
    if (!pending) return
    setSaving(true)
    setMsg({ type: '', text: '' })
    try {
      const updated = await updateBusinessLocation(business.id, {
        latitude: pending.lat,
        longitude: pending.lng,
        address: pending.address,
      })
      setBusiness(updated)
      setPending(null)
      setMsg({ type: 'success', text: 'Ubicación guardada' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleClear = async () => {
    setSaving(true)
    setMsg({ type: '', text: '' })
    try {
      const updated = await clearBusinessLocation(business.id)
      setBusiness(updated)
      setPending(null)
      setMsg({ type: 'success', text: 'Ubicación eliminada' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-semibold text-gray-800">Ubicación del negocio</h2>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Opcional</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Tus clientes verán un mapa y un botón "Cómo llegar" en la página de reservas.
        </p>

        <LocationPicker
          initialLat={business.latitude}
          initialLng={business.longitude}
          initialAddress={business.address}
          onChange={handleChange}
        />

        {msg.text && (
          <p className={`text-sm mt-3 ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {msg.text}
          </p>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || !pending}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar ubicación'}
          </button>
          {hasLocation && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              Quitar ubicación
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Status ints come from WhatsAppSessionStatus enum on backend
const WA_STATUS = {
  Disconnected: 0,
  Starting: 1,
  WaitingQr: 2,
  Connected: 3,
  Failed: 4,
}

const TZ_OPTIONS = [
  { value: 'America/El_Salvador', label: 'El Salvador (UTC-6)' },
  { value: 'America/Guatemala',   label: 'Guatemala (UTC-6)' },
  { value: 'America/Costa_Rica',  label: 'Costa Rica (UTC-6)' },
  { value: 'America/Tegucigalpa', label: 'Honduras (UTC-6)' },
  { value: 'America/Managua',     label: 'Nicaragua (UTC-6)' },
  { value: 'America/Panama',      label: 'Panamá (UTC-5)' },
  { value: 'America/Bogota',      label: 'Colombia (UTC-5)' },
  { value: 'America/Lima',        label: 'Perú (UTC-5)' },
  { value: 'America/Mexico_City', label: 'México Ciudad (UTC-6)' },
  { value: 'America/Caracas',     label: 'Venezuela (UTC-4)' },
  { value: 'America/Sao_Paulo',   label: 'Brasil (UTC-3)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (UTC-3)' },
  { value: 'America/Santiago',    label: 'Chile (UTC-3/-4)' },
  { value: 'UTC',                 label: 'UTC' },
]

function WarmUpUsage({ session }) {
  const { firstConnectedAt, dailySentCount } = session
  const sent = dailySentCount ?? 0

  // Compute tier limit based on days since first connection
  const daysSince = firstConnectedAt
    ? Math.floor((Date.now() - new Date(firstConnectedAt).getTime()) / 86400000)
    : 999
  const inWarmUp = daysSince < 14
  const limit = daysSince <= 3 ? 10 : daysSince <= 7 ? 20 : daysSince < 14 ? 50 : 200
  const pct = Math.min(100, Math.round((sent / limit) * 100))
  const nearLimit = pct >= 80
  const atLimit = pct >= 100

  const barColor = atLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-500' : 'bg-green-500'
  const cardColor = atLimit
    ? 'bg-red-50 border-red-200 text-red-800'
    : nearLimit
    ? 'bg-amber-50 border-amber-200 text-amber-800'
    : 'bg-gray-50 border-gray-200 text-gray-700'

  return (
    <div className={`rounded-xl border px-4 py-3 text-xs ${cardColor}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold">
          {inWarmUp
            ? `Calentando — día ${daysSince + 1} de 14`
            : 'Uso de hoy'}
        </span>
        <span className="font-semibold tabular-nums">
          {sent} / {limit} mensajes
        </span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-black/10 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>

      {atLimit && (
        <p className="mt-1.5 font-medium">
          Límite diario alcanzado. Los mensajes se enviarán mañana.
        </p>
      )}
      {!atLimit && nearLimit && (
        <p className="mt-1.5">
          Te quedan solo {limit - sent} mensaje{limit - sent !== 1 ? 's' : ''} hoy.
        </p>
      )}
      {inWarmUp && !atLimit && !nearLimit && (
        <p className="mt-1.5 opacity-75">
          Límite sube en {14 - daysSince} día{14 - daysSince !== 1 ? 's' : ''} · envío pleno: 200/día
        </p>
      )}
    </div>
  )
}

function translateWaError(msg) {
  if (!msg) return 'Error desconocido'
  const m = msg.toLowerCase()
  if (m.includes('whatsapp-service unreachable') || m.includes('502'))
    return 'No se pudo conectar con el servicio de WhatsApp. Verifica que el servicio esté activo.'
  if (m.includes('session_not_connected') || m.includes('not_connected') || m.includes('not connected'))
    return 'La sesión de WhatsApp no está conectada. Reconéctala desde este panel.'
  if (m.includes('send_failed') || m.includes('send failed'))
    return 'No se pudo enviar el mensaje. Verifica que la sesión esté activa e inténtalo de nuevo.'
  if (m.includes('invalid_phone') || m.includes('invalid phone'))
    return 'Número inválido. Ingresa un número de El Salvador (8 dígitos) o con código +503.'
  if (m.includes('to required'))
    return 'Ingresa un número de teléfono.'
  if (m.includes('failed to fetch') || m.includes('fetch failed') || m.includes('load failed') || m.includes('networkerror') || m.includes('network error'))
    return 'Error de conexión. Verifica tu internet e intenta de nuevo.'
  if (m.includes('session expired'))
    return 'Tu sesión expiró. Inicia sesión de nuevo.'
  if (m.includes('forbidden') || m.includes('403'))
    return 'No tienes permiso para realizar esta acción.'
  if (m.includes('not found') || m.includes('404'))
    return 'Función no disponible. Verifica que el servicio de WhatsApp esté habilitado.'
  if (m.includes('already') || m.includes('conflict'))
    return 'Ya existe una sesión activa para este negocio.'
  return msg
}

function WhatsAppAutoTab() {
  const [session, setSession] = useState(null)
  const [qrUrl, setQrUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [countdown, setCountdown] = useState(null)
  const [testTo, setTestTo] = useState('')
  const [testSending, setTestSending] = useState(false)

  const loadSession = async () => {
    try {
      const data = await getWhatsAppSession()
      setSession(data)
    } catch (err) {
      setMsg({ type: 'error', text: translateWaError(err.message) })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSession() }, [])

  // Poll every 2s while transient
  useEffect(() => {
    if (!session) return
    if (session.status !== WA_STATUS.Starting && session.status !== WA_STATUS.WaitingQr) return
    const id = setInterval(loadSession, 2000)
    return () => clearInterval(id)
  }, [session?.status])

  // Refresh QR blob when entering WaitingQr or when lastQrGeneratedAt changes
  useEffect(() => {
    let revoked = null
    if (session?.status === WA_STATUS.WaitingQr) {
      getWhatsAppQrBlobUrl().then((url) => {
        if (!url) return
        setQrUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        revoked = url
      })
    } else {
      setQrUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
    }
    return () => { if (revoked) URL.revokeObjectURL(revoked) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?.lastQrGeneratedAt])

  // 90s countdown from lastQrGeneratedAt
  useEffect(() => {
    if (session?.status !== WA_STATUS.WaitingQr || !session.lastQrGeneratedAt) {
      setCountdown(null)
      return
    }
    const expiresAt = new Date(session.lastQrGeneratedAt).getTime() + 90_000
    const tick = () => setCountdown(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.lastQrGeneratedAt, session?.status])

  const handleStart = async () => {
    setWorking(true)
    setMsg({ type: '', text: '' })
    try {
      const data = await startWhatsAppSession()
      setSession(data)
    } catch (err) {
      setMsg({ type: 'error', text: translateWaError(err.message) })
    } finally {
      setWorking(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Esto cerrará la sesión de WhatsApp. Tendrás que volver a escanear el QR para reconectar. ¿Continuar?')) return
    setWorking(true)
    setMsg({ type: '', text: '' })
    try {
      await disconnectWhatsAppSession()
      setSession({ status: WA_STATUS.Disconnected, autoRemindersEnabled: false, phoneNumber: null, lastConnectedAt: null, lastQrGeneratedAt: null, lastError: null })
    } catch (err) {
      setMsg({ type: 'error', text: translateWaError(err.message) })
    } finally {
      setWorking(false)
    }
  }

  const handleSendTest = async (e) => {
    e.preventDefault()
    if (!testTo.trim()) return
    setTestSending(true)
    setMsg({ type: '', text: '' })
    try {
      await sendWhatsAppTestMessage(testTo.trim(), 'Mensaje de prueba desde AgendaYa ✅')
      setMsg({ type: 'success', text: `Mensaje de prueba enviado a ${testTo.trim()}` })
      setTestTo('')
    } catch (err) {
      setMsg({ type: 'error', text: translateWaError(err.message) })
    } finally {
      setTestSending(false)
    }
  }

  const handleToggleAuto = async (next, tz) => {
    setWorking(true)
    setMsg({ type: '', text: '' })
    try {
      const data = await updateWhatsAppSessionSettings(next, tz)
      setSession(data)
      setMsg({ type: 'success', text: tz ? 'Zona horaria guardada' : next ? 'Recordatorios automáticos activados' : 'Recordatorios automáticos desactivados' })
    } catch (err) {
      setMsg({ type: 'error', text: translateWaError(err.message) })
    } finally {
      setWorking(false)
    }
  }

  if (loading) {
    return <p className="text-center text-gray-400 py-12">Cargando estado de WhatsApp...</p>
  }

  const status = session?.status ?? WA_STATUS.Disconnected

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Vincular WhatsApp</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Conecta tu número para que AgendaYa envíe recordatorios automáticos.
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        {status === WA_STATUS.Disconnected && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Al vincular, aceptas que el uso no-oficial de WhatsApp puede resultar en la suspensión de tu número.
              AgendaYa implementa buenas prácticas (delays, personalización) pero no garantiza inmunidad.
              Úsalo solo para comunicación legítima con clientes que hayan aceptado recibir mensajes.
            </p>
            <button
              onClick={handleStart}
              disabled={working}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {working ? 'Iniciando...' : 'Vincular WhatsApp'}
            </button>
          </div>
        )}

        {status === WA_STATUS.Starting && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 py-2">Iniciando sesión, generando código QR...</p>
            <button
              onClick={handleDisconnect}
              disabled={working}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        )}

        {status === WA_STATUS.WaitingQr && (
          <div className="flex flex-col items-center gap-3">
            {qrUrl ? (
              <img src={qrUrl} alt="QR de WhatsApp" className="w-64 h-64 border border-gray-200 rounded-lg" />
            ) : (
              <div className="w-64 h-64 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                Generando QR...
              </div>
            )}
            <div className="text-center max-w-sm">
              <p className="text-sm font-medium text-gray-800">Escanea el QR con tu WhatsApp</p>
              <p className="text-xs text-gray-500 mt-1">
                Abre WhatsApp en tu celular → Ajustes → Dispositivos vinculados → Vincular dispositivo.
              </p>
              {countdown != null && (
                <p className="text-xs text-gray-400 mt-2">
                  {countdown > 0 ? `Expira en ${countdown}s` : 'QR expirado, genera uno nuevo'}
                </p>
              )}
            </div>
            <button
              onClick={handleDisconnect}
              disabled={working}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {status === WA_STATUS.Connected && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-900">
                ✓ Conectado{session.phoneNumber ? ` como +${session.phoneNumber}` : ''}
              </p>
              {session.lastConnectedAt && (
                <p className="text-xs text-green-700 mt-1">
                  Vinculado el {new Date(session.lastConnectedAt).toLocaleString('es')}
                </p>
              )}
            </div>

            <WarmUpUsage session={session} />

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!session.autoRemindersEnabled}
                disabled={working}
                onChange={(e) => handleToggleAuto(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <span className="text-sm text-gray-800">
                Enviar recordatorios automáticos a clientes con opt-in
              </span>
            </label>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">Zona horaria:</label>
              <select
                value={session.timeZoneId ?? 'America/El_Salvador'}
                disabled={working}
                onChange={(e) => handleToggleAuto(session.autoRemindersEnabled, e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-400"
              >
                {TZ_OPTIONS.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleSendTest} className="flex items-center gap-2 pt-1">
              <input
                type="tel"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="50378901234 (número completo)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
              <button
                type="submit"
                disabled={testSending || !testTo.trim()}
                className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                {testSending ? 'Enviando...' : 'Probar envío'}
              </button>
            </form>

            <button
              onClick={handleDisconnect}
              disabled={working}
              className="text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              {working ? '...' : 'Desvincular WhatsApp'}
            </button>
          </div>
        )}

        {status === WA_STATUS.Failed && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {translateWaError(session.lastError)}
            </div>
            <button
              onClick={handleStart}
              disabled={working}
              className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {working ? 'Reintentando...' : 'Reintentar'}
            </button>
          </div>
        )}

        {msg.text && (
          <p className={`text-sm mt-3 ${msg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
            {msg.text}
          </p>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    [WA_STATUS.Disconnected]: { text: 'Desconectado', cls: 'bg-gray-100 text-gray-600' },
    [WA_STATUS.Starting]: { text: 'Iniciando', cls: 'bg-blue-100 text-blue-700' },
    [WA_STATUS.WaitingQr]: { text: 'Esperando QR', cls: 'bg-amber-100 text-amber-700' },
    [WA_STATUS.Connected]: { text: 'Conectado', cls: 'bg-green-100 text-green-700' },
    [WA_STATUS.Failed]: { text: 'Error', cls: 'bg-red-100 text-red-700' },
  }
  const { text, cls } = map[status] ?? map[WA_STATUS.Disconnected]
  return <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${cls}`}>{text}</span>
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

function NotificationsTab({ business }) {
  const { setBusiness } = useBusiness()
  const [notifyEmail, setNotifyEmail] = useState(business.ownerNotifyEmail ?? true)
  const [notifyWa, setNotifyWa] = useState(business.ownerNotifyWhatsApp ?? false)
  const [phone, setPhone] = useState(business.ownerNotifyPhone ?? '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const handleSave = async () => {
    setSaving(true)
    setMsg({ type: '', text: '' })
    try {
      const updated = await updateBusiness(business.id, {
        ownerNotifyEmail: notifyEmail,
        ownerNotifyWhatsApp: notifyWa,
        ownerNotifyPhone: phone.trim() || null,
      })
      setBusiness(updated)
      setMsg({ type: 'success', text: 'Preferencias guardadas' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Notificaciones de nuevas citas</h2>
        <p className="text-sm text-gray-500 mt-1">
          Elige cómo quieres recibir alertas cuando un cliente reserve una cita.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
        <label className="flex items-center justify-between px-5 py-4 cursor-pointer">
          <div>
            <p className="font-medium text-gray-800 text-sm">Notificación por correo</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Se envía un correo a todos los dueños del negocio
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifyEmail}
            onClick={() => setNotifyEmail(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
              notifyEmail ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                notifyEmail ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        <label className="flex items-center justify-between px-5 py-4 cursor-pointer">
          <div>
            <p className="font-medium text-gray-800 text-sm">Notificación por WhatsApp</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Se envía un mensaje desde tu sesión activa de WhatsApp
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={notifyWa}
            onClick={() => setNotifyWa(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
              notifyWa ? 'bg-green-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                notifyWa ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>

        {notifyWa && (
          <div className="px-5 py-4 bg-green-50">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Número de WhatsApp del dueño
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="7890-1234 o +503 7890-1234"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 bg-white"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              El mensaje llegará a este número desde tu sesión activa de WhatsApp.
            </p>
          </div>
        )}
      </div>

      {msg.text && (
        <p className={`text-sm font-medium ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {msg.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  )
}
