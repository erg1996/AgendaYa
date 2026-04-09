import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const saved = localStorage.getItem('auth')
    return saved ? JSON.parse(saved) : null
  })

  const saveAuth = (data) => {
    setAuth(data)
    if (data) {
      localStorage.setItem('auth', JSON.stringify(data))
    } else {
      localStorage.removeItem('auth')
    }
  }

  const logout = () => {
    saveAuth(null)
    localStorage.removeItem('activeBusiness')
  }

  return (
    <AuthContext.Provider value={{ auth, saveAuth, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
