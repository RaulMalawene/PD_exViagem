import api from '../api/axios'

export default {
  list: (params = {}) => api.get('/shipments', { params }).then((r) => r.data),
  show: (id) => api.get(`/shipments/${id}`).then((r) => r.data),
  create: (data) => api.post('/shipments', data).then((r) => r.data),
  update: (id, data) => api.put(`/shipments/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/shipments/${id}`).then((r) => r.data),
  uploadAttachment: (id, file) => {
    const formData = new FormData()
    formData.append('attachment', file)
    return api.post(`/shipments/${id}/attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}
