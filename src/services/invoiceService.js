import api from '../api/axios'

export default {
  confirm: (id) => api.post(`/invoices/${id}/confirm`).then((r) => r.data),
  cancel: (id) => api.post(`/invoices/${id}/cancel`).then((r) => r.data),
}
