<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTripStore } from '../stores/tripStore'
import { useRouteStore } from '../stores/routeStore'
import { useBookingStore } from '../stores/bookingStore'
import { formatDate } from '../utils/formatDate'

import Text from '../components/Text.vue'
import Profile from '../components/Profile.vue'
import StatiscSimple from '../components/StatiscSimple.vue'
import TableBase from '../components/TableBase.vue'
import Pagination from '../components/Pagination.vue'
import IconText from '../components/IconText.vue'
import DateFilter from '../components/filters/DateFilter.vue'
import FilterDropDown from '../components/filters/FilterDropDown.vue'
import CleanFilter from '../components/CleanFilter.vue'
import TripFormModal from '../modal/TripFormModal.vue'
import GenerateTripsModal from '../modal/GenerateTripsModal.vue'
import TripDetailModal from '../modal/TripDetailModal.vue'

const tripStore = useTripStore()
const routeStore = useRouteStore()
const bookingStore = useBookingStore()
const { trips, pagination, loading } = storeToRefs(tripStore)
const { routes } = storeToRefs(routeStore)

const editingTrip = ref(null)
const selectedTrip = ref(null)
const showFormModal = ref(false)
const showGenerateModal = ref(false)
const mobileFiltersOpen = ref(false)

const filters = ref({ status: '', date: '', route_id: '' })
const stats = ref({ pending: null, confirmed: null, cancelled: null })

const routeOptions = computed(() => routes.value.map((r) => ({ id: r.id, name: r.name })))

const tripStatusOptions = [
  { label: 'Agendada', value: 'scheduled' },
  { label: 'Em embarque', value: 'boarding' },
  { label: 'Em curso', value: 'in_progress' },
  { label: 'Concluída', value: 'completed' },
  { label: 'Cancelada', value: 'cancelled' },
  { label: 'Com atraso', value: 'delayed' },
]

const statusLabels = {
  scheduled: 'Agendada',
  boarding: 'Em embarque',
  in_progress: 'Em curso',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  delayed: 'Com atraso',
}

const hasFilters = computed(() => !!(filters.value.status || filters.value.date || filters.value.route_id))
const activeFilterCount = computed(() => [filters.value.status, filters.value.date, filters.value.route_id].filter(Boolean).length)

const headers = ['Rota', 'Data', 'Partida', 'Veículo', 'Motorista', 'Estado']

const rows = computed(() =>
  trips.value.map((t) => ({
    id: t.id,
    route: t.route?.name ?? '--',
    date: formatDate(t.departure_date),
    time: t.departure_time,
    vehicle: t.vehicle ? `${t.vehicle.brand} ${t.vehicle.model}` : '--',
    driver: t.driver?.name ?? '--',
    status: statusLabels[t.status] ?? t.status,
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 7,
    ...(filters.value.status ? { status: filters.value.status } : {}),
    ...(filters.value.date ? { date: filters.value.date } : {}),
    ...(filters.value.route_id ? { route_id: filters.value.route_id } : {}),
  }
}

async function fetchData(page = 1) {
  await tripStore.fetchTrips(buildParams(page))
}

async function fetchStats() {
  const [pending, confirmed, cancelled] = await Promise.all([
    bookingStore.countBookings({ status: 'pending' }),
    bookingStore.countBookings({ status: 'confirmed' }),
    bookingStore.countBookings({ status: 'cancelled' }),
  ])
  stats.value = { pending, confirmed, cancelled }
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.last_page) return
  fetchData(page)
}

let filterTimer = null
watch(filters, () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => fetchData(1), 300)
}, { deep: true })

function clearFilters() {
  filters.value = { status: '', date: '', route_id: '' }
}

function openCreate() {
  editingTrip.value = null
  showFormModal.value = true
}

function openTrip(row) {
  selectedTrip.value = trips.value.find((t) => t.id === row.id) ?? null
}

function closeTripDetail(changed) {
  selectedTrip.value = null
  if (changed) {
    fetchData(pagination.value.current_page)
    fetchStats()
  }
}

function closeForm(saved) {
  showFormModal.value = false
  editingTrip.value = null
  if (saved) fetchData(pagination.value.current_page)
}

function closeGenerate(saved) {
  showGenerateModal.value = false
  if (saved) fetchData(pagination.value.current_page)
}

onMounted(() => {
  fetchData()
  fetchStats()
  routeStore.fetchRoutes({ per_page: 100 })
})
</script>

<template>
  <div class="homeWrapper">
    <header>
      <Text txt="Dashboard" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <button class="filtersToggle" @click="mobileFiltersOpen = !mobileFiltersOpen">
          <i class="fi fi-rs-filter" />
          <span>Filtros</span>
          <span v-if="activeFilterCount" class="filterBadge">{{ activeFilterCount }}</span>
          <i class="fi fi-rs-angle-small-down toggleChevron" :class="{ rotated: mobileFiltersOpen }" />
        </button>

        <div class="filters" :class="{ mobileOpen: mobileFiltersOpen }">
          <div class="dates">
            <DateFilter
              txt="Data"
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
              txt="Estado da viagem"
              icon="fi fi-sr-bus"
              color="#922877"
              :options="tripStatusOptions"
              v-model="filters.status"
            />
            <CleanFilter v-if="hasFilters" @click="clearFilters" />
          </div>
        </div>

        <div class="Data">
          <div @click="showGenerateModal = true">
            <IconText
              icon="fi fi-rs-calendar-clock"
              txt="Gerar viagens"
              color="#8B9B1A"
              textcolor="#fff"
              background="#922877"
            />
          </div>
          <div @click="openCreate">
            <IconText
              icon="fi fi-rs-bus"
              txt="Nova Viagem"
              color="#8B9B1A"
              background="#922877"
            />
          </div>
        </div>
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de viagens" :data="pagination.total" />
        <StatiscSimple title="Reservas pendentes" :data="stats.pending" />
        <StatiscSimple title="Reservas confirmadas" :data="stats.confirmed" />
        <StatiscSimple title="Reservas canceladas" :data="stats.cancelled" />
      </div>

      <div class="table">
        <div v-if="loading" class="loaderWrapper">
          <div class="loader"></div>
        </div>

        <div v-else-if="trips.length === 0" class="emptyState">
          <i class="fi fi-sr-folder-open emptyIcon"></i>
          <Text txt="Nenhuma viagem encontrada" color="922877" weight="600" size="22px" />
          <p class="emptyText">Não existem viagens para os filtros seleccionados.</p>
        </div>

        <template v-else>
          <TableBase
            :headers="headers"
            :rows="rows"
            displayIcon="none"
            displayEye="flex"
            @row-click="openTrip"
          />

          <Pagination :pagination="pagination" @change="goToPage" />
        </template>
      </div>
    </div>
  </div>

  <TripFormModal
    v-if="showFormModal"
    :trip="editingTrip"
    @close="closeForm"
  />

  <GenerateTripsModal
    v-if="showGenerateModal"
    @close="closeGenerate"
  />

  <TripDetailModal
    v-if="selectedTrip"
    :trip="selectedTrip"
    @close="closeTripDetail"
  />
</template>

<style scoped>
.homeWrapper {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
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
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 40px;
}

.searchData {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  width: 100%;
  height: auto;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.filtersToggle {
  display: none;
}

.filters {
  min-height: 60px;
  height: auto;
  display: flex;
  gap: clamp(12px, 2.5vw, 60px);
  flex-wrap: wrap;
  align-items: flex-start;
  flex: 1;
}

.dates {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.dropdowns {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
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

.Statistcss {
  margin-top: 24px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  width: 100%;
  flex-shrink: 0;
}

.table {
  margin-top: 24px;
  width: 100%;
  background: white;
  padding: clamp(24px, 3.5vw, 60px);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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

@media (min-width: 1024px) and (max-width: 1279px) {
  .filterData { margin-top: 24px; }
  .Statistcss { margin-top: 20px; }
  .table { margin-top: 20px; padding: 24px; }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .table { padding: 36px; }
}

@media (max-width: 767px) {
  .filterData {
    margin-top: 20px;
  }

  .searchData {
    flex-direction: column;
    align-items: stretch;
  }

  .filtersToggle {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 44px;
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
    flex-direction: column;
    align-items: stretch;
    margin-top: 12px;
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

  .Data {
    width: 100%;
    height: auto;
    flex-direction: column;
    margin-top: 12px;
  }

  .Data > div {
    width: 100%;
  }

  .Statistcss { margin-top: 20px; }

  .table {
    margin-top: 20px;
    padding: 16px;
  }

  .loaderWrapper,
  .emptyState {
    height: 240px;
  }
}
</style>
