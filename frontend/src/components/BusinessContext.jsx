import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { getServices, getAppointments, getAllBusinesses } from '../api/client'
import { useAuth } from './AuthContext'

const BusinessContext = createContext(null)

export function BusinessProvider({ children }) {
  const { auth } = useAuth()
  const prevUserIdRef = useRef(auth?.userId)
  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [appointments, setAppointments] = useState([])

  // When auth changes, validate the active business belongs to this user
  useEffect(() => {
    const prevUserId = prevUserIdRef.current
    prevUserIdRef.current = auth?.userId

    if (!auth) {
      // Logged out — clear everything
      setBusiness(null)
      sessionStorage.removeItem('activeBusiness')
      setServices([])
      setAppointments([])
      return
    }

    if (prevUserId !== auth.userId) {
      // Different user logged in — clear stale business and validate from API
      sessionStorage.removeItem('activeBusiness')
      setBusiness(null)
      setServices([])
      setAppointments([])

      // Load businesses from API to set the correct one for this user
      getAllBusinesses()
        .then((businesses) => {
          if (businesses.length > 0) {
            setBusiness(businesses[0])
          }
        })
        .catch(() => {})
    } else {
      // Same user, try to restore from sessionStorage
      const saved = sessionStorage.getItem('activeBusiness')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Validate it actually belongs to the user via API
          getAllBusinesses()
            .then((businesses) => {
              const found = businesses.find((b) => b.id === parsed.id)
              if (found) {
                setBusiness(found)
              } else if (businesses.length > 0) {
                setBusiness(businesses[0])
              } else {
                sessionStorage.removeItem('activeBusiness')
              }
            })
            .catch(() => {
              sessionStorage.removeItem('activeBusiness')
            })
        } catch {
          sessionStorage.removeItem('activeBusiness')
        }
      }
    }
  }, [auth?.userId])

  useEffect(() => {
    if (business) {
      sessionStorage.setItem('activeBusiness', JSON.stringify(business))
      refreshServices()
      refreshAppointments()
    } else {
      sessionStorage.removeItem('activeBusiness')
      setServices([])
      setAppointments([])
    }
  }, [business?.id])

  const refreshServices = async () => {
    if (!business) return
    try {
      const data = await getServices(business.id)
      setServices(data)
    } catch {
      setServices([])
    }
  }

  const refreshAppointments = async () => {
    if (!business) return
    try {
      const data = await getAppointments(business.id)
      setAppointments(data.items ?? data)
    } catch {
      setAppointments([])
    }
  }

  return (
    <BusinessContext.Provider
      value={{
        business,
        setBusiness,
        services,
        refreshServices,
        appointments,
        refreshAppointments,
      }}
    >
      {children}
    </BusinessContext.Provider>
  )
}

export const useBusiness = () => useContext(BusinessContext)
