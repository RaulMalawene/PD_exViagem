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
import Pagination from '../../components/Pagination.vue'
import IconText from '../../components/IconText.vue'
import DateFilter from '../../components/filters/DateFilter.vue'
import FilterDropDown from '../../components/filters/FilterDropDown.vue'
import CleanFilter from '../../components/CleanFilter.vue'
import Search from '../../components/Search.vue'

const reportStore = useReportStore()
const { financial, loading } = storeToRefs(reportStore)
const { showToast } = useToast()

const downloadingPdf = ref(false)
const downloadingExcel = ref(false)
// Fechado por omissao: as estatisticas empurravam a tabela para fora do ecra.
const breakdownsOpen = ref(false)
const filters = ref({ date_from: '', date_to: '', category: '', search: '' })
const mobileFiltersOpen = ref(false)
const hasFilters = computed(() =>
  !!(filters.value.date_from || filters.value.date_to || filters.value.category || filters.value.search)
)
const activeFilterCount = computed(() => [filters.value.date_from, filters.value.date_to, filters.value.category].filter(Boolean).length)

const categoryOptions = [
  { id: 'ticket', name: 'Bilhete' },
  { id: 'correio', name: 'Correio' },
  { id: 'drop_off', name: 'Drop off' },
  { id: 'carga', name: 'Carga' },
  { id: 'baggage', name: 'Bagagem' },
]

const paymentMethodLabels = {
  cash: 'Numerário',
  transfer_mz: 'Transferência (MZ)',
  transfer_za: 'Transferência (ZA)',
  card: 'Cartão',
  pos: 'POS',
  deposit: 'Depósito',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
}

function fmt(v) {
  return Number(v ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const categoryGroups = computed(() => financial.value.byRouteCategory ?? [])

const paymentGroups = computed(() => financial.value.byRoutePayment ?? [])

const routeRows = computed(() => {
  if (!financial.value.byRoute) return []
  return Object.values(financial.value.byRoute).filter((r) => r.count > 0)
})

const headers = ['Data de pagamento', 'Referência', 'Cliente', 'Rota', 'Tipo', 'Desconto', 'Valor Pago', 'Método', 'Processado por']

const rows = computed(() =>
  (financial.value.rows ?? []).map((r) => ({
    id: r.invoice_id,
    date: r.date !== '--' ? formatDate(r.date) : '--',
    invoice_number: r.invoice_number,
    passenger: r.passenger,
    route: r.route,
    category: r.category,
    discount: r.discount_amount > 0 ? `${fmt(r.discount_amount)} ${r.currency}` : 'N/A',
    amount: `${fmt(r.amount)} ${r.currency}`,
    method: paymentMethodLabels[r.payment_method] ?? (r.payment_method ?? '--'),
    processed_by: r.processed_by,
  }))
)

function buildParams(page = 1) {
  return {
    page,
    per_page: 7,
    ...(filters.value.date_from ? { date_from: filters.value.date_from } : {}),
    ...(filters.value.date_to ? { date_to: filters.value.date_to } : {}),
    ...(filters.value.category ? { category: filters.value.category } : {}),
    ...(filters.value.search ? { search: filters.value.search } : {}),
  }
}

async function fetchData(page = 1) {
  try {
    await reportStore.fetchFinancial(buildParams(page))
  } catch (err) {
    showToast('error', parseApiError(err))
  }
}

function goToPage(page) {
  if (page < 1 || page > financial.value.pagination.last_page) return
  fetchData(page)
}

let filterTimer = null
watch(filters, () => {
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => fetchData(1), 300)
}, { deep: true })

function clearFilters() {
  filters.value = { date_from: '', date_to: '', category: '', search: '' }
}

async function downloadPdf() {
  downloadingPdf.value = true
  try {
    const params = { ...buildParams(1) }
    delete params.page
    delete params.per_page
    const blob = await reportStore.downloadFinancialPdf(params)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'relatorio-financeiro.pdf'
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    downloadingPdf.value = false
  }
}

async function downloadExcel() {
  downloadingExcel.value = true
  try {
    const params = { ...buildParams(1) }
    delete params.page
    delete params.per_page
    const blob = await reportStore.downloadFinancialExcel(params)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'relatorio-financeiro.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    downloadingExcel.value = false
  }
}

onMounted(() => fetchData())
</script>

<template>
  <div class="reportWrapper">
    <header>
      <Text txt="Relatório Financeiro" color="221F20" weight="600" size="37px" />
      <Profile />
    </header>

    <div class="filterData">
      <div class="searchData">
        <Search txt="Pesquise por cliente ou referência da factura" :modelValue="filters.search"
          @update:modelValue="filters.search = $event" />

        <div class="Data">
          <div @click="downloadPdf">
            <IconText icon="fi fi-rs-file-pdf" :txt="downloadingPdf ? 'A gerar...' : 'Exportar PDF'"
              color="#8B9B1A" background="#922877" />
          </div>
          <div @click="downloadExcel">
            <IconText icon="fi fi-rs-file-excel" :txt="downloadingExcel ? 'A gerar...' : 'Exportar Excel'"
              color="#fff" background="#1D6F42" />
          </div>
        </div>
      </div>

      <button class="filtersToggle" @click="mobileFiltersOpen = !mobileFiltersOpen">
        <i class="fi fi-rs-filter" />
        <span>Filtros</span>
        <span v-if="activeFilterCount" class="filterBadge">{{ activeFilterCount }}</span>
        <i class="fi fi-rs-angle-small-down toggleChevron" :class="{ rotated: mobileFiltersOpen }" />
      </button>

      <div class="filtersRow" :class="{ mobileOpen: mobileFiltersOpen }">
        <div class="filters">
          <div class="dates">
            <DateFilter txt="Pago de" icon="fi fi-sr-calendar" color="#922877" v-model="filters.date_from" />
            <DateFilter txt="Pago até" icon="fi fi-sr-calendar" color="#922877" v-model="filters.date_to" />
          </div>

          <div class="dropdowns">
            <FilterDropDown txt="Tipo" icon="fi fi-rs-tags" color="#922877" :options="categoryOptions"
              v-model="filters.category" />
            <CleanFilter v-if="hasFilters" @click="clearFilters" />
          </div>
        </div>
      </div>

      <div class="Statistcss">
        <StatiscSimple title="Nº de facturas" :data="financial.total?.count" />
        <StatiscSimple title="Total MZN" :data="financial.total ? fmt(financial.total.mzn) : null" />
        <StatiscSimple title="Total ZAR" :data="financial.total ? fmt(financial.total.zar) : null" />
      </div>

      <button
        v-if="!loading && (categoryGroups.length || paymentGroups.length || routeRows.length)"
        class="breakdownsToggle"
        @click="breakdownsOpen = !breakdownsOpen"
      >
        <i class="fi fi-rs-chart-histogram" />
        <span>Estatísticas detalhadas</span>
        <i class="fi fi-rs-angle-small-down toggleChevron" :class="{ rotated: breakdownsOpen }" />
      </button>

      <div class="breakdowns" v-if="breakdownsOpen && !loading && (categoryGroups.length || paymentGroups.length || routeRows.length)">
        <div class="breakdownCard" v-if="categoryGroups.length">
          <span class="breakdownTitle">Por Tipo</span>
          <table class="reportTable">
            <thead>
              <tr>
                <th>Rota / Tipo</th>
                <th>Nº</th>
                <th>MZN</th>
                <th>ZAR</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="g in categoryGroups" :key="g.route">
                <tr class="groupRow">
                  <td colspan="4">{{ g.route }}</td>
                </tr>
                <tr v-for="c in g.rows" :key="`${g.route}-${c.label}`">
                  <td class="indented">{{ c.label }}</td>
                  <td>{{ c.count }}</td>
                  <td>{{ fmt(c.mzn) }}</td>
                  <td>{{ fmt(c.zar) }}</td>
                </tr>
                <tr class="subtotalRow">
                  <td class="indented">Subtotal</td>
                  <td>{{ g.subtotal.count }}</td>
                  <td>{{ fmt(g.subtotal.mzn) }}</td>
                  <td>{{ fmt(g.subtotal.zar) }}</td>
                </tr>
              </template>
              <tr class="totalRow">
                <td>TOTAL</td>
                <td>{{ financial.total?.count ?? 0 }}</td>
                <td>{{ fmt(financial.total?.mzn) }}</td>
                <td>{{ fmt(financial.total?.zar) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="breakdownCard" v-if="paymentGroups.length">
          <span class="breakdownTitle">Por Método de Pagamento</span>
          <table class="reportTable">
            <thead>
              <tr>
                <th>Rota / Método</th>
                <th>Nº</th>
                <th>MZN</th>
                <th>ZAR</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="g in paymentGroups" :key="g.route">
                <tr class="groupRow">
                  <td colspan="4">{{ g.route }}</td>
                </tr>
                <tr v-for="m in g.rows" :key="`${g.route}-${m.label}`">
                  <td class="indented">{{ m.label }}</td>
                  <td>{{ m.count }}</td>
                  <td>{{ fmt(m.mzn) }}</td>
                  <td>{{ fmt(m.zar) }}</td>
                </tr>
                <tr class="subtotalRow">
                  <td class="indented">Subtotal</td>
                  <td>{{ g.subtotal.count }}</td>
                  <td>{{ fmt(g.subtotal.mzn) }}</td>
                  <td>{{ fmt(g.subtotal.zar) }}</td>
                </tr>
              </template>
              <tr class="totalRow">
                <td>TOTAL</td>
                <td>{{ financial.total?.count ?? 0 }}</td>
                <td>{{ fmt(financial.total?.mzn) }}</td>
                <td>{{ fmt(financial.total?.zar) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="breakdownCard" v-if="routeRows.length">
          <span class="breakdownTitle">Por Rota</span>
          <table class="reportTable">
            <thead>
              <tr>
                <th>Rota</th>
                <th>Nº</th>
                <th>MZN</th>
                <th>ZAR</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in routeRows" :key="r.label">
                <td>{{ r.label }}</td>
                <td>{{ r.count }}</td>
                <td>{{ fmt(r.mzn) }}</td>
                <td>{{ fmt(r.zar) }}</td>
              </tr>
              <tr class="totalRow">
                <td>TOTAL</td>
                <td>{{ financial.total?.count ?? 0 }}</td>
                <td>{{ fmt(financial.total?.mzn) }}</td>
                <td>{{ fmt(financial.total?.zar) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="table">
        <div v-if="loading" class="loaderWrapper">
          <div class="loader"></div>
        </div>

        <div v-else-if="rows.length === 0" class="emptyState">
          <i class="fi fi-sr-folder-open emptyIcon"></i>
          <Text txt="Nenhuma factura encontrada" color="922877" weight="600" size="22px" />
          <p class="emptyText">Não existem facturas pagas para os filtros seleccionados.</p>
        </div>

        <template v-else>
          <TableBase :headers="headers" :rows="rows" :hide-actions="true" />

          <Pagination :pagination="financial.pagination" @change="goToPage" />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reportWrapper {
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
  align-items: flex-start;
  width: 100%;
  height: auto;
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.filtersToggle {
  display: none;
}

.breakdownsToggle {
  margin-top: 20px;
  height: 44px;
  padding: 0 18px;
  border: 1px solid #E5E5E5;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #221F20;
  transition: background 0.15s, border-color 0.15s;
  flex-shrink: 0;
  align-self: flex-start;
}

.breakdownsToggle:hover {
  background: #FAFAFA;
  border-color: #922877;
}

.breakdownsToggle > i:first-child {
  color: #922877;
}

.breakdownsToggle .toggleChevron {
  font-size: 11px;
  color: #999;
  transition: transform 0.2s;
}

.breakdownsToggle .toggleChevron.rotated {
  transform: rotate(180deg);
}

.filtersRow {
  margin-top: 16px;
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

.breakdowns {
  margin-top: 12px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  width: 100%;
  flex-shrink: 0;
}

.breakdownCard {
  flex: 1;
  min-width: 280px;
  background: white;
  border-radius: 12px;
  padding: 20px;
}

.breakdownTitle {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: #922877;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 10px;
}

.reportTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.reportTable th {
  text-align: right;
  color: #999;
  font-weight: 600;
  font-size: 11px;
  padding: 6px 8px;
  border-bottom: 1px solid #eee;
}

.reportTable th:first-child {
  text-align: left;
}

.reportTable td {
  text-align: right;
  padding: 6px 8px;
  border-bottom: 1px solid #f5f5f5;
  color: #333;
}

.reportTable td:first-child {
  text-align: left;
}

.reportTable tr.groupRow td {
  font-weight: 700;
  color: #922877;
  background: #faf6f9;
  padding-top: 10px;
}

.reportTable tr.subtotalRow td {
  font-style: italic;
  color: #777;
  border-bottom: 1px solid #e5e5e5;
}

.reportTable tr.totalRow td {
  font-weight: 700;
  color: #221F20;
  background: #f5f5f5;
  border-bottom: none;
}

.reportTable td.indented {
  padding-left: 20px;
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

@media (min-width: 1024px) and (max-width: 1279px) {
  .filterData { margin-top: 24px; }
  .Statistcss { margin-top: 20px; }
  .table { margin-top: 20px; padding: 24px; }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .table { padding: 36px; }
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
    margin-top: 8px;
  }

  .filtersRow.mobileOpen {
    display: flex;
  }

  .filters {
    flex-direction: column;
    align-items: stretch;
  }

  .dates,
  .dropdowns {
    flex-direction: column;
    width: 100%;
  }

  .dates > *,
  .dropdowns > * {
    width: 100%;
    max-width: none;
  }

  .Statistcss { margin-top: 20px; }

  .breakdowns {
    margin-top: 20px;
    flex-direction: column;
  }

  .breakdownCard {
    min-width: 0;
  }

  .table {
    margin-top: 20px;
    padding: 16px;
  }

  .loaderWrapper,
  .emptyState {
    height: 240px;
  }
}
</style>
