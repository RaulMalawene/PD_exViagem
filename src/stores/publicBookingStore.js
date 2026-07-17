import { defineStore } from 'pinia'
import publicRouteService from '../services/publicRouteService'
import publicTripService from '../services/publicTripService'
import publicBookingService from '../services/publicBookingService'
import paymentService from '../services/paymentService'

const FLOW_STORAGE_KEY = 'booking_flow_state'

function emptyFlow() {
  return {
    tripId: null,
    sessionToken: null,
    selectedSeats: [],
    holdExpiresAt: null,
    passengers: null,
    bookingGroup: null,
  }
}

function loadFlow() {
  try {
    const raw = sessionStorage.getItem(FLOW_STORAGE_KEY)
    return raw ? { ...emptyFlow(), ...JSON.parse(raw) } : emptyFlow()
  } catch {
    return emptyFlow()
  }
}

export const usePublicBookingStore = defineStore('publicBooking', {
  state: () => ({
    routes: [],
    loadingRoutes: false,
    trips: [],
    loadingTrips: false,
    availability: null,
    loadingAvailability: false,
    flow: loadFlow(),
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

    async fetchGroupStatus(sessionToken) {
      const res = await publicBookingService.groupStatus(sessionToken)
      return res.data
    },

    async createPaymentIntent(sessionToken) {
      const res = await paymentService.createIntent({ session_token: sessionToken })
      return res.data
    },

    saveFlow(partial) {
      this.flow = { ...this.flow, ...partial }
      sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(this.flow))
    },

    clearFlow() {
      this.flow = emptyFlow()
      sessionStorage.removeItem(FLOW_STORAGE_KEY)
    },
  },
})
