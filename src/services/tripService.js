import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/trips', { params }).then((r) => r.data),
  show: (id) => api.get(`/trips/${id}`).then((r) => r.data),
  create: (data) => api.post('/trips', data).then((r) => r.data),
  update: (id, data) => api.put(`/trips/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/trips/${id}`).then((r) => r.data),
  generate: (data) => api.post('/trips/generate', data).then((r) => r.data),
}
