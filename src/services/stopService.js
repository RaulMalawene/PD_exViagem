import api from '../api/axios'

export default {
  list: (routeId) => api.get(`/routes/${routeId}/stops`).then((r) => r.data),
  create: (routeId, data) => api.post(`/routes/${routeId}/stops`, data).then((r) => r.data),
  update: (id, data) => api.put(`/stops/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/stops/${id}`).then((r) => r.data),
}
