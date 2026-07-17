<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBookingStore } from '../stores/bookingStore'
import { formatDate } from '../utils/formatDate'
import Badge from '../components/Badge.vue'
import PaymentManagerModal from './PaymentManagerModal.vue'

const props = defineProps({
  booking: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const bookingStore = useBookingStore()

const localBooking = ref({ ...props.booking })
const packages = ref([])
const changed = ref(false)
const showPaymentManager = ref(false)

const packagesTotal = computed(() =>
  packages.value.reduce((sum, p) => sum + Number(p.total_amount), 0)
)

async function refreshBooking() {
  const res = await bookingStore.fetchBooking(localBooking.value.id)
  localBooking.value = res.data
}

async function refreshPackages() {
  const res = await bookingStore.fetchPackages(localBooking.value.id)
  packages.value = res.data
}

function openPaymentManager() {
  showPaymentManager.value = true
}

async function closePaymentManager(didChange) {
  showPaymentManager.value = false

  if (didChange) {
    changed.value = true
    await Promise.all([refreshBooking(), refreshPackages()])
  }
}

function handleClose() {
  emit('close', changed.value)
}

onMounted(() => {
  refreshPackages()
})
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard" :class="{ withDrawer: showPaymentManager }">
          <div class="modalHeader">
            <div class="headerLeft">
              <i class="fi fi-rs-ticket headerIcon" />
              <span class="headerTitle">{{ localBooking.ticket_number ?? 'Reserva' }}</span>
              <div class="headerDivider" />
              <span class="headerMeta">Assento {{ localBooking.seat_number ?? '--' }}</span>
            </div>
            <div class="headerRight">
              <Badge :status="localBooking.status" />
              <Badge v-if="localBooking.invoice" :status="localBooking.invoice.status" />
              <button class="closeBtn" @click="handleClose">
                <i class="fi fi-br-cross" />
              </button>
            </div>
          </div>

          <div class="modalBody">
            <div class="section">
              <span class="sectionTitle">Passageiro</span>
              <div class="infoGrid">
                <div class="infoItem">
                  <span class="infoLabel">Nome</span>
                  <span class="infoValue">{{ localBooking.passenger?.name ?? '--' }}</span>
                </div>
                <div class="infoItem">
                  <span class="infoLabel">Passaporte</span>
                  <span class="infoValue">{{ localBooking.passenger?.passport_number ?? '--' }}</span>
                </div>
                <div class="infoItem">
                  <span class="infoLabel">Validade do passaporte</span>
                  <span class="infoValue">{{ formatDate(localBooking.passenger?.passport_expiry) }}</span>
                </div>
                <div class="infoItem">
                  <span class="infoLabel">Telefone</span>
                  <span class="infoValue">{{ localBooking.passenger?.phone ?? '--' }}</span>
                </div>
                <div class="infoItem">
                  <span class="infoLabel">Contacto de emergência</span>
                  <span class="infoValue">{{ localBooking.passenger?.emergency_contact_phone ?? '--' }}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <span class="sectionTitle">Viagem</span>
              <div class="infoGrid">
                <div class="infoItem">
                  <span class="infoLabel">Rota</span>
                  <span class="infoValue">{{ localBooking.trip?.route?.name ?? '--' }}</span>
                </div>
                <div class="infoItem">
                  <span class="infoLabel">Data</span>
                  <span class="infoValue">{{ formatDate(localBooking.trip?.departure_date) }}</span>
                </div>
                <div class="infoItem">
                  <span class="infoLabel">Hora de partida</span>
                  <span class="infoValue">{{ localBooking.trip?.departure_time ?? '--' }}</span>
                </div>
                <div class="infoItem">
                  <span class="infoLabel">Ponto de embarque</span>
                  <span class="infoValue">
                    {{ localBooking.boarding_stop ? `${localBooking.boarding_stop.name} · ${localBooking.boarding_stop.boarding_time}` : '--' }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="localBooking.notes" class="section">
              <span class="sectionTitle">Notas</span>
              <p class="notesText">{{ localBooking.notes }}</p>
            </div>

            <div class="section paymentSummary">
              <span class="sectionTitle">Pagamento</span>

              <div v-if="localBooking.invoice" class="summaryRow">
                <span class="summaryLabel">Bilhete</span>
                <Badge :status="localBooking.invoice.status" />
                <span class="summaryAmount">{{ localBooking.invoice.total_amount }} {{ localBooking.invoice.currency }}</span>
              </div>

              <div v-if="packages.length" class="summaryRow">
                <span class="summaryLabel">Mercadorias ({{ packages.length }})</span>
                <span class="summaryAmount">{{ packagesTotal.toFixed(2) }} {{ localBooking.invoice?.currency ?? 'MZN' }}</span>
              </div>

              <button class="manageBtn" @click="openPaymentManager">
                <i class="fi fi-rs-wallet" />
                Gerir pagamentos
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <PaymentManagerModal
    v-if="showPaymentManager"
    :booking="localBooking"
    @close="closePaymentManager"
  />
</template>

<style scoped>
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modalCard {
  width: 100%;
  max-width: 560px;
  max-height: calc(100vh - 80px);
  background: white;
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.25s ease;
}

.modalCard.withDrawer {
  transform: translateX(-210px);
}

.modalHeader {
  background: #922877;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.headerIcon {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
  position: relative;
  top: 1px;
}

.headerTitle {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.headerMeta {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  white-space: nowrap;
}

.headerDivider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.closeBtn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  transition: background 0.15s;
}

.closeBtn:hover {
  background: rgba(255, 255, 255, 0.28);
}

.modalBody {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sectionTitle {
  font-size: 13px;
  font-weight: 700;
  color: #922877;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.infoGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.infoItem {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.infoLabel {
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.infoValue {
  font-size: 14px;
  color: #222;
  font-weight: 500;
}

.notesText {
  font-size: 13px;
  color: #555;
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 12px;
}

.paymentSummary {
  background: #fafafa;
  border-radius: 10px;
  padding: 16px;
}

.summaryRow {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summaryLabel {
  font-size: 13px;
  color: #555;
  font-weight: 500;
  flex: 1;
}

.summaryAmount {
  font-size: 14px;
  color: #222;
  font-weight: 700;
}

.manageBtn {
  margin-top: 4px;
  align-self: flex-start;
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.15s;
  color: #fff;
  background: #922877;
}

.manageBtn:hover {
  opacity: 0.88;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
</style>
