<script setup>
import { ref } from 'vue'
import { useBookingStore } from '../stores/bookingStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { formatDate } from '../utils/formatDate'
import Badge from '../components/Badge.vue'

const props = defineProps({
  booking: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const bookingStore = useBookingStore()
const { showToast } = useToast()

const localBooking = ref({ ...props.booking })
const changed = ref(false)

const paymentMethodOptions = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'transfer_mz', label: 'Transferência (MZ)' },
  { value: 'transfer_za', label: 'Transferência (ZA)' },
]

const confirmForm = ref({ payment_method: '', payment_reference: '' })
const isConfirming = ref(false)

const cancelForm = ref({ notes: '' })
const cancelError = ref('')
const isCancelling = ref(false)
const showCancelForm = ref(false)

const paymentForm = ref({
  payment_method: props.booking.payment_method ?? '',
  payment_reference: props.booking.payment_reference ?? '',
  payment_status: props.booking.payment_status ?? 'pending',
})
const isUpdatingPayment = ref(false)

async function handleConfirm() {
  isConfirming.value = true

  try {
    const payload = {}
    if (confirmForm.value.payment_method) payload.payment_method = confirmForm.value.payment_method
    if (confirmForm.value.payment_reference) payload.payment_reference = confirmForm.value.payment_reference

    localBooking.value = await bookingStore.confirmBooking(localBooking.value.id, payload)
    changed.value = true
    showToast('success', 'Reserva confirmada com sucesso.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isConfirming.value = false
  }
}

async function handleCancel() {
  cancelError.value = ''
  if (!cancelForm.value.notes.trim()) {
    cancelError.value = 'O motivo do cancelamento é obrigatório.'
    return
  }

  isCancelling.value = true

  try {
    localBooking.value = await bookingStore.cancelBooking(localBooking.value.id, cancelForm.value.notes)
    changed.value = true
    showCancelForm.value = false
    cancelForm.value.notes = ''
    showToast('success', 'Reserva cancelada com sucesso.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isCancelling.value = false
  }
}

async function handleUpdatePayment() {
  isUpdatingPayment.value = true

  try {
    localBooking.value = await bookingStore.updateBookingPayment(localBooking.value.id, {
      payment_method: paymentForm.value.payment_method || null,
      payment_reference: paymentForm.value.payment_reference || null,
      payment_status: paymentForm.value.payment_status,
    })
    changed.value = true
    showToast('success', 'Pagamento actualizado com sucesso.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isUpdatingPayment.value = false
  }
}

function handleClose() {
  emit('close', changed.value)
}
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <div class="headerLeft">
              <i class="fi fi-rs-ticket headerIcon" />
              <span class="headerTitle">{{ localBooking.ticket_number ?? 'Reserva' }}</span>
              <div class="headerDivider" />
              <span class="headerMeta">Assento {{ localBooking.seat_number ?? '--' }}</span>
            </div>
            <div class="headerRight">
              <Badge :status="localBooking.status" />
              <Badge :status="localBooking.payment_status" />
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

            <div class="verticalSpacer" />

            <div v-if="localBooking.status === 'pending'" class="section actionSection">
              <span class="sectionTitle">Confirmar reserva</span>
              <div class="fieldRow">
                <div class="fieldGroup">
                  <label class="fieldLabel">Método de pagamento</label>
                  <select class="selectInput" v-model="confirmForm.payment_method">
                    <option value="">Não definir</option>
                    <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="fieldGroup">
                  <label class="fieldLabel">Referência</label>
                  <input class="textInput" type="text" v-model="confirmForm.payment_reference" placeholder="Opcional" />
                </div>
              </div>
              <button class="actionBtn green" :disabled="isConfirming" @click="handleConfirm">
                <i class="fi fi-rs-check" />
                {{ isConfirming ? 'A confirmar...' : 'Confirmar reserva' }}
              </button>
            </div>

            <div v-if="localBooking.status !== 'cancelled'" class="section actionSection">
              <span class="sectionTitle">Cancelar reserva</span>

              <template v-if="!showCancelForm">
                <button class="actionBtn red" @click="showCancelForm = true">
                  <i class="fi fi-rs-ban" />
                  Cancelar reserva
                </button>
              </template>

              <template v-else>
                <div class="fieldGroup">
                  <label class="fieldLabel">Motivo do cancelamento</label>
                  <textarea class="textareaInput" v-model="cancelForm.notes" rows="2" placeholder="Explique o motivo do cancelamento" />
                  <span v-if="cancelError" class="fieldError">{{ cancelError }}</span>
                </div>
                <div class="cancelActions">
                  <button class="btnSecondary" @click="showCancelForm = false; cancelForm.notes = ''; cancelError = ''">Voltar</button>
                  <button class="actionBtn red" :disabled="isCancelling" @click="handleCancel">
                    {{ isCancelling ? 'A cancelar...' : 'Confirmar cancelamento' }}
                  </button>
                </div>
              </template>
            </div>

            <div class="section actionSection">
              <span class="sectionTitle">Actualizar pagamento</span>
              <div class="fieldRow">
                <div class="fieldGroup">
                  <label class="fieldLabel">Método de pagamento</label>
                  <select class="selectInput" v-model="paymentForm.payment_method">
                    <option value="">Não definir</option>
                    <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="fieldGroup">
                  <label class="fieldLabel">Estado do pagamento</label>
                  <select class="selectInput" v-model="paymentForm.payment_status">
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="refunded">Reembolsado</option>
                  </select>
                </div>
              </div>
              <div class="fieldGroup">
                <label class="fieldLabel">Referência</label>
                <input class="textInput" type="text" v-model="paymentForm.payment_reference" placeholder="Opcional" />
              </div>
              <button class="actionBtn magenta" :disabled="isUpdatingPayment" @click="handleUpdatePayment">
                <i class="fi fi-rs-credit-card" />
                {{ isUpdatingPayment ? 'A actualizar...' : 'Actualizar pagamento' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
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
  max-width: 640px;
  max-height: calc(100vh - 80px);
  background: white;
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

.verticalSpacer {
  height: 1px;
  background: #f0f0f0;
}

.actionSection {
  background: #fafafa;
  border-radius: 10px;
  padding: 16px;
}

.fieldRow {
  display: flex;
  gap: 14px;
}

.fieldRow .fieldGroup {
  flex: 1;
  min-width: 0;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fieldLabel {
  font-size: 12px;
  font-weight: 600;
  color: #555;
}

.selectInput,
.textInput {
  height: 38px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
  color: #333;
  font-family: 'Ubuntu', sans-serif;
  background: #fff;
  outline: none;
}

.textareaInput {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  color: #333;
  font-family: 'Ubuntu', sans-serif;
  background: #fff;
  outline: none;
  resize: vertical;
}

.selectInput:focus,
.textInput:focus,
.textareaInput:focus {
  border-color: #922877;
}

.fieldError {
  font-size: 11px;
  color: #e74c3c;
}

.cancelActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.actionBtn {
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
}

.actionBtn:hover:not(:disabled) {
  opacity: 0.88;
}

.actionBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.actionBtn.green {
  background: #8B9B1A;
}

.actionBtn.magenta {
  background: #922877;
}

.actionBtn.red {
  background: #d33939;
}

.btnSecondary {
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  background: #f0f0f0;
  color: #555;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btnSecondary:hover {
  background: #e0e0e0;
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
