import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/audit-logs', { params }).then((r) => r.data),
  show: (id) => api.get(`/audit-logs/${id}`).then((r) => r.data),
}
