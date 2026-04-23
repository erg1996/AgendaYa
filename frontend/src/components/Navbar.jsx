import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import {
  AgendaYaLogo,
  ChartIcon,
  StoreIcon,
  CalendarIcon,
  ListIcon,
  PencilIcon,
  BellIcon,
  ShieldIcon,
} from './Icons'

const links = [
  { to: '/',            label: 'Dashboard',     Icon: ChartIcon },
  { to: '/business',    label: 'Mi Negocio',    Icon: StoreIcon },
  { to: '/calendar',    label: 'Calendario',    Icon: CalendarIcon },
  { to: '/appointments',label: 'Citas',         Icon: ListIcon },
  { to: '/reminders',   label: 'Recordatorios', Icon: BellIcon },
  { to: '/book',        label: 'Reservar',      Icon: PencilIcon },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const { auth, logout, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-indigo-600 flex-shrink-0 mr-1">
            <AgendaYaLogo className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="text-lg font-bold hidden sm:inline">AgendaYa</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-1 overflow-x-auto scrollbar-hide">
            {links.map(({ to, label, Icon }) => {
              const active = pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  title={label}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden lg:inline">{label}</span>
                </Link>
              )
            })}
            {isSuperAdmin && (
              <Link
                to="/admin"
                title="Super Admin"
                className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  pathname.startsWith('/admin')
                    ? 'bg-rose-50 text-rose-700'
                    : 'text-rose-500 hover:bg-rose-50 hover:text-rose-700'
                }`}
              >
                <ShieldIcon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden lg:inline">Admin</span>
              </Link>
            )}
          </div>

          {/* User / logout */}
          {auth && (
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 flex-shrink-0">
              <span className="text-xs text-gray-400 hidden md:block truncate max-w-[120px]">{auth.fullName}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-red-600 transition-colors font-medium px-2 py-1.5 rounded-lg hover:bg-red-50 whitespace-nowrap"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
