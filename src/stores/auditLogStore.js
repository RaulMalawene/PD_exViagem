import { defineStore } from 'pinia'
import auditLogService from '../services/auditLogService'

export const useAuditLogStore = defineStore('auditLog', {
  state: () => ({
    logs: [],
    pagination: { current_page: 1, last_page: 1, total: 0 },
    loading: false,
  }),

  actions: {
    async fetchLogs(params = {}) {
      this.loading = true

      try {
        const res = await auditLogService.list(params)
        this.logs = res.data
        this.pagination = res.meta
        return res
      } finally {
        this.loading = false
      }
    },

    async fetchLog(id) {
      return auditLogService.show(id)
    },
  },
})
