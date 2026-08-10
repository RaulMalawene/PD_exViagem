import { defineStore } from 'pinia'
import helperService from '../services/helperService'

export const useHelperStore = defineStore('helper', {
  state: () => ({
    helpers: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
    // Estado separado para as listas de selecção dos modais. Partilhar
    // o `helpers` fazia um modal reescrever a tabela do ecrã por baixo
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
        const res = await helperService.list({ per_page: 100, ...params })
        this.options = res.data
        return this.options
      } finally {
        this.loadingOptions = false
      }
    },
    async fetchHelpers(params = {}) {
      this.loading = true

      try {
        const res = await helperService.list(params)
        this.helpers = res.data
        this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchHelper(id) {
      return helperService.show(id)
    },

    async createHelper(payload) {
      return helperService.create(payload)
    },

    async updateHelper(id, payload) {
      return helperService.update(id, payload)
    },

    async deactivateHelper(id) {
      return helperService.deactivate(id)
    },

    async deleteHelper(id) {
      return helperService.remove(id)
    },
  },
})
