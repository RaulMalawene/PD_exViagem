import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/routes', { params }).then((r) => r.data),
}
