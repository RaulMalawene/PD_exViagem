import { defineStore } from 'pinia'
import helperService from '../services/helperService'

export const useHelperStore = defineStore('helper', {
  state: () => ({
    helpers: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
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
