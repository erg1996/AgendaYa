import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { register } from '../api/client'
import { AgendaYaLogo } from '../components/Icons'

const checks = [
  { label: '8+ caracteres', test: (p) => p.length >= 8 },
  { label: 'Mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Número', test: (p) => /\d/.test(p) },
]

export default function Register() {
  const { saveAuth } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', businessName: '', inviteCode: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await register(form)
      sessionStorage.removeItem('activeBusiness')
      saveAuth(result)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden md:flex md:w-5/12 bg-indigo-600 flex-col justify-between p-12">
        <div className="flex items-center gap-2.5 text-white">
          <AgendaYaLogo className="w-8 h-8" />
          <span className="text-xl font-bold">AgendaYa</span>
        </div>
        <div>
          <div className="space-y-4 mb-8">
            {['Crea tu cuenta en minutos', 'Configura tus servicios y horarios', 'Comparte tu link y recibe citas'].map((s, i) => (
              <div key={i} className="flex items-center gap-3 text-white">
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm">{s}</span>
              </div>
            ))}
          </div>
          <h2 className="text-2xl font-bold text-white leading-snug">
            Empieza hoy,<br />gratis durante el beta.
          </h2>
        </div>
        <p className="text-indigo-300 text-xs">© 2026 AgendaYa</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Logo — mobile only */}
          <div className="flex items-center justify-center gap-2 text-indigo-600 mb-6 md:hidden">
            <AgendaYaLogo className="w-7 h-7" />
            <span className="text-xl font-bold">AgendaYa</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Crear cuenta</h1>
          <p className="text-gray-500 text-sm mb-6">Configura tu negocio y empieza a agendar</p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {[
              { field: 'fullName', label: 'Tu nombre', type: 'text', placeholder: 'Juan Pérez' },
              { field: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com' },
              { field: 'businessName', label: 'Nombre del negocio', type: 'text', placeholder: 'Mi Barbería' },
            ].map(({ field, label, type, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[field]}
                  onChange={update(field)}
                  required
                  placeholder={placeholder}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                required
                minLength={8}
                placeholder="Min. 8 caracteres"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              {form.password && (
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {checks.map(({ label, test }) => {
                    const ok = test(form.password)
                    return (
                      <div key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[9px] flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-gray-200'}`}>
                          {ok ? '✓' : ''}
                        </span>
                        {label}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Código de acceso</label>
              <input
                type="password"
                value={form.inviteCode}
                onChange={update('inviteCode')}
                required
                placeholder="Código proporcionado"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm hover:shadow-md mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Creando cuenta…
                </span>
              ) : 'Crear Cuenta'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-indigo-600 hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
