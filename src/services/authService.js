import api from '../api/axios'

export default {
  login: (data) => api.post('/login', data).then((r) => r.data),
  me: () => api.get('/me').then((r) => r.data),
  updateProfile: (data) => api.put('/me', data).then((r) => r.data),
  logout: () => api.post('/logout').then((r) => r.data),
}
