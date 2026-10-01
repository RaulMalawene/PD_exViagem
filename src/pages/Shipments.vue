<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useShipmentStore } from '../stores/shipmentStore'
import { formatDate } from '../utils/formatDate'
import { formatPhone } from '../utils/formatPhone'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'

import Text from '../components/Text.vue'
import Profile from '../components/Profile.vue'
import Search from '../components/Search.vue'
import StatiscSimple from '../components/StatiscSimple.vue'
import TableBase from '../components/TableBase.vue'
import BaseLoader from '../components/BaseLoader.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import IconText from '../components/IconText.vue'
import FilterDropDown from '../components/filters/FilterDropDown.vue'
import CleanFilter from '../components/CleanFilter.vue'
import ShipmentFormModal from '../modal/ShipmentFormModal.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'

const shipmentStore = useShipmentStore()
const { shipments, pagination, loading } = storeToRefs(shipmentStore)
const { showToast } = useToast()

const search = ref('')
const loadError = ref(null)
const editingShipment = ref(null)
const showFormModal = ref(false)
const deleteTarget = ref(null)
const deletingShipment = ref(false)
const mobileFiltersOpen = ref(false)

const filters = ref({ type: '', status: '' })

const typeLabels = { correio: 'Correio', drop_off: 'Drop off', carga: 'Carga' }
const statusLabels = {
  pending_docs: 'Pendente de documentos',
  cleared: 'Documentação regularizada',
  on_trip: 'Em trânsito',
  ready_for_pickup: 'Pronto p/ levantamento',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const typeOptions = [
  { label: 'Correio', value: 'correio' },
  { label: 'Drop off', value: 'drop_off' },
  { label: 'Carga', value: 'carga' },
]

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ label, value }))

const hasFilters = computed(() => !!(filters.value.type || filters.value.status || search.value))
const activeFilterCount = computed(() => [filters.value.type, filters.value.status].filter(Boolean).length)

const headers = ['Tipo', 'Remetente', 'Destinatário', 'Peso (Kg)', 'Taxa', 'Pago', 'Estado', 'Viagem']

const rows = computed(() =>
  shipments.value.map((s) => ({
    id: s.id,
    type: typeLabels[s.type] ?? s.type,
    sender: `${s.sender_name} · ${formatPhone(s.sender_phone)}`,
    receiver: `${s.receiver_name} · ${formatPhone(s.receiver_phone)}`,
    weight: `${s.weight_kg} Kg`,
    fee: `${Number(s.total_fees).toLocaleString('pt-PT')} ${s.currency}`,
    paid: s.invoice?.status === 'paid' ? 'Pago' : 'Não pago',
    status: statusLabels[s.status] ?? s.status,
    trip: s.trip ? `${s.trip.route?.name ?? '--'} · ${formatDate(s.trip.departure_date)}` : 'Sem viagem',
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 7,
    ...(search.value ? { search: search.value } : {}),
    ...(filters.value.type ? { type: filters.value.type } : {}),
    ...(filters.value.status ? { status: filters.value.status } : {}),
  }
}

async function fetchData(page = 1) {
  loadError.value = null

  try {
    await shipmentStore.fetchShipments(buildParams(page))
  } catch (err) {
    // Sem isto o ecra ficava vazio e o utilizador julgava que
    // nao havia registos, quando na verdade a API tinha falhado.
    loadError.value = parseApiError(err)
  }
}

function clearFilters() {
  filters.value = { type: '', status: '' }
  search.value = ''
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.last_page) return
  fetchData(page)
}

let searchTimer = null
watch([search, filters], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchData(1), 300)
}, { deep: true })

function openCreate() {
  editingShipment.value = null
  showFormModal.value = true
}

async function openEdit(row) {
  const res = await shipmentStore.fetchShipment(row.id)
  editingShipment.value = res.data
  showFormModal.value = true
}

function askDelete(row) {
  deleteTarget.value = row
}

function cancelDelete() {
  deleteTarget.value = null
}

async function confirmDelete() {
  deletingShipment.value = true
  try {
    await shipmentStore.deleteShipment(deleteTarget.value.id)
    showToast('success', 'Mercadoria eliminada com sucesso.')
    deleteTarget.value = null
    fetchData(pagination.value.current_page)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    deletingShipment.value = false
  }
}

function closeForm(saved) {
  showFormModal.value = false
  editingShipment.value = null
  if (saved) fetchData(pagination.value.current_page)
}

onMounted(() => fetchData())
</script>

<template>
  <div class="shipmentsWrapper">
    <header>
      <Text txt="Mercadorias" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <Search
          txt="Pesquise por remetente/destinatário"
          :modelValue="search"
          @update:modelValue="search = $event"
        />

        <div class="Data" @click="openCreate">
          <IconText
            icon="fi fi-rs-box-open"
            txt="Nova Mercadoria"
            color="#8B9B1A"
            background="#922877"
          />
        </div>
      </div>

      <button class="filtersToggle" @click="mobileFiltersOpen = !mobileFiltersOpen">
        <i class="fi fi-rs-filter" />
        <span>Filtros</span>
        <span v-if="activeFilterCount" class="filterBadge">{{ activeFilterCount }}</span>
        <i class="fi fi-rs-angle-small-down toggleChevron" :class="{ rotated: mobileFiltersOpen }" />
      </button>

      <div class="filtersRow" :class="{ mobileOpen: mobileFiltersOpen }">
        <FilterDropDown txt="Tipo" icon="fi fi-rs-box" color="#922877" :options="typeOptions"
          :modelValue="filters.type" @update:modelValue="filters.type = $event" />
        <FilterDropDown txt="Estado" icon="fi fi-rs-list-check" color="#922877" :options="statusOptions"
          :modelValue="filters.status" @update:modelValue="filters.status = $event" />
        <CleanFilter v-if="hasFilters" @click="clearFilters" />
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de mercadorias" :data="pagination.total" />
      </div>

      <div class="table">
        <BaseLoader v-if="loading" />

        <ErrorState v-else-if="loadError" :message="loadError" @retry="fetchData()" />

        <EmptyState v-else-if="shipments.length === 0" title="Nenhuma mercadoria encontrada" message="Ainda não existem mercadorias registadas." />

        <template v-else>
          <TableBase
            :headers="headers"
            :rows="rows"
            displayIcon="flex"
            displayEye="none"
            @row-edit="openEdit"
            @row-delete="askDelete"
          />

          <Pagination :pagination="pagination" @change="goToPage" />
        </template>
      </div>
    </div>
  </div>

  <ShipmentFormModal
    v-if="showFormModal"
    :shipment="editingShipment"
    @close="closeForm"
  />

  <ConfirmDeleteModal
    v-if="deleteTarget"
    :title="`Eliminar a mercadoria de ${deleteTarget.sender}?`"
    :loading-delete="deletingShipment"
    :show-deactivate="false"
    @cancel="cancelDelete"
    @confirm-delete="confirmDelete"
  />
</template>

<style scoped>
.shipmentsWrapper {
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
  cursor: pointer;
}

.filtersToggle {
  display: none;
}

.filtersRow {
  margin-top: 16px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  align-items: center;
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

@media (max-width: 767px) {
  .filterData {
    margin-top: 20px;
  }

  .searchData {
    flex-wrap: wrap;
  }

  .Data {
    width: 100%;
    height: auto;
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
    margin-top: 12px;
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

  .filtersRow {
    display: none;
    flex-direction: column;
    align-items: stretch;
    margin-top: 8px;
  }

  .filtersRow.mobileOpen {
    display: flex;
  }

  .filtersRow :deep(.DropDownWrapper) {
    width: 100%;
    max-width: none;
  }

  .Statistcss { margin-top: 20px; }

  .table {
    margin-top: 20px;
    padding: 16px;
  }

}
</style>
