import api from '../api/axios'

export default {
  verify: (ticketNumber) => api.get(`/tickets/${ticketNumber}/verify`).then((r) => r.data),
}
