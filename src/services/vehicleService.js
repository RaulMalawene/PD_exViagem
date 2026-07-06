import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/vehicles', { params }).then((r) => r.data),
  show: (id) => api.get(`/vehicles/${id}`).then((r) => r.data),
  create: (data) => api.post('/vehicles', data).then((r) => r.data),
  update: (id, data) => api.put(`/vehicles/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/vehicles/${id}`).then((r) => r.data),
}
