import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Search, Filter, Eye, Key, BarChart3, ExternalLink, TestTube, RefreshCw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { toast } from 'sonner'
import { useAuth } from '../auth/AuthContext'
import { marketplaceAPI } from '../../utils/api/marketplace'

interface API {
  id: string
  name: string
  description: string
  category: string
  version: string
  status: 'active' | 'deprecated'
  provider: string
  endpoints: number
  pricing: string
}

interface Subscription {
  id: string
  apiId: string
  apiName: string
  apiKey: string
  status: 'active' | 'pending' | 'suspended'
  usage: number
  quota: number
  subscribedAt: string
}

export const ConsumerDashboard: React.FC = () => {
  const { session } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedAPI, setSelectedAPI] = useState<API | null>(null)
  const [apis, setApis] = useState<API[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)

  // Load APIs and subscriptions on component mount
  useEffect(() => {
    loadData()
  }, [session])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load approved APIs
      const { data: apisData, error: apisError } = await marketplaceAPI.getApprovedAPIs()
      if (apisError) {
        toast.error('Failed to load APIs: ' + apisError)
      } else if (apisData) {
        // Transform backend data to frontend format
        const transformedAPIs = apisData.map(api => ({
          id: api.id,
          name: api.name,
          description: api.description,
          category: api.category,
          version: api.version,
          status: 'active' as const,
          provider: api.providerEmail,
          endpoints: 10, // Mock value since we don't store this yet
          pricing: 'Free tier: 1000 calls/month' // Mock value
        }))
        setApis(transformedAPIs)
      }

      // Load user subscriptions if authenticated
      if (session?.access_token) {
        const { data: subsData, error: subsError } = await marketplaceAPI.getUserSubscriptions(session.access_token)
        if (subsError) {
          toast.error('Failed to load subscriptions: ' + subsError)
        } else if (subsData) {
          setSubscriptions(subsData)
        }
      }
    } catch (error) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredAPIs = apis.filter(api => {
    const matchesSearch = api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      api.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || api.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(apis.map(api => api.category)))]

  const handleSubscribe = async (api: API) => {
    if (!session?.access_token) {
      toast.error('Please sign in to subscribe to APIs')
      return
    }

    try {
      const { data, error } = await marketplaceAPI.subscribeToAPI(api.id, session.access_token)

      if (error) {
        toast.error(error)
        return
      }

      if (data) {
        setSubscriptions(prev => [...prev, data])
        toast.success(`Successfully subscribed to ${api.name}!`)
      }
    } catch (error) {
      toast.error('Failed to subscribe to API')
    }
  }

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey)
    toast.success('API key copied to clipboard!')
  }

  const testAPI = async (subscription: Subscription) => {
    if (!session?.access_token) {
      toast.error('Please sign in to test APIs')
      return
    }

    setTesting(subscription.apiId)
    try {
      console.log('🧪 Testing API:', subscription.apiName)

      const testConfig = {
        endpoint: '/test',
        method: 'GET',
        headers: { 'X-API-Key': subscription.apiKey },
        body: null
      }

      const { data, error, usage } = await marketplaceAPI.testAPI(subscription.apiId, testConfig, session.access_token)

      if (error) {
        toast.error('API Test Failed: ' + error)
      } else if (data) {
        toast.success(`API Test Successful! Response: ${JSON.stringify(data.data)}`)

        // Update local usage count
        setSubscriptions(prev => prev.map(sub =>
          sub.apiId === subscription.apiId
            ? { ...sub, usage: usage?.current || sub.usage + 1 }
            : sub
        ))

        console.log('✅ API test successful:', data)
        console.log('📊 Usage stats:', usage)
      }
    } catch (error) {
      console.error('❌ Exception testing API:', error)
      toast.error('Failed to test API - check console for details')
    } finally {
      setTesting(null)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading marketplace...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1>API Consumer Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Discover, subscribe to, and manage your API integrations
        </p>
      </div>

      <Tabs defaultValue="marketplace" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="marketplace">API Marketplace</TabsTrigger>
          <TabsTrigger value="subscriptions">My Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="marketplace" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search APIs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === 'all' ? 'All Categories' : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* API Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAPIs.map(api => (
              <Card key={api.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{api.name}</CardTitle>
                      <CardDescription className="text-sm">
                        by {api.provider}
                      </CardDescription>
                    </div>
                    <Badge variant={api.status === 'active' ? 'default' : 'secondary'}>
                      {api.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{api.description}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{api.endpoints} endpoints</span>
                    <span>{api.version}</span>
                  </div>

                  <div className="text-sm">
                    <strong>Pricing:</strong> {api.pricing}
                  </div>

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedAPI(api)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{selectedAPI?.name}</DialogTitle>
                          <DialogDescription>
                            API Documentation and Details
                          </DialogDescription>
                        </DialogHeader>
                        {selectedAPI && (
                          <div className="space-y-4">
                            <div>
                              <h4>Description</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {selectedAPI.description}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <strong>Provider:</strong> {selectedAPI.provider}
                              </div>
                              <div>
                                <strong>Version:</strong> {selectedAPI.version}
                              </div>
                              <div>
                                <strong>Endpoints:</strong> {selectedAPI.endpoints}
                              </div>
                              <div>
                                <strong>Category:</strong> {selectedAPI.category}
                              </div>
                            </div>
                            <div>
                              <h4>Pricing</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {selectedAPI.pricing}
                              </p>
                            </div>
                            <Button
                              onClick={() => selectedAPI && handleSubscribe(selectedAPI)}
                              className="w-full"
                              disabled={!selectedAPI || subscriptions.some((sub: Subscription) => sub && selectedAPI && sub.apiId === selectedAPI.id)}
                            >
                              {selectedAPI && subscriptions.some((sub: Subscription) => sub && selectedAPI && sub.apiId === selectedAPI.id)
                                ? 'Already Subscribed'
                                : 'Subscribe to API'
                              }
                            </Button>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>

                    
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My API Subscriptions</CardTitle>
              <CardDescription>
                Manage your subscribed APIs and view usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptions.filter((sub: Subscription) => !!sub).map((subscription: Subscription) => (
                  <Card key={subscription.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <h4>{subscription.apiName}</h4>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                              {subscription.status}
                            </Badge>
                            <span>Subscribed: {subscription.subscribedAt}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testAPI(subscription)}
                              disabled={testing === subscription.apiId}
                            >
                              {testing === subscription.apiId ? (
                                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <TestTube className="w-4 h-4 mr-1" />
                              )}
                              Test API
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyApiKey(subscription.apiKey)}
                            >
                              <Key className="w-4 h-4 mr-1" />
                              Copy Key
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Usage: {subscription.usage.toLocaleString()} / {subscription.quota.toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((subscription.usage / subscription.quota) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {subscriptions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No API subscriptions yet</p>
                    <p className="text-sm">Browse the marketplace to find APIs to subscribe to</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}