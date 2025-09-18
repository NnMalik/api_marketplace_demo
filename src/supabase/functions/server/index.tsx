import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Supabase client for server operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Utility function to verify user authentication
async function verifyAuth(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.split(' ')[1];
  console.log('🔍 Verifying token:', token.substring(0, 20) + '...');
  
  // Check if it's the anon key (public requests)
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (token === anonKey) {
    console.log('⚠️ Request using anon key - no user authentication');
    return { user: null, error: 'Authentication required' };
  }
  
  // Verify user JWT token
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.log('❌ Token verification failed:', error?.message);
    return { user: null, error: 'Invalid or expired token' };
  }
  
  console.log('✅ User authenticated:', user.email);
  return { user, error: null };
}

// Generate unique API ID
function generateAPIId(): string {
  return `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Health check endpoint
app.get("/make-server-a1f48247/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Debug endpoint to check KV store
app.get("/make-server-a1f48247/debug/kv", async (c) => {
  try {
    console.log('🔍 Debug: Checking KV store contents...');
    
    const pendingAPIs = await kv.getByPrefix('api:pending:');
    const approvedAPIs = await kv.getByPrefix('api:approved:');
    const rejectedAPIs = await kv.getByPrefix('api:rejected:');
    const users = await kv.getByPrefix('user:');
    
    // Identify corrupted entries
    // Note: getByPrefix returns just the values, not {key, value} objects
    const corruptedPending = pendingAPIs.filter(api => !api || typeof api !== 'object' || !api.name);
    const corruptedApproved = approvedAPIs.filter(api => !api || typeof api !== 'object' || !api.name);
    const corruptedRejected = rejectedAPIs.filter(api => !api || typeof api !== 'object' || !api.name);
    
    const debug = {
      timestamp: new Date().toISOString(),
      kvCounts: {
        pendingAPIs: pendingAPIs.length,
        approvedAPIs: approvedAPIs.length,
        rejectedAPIs: rejectedAPIs.length,
        users: users.length
      },
      corruptedCounts: {
        pending: corruptedPending.length,
        approved: corruptedApproved.length,
        rejected: corruptedRejected.length
      },
      pendingAPIDetails: pendingAPIs.map((api, index) => ({
        index: index + 1,
        name: api?.name || 'CORRUPTED',
        provider: api?.providerEmail || 'CORRUPTED',
        status: api?.status || 'CORRUPTED',
        isValid: !!(api && typeof api === 'object' && api.name),
        rawType: typeof api
      })),
      sampleCorruptedData: corruptedPending.slice(0, 3) // Show first 3 corrupted entries
    };
    
    console.log('🔍 Debug KV contents:', debug);
    
    return c.json(debug);
  } catch (error) {
    console.log('❌ Debug KV error:', error);
    return c.json({ error: 'Debug failed', details: error.message }, 500);
  }
});

// Cleanup corrupted entries - DISABLED (KV store limitation)
app.post("/make-server-a1f48247/debug/cleanup", async (c) => {
  return c.json({ 
    error: 'Cleanup temporarily disabled - KV store returns values only, not keys',
    message: 'Use the Supabase UI to manually clean the database if needed'
  });
});

// Signup endpoint with role assignment
app.post("/make-server-a1f48247/signup", async (c) => {
  try {
    const { email, password, role, name } = await c.req.json();
    
    console.log(`🔄 Signup attempt: ${email} as ${role}`);
    
    if (!email || !password || !role) {
      console.log('❌ Signup failed: Missing required fields');
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        role,
        name: name || email.split('@')[0]
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('❌ Signup error:', error.message);
      return c.json({ error: error.message }, 400);
    }

    // Store user profile in KV store
    if (data.user) {
      const userProfile = {
        id: data.user.id,
        email,
        role,
        name: name || email.split('@')[0],
        status: 'active',
        joinedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      };
      
      await kv.set(`user:${data.user.id}`, userProfile);
      console.log(`✅ User created successfully: ${email} (${role})`);
    }

    return c.json({ data, error: null });
  } catch (error) {
    console.log('❌ Signup error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// =================
// PROVIDER ENDPOINTS
// =================

// Provider: Submit API for approval
app.post("/make-server-a1f48247/apis", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('🔐 Auth header:', authHeader ? 'Present' : 'Missing');
    
    const { user, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      console.log('❌ API submission failed: Authentication error:', authError);
      return c.json({ error: 'Unauthorized: ' + (authError || 'No user') }, 401);
    }

    console.log('👤 Authenticated user:', { id: user.id, email: user.email, role: user.user_metadata?.role });

    const apiData = await c.req.json();
    console.log('📝 Received API data:', apiData);
    
    const apiId = generateAPIId();
    console.log('🆔 Generated API ID:', apiId);
    
    // Validate required fields
    if (!apiData.name || !apiData.description || !apiData.category) {
      console.log('❌ API submission failed: Missing required fields');
      return c.json({ error: 'Missing required fields: name, description, category' }, 400);
    }
    
    const api = {
      id: apiId,
      name: apiData.name,
      description: apiData.description,
      category: apiData.category,
      version: apiData.version || '1.0',
      endpointUrl: apiData.endpointUrl || '',
      providerId: user.id,
      providerEmail: user.email,
      providerName: user.user_metadata?.name || user.email.split('@')[0],
      status: 'pending',
      submittedAt: new Date().toISOString(),
      subscribers: 0,
      totalCalls: 0,
      revenue: 0,
      monthlyRevenue: 0,
      lastUsed: null
    };

    console.log('💾 Storing API with key:', `api:pending:${apiId}`);
    console.log('📊 API object to store:', api);

    // Store as pending API
    const storeResult = await kv.set(`api:pending:${apiId}`, api);
    console.log('💾 KV store result:', storeResult);
    
    // Immediately verify it was stored
    const verifyStored = await kv.get(`api:pending:${apiId}`);
    console.log('🔍 Verification - API retrieved:', verifyStored ? 'SUCCESS' : 'FAILED');
    
    if (verifyStored) {
      console.log('✅ Stored API details:');
      console.log('   Type:', typeof verifyStored);
      console.log('   Has name:', !!(verifyStored.name));
      console.log('   Name:', verifyStored.name);
      console.log('   Provider ID:', verifyStored.providerId);
      console.log('   Full object:', JSON.stringify(verifyStored, null, 2));
      console.log('✅ API submitted and verified successfully:', api.name);
    } else {
      console.log('❌ API submission failed - not found after storage');
      return c.json({ error: 'Failed to store API' }, 500);
    }
    
    // Also test immediate retrieval by prefix to see if it shows up
    console.log('🔍 Testing immediate prefix retrieval...');
    const testRetrieval = await kv.getByPrefix('api:pending:');
    console.log(`   Found ${testRetrieval.length} pending APIs via prefix`);
    testRetrieval.forEach((item, index) => {
      console.log(`   ${index + 1}. Key: ${item.key}, Name: ${item.value?.name || 'NO NAME'}`);
    });
    
    return c.json({ 
      data: api,
      message: 'API submitted for review successfully'
    });
  } catch (error) {
    console.log('❌ Submit API error:', error);
    return c.json({ error: 'Failed to submit API: ' + error.message }, 500);
  }
});

// Provider: Get their own APIs (all statuses)
app.get("/make-server-a1f48247/my-apis", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('🔐 Get user APIs - Auth header:', authHeader ? 'Present' : 'Missing');
    
    const { user, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      console.log('❌ Get user APIs failed: Authentication error:', authError);
      return c.json({ error: 'Unauthorized: ' + (authError || 'No user') }, 401);
    }

    console.log(`👤 Loading APIs for provider: ${user.email} (ID: ${user.id})`);

    // Get APIs from all statuses for this provider
    console.log('🔍 Searching for APIs with prefixes...');
    
    const pending = await kv.getByPrefix('api:pending:');
    console.log(`📋 Found ${pending.length} pending APIs total`);
    
    const approved = await kv.getByPrefix('api:approved:');
    console.log(`📋 Found ${approved.length} approved APIs total`);
    
    const rejected = await kv.getByPrefix('api:rejected:');
    console.log(`📋 Found ${rejected.length} rejected APIs total`);
    
    console.log(`🔍 Raw entries breakdown:`);
    console.log(`   - Pending: ${pending.length} entries`);
    console.log(`   - Approved: ${approved.length} entries`);
    console.log(`   - Rejected: ${rejected.length} entries`);
    
    // Debug each pending entry in detail
    // NOTE: getByPrefix returns just the values, not {key, value} objects
    if (pending.length > 0) {
      console.log(`🔍 Detailed pending entries:`);
      pending.forEach((api, index) => {
        console.log(`   ${index + 1}. API object:`);
        console.log(`       Value type: ${typeof api}`);
        console.log(`       Has name: ${!!(api && api.name)}`);
        console.log(`       Provider ID: ${api?.providerId}`);
        console.log(`       Value: ${JSON.stringify(api, null, 2)}`);
      });
    }

    // Filter out corrupted/invalid entries
    // Note: Since getByPrefix returns just values, we filter the values directly
    const validAPIs = [
      ...pending.filter(api => {
        const isValid = api && typeof api === 'object' && api.name;
        if (!isValid) {
          console.log(`❌ Filtering out invalid pending API:`, {
            valueType: typeof api,
            hasName: !!(api && api.name),
            value: api
          });
        }
        return isValid;
      }),
      ...approved.filter(api => {
        const isValid = api && typeof api === 'object' && api.name;
        if (!isValid) {
          console.log(`❌ Filtering out invalid approved API:`, {
            valueType: typeof api,
            hasName: !!(api && api.name),
            value: api
          });
        }
        return isValid;
      }),
      ...rejected.filter(api => {
        const isValid = api && typeof api === 'object' && api.name;
        if (!isValid) {
          console.log(`❌ Filtering out invalid rejected API:`, {
            valueType: typeof api,
            hasName: !!(api && api.name),
            value: api
          });
        }
        return isValid;
      })
    ];

    const allAPIs = validAPIs;
    
    // Count invalid entries for cleanup
  const totalEntries = pending.length + approved.length + rejected.length;
  const invalidCount = totalEntries - validAPIs.length;
    if (invalidCount > 0) {
      console.log(`⚠️ Found ${invalidCount} corrupted entries that will be ignored`);
    }
    
    console.log(`📊 Valid APIs after filtering: ${allAPIs.length}`);
    allAPIs.forEach((api, index) => {
      console.log(`   ${index + 1}. ${api.name} by ${api.providerEmail} (Provider ID: ${api.providerId}) - ${api.status}`);
    });
    
    // Filter to only this provider's APIs
    const userAPIs = allAPIs.filter(api => {
      if (!api || !api.providerId) {
        console.log(`⚠️ Skipping API with missing providerId:`, api);
        return false;
      }
      const match = api.providerId === user.id;
      console.log(`🔍 Checking API "${api.name}": Provider ID ${api.providerId} === User ID ${user.id} ? ${match}`);
      return match;
    });
    
    console.log(`✅ Found ${userAPIs.length} APIs for provider ${user.email}:`);
    userAPIs.forEach(api => {
      console.log(`   ✓ ${api.name} (${api.status}) - ID: ${api.id}`);
    });
    
    const breakdown = {
      pending: userAPIs.filter(api => api.status === 'pending').length,
      approved: userAPIs.filter(api => api.status === 'approved').length,
      rejected: userAPIs.filter(api => api.status === 'rejected').length
    };
    
    console.log(`📊 Breakdown for ${user.email}:`, breakdown);
    
    return c.json({ 
      data: userAPIs,
      count: userAPIs.length,
      breakdown
    });
  } catch (error) {
    console.log('❌ Get user APIs error:', error);
    return c.json({ error: 'Failed to fetch user APIs: ' + error.message }, 500);
  }
});

// =================
// ADMIN ENDPOINTS
// =================

// Admin: Get all pending APIs
app.get("/make-server-a1f48247/apis/pending", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      console.log('❌ Get pending APIs failed: Authentication error');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      console.log(`❌ Access denied: User ${user.email} is not admin (role: ${userRole})`);
      return c.json({ error: 'Admin access required' }, 403);
    }

    console.log(`🔄 Admin ${user.email} requesting pending APIs`);

    const pendingAPIs = await kv.getByPrefix('api:pending:');
    
    console.log(`🔍 Raw pending entries found: ${pendingAPIs.length}`);
    // Note: getByPrefix returns just the values, not {key, value} objects
    pendingAPIs.forEach((api, index) => {
      console.log(`   ${index + 1}. API object:`);
      console.log(`       Value type: ${typeof api}`);
      console.log(`       Value: ${JSON.stringify(api, null, 2)}`);
      console.log(`       Has name: ${!!(api && api.name)}`);
    });

    // Filter out corrupted entries
    const apis = pendingAPIs.filter(api => {
      const isValid = api && typeof api === 'object' && api.name;
      if (!isValid) {
        console.log(`❌ Filtering out invalid entry:`, {
          valueType: typeof api,
          hasName: !!(api && api.name),
          value: api
        });
      }
      return isValid;
    });
    
    const corruptedCount = pendingAPIs.length - apis.length;
    if (corruptedCount > 0) {
      console.log(`⚠️ Found ${corruptedCount} corrupted pending API entries (ignored)`);
    }
    
    console.log(`✅ Found ${apis.length} valid pending APIs for admin review:`);
    apis.forEach(api => {
      console.log(`   - ${api.name} by ${api.providerEmail}`);
    });
    
    return c.json({ 
      data: apis,
      count: apis.length
    });
  } catch (error) {
    console.log('❌ Get pending APIs error:', error);
    return c.json({ error: 'Failed to fetch pending APIs' }, 500);
  }
});

// Admin: Approve or reject API
app.post("/make-server-a1f48247/apis/:id/review", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      console.log('❌ API review failed: Admin authentication required');
      return c.json({ error: 'Admin access required' }, 401);
    }

    const apiId = c.req.param('id');
    const { action } = await c.req.json(); // 'approve' or 'reject'
    
    console.log(`🔄 Admin ${user.email} ${action}ing API: ${apiId}`);
    
    const pendingAPI = await kv.get(`api:pending:${apiId}`);
    if (!pendingAPI) {
      console.log(`❌ API not found: ${apiId}`);
      return c.json({ error: 'API not found' }, 404);
    }

    // Remove from pending
    await kv.del(`api:pending:${apiId}`);
    
    if (action === 'approve') {
      // Move to approved
      const approvedAPI = {
        ...pendingAPI,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user.id,
        approvedByEmail: user.email
      };
      await kv.set(`api:approved:${apiId}`, approvedAPI);
      console.log(`✅ API approved: ${approvedAPI.name}`);
      return c.json({ data: approvedAPI, message: 'API approved successfully' });
    } else if (action === 'reject') {
      // Store rejection
      const rejectedAPI = {
        ...pendingAPI,
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: user.id,
        rejectedByEmail: user.email
      };
      await kv.set(`api:rejected:${apiId}`, rejectedAPI);
      console.log(`✅ API rejected: ${rejectedAPI.name}`);
      return c.json({ data: rejectedAPI, message: 'API rejected' });
    } else {
      return c.json({ error: 'Invalid action. Use "approve" or "reject"' }, 400);
    }
  } catch (error) {
    console.log('❌ Review API error:', error);
    return c.json({ error: 'Failed to review API' }, 500);
  }
});

// =================
// CONSUMER ENDPOINTS
// =================

// Consumer: Get all approved APIs
app.get("/make-server-a1f48247/apis", async (c) => {
  try {
    console.log('🔄 Loading approved APIs for marketplace');
    const apis = await kv.getByPrefix('api:approved:');
    
    // Filter out corrupted entries
    // Note: getByPrefix returns just the values, not {key, value} objects
    const approvedAPIs = apis.filter(api => {
      const isValid = api && typeof api === 'object' && api.name;
      if (!isValid) {
        console.log(`❌ Filtering out invalid approved API:`, {
          valueType: typeof api,
          value: api
        });
      }
      return isValid;
    });
    
    const corruptedCount = apis.length - approvedAPIs.length;
    if (corruptedCount > 0) {
      console.log(`⚠️ Found ${corruptedCount} corrupted approved API entries (ignored)`);
    }
    
    console.log(`✅ Found ${approvedAPIs.length} valid approved APIs for marketplace`);
    
    return c.json({ 
      data: approvedAPIs,
      count: approvedAPIs.length
    });
  } catch (error) {
    console.log('❌ Get approved APIs error:', error);
    return c.json({ error: 'Failed to fetch APIs' }, 500);
  }
});

// Consumer: Subscribe to API
app.post("/make-server-a1f48247/apis/:id/subscribe", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const apiId = c.req.param('id');
    console.log(`🔄 User ${user.email} subscribing to API: ${apiId}`);
    
    const api = await kv.get(`api:approved:${apiId}`);
    
    if (!api) {
      console.log(`❌ API not found or not approved: ${apiId}`);
      return c.json({ error: 'API not found or not available' }, 404);
    }

    // Check if already subscribed
    const existingSubscription = await kv.get(`subscription:${user.id}:${apiId}`);
    if (existingSubscription) {
      console.log(`❌ User ${user.email} already subscribed to ${api.name}`);
      return c.json({ error: 'Already subscribed to this API' }, 400);
    }

    // Create subscription
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiKey = `key_${Math.random().toString(36).substr(2, 16)}`;
    
    const subscription = {
      id: subscriptionId,
      userId: user.id,
      userEmail: user.email,
      apiId,
      apiName: api.name,
      apiKey,
      status: 'active',
      quota: 1000,
      usage: 0,
      subscribedAt: new Date().toISOString()
    };

    await kv.set(`subscription:${user.id}:${apiId}`, subscription);
    
    // Update API subscriber count
    const updatedAPI = { ...api, subscribers: (api.subscribers || 0) + 1 };
    await kv.set(`api:approved:${apiId}`, updatedAPI);
    
    console.log(`✅ User ${user.email} subscribed to ${api.name} with API key: ${apiKey}`);

    return c.json({ 
      data: subscription,
      message: 'Subscribed successfully'
    });
  } catch (error) {
    console.log('❌ Subscribe API error:', error);
    return c.json({ error: 'Failed to subscribe to API' }, 500);
  }
});

// Consumer: Get user subscriptions
app.get("/make-server-a1f48247/subscriptions", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log(`🔄 Loading subscriptions for user: ${user.email}`);
  const userSubscriptions = await kv.getByPrefix(`subscription:${user.id}:`);
    
    console.log(`✅ Found ${userSubscriptions.length} subscriptions for ${user.email}`);
    
    return c.json({ 
      data: userSubscriptions,
      count: userSubscriptions.length
    });
  } catch (error) {
    console.log('❌ Get subscriptions error:', error);
    return c.json({ error: 'Failed to fetch subscriptions' }, 500);
  }
});

// Test API endpoint (simulate API call with usage tracking)
app.post("/make-server-a1f48247/test-api/:id", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const apiId = c.req.param('id');
    const { endpoint, method = 'GET', headers = {}, body } = await c.req.json();
    
    console.log(`🔄 User ${user.email} testing API ${apiId} - ${method} ${endpoint}`);
    
    // Check if user has subscription
    const subscription = await kv.get(`subscription:${user.id}:${apiId}`);
    if (!subscription) {
      return c.json({ error: 'Not subscribed to this API' }, 403);
    }
    
    // Check quota
    if (subscription.usage >= subscription.quota) {
      return c.json({ error: 'API quota exceeded' }, 429);
    }
    
    // Simulate API call (in real implementation, this would proxy to actual API)
    const mockResponse = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      data: {
        message: `Mock response from ${subscription.apiName}`,
        endpoint,
        method,
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`
      }
    };
    
    // Update usage statistics
    const updatedSubscription = {
      ...subscription,
      usage: subscription.usage + 1,
      lastUsed: new Date().toISOString()
    };
    await kv.set(`subscription:${user.id}:${apiId}`, updatedSubscription);
    
    // Update API call count and revenue
    const api = await kv.get(`api:approved:${apiId}`);
    if (api) {
      const updatedAPI = {
        ...api,
        totalCalls: (api.totalCalls || 0) + 1,
        revenue: (api.revenue || 0) + 0.01, // 1 cent per call
        lastUsed: new Date().toISOString()
      };
      await kv.set(`api:approved:${apiId}`, updatedAPI);
    }
    
    console.log(`✅ API call recorded for ${subscription.apiName} - Usage: ${updatedSubscription.usage}/${subscription.quota}`);
    
    return c.json({ 
      data: mockResponse,
      usage: {
        current: updatedSubscription.usage,
        quota: subscription.quota,
        remaining: subscription.quota - updatedSubscription.usage
      }
    });
  } catch (error) {
    console.log('❌ Test API error:', error);
    return c.json({ error: 'Failed to test API' }, 500);
  }
});

// =================
// FACILITATOR ENDPOINTS
// Facilitator: Get all active participants
// Facilitator: Get live session activities
app.get("/make-server-a1f48247/activity/live", async (c) => {
  try {
    console.log('🔔 /activity/live endpoint called');
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    console.log('Facilitator auth:', { user, authError });
    if (authError || !user || user.user_metadata?.role !== 'facilitator') {
      console.log('❌ Facilitator access denied');
      return c.json({ error: 'Facilitator access required' }, 401);
    }
    // Assuming activities are stored in kv with prefix 'activity:'
    const activities = await kv.getByPrefix('activity:');
    // Filter for recent activities (e.g., last 30 minutes)
    const THIRTY_MINUTES = 30 * 60 * 1000;
    const now = Date.now();
    const liveActivities = Array.isArray(activities)
      ? activities.filter(a => {
          if (!a || !a.timestamp) return false;
          const ts = new Date(a.timestamp).getTime();
          return now - ts <= THIRTY_MINUTES;
        })
      : [];
    console.log('🟢 Live activities returned:', liveActivities);
    return c.json({ data: liveActivities, count: liveActivities.length });
  } catch (error) {
    console.log('❌ Error in /activity/live:', error);
    return c.json({ error: 'Failed to fetch live activities' }, 500);
  }
});
// Facilitator: Get live (online) participants
app.get("/make-server-a1f48247/participants/live", async (c) => {
  try {
    console.log('🔔 /participants/live endpoint called');
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    console.log('Facilitator auth:', { user, authError });
    if (authError || !user || user.user_metadata?.role !== 'facilitator') {
      console.log('❌ Facilitator access denied');
      return c.json({ error: 'Facilitator access required' }, 401);
    }
    const users = await kv.getByPrefix('user:');
    const liveUsers = Array.isArray(users)
      ? users.filter(u => u && (u.status === 'online' || u.status === 'active'))
      : [];
    console.log('👥 Live participants returned:', liveUsers);
    return c.json({ data: liveUsers, count: liveUsers.length });
  } catch (error) {
    console.log('❌ Error in /participants/live:', error);
    return c.json({ error: 'Failed to fetch live participants' }, 500);
  }
});
app.get("/make-server-a1f48247/participants", async (c) => {
  try {
    console.log('🔔 /participants endpoint called');
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    console.log('Facilitator auth:', { user, authError });
    if (authError || !user || user.user_metadata?.role !== 'facilitator') {
      console.log('❌ Facilitator access denied');
      return c.json({ error: 'Facilitator access required' }, 401);
    }
    const users = await kv.getByPrefix('user:');
    console.log('👥 Participants returned:', users);
    return c.json({ data: users, count: users.length });
  } catch (error) {
    console.log('❌ Error in /participants:', error);
    return c.json({ error: 'Failed to fetch participants' }, 500);
  }
});
// =================

// Broadcast message (facilitator only)
app.post("/make-server-a1f48247/broadcast", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !user || user.user_metadata?.role !== 'facilitator') {
      return c.json({ error: 'Facilitator access required' }, 401);
    }

    const { message, type = 'info' } = await c.req.json();
    
    const broadcast = {
      id: `msg_${Date.now()}`,
      message,
      type,
      senderId: user.id,
      senderEmail: user.email,
      timestamp: new Date().toISOString()
    };

    await kv.set(`broadcast:${broadcast.id}`, broadcast);
    console.log(`✅ Broadcast sent by ${user.email}: ${message}`);
    
    return c.json({ data: broadcast });
  } catch (error) {
    console.log('❌ Broadcast error:', error);
    return c.json({ error: 'Failed to send broadcast' }, 500);
  }
});

// Get recent broadcasts
app.get("/make-server-a1f48247/broadcasts", async (c) => {
  try {
    const broadcasts = await kv.getByPrefix('broadcast:');
    const sortedBroadcasts = broadcasts
      .map(item => item.value)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20); // Last 20 messages
    
    return c.json({ data: sortedBroadcasts });
  } catch (error) {
    console.log('❌ Get broadcasts error:', error);
    return c.json({ error: 'Failed to fetch broadcasts' }, 500);
  }
});

// Reset environment (facilitator only)
app.post("/make-server-a1f48247/reset-environment", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !user || user.user_metadata?.role !== 'facilitator') {
      return c.json({ error: 'Facilitator access required' }, 401);
    }

    console.log(`🔄 Facilitator ${user.email} resetting environment`);

    // Clear all data except user profiles
    const keysToDelete = [
      ...(await kv.getByPrefix('api:')).map(item => item.key),
      ...(await kv.getByPrefix('subscription:')).map(item => item.key),
      ...(await kv.getByPrefix('broadcast:')).map(item => item.key)
    ];

    for (const key of keysToDelete) {
      await kv.del(key);
    }

    // Log the reset action
    const resetLog = {
      id: `reset_${Date.now()}`,
      performedBy: user.id,
      performedAt: new Date().toISOString(),
      keysDeleted: keysToDelete.length
    };
    
    await kv.set(`reset:${resetLog.id}`, resetLog);
    console.log(`✅ Environment reset by ${user.email} - ${keysToDelete.length} keys deleted`);

    return c.json({ 
      message: 'Environment reset successfully',
      keysDeleted: keysToDelete.length
    });
  } catch (error) {
    console.log('❌ Reset environment error:', error);
    return c.json({ error: 'Failed to reset environment' }, 500);
  }
});

// Get platform analytics (admin/facilitator only)
app.get("/make-server-a1f48247/analytics", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const { user, error: authError } = await verifyAuth(authHeader);
    
    if (authError || !user || !['admin', 'facilitator'].includes(user.user_metadata?.role)) {
      return c.json({ error: 'Admin or facilitator access required' }, 401);
    }

    const users = await kv.getByPrefix('user:');
    const pendingAPIs = await kv.getByPrefix('api:pending:');
    const approvedAPIs = await kv.getByPrefix('api:approved:');
    const rejectedAPIs = await kv.getByPrefix('api:rejected:');
    const subscriptions = await kv.getByPrefix('subscription:');
    
    const analytics = {
      totalUsers: users.length,
      totalAPIs: approvedAPIs.length,
      pendingAPIs: pendingAPIs.length,
      rejectedAPIs: rejectedAPIs.length,
      totalSubscriptions: subscriptions.length,
      totalRevenue: approvedAPIs.reduce((sum, api) => sum + (api?.revenue || 0), 0),
      totalAPICalls: approvedAPIs.reduce((sum, api) => sum + (api?.totalCalls || 0), 0)
    };

    return c.json({ data: analytics });
  } catch (error) {
    console.log('❌ Get analytics error:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

Deno.serve(app.fetch);