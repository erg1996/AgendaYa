import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import {
  AgendaYaLogo,
  ChartIcon,
  StoreIcon,
  CalendarIcon,
  ListIcon,
  PencilIcon,
} from './Icons'

const links = [
  { to: '/', label: 'Dashboard', Icon: ChartIcon },
  { to: '/business', label: 'Mi Negocio', Icon: StoreIcon },
  { to: '/calendar', label: 'Calendario', Icon: CalendarIcon },
  { to: '/appointments', label: 'Citas', Icon: ListIcon },
  { to: '/book', label: 'Reservar', Icon: PencilIcon },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { auth, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 text-indigo-600">
            <AgendaYaLogo className="w-7 h-7" />
            <span className="text-xl font-bold">AgendaYa</span>
          </Link>
          <div className="flex items-center gap-1">
            {links.map(({ to, label, Icon }) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              )
            })}
            {auth && (
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <span className="text-xs text-gray-500 hidden sm:block">{auth.fullName}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
