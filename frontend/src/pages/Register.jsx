import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { register } from '../api/client'
import { AgendaYaLogo } from '../components/Icons'

export default function Register() {
  const { saveAuth } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', businessName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await register(form)
      // saveAuth triggers BusinessContext to load businesses from API
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 text-indigo-600">
            <AgendaYaLogo className="w-8 h-8" />
            <h1 className="text-3xl font-bold">AgendaYa</h1>
          </div>
          <p className="text-gray-500 mt-2">Crea tu cuenta y tu negocio</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
            <input
              type="text"
              value={form.fullName}
              onChange={update('fullName')}
              required
              placeholder="Juan Pérez"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              required
              placeholder="tu@email.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              minLength={8}
              placeholder="Min 8 chars, mayuscula, minuscula, numero"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            {form.password && (
              <div className="mt-1.5 space-y-0.5 text-xs">
                <p className={form.password.length >= 8 ? 'text-green-600' : 'text-gray-400'}>
                  {form.password.length >= 8 ? '\u2713' : '\u2022'} 8+ caracteres
                </p>
                <p className={/[A-Z]/.test(form.password) ? 'text-green-600' : 'text-gray-400'}>
                  {/[A-Z]/.test(form.password) ? '\u2713' : '\u2022'} Una mayuscula
                </p>
                <p className={/[a-z]/.test(form.password) ? 'text-green-600' : 'text-gray-400'}>
                  {/[a-z]/.test(form.password) ? '\u2713' : '\u2022'} Una minuscula
                </p>
                <p className={/\d/.test(form.password) ? 'text-green-600' : 'text-gray-400'}>
                  {/\d/.test(form.password) ? '\u2713' : '\u2022'} Un numero
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del negocio</label>
            <input
              type="text"
              value={form.businessName}
              onChange={update('businessName')}
              required
              placeholder="Mi Barbería"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
