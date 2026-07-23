import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/round-trips', { params }).then((r) => r.data),
  show: (id) => api.get(`/round-trips/${id}`).then((r) => r.data),
  create: (data) => api.post('/round-trips', data).then((r) => r.data),
  update: (id, data) => api.put(`/round-trips/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/round-trips/${id}`).then((r) => r.data),
  report: (id) => api.get(`/round-trips/${id}/report`).then((r) => r.data),
  updateReconciliation: (id, data) => api.patch(`/round-trips/${id}/reconciliation`, data).then((r) => r.data),
  reportPdf: (id) => api.get(`/round-trips/${id}/report-pdf`, { responseType: 'blob' }).then((r) => r.data),
}
