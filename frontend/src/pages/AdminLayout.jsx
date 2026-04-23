import { Link, NavLink, Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { ShieldIcon } from '../components/Icons'

const tabs = [
  { to: '/admin', label: 'Resumen', end: true },
  { to: '/admin/businesses', label: 'Negocios' },
  { to: '/admin/activity', label: 'Actividad' },
]

export default function AdminLayout() {
  const { isSuperAdmin } = useAuth()
  if (!isSuperAdmin) return <Navigate to="/" replace />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-rose-50 text-rose-600 p-2 rounded-lg">
          <ShieldIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Super Admin</h1>
          <p className="text-sm text-gray-500">Solo lectura — monitoreo de toda la plataforma</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <Outlet />
    </div>
  )
}
