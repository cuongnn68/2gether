import React, { createContext, useContext, useEffect, useState } from 'react'
import { getGoogleLoginURL, getMe, logoutAPI } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = () => {
    window.location.href = getGoogleLoginURL()
  }

  const logout = () => {
    logoutAPI().finally(() => {
      setUser(null)
    })
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
