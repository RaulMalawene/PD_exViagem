<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import bookingService from '../services/bookingService'
import Text from '../components/Text.vue'
import DataCard from '../components/DataCard.vue'
import Badge from '../components/Badge.vue'

const props = defineProps({
  trip: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])

const loadingBookings = ref(false)
const bookings = ref([])
const pagination = ref({ current_page: 1, last_page: 1, total: 0 })
const activeView = ref('manifest')

const occupancyPct = computed(() => {
  const cap = props.trip.vehicle?.capacity
  if (!cap) return null
  const occupied = (props.trip.confirmed_count ?? 0) + (props.trip.pending_count ?? 0)
  return Math.round((occupied / cap) * 100)
})

const occupancyColor = computed(() => {
  const pct = occupancyPct.value
  if (pct === null) return '#999'
  if (pct >= 90) return '#e74c3c'
  if (pct >= 60) return '#f39c12'
  return '#27ae60'
})

const statusLabel = computed(() => {
  const map = { scheduled: 'Agendada', in_progress: 'Em curso', completed: 'Concluída', cancelled: 'Cancelada' }
  return map[props.trip.status] ?? props.trip.status
})

async function fetchBookings(page = 1) {
  loadingBookings.value = true
  try {
    const res = await bookingService.list({ trip_id: props.trip.id, page, per_page: 12 })
    bookings.value = res.data
    pagination.value = res.meta
  } finally {
    loadingBookings.value = false
  }
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.last_page) return
  fetchBookings(page)
}

const pageNumbers = computed(() => {
  const current = pagination.value.current_page
  const last = pagination.value.last_page
  if (last <= 5) return Array.from({ length: last }, (_, i) => i + 1)
  const range = []
  const start = Math.max(1, current - 1)
  const end = Math.min(last, current + 1)
  if (start > 1) { range.push(1); if (start > 2) range.push('...') }
  for (let i = start; i <= end; i++) range.push(i)
  if (end < last) { if (end < last - 1) range.push('...'); range.push(last) }
  return range
})

onMounted(() => fetchBookings())
</script>

<template>
  <Teleport to="body">
    <Transition name="overlay">
      <div class="modalOverlay" @click.self="emit('close')">
        <Transition name="modal" appear>
          <div class="TripDetailWrapper">

            <!-- LEFT — informações da viagem -->
            <div class="Left">
              <div class="TripContent">

                <!-- Cabeçalho da viagem -->
                <div class="TripHeader">
                  <div class="RouteBadge">
                    <i class="fi fi-sr-route" />
                    <Text :txt="trip.route?.name ?? '--'" color="fff" weight="600" size="16px" />
                  </div>
                  <button class="closeBtn" @click="emit('close')">
                    <i class="fi fi-br-cross" />
                  </button>
                </div>

                <!-- Cards de stats -->
                <div class="Cards">
                  <DataCard
                    title="Confirmados"
                    :value="String(trip.confirmed_count ?? 0)"
                    icon="fi fi-sr-check-circle"
                  />
                  <DataCard
                    title="Pendentes"
                    :value="String(trip.pending_count ?? 0)"
                    icon="fi fi-sr-clock"
                  />
                  <DataCard
                    title="Cancelados"
                    :value="String(trip.cancelled_count ?? 0)"
                    icon="fi fi-sr-cross-circle"
                  />
                  <DataCard
                    v-if="trip.vehicle?.capacity"
                    title="Capacidade"
                    :value="String(trip.vehicle.capacity)"
                    icon="fi fi-sr-seat-airline"
                  />
                </div>

                <!-- Barra de ocupação -->
                <div v-if="occupancyPct !== null" class="OccupancyBar">
                  <div class="occupancyLabel">
                    <span>Ocupação</span>
                    <span :style="{ color: occupancyColor }" class="occupancyPct">{{ occupancyPct }}%</span>
                  </div>
                  <div class="barTrack">
                    <div
                      class="barFill"
                      :style="{ width: occupancyPct + '%', background: occupancyColor }"
                    />
                  </div>
                </div>

                <!-- Detalhes da viagem -->
                <div class="InfoGrid">
                  <div class="InfoItem">
                    <i class="fi fi-rs-calendar infoIcon" />
                    <div class="infoBody">
                      <span class="infoLabel">Data</span>
                      <span class="infoValue">{{ trip.departure_date }}</span>
                    </div>
                  </div>
                  <div class="InfoItem">
                    <i class="fi fi-rs-clock infoIcon" />
                    <div class="infoBody">
                      <span class="infoLabel">Partida</span>
                      <span class="infoValue">{{ trip.departure_time }}</span>
                    </div>
                  </div>
                  <div class="InfoItem">
                    <i class="fi fi-rs-bus infoIcon" />
                    <div class="infoBody">
                      <span class="infoLabel">Veículo</span>
                      <span class="infoValue">{{ trip.vehicle ? `${trip.vehicle.brand} ${trip.vehicle.model} · ${trip.vehicle.plate}` : '--' }}</span>
                    </div>
                  </div>
                  <div class="InfoItem">
                    <i class="fi fi-rs-steering-wheel infoIcon" />
                    <div class="infoBody">
                      <span class="infoLabel">Motorista</span>
                      <span class="infoValue">{{ trip.driver?.name ?? '--' }}</span>
                    </div>
                  </div>
                  <div class="InfoItem">
                    <i class="fi fi-rs-signal-alt infoIcon" />
                    <div class="infoBody">
                      <span class="infoLabel">Estado</span>
                      <span class="infoValue">{{ statusLabel }}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <!-- RIGHT — manifesto de passageiros -->
            <div class="Right">
              <div class="ManifestHeader">
                <h3 class="panelTitle">Manifesto de passageiros</h3>
                <span class="manifestTotal">{{ pagination.total }} passageiro{{ pagination.total !== 1 ? 's' : '' }}</span>
              </div>

              <div class="ManifestBody">
                <div v-if="loadingBookings" class="manifestLoader">
                  <div class="loaderSpinner" />
                </div>

                <div v-else-if="bookings.length === 0" class="manifestEmpty">
                  <i class="fi fi-sr-users emptyIcon" />
                  <span>Sem passageiros registados</span>
                </div>

                <template v-else>
                  <div class="ManifestList">
                    <div
                      v-for="b in bookings"
                      :key="b.id"
                      class="ManifestRow"
                    >
                      <div class="seatBadge">{{ b.seat_number ?? '--' }}</div>
                      <div class="passengerInfo">
                        <span class="passengerName">{{ b.passenger?.name ?? '--' }}</span>
                        <span class="ticketNum">{{ b.ticket_number }}</span>
                      </div>
                      <div class="rowBadges">
                        <Badge :status="b.status" />
                        <Badge :status="b.payment_status" />
                      </div>
                    </div>
                  </div>

                  <!-- Paginação -->
                  <div class="manifestPagination" v-if="pagination.last_page > 1">
                    <button class="pageBtn" :disabled="pagination.current_page === 1"
                      @click="goToPage(pagination.current_page - 1)">
                      <i class="fi fi-sr-angle-left" />
                    </button>

                    <template v-for="(page, i) in pageNumbers" :key="i">
                      <span v-if="page === '...'" class="pageEllipsis">&hellip;</span>
                      <button v-else class="pageNumBtn"
                        :class="{ active: page === pagination.current_page }"
                        @click="goToPage(page)">
                        {{ page }}
                      </button>
                    </template>

                    <button class="pageBtn" :disabled="pagination.current_page === pagination.last_page"
                      @click="goToPage(pagination.current_page + 1)">
                      <i class="fi fi-sr-angle-right" />
                    </button>
                  </div>
                </template>
              </div>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.TripDetailWrapper {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  width: 100%;
  max-width: 1100px;
  max-height: calc(100vh - 80px);
}

.Left {
  flex: 1 1 auto;
  min-width: 320px;
  max-width: 520px;
  background: white;
  border-radius: 12px;
  padding: clamp(22px, 3vw, 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: calc(100vh - 80px);
}

.Right {
  flex: 0 0 clamp(300px, 36vw, 460px);
  background: white;
  border-radius: 12px;
  padding: clamp(18px, 2.5vw, 36px);
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 80px);
  overflow: hidden;
}

.TripContent {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

.TripHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.RouteBadge {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #A3206A;
  border-radius: 8px;
  padding: 10px 18px;
  flex: 1;
  min-width: 0;
}

.RouteBadge i {
  color: white;
  font-size: 16px;
  position: relative;
  top: 1px;
  flex-shrink: 0;
}

.closeBtn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f0f0f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #555;
  transition: background 0.15s;
  flex-shrink: 0;
}

.closeBtn:hover {
  background: #e0e0e0;
}

.Cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.OccupancyBar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.occupancyLabel {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.occupancyPct {
  font-weight: 700;
}

.barTrack {
  height: 8px;
  background: #f0f0f0;
  border-radius: 99px;
  overflow: hidden;
}

.barFill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
}

.InfoGrid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.InfoItem {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.infoIcon {
  color: #A3206A;
  font-size: 14px;
  width: 18px;
  flex-shrink: 0;
  position: relative;
  top: 2px;
}

.infoBody {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.infoLabel {
  font-size: 11px;
  color: #aaa;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.infoValue {
  font-size: 14px;
  color: #222;
  font-weight: 500;
}

/* RIGHT */
.ManifestHeader {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
}

.panelTitle {
  font-size: 18px;
  font-weight: 700;
  color: #222;
  margin: 0;
}

.manifestTotal {
  font-size: 13px;
  color: #999;
}

.ManifestBody {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.manifestLoader,
.manifestEmpty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #bbb;
  font-size: 14px;
}

.emptyIcon {
  font-size: 40px;
  color: #A3206A;
  opacity: 0.3;
}

.loaderSpinner {
  width: 36px;
  height: 36px;
  border: 3px solid #f0f0f0;
  border-top-color: #A3206A;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ManifestList {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

.ManifestRow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  transition: all 0.15s;
}

.ManifestRow:hover {
  background: #f5f0f3;
  border-color: rgba(163, 32, 106, 0.15);
}

.seatBadge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(163, 32, 106, 0.08);
  color: #A3206A;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.passengerInfo {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.passengerName {
  font-size: 14px;
  font-weight: 600;
  color: #222;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ticketNum {
  font-size: 11px;
  color: #aaa;
  font-family: 'Courier New', monospace;
}

.rowBadges {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

/* Paginação */
.manifestPagination {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding-top: 12px;
}

.pageBtn {
  width: 28px;
  height: 28px;
  border: none;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 11px;
  transition: background 0.15s;
}

.pageBtn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pageBtn:not(:disabled):hover {
  background: #e0e0e0;
}

.pageNumBtn {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: none;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #555;
  transition: background 0.15s;
}

.pageNumBtn:hover {
  background: #e0e0e0;
}

.pageNumBtn.active {
  background: #A3206A;
  color: white;
  font-weight: 600;
}

.pageEllipsis {
  font-size: 12px;
  color: #999;
  padding: 0 3px;
}

/* Transitions */
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
  transform: translateY(16px) scale(0.98);
}
</style>
