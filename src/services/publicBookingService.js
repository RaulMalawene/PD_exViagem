import api from '../api/axios'

export default {
  createGroup: (payload) => api.post('/bookings/group', payload).then((r) => r.data),
}
