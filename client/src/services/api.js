const BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Universal fetch wrapper handling JSON, FormData, Authorization headers, and cookies
 */
export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const headers = {
    ...options.headers,
  };

  // Add token if saved in localStorage (bearer fallback)
  const token = localStorage.getItem('articulate_token');
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers,
    credentials: 'include', // sends HTTP-only cookies
  };

  try {
    const response = await fetch(url, config);

    // If 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      let errorMsg = data.message;
      if (!errorMsg) {
        if (response.status === 500) {
          errorMsg = 'Backend server is unreachable or encountering an internal issue. Please verify the server is running.';
        } else if (response.status === 404) {
          errorMsg = 'Requested endpoint was not found.';
        } else if (response.status === 401) {
          errorMsg = 'Session expired. Please sign in again.';
        } else if (response.status === 403) {
          errorMsg = 'Access denied. You do not have permission for this action.';
        } else {
          errorMsg = `Request failed with status ${response.status}`;
        }
      }
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check your connection.');
    }
    throw err;
  }
}
