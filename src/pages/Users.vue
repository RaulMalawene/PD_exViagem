<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { roleLabel, roleFilterOptions } from '../utils/roles'

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
import UserFormModal from '../modal/UserFormModal.vue'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal.vue'

const userStore = useUserStore()
const authStore = useAuthStore()
const { users, pagination, loading } = storeToRefs(userStore)
const { showToast } = useToast()

const search = ref('')
const loadError = ref(null)
const editingUser = ref(null)
const showFormModal = ref(false)
const deleteTarget = ref(null)
const deactivatingUser = ref(false)

const filters = ref({ role: '' })

const hasFilters = computed(() => !!(filters.value.role || search.value))

const headers = ['Nome', 'Email', 'Perfil', 'Estado']

const rows = computed(() =>
  users.value.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: roleLabel(u.role),
    is_active: u.is_active ? 'Activo' : 'Inactivo',
    _isSelf: u.id === authStore.user?.id,
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 7,
    all: 1,
    ...(search.value ? { search: search.value } : {}),
    ...(filters.value.role ? { role: filters.value.role } : {}),
  }
}

async function fetchData(page = 1) {
  loadError.value = null

  try {
    await userStore.fetchUsers(buildParams(page))
  } catch (err) {
    // Sem isto o ecra ficava vazio e o utilizador julgava que
    // nao havia registos, quando na verdade a API tinha falhado.
    loadError.value = parseApiError(err)
  }
}

function clearFilters() {
  filters.value = { role: '' }
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
        <FilterDropDown txt="Perfil" icon="fi fi-rs-user" color="#922877" :options="roleFilterOptions"
          :modelValue="filters.role" @update:modelValue="filters.role = $event" />
        <CleanFilter v-if="hasFilters" @click="clearFilters" />
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de utilizadores" :data="pagination.total" />
      </div>

      <div class="table">
        <BaseLoader v-if="loading" />

        <ErrorState v-else-if="loadError" :message="loadError" @retry="fetchData()" />

        <EmptyState v-else-if="users.length === 0" title="Nenhum utilizador encontrado" message="Ainda não existem utilizadores registados." />

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

          <Pagination :pagination="pagination" @change="goToPage" />
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

.table :deep(tr.hideDelete .fi-sr-trash) {
  display: none !important;
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

  .filtersRow {
    margin-top: 12px;
  }

  .filtersRow :deep(.DropDownWrapper) {
    flex: 1;
    max-width: none;
  }

  .Statistcss { margin-top: 20px; }

  .table {
    margin-top: 20px;
    padding: 16px;
  }

}
</style>
