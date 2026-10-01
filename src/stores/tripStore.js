import { defineStore } from 'pinia'
import tripService from '../services/tripService'

export const useTripStore = defineStore('trip', {
  state: () => ({
    trips: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
    // Estado separado para as listas de selecção dos modais. Partilhar
    // o `trips` fazia um modal reescrever a tabela do ecrã por baixo
    // do utilizador, incluindo a paginação.
    options: [],
    loadingOptions: false,
  }),

  actions: {

    /**
     * Lista para dropdowns. Nunca toca no estado da tabela.
     * Sem cache: os filtros de data mudam entre modais.
     */
    async fetchOptions(params = {}) {
      this.loadingOptions = true

      try {
        const res = await tripService.list({ per_page: 100, ...params })
        this.options = res.data
        return this.options
      } finally {
        this.loadingOptions = false
      }
    },
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

    async downloadManifest(id) {
      return tripService.manifestPdf(id)
    },

    async downloadCargoManifest(id) {
      return tripService.cargoManifestPdf(id)
    },
  },
})
