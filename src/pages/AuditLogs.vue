<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuditLogStore } from '../stores/auditLogStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { formatDateTime } from '../utils/formatDate'
import { actionLabel, entityLabel, actionFilterOptions, entityFilterOptions } from '../utils/auditLabels'

import Text from '../components/Text.vue'
import Profile from '../components/Profile.vue'
import StatiscSimple from '../components/StatiscSimple.vue'
import Pagination from '../components/Pagination.vue'
import FilterDropDown from '../components/filters/FilterDropDown.vue'
import DateFilter from '../components/filters/DateFilter.vue'
import CleanFilter from '../components/CleanFilter.vue'
import AuditLogDetailModal from '../modal/AuditLogDetailModal.vue'

const auditLogStore = useAuditLogStore()
const { logs, pagination, loading } = storeToRefs(auditLogStore)
const { showToast } = useToast()

const loadError = ref(null)
const selectedLog = ref(null)

const filters = ref({ action: '', entity: '', date_from: '', date_to: '' })

const hasFilters = computed(() => Object.values(filters.value).some(Boolean))

function buildParams(page = 1) {
  return {
    page,
    per_page: 7,
    ...Object.fromEntries(Object.entries(filters.value).filter(([, v]) => v)),
  }
}

async function fetchData(page = 1) {
  loadError.value = null

  try {
    await auditLogStore.fetchLogs(buildParams(page))
  } catch (err) {
    loadError.value = parseApiError(err)
  }
}

function clearFilters() {
  filters.value = { action: '', entity: '', date_from: '', date_to: '' }
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

async function openDetail(log) {
  try {
    const res = await auditLogStore.fetchLog(log.id)
    selectedLog.value = res.data
  } catch (err) {
    showToast('error', parseApiError(err))
  }
}

onMounted(() => fetchData())
</script>

<template>
  <div class="logsWrapper">
    <header>
      <Text txt="Auditoria" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <p class="subtitle">Histórico de todas as alterações feitas no sistema.</p>

      <div class="filtersRow">
        <FilterDropDown txt="Acção" icon="fi fi-rs-bolt" color="#922877" :options="actionFilterOptions"
          :modelValue="filters.action" @update:modelValue="filters.action = $event" />
        <FilterDropDown txt="Entidade" icon="fi fi-rs-box-open" color="#922877" :options="entityFilterOptions"
          :modelValue="filters.entity" @update:modelValue="filters.entity = $event" />
        <DateFilter txt="De" icon="fi fi-rs-calendar" color="#922877"
          :modelValue="filters.date_from" @update:modelValue="filters.date_from = $event" />
        <DateFilter txt="Até" icon="fi fi-rs-calendar" color="#922877"
          :modelValue="filters.date_to" @update:modelValue="filters.date_to = $event" />
        <CleanFilter v-if="hasFilters" @click="clearFilters" />
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Total de registos" :data="pagination.total" />
      </div>

      <div class="table">
        <div v-if="loading" class="loaderWrapper">
          <div class="loader"></div>
        </div>

        <div v-else-if="loadError" class="errorBox">
          <i class="fi fi-sr-exclamation errorIcon"></i>
          <Text txt="Não foi possível carregar o histórico" color="922877" weight="600" size="20px" />
          <p class="errorText">{{ loadError }}</p>
          <button class="retryBtn" @click="fetchData()">Voltar a tentar</button>
        </div>

        <div v-else-if="logs.length === 0" class="emptyState">
          <i class="fi fi-sr-folder-open emptyIcon"></i>
          <Text txt="Nenhum registo encontrado" color="922877" weight="600" size="22px" />
          <p class="emptyText">
            {{ hasFilters ? 'Nenhuma alteração corresponde a estes filtros.' : 'Ainda não há alterações registadas.' }}
          </p>
        </div>

        <template v-else>
          <div class="tableScroll">
            <table>
              <thead>
                <tr>
                  <th>Acção</th>
                  <th>Entidade</th>
                  <th>ID</th>
                  <th>Utilizador</th>
                  <th>IP</th>
                  <th>Data</th>
                  <th>Detalhe</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in logs" :key="log.id" @click="openDetail(log)">
                  <td data-label="Acção">
                    <span class="badge" :class="`badge--${log.action}`">{{ actionLabel(log.action) }}</span>
                  </td>
                  <td data-label="Entidade">{{ entityLabel(log.entity) }}</td>
                  <td data-label="ID">{{ log.entity_id }}</td>
                  <td data-label="Utilizador">{{ log.performed_by?.name ?? 'Sistema' }}</td>
                  <td data-label="IP">{{ log.ip_address ?? '—' }}</td>
                  <td data-label="Data">{{ formatDateTime(log.created_at) }}</td>
                  <td data-label="Detalhe">
                    <i class="fi fi-sr-eye eyeIcon" @click.stop="openDetail(log)"></i>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <Pagination :pagination="pagination" @change="goToPage" />
        </template>
      </div>
    </div>
  </div>

  <AuditLogDetailModal
    v-if="selectedLog"
    :log="selectedLog"
    @close="selectedLog = null"
  />
</template>

<style scoped>
.logsWrapper {
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
  gap: 12px;
  flex-shrink: 0;
}

.filterData {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin-top: 40px;
}

.subtitle {
  font-size: 14px;
  color: #777;
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

.tableScroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #999;
  font-weight: 600;
  padding: 0 12px 12px 0;
  white-space: nowrap;
}

td {
  padding: 14px 12px 14px 0;
  font-size: 13.5px;
  color: #221F20;
  border-top: 1px solid #f4f4f4;
  white-space: nowrap;
}

tbody tr {
  cursor: pointer;
  transition: background 0.15s;
}

tbody tr:hover {
  background: #FAFAFA;
}

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge--created { background: #E7F5EC; color: #1E7C43; }
.badge--updated { background: #FDF6E7; color: #B9770E; }
.badge--deleted { background: #FDECEA; color: #C0392B; }

.eyeIcon {
  color: #922877;
  cursor: pointer;
  font-size: 15px;
}

.loaderWrapper,
.emptyState,
.errorBox {
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

.errorIcon {
  font-size: 40px;
  color: #e74c3c;
  opacity: 0.6;
}

.emptyText,
.errorText {
  font-size: 14px;
  color: #999;
  text-align: center;
  max-width: 420px;
}

.retryBtn {
  margin-top: 4px;
  height: 40px;
  padding: 0 20px;
  border-radius: 8px;
  border: none;
  background: #922877;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.retryBtn:hover {
  opacity: 0.88;
}

@media (max-width: 767px) {
  .filterData { margin-top: 20px; }
  .filtersRow { margin-top: 12px; }
  .Statistcss { margin-top: 20px; }

  .table {
    margin-top: 20px;
    padding: 16px;
  }

  .loaderWrapper,
  .emptyState,
  .errorBox {
    height: 240px;
  }

  thead { display: none; }

  tbody tr {
    display: block;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 10px;
  }

  td {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border: none;
    padding: 5px 0;
    white-space: normal;
  }

  td::before {
    content: attr(data-label);
    font-size: 11px;
    text-transform: uppercase;
    color: #999;
    font-weight: 600;
  }
}
</style>
