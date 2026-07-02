<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import bookingService from '../services/bookingService'

import Text from '../components/Text.vue'
import Profile from '../components/Profile.vue'
import Search from '../components/Search.vue'
import StatiscSimple from '../components/StatiscSimple.vue'
import TableBase from '../components/TableBase.vue'
import IconText from '../components/IconText.vue'
import DateFilter from '../components/filters/DateFilter.vue'
import FilterDropDown from '../components/filters/FilterDropDown.vue'
import CleanFilter from '../components/CleanFilter.vue'

const loading = ref(true)
const bookings = ref([])
const pagination = ref({ current_page: 1, last_page: 1, total: 0 })
const search = ref('')

const filters = ref({ status: '', payment_status: '', date_from: '', date_to: '' })

const stats = ref({ total: null, pending: null, confirmed: null, cancelled: null })

const statusOptions = [
  { label: 'Pendente', value: 'pending' },
  { label: 'Confirmada', value: 'confirmed' },
  { label: 'Cancelada', value: 'cancelled' },
]

const paymentOptions = [
  { label: 'Pendente', value: 'pending' },
  { label: 'Pago', value: 'paid' },
  { label: 'Reembolsado', value: 'refunded' },
]

const hasFilters = computed(() =>
  !!(filters.value.status || filters.value.payment_status || filters.value.date_from || filters.value.date_to)
)

const headers = ['Bilhete', 'Lugar', 'Passageiro', 'Data viagem', 'Rota', 'Estado', 'Pagamento']

const rows = computed(() =>
  bookings.value.map((b) => ({
    id: b.id,
    ticket: b.ticket_number,
    seat: b.seat_number,
    passenger: b.passenger?.name ?? '--',
    date: b.trip?.departure_date ?? '--',
    route: b.trip?.route?.name ?? '--',
    status: b.status,
    payment: b.payment_status,
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 15,
    ...(search.value ? { passenger: search.value } : {}),
    ...(filters.value.status ? { status: filters.value.status } : {}),
    ...(filters.value.payment_status ? { payment_status: filters.value.payment_status } : {}),
    ...(filters.value.date_from ? { date_from: filters.value.date_from } : {}),
    ...(filters.value.date_to ? { date_to: filters.value.date_to } : {}),
  }
}

async function fetchData(page = 1) {
  loading.value = true
  try {
    const [all, pending, confirmed, cancelled] = await Promise.all([
      bookingService.list(buildParams(page)),
      bookingService.list({ status: 'pending', per_page: 1 }),
      bookingService.list({ status: 'confirmed', per_page: 1 }),
      bookingService.list({ status: 'cancelled', per_page: 1 }),
    ])

    bookings.value = all.data
    pagination.value = all.meta

    stats.value = {
      total: all.meta.total,
      pending: pending.meta.total,
      confirmed: confirmed.meta.total,
      cancelled: cancelled.meta.total,
    }
  } finally {
    loading.value = false
  }
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

let searchTimer = null
function onSearch(val) {
  search.value = val
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchData(1), 400)
}

let filterTimer = null
watch(filters, () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => fetchData(1), 300)
}, { deep: true })

function clearFilters() {
  filters.value = { status: '', payment_status: '', date_from: '', date_to: '' }
}

onMounted(() => fetchData())
</script>

<template>
  <div class="homeWrapper">
    <header>
      <Text txt="Reservas" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <Search
          txt="Pesquise pelo nome do passageiro"
          :modelValue="search"
          @update:modelValue="onSearch"
        />

        <div class="Data">
          <IconText
            icon="fi fi-rs-ticket"
            txt="Nova reserva"
            color="#8B9B1A"
            background="#A3206A"
          />
        </div>
      </div>

      <div class="filters">
        <div class="dates">
          <DateFilter
            txt="Data Inicial"
            icon="fi fi-sr-calendar"
            color="#A3206A"
            v-model="filters.date_from"
          />
          <DateFilter
            txt="Data Final"
            icon="fi fi-sr-calendar"
            color="#A3206A"
            v-model="filters.date_to"
          />
        </div>

        <div class="dropdowns">
          <FilterDropDown
            txt="Estado da reserva"
            icon="fi fi-sr-ticket"
            color="#A3206A"
            :options="statusOptions"
            v-model="filters.status"
          />
          <FilterDropDown
            txt="Estado de pagamento"
            icon="fi fi-sr-sack-dollar"
            color="#A3206A"
            :options="paymentOptions"
            v-model="filters.payment_status"
          />
          <CleanFilter v-if="hasFilters" @click="clearFilters" />
        </div>
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de reservas" :data="stats.total" />
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
          <Text txt="Nenhuma reserva encontrada" color="A3206A" weight="600" size="22px" />
          <p class="emptyText">Não existem dados para os filtros seleccionados.</p>
        </div>

        <template v-else>
          <TableBase
            :headers="headers"
            :rows="rows"
            displayIcon="none"
            displayEye="flex"
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

            <span class="pageInfo">{{ pagination.total }} registos</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.homeWrapper {
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
  height: 100%;
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
  border-top-color: #A3206A;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.emptyIcon {
  font-size: 48px;
  color: #A3206A;
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
  background: #A3206A;
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
</style>
