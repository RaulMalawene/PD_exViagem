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
import IconText from '../components/IconText.vue'
import HelperFormModal from '../modal/HelperFormModal.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'

const helperStore = useHelperStore()
const { helpers, pagination, loading } = storeToRefs(helperStore)
const { showToast } = useToast()

const search = ref('')
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
    per_page: 15,
    all: 1,
    ...(search.value ? { name: search.value } : {}),
  }
}

async function fetchData(page = 1) {
  await helperStore.fetchHelpers(buildParams(page))
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
        <div v-if="loading" class="loaderWrapper">
          <div class="loader"></div>
        </div>

        <div v-else-if="helpers.length === 0" class="emptyState">
          <i class="fi fi-sr-folder-open emptyIcon"></i>
          <Text txt="Nenhum ajudante encontrado" color="922877" weight="600" size="22px" />
          <p class="emptyText">Ainda não existem ajudantes registados.</p>
        </div>

        <template v-else>
          <TableBase
            :headers="headers"
            :rows="rows"
            displayIcon="flex"
            displayEye="none"
            @row-edit="openEdit"
            @row-delete="askDelete"
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

            <span class="pageInfo">{{ pagination.total }} ajudantes</span>
          </div>
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
</style>
