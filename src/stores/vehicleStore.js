import { defineStore } from 'pinia'
import vehicleService from '../services/vehicleService'

export const useVehicleStore = defineStore('vehicle', {
  state: () => ({
    vehicles: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
    // Estado separado para as listas de selecção dos modais. Partilhar
    // o `vehicles` fazia um modal reescrever a tabela do ecrã por baixo
    // do utilizador, incluindo a paginação.
    options: [],
    loadingOptions: false,
  }),

  actions: {

    /**
     * Lista para dropdowns. Nunca toca no estado da tabela.
     * Em cache: estes dados quase nao mudam durante uma sessao.
     */
    async fetchOptions(params = {}) {
      if (this.options.length) return this.options

      this.loadingOptions = true

      try {
        const res = await vehicleService.list({ per_page: 100, ...params })
        this.options = res.data
        return this.options
      } finally {
        this.loadingOptions = false
      }
    },
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
