import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/trip-schedules', { params }).then((r) => r.data),
  show: (id) => api.get(`/trip-schedules/${id}`).then((r) => r.data),
  create: (data) => api.post('/trip-schedules', data).then((r) => r.data),
  update: (id, data) => api.put(`/trip-schedules/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/trip-schedules/${id}`).then((r) => r.data),
}
