import { defineStore } from 'pinia'
import invoiceService from '../services/invoiceService'

export const useInvoiceStore = defineStore('invoice', {
  actions: {
    async confirmInvoice(id) {
      return invoiceService.confirm(id)
    },

    async cancelInvoice(id) {
      return invoiceService.cancel(id)
    },

    async downloadBaggageTags(id) {
      return invoiceService.baggageTagsPdf(id)
    },
  },
})
