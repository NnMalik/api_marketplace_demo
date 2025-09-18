import React, { useState } from 'react'
import { AuthProvider, useAuth, type UserRole } from './components/auth/AuthContext'
import { AuthForm } from './components/auth/AuthForm'
import { RoleSelector } from './components/auth/RoleSelector'
import { Navigation } from './components/layout/Navigation'
import { ConsumerDashboard } from './components/dashboards/ConsumerDashboard'
import { ProviderDashboard } from './components/dashboards/ProviderDashboard'
import { AdminDashboard } from './components/dashboards/AdminDashboard'
import { FacilitatorDashboard } from './components/dashboards/FacilitatorDashboard'
import { APIPlayground } from './components/playground/APIPlayground'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Code, TestTube } from 'lucide-react'
import { Toaster } from './components/ui/sonner'

const AppContent: React.FC = () => {
  const { user, loading, role } = useAuth()
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const [showPlayground, setShowPlayground] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Code className="w-8 h-8 text-primary animate-pulse" />
          <span>Loading API Marketplace...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-4 py-8">
          {/* Landing Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Code className="w-12 h-12 text-primary" />
              <div>
                <h1 className="text-4xl font-bold">API Marketplace</h1>
                <p className="text-xl text-muted-foreground">Hands-on Training Portal</p>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience a complete API ecosystem with multiple participant roles. 
              Learn how to consume, provide, and manage APIs in a realistic marketplace environment.
            </p>
          </div>

          {/* Role Selection or Auth Form */}
          <div className="max-w-4xl mx-auto">
            {selectedRole ? (
              <AuthForm 
                selectedRole={selectedRole} 
                onBackToRoleSelection={() => setSelectedRole(null)} 
              />
            ) : (
              <RoleSelector onRoleSelect={setSelectedRole} />
            )}
          </div>

          {/* Features Overview */}
          <div className="max-w-6xl mx-auto mt-16">
            <h2 className="text-2xl font-bold text-center mb-8">What You'll Experience</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <h3 className="font-semibold mb-2">API Discovery</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse and subscribe to APIs in a realistic marketplace catalog
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📡</span>
                  </div>
                  <h3 className="font-semibold mb-2">API Publishing</h3>
                  <p className="text-sm text-muted-foreground">
                    Submit and manage your own APIs through the approval process
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔧</span>
                  </div>
                  <h3 className="font-semibold mb-2">Testing Playground</h3>
                  <p className="text-sm text-muted-foreground">
                    Interactive REST client to test and debug API endpoints
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">👥</span>
                  </div>
                  <h3 className="font-semibold mb-2">Workshop Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time session monitoring and participant guidance tools
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDashboard = () => {
    if (showPlayground) {
      return <APIPlayground />
    }

    switch (role) {
      case 'consumer':
        return <ConsumerDashboard />
      case 'provider':
        return <ProviderDashboard />
      case 'admin':
        return <AdminDashboard />
      case 'facilitator':
        return <FacilitatorDashboard />
      default:
        return <ConsumerDashboard />
    }
  }

  const getDashboardTabs = () => {
    const tabs = []
    
    switch (role) {
      case 'consumer':
        tabs.push(
          { value: 'dashboard', label: 'Marketplace', icon: '🛒' },
          { value: 'playground', label: 'API Playground', icon: '🔧' }
        )
        break
      case 'provider':
        tabs.push(
          { value: 'dashboard', label: 'My APIs', icon: '📡' },
          { value: 'playground', label: 'Test APIs', icon: '🔧' }
        )
        break
      case 'admin':
        tabs.push(
          { value: 'dashboard', label: 'Admin Panel', icon: '🛡️' },
          { value: 'playground', label: 'API Testing', icon: '🔧' }
        )
        break
      case 'facilitator':
        tabs.push(
          { value: 'dashboard', label: 'Workshop Control', icon: '👥' },
          { value: 'playground', label: 'Demo Playground', icon: '🔧' }
        )
        break
      default:
        tabs.push({ value: 'dashboard', label: 'Dashboard', icon: '📊' })
    }
    
    return tabs
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {role && (
          <div className="border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <Tabs 
                value={showPlayground ? 'playground' : 'dashboard'} 
                onValueChange={(value) => setShowPlayground(value === 'playground')}
                className="py-4"
              >
                <TabsList className="grid w-fit grid-cols-2">
                  {getDashboardTabs().map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} className="flex items-center space-x-2">
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        )}
        {renderDashboard()}
      </main>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  )
}

export default App