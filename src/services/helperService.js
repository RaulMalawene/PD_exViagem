import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/helpers', { params }).then((r) => r.data),
  show: (id) => api.get(`/helpers/${id}`).then((r) => r.data),
  create: (data) => api.post('/helpers', data).then((r) => r.data),
  update: (id, data) => api.put(`/helpers/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/helpers/${id}`).then((r) => r.data),
  deactivate: (id) => api.post(`/helpers/${id}/deactivate`).then((r) => r.data),
}
