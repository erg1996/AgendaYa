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
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 text-indigo-600 flex-shrink-0">
            <AgendaYaLogo className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="text-lg sm:text-xl font-bold hidden xs:inline">AgendaYa</span>
          </Link>
          <div className="flex items-center gap-0.5 sm:gap-1 flex-1 sm:flex-none justify-end">
            {links.map(({ to, label, Icon }) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
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
              <div className="flex items-center gap-2 sm:gap-3 ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-gray-200">
                <span className="text-xs text-gray-500 hidden sm:block truncate max-w-xs">{auth.fullName}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs sm:text-sm text-gray-500 hover:text-red-600 transition-colors whitespace-nowrap"
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
