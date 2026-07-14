import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/routes', { params }).then((r) => r.data),
  show: (id) => api.get(`/routes/${id}`).then((r) => r.data),
  create: (data) => api.post('/routes', data).then((r) => r.data),
  update: (id, data) => api.put(`/routes/${id}`, data).then((r) => r.data),
  remove: (id, { confirmCascade = false } = {}) =>
    api.delete(`/routes/${id}`, { params: confirmCascade ? { confirm_cascade: 1 } : {} }).then((r) => r.data),
  deactivate: (id) => api.post(`/routes/${id}/deactivate`).then((r) => r.data),
}
