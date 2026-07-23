import api from '../api/axios'

export default {
  createGroup: (payload) => api.post('/bookings/group', payload).then((r) => r.data),
  groupStatus: (sessionToken) => api.get('/bookings/group/status', { params: { session_token: sessionToken } }).then((r) => r.data),
  sendWhatsapp: (sessionToken, bookingId, phone, imageBlob) => {
    const formData = new FormData()
    formData.append('session_token', sessionToken)
    formData.append('booking_id', bookingId)
    formData.append('phone', phone)
    formData.append('ticket_image', imageBlob, 'ticket.png')
    return api.post('/bookings/group/send-whatsapp', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}
