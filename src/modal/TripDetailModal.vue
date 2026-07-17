<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import bookingService from '../services/bookingService'
import { useTripStore } from '../stores/tripStore'
import { useVehicleStore } from '../stores/vehicleStore'
import { useDriverStore } from '../stores/driverStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { formatDate } from '../utils/formatDate'
import DataCard from '../components/DataCard.vue'
import Badge from '../components/Badge.vue'
import BaseInput from '../components/BaseInput.vue'
import InputDropDown from '../components/InputDropDown.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'
import TicketModal from '../components/TicketModal.vue'

const props = defineProps({
  trip: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])

const router = useRouter()
const tripStore = useTripStore()
const vehicleStore = useVehicleStore()
const driverStore = useDriverStore()
const { showToast } = useToast()

const localTrip = ref({ ...props.trip })
const changed = ref(false)
const activeView = ref('manifest')

const loadingBookings = ref(false)
const bookings = ref([])
const pagination = ref({ current_page: 1, last_page: 1, total: 0 })
const search = ref('')
const includeCancelled = ref(false)
const selectedTicket = ref(null)

const ticketTripInfo = computed(() => ({
  route: localTrip.value.route?.name,
  date: localTrip.value.departure_date,
  time: localTrip.value.departure_time,
}))

const showCancelConfirm = ref(false)
const isCancelling = ref(false)

const statusOptions = [
  { id: 'scheduled', name: 'Agendada' },
  { id: 'boarding', name: 'Em embarque' },
  { id: 'in_progress', name: 'Em curso' },
  { id: 'completed', name: 'Concluída' },
  { id: 'cancelled', name: 'Cancelada' },
  { id: 'delayed', name: 'Com atraso' },
]

const vehicleOptions = computed(() => vehicleStore.vehicles.map((v) => ({ id: v.id, name: `${v.plate} - ${v.brand} ${v.model}` })))
const driverOptions = computed(() => driverStore.drivers.map((d) => ({ id: d.id, name: d.name })))

const editForm = ref({
  departure_time: (localTrip.value.departure_time ?? '').slice(0, 5),
  vehicle_id: localTrip.value.vehicle?.id ?? '',
  driver_id: localTrip.value.driver?.id ?? '',
  status: localTrip.value.status ?? 'scheduled',
  notes: localTrip.value.notes ?? '',
})
const editErrors = ref({ departure_time: '' })
const isSavingEdit = ref(false)

const occupancyPct = computed(() => {
  const cap = localTrip.value.vehicle?.capacity
  if (!cap) return null
  const occupied = (localTrip.value.confirmed_count ?? 0) + (localTrip.value.pending_count ?? 0)
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
  return map[localTrip.value.status] ?? localTrip.value.status
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
    const res = await bookingService.listByTrip(localTrip.value.id, {
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

function viewTicket(b) {
  selectedTicket.value = {
    ticket_number: b.ticket_number,
    seat_number: b.seat_number,
    passenger_name: b.passenger?.name,
    passenger_passport: b.passenger?.passport_number,
    passenger_passport_expiry: b.passenger?.passport_expiry,
    boarding_stop: b.boarding_stop?.name,
    boarding_time: b.boarding_stop?.boarding_time,
    status: b.status,
    payment_method: b.invoice?.payment_method,
  }
}

function toggleEdit() {
  activeView.value = activeView.value === 'edit' ? 'manifest' : 'edit'
}

function validateEdit() {
  editErrors.value = { departure_time: '' }
  let valid = true

  if (!editForm.value.departure_time) {
    editErrors.value.departure_time = 'A hora de partida é obrigatória.'
    valid = false
  } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(editForm.value.departure_time)) {
    editErrors.value.departure_time = 'Formato inválido. Use HH:MM em 24 horas, ex: 17:00.'
    valid = false
  }

  return valid
}

async function handleSaveEdit() {
  if (!validateEdit()) return
  isSavingEdit.value = true

  try {
    const payload = {
      vehicle_id: editForm.value.vehicle_id || null,
      driver_id: editForm.value.driver_id || null,
      departure_time: editForm.value.departure_time,
      status: editForm.value.status,
      notes: editForm.value.notes || null,
    }
    const res = await tripStore.updateTrip(localTrip.value.id, payload)
    localTrip.value = res.data
    changed.value = true
    activeView.value = 'manifest'
    showToast('success', 'Viagem actualizada com sucesso.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSavingEdit.value = false
  }
}

async function confirmCancel() {
  isCancelling.value = true
  try {
    const result = await tripStore.cancelTrip(localTrip.value.id)
    localTrip.value = { ...localTrip.value, status: 'cancelled' }
    changed.value = true
    showCancelConfirm.value = false

    let message = 'Viagem cancelada com sucesso.'
    if (result?.auto_cancelled) {
      message += ` ${result.auto_cancelled} reserva(s) pendente(s) foram canceladas automaticamente.`
    }
    if (result?.needs_manual_refund) {
      message += ` ${result.needs_manual_refund} reserva(s) já paga(s) precisam de reembolso manual.`
    }
    showToast('success', message)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isCancelling.value = false
  }
}

function handleClose() {
  emit('close', changed.value)
}

function goToBookings() {
  router.push({
    path: '/dashboard/bookings',
    query: {
      trip_id: localTrip.value.id,
      route: localTrip.value.route?.name ?? undefined,
      date: localTrip.value.departure_date ?? undefined,
    },
  })
}

onMounted(() => {
  fetchBookings()
  vehicleStore.fetchVehicles({ per_page: 100 })
  driverStore.fetchDrivers({ per_page: 100 })
})
</script>


<template>

  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">

          <!-- HEADER-->
          <div class="modalHeader">
            <div class="headerLeft">
              <i class="fi fi-rs-route headerIcon" />
              <span class="headerRoute">{{ localTrip.route?.name ?? '--' }}</span>
              <div class="headerDivider" />
              <i class="fi fi-rs-calendar headerIcon" />
              <span class="headerMeta">{{ localTrip.departure_date }}</span>
              <div class="headerDivider" />
              <i class="fi fi-rs-clock headerIcon" />
              <span class="headerMeta">{{ localTrip.departure_time }}</span>
            </div>
            <div class="headerRight">
              <button class="bookingsLink" @click="goToBookings">
                <i class="fi fi-rs-ticket" />
                Ver reservas desta viagem
              </button>
              <span class="statusBadge">{{ statusLabel }}</span>
              <button class="closeBtn" @click="handleClose">
                <i class="fi fi-br-cross" />
              </button>
            </div>
          </div>

          <!-- BODY -->

          <div class="modalBody">

            <!-- COLUNA ESQUERDA -->
            <div class="leftPanel">

              <div class="statsGrid">
                <DataCard title="Confirmados" :value="String(localTrip.confirmed_count ?? 0)" icon="fi fi-sr-check-circle" />
                <DataCard title="Pendentes" :value="String(localTrip.pending_count ?? 0)" icon="fi fi-sr-clock" />
                <DataCard title="Cancelados" :value="String(localTrip.cancelled_count ?? 0)" icon="fi fi-sr-cross-circle" />
                <DataCard v-if="localTrip.vehicle?.capacity" title="Capacidade" :value="String(localTrip.vehicle.capacity)"
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
                  {{ localTrip.vehicle ? `${localTrip.vehicle.brand} ${localTrip.vehicle.model} · ${localTrip.vehicle.plate}` : '--' }}
                </span>
              </div>

              <div class="infoRow">
                <div class="infoRowHeader">
                  <i class="fi fi-rs-steering-wheel infoRowIcon" />
                  <span class="infoLabel">Motorista</span>
                </div>
                <span class="infoValue">{{ localTrip.driver?.name ?? '--' }}</span>
              </div>

              <div class="actions">
                <button class="actionBtn green">
                  <i class="fi fi-rs-file-pdf" />
                  Gerar manifesto PDF
                </button>
                <button class="actionBtn magenta" :class="{ active: activeView === 'edit' }" @click="toggleEdit">
                  <i class="fi fi-rs-pencil" />
                  {{ activeView === 'edit' ? 'Voltar ao manifesto' : 'Editar viagem' }}
                </button>
                <button v-if="localTrip.status !== 'cancelled'" class="actionBtn red" @click="showCancelConfirm = true">
                  <i class="fi fi-rs-ban" />
                  Cancelar viagem
                </button>
              </div>

            </div>

          <!-- DIVIDER  -->
          <div class="verticalDivider" />
          <div class="rightPanel">
            <Transition name="fade-slide" mode="out-in">

              <!-- VISTA: MANIFESTO -->
              <div v-if="activeView === 'manifest'" key="manifest" class="manifestView">
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
                      <div v-for="b in filteredBookings" :key="b.id" class="manifestRow" :class="{ cancelledRow: b.status === 'cancelled' }"
                        title="Ver bilhete" @click="viewTicket(b)">
                        <div class="seatBadge">{{ b.seat_number ?? '--' }}</div>
                        <div class="passengerInfo">
                          <span class="passengerName">{{ b.passenger?.name ?? '--' }}</span>
                          <span class="ticketNum">{{ b.ticket_number }}</span>
                        </div>
                        <div class="rowBadges">
                          <Badge v-if="b.status === 'cancelled'" status="cancelled" />
                          <Badge v-if="b.invoice" :status="b.invoice.status" />
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

              <!-- VISTA: EDITAR -->
              <div v-else key="edit" class="editView">
                <div class="manifestTop">
                  <div class="manifestTitleRow">
                    <span class="manifestTitle">Editar viagem</span>
                  </div>
                </div>

                <div class="editBody">
                  <div class="fieldRow">
                    <div class="fieldGroup">
                      <span class="readonlyLabel">Rota</span>
                      <span class="readonlyValue">{{ localTrip.route?.name ?? '--' }}</span>
                    </div>
                    <div class="fieldGroup">
                      <span class="readonlyLabel">Data</span>
                      <span class="readonlyValue">{{ formatDate(localTrip.departure_date) }}</span>
                    </div>
                  </div>

                  <div class="fieldGroup">
                    <BaseInput label="Hora de partida (24h)" type="text" placeholder="17:00"
                      :modelValue="editForm.departure_time" @update:modelValue="editForm.departure_time = $event" />
                    <span v-if="editErrors.departure_time" class="fieldError">{{ editErrors.departure_time }}</span>
                  </div>

                  <div class="fieldGroup">
                    <InputDropDown label="Veículo" :modelValue="editForm.vehicle_id" :options="vehicleOptions"
                      @update:modelValue="editForm.vehicle_id = $event" />
                  </div>

                  <div class="fieldGroup">
                    <InputDropDown label="Motorista" :modelValue="editForm.driver_id" :options="driverOptions"
                      @update:modelValue="editForm.driver_id = $event" />
                  </div>

                  <div class="fieldGroup">
                    <InputDropDown label="Estado" :modelValue="editForm.status" :options="statusOptions"
                      @update:modelValue="editForm.status = $event" />
                  </div>

                  <div class="fieldGroup">
                    <BaseInput label="Notas" :modelValue="editForm.notes" @update:modelValue="editForm.notes = $event" />
                  </div>

                  <div class="editActions">
                    <button class="btnSecondary" @click="activeView = 'manifest'">Voltar</button>
                    <button class="btnPrimary" :disabled="isSavingEdit" @click="handleSaveEdit">
                      {{ isSavingEdit ? 'A guardar...' : 'Guardar alterações' }}
                    </button>
                  </div>
                </div>
              </div>

            </Transition>
          </div>
   </div>

        </div>
      </Transition>
    </div>
  </Transition>

  <ConfirmDeleteModal
    v-if="showCancelConfirm"
    title="Cancelar viagem?"
    subtitle="Esta acção marca a viagem como cancelada. Os passageiros com reservas activas devem ser informados separadamente."
    icon="fi fi-rs-ban"
    :show-deactivate="false"
    :show-delete="true"
    delete-label="Cancelar viagem"
    delete-loading-label="A cancelar..."
    :loading-delete="isCancelling"
    @confirm-delete="confirmCancel"
    @cancel="showCancelConfirm = false"
  />

  <TicketModal
    v-if="selectedTicket"
    :booking="selectedTicket"
    :trip-info="ticketTripInfo"
    @close="selectedTicket = null"
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

.bookingsLink {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 5px;
  white-space: nowrap;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}

.bookingsLink:hover {
  background: rgba(255, 255, 255, 0.28);
}

.bookingsLink i {
  font-size: 12px;
  position: relative;
  top: 1px;
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
  display: flex;
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
  color: #922877;
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

.actionBtn.magenta.active {
  background: #6e1e5c;
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

/* COLUNA DIREITA */
.rightPanel {
  flex: 1;
  width: 55%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.manifestView,
.editView {
  flex: 1;
  min-height: 0;
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
  accent-color: #922877;
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
  font-family: 'Ubuntu', sans-serif;
}

.searchInput:focus {
  border-color: #922877;
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
  border-top-color: #922877;
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
  color: #922877;
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
  cursor: pointer;
}

.manifestRow:hover {
  background: #f0e6ef;
  border-color: #e0cee0;
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
  background: #922877;
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

/* EDITAR */
.editBody {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
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

.fieldError {
  font-size: 11px;
  color: #e74c3c;
  padding-left: 2px;
}

.readonlyLabel {
  font-size: 13px;
  color: #333;
}

.readonlyValue {
  height: 40px;
  display: flex;
  align-items: center;
  padding-left: 12px;
  background: #f0f0f0;
  border-radius: 5px;
  font-size: 15px;
  color: #666;
}

.editActions {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
