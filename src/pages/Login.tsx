import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { LogIn } from 'lucide-react'
import changesLogo from '@/assets/changes-logo.png'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const success = await login(username, password)
      if (success) {
        toast({
          title: "Login effettuato",
          description: "Benvenuto in MEMOIR GIS!"
        })
        navigate('/edit')
      } else {
        toast({
          title: "Credenziali non valide",
          description: "Username o password errati",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Errore di login",
        description: "Si è verificato un errore durante il login",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-dm-sans">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={changesLogo} 
              alt="CHANGES Logo" 
              className="h-12 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">MEMOIR GIS</CardTitle>
          <p className="text-secondary">
            Accedi per gestire i punti di interesse
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Inserisci username"
                autoComplete="off"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci password"
                autoComplete="off"
                required
              />
            </div>
            
            <Button type="submit" variant="changes-primary" className="w-full" disabled={loading}>
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Credenziali demo: <strong>admin / admin</strong></p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}