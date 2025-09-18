import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Play, 
  Copy, 
  Download, 
  Save, 
  History, 
  Key,
  Globe,
  Code2,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner@2.0.3'

interface APIEndpoint {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  parameters: Parameter[]
  headers: Header[]
  bodyType?: 'json' | 'form' | 'text'
}

interface Parameter {
  name: string
  type: 'string' | 'number' | 'boolean'
  required: boolean
  description: string
  example?: string
}

interface Header {
  name: string
  value: string
  required: boolean
}

interface RequestHistory {
  id: string
  method: string
  url: string
  status: number
  timestamp: string
  duration: number
}

export const APIPlayground: React.FC = () => {
  const [selectedAPI, setSelectedAPI] = useState<string>('')
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)
  const [baseUrl, setBaseUrl] = useState('https://api.example.com')
  const [apiKey, setApiKey] = useState('')
  const [customHeaders, setCustomHeaders] = useState<{ [key: string]: string }>({})
  const [requestBody, setRequestBody] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [requestHistory, setRequestHistory] = useState<RequestHistory[]>([
    {
      id: '1',
      method: 'GET',
      url: '/weather/current?city=London',
      status: 200,
      timestamp: '2024-01-26 10:30:15',
      duration: 245
    },
    {
      id: '2',
      method: 'POST',
      url: '/auth/token',
      status: 201,
      timestamp: '2024-01-26 10:25:30',
      duration: 180
    }
  ])

  // Mock API data
  const apis = [
    { id: 'weather', name: 'Weather API' },
    { id: 'auth', name: 'Authentication API' },
    { id: 'payment', name: 'Payment Gateway' }
  ]

  const endpoints: { [key: string]: APIEndpoint[] } = {
    weather: [
      {
        id: 'current-weather',
        name: 'Get Current Weather',
        method: 'GET',
        path: '/weather/current',
        description: 'Get current weather data for a specific location',
        parameters: [
          {
            name: 'city',
            type: 'string',
            required: true,
            description: 'City name',
            example: 'London'
          },
          {
            name: 'units',
            type: 'string',
            required: false,
            description: 'Temperature units (metric, imperial)',
            example: 'metric'
          }
        ],
        headers: [
          { name: 'Authorization', value: 'Bearer {api_key}', required: true },
          { name: 'Content-Type', value: 'application/json', required: true }
        ]
      },
      {
        id: 'forecast',
        name: 'Get Weather Forecast',
        method: 'GET',
        path: '/weather/forecast',
        description: 'Get 5-day weather forecast',
        parameters: [
          {
            name: 'city',
            type: 'string',
            required: true,
            description: 'City name',
            example: 'New York'
          },
          {
            name: 'days',
            type: 'number',
            required: false,
            description: 'Number of forecast days (1-5)',
            example: '5'
          }
        ],
        headers: [
          { name: 'Authorization', value: 'Bearer {api_key}', required: true }
        ]
      }
    ],
    auth: [
      {
        id: 'login',
        name: 'User Login',
        method: 'POST',
        path: '/auth/login',
        description: 'Authenticate user and receive access token',
        parameters: [],
        headers: [
          { name: 'Content-Type', value: 'application/json', required: true }
        ],
        bodyType: 'json'
      }
    ]
  }

  const handleAPIChange = (apiId: string) => {
    setSelectedAPI(apiId)
    setSelectedEndpoint(null)
    setResponse(null)
    setResponseStatus(null)
  }

  const handleEndpointChange = (endpointId: string) => {
    const endpoint = endpoints[selectedAPI]?.find(e => e.id === endpointId)
    setSelectedEndpoint(endpoint || null)
    setResponse(null)
    setResponseStatus(null)
    
    // Set default request body for POST/PUT requests
    if (endpoint && (endpoint.method === 'POST' || endpoint.method === 'PUT')) {
      if (endpoint.bodyType === 'json') {
        setRequestBody('{\n  "email": "user@example.com",\n  "password": "password123"\n}')
      }
    } else {
      setRequestBody('')
    }
  }

  const buildRequestUrl = () => {
    if (!selectedEndpoint) return ''
    
    let url = baseUrl + selectedEndpoint.path
    
    // Add query parameters if it's a GET request
    if (selectedEndpoint.method === 'GET' && selectedEndpoint.parameters.length > 0) {
      const params = selectedEndpoint.parameters
        .filter(p => p.example)
        .map(p => `${p.name}=${encodeURIComponent(p.example!)}`)
        .join('&')
      
      if (params) {
        url += '?' + params
      }
    }
    
    return url
  }

  const executeRequest = async () => {
    if (!selectedEndpoint) {
      toast.error('Please select an endpoint')
      return
    }

    setLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500))
      
      // Mock response data
      const mockResponse = {
        data: selectedEndpoint.method === 'GET' ? {
          city: 'London',
          temperature: 22,
          humidity: 65,
          description: 'Partly cloudy'
        } : {
          success: true,
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          expiresIn: 3600
        },
        timestamp: new Date().toISOString()
      }
      
      const status = Math.random() > 0.1 ? 200 : 400 // 90% success rate
      
      setResponse(mockResponse)
      setResponseStatus(status)
      
      // Add to history
      const historyEntry: RequestHistory = {
        id: Date.now().toString(),
        method: selectedEndpoint.method,
        url: selectedEndpoint.path,
        status,
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        duration: Math.floor(Math.random() * 500 + 100)
      }
      
      setRequestHistory(prev => [historyEntry, ...prev.slice(0, 9)]) // Keep last 10
      
      if (status === 200) {
        toast.success('Request executed successfully')
      } else {
        toast.error('Request failed')
      }
    } catch (error) {
      toast.error('Failed to execute request')
      setResponseStatus(500)
      setResponse({ error: 'Internal server error' })
    } finally {
      setLoading(false)
    }
  }

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2))
      toast.success('Response copied to clipboard')
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'default'
    if (status >= 400 && status < 500) return 'destructive'
    if (status >= 500) return 'destructive'
    return 'secondary'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1>API Playground</h1>
        <p className="text-muted-foreground mt-2">
          Test your subscribed APIs with an interactive REST client
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>API Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select API</Label>
                <Select value={selectedAPI} onValueChange={handleAPIChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an API" />
                  </SelectTrigger>
                  <SelectContent>
                    {apis.map(api => (
                      <SelectItem key={api.id} value={api.id}>
                        {api.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAPI && (
                <div className="space-y-2">
                  <Label>Endpoint</Label>
                  <Select onValueChange={handleEndpointChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an endpoint" />
                    </SelectTrigger>
                    <SelectContent>
                      {endpoints[selectedAPI]?.map(endpoint => (
                        <SelectItem key={endpoint.id} value={endpoint.id}>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {endpoint.method}
                            </Badge>
                            <span>{endpoint.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className="pl-10"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Request History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="w-5 h-5" />
                <span>Request History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {requestHistory.map(request => (
                  <div key={request.id} className="p-2 rounded border text-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {request.method}
                        </Badge>
                        <Badge variant={getStatusColor(request.status)} className="text-xs">
                          {request.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {request.duration}ms
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {request.url}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.timestamp}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Request/Response Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedEndpoint && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Badge variant="outline">{selectedEndpoint.method}</Badge>
                      <span>{selectedEndpoint.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {selectedEndpoint.description}
                    </CardDescription>
                  </div>
                  <Button onClick={executeRequest} disabled={loading}>
                    <Play className="w-4 h-4 mr-2" />
                    {loading ? 'Sending...' : 'Send Request'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="request" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="request">Request</TabsTrigger>
                    <TabsTrigger value="response">Response</TabsTrigger>
                  </TabsList>

                  <TabsContent value="request" className="space-y-4">
                    {/* Request URL */}
                    <div className="space-y-2">
                      <Label>Request URL</Label>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{selectedEndpoint.method}</Badge>
                        <Input
                          value={buildRequestUrl()}
                          readOnly
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>

                    {/* Parameters */}
                    {selectedEndpoint.parameters.length > 0 && (
                      <div className="space-y-2">
                        <Label>Parameters</Label>
                        <div className="space-y-2">
                          {selectedEndpoint.parameters.map(param => (
                            <div key={param.name} className="grid grid-cols-3 gap-2 items-center text-sm">
                              <div className="flex items-center space-x-1">
                                <span className="font-mono">{param.name}</span>
                                {param.required && <span className="text-red-500">*</span>}
                              </div>
                              <Input
                                placeholder={param.example || `Enter ${param.name}`}
                                className="text-sm"
                              />
                              <span className="text-muted-foreground text-xs">
                                {param.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Body */}
                    {selectedEndpoint.bodyType && (
                      <div className="space-y-2">
                        <Label>Request Body ({selectedEndpoint.bodyType})</Label>
                        <Textarea
                          value={requestBody}
                          onChange={(e) => setRequestBody(e.target.value)}
                          rows={8}
                          className="font-mono text-sm"
                          placeholder="Enter request body..."
                        />
                      </div>
                    )}

                    {/* Headers */}
                    <div className="space-y-2">
                      <Label>Headers</Label>
                      <div className="space-y-2">
                        {selectedEndpoint.headers.map(header => (
                          <div key={header.name} className="grid grid-cols-2 gap-2 text-sm">
                            <Input
                              value={header.name}
                              readOnly
                              className="font-mono"
                            />
                            <Input
                              value={header.value.replace('{api_key}', apiKey || '{api_key}')}
                              className="font-mono"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="response" className="space-y-4">
                    {responseStatus && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">Status:</span>
                          <Badge variant={getStatusColor(responseStatus)}>
                            {responseStatus}
                          </Badge>
                          {responseStatus >= 200 && responseStatus < 300 ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={copyResponse}>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      </div>
                    )}

                    {response ? (
                      <div className="space-y-2">
                        <Label>Response Body</Label>
                        <Textarea
                          value={JSON.stringify(response, null, 2)}
                          readOnly
                          rows={12}
                          className="font-mono text-sm bg-muted"
                        />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Send a request to see the response</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {!selectedEndpoint && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an API and endpoint to start testing</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}