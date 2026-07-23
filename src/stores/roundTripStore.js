import { defineStore } from 'pinia'
import roundTripService from '../services/roundTripService'

export const useRoundTripStore = defineStore('roundTrip', {
  state: () => ({
    roundTrips: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
    async fetchRoundTrips(params = {}) {
      this.loading = true

      try {
        const res = await roundTripService.list(params)
        this.roundTrips = res.data
        this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchRoundTrip(id) {
      return roundTripService.show(id)
    },

    async createRoundTrip(payload) {
      return roundTripService.create(payload)
    },

    async updateRoundTrip(id, payload) {
      return roundTripService.update(id, payload)
    },

    async deleteRoundTrip(id) {
      return roundTripService.remove(id)
    },

    async fetchReport(id) {
      return roundTripService.report(id)
    },

    async updateReconciliation(id, payload) {
      return roundTripService.updateReconciliation(id, payload)
    },

    async downloadReportPdf(id) {
      return roundTripService.reportPdf(id)
    },
  },
})
