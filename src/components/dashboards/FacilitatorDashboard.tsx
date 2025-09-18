import React, { useState } from 'react'
import { marketplaceAPI } from '../../utils/api/marketplace'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { useAuth } from '../auth/AuthContext'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Label } from '../ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { 
  Users, 
  RefreshCw, 
  MessageSquare, 
  Send, 
  Activity, 
  Clock,
  UserCheck,
  UserX,
  BarChart3,
  AlertCircle,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react'
import { Alert, AlertDescription } from '../ui/alert'
import { toast } from 'sonner'

interface Participant {
  id: string
  email: string
  role: 'consumer' | 'provider' | 'admin'
  status: 'online' | 'offline' | 'idle'
  joinedAt: string
  lastActivity: string
  actionsCompleted: number
  totalActions: number
}

interface SessionActivity {
  id: string
  participant: string
  action: string
  timestamp: string
  status: 'success' | 'error' | 'pending'
}

interface BroadcastMessage {
  id: string
  message: string
  timestamp: string
  type: 'info' | 'warning' | 'success'
}

export const FacilitatorDashboard: React.FC = () => {
  const [liveActivities, setLiveActivities] = useState<SessionActivity[]>([])
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([])
  const { session } = useAuth()
  const [participants, setParticipants] = useState<Participant[]>([])

  React.useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const result = await marketplaceAPI.getParticipants(session?.access_token || '')
        if (Array.isArray(result?.data)) {
          setParticipants(result.data)
        } else {
          setParticipants([])
        }
        if (result.error) {
          toast.error(result.error)
        }
      } catch (err) {
        setParticipants([])
        toast.error('Failed to fetch participants')
      }
    }
      const fetchLiveParticipants = async () => {
        try {
          const result = await marketplaceAPI.getLiveParticipants(session?.access_token || '')
          if (Array.isArray(result?.data)) {
            setLiveParticipants(result.data)
          } else {
            setLiveParticipants([])
          }
          if (result.error) {
            toast.error(result.error)
          }
        } catch (err) {
          setLiveParticipants([])
          toast.error('Failed to fetch live participants')
        }
      }
    fetchParticipants()
    fetchLiveParticipants()
    const fetchLiveActivities = async () => {
      try {
        const result = await marketplaceAPI.getLiveActivities(session?.access_token || '')
        if (Array.isArray(result?.data)) {
          setLiveActivities(result.data)
        } else {
          setLiveActivities([])
        }
        if (result.error) {
          toast.error(result.error)
        }
      } catch (err) {
        setLiveActivities([])
        toast.error('Failed to fetch live activities')
      }
    }
    fetchLiveActivities()
  }, [])

  // sessionActivities removed, now fetched from server

  const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([
    {
      id: '1',
      message: 'Workshop session started. Welcome everyone!',
      timestamp: '2024-01-26 09:00',
      type: 'info'
    },
    {
      id: '2',
      message: 'Please complete the API subscription exercise by 10:30 AM',
      timestamp: '2024-01-26 09:30',
      type: 'warning'
    }
  ])

  const [newMessage, setNewMessage] = useState('')
  const [messageType, setMessageType] = useState<'info' | 'warning' | 'success'>('info')
  const [sessionStatus, setSessionStatus] = useState<'active' | 'paused'>('active')

  const handleSendBroadcast = () => {
    if (!newMessage.trim()) {
      toast.error('Please enter a message')
      return
    }

    const broadcast: BroadcastMessage = {
      id: Date.now().toString(),
      message: newMessage,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: messageType
    }

    setBroadcastMessages(prev => [broadcast, ...prev])
    setNewMessage('')
    toast.success('Message broadcasted to all participants')
  }

  const handleResetEnvironment = async () => {
    try {
      // Simulate API call to reset environment
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Reset participant progress
      setParticipants(prev => prev.map(p => ({
        ...p,
        actionsCompleted: 0,
        status: 'online' as const
      })))
      
      toast.success('Environment reset successfully')
    } catch (error) {
      toast.error('Failed to reset environment')
    }
  }

  const toggleSessionStatus = () => {
    const newStatus = sessionStatus === 'active' ? 'paused' : 'active'
    setSessionStatus(newStatus)
    
    const message = newStatus === 'paused' 
      ? 'Workshop session paused. Please wait for further instructions.'
      : 'Workshop session resumed. You may continue with the exercises.'
    
    const broadcast: BroadcastMessage = {
      id: Date.now().toString(),
      message,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: newStatus === 'paused' ? 'warning' : 'success'
    }
    
    setBroadcastMessages(prev => [broadcast, ...prev])
    toast.success(`Session ${newStatus}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'default'
      case 'idle': return 'secondary'
      case 'offline': return 'destructive'
      default: return 'secondary'
    }
  }

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'default'
      case 'error': return 'destructive'
      case 'pending': return 'secondary'
      default: return 'secondary'
    }
  }

  const onlineParticipants = participants.filter(p => p.status === 'online').length
  const averageProgress = participants.reduce((sum, p) => sum + (p.actionsCompleted / p.totalActions), 0) / participants.length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Workshop Facilitator</h1>
          <p className="text-muted-foreground mt-2">
            Manage your training session and guide participants through the API marketplace
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={sessionStatus === 'active' ? 'default' : 'secondary'} className="px-3 py-1">
            {sessionStatus === 'active' ? 'Session Active' : 'Session Paused'}
          </Badge>
          <Button
            variant="outline"
            onClick={toggleSessionStatus}
          >
            {sessionStatus === 'active' ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {sessionStatus === 'active' ? 'Pause Session' : 'Resume Session'}
          </Button>
        </div>
      </div>

      {/* Session Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Participants Online</p>
                <p className="text-2xl font-bold">{onlineParticipants}/{participants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              <div>
                <p className="text-sm text-muted-foreground">Average Progress</p>
                <p className="text-2xl font-bold">{Math.round(averageProgress * 100)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Session Duration</p>
                <p className="text-2xl font-bold">1h 30m</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="participants" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="activity">Live Activity</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
          <TabsTrigger value="controls">Session Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <CardTitle>Workshop Participants</CardTitle>
              <CardDescription>
                Monitor participant progress and activity status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Participant</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map(participant => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">{participant.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{participant.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(participant.status)}>
                          {participant.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-secondary rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${(participant.actionsCompleted / participant.totalActions) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {participant.actionsCompleted}/{participant.totalActions}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{participant.joinedAt}</TableCell>
                      <TableCell>{participant.lastActivity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Live Activity Feed</CardTitle>
              <CardDescription>
                Real-time updates from all workshop participants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {liveActivities.length > 0 ? (
                  liveActivities.map(activity => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                      <div className="flex-shrink-0">
                        <Badge variant={getActivityStatusColor(activity.status)} className="mt-1">
                          {activity.status}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.participant}</p>
                        <p className="text-sm text-muted-foreground">{activity.action}</p>
                        <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">No live activities found.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Send Broadcast Message</CardTitle>
                <CardDescription>
                  Send messages to all workshop participants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="message-type">Message Type</Label>
                  <select
                    id="message-type"
                    value={messageType}
                    onChange={(e) => setMessageType(e.target.value as 'info' | 'warning' | 'success')}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="info">Information</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success/Announcement</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Enter your message to all participants..."
                    rows={4}
                  />
                </div>
                <Button onClick={handleSendBroadcast} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Broadcast
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Broadcasts</CardTitle>
                <CardDescription>
                  Messages sent to participants
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {broadcastMessages.map(message => (
                    <Alert key={message.id} className={
                      message.type === 'warning' ? 'border-yellow-500' :
                      message.type === 'success' ? 'border-green-500' : ''
                    }>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="text-sm">{message.message}</p>
                          <p className="text-xs text-muted-foreground">{message.timestamp}</p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="controls">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Environment Controls</CardTitle>
                <CardDescription>
                  Manage the workshop environment and participant data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Environment reset will clear all participant progress, API subscriptions, and published APIs. This action cannot be undone.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="destructive" 
                  onClick={handleResetEnvironment}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset Environment
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common facilitator actions for workshop management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <UserCheck className="w-4 h-4 mr-2" />
                  Mark All Present
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Send Exercise Instructions
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="w-4 h-4 mr-2" />
                  Set Session Timer
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Export Session Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}