import { defineStore } from 'pinia'
import tripService from '../services/tripService'

export const useTripStore = defineStore('trip', {
  state: () => ({
    trips: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
    async fetchTrips(params = {}) {
      this.loading = true

      try {
        const res = await tripService.list(params)
        this.trips = res.data
        this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchTrip(id) {
      return tripService.show(id)
    },

    async createTrip(payload) {
      return tripService.create(payload)
    },

    async updateTrip(id, payload) {
      return tripService.update(id, payload)
    },

    async cancelTrip(id) {
      return tripService.remove(id)
    },

    async generateTrips(payload) {
      return tripService.generate(payload)
    },
  },
})
