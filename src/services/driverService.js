import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/drivers', { params }).then((r) => r.data),
  show: (id) => api.get(`/drivers/${id}`).then((r) => r.data),
  create: (data) => api.post('/drivers', data).then((r) => r.data),
  update: (id, data) => api.put(`/drivers/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/drivers/${id}`).then((r) => r.data),
  generatePhotoToken: (id) => api.post(`/drivers/${id}/photo-token`).then((r) => r.data),
}
