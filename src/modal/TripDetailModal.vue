<script setup>
import { ref, computed, onMounted } from 'vue'
import bookingService from '../services/bookingService'
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
const search = ref('')
const includeCancelled = ref(false)

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
  const map = {
    scheduled: 'Agendada',
    boarding: 'Em embarque',
    in_progress: 'Em curso',
    completed: 'Concluída',
    cancelled: 'Cancelada',
    delayed: 'Com atraso',
  }
  return map[props.trip.status] ?? props.trip.status
})

const filteredBookings = computed(() => {
  if (!search.value.trim()) return bookings.value
  const q = search.value.toLowerCase()
  return bookings.value.filter(
    (b) =>
      b.passenger?.name?.toLowerCase().includes(q) ||
      b.ticket_number?.toLowerCase().includes(q) ||
      b.seat_number?.toLowerCase().includes(q)
  )
})

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

async function fetchBookings(page = 1) {
  loadingBookings.value = true
  try {
    const res = await bookingService.listByTrip(props.trip.id, {
      page,
      per_page: 12,
      include_cancelled: includeCancelled.value,
    })
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

function toggleIncludeCancelled() {
  includeCancelled.value = !includeCancelled.value
  fetchBookings(1)
}

onMounted(() => fetchBookings())
</script>


<template>

  <Transition name="overlay">
    <div class="modalOverlay" @click.self="emit('close')">
      <Transition name="modal" appear>
        <div class="modalCard">

          <!-- HEADER-->
          <div class="modalHeader">
            <div class="headerLeft">
              <i class="fi fi-rs-route headerIcon" />
              <span class="headerRoute">{{ trip.route?.name ?? '--' }}</span>
              <div class="headerDivider" />
              <i class="fi fi-rs-calendar headerIcon" />
              <span class="headerMeta">{{ trip.departure_date }}</span>
              <div class="headerDivider" />
              <i class="fi fi-rs-clock headerIcon" />
              <span class="headerMeta">{{ trip.departure_time }}</span>
            </div>
            <div class="headerRight">
              <span class="statusBadge">{{ statusLabel }}</span>
              <button class="closeBtn" @click="emit('close')">
                <i class="fi fi-br-cross" />
              </button>
            </div>
          </div>

          <!-- BODY -->

          <div class="modalBody">

            <!-- COLUNA ESQUERDA -->
            <div class="leftPanel">

              <div class="statsGrid">
                <DataCard title="Confirmados" :value="String(trip.confirmed_count ?? 0)" icon="fi fi-sr-check-circle" />
                <DataCard title="Pendentes" :value="String(trip.pending_count ?? 0)" icon="fi fi-sr-clock" />
                <DataCard title="Cancelados" :value="String(trip.cancelled_count ?? 0)" icon="fi fi-sr-cross-circle" />
                <DataCard v-if="trip.vehicle?.capacity" title="Capacidade" :value="String(trip.vehicle.capacity)"
                  icon="fi fi-sr-seat-airline" />
              </div>

              <div v-if="occupancyPct !== null" class="occupancyBar">
                <div class="occupancyLabel">
                  <span>Ocupação</span>
                  <span :style="{ color: occupancyColor }" class="occupancyPct">{{ occupancyPct }}%</span>
                </div>
                <div class="barTrack">
                  <div class="barFill" :style="{ width: occupancyPct + '%', background: occupancyColor }" />
                </div>
              </div>

              <div class="infoRow">
                <div class="infoRowHeader">
                  <i class="fi fi-rs-bus infoRowIcon" />
                  <span class="infoLabel">Veículo</span>
                </div>
                <span class="infoValue">
                  {{ trip.vehicle ? `${trip.vehicle.brand} ${trip.vehicle.model} · ${trip.vehicle.plate}` : '--' }}
                </span>
              </div>

              <div class="infoRow">
                <div class="infoRowHeader">
                  <i class="fi fi-rs-steering-wheel infoRowIcon" />
                  <span class="infoLabel">Motorista</span>
                </div>
                <span class="infoValue">{{ trip.driver?.name ?? '--' }}</span>
              </div>

              <div class="actions">
                <button class="actionBtn green">
                  <i class="fi fi-rs-file-pdf" />
                  Gerar manifesto PDF
                </button>
                <button class="actionBtn magenta">
                  <i class="fi fi-rs-pencil" />
                  Editar viagem
                </button>
                <button class="actionBtn red">
                  <i class="fi fi-rs-ban" />
                  Cancelar viagem
                </button>
              </div>

            </div>

          <!-- DIVIDER  -->
          <div class="verticalDivider" />
          <div class="rightPanel">

            <div class="manifestTop">
              <div class="manifestTitleRow">
                <span class="manifestTitle">Manifesto de passageiros</span>
                <span class="manifestCount">{{ pagination.total }}</span>
                <span class="manifestCountLabel">passageiros</span>
              </div>

              <div class="manifestSearchCol">
                <div class="manifestSearch">
                  <i class="fi fi-rs-search searchIcon" />
                  <input v-model="search" type="text" placeholder="Pesquisar passageiro..." class="searchInput" />
                </div>

                <label class="cancelledToggle">
                  <input type="checkbox" :checked="includeCancelled" @change="toggleIncludeCancelled" />
                  Mostrar cancelados
                </label>
              </div>
            </div>

            <div class="manifestBody">
              <div v-if="loadingBookings" class="stateBox">
                <div class="spinner" />
              </div>

              <div v-else-if="bookings.length === 0" class="stateBox">
                <i class="fi fi-sr-users emptyIcon" />
                <span class="emptyText">Sem passageiros registados</span>
              </div>

              <div v-else-if="filteredBookings.length === 0" class="stateBox">
                <i class="fi fi-sr-search emptyIcon" />
                <span class="emptyText">Sem resultados para "{{ search }}"</span>
              </div>

              <template v-else>
                <div class="manifestList">
                  <div v-for="b in filteredBookings" :key="b.id" class="manifestRow" :class="{ cancelledRow: b.status === 'cancelled' }">
                    <div class="seatBadge">{{ b.seat_number ?? '--' }}</div>
                    <div class="passengerInfo">
                      <span class="passengerName">{{ b.passenger?.name ?? '--' }}</span>
                      <span class="ticketNum">{{ b.ticket_number }}</span>
                    </div>
                    <div class="rowBadges">
                      <Badge v-if="b.status === 'cancelled'" status="cancelled" />
                      <Badge :status="b.payment_status" />
                    </div>
                  </div>
                </div>

                <div class="manifestPagination" v-if="pagination.last_page > 1 && !search">
                  <button class="pageBtn" :disabled="pagination.current_page === 1"
                    @click="goToPage(pagination.current_page - 1)">
                    <i class="fi fi-sr-angle-left" />
                  </button>

                  <template v-for="(page, i) in pageNumbers" :key="i">
                    <span v-if="page === '...'" class="pageEllipsis">&hellip;</span>
                    <button v-else class="pageNumBtn" :class="{ active: page === pagination.current_page }"
                      @click="goToPage(page)">
                      {{ page }}
                    </button>
                  </template>

                  <button class="pageBtn" :disabled="pagination.current_page === pagination.last_page"
                    @click="goToPage(pagination.current_page + 1)">
                    <i class="fi fi-sr-angle-right" />
                  </button>

                  <span class="pageInfo">{{ pagination.total }} passageiros</span>
                </div>
              </template>
            </div>

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
  max-width: 1080px;
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
  flex-wrap: 1;
}

.headerIcon {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
  position: relative;
  top: 1px;
}

.headerRoute {
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
  gap: 12px;
  flex-shrink: 0;
}

.statusBadge {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 5px;
  white-space: nowrap;
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
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.leftPanel {
  width: 45%;
  flex-shrink: 0;
  padding: 24px;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

.statsGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.occupancyBar {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.occupancyLabel {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
}

.occupancyPct {
  font-weight: 700;
}

.barTrack {
  height: 7px;
  background: #f0f0f0;
  border-radius: 99px;
  overflow: hidden;
}

.barFill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.4s ease;
}

.infoRows {
  margin-top: 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.infoRowHeader {
  padding-bottom: 2px;
  padding-top: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.infoRowIcon {
  color: #A3206A;
  font-size: 13px;
  position: relative;
  top: 1px;
}

.infoRow {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.infoLabel {
  font-size: 13px;
  color: black;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.infoValue {
  font-size: 13px;
  color: #222;
  font-weight: 500;
}

.actions {
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
}

.actionBtn {
  width: 100%;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s;
  color: #fff;
}

.actionBtn:hover {
  opacity: 0.88;
}

.actionBtn i {
  font-size: 13px;
  position: relative;
  top: 1px;
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

.verticalDivider {
  width: 1px;
  background: #e8e8e8;
  flex-shrink: 0;
  align-self: stretch;
}

.verticalDivider {
  width: 1px;
  background: #e8e8e8;
  flex-shrink: 0;
  align-self: stretch;
}

/* COLUNA DIREITA */
.rightPanel {
  flex: 1;
  width: 55%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.manifestTop {
  padding: 18px 24px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  border-bottom: 1px solid #f0f0f0;
}

.manifestTitleRow {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.manifestTitle {
  font-size: 17px;
  font-weight: 700;
  color: #222;
}

.manifestCount {
  font-size: 17px;
  font-weight: 700;
  color: #222;
}

.manifestCountLabel {
  font-size: 13px;
  color: #999;
}

.manifestSearchCol {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.cancelledToggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  white-space: nowrap;
}

.cancelledToggle input {
  accent-color: #A3206A;
  cursor: pointer;
}

.manifestSearch {
  position: relative;
  flex-shrink: 0;
}


.searchIcon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #bbb;
  font-size: 13px;
}

.searchInput {
  height: 36px;
  width: 220px;
  border: 1.5px solid #e8e8e8;
  border-radius: 8px;
  padding: 0 12px 0 32px;
  font-size: 13px;
  color: #333;
  outline: none;
  transition: border-color 0.15s;
  font-family: Helvetica, sans-serif;
}

.searchInput:focus {
  border-color: #A3206A;
}

.searchInput::placeholder {
  color: #bbb;
}

.manifestBody {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 14px 24px 16px;
  gap: 8px;
}

.stateBox {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #f0f0f0;
  border-top-color: #A3206A;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.emptyIcon {
  font-size: 38px;
  color: #A3206A;
  opacity: 0.3;
}

.emptyText {
  font-size: 14px;
  color: #aaa;
}

.manifestList {
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

.manifestRow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  transition: all 0.15s;
}

.manifestRow.cancelledRow {
  opacity: 0.55;
}

.seatBadge {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #922877;
  color: #fff;
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
  font-size: 14px;
  color: #bbb;
  font-family: 'Courier New', monospace;
}

.rowBadges {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

/* PAGINACAO */
.manifestPagination {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding-top: 4px;
}

.pageBtn {
  width: 30px;
  height: 30px;
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
  min-width: 30px;
  height: 30px;
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

.pageInfo {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

/* TRANSITIONS */
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