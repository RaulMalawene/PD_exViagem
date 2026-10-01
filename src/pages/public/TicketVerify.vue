<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { usePublicTicketStore } from '../../stores/publicTicketStore'
import { formatDate } from '../../utils/formatDate'
import LogoPD from '../../assets/LogoPD.svg'

const route = useRoute()
const ticketStore = usePublicTicketStore()

const loading = ref(true)
const notFound = ref(false)
const ticket = ref(null)

const statusMeta = computed(() => {
  const map = {
    confirmed: { label: 'Bilhete confirmado', tone: 'ok', icon: 'fi fi-sr-check-circle' },
    pending: { label: 'Pagamento pendente', tone: 'warn', icon: 'fi fi-sr-clock' },
    cancelled: { label: 'Bilhete cancelado', tone: 'bad', icon: 'fi fi-sr-cross-circle' },
  }
  return map[ticket.value?.status] ?? { label: ticket.value?.status ?? '--', tone: 'warn', icon: 'fi fi-sr-clock' }
})

onMounted(async () => {
  try {
    const res = await ticketStore.verifyTicket(route.params.ticketNumber)
    ticket.value = res.data
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="verifyPage">
    <div class="card">
      <img :src="LogoPD" alt="Portador Diário" class="logo" />

      <div v-if="loading" class="stateBox">
        <div class="spinner" />
        <span>A verificar o bilhete...</span>
      </div>

      <div v-else-if="notFound" class="stateBox">
        <i class="fi fi-sr-cross-circle bigIcon bad" />
        <span class="stateTitle">Bilhete não encontrado</span>
        <span class="stateText">Confirme o número ou contacte o balcão.</span>
      </div>

      <template v-else>
        <div class="statusBanner" :class="statusMeta.tone">
          <i :class="statusMeta.icon" />
          {{ statusMeta.label }}
        </div>

        <div class="ticketNumber">{{ ticket.ticket_number }}</div>

        <div class="routeRow">
          <div class="routeSide">
            <span class="city">{{ ticket.origin }}</span>
            <span class="legLabel">Partida · {{ ticket.departure_time }}</span>
          </div>
          <i class="fi fi-sr-arrow-right arrow" />
          <div class="routeSide right">
            <span class="city">{{ ticket.destination }}</span>
            <span class="legLabel">Destino</span>
          </div>
        </div>

        <div class="infoGrid">
          <div class="infoItem">
            <span class="infoLabel">Passageiro</span>
            <span class="infoValue">{{ ticket.passenger_name }}</span>
          </div>
          <div class="infoItem">
            <span class="infoLabel">Data</span>
            <span class="infoValue">{{ formatDate(ticket.departure_date) }}</span>
          </div>
          <div class="infoItem">
            <span class="infoLabel">Embarque</span>
            <span class="infoValue">{{ ticket.boarding_stop }}</span>
          </div>
          <div class="infoItem">
            <span class="infoLabel">Lugar</span>
            <span class="infoValue seat">{{ ticket.seat_number }}</span>
          </div>
        </div>

        <p class="note">
          Esta página confirma apenas a validade do bilhete. Dados pessoais completos
          só são visíveis ao balcão.
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.verifyPage {
  min-height: 100vh;
  background: #F6F6F6;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 28px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.logo {
  height: 34px;
  width: auto;
}

.stateBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 0;
  text-align: center;
  color: #777;
  font-size: 14px;
}

.stateTitle {
  font-size: 17px;
  font-weight: 700;
  color: #221F20;
}

.stateText {
  font-size: 13px;
  color: #888;
}

.bigIcon {
  font-size: 42px;
}

.bigIcon.bad {
  color: #d33939;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #eee;
  border-top-color: #922877;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(1turn); }
}

.statusBanner {
  width: 100%;
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.statusBanner.ok {
  background: #e8f5e9;
  color: #2e7d32;
}

.statusBanner.warn {
  background: #fff8e1;
  color: #f57f17;
}

.statusBanner.bad {
  background: #fce4ec;
  color: #c62828;
}

.ticketNumber {
  font-size: 20px;
  font-weight: 800;
  color: #922877;
  letter-spacing: 0.02em;
}

.routeRow {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
}

.routeSide {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.routeSide.right {
  align-items: flex-end;
  text-align: right;
}

.city {
  font-size: 17px;
  font-weight: 700;
  color: #221F20;
}

.legLabel {
  font-size: 12px;
  color: #922877;
  font-weight: 600;
}

.arrow {
  color: #922877;
  flex-shrink: 0;
}

.infoGrid {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.infoItem {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.infoLabel {
  font-size: 10px;
  font-weight: 700;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.infoValue {
  font-size: 14px;
  font-weight: 600;
  color: #221F20;
  word-break: break-word;
}

.infoValue.seat {
  color: #922877;
  font-size: 18px;
  font-weight: 800;
}

.note {
  font-size: 11px;
  color: #aaa;
  text-align: center;
  line-height: 1.5;
}
</style>
