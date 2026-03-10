export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function parseResponse(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    const data = await parseResponse(response)
    const message = typeof data === 'string'
      ? data
      : data?.error || data?.message || (data ? Object.values(data).join(', ') : 'Request failed')
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  return parseResponse(response)
}

export const api = {
  get: (path) => apiRequest(path),
  post: (path, body) => apiRequest(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => apiRequest(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path, body) => apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path) => apiRequest(path, { method: 'DELETE' })
}
