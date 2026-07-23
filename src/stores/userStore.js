import { defineStore } from 'pinia'
import userService from '../services/userService'

export const useUserStore = defineStore('user', {
  state: () => ({
    users: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
    async fetchUsers(params = {}) {
      this.loading = true

      try {
        const res = await userService.list(params)
        this.users = res.data
        this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchUser(id) {
      return userService.show(id)
    },

    async createUser(payload) {
      return userService.create(payload)
    },

    async updateUser(id, payload) {
      return userService.update(id, payload)
    },

    async deleteUser(id) {
      return userService.remove(id)
    },
  },
})
