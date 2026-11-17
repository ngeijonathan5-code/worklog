const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  const data = text && contentType.includes('application/json') ? JSON.parse(text) : text;

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.error || 'Request failed';
    throw new Error(message);
  }

  return data || null;
}

export const authApi = {
  login: (name, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ name, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),
};

export const worklogApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/worklogs${query ? `?${query}` : ''}`);
  },
  get: (id) => request(`/worklogs/${id}`),
  create: (data) => request('/worklogs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/worklogs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/worklogs/${id}`, { method: 'DELETE' }),
};

export const adminApi = {
  getUsers: () => request('/admin/users'),
  createUser: (data) => request('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  getWorklogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/worklogs${query ? `?${query}` : ''}`);
  },
  updateWorklogStatus: (id, status) => request(`/admin/worklogs/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getStats: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/stats${query ? `?${query}` : ''}`);
  },
  export: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/admin/export${query ? `?${query}` : ''}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Export failed');
    }

    return response.blob();
  },
};

export const notificationApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/notifications${query ? `?${query}` : ''}`);
  },
  getUnreadCount: () => request('/notifications/unread-count'),
  markRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  create: (data) => request('/notifications', { method: 'POST', body: JSON.stringify(data) }),
  getUsers: () => request('/notifications/users'),
};

export const messageApi = {
  getConversations: () => request('/messages/conversations'),
  getMessages: (conversationId) => request(`/messages/conversations/${conversationId}/messages`),
  sendMessage: (recipientId, content) => request('/messages/conversations', { method: 'POST', body: JSON.stringify({ recipientId, content }) }),
  getUsers: () => request('/messages/users'),
};