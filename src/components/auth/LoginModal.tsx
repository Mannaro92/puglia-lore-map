import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { Loader2, LogIn, UserPlus } from 'lucide-react'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('login')
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  })
  
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password
      })
      
      if (error) throw error
      
      toast({
        title: "Login effettuato",
        description: "Benvenuto nella modalità editing!"
      })
      
      onOpenChange(false)
      onSuccess?.()
      
    } catch (error: any) {
      toast({
        title: "Errore di login", 
        description: error.message || "Controlla email e password",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (signupData.password !== signupData.confirmPassword) {
      toast({
        title: "Le password non coincidono",
        variant: "destructive"
      })
      return
    }
    
    if (signupData.password.length < 6) {
      toast({
        title: "Password troppo corta",
        description: "La password deve avere almeno 6 caratteri",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            display_name: signupData.displayName || signupData.email.split('@')[0]
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      })
      
      if (error) throw error
      
      toast({
        title: "Registrazione completata",
        description: "Controlla la tua email per confermare l'account"
      })
      
      onOpenChange(false)
      
    } catch (error: any) {
      toast({
        title: "Errore di registrazione",
        description: error.message || "Riprova più tardi",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForms = () => {
    setLoginData({ email: '', password: '' })
    setSignupData({ email: '', password: '', confirmPassword: '', displayName: '' })
    setActiveTab('login')
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetForms()
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">MEMOIR GIS</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">
              <LogIn className="w-4 h-4 mr-2" />
              Accedi
            </TabsTrigger>
            <TabsTrigger value="signup">
              <UserPlus className="w-4 h-4 mr-2" />
              Registrati
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login" className="space-y-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="la-tua-email@esempio.it"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Accedi
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="signup-name">Nome visualizzato (opzionale)</Label>
                <Input
                  id="signup-name"
                  value={signupData.displayName}
                  onChange={(e) => setSignupData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Il tuo nome"
                />
              </div>
              
              <div>
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupData.email}
                  onChange={(e) => setSignupData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="la-tua-email@esempio.it"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupData.password}
                  onChange={(e) => setSignupData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Minimo 6 caratteri"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="signup-confirm">Conferma Password</Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrati
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}