<script setup>
import { ref, nextTick } from 'vue'
import { toPng } from 'html-to-image'
import { useBookingStore } from '../stores/bookingStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import TicketCard from '../components/TicketCard.vue'

const props = defineProps({
  booking: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const bookingStore = useBookingStore()
const { showToast } = useToast()

const phone = ref(props.booking.passenger?.phone ?? '')
const errorText = ref('')
const isSending = ref(false)

const renderingForCapture = ref(false)
const ticketsToRender = ref([])
const captureRefs = ref([])

function toFlatBooking(b) {
  return {
    ticket_number: b.ticket_number,
    seat_number: b.seat_number,
    status: b.status,
    payment_method: b.invoice?.payment_method,
    passenger_name: b.passenger?.name,
    passenger_passport: b.passenger?.passport_number,
    passenger_passport_expiry: b.passenger?.passport_expiry,
    boarding_stop: b.boarding_stop?.name,
    boarding_time: b.boarding_stop?.boarding_time,
    _tripInfo: {
      route: b.trip?.route?.name,
      date: b.trip?.departure_date,
      time: b.trip?.departure_time?.slice(0, 5),
    },
    _id: b.id,
  }
}

async function captureTicketImage(el) {
  const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' })
  const blob = await (await fetch(dataUrl)).blob()
  return blob
}

async function handleSend() {
  errorText.value = ''

  if (!phone.value.trim()) {
    errorText.value = 'Indique o número de WhatsApp.'
    return
  }

  isSending.value = true

  try {
    const res = await bookingStore.fetchPassengerConfirmedBookings(props.booking.passenger.id)
    const bookings = res.data ?? []

    if (bookings.length === 0) {
      errorText.value = 'Este passageiro não tem bilhetes confirmados para enviar.'
      return
    }

    ticketsToRender.value = bookings.map(toFlatBooking)
    renderingForCapture.value = true
    await nextTick()

    let sent = 0
    let failed = 0

    for (let i = 0; i < ticketsToRender.value.length; i++) {
      const el = captureRefs.value[i]?.root
      if (!el) {
        failed++
        continue
      }

      try {
        const imageBlob = await captureTicketImage(el)
        await bookingStore.sendBookingWhatsapp(ticketsToRender.value[i]._id, phone.value.trim(), imageBlob)
        sent++
      } catch {
        failed++
      }
    }

    renderingForCapture.value = false

    if (sent > 0) {
      showToast('success', `${sent} bilhete(s) agendado(s) para envio via WhatsApp.`)
    }
    if (failed > 0) {
      showToast('error', `${failed} bilhete(s) não puderam ser agendados.`)
    }

    emit('close', sent > 0)
  } catch (err) {
    renderingForCapture.value = false
    errorText.value = parseApiError(err)
    showToast('error', errorText.value)
  } finally {
    isSending.value = false
  }
}

function handleClose() {
  if (isSending.value) return
  emit('close', false)
}
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">Enviar por WhatsApp</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <p class="helpText">
              O número da reserva pode não ter WhatsApp — confirme ou corrija o número antes de enviar.
              Se o passageiro tiver mais do que uma reserva confirmada, todos os bilhetes são enviados.
            </p>

            <div class="fieldGroup">
              <label class="fieldLabel">Número de WhatsApp</label>
              <input class="textInput" type="text" v-model="phone" placeholder="+2580000000" />
            </div>

            <span v-if="errorText" class="fieldError">{{ errorText }}</span>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" :disabled="isSending" @click="handleClose">Cancelar</button>
            <button class="btnPrimary" :disabled="isSending" @click="handleSend">
              <i class="fi fi-brands-whatsapp" />
              {{ isSending ? 'A enviar...' : 'Enviar' }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>

  <!-- CARTOES ESCONDIDOS PARA CAPTURA DE IMAGEM -->
  <div v-if="renderingForCapture" class="captureArea">
    <TicketCard
      v-for="(ticket, idx) in ticketsToRender"
      :key="idx"
      :ref="el => (captureRefs[idx] = el)"
      :booking="ticket"
      :trip-info="ticket._tripInfo"
    />
  </div>
</template>

<style scoped>
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 6000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modalCard {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modalHeader {
  background: #25D366;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.modalTitle {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
}

.closeBtn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  transition: background 0.15s;
}

.closeBtn:hover {
  background: rgba(255, 255, 255, 0.32);
}

.modalBody {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.helpText {
  font-size: 12.5px;
  color: #777;
  line-height: 1.5;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.fieldLabel {
  font-size: 13px;
  color: #333;
}

.textInput {
  height: 42px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  color: #333;
  font-family: 'Ubuntu', sans-serif;
  outline: none;
}

.textInput:focus {
  border-color: #25D366;
}

.fieldError {
  font-size: 12px;
  color: #e74c3c;
}

.modalFooter {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.btnPrimary,
.btnSecondary {
  height: 40px;
  padding: 0 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btnPrimary {
  background: #25D366;
  color: white;
}

.btnPrimary:hover:not(:disabled) {
  opacity: 0.88;
}

.btnPrimary:disabled,
.btnSecondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btnSecondary {
  background: #f0f0f0;
  color: #555;
}

.btnSecondary:hover:not(:disabled) {
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

.captureArea {
  position: fixed;
  top: 0;
  left: -10000px;
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>
