import api from '../api/axios'

export default {
  createIntent: (payload) => api.post('/payments/intent', payload).then((r) => r.data),

  payWithMpesa: (payload) =>
    api.post('/payments/mpesa', payload, { timeout: 120000 }).then((r) => r.data),
}
