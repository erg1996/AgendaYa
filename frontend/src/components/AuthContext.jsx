import { createContext, useContext, useMemo, useState } from 'react'

const AuthContext = createContext(null)

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decodeURIComponent(escape(json)))
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    // Use sessionStorage instead of localStorage (clears on tab close)
    // httpOnly cookies would be ideal but requires backend support
    const saved = sessionStorage.getItem('auth')
    return saved ? JSON.parse(saved) : null
  })

  const saveAuth = (data) => {
    setAuth(data)
    if (data) {
      sessionStorage.setItem('auth', JSON.stringify(data))
    } else {
      sessionStorage.removeItem('auth')
    }
  }

  const logout = () => {
    saveAuth(null)
    sessionStorage.removeItem('activeBusiness')
  }

  const isSuperAdmin = useMemo(() => {
    if (!auth?.token) return false
    const claims = decodeJwt(auth.token)
    return claims?.super_admin === 'true' || claims?.super_admin === true
  }, [auth?.token])

  return (
    <AuthContext.Provider value={{ auth, saveAuth, logout, isSuperAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
