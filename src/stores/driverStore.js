import { defineStore } from 'pinia'
import driverService from '../services/driverService'

export const useDriverStore = defineStore('driver', {
  state: () => ({
    drivers: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
    async fetchDrivers(params = {}) {
      this.loading = true

      try {
        const res = await driverService.list(params)
        this.drivers = res.data
        this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchDriver(id) {
      return driverService.show(id)
    },

    async createDriver(payload) {
      return driverService.create(payload)
    },

    async updateDriver(id, payload) {
      return driverService.update(id, payload)
    },

    async deactivateDriver(id) {
      return driverService.remove(id)
    },

    async generatePhotoToken(id) {
      return driverService.generatePhotoToken(id)
    },
  },
})
