import { defineStore } from 'pinia'
import authService from '../services/authService'
import { ROLE_FIELD_AGENT } from '../utils/roles'

export const roleHomeRoute = (role) => {
  // O agente de campo nao tem dashboard: entra directamente nas reservas.
  if (role === ROLE_FIELD_AGENT) return '/dashboard/bookings'

  return '/dashboard/home'
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
 
      const res = await authService.login(data)

      this.token = res.token
      this.user = res.user

      localStorage.setItem('token', res.token)
      localStorage.setItem('user', JSON.stringify(res.user))

      return res
    },

    async getMe() {

      const res = await authService.me()

      this.user = res.data
      localStorage.setItem('user', JSON.stringify(res.data))

      return res
    },

    async updateMe(data) {
      const res = await authService.updateProfile(data)
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
