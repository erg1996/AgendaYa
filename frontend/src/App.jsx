import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { BusinessProvider } from './components/BusinessContext'
import { AuthProvider, useAuth } from './components/AuthContext'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import BusinessPanel from './pages/BusinessPanel'
import BookAppointment from './pages/BookAppointment'
import AppointmentsList from './pages/AppointmentsList'
import CalendarView from './pages/CalendarView'
import PublicBooking from './pages/PublicBooking'
import BookingConfirmation from './pages/BookingConfirmation'
import Login from './pages/Login'
import Register from './pages/Register'

function Layout() {
  const { pathname } = useLocation()
  const { auth } = useAuth()
  const isPublicRoute = pathname.startsWith('/book/')
  const isAuthRoute = pathname === '/login' || pathname === '/register'

  // Public booking pages — no shell
  if (isPublicRoute) {
    return (
      <Routes>
        <Route path="/book/:slug/confirmed" element={<BookingConfirmation />} />
        <Route path="/book/:slug" element={<PublicBooking />} />
      </Routes>
    )
  }

  // Auth pages — no shell, redirect if logged in
  if (isAuthRoute) {
    if (auth) return <Navigate to="/" replace />
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    )
  }

  // Protected admin routes — redirect to login if not authenticated
  if (!auth) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/business" element={<BusinessPanel />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/book" element={<BookAppointment />} />
          <Route path="/appointments" element={<AppointmentsList />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusinessProvider>
          <Layout />
        </BusinessProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
