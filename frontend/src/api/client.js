// In dev, Vite proxy handles /api → backend. In production, set VITE_API_URL.
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

function getToken() {
  try {
    const auth = sessionStorage.getItem('auth')
    return auth ? JSON.parse(auth).token : null
  } catch {
    return null
  }
}

function getCsrfToken() {
  // Get CSRF token from cookie
  const name = 'XSRF-TOKEN'
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const token = parts.pop().split(';').shift()
    // Decode URL-encoded token (cookies encode special chars like = as %3D)
    return decodeURIComponent(token)
  }
  return null
}

async function request(path, options = {}, authenticated = false) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  if (authenticated) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method?.toUpperCase())) {
    const csrfToken = getCsrfToken()
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  // Handle expired/invalid token — redirect to login
  if (res.status === 401 && authenticated) {
    sessionStorage.removeItem('auth')
    sessionStorage.removeItem('activeBusiness')
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// Authenticated request shorthand
const authRequest = (path, options = {}) => request(path, options, true)

// Public requests (no auth needed)
const publicRequest = (path, options = {}) => request(path, options, false)

// ─── Business ─────────────────────────────────────────────────────────────────
export const getAllBusinesses = () => authRequest('/api/business')

export const getBusiness = (id) => authRequest(`/api/business/${id}`)

export const getBusinessBySlug = (slug) => publicRequest(`/api/business/slug/${slug}`)

export const createBusiness = (data) =>
  authRequest('/api/business', { method: 'POST', body: JSON.stringify(data) })

export const updateBusiness = (id, data) =>
  authRequest(`/api/business/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const updateBusinessWhatsAppTemplate = (id, whatsAppReminderTemplate) =>
  authRequest(`/api/business/${id}`, { method: 'PUT', body: JSON.stringify({ whatsAppReminderTemplate }) })

export const updateBusinessLocation = (id, { latitude, longitude, address }) =>
  authRequest(`/api/business/${id}`, { method: 'PUT', body: JSON.stringify({ latitude, longitude, address }) })

export const clearBusinessLocation = (id) =>
  authRequest(`/api/business/${id}`, { method: 'PUT', body: JSON.stringify({ clearLocation: true }) })

// ─── Services ────────────────────────────────────────────────────────────────
export const getServices = (businessId) =>
  publicRequest(`/api/services?businessId=${businessId}`)

export const createService = (data) =>
  authRequest('/api/services', { method: 'POST', body: JSON.stringify(data) })

export const deleteService = (id, businessId) =>
  authRequest(`/api/services/${id}?businessId=${businessId}`, { method: 'DELETE' })

// ─── Working Hours ────────────────────────────────────────────────────────────
export const getWorkingHours = (businessId) =>
  authRequest(`/api/working-hours?businessId=${businessId}`)

export const createWorkingHours = (data) =>
  authRequest('/api/working-hours', { method: 'POST', body: JSON.stringify(data) })

export const updateWorkingHours = (id, data) =>
  authRequest(`/api/working-hours/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteWorkingHours = (id, businessId) =>
  authRequest(`/api/working-hours/${id}?businessId=${businessId}`, { method: 'DELETE' })

// ─── Blocked Dates ────────────────────────────────────────────────────────────
export const getBlockedDates = (businessId) =>
  authRequest(`/api/blocked-dates?businessId=${businessId}`)

export const createBlockedDate = (data) =>
  authRequest('/api/blocked-dates', { method: 'POST', body: JSON.stringify(data) })

export const deleteBlockedDate = (id, businessId) =>
  authRequest(`/api/blocked-dates/${id}?businessId=${businessId}`, { method: 'DELETE' })

// ─── Availability (public) ────────────────────────────────────────────────────
export const getAvailability = (businessId, date, serviceId) =>
  publicRequest(
    `/api/availability?businessId=${businessId}&date=${encodeURIComponent(date)}&serviceId=${serviceId}`
  )

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const register = (data) =>
  publicRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(data) })

export const login = (data) =>
  publicRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(data) })

// ─── Appointments ─────────────────────────────────────────────────────────────
export const createAppointment = (data) =>
  publicRequest('/api/appointments', { method: 'POST', body: JSON.stringify(data) })

export const getPendingWhatsAppReminders = (businessId) =>
  authRequest(`/api/appointments/reminders/pending?businessId=${businessId}`)

export const markWhatsAppReminderSent = (appointmentId, businessId) =>
  authRequest(`/api/appointments/${appointmentId}/reminders/whatsapp?businessId=${businessId}`, { method: 'POST' })

export const getAppointments = (businessId, page = 1, pageSize = 50) =>
  authRequest(`/api/appointments?businessId=${businessId}&page=${page}&pageSize=${pageSize}`)

export const updateAppointmentStatus = (id, businessId, status) =>
  authRequest(`/api/appointments/${id}/status?businessId=${businessId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

export const updateAppointmentNotes = (id, businessId, notes) =>
  authRequest(`/api/appointments/${id}/notes?businessId=${businessId}`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  })

// ─── Analytics ────────────────────────────────────────────────────────────────
export const getDashboardAnalytics = (businessId) =>
  authRequest(`/api/analytics/dashboard?businessId=${businessId}`)

// ─── Reports ─────────────────────────────────────────────────────────────────
export const downloadReportCsv = async (businessId, from, to) => {
  const token = getToken()
  const csrfToken = getCsrfToken()
  const params = new URLSearchParams({ businessId })
  if (from) params.append('from', from)
  if (to) params.append('to', to)

  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken

  const res = await fetch(`${BASE_URL}/api/reports/appointments.csv?${params}`, {
    headers,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  a.download = match ? match[1] : 'reporte.csv'
  a.href = url
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Admin (super admin only) ─────────────────────────────────────────────────
export const getAdminOverview = () => authRequest('/api/admin/overview')
export const getAdminBusinesses = () => authRequest('/api/admin/businesses')
export const getAdminBusinessDetail = (id) => authRequest(`/api/admin/businesses/${id}`)
export const getAdminActivity = (limit = 50) => authRequest(`/api/admin/activity?limit=${limit}`)

// ─── Upload ───────────────────────────────────────────────────────────────────
export const uploadLogo = async (file) => {
  const token = getToken()
  const csrfToken = getCsrfToken()
  const formData = new FormData()
  formData.append('file', file)

  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken

  const res = await fetch(`${BASE_URL}/api/upload/logo`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}
