import { defineStore } from 'pinia'
import vehicleService from '../services/vehicleService'

export const useVehicleStore = defineStore('vehicle', {
  state: () => ({
    vehicles: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
    async fetchVehicles(params = {}) {
      this.loading = true

      try {
        const res = await vehicleService.list(params)
        this.vehicles = res.data
        this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchVehicle(id) {
      return vehicleService.show(id)
    },

    async createVehicle(payload) {
      return vehicleService.create(payload)
    },

    async updateVehicle(id, payload) {
      return vehicleService.update(id, payload)
    },

    async deactivateVehicle(id) {
      return vehicleService.deactivate(id)
    },

    async deleteVehicle(id) {
      return vehicleService.remove(id)
    },
  },
})
