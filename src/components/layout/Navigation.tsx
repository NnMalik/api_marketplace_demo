import React, { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { useAuth } from '../auth/AuthContext'
import { 
  Moon, 
  Sun, 
  ShoppingCart, 
  Database, 
  Shield, 
  Users, 
  LogOut,
  Code,
  Menu,
  X
} from 'lucide-react'
import { Card } from '../ui/card'

export const Navigation: React.FC = () => {
  const { user, role, signOut } = useAuth()
  const [isDark, setIsDark] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark')
    setIsDark(isDarkMode)
  }, [])

  const toggleDarkMode = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const getRoleIcon = () => {
    switch (role) {
      case 'consumer': return <ShoppingCart className="w-4 h-4" />
      case 'provider': return <Database className="w-4 h-4" />
      case 'admin': return <Shield className="w-4 h-4" />
      case 'facilitator': return <Users className="w-4 h-4" />
      default: return null
    }
  }

  const getRoleLabel = () => {
    switch (role) {
      case 'consumer': return 'API Consumer'
      case 'provider': return 'API Provider'
      case 'admin': return 'Administrator'
      case 'facilitator': return 'Facilitator'
      default: return ''
    }
  }

  if (!user) return null

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Code className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">API Marketplace</h1>
                <p className="text-xs text-muted-foreground">Hands-on Training Portal</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Role Badge */}
            <Card className="px-3 py-1 bg-primary/10">
              <div className="flex items-center space-x-2">
                {getRoleIcon()}
                <span className="text-sm font-medium">{getRoleLabel()}</span>
              </div>
            </Card>

            {/* Dark Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Sun className="w-4 h-4" />
              <Switch checked={isDark} onCheckedChange={toggleDarkMode} />
              <Moon className="w-4 h-4" />
            </div>

            {/* User Email */}
            <span className="text-sm text-muted-foreground">{user.email}</span>

            {/* Sign Out */}
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="flex items-center space-x-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-4">
            <Card className="p-4 space-y-4">
              {/* Role Badge */}
              <div className="flex items-center space-x-2 p-2 bg-primary/10 rounded">
                {getRoleIcon()}
                <span className="text-sm font-medium">{getRoleLabel()}</span>
              </div>

              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Dark Mode</span>
                <div className="flex items-center space-x-2">
                  <Sun className="w-4 h-4" />
                  <Switch checked={isDark} onCheckedChange={toggleDarkMode} />
                  <Moon className="w-4 h-4" />
                </div>
              </div>

              {/* User Email */}
              <div className="text-sm text-muted-foreground">{user.email}</div>

              {/* Sign Out */}
              <Button
                variant="ghost"
                onClick={signOut}
                className="w-full justify-start"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </Card>
          </div>
        )}
      </div>
    </nav>
  )
}