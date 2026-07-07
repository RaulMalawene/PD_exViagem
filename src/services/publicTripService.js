import api from '../api/axios'

export default {
  search: (params = {}) => api.get('/public/trips', { params }).then((r) => r.data),
  getAvailability: (tripId, sessionToken) =>
    api.get(`/trips/${tripId}/availability`, { params: { session_token: sessionToken } }).then((r) => r.data),
  holdSeat: (tripId, seatNumber, sessionToken) =>
    api.post(`/trips/${tripId}/seats/hold`, { seat_number: seatNumber, session_token: sessionToken }).then((r) => r.data),
  releaseSeat: (tripId, seatNumber, sessionToken) =>
    api.delete(`/trips/${tripId}/seats/hold`, { data: { seat_number: seatNumber, session_token: sessionToken } }).then((r) => r.data),
  releaseAllSeats: (tripId, sessionToken) =>
    api.delete(`/trips/${tripId}/seats/holds`, { data: { session_token: sessionToken } }).then((r) => r.data),
}
