import { useState, useEffect, useCallback } from 'react'
import { useBusiness } from '../components/BusinessContext'
import {
  getWhatsAppTemplates,
  createWhatsAppTemplate,
  updateWhatsAppTemplate,
  deleteWhatsAppTemplate,
  previewBroadcast,
} from '../api/client'
import { WhatsAppIcon, PlusIcon, PencilIcon, XIcon } from '../components/Icons'

const PLACEHOLDERS = ['{cliente}', '{negocio}', '{fecha}', '{servicio}']

const DAYS_OPTIONS = [
  { value: 30,  label: 'Últimos 30 días' },
  { value: 60,  label: 'Últimos 60 días' },
  { value: 90,  label: 'Últimos 90 días' },
  { value: 180, label: 'Últimos 6 meses' },
  { value: 0,   label: 'Todos los clientes' },
]

export default function WhatsAppCampaigns() {
  const { business } = useBusiness()
  const [tab, setTab] = useState('templates') // 'templates' | 'compose'

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <WhatsAppIcon className="w-14 h-14 text-gray-300 mb-4" />
        <p className="text-gray-500">Selecciona un negocio para gestionar campañas.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Campañas WhatsApp</h1>
        <p className="text-sm text-gray-500 mt-1">
          Crea plantillas reutilizables y envía mensajes personalizados a tus clientes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'templates', label: 'Plantillas' },
          { id: 'compose',   label: 'Enviar mensaje' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'templates'
        ? <TemplatesTab businessId={business.id} />
        : <ComposeTab businessId={business.id} businessName={business.name} />
      }
    </div>
  )
}

// ── Templates Tab ─────────────────────────────────────────────────────────────

function TemplatesTab({ businessId }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | 'new' | template object
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try { setTemplates(await getWhatsAppTemplates()) }
    catch { setTemplates([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (name, body) => {
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') {
        await createWhatsAppTemplate({ name, body })
      } else {
        await updateWhatsAppTemplate(editing.id, { name, body })
      }
      setEditing(null)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta plantilla?')) return
    try {
      await deleteWhatsAppTemplate(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  if (editing !== null) {
    return (
      <TemplateForm
        initial={editing === 'new' ? null : editing}
        onSave={handleSave}
        onCancel={() => { setEditing(null); setError('') }}
        saving={saving}
        error={error}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Nueva plantilla
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Cargando plantillas...
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <WhatsAppIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tienes plantillas aún</p>
          <p className="text-gray-400 text-sm mt-1">
            Crea una para reutilizarla al enviar promociones o avisos.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {templates.map((t) => (
            <div key={t.id} className="flex items-start justify-between px-5 py-4 gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-800 text-sm">{t.name}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-line">{t.body}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setEditing(t)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  title="Editar"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Eliminar"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500 font-medium mb-1">Variables disponibles</p>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map((p) => (
            <code key={p} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-indigo-600 font-mono">
              {p}
            </code>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          <code className="font-mono">{'{fecha}'}</code> = fecha que ingreses al enviar ·
          <code className="font-mono"> {'{negocio}'}</code> = nombre del negocio ·
          <code className="font-mono"> {'{cliente}'}</code> = nombre de cada destinatario
        </p>
      </div>
    </div>
  )
}

function TemplateForm({ initial, onSave, onCancel, saving, error }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [body, setBody] = useState(initial?.body ?? '')

  const insertPlaceholder = (p) => setBody((prev) => prev + p)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-gray-800">
        {initial ? 'Editar plantilla' : 'Nueva plantilla'}
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de la plantilla</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ej. Promoción navideña, Cierre por feriado…"
          maxLength={200}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-700">Mensaje</label>
          <div className="flex gap-1 flex-wrap justify-end">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => insertPlaceholder(p)}
                className="text-xs font-mono bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          maxLength={4096}
          placeholder={`Hola {cliente} 👋\n\n¡En *{negocio}* tenemos una promoción especial!\n\n...`}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
        />
        <p className="text-xs text-gray-400 text-right mt-1">{body.length}/4096</p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => onSave(name.trim(), body.trim())}
          disabled={!name.trim() || !body.trim() || saving}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

// ── Compose Tab ───────────────────────────────────────────────────────────────

function ComposeTab({ businessId, businessName }) {
  const [templates, setTemplates] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [customBody, setCustomBody] = useState('')
  const [fecha, setFecha] = useState('')
  const [daysBack, setDaysBack] = useState(90)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getWhatsAppTemplates().then(setTemplates).catch(() => {})
  }, [])

  const body = selectedTemplate ? selectedTemplate.body : customBody

  const handlePreview = async () => {
    if (!body.trim()) return
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const result = await previewBroadcast({ body, fecha: fecha || null, daysBack })
      setPreview(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Step 1: Message */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide text-gray-500">
          1 · Mensaje
        </h2>

        {/* Template picker */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Usar plantilla</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTemplate(null)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  !selectedTemplate
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                }`}
              >
                Escribir libre
              </button>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    selectedTemplate?.id === t.id
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {selectedTemplate ? 'Vista previa del mensaje' : 'Mensaje'}
          </label>
          <textarea
            value={body}
            onChange={(e) => {
              if (!selectedTemplate) setCustomBody(e.target.value)
            }}
            readOnly={!!selectedTemplate}
            rows={6}
            placeholder={`Hola {cliente} 👋\n\nQuería avisarte que en *{negocio}* estaremos cerrados el {fecha}.\n\n¡Hasta pronto!`}
            className={`w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono ${
              selectedTemplate ? 'bg-gray-50 text-gray-600' : ''
            }`}
          />
        </div>

        {/* Fecha variable */}
        {body.includes('{fecha}') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Valor de <code className="font-mono text-indigo-600 text-xs">{'{fecha}'}</code>
            </label>
            <input
              type="text"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              placeholder="ej. 25 de diciembre, lunes 20 de enero…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Step 2: Recipients */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide text-gray-500 mb-3">
          2 · Destinatarios
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Período de actividad</label>
          <select
            value={daysBack}
            onChange={(e) => setDaysBack(Number(e.target.value))}
            className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {DAYS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1.5">
            Clientes únicos con citas no canceladas en ese período.
          </p>
        </div>
      </div>

      {/* Generate */}
      <div className="flex justify-end">
        <button
          onClick={handlePreview}
          disabled={!body.trim() || loading}
          className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <WhatsAppIcon className="w-4 h-4" />
          {loading ? 'Generando…' : 'Generar mensajes'}
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Step 3: Results */}
      {preview && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide text-gray-500">
              3 · Enviar ({preview.recipientCount} {preview.recipientCount === 1 ? 'destinatario' : 'destinatarios'})
            </h2>
          </div>

          {preview.recipientCount === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500 text-sm">
                No se encontraron clientes con número de WhatsApp en ese período.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">
                Haz clic en cada botón para abrir WhatsApp con el mensaje listo. Solo presiona Enviar.
              </p>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                {preview.recipients.map((r, i) => (
                  <RecipientRow key={i} recipient={r} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RecipientRow({ recipient }) {
  const [sent, setSent] = useState(false)

  const initials = recipient.customerName
    .split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  const handleSend = () => {
    window.open(recipient.waLink, '_blank', 'noopener,noreferrer')
    setSent(true)
  }

  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-800 text-sm">{recipient.customerName}</p>
          <p className="text-xs text-gray-400">{recipient.phone}</p>
        </div>
      </div>
      <button
        onClick={handleSend}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg flex-shrink-0 transition-colors ${
          sent
            ? 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-700'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        <WhatsAppIcon className="w-3.5 h-3.5" />
        {sent ? 'Reenviar' : 'Enviar'}
      </button>
    </div>
  )
}
