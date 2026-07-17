import api from '../api/axios'

export default {
  create: (payload) => api.post('/bookings', payload).then((r) => r.data),
  list: (params = {}) => api.get('/bookings', { params }).then((r) => r.data),
  listByTrip: (tripId, params = {}) => api.get(`/trips/${tripId}/bookings`, { params }).then((r) => r.data),
  show: (id) => api.get(`/bookings/${id}`).then((r) => r.data),
  confirm: (id, payload = {}) => api.post(`/bookings/${id}/confirm`, payload).then((r) => r.data),
  cancel: (id, notes) => api.post(`/bookings/${id}/cancel`, { notes }).then((r) => r.data),
  updatePayment: (id, payload) => api.patch(`/bookings/${id}/payment`, payload).then((r) => r.data),
  listPackages: (id) => api.get(`/bookings/${id}/packages`).then((r) => r.data),
  createPackage: (id, payload) => api.post(`/bookings/${id}/packages`, payload).then((r) => r.data),
}
