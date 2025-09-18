import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Alert, AlertDescription } from '../ui/alert'
import { useAuth, type UserRole } from './AuthContext'
import { Code, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner@2.0.3'

interface AuthFormProps {
  selectedRole: UserRole | null
  onBackToRoleSelection: () => void
}

export const AuthForm: React.FC<AuthFormProps> = ({ selectedRole, onBackToRoleSelection }) => {
  const { signInWithEmail, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp && selectedRole) {
        const { error } = await signUp(email, password, selectedRole)
        if (error) {
          setError(error.message)
        } else {
          toast.success('Account created successfully! Please check your email to verify your account.')
        }
      } else {
        const { error } = await signInWithEmail(email, password)
        if (error) {
          setError(error.message)
        } else {
          toast.success('Signed in successfully!')
        }
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getRoleIcon = () => {
    const iconProps = { className: "w-6 h-6 text-primary" }
    switch (selectedRole) {
      case 'consumer': return <span>🛒</span>
      case 'provider': return <span>📡</span>
      case 'admin': return <span>🛡️</span>
      case 'facilitator': return <span>👥</span>
      default: return null
    }
  }

  const getRoleTitle = () => {
    switch (selectedRole) {
      case 'consumer': return 'API Consumer'
      case 'provider': return 'API Provider' 
      case 'admin': return 'Administrator'
      case 'facilitator': return 'Workshop Facilitator'
      default: return ''
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center space-x-3">
            <Code className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>API Marketplace</CardTitle>
              <CardDescription>Hands-on Training Portal</CardDescription>
            </div>
          </div>

          {selectedRole && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center space-x-2">
                {getRoleIcon()}
                <span className="font-medium">{getRoleTitle()}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onBackToRoleSelection}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-center">
            <h2>{isSignUp ? 'Create Account' : 'Sign In'}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isSignUp ? 'Join the API marketplace' : 'Welcome back to the marketplace'}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </form>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}