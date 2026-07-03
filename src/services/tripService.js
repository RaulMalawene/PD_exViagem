import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/trips', { params }).then((r) => r.data),
  show: (id) => api.get(`/trips/${id}`).then((r) => r.data),
}
