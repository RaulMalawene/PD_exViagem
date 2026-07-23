import api from '../api/axios'

export default {
  createGroup: (payload) => api.post('/bookings/group', payload).then((r) => r.data),
  groupStatus: (sessionToken) => api.get('/bookings/group/status', { params: { session_token: sessionToken } }).then((r) => r.data),
}
