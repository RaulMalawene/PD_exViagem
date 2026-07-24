<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePublicBookingStore } from '../../stores/publicBookingStore'
import { useToast } from '../../composables/useToast'
import { parseApiError } from '../../utils/parseApiError'
import BookingStepper from '../../components/BookingStepper.vue'

const router = useRouter()
const route = useRoute()
const bookingStore = usePublicBookingStore()
const { showToast } = useToast()

const tripId = route.query.trip_id

function getOrCreateSessionToken() {
  let token = sessionStorage.getItem('booking_session_token')
  if (!token) {
    token = crypto.randomUUID()
    sessionStorage.setItem('booking_session_token', token)
  }
  return token
}

const loading = ref(true)
const tripData = ref(null)
const layout = ref([])
const seatStatuses = ref({})
const selectedSeats = ref([])
const sessionToken = ref(getOrCreateSessionToken())
const seatExpiries = ref({})
const timeLeft = ref(null)
const pendingSeats = ref([])
const showDriverModal = ref(false)
const photoExpanded = ref(false)
let timerInterval = null
let pollInterval = null

const hasSelection = computed(() => selectedSeats.value.length > 0)
const hasPending = computed(() => pendingSeats.value.length > 0)

const timeLeftFormatted = computed(() => {
  if (timeLeft.value === null) return null
  const m = Math.floor(timeLeft.value / 60)
  const s = timeLeft.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const totalPrice = computed(() => {
  if (!tripData.value?.route?.price_mzn) return null
  return (Number(tripData.value.route.price_mzn) * selectedSeats.value.length)
    .toLocaleString('pt-PT')
})

function getSeatState(seat) {
  if (!seat) return 'aisle'
  if (selectedSeats.value.includes(seat)) return 'selected'
  const status = seatStatuses.value[seat] ?? 'available'
  return status === 'held' ? 'booked' : status
}

async function fetchAvailability() {
  try {
    const data = await bookingStore.fetchAvailability(tripId, sessionToken.value)

    tripData.value = data
    layout.value = data.layout ?? []

    const statuses = {}
    const myExpiries = {}
    const mySeats = []

    for (const row of (data.layout ?? [])) {
      for (const cell of row) {
        if (!cell) continue
        statuses[cell.seat] = cell.status
        if (cell.status === 'held_by_me') {
          mySeats.push(cell.seat)
          if (cell.expires_at) myExpiries[cell.seat] = new Date(cell.expires_at)
        }
      }
    }

    seatStatuses.value = statuses

    selectedSeats.value = mySeats
    seatExpiries.value = myExpiries
    if (mySeats.length) startTimer()
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    loading.value = false
  }
}

async function toggleSeat(seat) {
  if (pendingSeats.value.includes(seat)) return

  const state = getSeatState(seat)

  if (state === 'booked') return

  pendingSeats.value = [...pendingSeats.value, seat]

  if (state === 'selected') {
    await releaseSeat(seat)
    return
  }

  if (state === 'available') {
    await holdSeat(seat)
  }
}

async function holdSeat(seat) {
  try {
    await bookingStore.holdSeat(tripId, seat, sessionToken.value)
    await fetchAvailability()
  } catch (err) {
    showToast('error', err.response?.status === 409
      ? 'Este lugar já foi reservado por outro passageiro.'
      : parseApiError(err))
    await fetchAvailability()
  } finally {
    pendingSeats.value = pendingSeats.value.filter((s) => s !== seat)
  }
}

async function releaseSeat(seat) {
  try {
    await bookingStore.releaseSeat(tripId, seat, sessionToken.value)
  } catch {
    // libertar um lugar e uma operacao best-effort - o hold expira sozinho de qualquer forma
  } finally {
    await fetchAvailability()
    pendingSeats.value = pendingSeats.value.filter((s) => s !== seat)
  }
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    const now = Date.now()
    const expiredSeats = Object.entries(seatExpiries.value)
      .filter(([, expiresAt]) => expiresAt.getTime() <= now)
      .map(([seat]) => seat)

    if (expiredSeats.length) {
      const remaining = { ...seatExpiries.value }
      for (const seat of expiredSeats) delete remaining[seat]
      seatExpiries.value = remaining
      selectedSeats.value = selectedSeats.value.filter((s) => !expiredSeats.includes(s))
      showToast('error', 'O tempo para reservar um ou mais lugares expirou.')
      fetchAvailability()
    }

    const remainingExpiries = Object.values(seatExpiries.value)
    if (!remainingExpiries.length) {
      timeLeft.value = null
      clearInterval(timerInterval)
      return
    }

    const soonest = remainingExpiries.reduce((min, d) => (d < min ? d : min))
    timeLeft.value = Math.max(0, Math.floor((soonest.getTime() - now) / 1000))
  }, 1000)
}

function goToStep(step) {
  const target = bookingStore.stepRoute(step)
  if (target) router.push(target)
}

function closeDriverModal() {
  showDriverModal.value = false
  photoExpanded.value = false
}

function proceed() {
  if (!hasSelection.value || hasPending.value) return

  const expiries = Object.values(seatExpiries.value)
  const holdExpiresAt = expiries.length
    ? expiries.reduce((min, d) => (d < min ? d : min)).toISOString()
    : null

  bookingStore.saveFlow({
    tripId,
    sessionToken: sessionToken.value,
    selectedSeats: selectedSeats.value,
    holdExpiresAt,
  })

  router.push({
    path: '/booking/passengers',
    query: {
      trip_id: tripId,
      seats: selectedSeats.value.join(','),
      session_token: sessionToken.value,
    },
  })
}

onMounted(() => {
  const flow = bookingStore.flow
  if (flow.bookingGroup && String(flow.tripId) === String(tripId)) {
    router.replace({
      path: '/booking/payment',
      query: { trip_id: tripId, bookings: JSON.stringify(flow.bookingGroup) },
    })
    return
  }

  fetchAvailability()
  pollInterval = setInterval(fetchAvailability, 15000)
})

onUnmounted(() => {
  clearInterval(timerInterval)
  clearInterval(pollInterval)
})
</script>

<template>
  <div class="page">

    <!-- STEPPER -->
    <BookingStepper :current="2" @step-click="goToStep" />

    <!-- HOLD TIMER -->
    <Transition name="slide">
      <div v-if="timeLeftFormatted" class="holdTimer">
        <i class="fi fi-rs-clock timerIcon" />
        <span>Lugares reservados por: <strong>{{ timeLeftFormatted }}</strong></span>
      </div>
    </Transition>

    <!-- TRIP INFO BAR -->
    <div v-if="tripData" class="tripBar">
      <div class="tripBarInner">
        <div class="tripBarLeft">
          <span class="tripRoute">{{ tripData.route?.name ?? '--' }}</span>
          <span class="tripMeta">{{ tripData.departure_date }} · {{ tripData.departure_time?.slice(0,5) }}</span>
        </div>
        <div class="tripBarRight">
          <span class="tripPrice">{{ tripData.route?.price_mzn ? Number(tripData.route.price_mzn).toLocaleString('pt-PT') + ' MT' : '--' }}</span>
          <span class="tripPriceLabel">/ lugar</span>
        </div>
      </div>
    </div>

    <!-- CONTENT -->
    <div class="content">
      <div class="inner">

        <!-- LOADING -->
        <div v-if="loading" class="stateBox">
          <div class="spinner" />
        </div>

        <template v-else>

          <!-- SEAT MAP CARD -->
          <div class="seatCard">
            <h2 class="seatCardTitle">Escolha o seu lugar</h2>

            <!-- DRIVER -->
            <button type="button" class="driverBox" @click="showDriverModal = true">
              <span class="driverLabel">Motorista</span>
              <div class="driverRow">
                <div class="driverAvatar">
                  <img v-if="tripData?.driver?.photo_url" :src="tripData.driver.photo_url" alt="" class="driverPhoto" />
                  <i v-else class="fi fi-rs-steering-wheel driverIcon" />
                </div>
                <span class="driverName">{{ tripData?.driver?.name ?? 'Por atribuir' }}</span>
                <i class="fi fi-rs-angle-small-right driverChevron" />
              </div>
            </button>

            <!-- SEAT GRID -->
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
                  <div v-else class="aisle">
                    {{ rowIdx + 1 }}
                  </div>
                </template>
              </div>
            </div>

            <!-- LEGEND -->
            <div class="legend">
              <div class="legendItem">
                <div class="legendBox available" />
                <span>Disponível</span>
              </div>
              <div class="legendItem">
                <div class="legendBox selected" />
                <span>Selecionado</span>
              </div>
              <div class="legendItem">
                <div class="legendBox booked" />
                <span>Ocupado</span>
              </div>
            </div>
          </div>

          <!-- SELECTED SUMMARY -->
          <Transition name="slide">
            <div v-if="hasSelection" class="summary">
              <div class="summaryInfo">
                <p class="summarySeats">Lugares: {{ selectedSeats.join(', ') }}</p>
                <p class="summaryTotal">Total: {{ totalPrice }} MT</p>
              </div>
              <div class="summaryIcon">
                <i class="fi fi-rs-bus" />
              </div>
            </div>
          </Transition>

          <!-- CONTINUE BUTTON -->
          <button
            class="continueBtn"
            :class="{ disabled: !hasSelection || hasPending }"
            :disabled="!hasSelection || hasPending"
            @click="proceed"
          >
            Continuar
          </button>

        </template>
      </div>
    </div>

    <!-- DRIVER / VEHICLE MODAL -->
    <Transition name="overlay">
      <div v-if="showDriverModal" class="driverModalOverlay" @click.self="closeDriverModal">
        <Transition name="modal" appear>
          <div class="driverModalCard">
            <div class="driverModalHeader">
              <span class="driverModalTitle">Motorista e Viatura</span>
              <button class="driverModalClose" @click="closeDriverModal">
                <i class="fi fi-br-cross" />
              </button>
            </div>

            <div class="driverModalBody">
              <button
                type="button"
                class="driverPhotoBig"
                :disabled="!tripData?.driver?.photo_url"
                @click="photoExpanded = true"
              >
                <img v-if="tripData?.driver?.photo_url" :src="tripData.driver.photo_url" alt="" />
                <i v-else class="fi fi-rs-steering-wheel driverPhotoBigIcon" />
                <span v-if="tripData?.driver?.photo_url" class="driverPhotoExpandHint">
                  <i class="fi fi-rs-expand" /> Ver foto completa
                </span>
              </button>

              <span class="driverModalName">{{ tripData?.driver?.name ?? 'Por atribuir' }}</span>

              <div class="driverModalDivider" />

              <div class="vehicleInfo">
                <div class="vehicleInfoRow">
                  <i class="fi fi-rs-bus vehicleInfoIcon" />
                  <div class="vehicleInfoText">
                    <span class="vehicleInfoLabel">Modelo</span>
                    <span class="vehicleInfoValue">
                      {{ [tripData?.vehicle?.brand, tripData?.vehicle?.model].filter(Boolean).join(' ') || '--' }}
                    </span>
                  </div>
                </div>

                <div class="vehicleInfoRow">
                  <i class="fi fi-rs-id-card-clip-alt vehicleInfoIcon" />
                  <div class="vehicleInfoText">
                    <span class="vehicleInfoLabel">Matrícula</span>
                    <span class="vehicleInfoValue">{{ tripData?.vehicle?.plate ?? '--' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>

    <!-- FULL PHOTO LIGHTBOX -->
    <Transition name="overlay">
      <div v-if="photoExpanded" class="photoLightbox" @click="photoExpanded = false">
        <img :src="tripData.driver.photo_url" alt="" class="photoLightboxImg" />
        <button class="photoLightboxClose" @click="photoExpanded = false">
          <i class="fi fi-br-cross" />
        </button>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #F6F6F6;
  display: flex;
  flex-direction: column;
}

/* HOLD TIMER */
.holdTimer {
  background: #922877;
  padding: 10px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
}

.timerIcon {
  font-size: 14px;
  position: relative;
  top: 1px;
}

/* TRIP BAR */
.tripBar {
  background: #fff;
  border-bottom: 1px solid #EEEEEE;
}

.tripBarInner {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tripBarLeft {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tripRoute {
  font-size: 14px;
  font-weight: 600;
  color: #221F20;
}

.tripMeta {
  font-size: 12px;
  color: #888;
}

.tripBarRight {
  display: flex;
  align-items: baseline;
  gap: 3px;
  flex-shrink: 0;
}

.tripPrice {
  font-size: 18px;
  font-weight: 800;
  color: #922877;
}

.tripPriceLabel {
  font-size: 12px;
  color: #aaa;
}

/* CONTENT */
.content {
  flex: 1;
  padding: 20px 16px 40px;
}

.inner {
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* STATE */
.stateBox {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #f0f0f0;
  border-top-color: #922877;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* SEAT CARD */
.seatCard {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #F0F0F0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.seatCardTitle {
  font-size: 17px;
  font-weight: 700;
  color: #221F20;
}

/* DRIVER */
.driverBox {
  border: 1px solid #E8E8E8;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  background: #fff;
  font-family: 'Ubuntu', sans-serif;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.driverBox:hover {
  border-color: #922877;
  background: #FBF7FA;
}

.driverLabel {
  font-size: 10px;
  font-weight: 700;
  color: #bbb;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.driverRow {
  display: flex;
  align-items: center;
  gap: 10px;
}

.driverAvatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #F6F6F6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.driverPhoto {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driverIcon {
  font-size: 16px;
  color: #922877;
  position: relative;
  top: 1px;
}

.driverName {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
  min-width: 0;
}

.driverChevron {
  font-size: 13px;
  color: #bbb;
  flex-shrink: 0;
}

/* SEAT GRID */
.seatGrid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.seatRow {
  display: flex;
  gap: 8px;
  align-items: center;
}

.seat {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
  flex-shrink: 0;
}

.seat.available {
  background: #fff;
  border: 1.5px solid #D8D8D8;
  color: #333;
}

.seat.available:hover {
  border-color: #922877;
  color: #922877;
  transform: scale(1.05);
}

.seat.selected {
  background: #922877;
  border: 1.5px solid #922877;
  color: #fff;
  transform: scale(1.05);
}

.seat.booked {
  background: #EEEEEE;
  border: 1.5px solid #E0E0E0;
  color: #bbb;
  cursor: not-allowed;
}

.seat.pending {
  cursor: wait;
  pointer-events: none;
}

.seatSpinner {
  width: 16px;
  height: 16px;
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
  width: 24px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #ccc;
  font-weight: 500;
  flex-shrink: 0;
}

/* LEGEND */
.legend {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-top: 4px;
  border-top: 1px solid #F0F0F0;
}

.legendItem {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #666;
}

.legendBox {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  flex-shrink: 0;
}

.legendBox.available {
  background: #fff;
  border: 1.5px solid #D8D8D8;
}

.legendBox.selected {
  background: #922877;
}

.legendBox.booked {
  background: #EEEEEE;
  border: 1.5px solid #E0E0E0;
}

/* SUMMARY */
.summary {
  background: rgba(146, 40, 119, 0.06);
  border: 1px solid rgba(146, 40, 119, 0.15);
  border-radius: 12px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.summaryInfo {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.summarySeats {
  font-size: 13px;
  font-weight: 600;
  color: #922877;
}

.summaryTotal {
  font-size: 16px;
  font-weight: 800;
  color: #221F20;
}

.summaryIcon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(146, 40, 119, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #922877;
  font-size: 16px;
  flex-shrink: 0;
}

/* CONTINUE BUTTON */
.continueBtn {
  width: 100%;
  height: 52px;
  background: #922877;
  color: #fff;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  font-family: 'Ubuntu', sans-serif;
}

.continueBtn:hover:not(.disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.continueBtn:active:not(.disabled) {
  transform: translateY(0);
}

.continueBtn.disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* TRANSITIONS */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* DESKTOP */
@media (min-width: 768px) {
  .tripBarInner {
    padding: 14px 40px;
  }

  .content {
    padding: 32px 40px 64px;
  }

  .inner {
    max-width: 540px;
  }

  .seat {
    width: 52px;
    height: 52px;
    font-size: 13px;
  }
}

@media (min-width: 1024px) {
  .tripBarInner {
    padding: 14px 80px;
  }

  .content {
    padding: 40px 80px 80px;
  }

  .inner {
    max-width: 560px;
  }
}

/* DRIVER MODAL */
.driverModalOverlay {
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

.driverModalCard {
  width: 100%;
  max-width: 380px;
  max-height: calc(100vh - 80px);
  background: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.driverModalHeader {
  background: #922877;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.driverModalTitle {
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.driverModalClose {
  width: 30px;
  height: 30px;
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

.driverModalClose:hover {
  background: rgba(255, 255, 255, 0.28);
}

.driverModalBody {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.driverPhotoBig {
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: #F6F6F6;
  border: none;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.driverPhotoBig:disabled {
  cursor: default;
}

.driverPhotoBig img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.driverPhotoBigIcon {
  font-size: 44px;
  color: #922877;
}

.driverPhotoExpandHint {
  position: absolute;
  inset: auto 0 0 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 6px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.driverModalName {
  font-size: 17px;
  font-weight: 700;
  color: #221F20;
  text-align: center;
}

.driverModalDivider {
  width: 100%;
  height: 1px;
  background: #EEEEEE;
}

.vehicleInfo {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vehicleInfoRow {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vehicleInfoIcon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #F3ECF2;
  color: #922877;
  font-size: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.vehicleInfoText {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.vehicleInfoLabel {
  font-size: 10px;
  font-weight: 700;
  color: #bbb;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.vehicleInfoValue {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

/* PHOTO LIGHTBOX */
.photoLightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 6000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  cursor: zoom-out;
}

.photoLightboxImg {
  max-width: 100%;
  max-height: 100%;
  border-radius: 12px;
  object-fit: contain;
}

.photoLightboxClose {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
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