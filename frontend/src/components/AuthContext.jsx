import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

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

  return (
    <AuthContext.Provider value={{ auth, saveAuth, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
