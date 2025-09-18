import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { CheckCircle, XCircle, RefreshCw, Clock, Eye, Users, BarChart3, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { marketplaceAPI } from '../../utils/api/marketplace'

// ...existing code...
interface PendingAPI {
  id: string
  name: string
  description: string
  category: string
  version: string
  providerId: string
  providerEmail: string
  providerName: string
  submittedAt: string
  endpointUrl?: string
}

interface ApprovedAPI {
  id: string
  name: string
  description: string
  category: string
  version: string
  providerId: string
  providerEmail: string
  providerName: string
  approvedAt: string
  endpointUrl?: string
  status: string
}
interface Analytics {
  totalUsers: number
  totalAPIs: number
  pendingAPIs: number
  rejectedAPIs: number
  totalSubscriptions: number
  totalRevenue: number
  totalAPICalls: number
}

export const AdminDashboard: React.FC = () => {
  const [approvedAPIs, setApprovedAPIs] = useState<ApprovedAPI[]>([])
  const { session } = useAuth()
  const [pendingAPIs, setPendingAPIs] = useState<PendingAPI[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedAPI, setSelectedAPI] = useState<PendingAPI | null>(null)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve')

  useEffect(() => {
    loadData()
  }, [session])

  const loadData = async () => {
    if (!session?.access_token) {
      console.log('❌ No access token available for admin')
      toast.error('Please log in as admin to access this dashboard')
      return
    }
    
    setLoading(true)
    try {
      // Load pending APIs, approved APIs, and analytics in parallel
      const [pendingResult, approvedResult, analyticsResult] = await Promise.all([
        marketplaceAPI.getPendingAPIs(session.access_token),
        marketplaceAPI.getApprovedAPIs(),
        marketplaceAPI.getAnalytics(session.access_token)
      ])

      if (pendingResult.error) {
        console.error('❌ Failed to load pending APIs:', pendingResult.error)
        toast.error('Failed to load pending APIs: ' + pendingResult.error)
      } else if (pendingResult.data) {
        setPendingAPIs(pendingResult.data)
      }

      if (approvedResult.error) {
        console.error('❌ Failed to load approved APIs:', approvedResult.error)
        toast.error('Failed to load approved APIs: ' + approvedResult.error)
      } else if (approvedResult.data) {
        setApprovedAPIs(approvedResult.data)
      }

      if (analyticsResult.error) {
        console.error('❌ Failed to load analytics:', analyticsResult.error)
        toast.error('Failed to load analytics: ' + analyticsResult.error)
      } else if (analyticsResult.data) {
        setAnalytics(analyticsResult.data)
      }

      toast.success(`Dashboard loaded - ${pendingResult.count || 0} pending APIs`)
    } catch (error) {
      console.error('❌ Exception loading admin data:', error)
      toast.error('Failed to load dashboard data - check console for details')
    } finally {
      setLoading(false)
    }
  }

  const handleReviewAPI = async (api: PendingAPI, action: 'approve' | 'reject') => {
    if (!session?.access_token) {
      toast.error('Not authenticated')
      return
    }

    setProcessing(api.id)
    try {
      console.log(`🔄 ${action === 'approve' ? 'Approving' : 'Rejecting'} API:`, api.name)
      
      const { data, error, message } = await marketplaceAPI.reviewAPI(api.id, action, session.access_token)
      
      if (error) {
        console.error(`❌ Failed to ${action} API:`, error)
        toast.error(`Failed to ${action} API: ` + error)
        return
      }

      if (data) {
        console.log(`✅ API ${action}d successfully:`, data.name)
        
        // Remove from pending list
        setPendingAPIs(prev => prev.filter(p => p.id !== api.id))
        
        // Update analytics
        await loadData()
        
        toast.success(message || `API ${action === 'approve' ? 'approved' : 'rejected'} successfully`)
      }
    } catch (error) {
      console.error(`❌ Exception ${action}ing API:`, error)
      toast.error(`Failed to ${action} API - check console for details`)
    } finally {
      setProcessing(null)
      setShowReviewDialog(false)
      setSelectedAPI(null)
    }
  }

  const openReviewDialog = (api: PendingAPI, action: 'approve' | 'reject') => {
    setSelectedAPI(api)
    setReviewAction(action)
    setShowReviewDialog(true)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
            <p>Loading admin dashboard...</p>
            <p className="text-sm text-muted-foreground mt-2">Fetching pending APIs and analytics</p>
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
          <h1>Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve APIs for the marketplace
          </p>
        </div>

        <Button 
          variant="outline" 
          onClick={loadData}
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Stats Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  <p className="text-2xl font-bold">{analytics.pendingAPIs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total APIs</p>
                  <p className="text-2xl font-bold">{analytics.totalAPIs}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{analytics.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-8 h-8 text-accent" />
                <div>
                  <p className="text-sm text-muted-foreground">Platform Revenue</p>
                  <p className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending APIs ({pendingAPIs.length})
          </TabsTrigger>
          <TabsTrigger value="approved">Approved APIs</TabsTrigger>
          <TabsTrigger value="analytics">Platform Analytics</TabsTrigger>
        
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span>APIs Awaiting Review</span>
              </CardTitle>
              <CardDescription>
                Review submitted APIs and approve or reject them for the marketplace
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingAPIs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>API Details</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingAPIs.map(api => (
                      <TableRow key={api.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{api.name}</p>
                            <p className="text-sm text-muted-foreground">{api.version}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs mt-1">
                              {api.description}
                            </p>
                            {api.endpointUrl && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Endpoint: {api.endpointUrl}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{api.providerName}</p>
                            <p className="text-sm text-muted-foreground">{api.providerEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{api.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{new Date(api.submittedAt).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(api.submittedAt).toLocaleTimeString()}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReviewDialog(api, 'approve')}
                              disabled={processing === api.id}
                              className="text-green-600 hover:text-green-700"
                            >
                              {processing === api.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openReviewDialog(api, 'reject')}
                              disabled={processing === api.id}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Pending APIs</h3>
                  <p className="text-muted-foreground">
                    All APIs have been reviewed. New submissions will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

<TabsContent value="approved">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>All Approved APIs</span>
              </CardTitle>
              <CardDescription>
                APIs approved for the marketplace from all providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvedAPIs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>API Details</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Approved</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedAPIs.map(api => (
                      <TableRow key={api.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{api.name}</p>
                            <p className="text-sm text-muted-foreground">{api.version}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs mt-1">
                              {api.description}
                            </p>
                            {api.endpointUrl && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Endpoint: {api.endpointUrl}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{api.providerName}</p>
                            <p className="text-sm text-muted-foreground">{api.providerEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{api.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <p className="text-sm">{new Date(api.approvedAt).toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(api.approvedAt).toLocaleTimeString()}
                            </p>
                            <Badge className="mt-1 bg-green-100 text-green-700 border-green-200" variant="outline">Approved</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Approved APIs</h3>
                  <p className="text-muted-foreground">
                    No APIs have been approved yet. Approved APIs will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Overview</CardTitle>
                <CardDescription>Key metrics and statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total APIs</span>
                      <span className="font-medium">{analytics.totalAPIs}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pending Review</span>
                      <span className="font-medium text-yellow-600">{analytics.pendingAPIs}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Rejected APIs</span>
                      <span className="font-medium text-red-600">{analytics.rejectedAPIs}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Subscriptions</span>
                      <span className="font-medium">{analytics.totalSubscriptions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total API Calls</span>
                      <span className="font-medium">{analytics.totalAPICalls.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Platform Revenue</span>
                      <span className="font-medium text-accent">${analytics.totalRevenue.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Loading analytics...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Activity timeline coming soon</p>
                  <p className="text-sm">Track API submissions, approvals, and usage</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve API' : 'Reject API'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'This API will be made available in the marketplace for consumers to subscribe to.'
                : 'This API will be rejected and removed from the review queue.'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedAPI && (
            <div className="py-4">
              <div className="space-y-2">
                <p><strong>Name:</strong> {selectedAPI.name}</p>
                <p><strong>Provider:</strong> {selectedAPI.providerEmail}</p>
                <p><strong>Category:</strong> {selectedAPI.category}</p>
                <p><strong>Description:</strong> {selectedAPI.description}</p>
                {selectedAPI.endpointUrl && (
                  <p><strong>Endpoint:</strong> {selectedAPI.endpointUrl}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedAPI && handleReviewAPI(selectedAPI, reviewAction)}
              className={reviewAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              disabled={!!processing}
            >
              {processing ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : reviewAction === 'approve' ? (
                <CheckCircle className="w-4 h-4 mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {reviewAction === 'approve' ? 'Approve API' : 'Reject API'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}