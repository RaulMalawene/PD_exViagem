import { defineStore } from 'pinia'
import stopService from '../services/stopService'

export const useStopStore = defineStore('stop', {
  state: () => ({
    stops: [],
    loading: false,
  }),

  actions: {
    async fetchStops(routeId) {
      this.loading = true

      try {
        const res = await stopService.list(routeId)
        this.stops = res.data
        return res
      } finally {
        this.loading = false
      }
    },

    async createStop(routeId, payload) {
      return stopService.create(routeId, payload)
    },

    async updateStop(id, payload) {
      return stopService.update(id, payload)
    },

    async removeStop(id) {
      return stopService.remove(id)
    },
  },
})
