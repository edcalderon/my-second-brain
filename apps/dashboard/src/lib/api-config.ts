/**
 * API Configuration - Routes requests to appropriate endpoint
 * Dev: Local Next.js server functions
 * Prod: GCP Cloud Functions
 */

export const API_CONFIG = {
  isDev: process.env.NODE_ENV === 'development',
  isServer: typeof window === 'undefined',
  
  // Base URLs for API endpoints
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 
    (typeof window === 'undefined' 
      ? 'http://localhost:3000' 
      : ''),
  
  // Cloud function endpoints (prod)
  cloudFunctionUrl: process.env.NEXT_PUBLIC_CLOUD_FUNCTION_URL || 
    'https://us-central1-second-brain-482901.cloudfunctions.net',
  
  // API routes mapping
  routes: {
    knowledge: '/api/knowledge',
    sync: '/api/sync',
    status: '/api/status',
  },
};

/**
 * Get the appropriate API endpoint
 * In dev: uses local Next.js routes
 * In prod: uses cloud function URLs
 */
export function getApiEndpoint(route: keyof typeof API_CONFIG.routes): string {
  const path = API_CONFIG.routes[route];
  
  if (API_CONFIG.isDev) {
    // Dev mode: use local server
    return `${API_CONFIG.baseUrl}${path}`;
  }
  
  // Prod mode: use cloud functions
  // Map Next.js routes to cloud function names
  const cloudFunctionMap: Record<string, string> = {
    '/api/knowledge': `${API_CONFIG.cloudFunctionUrl}/knowledge`,
    '/api/sync': `${API_CONFIG.cloudFunctionUrl}/sync`,
    '/api/status': `${API_CONFIG.cloudFunctionUrl}/status`,
  };
  
  return cloudFunctionMap[path] || `${API_CONFIG.baseUrl}${path}`;
}

/**
 * Fetch wrapper that uses appropriate endpoint
 */
export async function apiCall<T>(
  route: keyof typeof API_CONFIG.routes,
  options?: RequestInit
): Promise<T> {
  const endpoint = getApiEndpoint(route);
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
}
