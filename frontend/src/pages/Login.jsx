import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { login } from '../api/client'
import { AgendaYaLogo, CalendarCheckIcon } from '../components/Icons'

export default function Login() {
  const { saveAuth } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await login({ email, password })
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
      {/* Left panel — visible on md+ */}
      <div className="hidden md:flex md:w-1/2 bg-indigo-600 flex-col justify-between p-12">
        <div className="flex items-center gap-2.5 text-white">
          <AgendaYaLogo className="w-8 h-8" />
          <span className="text-xl font-bold">AgendaYa</span>
        </div>
        <div>
          <CalendarCheckIcon className="w-16 h-16 text-indigo-300 mb-6" />
          <h2 className="text-3xl font-bold text-white mb-3 leading-snug">
            Tu negocio,<br />siempre organizado.
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed">
            Gestiona citas, clientes y horarios desde un solo lugar.
            Sin llamadas, sin confusiones.
          </p>
        </div>
        <p className="text-indigo-300 text-xs">© 2026 AgendaYa</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Logo — mobile only */}
          <div className="flex items-center justify-center gap-2 text-indigo-600 mb-8 md:hidden">
            <AgendaYaLogo className="w-8 h-8" />
            <span className="text-2xl font-bold">AgendaYa</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Bienvenido</h1>
          <p className="text-gray-500 text-sm mb-8">Inicia sesión en tu cuenta</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
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
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm hover:shadow-md mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Entrando…
                </span>
              ) : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-indigo-600 hover:underline font-medium">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
