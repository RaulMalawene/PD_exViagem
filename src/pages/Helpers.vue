<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useHelperStore } from '../stores/helperStore'
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
import HelperFormModal from '../modal/HelperFormModal.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'

const helperStore = useHelperStore()
const { helpers, pagination, loading } = storeToRefs(helperStore)
const { showToast } = useToast()

const search = ref('')
const loadError = ref(null)
const editingHelper = ref(null)
const showFormModal = ref(false)
const deleteTarget = ref(null)
const deletingHelper = ref(false)
const deactivatingHelper = ref(false)

const headers = ['Nome', 'Telefone', 'Estado']

const rows = computed(() =>
  helpers.value.map((h) => ({
    id: h.id,
    name: h.name,
    phone: formatPhone(h.phone),
    is_active: h.is_active ? 'Activo' : 'Inactivo',
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 7,
    all: 1,
    ...(search.value ? { name: search.value } : {}),
  }
}

async function fetchData(page = 1) {
  loadError.value = null

  try {
    await helperStore.fetchHelpers(buildParams(page))
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
  editingHelper.value = null
  showFormModal.value = true
}

function openEdit(row) {
  editingHelper.value = helpers.value.find((h) => h.id === row.id) ?? null
  showFormModal.value = true
}

function askDelete(row) {
  deleteTarget.value = row
}

function cancelDelete() {
  deleteTarget.value = null
}

async function confirmDelete() {
  deletingHelper.value = true
  try {
    await helperStore.deleteHelper(deleteTarget.value.id)
    showToast('success', 'Ajudante eliminado com sucesso.')
    deleteTarget.value = null
    fetchData(pagination.value.current_page)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    deletingHelper.value = false
  }
}

async function confirmDeactivate() {
  deactivatingHelper.value = true
  try {
    await helperStore.deactivateHelper(deleteTarget.value.id)
    showToast('success', 'Ajudante desactivado com sucesso.')
    deleteTarget.value = null
    fetchData(pagination.value.current_page)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    deactivatingHelper.value = false
  }
}

function closeForm(saved) {
  showFormModal.value = false
  editingHelper.value = null
  if (saved) fetchData(pagination.value.current_page)
}

onMounted(() => fetchData())
</script>

<template>
  <div class="helpersWrapper">
    <header>
      <Text txt="Ajudantes" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <Search
          txt="Pesquise por nome"
          :modelValue="search"
          @update:modelValue="search = $event"
        />

        <div class="Data" @click="openCreate">
          <IconText
            icon="fi fi-rs-user-helmet-safety"
            txt="Novo Ajudante"
            color="#8B9B1A"
            background="#922877"
          />
        </div>
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de ajudantes" :data="pagination.total" />
      </div>

      <div class="table">
        <BaseLoader v-if="loading" />

        <ErrorState v-else-if="loadError" :message="loadError" @retry="fetchData()" />

        <EmptyState v-else-if="helpers.length === 0" title="Nenhum ajudante encontrado" message="Ainda não existem ajudantes registados." />

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

  <HelperFormModal
    v-if="showFormModal"
    :helper="editingHelper"
    @close="closeForm"
  />

  <ConfirmDeleteModal
    v-if="deleteTarget"
    :title="`Eliminar o ajudante ${deleteTarget.name}?`"
    :loading-delete="deletingHelper"
    :loading-deactivate="deactivatingHelper"
    @cancel="cancelDelete"
    @confirm-delete="confirmDelete"
    @confirm-deactivate="confirmDeactivate"
  />
</template>

<style scoped>
.helpersWrapper {
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
