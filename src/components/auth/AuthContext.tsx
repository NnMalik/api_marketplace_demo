import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../utils/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export type UserRole = 'consumer' | 'provider' | 'admin' | 'facilitator'

interface AuthContextType {
  user: User | null
  session: Session | null
  role: UserRole | null
  loading: boolean
  signInWithEmail: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, role: UserRole) => Promise<{ error: any }>
  signOut: () => Promise<void>
  setUserRole: (role: UserRole) => void
  refreshSession: () => Promise<{ session?: Session | null, error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ Error getting session:', error)
      }
      
      console.log('🔄 Initial session check:', session ? 'Session found' : 'No session')
      if (session) {
        console.log('👤 Session user:', session.user.email, 'Role:', session.user.user_metadata?.role)
        console.log('🔑 Access token:', session.access_token.substring(0, 20) + '...')
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const userRole = session.user.user_metadata?.role as UserRole
        setRole(userRole || null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Auth state change:', event, session ? 'Session exists' : 'No session')
      
      if (session) {
        console.log('👤 New session user:', session.user.email, 'Role:', session.user.user_metadata?.role)
        console.log('🔑 New access token:', session.access_token.substring(0, 20) + '...')
      }
      
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        const userRole = session.user.user_metadata?.role as UserRole
        setRole(userRole || null)
      } else {
        setRole(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    console.log('🔄 Signing in:', email)
    const result = await supabase.auth.signInWithPassword({ email, password })
    
    if (result.error) {
      console.error('❌ Sign in error:', result.error)
    } else if (result.data.session) {
      console.log('✅ Sign in successful:', result.data.user?.email)
      console.log('🔑 Access token:', result.data.session.access_token.substring(0, 20) + '...')
    }
    
    return result
  }

  const signUp = async (email: string, password: string, userRole: UserRole) => {
    // Use our custom signup endpoint to properly set role
    const { projectId, publicAnonKey } = await import('../../utils/supabase/info')
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-a1f48247/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email,
          password,
          role: userRole,
          name: email.split('@')[0]
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        return { error: result.error || 'Signup failed' }
      }
      
      return { error: null }
    } catch (error) {
      return { error: 'Network error during signup' }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const setUserRole = (newRole: UserRole) => {
    setRole(newRole)
  }

  const refreshSession = async () => {
    console.log('🔄 Refreshing session...')
    const { data: { session }, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('❌ Session refresh error:', error)
      return { error }
    }
    
    if (session) {
      console.log('✅ Session refreshed successfully')
      console.log('🔑 New access token:', session.access_token.substring(0, 20) + '...')
      setSession(session)
      setUser(session.user)
      if (session.user) {
        const userRole = session.user.user_metadata?.role as UserRole
        setRole(userRole || null)
      }
    }
    
    return { session, error: null }
  }

  const value = {
    user,
    session,
    role,
    loading,
    signInWithEmail,
    signUp,
    signOut,
    setUserRole,
    refreshSession
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}