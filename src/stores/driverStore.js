import { defineStore } from 'pinia'
import driverService from '../services/driverService'

export const useDriverStore = defineStore('driver', {
  state: () => ({
    drivers: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
    // Estado separado para as listas de selecção dos modais. Partilhar
    // o `drivers` fazia um modal reescrever a tabela do ecrã por baixo
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
        const res = await driverService.list({ per_page: 100, ...params })
        this.options = res.data
        return this.options
      } finally {
        this.loadingOptions = false
      }
    },
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
      return driverService.deactivate(id)
    },

    async deleteDriver(id) {
      return driverService.remove(id)
    },

    async generatePhotoToken(id) {
      return driverService.generatePhotoToken(id)
    },
  },
})
