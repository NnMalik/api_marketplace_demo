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
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { marketplaceAPI } from '../../utils/api/marketplace'

interface PricingModel {
  id: string
  name: string
  description: string
  price: number
  unit: string // e.g. 'per call', 'per month', 'flat'
}

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
  pricingModels?: PricingModel[]
}

export const ProviderDashboard: React.FC = () => {
  // Delete API dialog state
  const [deleteApiId, setDeleteApiId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  // Delete API handler
  const handleDeleteApi = (api: API) => {
    setDeleteApiId(api.id)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteApi = async () => {
    if (!deleteApiId || !session?.access_token) return
    try {
      const { error, message } = await marketplaceAPI.authenticatedRequest(`/apis/${deleteApiId}`, session.access_token, { method: 'DELETE' })
      if (error) {
        toast.error('Failed to delete API: ' + error)
      } else {
        toast.success(message || 'API deleted successfully')
        await loadUserAPIs()
      }
    } catch (err) {
      toast.error('Error deleting API')
    } finally {
      setIsDeleteDialogOpen(false)
      setDeleteApiId(null)
    }
  }
  // Edit API dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editApiData, setEditApiData] = useState<API | null>(null)

  // Open edit dialog for selected API
  const handleEditApi = (api: API) => {
    setEditApiData(api)
    setIsEditDialogOpen(true)
  }

  // Save edited API
  const handleSaveEditApi = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editApiData || !session?.access_token) return
    try {
      const updatedApi = {
        ...editApiData,
        pricingModelIds: editApiData.pricingModels?.map(pm => pm.id) || [],
        status: 'pending', // Set status to pending on edit
      }
      const { data, error } = await marketplaceAPI.submitAPI(updatedApi, session.access_token)
      if (error) {
        toast.error('Failed to update API: ' + error)
        return
      }
      toast.success('API updated successfully and set to pending for re-approval')
      setIsEditDialogOpen(false)
      setEditApiData(null)
      await loadUserAPIs()
    } catch (err) {
      toast.error('Error updating API')
    }
  }
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
    endpointUrl: '',
    pricingModelIds: [] as string[]
  })
  // Pricing models state for provider
  const [pricingModels, setPricingModels] = useState<PricingModel[]>([])
  const [newPricingModel, setNewPricingModel] = useState({
    name: '',
    description: '',
    price: 0,
    unit: 'per call'
  })
  const [showPricingDialog, setShowPricingDialog] = useState(false)
  const [loadingPricingModels, setLoadingPricingModels] = useState(false)

  useEffect(() => {
    loadUserAPIs()
    fetchProviderPricingModels()
  }, [session])
  // Fetch provider pricing models from backend
  const fetchProviderPricingModels = async () => {
    if (!session?.access_token) return
    setLoadingPricingModels(true)
    try {
      const { data, error } = await marketplaceAPI.getProviderPricingModels(session.access_token)
      if (error) {
        toast.error('Failed to load pricing models: ' + error)
        setPricingModels([])
      } else if (data) {
        setPricingModels(data)
      }
    } catch (err) {
      toast.error('Error loading pricing models')
      setPricingModels([])
    } finally {
      setLoadingPricingModels(false)
    }
  }

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
      // If breakdown is not present, fallback to empty object
      const safeBreakdown = breakdown || {};
      if (error) {
        console.error('❌ Failed to load provider APIs:', error)
        toast.error('Failed to load APIs: ' + error)
      } else if (data) {
        console.log(`✅ Loaded ${count} APIs:`, safeBreakdown)
        setApis(data)
        toast.success(`Loaded ${count} APIs (${safeBreakdown.pending || 0} pending, ${safeBreakdown.approved || 0} approved, ${safeBreakdown.rejected || 0} rejected)`)
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

  // Add pricing model
  const handleAddPricingModel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPricingModel.name || !newPricingModel.unit) {
      toast.error('Pricing model name and unit are required')
      return
    }
    if (!session?.access_token) {
      toast.error('Not authenticated - please log in again')
      return
    }
    try {
      const { data, error } = await marketplaceAPI.createPricingModel(newPricingModel, session.access_token)
      if (error) {
        toast.error('Failed to add pricing model: ' + error)
        return
      }
      toast.success('Pricing model added')
      setNewPricingModel({ name: '', description: '', price: 0, unit: 'per call' })
      setShowPricingDialog(false)
      await fetchProviderPricingModels()
    } catch (err) {
      toast.error('Error adding pricing model')
    }
  }

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
        endpointUrl: formData.endpointUrl.trim(),
        pricingModelIds: formData.pricingModelIds,
        pricingModels: pricingModels.filter(pm => formData.pricingModelIds.includes(pm.id))
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
          endpointUrl: '',
          pricingModelIds: []
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
                {/* Pricing Models Section */}
                <div className="space-y-2">
                  <Label>Pricing Models</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {loadingPricingModels ? (
                      <span className="text-muted-foreground">Loading pricing models...</span>
                    ) : pricingModels.length === 0 ? (
                      <span className="text-muted-foreground">No pricing models found. Add one!</span>
                    ) : (
                      pricingModels.map(pm => (
                        <Badge key={pm.id} variant="outline" className="px-2 py-1">
                          <span className="font-semibold">{pm.name}</span> - ${pm.price} <span className="text-xs">{pm.unit}</span>
                        </Badge>
                      ))
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowPricingDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Pricing Model
                  </Button>
                  {pricingModels.length > 0 && (
                    <div className="mt-2">
                      <Label>Select Pricing Models for this API</Label>
                      <div className="flex flex-wrap gap-2">
                        {pricingModels.map(pm => (
                          <label key={pm.id} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={formData.pricingModelIds.includes(pm.id)}
                              onChange={e => {
                                setFormData(prev => ({
                                  ...prev,
                                  pricingModelIds: e.target.checked
                                    ? [...prev.pricingModelIds, pm.id]
                                    : prev.pricingModelIds.filter(id => id !== pm.id)
                                }));
                              }}
                            />
                            <span>{pm.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Pricing Model Dialog */}
                <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Pricing Model</DialogTitle>
                      <DialogDescription>
                        Define a pricing model for your API (e.g., Free, Pay-per-call, Subscription).
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddPricingModel} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="pm-name">Name</Label>
                        <Input
                          id="pm-name"
                          value={newPricingModel.name}
                          onChange={e => setNewPricingModel(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Free Tier, Pay-per-call, Monthly Subscription"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pm-desc">Description</Label>
                        <Textarea
                          id="pm-desc"
                          value={newPricingModel.description}
                          onChange={e => setNewPricingModel(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe the pricing model..."
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pm-price">Price</Label>
                          <Input
                            id="pm-price"
                            type="number"
                            value={newPricingModel.price}
                            onChange={e => setNewPricingModel(prev => ({ ...prev, price: Number(e.target.value) }))}
                            placeholder="e.g. 0, 0.01, 10"
                            min={0}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pm-unit">Unit</Label>
                          <Select
                            value={newPricingModel.unit}
                            onValueChange={(value : string) => setNewPricingModel(prev => ({ ...prev, unit: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per call">Per Call</SelectItem>
                              <SelectItem value="per month">Per Month</SelectItem>
                              <SelectItem value="flat">Flat Fee</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowPricingDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          Add Pricing Model
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
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
                      onValueChange={(value:string) => setFormData(prev => ({ ...prev, category: value }))}
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
          <TabsTrigger value="pricing">Pricing Models</TabsTrigger>
        </TabsList>
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Models</CardTitle>
              <CardDescription>
                Manage your pricing models. These can be associated with your APIs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button variant="outline" onClick={() => setShowPricingDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add New Pricing Model
                </Button>
                <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Pricing Model</DialogTitle>
                      <DialogDescription>
                        Define a pricing model for your API (e.g., Free, Pay-per-call, Subscription).
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddPricingModel} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="pm-name">Name</Label>
                        <Input
                          id="pm-name"
                          value={newPricingModel.name}
                          onChange={e => setNewPricingModel(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Free Tier, Pay-per-call, Monthly Subscription"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pm-desc">Description</Label>
                        <Textarea
                          id="pm-desc"
                          value={newPricingModel.description}
                          onChange={e => setNewPricingModel(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe the pricing model..."
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="pm-price">Price</Label>
                          <Input
                            id="pm-price"
                            type="number"
                            value={newPricingModel.price}
                            onChange={e => setNewPricingModel(prev => ({ ...prev, price: Number(e.target.value) }))}
                            placeholder="e.g. 0, 0.01, 10"
                            min={0}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="pm-unit">Unit</Label>
                          <Select
                            value={newPricingModel.unit}
                            onValueChange={(value : string) => setNewPricingModel(prev => ({ ...prev, unit: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per call">Per Call</SelectItem>
                              <SelectItem value="per month">Per Month</SelectItem>
                              <SelectItem value="flat">Flat Fee</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setShowPricingDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          Add Pricing Model
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              {loadingPricingModels ? (
                <div className="text-center py-8 text-muted-foreground">Loading pricing models...</div>
              ) : pricingModels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No pricing models found. Add one!</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingModels.map(pm => (
                      <TableRow key={pm.id}>
                        <TableCell>{pm.name}</TableCell>
                        <TableCell>{pm.description}</TableCell>
                        <TableCell>${pm.price}</TableCell>
                        <TableCell>{pm.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                            <Button variant="ghost" size="sm" onClick={() => handleEditApi(api)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => (api.status === 'pending' || api.status === 'rejected') ? handleDeleteApi(api) : undefined}
                              disabled={!(api.status === 'pending' || api.status === 'rejected')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
      {/* Edit API Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit API</DialogTitle>
            <DialogDescription>
              Update API details and associate pricing models.
            </DialogDescription>
          </DialogHeader>
          {editApiData && (
            <form onSubmit={handleSaveEditApi} className="space-y-4">
              {/* ...existing edit form code... */}
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete API Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete API</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this API? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteApi}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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