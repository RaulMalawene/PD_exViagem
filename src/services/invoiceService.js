import api from '../api/axios'

export default {
  confirm: (id) => api.post(`/invoices/${id}/confirm`).then((r) => r.data),
  cancel: (id) => api.post(`/invoices/${id}/cancel`).then((r) => r.data),
  baggageTagsPdf: (id) => api.get(`/invoices/${id}/baggage-tags-pdf`, { responseType: 'blob' }).then((r) => r.data),
}
