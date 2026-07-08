import { defineStore } from 'pinia'
import routeService from '../services/routeService'

export const useRouteStore = defineStore('route', {
  state: () => ({
    routes: [],
    loading: false,
  }),

  actions: {
    async fetchRoutes(params = { all: 1 }) {
      this.loading = true

      try {
        const res = await routeService.list(params)
        this.routes = res.data
        return res
      } finally {
        this.loading = false
      }
    },
  },
})
