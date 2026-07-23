import api from '../api/axios'

export default {
  occupancy: (params = {}) => api.get('/reports/occupancy', { params }).then((r) => r.data),
  occupancyPdf: (params = {}) => api.get('/reports/occupancy-pdf', { params, responseType: 'blob' }).then((r) => r.data),
  financial: (params = {}) => api.get('/reports/financial', { params }).then((r) => r.data),
  financialPdf: (params = {}) => api.get('/reports/financial-pdf', { params, responseType: 'blob' }).then((r) => r.data),
  cancellations: (params = {}) => api.get('/reports/cancellations', { params }).then((r) => r.data),
  cancellationsPdf: (params = {}) => api.get('/reports/cancellations-pdf', { params, responseType: 'blob' }).then((r) => r.data),
  discounts: (params = {}) => api.get('/reports/discounts', { params }).then((r) => r.data),
  discountsPdf: (params = {}) => api.get('/reports/discounts-pdf', { params, responseType: 'blob' }).then((r) => r.data),
}
