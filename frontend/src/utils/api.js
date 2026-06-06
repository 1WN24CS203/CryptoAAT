const API_BASE_URL = 'http://localhost:5000/api/auth';

/**
 * Perform a fetch request to the auth API
 * @param {string} endpoint - The API endpoint e.g., '/login'
 * @param {string} method - HTTP method e.g., 'POST'
 * @param {object} body - Request payload
 * @param {string} token - Optional Authorization JWT token
 */
export const apiRequest = async (endpoint, method = 'GET', body = null, token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Get token from localStorage if not passed
  const activeToken = token || localStorage.getItem('cryptoaat_token');
  if (activeToken) {
    headers['Authorization'] = `Bearer ${activeToken}`;
  }

  const config = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Request Error on ${endpoint}:`, error);
    return { success: false, message: 'Network connection failed' };
  }
};
