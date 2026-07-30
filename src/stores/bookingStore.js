import { defineStore } from 'pinia'
import bookingService from '../services/bookingService'
import publicTripService from '../services/publicTripService'

export const useBookingStore = defineStore('booking', {
  state: () => ({
    bookings: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
    async createBookings(payload) {
      return bookingService.create(payload)
    },

    async fetchTripAvailability(tripId, sessionToken) {
      const res = await publicTripService.getAvailability(tripId, sessionToken)
      return res.data
    },

    async holdSeat(tripId, seatNumber, sessionToken) {
      return publicTripService.holdSeat(tripId, seatNumber, sessionToken)
    },

    async releaseSeat(tripId, seatNumber, sessionToken) {
      return publicTripService.releaseSeat(tripId, seatNumber, sessionToken)
    },

    async releaseAllSeats(tripId, sessionToken) {
      return publicTripService.releaseAllSeats(tripId, sessionToken)
    },

    async fetchBookings(params = {}) {
      this.loading = true

      try {
        const res = await bookingService.list(params)
        this.bookings = res.data
        this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchBooking(id) {
      return bookingService.show(id)
    },

    async countBookings(params = {}) {
      const res = await bookingService.list({ ...params, per_page: 1 })
      return res.meta.total
    },

    async confirmBooking(id, payload = {}) {
      return bookingService.confirm(id, payload)
    },

    async cancelBooking(id, notes) {
      return bookingService.cancel(id, notes)
    },

    async updateBookingPayment(id, payload) {
      return bookingService.updatePayment(id, payload)
    },

    async downloadTicketPdf(id) {
      return bookingService.ticketPdf(id)
    },

    async fetchPackages(id) {
      return bookingService.listPackages(id)
    },

    async createPackage(id, payload) {
      return bookingService.createPackage(id, payload)
    },

    async fetchPassengerConfirmedBookings(passengerId) {
      return bookingService.list({ passenger_id: passengerId, status: 'confirmed', per_page: 50 })
    },

    async sendBookingWhatsapp(id, phone, imageBlob) {
      return bookingService.sendWhatsapp(id, phone, imageBlob)
    },
  },
})
