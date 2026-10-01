import { defineStore } from 'pinia'
import routeService from '../services/routeService'

export const useRouteStore = defineStore('route', {
  state: () => ({
    routes: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
    // Estado separado para as listas de selecção dos modais. Partilhar
    // o `routes` fazia um modal reescrever a tabela do ecrã por baixo
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
        const res = await routeService.list({ per_page: 100, ...params })
        this.options = res.data
        return this.options
      } finally {
        this.loadingOptions = false
      }
    },
    async fetchRoutes(params = { all: 1 }) {
      this.loading = true

      try {
        const res = await routeService.list(params)
        this.routes = res.data
        if (res.meta) this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchRoute(id) {
      return routeService.show(id)
    },

    async createRoute(payload) {
      return routeService.create(payload)
    },

    async updateRoute(id, payload) {
      return routeService.update(id, payload)
    },

    async deactivateRoute(id) {
      return routeService.deactivate(id)
    },

    async deleteRoute(id, opts = {}) {
      return routeService.remove(id, opts)
    },
  },
})
