import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/bookings', { params }).then((r) => r.data),
}
