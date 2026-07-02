import { defineStore } from 'pinia'
import authService from '../services/authService'

export const roleHomeRoute = (role) => {
  switch (role) {
    case 'admin':
    case 'staff':
    case 'driver':
    default:
      return '/dashboard/home'
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    role: (state) => state.user?.role ?? null,
    homeRoute: (state) => roleHomeRoute(state.user?.role),
  },

  actions: {
    async login(data) {
      // API retorna { user: {...}, token: "..." } (sem wrapper data)
      const res = await authService.login(data)

      this.token = res.token
      this.user = res.user

      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))

      return res
    },

    async getMe() {
      // API retorna { data: { ...user } }
      const res = await authService.me()

      this.user = res.data
      localStorage.setItem('user', JSON.stringify(res.data))

      return res
    },

    logout() {
      this.user = null
      this.token = null

      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
  },
})
