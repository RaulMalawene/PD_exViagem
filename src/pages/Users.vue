<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'

import Text from '../components/Text.vue'
import Profile from '../components/Profile.vue'
import Search from '../components/Search.vue'
import StatiscSimple from '../components/StatiscSimple.vue'
import TableBase from '../components/TableBase.vue'
import IconText from '../components/IconText.vue'
import FilterDropDown from '../components/filters/FilterDropDown.vue'
import CleanFilter from '../components/CleanFilter.vue'
import UserFormModal from '../modal/UserFormModal.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'

const userStore = useUserStore()
const authStore = useAuthStore()
const { users, pagination, loading } = storeToRefs(userStore)
const { showToast } = useToast()

const search = ref('')
const editingUser = ref(null)
const showFormModal = ref(false)
const deleteTarget = ref(null)
const deactivatingUser = ref(false)

const roleLabels = { admin: 'Administrador', staff: 'Funcionário', driver: 'Motorista' }
const roleOptions = [
  { label: 'Administrador', value: 'admin' },
  { label: 'Funcionário', value: 'staff' },
  { label: 'Motorista', value: 'driver' },
]

const filters = ref({ role: '' })

const hasFilters = computed(() => !!(filters.value.role || search.value))

const headers = ['Nome', 'Email', 'Perfil', 'Estado']

const rows = computed(() =>
  users.value.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: roleLabels[u.role] ?? u.role,
    is_active: u.is_active ? 'Activo' : 'Inactivo',
    _isSelf: u.id === authStore.user?.id,
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 15,
    all: 1,
    ...(search.value ? { search: search.value } : {}),
    ...(filters.value.role ? { role: filters.value.role } : {}),
  }
}

async function fetchData(page = 1) {
  await userStore.fetchUsers(buildParams(page))
}

function clearFilters() {
  filters.value = { role: '' }
  search.value = ''
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
watch([search, filters], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchData(1), 300)
}, { deep: true })

function openCreate() {
  editingUser.value = null
  showFormModal.value = true
}

function openEdit(row) {
  editingUser.value = users.value.find((u) => u.id === row.id) ?? null
  showFormModal.value = true
}

function askDelete(row) {
  if (row._isSelf) return
  deleteTarget.value = row
}

function cancelDelete() {
  deleteTarget.value = null
}

async function confirmDeactivate() {
  deactivatingUser.value = true
  try {
    await userStore.deleteUser(deleteTarget.value.id)
    showToast('success', 'Utilizador desactivado com sucesso.')
    deleteTarget.value = null
    fetchData(pagination.value.current_page)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    deactivatingUser.value = false
  }
}

function closeForm(saved) {
  showFormModal.value = false
  editingUser.value = null
  if (saved) fetchData(pagination.value.current_page)
}

onMounted(() => fetchData())
</script>

<template>
  <div class="usersWrapper">
    <header>
      <Text txt="Utilizadores" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <Search
          txt="Pesquise por nome ou email"
          :modelValue="search"
          @update:modelValue="search = $event"
        />

        <div class="Data" @click="openCreate">
          <IconText
            icon="fi fi-rs-user"
            txt="Novo Utilizador"
            color="#8B9B1A"
            background="#922877"
          />
        </div>
      </div>

      <div class="filtersRow">
        <FilterDropDown txt="Perfil" icon="fi fi-rs-user" color="#922877" :options="roleOptions"
          :modelValue="filters.role" @update:modelValue="filters.role = $event" />
        <CleanFilter v-if="hasFilters" @click="clearFilters" />
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de utilizadores" :data="pagination.total" />
      </div>

      <div class="table">
        <div v-if="loading" class="loaderWrapper">
          <div class="loader"></div>
        </div>

        <div v-else-if="users.length === 0" class="emptyState">
          <i class="fi fi-sr-folder-open emptyIcon"></i>
          <Text txt="Nenhum utilizador encontrado" color="922877" weight="600" size="22px" />
          <p class="emptyText">Ainda não existem utilizadores registados.</p>
        </div>

        <template v-else>
          <TableBase
            :headers="headers"
            :rows="rows"
            displayIcon="flex"
            displayEye="none"
            :row-class="(row) => row._isSelf ? 'hideDelete' : ''"
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

            <span class="pageInfo">{{ pagination.total }} utilizadores</span>
          </div>
        </template>
      </div>
    </div>
  </div>

  <UserFormModal
    v-if="showFormModal"
    :user="editingUser"
    @close="closeForm"
  />

  <ConfirmDeleteModal
    v-if="deleteTarget"
    title="Desactivar utilizador?"
    :subtitle="`O utilizador ${deleteTarget.name} deixa de conseguir aceder ao sistema.`"
    icon="fi fi-rs-user-slash"
    :show-delete="false"
    :loading-deactivate="deactivatingUser"
    @cancel="cancelDelete"
    @confirm-deactivate="confirmDeactivate"
  />
</template>

<style scoped>
.usersWrapper {
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

.table :deep(tr.hideDelete .fi-sr-trash) {
  display: none !important;
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
