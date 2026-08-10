<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouteStore } from '../stores/routeStore'
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
import RouteFormModal from '../modal/RouteFormModal.vue'
import RouteStopsModal from '../modal/RouteStopsModal.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'

const routeStore = useRouteStore()
const { routes, pagination, loading } = storeToRefs(routeStore)
const { showToast } = useToast()

const search = ref('')
const loadError = ref(null)
const editingRoute = ref(null)
const showFormModal = ref(false)
const stopsRoute = ref(null)
const showStopsModal = ref(false)
const deleteTarget = ref(null)
const deletingRoute = ref(false)
const deactivatingRoute = ref(false)
const cascadeWarning = ref(null)

const headers = ['Nome', 'Origem', 'Destino', 'Preço (MZN)', 'Preço (ZAR)', 'Duração', 'Estado']

function formatDuration(minutes) {
  if (!minutes) return '--'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}min` : `${h}h`
}

const rows = computed(() =>
  routes.value.map((r) => ({
    id: r.id,
    name: r.name,
    origin: r.origin,
    destination: r.destination,
    price_mzn: `${Number(r.price_mzn).toLocaleString('pt-PT')} MT`,
    price_zar: `${Number(r.price_zar).toLocaleString('pt-PT')} ZAR`,
    duration: formatDuration(r.estimated_duration_minutes),
    is_active: r.is_active ? 'Activa' : 'Inactiva',
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 7,
    all: 1,
    ...(search.value ? { search: search.value } : {}),
  }
}

async function fetchData(page = 1) {
  loadError.value = null

  try {
    await routeStore.fetchRoutes(buildParams(page))
  } catch (err) {
    // Sem isto o ecra ficava vazio e o utilizador julgava que
    // nao havia registos, quando na verdade a API tinha falhado.
    loadError.value = parseApiError(err)
  }
}

function goToPage(page) {
  if (page < 1 || page > pagination.value.last_page) return
  fetchData(page)
}

let searchTimer = null
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchData(1), 300)
})

function openCreate() {
  editingRoute.value = null
  showFormModal.value = true
}

function openEdit(row) {
  editingRoute.value = routes.value.find((r) => r.id === row.id) ?? null
  showFormModal.value = true
}

function askDelete(row) {
  deleteTarget.value = row
}

function cancelDelete() {
  deleteTarget.value = null
}

async function confirmDelete() {
  deletingRoute.value = true
  try {
    await routeStore.deleteRoute(deleteTarget.value.id)
    showToast('success', 'Rota eliminada com sucesso.')
    deleteTarget.value = null
    fetchData(pagination.value.current_page)
  } catch (err) {
    const reason = err.response?.data?.reason

    if (reason === 'needs_cascade_confirm') {
      cascadeWarning.value = {
        routeId: deleteTarget.value.id,
        message: err.response.data.message,
      }
      deleteTarget.value = null
    } else {
      showToast('error', parseApiError(err))
    }
  } finally {
    deletingRoute.value = false
  }
}

function cancelCascade() {
  cascadeWarning.value = null
}

async function confirmCascadeDelete() {
  deletingRoute.value = true
  try {
    await routeStore.deleteRoute(cascadeWarning.value.routeId, { confirmCascade: true })
    showToast('success', 'Rota e viagens associadas eliminadas com sucesso.')
    cascadeWarning.value = null
    fetchData(pagination.value.current_page)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    deletingRoute.value = false
  }
}

async function confirmDeactivate() {
  deactivatingRoute.value = true
  try {
    await routeStore.deactivateRoute(deleteTarget.value.id)
    showToast('success', 'Rota desactivada com sucesso.')
    deleteTarget.value = null
    fetchData(pagination.value.current_page)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    deactivatingRoute.value = false
  }
}

function closeForm(saved) {
  showFormModal.value = false
  editingRoute.value = null
  if (saved) fetchData(pagination.value.current_page)
}

function openStops(row) {
  stopsRoute.value = routes.value.find((r) => r.id === row.id) ?? null
  showStopsModal.value = true
}

0

function closeStops() {
  showStopsModal.value = false
  stopsRoute.value = null
}

onMounted(() => fetchData())
</script>

<template>
  <div class="routesWrapper">
    <header>
      <Text txt="Rotas" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <Search
          txt="Pesquise por nome, origem ou destino"
          :modelValue="search"
          @update:modelValue="search = $event"
        />

        <div class="Data" @click="openCreate">
          <IconText
            icon="fi fi-rs-map-marker-road"
            txt="Nova Rota"
            color="#8B9B1A"
            background="#922877"
          />
        </div>
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de rotas" :data="pagination.total" />
      </div>

      <div class="table">
        <BaseLoader v-if="loading" />

        <ErrorState v-else-if="loadError" :message="loadError" @retry="fetchData()" />

        <EmptyState v-else-if="routes.length === 0" title="Nenhuma rota encontrada" message="Ainda não existem rotas registadas." />

        <template v-else>
          <TableBase
            :headers="headers"
            :rows="rows"
            displayIcon="flex"
            displayEye="flex"
            @row-edit="openEdit"
            @row-delete="askDelete"
            @row-click="openStops"
          />

          <Pagination :pagination="pagination" @change="goToPage" />
        </template>
      </div>
    </div>
  </div>

  <RouteFormModal
    v-if="showFormModal"
    :route="editingRoute"
    @close="closeForm"
  />

  <RouteStopsModal
    v-if="showStopsModal"
    :route="stopsRoute"
    @close="closeStops"
  />

  <ConfirmDeleteModal
    v-if="deleteTarget"
    :title="`Eliminar a rota ${deleteTarget.name}?`"
    :loading-delete="deletingRoute"
    :loading-deactivate="deactivatingRoute"
    @cancel="cancelDelete"
    @confirm-delete="confirmDelete"
    @confirm-deactivate="confirmDeactivate"
  />

  <ConfirmDeleteModal
    v-if="cascadeWarning"
    title="Eliminar rota e viagens associadas?"
    :subtitle="cascadeWarning.message"
    :show-deactivate="false"
    :loading-delete="deletingRoute"
    @cancel="cancelCascade"
    @confirm-delete="confirmCascadeDelete"
  />
</template>

<style scoped>
.routesWrapper {
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
