// PricingModel type for API responses
export interface PricingModel {
  id: string
  name: string
  description: string
  price: number
  unit: string // e.g. 'per call', 'per month', 'flat'
}
import { projectId, publicAnonKey } from '../supabase/info'

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-a1f48247`

interface APIResponse<T> {
  data?: T
  error?: string
  message?: string
  count?: number
}

class MarketplaceAPI {
  // Pricing Model Endpoints
  async getProviderPricingModels(accessToken: string): Promise<APIResponse<PricingModel[]>> {
    return this.authenticatedRequest<PricingModel[]>('/pricing-models', accessToken)
  }

  async createPricingModel(modelData: any, accessToken: string): Promise<APIResponse<any>> {
    return this.authenticatedRequest('/pricing-models', accessToken, {
      method: 'POST',
      body: JSON.stringify(modelData)
    })
  }

  async updatePricingModel(modelId: string, modelData: any, accessToken: string): Promise<APIResponse<any>> {
    return this.authenticatedRequest(`/pricing-models/${modelId}`, accessToken, {
      method: 'PUT',
      body: JSON.stringify(modelData)
    })
  }
  async getLiveActivities(accessToken: string): Promise<APIResponse<any>> {
    return this.authenticatedRequest('/activity/live', accessToken)
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`)

      // Use publicAnonKey as default authorization for public endpoints
      const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers  // This will override Authorization if provided
        }
      })

      console.log(`📡 Response status: ${response.status}`)

      const result = await response.json()

      if (!response.ok) {
        console.error(`❌ API Error (${response.status}):`, result)

        if (response.status === 401) {
          return { error: `Authentication failed (401): ${result.error || 'Invalid or expired token'}` }
        }

        return { error: result.error || `Request failed with status ${response.status}` }
      }

      console.log(`✅ API Success:`, result.message || 'Request completed')
      return result
    } catch (error) {
      console.error('❌ Network error:', error)
      return { error: 'Network error - check your connection' }
    }
  }

  private async authenticatedRequest<T>(endpoint: string, accessToken: string, options: RequestInit = {}): Promise<APIResponse<T>> {
    console.log(`🔐 Authenticated request: ${endpoint}`)
    console.log(`🔑 Using access token: ${accessToken.substring(0, 20)}...`)

    return this.request<T>(endpoint, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,  // Override with user token
        ...options.headers
      }
    })
  }

  // =================
  // PUBLIC ENDPOINTS
  // =================

  async getApprovedAPIs(): Promise<APIResponse<any[]>> {
    return this.request('/apis')
  }

  async getBroadcasts(): Promise<APIResponse<any[]>> {
    return this.request('/broadcasts')
  }

  async healthCheck(): Promise<APIResponse<any>> {
    return this.request('/health')
  }

  async debugKVStore(): Promise<APIResponse<any>> {
    console.log('🔍 Frontend: Checking KV store contents')
    return this.request('/debug/kv')
  }

  async cleanupCorruptedData(): Promise<APIResponse<any>> {
    console.log('🧹 Frontend: Cleaning up corrupted data')
    return this.request('/debug/cleanup', { method: 'POST' })
  }

  async adminGetPendingAPIs(accessToken: string): Promise<APIResponse<any>> {
    console.log('👨‍💼 Frontend: Getting pending APIs (admin view)')
    return this.authenticatedRequest('/apis/pending', accessToken)
  }

  async getParticipants(accessToken: string): Promise<APIResponse<any>> {
    return this.authenticatedRequest('/participants', accessToken)
  }

  // =================
  // PROVIDER ENDPOINTS
  // =================

  async submitAPI(apiData: any, accessToken: string): Promise<APIResponse<any>> {
    console.log('🚀 Frontend: Submitting API:', apiData.name)
    console.log('📝 Frontend: API data:', apiData)
    console.log('🔐 Frontend: Access token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING')

    const result = await this.authenticatedRequest('/apis', accessToken, {
      method: 'POST',
      body: JSON.stringify(apiData)
    })

    console.log('📨 Frontend: Submit API result:', result)
    return result
  }

  async getUserAPIs(accessToken: string): Promise<APIResponse<any[]>> {
    console.log('📋 Frontend: Getting user APIs')
    console.log('🔐 Frontend: Access token:', accessToken ? `${accessToken.substring(0, 20)}...` : 'MISSING')

  const result = await this.authenticatedRequest('/my-apis', accessToken)

  console.log('📨 Frontend: Get user APIs result:', result)
  return result as APIResponse<any[]>
  }

  // =================
  // CONSUMER ENDPOINTS
  // =================

  async subscribeToAPI(apiId: string, accessToken: string): Promise<APIResponse<any>> {
    console.log('📱 Subscribing to API:', apiId)
    return this.authenticatedRequest(`/apis/${apiId}/subscribe`, accessToken, {
      method: 'POST'
    })
  }

  async getUserSubscriptions(accessToken: string): Promise<APIResponse<any[]>> {
    return this.authenticatedRequest('/subscriptions', accessToken)
  }

  async testAPI(apiId: string, testConfig: any, accessToken: string): Promise<APIResponse<any>> {
    console.log('🧪 Testing API:', apiId)
    return this.authenticatedRequest(`/test-api/${apiId}`, accessToken, {
      method: 'POST',
      body: JSON.stringify(testConfig)
    })
  }

  // =================
  // ADMIN ENDPOINTS
  // =================

  async getPendingAPIs(accessToken: string): Promise<APIResponse<any[]>> {
    return this.authenticatedRequest('/apis/pending', accessToken)
  }

  async reviewAPI(apiId: string, action: 'approve' | 'reject', accessToken: string): Promise<APIResponse<any>> {
    console.log(`⚖️ ${action === 'approve' ? 'Approving' : 'Rejecting'} API:`, apiId)
    return this.authenticatedRequest(`/apis/${apiId}/review`, accessToken, {
      method: 'POST',
      body: JSON.stringify({ action })
    })
  }

  async getAnalytics(accessToken: string): Promise<APIResponse<any>> {
    return this.authenticatedRequest('/analytics', accessToken)
  }

  // =================
  // FACILITATOR ENDPOINTS
  // =================

  async sendBroadcast(message: string, type: string, accessToken: string): Promise<APIResponse<any>> {
    console.log('📢 Sending broadcast:', message)
    return this.authenticatedRequest('/broadcast', accessToken, {
      method: 'POST',
      body: JSON.stringify({ message, type })
    })
  }

  async resetEnvironment(accessToken: string): Promise<APIResponse<any>> {
    console.log('🔄 Resetting environment')
    return this.authenticatedRequest('/reset-environment', accessToken, {
      method: 'POST'
    })
  }
}

export const marketplaceAPI = new MarketplaceAPI()