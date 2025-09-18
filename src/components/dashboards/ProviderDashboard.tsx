import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Plus, RefreshCw, Edit, Trash2, BarChart3, Users, DollarSign, CheckCircle, Clock, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner@2.0.3'
import { useAuth } from '../auth/AuthContext'
import { marketplaceAPI } from '../../utils/api/marketplace'

interface API {
  id: string
  name: string
  description: string
  category: string
  version: string
  status: 'pending' | 'approved' | 'rejected'
  subscribers: number
  totalCalls: number
  revenue: number
  submittedAt: string
  approvedAt?: string
  rejectedAt?: string
  endpointUrl?: string
}

export const ProviderDashboard: React.FC = () => {
  const { session, refreshSession } = useAuth()
  const [apis, setApis] = useState<API[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    version: '1.0',
    endpointUrl: ''
  })

  useEffect(() => {
    loadUserAPIs()
  }, [session])

  const loadUserAPIs = async () => {
    if (!session?.access_token) {
      console.log('❌ No access token available for provider')
      toast.error('Please log in to view your APIs')
      return
    }
    
    setLoading(true)
    try {
      console.log('🔄 Loading APIs for provider:', session.user?.email)
      const { data, error, count, breakdown } = await marketplaceAPI.getUserAPIs(session.access_token)
      
      if (error) {
        console.error('❌ Failed to load provider APIs:', error)
        toast.error('Failed to load APIs: ' + error)
      } else if (data) {
        console.log(`✅ Loaded ${count} APIs:`, breakdown)
        setApis(data)
        toast.success(`Loaded ${count} APIs (${breakdown?.pending || 0} pending, ${breakdown?.approved || 0} approved, ${breakdown?.rejected || 0} rejected)`)
      } else {
        console.log('⚠️ No API data returned')
        setApis([])
        toast.info('No APIs found. Create your first API!')
      }
    } catch (error) {
      console.error('❌ Exception loading APIs:', error)
      toast.error('Failed to load APIs - check console for details')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['Weather', 'Finance', 'Security', 'Communication', 'Location', 'Analytics', 'Data', 'AI/ML', 'Other']

  const handlePublishAPI = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('📝 Form submission started')
    console.log('🔍 Session state:', { 
      hasSession: !!session, 
      hasAccessToken: !!session?.access_token,
      userEmail: session?.user?.email,
      userRole: session?.user?.user_metadata?.role 
    })
    
    if (!formData.name || !formData.description || !formData.category) {
      console.log('❌ Form validation failed - missing required fields')
      toast.error('Please fill in all required fields (Name, Description, Category)')
      return
    }

    if (!session?.access_token) {
      console.log('❌ No access token available')
      toast.error('Not authenticated - please log in again')
      return
    }

    setSubmitting(true)
    try {
      console.log('🚀 Publishing API:', formData.name)
      console.log('👤 User info:', { 
        email: session.user?.email, 
        id: session.user?.id,
        role: session.user?.user_metadata?.role 
      })
      
      const apiData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        version: formData.version.trim() || '1.0',
        endpointUrl: formData.endpointUrl.trim()
      }
      
      console.log('📊 Submitting API data:', apiData)
      
      const { data, error, message } = await marketplaceAPI.submitAPI(apiData, session.access_token)
      
      console.log('📨 API submission response:', { data, error, message })
      
      if (error) {
        console.error('❌ Failed to submit API:', error)
        toast.error('Failed to submit API: ' + error)
        return
      }
      
      if (data) {
        console.log('✅ API submitted successfully:', data)
        
        // Reset form and close dialog
        setFormData({
          name: '',
          description: '',
          category: '',
          version: '1.0',
          endpointUrl: ''
        })
        setIsPublishDialogOpen(false)
        
        // Reload APIs to show the new one
        console.log('🔄 Reloading user APIs after submission...')
        await loadUserAPIs()
        
        toast.success(message || 'API submitted for review! It will appear in the marketplace once approved by an admin.')
      } else {
        console.log('⚠️ No data returned from API submission')
        toast.error('API submission succeeded but no data returned')
      }
    } catch (error) {
      console.error('❌ Exception publishing API:', error)
      toast.error('Failed to publish API - check console for details')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default'
      case 'pending': return 'secondary'
      case 'rejected': return 'destructive'
      default: return 'outline'
    }
  }

  const stats = {
    totalRevenue: apis.reduce((sum, api) => sum + (api.revenue || 0), 0),
    totalSubscribers: apis.reduce((sum, api) => sum + (api.subscribers || 0), 0),
    totalCalls: apis.reduce((sum, api) => sum + (api.totalCalls || 0), 0),
    pendingCount: apis.filter(api => api.status === 'pending').length,
    approvedCount: apis.filter(api => api.status === 'approved').length,
    rejectedCount: apis.filter(api => api.status === 'rejected').length
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
            <p>Loading your APIs...</p>
            <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>API Provider Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Publish and manage your APIs in the marketplace
          </p>
          
        </div>

        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={loadUserAPIs}
            disabled={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          
          <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Publish New API</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Publish New API</DialogTitle>
                <DialogDescription>
                  Add your API to the marketplace for developers to discover and use.
                  Your API will be reviewed by an admin before being made available.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePublishAPI} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">API Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Weather Forecast API"
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      disabled={submitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what your API does, its main features, and use cases..."
                    required
                    disabled={submitting}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                      placeholder="e.g. 1.0, v2.1"
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endpointUrl">Base Endpoint URL</Label>
                    <Input
                      id="endpointUrl"
                      value={formData.endpointUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, endpointUrl: e.target.value }))}
                      placeholder="https://api.example.com/v1"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsPublishDialogOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="flex items-center space-x-2"
                  >
                    {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    <span>{submitting ? 'Publishing...' : 'Publish API'}</span>
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-8 h-8 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Subscribers</p>
                <p className="text-2xl font-bold">{stats.totalSubscribers.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Total API Calls</p>
                <p className="text-2xl font-bold">{stats.totalCalls.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="apis" className="space-y-6">
        <TabsList>
          <TabsTrigger value="apis">My APIs ({apis.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="apis">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Published APIs</span>
                {stats.pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.pendingCount} pending review
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage your APIs and track their approval status. APIs must be approved by an admin before becoming available to consumers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apis.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>API</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subscribers</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apis.map(api => (
                      <TableRow key={api.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{api.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {api.description}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Submitted: {new Date(api.submittedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{api.category}</Badge>
                        </TableCell>
                        <TableCell>{api.version}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(api.status)}
                            <Badge variant={getStatusColor(api.status)}>
                              {api.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{api.subscribers.toLocaleString()}</TableCell>
                        <TableCell>{api.totalCalls.toLocaleString()}</TableCell>
                        <TableCell>${api.revenue.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm" disabled>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" disabled>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Plus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No APIs Published Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Get started by publishing your first API to the marketplace
                  </p>
                  <Button onClick={() => setIsPublishDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Publish Your First API
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Performance</CardTitle>
                <CardDescription>Track usage and revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Analytics charts will be displayed here</p>
                    <p className="text-sm">Publish and get APIs approved to see data</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing APIs</CardTitle>
                <CardDescription>Your most popular APIs by usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apis
                    .filter(api => api.status === 'approved')
                    .sort((a, b) => b.totalCalls - a.totalCalls)
                    .slice(0, 5)
                    .map(api => (
                      <div key={api.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{api.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {api.subscribers} subscribers
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{api.totalCalls.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">calls</p>
                        </div>
                      </div>
                    ))}
                  {stats.approvedCount === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No approved APIs yet</p>
                      <p className="text-sm">Publish APIs and get them approved to see analytics</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}