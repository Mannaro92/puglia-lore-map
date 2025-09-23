import React, { createContext, useContext, useState, useEffect } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  useEffect(() => {
    // Check if user is already authenticated
    const authStatus = localStorage.getItem('auth')
    setIsAuthenticated(authStatus === 'true')
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log('Login attempt:', { 
      username: `'${username}'`, 
      password: `'${password}'`,
      usernameLength: username.length,
      passwordLength: password.length,
      usernameMatch: username === 'admin',
      passwordMatch: password === 'admin'
    })
    
    if (username === 'admin' && password === 'admin') {
      console.log('✅ Login successful')
      localStorage.setItem('auth', 'true')
      setIsAuthenticated(true)
      return true
    }
    console.log('❌ Login failed')
    return false
  }

  const logout = () => {
    localStorage.removeItem('auth')
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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