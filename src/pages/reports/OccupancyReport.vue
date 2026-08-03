<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useReportStore } from '../../stores/reportStore'
import { useRouteStore } from '../../stores/routeStore'
import { useToast } from '../../composables/useToast'
import { parseApiError } from '../../utils/parseApiError'
import { formatDate } from '../../utils/formatDate'

import Text from '../../components/Text.vue'
import Profile from '../../components/Profile.vue'
import StatiscSimple from '../../components/StatiscSimple.vue'
import TableBase from '../../components/TableBase.vue'
import Pagination from '../../components/Pagination.vue'
import IconText from '../../components/IconText.vue'
import DateFilter from '../../components/filters/DateFilter.vue'
import FilterDropDown from '../../components/filters/FilterDropDown.vue'
import CleanFilter from '../../components/CleanFilter.vue'

const reportStore = useReportStore()
const routeStore = useRouteStore()
const { occupancy, loading } = storeToRefs(reportStore)
const { routes } = storeToRefs(routeStore)
const { showToast } = useToast()

const downloadingPdf = ref(false)
const downloadingExcel = ref(false)
const filters = ref({ date_from: '', date_to: '', route_id: '' })
const mobileFiltersOpen = ref(false)

const routeOptions = computed(() => routes.value.map((r) => ({ id: r.id, name: r.name })))
const hasFilters = computed(() => !!(filters.value.date_from || filters.value.date_to || filters.value.route_id))
const activeFilterCount = computed(() => [filters.value.date_from, filters.value.date_to, filters.value.route_id].filter(Boolean).length)

const statusLabels = {
  scheduled: 'Agendada',
  boarding: 'Em embarque',
  in_progress: 'Em curso',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  delayed: 'Com atraso',
}

const headers = ['Data', 'Rota', 'Viatura', 'Lugares Vendidos', 'Capacidade', 'Ocupação', 'Receita MZN', 'Receita ZAR', 'Estado']

function fmt(value) {
  return Number(value ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const rows = computed(() =>
  (occupancy.value.rows ?? []).map((t) => ({
    id: t.trip_id,
    date: formatDate(t.date),
    route: t.route,
    vehicle: t.vehicle,
    seats_sold: t.seats_sold,
    capacity: t.capacity,
    occupancy: `${t.occupancy_rate}%`,
    revenue_mzn: fmt(t.revenue_mzn),
    revenue_zar: fmt(t.revenue_zar),
    status: statusLabels[t.status] ?? t.status,
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 7,
    ...(filters.value.date_from ? { date_from: filters.value.date_from } : {}),
    ...(filters.value.date_to ? { date_to: filters.value.date_to } : {}),
    ...(filters.value.route_id ? { route_id: filters.value.route_id } : {}),
  }
}

async function fetchData(page = 1) {
  try {
    await reportStore.fetchOccupancy(buildParams(page))
  } catch (err) {
    showToast('error', parseApiError(err))
  }
}

function goToPage(page) {
  if (page < 1 || page > occupancy.value.pagination.last_page) return
  fetchData(page)
}

let filterTimer = null
watch(filters, () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => fetchData(1), 300)
}, { deep: true })

function clearFilters() {
  filters.value = { date_from: '', date_to: '', route_id: '' }
}

async function downloadPdf() {
  downloadingPdf.value = true
  try {
    const params = { ...buildParams(1) }
    delete params.page
    delete params.per_page
    const blob = await reportStore.downloadOccupancyPdf(params)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'relatorio-ocupacao.pdf'
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    downloadingPdf.value = false
  }
}

async function downloadExcel() {
  downloadingExcel.value = true
  try {
    const params = { ...buildParams(1) }
    delete params.page
    delete params.per_page
    const blob = await reportStore.downloadOccupancyExcel(params)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'relatorio-ocupacao.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    downloadingExcel.value = false
  }
}

onMounted(() => {
  fetchData()
  routeStore.fetchRoutes({ per_page: 100 })
})
</script>

<template>
  <div class="reportWrapper">
    <header>
      <Text txt="Ocupação por Viagem" color="221F20" weight="600" size="37px" />
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
            <DateFilter txt="De" icon="fi fi-sr-calendar" color="#922877" v-model="filters.date_from" />
            <DateFilter txt="Até" icon="fi fi-sr-calendar" color="#922877" v-model="filters.date_to" />
          </div>

          <div class="dropdowns">
            <FilterDropDown txt="Rota" icon="fi fi-rs-route" color="#922877" :options="routeOptions"
              v-model="filters.route_id" />
            <CleanFilter v-if="hasFilters" @click="clearFilters" />
          </div>
        </div>

        <div class="Data">
          <div @click="downloadPdf">
            <IconText icon="fi fi-rs-file-pdf" :txt="downloadingPdf ? 'A gerar...' : 'Exportar PDF'"
              color="#8B9B1A" background="#922877" />
          </div>
          <div @click="downloadExcel">
            <IconText icon="fi fi-rs-file-excel" :txt="downloadingExcel ? 'A gerar...' : 'Exportar Excel'"
              color="#fff" background="#1D6F42" />
          </div>
        </div>
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de viagens" :data="occupancy.summary?.total_trips" />
        <StatiscSimple title="Lugares vendidos" :data="occupancy.summary?.total_seats_sold" />
        <StatiscSimple title="Capacidade total" :data="occupancy.summary?.total_capacity" />
        <StatiscSimple title="Taxa de ocupação"
          :data="occupancy.summary ? `${occupancy.summary.occupancy_rate}%` : null" />
        <StatiscSimple title="Receita MZN"
          :data="occupancy.summary ? fmt(occupancy.summary.total_revenue_mzn) : null" />
        <StatiscSimple title="Receita ZAR"
          :data="occupancy.summary ? fmt(occupancy.summary.total_revenue_zar) : null" />
      </div>

      <div class="table">
        <div v-if="loading" class="loaderWrapper">
          <div class="loader"></div>
        </div>

        <div v-else-if="rows.length === 0" class="emptyState">
          <i class="fi fi-sr-folder-open emptyIcon"></i>
          <Text txt="Nenhuma viagem encontrada" color="922877" weight="600" size="22px" />
          <p class="emptyText">Não existem viagens para os filtros seleccionados.</p>
        </div>

        <template v-else>
          <TableBase :headers="headers" :rows="rows" :hide-actions="true" />

          <Pagination :pagination="occupancy.pagination" @change="goToPage" />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reportWrapper {
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
