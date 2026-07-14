import { defineStore } from 'pinia'
import tripScheduleService from '../services/tripScheduleService'

export const useTripScheduleStore = defineStore('tripSchedule', {
  state: () => ({
    schedules: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
    async fetchSchedules(params = {}) {
      this.loading = true

      try {
        const res = await tripScheduleService.list(params)
        this.schedules = res.data
        if (res.meta) this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchSchedule(id) {
      return tripScheduleService.show(id)
    },

    async createSchedule(payload) {
      return tripScheduleService.create(payload)
    },

    async updateSchedule(id, payload) {
      return tripScheduleService.update(id, payload)
    },

    async deactivateSchedule(id) {
      return tripScheduleService.remove(id)
    },
  },
})
