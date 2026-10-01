import { defineStore } from 'pinia'
import reportService from '../services/reportService'

const emptyPagination = () => ({ current_page: 1, last_page: 1, total: 0 })

export const useReportStore = defineStore('report', {
  state: () => ({
    occupancy: { summary: null, rows: [], pagination: emptyPagination() },
    financial: { byCategory: null, byPaymentMethod: null, byRoute: null, byRouteCategory: [], byRoutePayment: [], total: null, rows: [], pagination: emptyPagination() },
    cancellations: { summary: null, rows: [], pagination: emptyPagination() },
    discounts: { summary: null, rows: [], pagination: emptyPagination() },
    loading: false,
  }),

  actions: {
    async fetchOccupancy(params = {}) {
      this.loading = true
      try {
        const res = await reportService.occupancy(params)
        this.occupancy = { summary: res.summary, rows: res.data, pagination: res.meta }
        return res
      } finally {
        this.loading = false
      }
    },

    async downloadOccupancyPdf(params = {}) {
      return reportService.occupancyPdf(params)
    },

    async downloadOccupancyExcel(params = {}) {
      return reportService.occupancyExcel(params)
    },

    async fetchFinancial(params = {}) {
      this.loading = true
      try {
        const res = await reportService.financial(params)
        this.financial = {
          byCategory: res.by_category,
          byPaymentMethod: res.by_payment_method,
          byRoute: res.by_route,
          byRouteCategory: res.by_route_category ?? [],
          byRoutePayment: res.by_route_payment ?? [],
          total: res.total,
          rows: res.data,
          pagination: res.meta,
        }
        return res
      } finally {
        this.loading = false
      }
    },

    async downloadFinancialPdf(params = {}) {
      return reportService.financialPdf(params)
    },

    async downloadFinancialExcel(params = {}) {
      return reportService.financialExcel(params)
    },

    async fetchCancellations(params = {}) {
      this.loading = true
      try {
        const res = await reportService.cancellations(params)
        this.cancellations = { summary: res.summary, rows: res.data, pagination: res.meta }
        return res
      } finally {
        this.loading = false
      }
    },

    async downloadCancellationsPdf(params = {}) {
      return reportService.cancellationsPdf(params)
    },

    async fetchDiscounts(params = {}) {
      this.loading = true
      try {
        const res = await reportService.discounts(params)
        this.discounts = { summary: res.summary, rows: res.data, pagination: res.meta }
        return res
      } finally {
        this.loading = false
      }
    },

    async downloadDiscountsPdf(params = {}) {
      return reportService.discountsPdf(params)
    },

    async downloadDiscountsExcel(params = {}) {
      return reportService.discountsExcel(params)
    },
  },
})
