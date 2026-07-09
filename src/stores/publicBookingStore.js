import { defineStore } from 'pinia'
import publicRouteService from '../services/publicRouteService'
import publicTripService from '../services/publicTripService'
import publicBookingService from '../services/publicBookingService'

export const usePublicBookingStore = defineStore('publicBooking', {
  state: () => ({
    routes: [],
    loadingRoutes: false,
    trips: [],
    loadingTrips: false,
    availability: null,
    loadingAvailability: false,
  }),

  actions: {
    async fetchRoutes() {
      if (this.routes.length) return this.routes

      this.loadingRoutes = true

      try {
        const res = await publicRouteService.list()
        this.routes = res.data
        return this.routes
      } finally {
        this.loadingRoutes = false
      }
    },

    async searchTrips(params = {}) {
      this.loadingTrips = true

      try {
        const res = await publicTripService.search(params)
        this.trips = res.data
        return res
      } finally {
        this.loadingTrips = false
      }
    },

    async fetchTripCalendar(routeId, dateFrom, dateTo) {
      const res = await publicTripService.calendar({ route_id: routeId, date_from: dateFrom, date_to: dateTo })
      return res.data
    },

    async fetchAvailability(tripId, sessionToken) {
      this.loadingAvailability = true

      try {
        const res = await publicTripService.getAvailability(tripId, sessionToken)
        this.availability = res.data
        return this.availability
      } finally {
        this.loadingAvailability = false
      }
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

    async submitBooking(payload) {
      return publicBookingService.createGroup(payload)
    },
  },
})
