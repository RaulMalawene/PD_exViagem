<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useReportStore } from '../../stores/reportStore'
import { useToast } from '../../composables/useToast'
import { parseApiError } from '../../utils/parseApiError'
import { formatDate } from '../../utils/formatDate'

import Text from '../../components/Text.vue'
import Profile from '../../components/Profile.vue'
import StatiscSimple from '../../components/StatiscSimple.vue'
import TableBase from '../../components/TableBase.vue'
import IconText from '../../components/IconText.vue'
import DateFilter from '../../components/filters/DateFilter.vue'
import CleanFilter from '../../components/CleanFilter.vue'

const reportStore = useReportStore()
const { discounts, loading } = storeToRefs(reportStore)
const { showToast } = useToast()

const downloadingPdf = ref(false)
const filters = ref({ date_from: '', date_to: '' })
const hasFilters = computed(() => !!(filters.value.date_from || filters.value.date_to))

function fmt(v) {
  return Number(v ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const headers = ['Data', 'Passageiro', 'Tipo', 'Valor', 'Motivo', 'Aplicado por']

const rows = computed(() =>
  (discounts.value.rows ?? []).map((d) => ({
    id: d.invoice_id,
    date: d.date !== '--' ? formatDate(d.date) : '--',
    passenger: d.passenger,
    type: d.type,
    amount: `${fmt(d.discount_amount)} ${d.currency}`,
    reason: d.reason,
    applied_by: d.applied_by,
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 15,
    ...(filters.value.date_from ? { date_from: filters.value.date_from } : {}),
    ...(filters.value.date_to ? { date_to: filters.value.date_to } : {}),
  }
}

async function fetchData(page = 1) {
  try {
    await reportStore.fetchDiscounts(buildParams(page))
  } catch (err) {
    showToast('error', parseApiError(err))
  }
}

function goToPage(page) {
  if (page < 1 || page > discounts.value.pagination.last_page) return
  fetchData(page)
}

const pageNumbers = computed(() => {
  const current = discounts.value.pagination.current_page
  const last = discounts.value.pagination.last_page
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)

  const range = []
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)

  if (start > 1) { range.push(1); if (start > 2) range.push('...') }
  for (let i = start; i <= end; i++) range.push(i)
  if (end < last) { if (end < last - 1) range.push('...'); range.push(last) }

  return range
})

let filterTimer = null
watch(filters, () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => fetchData(1), 300)
}, { deep: true })

function clearFilters() {
  filters.value = { date_from: '', date_to: '' }
}

async function downloadPdf() {
  downloadingPdf.value = true
  try {
    const params = { ...buildParams(1) }
    delete params.page
    delete params.per_page
    const blob = await reportStore.downloadDiscountsPdf(params)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'relatorio-descontos.pdf'
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    downloadingPdf.value = false
  }
}

onMounted(() => fetchData())
</script>

<template>
  <div class="reportWrapper">
    <header>
      <Text txt="Descontos Aplicados" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <div class="filters">
          <div class="dates">
            <DateFilter txt="De" icon="fi fi-sr-calendar" color="#922877" v-model="filters.date_from" />
            <DateFilter txt="Até" icon="fi fi-sr-calendar" color="#922877" v-model="filters.date_to" />
          </div>

          <div class="dropdowns">
            <CleanFilter v-if="hasFilters" @click="clearFilters" />
          </div>
        </div>

        <div class="Data">
          <div @click="downloadPdf">
            <IconText icon="fi fi-rs-file-pdf" :txt="downloadingPdf ? 'A gerar...' : 'Exportar PDF'"
              color="#8B9B1A" background="#922877" />
          </div>
        </div>
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Nº de descontos" :data="discounts.summary?.count" />
        <StatiscSimple title="Total MZN" :data="discounts.summary ? fmt(discounts.summary.total_mzn) : null" />
        <StatiscSimple title="Total ZAR" :data="discounts.summary ? fmt(discounts.summary.total_zar) : null" />
      </div>

      <div class="table">
        <div v-if="loading" class="loaderWrapper">
          <div class="loader"></div>
        </div>

        <div v-else-if="rows.length === 0" class="emptyState">
          <i class="fi fi-sr-folder-open emptyIcon"></i>
          <Text txt="Nenhum desconto encontrado" color="922877" weight="600" size="22px" />
          <p class="emptyText">Não existem descontos para os filtros seleccionados.</p>
        </div>

        <template v-else>
          <TableBase :headers="headers" :rows="rows" :hide-actions="true" />

          <div class="pagination" v-if="discounts.pagination.last_page > 1">
            <button class="pageBtn" :disabled="discounts.pagination.current_page === 1"
              @click="goToPage(discounts.pagination.current_page - 1)">
              <i class="fi fi-sr-angle-left" />
            </button>

            <template v-for="(page, i) in pageNumbers" :key="i">
              <span v-if="page === '...'" class="pageEllipsis">&hellip;</span>
              <button v-else class="pageNumBtn" :class="{ active: page === discounts.pagination.current_page }"
                @click="goToPage(page)">
                {{ page }}
              </button>
            </template>

            <button class="pageBtn" :disabled="discounts.pagination.current_page === discounts.pagination.last_page"
              @click="goToPage(discounts.pagination.current_page + 1)">
              <i class="fi fi-sr-angle-right" />
            </button>

            <span class="pageInfo">{{ discounts.pagination.total }} descontos</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reportWrapper {
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
  align-items: flex-start;
  width: 100%;
  height: auto;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
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

@media (min-width: 1024px) and (max-width: 1279px) {
  .filterData { margin-top: 24px; }
  .Statistcss { margin-top: 20px; }
  .table { margin-top: 20px; padding: 24px; }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .table { padding: 36px; }
}
</style>
