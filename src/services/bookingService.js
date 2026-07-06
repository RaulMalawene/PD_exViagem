import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/bookings', { params }).then((r) => r.data),
  listByTrip: (tripId, params = {}) => api.get(`/trips/${tripId}/bookings`, { params }).then((r) => r.data),
}
