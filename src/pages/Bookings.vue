<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { useBookingStore } from '../stores/bookingStore'
import { useRouteStore } from '../stores/routeStore'
import { formatDate } from '../utils/formatDate'

import Text from '../components/Text.vue'
import Profile from '../components/Profile.vue'
import Search from '../components/Search.vue'
import StatiscSimple from '../components/StatiscSimple.vue'
import TableBase from '../components/TableBase.vue'
import IconText from '../components/IconText.vue'
import DateFilter from '../components/filters/DateFilter.vue'
import FilterDropDown from '../components/filters/FilterDropDown.vue'
import CleanFilter from '../components/CleanFilter.vue'
import BookingDetailModal from '../modal/BookingDetailModal.vue'
import NewBookingModal from '../modal/NewBookingModal.vue'

const route = useRoute()
const bookingStore = useBookingStore()
const routeStore = useRouteStore()
const { bookings, pagination, loading } = storeToRefs(bookingStore)
const { routes } = storeToRefs(routeStore)

const selectedBooking = ref(null)
const showNewBookingModal = ref(false)
const mobileFiltersOpen = ref(false)

const filters = ref({
  passenger: '',
  date: '',
  status: '',
  payment_status: '',
  route_id: '',
  trip_id: route.query.trip_id ? String(route.query.trip_id) : '',
})

const tripContext = ref(
  route.query.trip_id
    ? { route: route.query.route ?? null, date: route.query.date ?? null }
    : null
)

const stats = ref({ pending: null, confirmed: null, cancelled: null })

const routeOptions = computed(() => routes.value.map((r) => ({ id: r.id, name: r.name })))

const statusOptions = [
  { label: 'Pendente', value: 'pending' },
  { label: 'Confirmado', value: 'confirmed' },
  { label: 'Cancelado', value: 'cancelled' },
]

const paymentStatusOptions = [
  { label: 'Pendente', value: 'pending' },
  { label: 'Pago', value: 'paid' },
  { label: 'Reembolsado', value: 'refunded' },
]

const statusLabels = { pending: 'Pendente', confirmed: 'Confirmado', cancelled: 'Cancelado' }
const paymentStatusLabels = { pending: 'Pendente', paid: 'Pago', refunded: 'Reembolsado' }

const hasFilters = computed(() =>
  !!(filters.value.passenger || filters.value.date || filters.value.status || filters.value.payment_status || filters.value.route_id || filters.value.trip_id)
)

const activeFilterCount = computed(() =>
  [filters.value.date, filters.value.route_id, filters.value.status, filters.value.payment_status].filter(Boolean).length
)

const headers = ['Bilhete', 'Passageiro', 'Rota', 'Data', 'Assento', 'Estado', 'Pagamento']

const rows = computed(() =>
  bookings.value.map((b) => ({
    id: b.id,
    ticket: b.ticket_number ?? '--',
    passenger: b.passenger?.name ?? '--',
    route: b.trip?.route?.name ?? '--',
    date: formatDate(b.trip?.departure_date),
    seat: b.seat_number ?? '--',
    status: statusLabels[b.status] ?? b.status,
    payment: paymentStatusLabels[b.invoice?.status] ?? b.invoice?.status ?? '--',
  }))
)

function buildFilterParams() {
  return {
    ...(filters.value.passenger ? { passenger: filters.value.passenger } : {}),
    ...(filters.value.date ? { date_from: filters.value.date, date_to: filters.value.date } : {}),
    ...(filters.value.payment_status ? { payment_status: filters.value.payment_status } : {}),
    ...(filters.value.route_id ? { route_id: filters.value.route_id } : {}),
    ...(filters.value.trip_id ? { trip_id: filters.value.trip_id } : {}),
  }
}

function buildParams(page = 1) {
  return {
    page,
    per_page: 15,
    ...buildFilterParams(),
    ...(filters.value.status ? { status: filters.value.status } : {}),
  }
}

async function fetchData(page = 1) {
  await bookingStore.fetchBookings(buildParams(page))
}

async function fetchStats() {
  const base = buildFilterParams()

  const [pending, confirmed, cancelled] = await Promise.all([
    bookingStore.countBookings({ ...base, status: 'pending' }),
    bookingStore.countBookings({ ...base, status: 'confirmed' }),
    bookingStore.countBookings({ ...base, status: 'cancelled' }),
  ])
  stats.value = { pending, confirmed, cancelled }
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.last_page) return
  fetchData(page)
}

const pageNumbers = computed(() => {
  const current = pagination.value.current_page
  const last = pagination.value.last_page
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)

  const range = []
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)

  if (start > 1) { range.push(1); if (start > 2) range.push('...') }
  for (let i = start; i <= end; i++) range.push(i)
  if (end < last) { if (end < last - 1) range.push('...'); range.push(last) }

  return range
})

let filterTimer = null
watch(filters, () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    fetchData(1)
    fetchStats()
  }, 300)
}, { deep: true })

function clearFilters() {
  filters.value = { passenger: '', date: '', status: '', payment_status: '', route_id: '', trip_id: '' }
  tripContext.value = null
}

function clearTripContext() {
  filters.value.trip_id = ''
  tripContext.value = null
}

function openBooking(row) {
  selectedBooking.value = bookings.value.find((b) => b.id === row.id) ?? null
}

function closeBooking(changed) {
  selectedBooking.value = null
  if (changed) {
    fetchData(pagination.value.current_page)
    fetchStats()
  }
}

function closeNewBooking(changed) {
  showNewBookingModal.value = false
  if (changed) {
    fetchData(1)
    fetchStats()
  }
}

onMounted(() => {
  fetchData()
  fetchStats()
  routeStore.fetchRoutes({ per_page: 100 })
})
</script>

<template>
  <div class="bookingsWrapper">
    <header>
      <Text txt="Reservas" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <Search
          txt="Pesquise por passageiro"
          :modelValue="filters.passenger"
          @update:modelValue="filters.passenger = $event"
        />

        <div class="Data">
          <div @click="showNewBookingModal = true">
            <IconText
              icon="fi fi-rs-ticket"
              txt="Nova Reserva"
              color="#8B9B1A"
              background="#922877"
            />
          </div>
        </div>
      </div>

      <div v-if="tripContext" class="tripContextChip">
        <i class="fi fi-rs-road" />
        <span>
          Viagem: {{ tripContext.route ?? '-' }}<template v-if="tripContext.date"> · {{ formatDate(tripContext.date) }}</template>
        </span>
        <button class="chipClose" @click="clearTripContext">
          <i class="fi fi-rs-cross-small" />
        </button>
      </div>

      <button class="filtersToggle" @click="mobileFiltersOpen = !mobileFiltersOpen">
        <i class="fi fi-rs-filter" />
        <span>Filtros</span>
        <span v-if="activeFilterCount" class="filterBadge">{{ activeFilterCount }}</span>
        <i class="fi fi-rs-angle-small-down toggleChevron" :class="{ rotated: mobileFiltersOpen }" />
      </button>

      <div class="filters" :class="{ mobileOpen: mobileFiltersOpen }">
        <div class="dates">
          <DateFilter
            txt="Data da viagem"
            icon="fi fi-sr-calendar"
            color="#922877"
            v-model="filters.date"
          />
        </div>

        <div class="dropdowns">
          <FilterDropDown
            txt="Rota"
            icon="fi fi-rs-route"
            color="#922877"
            :options="routeOptions"
            v-model="filters.route_id"
          />
          <FilterDropDown
            txt="Estado da reserva"
            icon="fi fi-sr-ticket"
            color="#922877"
            :options="statusOptions"
            v-model="filters.status"
          />
          <FilterDropDown
            txt="Pagamento"
            icon="fi fi-sr-credit-card"
            color="#922877"
            :options="paymentStatusOptions"
            v-model="filters.payment_status"
          />
          <CleanFilter v-if="hasFilters" @click="clearFilters" />
        </div>
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de reservas" :data="pagination.total" />
        <StatiscSimple title="Pendentes" :data="stats.pending" />
        <StatiscSimple title="Confirmadas" :data="stats.confirmed" />
        <StatiscSimple title="Canceladas" :data="stats.cancelled" />
      </div>

      <div class="table">
        <div v-if="loading" class="loaderWrapper">
          <div class="loader"></div>
        </div>

        <div v-else-if="bookings.length === 0" class="emptyState">
          <i class="fi fi-sr-folder-open emptyIcon"></i>
          <Text txt="Nenhuma reserva encontrada" color="922877" weight="600" size="22px" />
          <p class="emptyText">Não existem reservas para os filtros seleccionados.</p>
        </div>

        <template v-else>
          <TableBase
            :headers="headers"
            :rows="rows"
            displayIcon="none"
            displayEye="flex"
            @row-click="openBooking"
          />

          <div class="pagination" v-if="pagination.last_page > 1">
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

            <span class="pageInfo">{{ pagination.total }} reservas</span>
          </div>
        </template>
      </div>
    </div>
  </div>

  <BookingDetailModal
    v-if="selectedBooking"
    :booking="selectedBooking"
    @close="closeBooking"
  />

  <NewBookingModal
    v-if="showNewBookingModal"
    @close="closeNewBooking"
  />
</template>

<style scoped>
.bookingsWrapper {
  height: 100%;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

header {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: 12px;
  flex-shrink: 0;
}

.filterData {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  margin-top: 40px;
}

.searchData {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: auto;
  gap: 12px;
  flex-wrap: nowrap;
  flex-shrink: 0;
}

.Data {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  height: 40px;
}

.Data > div {
  cursor: pointer;
}

.tripContextChip {
  margin-top: 16px;
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #EFE6EF;
  color: #922877;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.tripContextChip i {
  font-size: 13px;
}

.chipClose {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(146, 40, 119, 0.15);
  color: #922877;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: background 0.15s;
}

.chipClose:hover {
  background: rgba(146, 40, 119, 0.28);
}

.filtersToggle {
  display: none;
}

.filters {
  margin-top: 32px;
  min-height: 60px;
  height: auto;
  width: 100%;
  display: flex;
  gap: clamp(12px, 2.5vw, 60px);
  flex-wrap: wrap;
  align-items: flex-start;
  flex-shrink: 0;
}

.dates {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.dropdowns {
  display: flex;
  gap: 12px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
  align-items: flex-end;
}

.Statistcss {
  margin-top: 40px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  width: 100%;
  flex-shrink: 0;
}

.table {
  margin-top: 40px;
  flex: 1;
  min-height: 0;
  width: 100%;
  background: white;
  padding: clamp(24px, 3.5vw, 60px);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table :deep(.tablebaseWrapper) {
  height: 420px;
  max-height: 420px;
}

.loaderWrapper,
.emptyState {
  height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.loader {
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

.emptyIcon {
  font-size: 48px;
  color: #922877;
  opacity: 0.4;
}

.emptyText {
  font-size: 14px;
  color: #999;
  text-align: center;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.pageBtn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
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
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: none;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
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
  font-size: 13px;
  color: #999;
  padding: 0 4px;
}

.pageInfo {
  font-size: 13px;
  color: #999;
  margin-left: 8px;
}

@media (min-width: 1024px) and (max-width: 1279px) {
  .filterData { margin-top: 24px; }
  .filters { margin-top: 20px; }
  .Statistcss { margin-top: 24px; }
  .table { margin-top: 24px; padding: 24px; }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .table { padding: 36px; }
}

@media (max-width: 767px) {
  .bookingsWrapper {
    height: auto;
    overflow: visible;
  }

  .filterData {
    flex: none;
    min-height: 0;
    overflow: visible;
    margin-top: 20px;
  }

  .searchData {
    flex-wrap: wrap;
  }

  .Data {
    width: 100%;
  }

  .Data > div {
    width: 100%;
  }

  .filtersToggle {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 44px;
    margin-top: 20px;
    padding: 0 14px;
    border: none;
    border-radius: 8px;
    background: #fff;
    color: #922877;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Ubuntu', sans-serif;
    cursor: pointer;
  }

  .filtersToggle i:first-child {
    font-size: 14px;
  }

  .filterBadge {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: #922877;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .toggleChevron {
    margin-left: auto;
    font-size: 12px;
    color: #999;
    transition: transform 0.2s;
  }

  .toggleChevron.rotated {
    transform: rotate(180deg);
  }

  .filters {
    display: none;
    margin-top: 12px;
    flex-direction: column;
    align-items: stretch;
  }

  .filters.mobileOpen {
    display: flex;
  }

  .dates,
  .dropdowns {
    flex-direction: column;
    width: 100%;
  }

  .dates > *,
  .dropdowns > * {
    width: 100%;
    max-width: none;
  }

  .Statistcss { margin-top: 20px; }

  .table {
    margin-top: 20px;
    padding: 16px;
    overflow: visible;
  }

  .table :deep(.tablebaseWrapper) {
    height: auto;
    max-height: none;
  }

  .loaderWrapper,
  .emptyState {
    height: 240px;
  }
}
</style>
