import api from '../api/axios'

export default {
  createIntent: (payload) => api.post('/payments/intent', payload).then((r) => r.data),
}
