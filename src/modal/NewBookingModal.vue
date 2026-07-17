<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useBookingStore } from '../stores/bookingStore'
import { useTripStore } from '../stores/tripStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { formatDate } from '../utils/formatDate'
import BaseInput from '../components/BaseInput.vue'
import InputDropDown from '../components/InputDropDown.vue'
import flagMz from '../assets/flag_mz.svg'
import flagZa from '../assets/flag_southAfrica.png'

const emit = defineEmits(['close'])

const bookingStore = useBookingStore()
const tripStore = useTripStore()
const { trips } = storeToRefs(tripStore)
const { showToast } = useToast()

const sessionToken = crypto.randomUUID()

const countries = [
  { code: 'MZ', prefix: '+258', flag: flagMz, label: 'MZ +258' },
  { code: 'ZA', prefix: '+27', flag: flagZa, label: 'ZA +27' },
]

function getPrefix(code) {
  return countries.find((c) => c.code === code)?.prefix ?? '+258'
}

function getFlag(code) {
  return countries.find((c) => c.code === code)?.flag ?? flagMz
}

const selectedTripId = ref('')
let heldTripId = null

const loadingAvailability = ref(false)
const tripData = ref(null)
const layout = ref([])
const seatStatuses = ref({})
const selectedSeats = ref([])
const pendingSeats = ref([])
const passengers = ref({})

const paymentMethodOptions = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'transfer_mz', label: 'Transferência (MZ)' },
  { value: 'transfer_za', label: 'Transferência (ZA)' },
]
const paymentMethod = ref('cash')
const currency = ref('MZN')

const errorText = ref('')
const isSubmitting = ref(false)

const tripOptions = computed(() =>
  trips.value
    .filter((t) => !['cancelled', 'completed'].includes(t.status))
    .map((t) => ({
      id: t.id,
      name: `${t.route?.name ?? '--'} · ${formatDate(t.departure_date)} · ${(t.departure_time ?? '').slice(0, 5)}`,
    }))
)

const boardingStopOptions = computed(() =>
  (tripData.value?.route?.stops ?? []).map((s) => ({
    id: s.id,
    name: s.boarding_time ? `${s.name} (${s.boarding_time.slice(0, 5)})` : s.name,
  }))
)

function buildEmptyPassenger() {
  return {
    name: '',
    passport_number: '',
    passport_expiry: '',
    phone: '',
    phone_country: 'MZ',
    phone_open: false,
    emergency_contact_phone: '',
    emergency_country: 'MZ',
    emergency_open: false,
    boarding_stop_id: tripData.value?.route?.stops?.[0]?.id ?? null,
  }
}

function togglePhoneDropdown(seat) {
  passengers.value[seat].phone_open = !passengers.value[seat].phone_open
  passengers.value[seat].emergency_open = false
}

function toggleEmergencyDropdown(seat) {
  passengers.value[seat].emergency_open = !passengers.value[seat].emergency_open
  passengers.value[seat].phone_open = false
}

function selectPhoneCountry(seat, code) {
  passengers.value[seat].phone_country = code
  passengers.value[seat].phone_open = false
}

function selectEmergencyCountry(seat, code) {
  passengers.value[seat].emergency_country = code
  passengers.value[seat].emergency_open = false
}

function handleOutsideClick() {
  Object.values(passengers.value).forEach((p) => {
    p.phone_open = false
    p.emergency_open = false
  })
}

function getSeatState(seat) {
  if (selectedSeats.value.includes(seat)) return 'selected'
  const status = seatStatuses.value[seat] ?? 'available'
  return status === 'held' ? 'booked' : status
}

async function loadAvailability() {
  loadingAvailability.value = true
  try {
    const data = await bookingStore.fetchTripAvailability(selectedTripId.value, sessionToken)
    tripData.value = data
    layout.value = data.layout ?? []

    const statuses = {}
    for (const row of layout.value) {
      for (const cell of row) {
        if (!cell) continue
        statuses[cell.seat] = cell.status
      }
    }
    seatStatuses.value = statuses
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    loadingAvailability.value = false
  }
}

async function handleTripChange(tripId) {
  if (heldTripId && selectedSeats.value.length) {
    try {
      await bookingStore.releaseAllSeats(heldTripId, sessionToken)
    } catch {
      // best-effort - o hold expira sozinho de qualquer forma
    }
  }

  selectedTripId.value = tripId
  heldTripId = tripId
  selectedSeats.value = []
  passengers.value = {}
  tripData.value = null
  errorText.value = ''

  if (tripId) await loadAvailability()
}

async function toggleSeat(seat) {
  if (pendingSeats.value.includes(seat)) return

  const state = getSeatState(seat)
  if (state === 'booked') return

  pendingSeats.value = [...pendingSeats.value, seat]

  try {
    if (state === 'selected') {
      await bookingStore.releaseSeat(selectedTripId.value, seat, sessionToken)
      selectedSeats.value = selectedSeats.value.filter((s) => s !== seat)
      const updated = { ...passengers.value }
      delete updated[seat]
      passengers.value = updated
    } else {
      await bookingStore.holdSeat(selectedTripId.value, seat, sessionToken)
      selectedSeats.value = [...selectedSeats.value, seat]
      passengers.value = { ...passengers.value, [seat]: buildEmptyPassenger() }
    }
    await loadAvailability()
  } catch (err) {
    showToast('error', err.response?.status === 409
      ? 'Este lugar já foi reservado por outra pessoa.'
      : parseApiError(err))
    await loadAvailability()
  } finally {
    pendingSeats.value = pendingSeats.value.filter((s) => s !== seat)
  }
}

function validate() {
  errorText.value = ''

  if (selectedSeats.value.length === 0) {
    errorText.value = 'Seleccione pelo menos um lugar.'
    return false
  }

  for (const seat of selectedSeats.value) {
    const p = passengers.value[seat]
    if (!p.name.trim() || !p.passport_number.trim() || !p.passport_expiry || !p.phone.trim() || !p.emergency_contact_phone.trim() || !p.boarding_stop_id) {
      errorText.value = `Preencha todos os campos do passageiro do lugar ${seat}.`
      return false
    }

    const phone = getPrefix(p.phone_country) + p.phone.trim()
    const emergencyPhone = getPrefix(p.emergency_country) + p.emergency_contact_phone.trim()
    if (phone === emergencyPhone) {
      errorText.value = `Lugar ${seat}: o telefone pessoal e o telefone de emergência não podem ser iguais.`
      return false
    }

    if (tripData.value?.departure_date && p.passport_expiry < tripData.value.departure_date) {
      errorText.value = `Lugar ${seat}: o passaporte não pode estar expirado na data da viagem.`
      return false
    }
  }

  const passportNumbers = selectedSeats.value.map((seat) => passengers.value[seat].passport_number.trim().toUpperCase())
  if (new Set(passportNumbers).size !== passportNumbers.length) {
    errorText.value = 'Não pode haver dois passageiros com o mesmo número de passaporte.'
    return false
  }

  return true
}

async function handleSubmit() {
  if (!validate()) return
  isSubmitting.value = true

  try {
    const payload = {
      session_token: sessionToken,
      trip_id: Number(selectedTripId.value),
      payment_method: paymentMethod.value,
      currency: currency.value,
      bookings: selectedSeats.value.map((seat) => {
        const p = passengers.value[seat]
        return {
          seat_number: seat,
          boarding_stop_id: p.boarding_stop_id,
          passenger: {
            name: p.name.trim(),
            passport_number: p.passport_number.trim(),
            passport_expiry: p.passport_expiry,
            phone: getPrefix(p.phone_country) + p.phone.trim(),
            emergency_contact_phone: getPrefix(p.emergency_country) + p.emergency_contact_phone.trim(),
          },
        }
      }),
    }

    const res = await bookingStore.createBookings(payload)
    const tickets = (res.data ?? []).map((b) => b.ticket_number).join(', ')
    showToast('success', `Reserva(s) criada(s) com sucesso: ${tickets}`)
    emit('close', true)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSubmitting.value = false
  }
}

async function handleClose() {
  if (heldTripId && selectedSeats.value.length) {
    try {
      await bookingStore.releaseAllSeats(heldTripId, sessionToken)
    } catch {
      // best-effort
    }
  }
  emit('close', false)
}

onMounted(() => {
  tripStore.fetchTrips({ per_page: 100 })
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">Nova Reserva</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <!-- COLUNA ESQUERDA: viagem + mapa de assentos -->
            <div class="leftPanel">
              <div class="fieldGroup">
                <InputDropDown label="Viagem" :modelValue="selectedTripId" :options="tripOptions"
                  @update:modelValue="handleTripChange" />
              </div>

              <div v-if="loadingAvailability" class="stateBox">
                <div class="spinner" />
              </div>

              <template v-else-if="tripData">
                <div class="seatGrid">
                  <div v-for="(row, rowIdx) in layout" :key="rowIdx" class="seatRow">
                    <template v-for="(cell, colIdx) in row" :key="colIdx">
                      <div
                        v-if="cell"
                        class="seat"
                        :class="[getSeatState(cell.seat), { pending: pendingSeats.includes(cell.seat) }]"
                        @click="toggleSeat(cell.seat)"
                      >
                        <div v-if="pendingSeats.includes(cell.seat)" class="seatSpinner" />
                        <span v-else>{{ cell.seat }}</span>
                      </div>
                      <div v-else class="aisle" />
                    </template>
                  </div>
                </div>

                <div class="legend">
                  <div class="legendItem"><div class="legendBox available" />Disponível</div>
                  <div class="legendItem"><div class="legendBox selected" />Seleccionado</div>
                  <div class="legendItem"><div class="legendBox booked" />Ocupado</div>
                </div>
              </template>
            </div>

            <div class="verticalDivider" />

            <!-- COLUNA DIREITA: dados dos passageiros seleccionados -->
            <div class="rightPanel">
              <div v-if="!tripData" class="emptyState">
                <i class="fi fi-rs-route emptyIcon" />
                <p>Escolha uma viagem para ver o mapa de assentos.</p>
              </div>

              <div v-else-if="!selectedSeats.length" class="emptyState">
                <i class="fi fi-rs-armchair emptyIcon" />
                <p>Seleccione um ou mais lugares no mapa ao lado.</p>
              </div>

              <template v-else>
                <div v-for="seat in selectedSeats" :key="seat" class="passengerSection">
                  <span class="sectionTitle">Passageiro - Lugar {{ seat }}</span>

                  <div class="fieldGroup">
                    <BaseInput label="Nome completo" :modelValue="passengers[seat].name"
                      @update:modelValue="passengers[seat].name = $event" />
                  </div>

                  <div class="fieldRow">
                    <div class="fieldGroup">
                      <BaseInput label="Número de passaporte" :modelValue="passengers[seat].passport_number"
                        @update:modelValue="passengers[seat].passport_number = $event" />
                    </div>
                    <div class="fieldGroup">
                      <BaseInput label="Validade do passaporte" type="date" :modelValue="passengers[seat].passport_expiry"
                        @update:modelValue="passengers[seat].passport_expiry = $event" />
                    </div>
                  </div>

                  <div class="fieldGroup">
                    <InputDropDown label="Ponto de embarque" :modelValue="passengers[seat].boarding_stop_id"
                      :options="boardingStopOptions" @update:modelValue="passengers[seat].boarding_stop_id = $event" />
                  </div>

                  <div class="fieldGroup">
                    <label class="fieldLabel">Telefone</label>
                    <div class="telWrap" :class="{ focused: passengers[seat].phone_open }">
                      <div class="telPrefix" @click.stop="togglePhoneDropdown(seat)">
                        <img :src="getFlag(passengers[seat].phone_country)" alt="" class="flagIcon" />
                        <span class="prefixCode">{{ passengers[seat].phone_country }} {{ getPrefix(passengers[seat].phone_country) }}</span>
                        <i class="fi fi-rs-angle-small-down prefixChevron" :class="{ rotated: passengers[seat].phone_open }" />
                        <Transition name="drop">
                          <ul v-if="passengers[seat].phone_open" class="prefixDropdown" @click.stop>
                            <li v-for="c in countries" :key="c.code" class="prefixOption"
                              :class="{ active: passengers[seat].phone_country === c.code }"
                              @click.stop="selectPhoneCountry(seat, c.code)">
                              <img :src="c.flag" alt="" class="flagIcon" />
                              <span>{{ c.label }}</span>
                            </li>
                          </ul>
                        </Transition>
                      </div>
                      <input v-model="passengers[seat].phone" type="tel" class="input telInput" placeholder="84 123 4567" />
                    </div>
                  </div>

                  <div class="fieldGroup">
                    <label class="fieldLabel">Telefone de emergência</label>
                    <div class="telWrap" :class="{ focused: passengers[seat].emergency_open }">
                      <div class="telPrefix" @click.stop="toggleEmergencyDropdown(seat)">
                        <img :src="getFlag(passengers[seat].emergency_country)" alt="" class="flagIcon" />
                        <span class="prefixCode">{{ passengers[seat].emergency_country }} {{ getPrefix(passengers[seat].emergency_country) }}</span>
                        <i class="fi fi-rs-angle-small-down prefixChevron" :class="{ rotated: passengers[seat].emergency_open }" />
                        <Transition name="drop">
                          <ul v-if="passengers[seat].emergency_open" class="prefixDropdown" @click.stop>
                            <li v-for="c in countries" :key="c.code" class="prefixOption"
                              :class="{ active: passengers[seat].emergency_country === c.code }"
                              @click.stop="selectEmergencyCountry(seat, c.code)">
                              <img :src="c.flag" alt="" class="flagIcon" />
                              <span>{{ c.label }}</span>
                            </li>
                          </ul>
                        </Transition>
                      </div>
                      <input v-model="passengers[seat].emergency_contact_phone" type="tel" class="input telInput" placeholder="84 123 4568" />
                    </div>
                  </div>
                </div>

                <div class="paymentSection">
                  <span class="sectionTitle">Pagamento</span>
                  <div class="fieldRow">
                    <div class="fieldGroup">
                      <label class="fieldLabel">Método de pagamento</label>
                      <select class="selectInput" v-model="paymentMethod">
                        <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                    </div>
                    <div class="fieldGroup">
                      <label class="fieldLabel">Moeda</label>
                      <select class="selectInput" v-model="currency">
                        <option value="MZN">MZN</option>
                        <option value="ZAR">ZAR</option>
                      </select>
                    </div>
                  </div>
                </div>

                <span v-if="errorText" class="fieldError">{{ errorText }}</span>
              </template>
            </div>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">Cancelar</button>
            <button class="btnPrimary" :disabled="isSubmitting || !selectedSeats.length" @click="handleSubmit">
              {{ isSubmitting ? 'A criar...' : 'Criar reserva' }}
            </button>
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
  max-width: 900px;
  height: min(680px, calc(100vh - 80px));
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
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.leftPanel {
  width: 320px;
  flex-shrink: 0;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

.verticalDivider {
  width: 1px;
  background: #e8e8e8;
  flex-shrink: 0;
  align-self: stretch;
}

.rightPanel {
  flex: 1;
  min-width: 0;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

.emptyState {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  color: #999;
  font-size: 13px;
}

.emptyIcon {
  font-size: 30px;
  color: #922877;
  opacity: 0.3;
}

.stateBox {
  display: flex;
  justify-content: center;
  padding: 30px 0;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f0f0f0;
  border-top-color: #922877;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.sectionTitle {
  font-size: 13px;
  font-weight: 700;
  color: #922877;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.seatGrid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.seatRow {
  display: flex;
  gap: 6px;
}

.seat {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
  flex-shrink: 0;
}

.seat.available {
  background: #fff;
  border: 1.5px solid #d8d8d8;
  color: #333;
}

.seat.available:hover {
  border-color: #922877;
  color: #922877;
}

.seat.selected {
  background: #922877;
  border: 1.5px solid #922877;
  color: #fff;
}

.seat.booked {
  background: #eeeeee;
  border: 1.5px solid #e0e0e0;
  color: #bbb;
  cursor: not-allowed;
}

.seat.pending {
  cursor: wait;
  pointer-events: none;
}

.seatSpinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(146, 40, 119, 0.25);
  border-top-color: #922877;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.seat.selected .seatSpinner {
  border-color: rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
}

.aisle {
  width: 18px;
  height: 38px;
  flex-shrink: 0;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 6px;
  border-top: 1px solid #f0f0f0;
}

.legendItem {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #666;
}

.legendBox {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}

.legendBox.available {
  background: #fff;
  border: 1.5px solid #d8d8d8;
}

.legendBox.selected {
  background: #922877;
}

.legendBox.booked {
  background: #eeeeee;
  border: 1.5px solid #e0e0e0;
}

.passengerSection {
  background: #fafafa;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.paymentSection {
  display: flex;
  flex-direction: column;
  gap: 10px;
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
  gap: 3px;
}

.fieldLabel {
  font-size: 13px;
  color: #333;
}

.selectInput {
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 13px;
  color: #333;
  font-family: 'Ubuntu', sans-serif;
  background: #fff;
  outline: none;
}

.fieldError {
  font-size: 12px;
  color: #e74c3c;
  padding-left: 2px;
}

/* TELEFONE COM PREFIXO (mesmo padrao do fluxo publico) */
.telWrap {
  display: flex;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: visible;
  transition: border-color 0.15s;
  background: #fff;
  position: relative;
}

.telWrap.focused,
.telWrap:focus-within {
  border-color: #922877;
}

.telPrefix {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  background: #f6f6f6;
  border-right: 1px solid #ddd;
  height: 38px;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 7px 0 0 7px;
  position: relative;
  user-select: none;
  transition: background 0.15s;
}

.telPrefix:hover {
  background: #eeeeee;
}

.flagIcon {
  width: 18px;
  height: 13px;
  object-fit: cover;
  border-radius: 2px;
  flex-shrink: 0;
}

.prefixCode {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

.prefixChevron {
  font-size: 11px;
  color: #aaa;
  transition: transform 0.2s;
}

.prefixChevron.rotated {
  transform: rotate(180deg);
}

.prefixDropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 500;
  list-style: none;
  padding: 4px;
  min-width: 140px;
}

.prefixOption {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  font-size: 13px;
  color: #333;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
}

.prefixOption:hover {
  background: #f6f0f4;
}

.prefixOption.active {
  background: rgba(146, 40, 119, 0.08);
  color: #922877;
  font-weight: 600;
}

.input {
  border: none;
  outline: none;
  font-size: 13px;
  font-family: 'Ubuntu', sans-serif;
  color: #333;
}

.telInput {
  flex: 1;
  min-width: 0;
  height: 38px;
  padding: 0 10px;
  border-radius: 0 7px 7px 0;
}

/* TRANSICOES */
.drop-enter-active,
.drop-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}

.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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
}

.btnPrimary {
  background: #922877;
  color: white;
}

.btnPrimary:hover:not(:disabled) {
  opacity: 0.88;
}

.btnPrimary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btnSecondary {
  background: #f0f0f0;
  color: #555;
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
