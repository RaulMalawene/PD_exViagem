import api from '../api/axios'

export default {
  search: (params = {}) => api.get('/public/trips', { params }).then((r) => r.data),
}
