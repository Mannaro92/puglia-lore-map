import React, { createContext, useContext, useState, useEffect } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  role?: string
  userId?: string
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [role, setRole] = useState<string | undefined>(undefined)
  const [userId, setUserId] = useState<string | undefined>(undefined)

  useEffect(() => {
    // Check if user is already authenticated
    try {
      const authData = localStorage.getItem('auth')
      if (authData) {
        const session = JSON.parse(authData)
        if (session.isAuth) {
          setIsAuthenticated(true)
          setRole(session.role)
          setUserId(session.userId)
        }
      }
    } catch (error) {
      // Fallback to old format
      const authStatus = localStorage.getItem('auth')
      setIsAuthenticated(authStatus === 'true')
    }
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    if (username === 'admin' && password === 'admin') {
      const session = { 
        isAuth: true, 
        role: 'admin', 
        userId: 'admin' 
      }
      localStorage.setItem('auth', JSON.stringify(session))
      setIsAuthenticated(true)
      setRole('admin')
      setUserId('admin')
      return true
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('auth')
    setIsAuthenticated(false)
    setRole(undefined)
    setUserId(undefined)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}