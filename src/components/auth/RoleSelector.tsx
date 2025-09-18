import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { ShoppingCart, Database, Shield, Users } from 'lucide-react'
import type { UserRole } from './AuthContext'

interface RoleSelectorProps {
  onRoleSelect: (role: UserRole) => void
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ onRoleSelect }) => {
  const roles = [
    {
      id: 'consumer' as UserRole,
      title: 'API Consumer',
      description: 'Browse and subscribe to APIs in the marketplace',
      icon: <ShoppingCart className="w-8 h-8 text-primary" />,
      features: ['Browse API catalog', 'Subscribe to APIs', 'Test API endpoints', 'View usage analytics']
    },
    {
      id: 'provider' as UserRole,
      title: 'API Provider',
      description: 'Publish and manage your APIs in the marketplace',
      icon: <Database className="w-8 h-8 text-primary" />,
      features: ['Publish APIs', 'Manage documentation', 'View subscriber analytics', 'Set pricing & quotas']
    },
    {
      id: 'admin' as UserRole,
      title: 'Administrator',
      description: 'Oversee the marketplace and approve APIs',
      icon: <Shield className="w-8 h-8 text-primary" />,
      features: ['Approve API submissions', 'Manage users', 'View platform analytics', 'Set platform policies']
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Role</h2>
        <p className="text-muted-foreground">
          Select the role you'd like to experience in this API marketplace simulation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {roles.map((role) => (
          <Card 
            key={role.id} 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50"
            onClick={() => onRoleSelect(role.id)}
          >
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                {role.icon}
                <div>
                  <CardTitle>{role.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {role.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {role.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full mt-4">
                Continue as {role.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}