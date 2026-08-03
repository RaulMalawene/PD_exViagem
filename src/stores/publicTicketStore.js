import { defineStore } from 'pinia'
import publicTicketService from '../services/publicTicketService'

export const usePublicTicketStore = defineStore('publicTicket', {
  actions: {
    async verifyTicket(ticketNumber) {
      return publicTicketService.verify(ticketNumber)
    },
  },
})
