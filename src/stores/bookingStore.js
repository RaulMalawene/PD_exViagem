import { defineStore } from 'pinia'
import bookingService from '../services/bookingService'

export const useBookingStore = defineStore('booking', {
  state: () => ({
    bookings: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
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
  },
})
