import { defineStore } from 'pinia'
import shipmentService from '../services/shipmentService'

export const useShipmentStore = defineStore('shipment', {
  state: () => ({
    shipments: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
    async fetchShipments(params = {}) {
      this.loading = true

      try {
        const res = await shipmentService.list(params)
        this.shipments = res.data
        this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchShipment(id) {
      return shipmentService.show(id)
    },

    async createShipment(payload) {
      return shipmentService.create(payload)
    },

    async updateShipment(id, payload) {
      return shipmentService.update(id, payload)
    },

    async deleteShipment(id) {
      return shipmentService.remove(id)
    },

    async uploadAttachment(id, file) {
      return shipmentService.uploadAttachment(id, file)
    },
  },
})
