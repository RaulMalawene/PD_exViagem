<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoundTripStore } from '../stores/roundTripStore'
import { formatDate } from '../utils/formatDate'
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
import RoundTripFormModal from '../modal/RoundTripFormModal.vue'
import RoundTripReportModal from '../modal/RoundTripReportModal.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'

const roundTripStore = useRoundTripStore()
const { roundTrips, pagination, loading } = storeToRefs(roundTripStore)
const { showToast } = useToast()

const search = ref('')
const loadError = ref(null)
const editingRoundTrip = ref(null)
const showFormModal = ref(false)
const reportTarget = ref(null)
const deleteTarget = ref(null)
const deletingRoundTrip = ref(false)

const statusLabels = { scheduled: 'Agendada', in_progress: 'Em curso', completed: 'Completa', cancelled: 'Cancelada' }

const headers = ['Processo', 'Ida', 'Volta', 'Ajudante', 'Estado']

function tripLabel(trip) {
  if (!trip) return '--'
  return `${trip.route?.name ?? '--'} · ${formatDate(trip.departure_date)}`
}

const rows = computed(() =>
  roundTrips.value.map((rt) => ({
    id: rt.id,
    process: rt.process_number,
    outbound: tripLabel(rt.outbound_trip),
    return: tripLabel(rt.return_trip),
    helper: rt.helper?.name ?? '--',
    status: statusLabels[rt.status] ?? rt.status,
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 7,
    ...(search.value ? { process_number: search.value } : {}),
  }
}

async function fetchData(page = 1) {
  loadError.value = null

  try {
    await roundTripStore.fetchRoundTrips(buildParams(page))
  } catch (err) {
    // Sem isto o ecra ficava vazio e o utilizador julgava que
    // nao havia registos, quando na verdade a API tinha falhado.
    loadError.value = parseApiError(err)
  }
}

let searchTimer = null
function onSearch(value) {
  search.value = value
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchData(1), 300)
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.last_page) return
  fetchData(page)
}

function openCreate() {
  editingRoundTrip.value = null
  showFormModal.value = true
}

async function openEdit(row) {
  const res = await roundTripStore.fetchRoundTrip(row.id)
  editingRoundTrip.value = res.data
  showFormModal.value = true
}

async function openReport(row) {
  const res = await roundTripStore.fetchRoundTrip(row.id)
  reportTarget.value = res.data
}

function askDelete(row) {
  deleteTarget.value = row
}

function cancelDelete() {
  deleteTarget.value = null
}

async function confirmDelete() {
  deletingRoundTrip.value = true
  try {
    await roundTripStore.deleteRoundTrip(deleteTarget.value.id)
    showToast('success', 'Viagem completa eliminada com sucesso.')
    deleteTarget.value = null
    fetchData(pagination.value.current_page)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    deletingRoundTrip.value = false
  }
}

function closeForm(saved) {
  showFormModal.value = false
  editingRoundTrip.value = null
  if (saved) fetchData(pagination.value.current_page)
}

function closeReport() {
  reportTarget.value = null
  fetchData(pagination.value.current_page)
}

onMounted(() => fetchData())
</script>

<template>
  <div class="roundTripsWrapper">
    <header>
      <Text txt="Viagens Completas" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <Search
          txt="Pesquise por número de processo"
          :modelValue="search"
          @update:modelValue="onSearch"
        />

        <div class="Data" @click="openCreate">
          <IconText
            icon="fi fi-rs-arrows-repeat"
            txt="Nova Viagem Completa"
            color="#8B9B1A"
            background="#922877"
          />
        </div>
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de viagens completas" :data="pagination.total" />
      </div>

      <div class="table">
        <BaseLoader v-if="loading" />

        <ErrorState v-else-if="loadError" :message="loadError" @retry="fetchData()" />

        <EmptyState v-else-if="roundTrips.length === 0" title="Nenhuma viagem completa encontrada" message="Emparelha uma viagem de ida com a sua volta para começares." />

        <template v-else>
          <TableBase
            :headers="headers"
            :rows="rows"
            displayIcon="flex"
            displayEye="flex"
            @row-edit="openEdit"
            @row-delete="askDelete"
            @row-click="openReport"
          />

          <Pagination :pagination="pagination" @change="goToPage" />
        </template>
      </div>
    </div>
  </div>

  <RoundTripFormModal
    v-if="showFormModal"
    :round-trip="editingRoundTrip"
    @close="closeForm"
  />

  <RoundTripReportModal
    v-if="reportTarget"
    :round-trip="reportTarget"
    @close="closeReport"
  />

  <ConfirmDeleteModal
    v-if="deleteTarget"
    :title="`Eliminar a viagem completa ${deleteTarget.process}?`"
    :loading-delete="deletingRoundTrip"
    :show-deactivate="false"
    @cancel="cancelDelete"
    @confirm-delete="confirmDelete"
  />
</template>

<style scoped>
.roundTripsWrapper {
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

  .Statistcss { margin-top: 20px; }

  .table {
    margin-top: 20px;
    padding: 16px;
  }

}
</style>
