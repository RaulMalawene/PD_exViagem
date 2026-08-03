<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoundTripStore } from '../stores/roundTripStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'

const props = defineProps({
  roundTrip: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['close'])

const roundTripStore = useRoundTripStore()
const { showToast } = useToast()

const loading = ref(true)
const report = ref(null)
const downloadingPdf = ref(false)
const saving = ref(false)
const closing = ref(false)

const expenseLabels = {
  fuel: 'Combustível',
  adblue: 'AdBlue',
  toll: 'Portagem',
  food: 'Alimentação',
  communication: 'Comunicação',
  allowance: 'Ajudas de custos',
}

const revenueLabels = {
  passenger: 'Passageiro',
  correio: 'Correio',
  drop_off: 'Drop off',
  carga: 'Carga',
}

const outboundRouteName = computed(() => props.roundTrip.outbound_trip?.route?.name ?? 'Ida')
const returnRouteName = computed(() => props.roundTrip.return_trip?.route?.name ?? 'Volta')

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

const expenses = ref({})

function fmt(v) {
  return Number(v ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadReport() {
  loading.value = true
  try {
    const res = await roundTripStore.fetchReport(props.roundTrip.id)
    report.value = res.data

    const values = {}
    for (const key of Object.keys(expenseLabels)) {
      values[`expense_${key}_mzn`] = report.value.reconciliation.expenses[key].mzn
      values[`expense_${key}_zar`] = report.value.reconciliation.expenses[key].zar
    }
    expenses.value = values
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    loading.value = false
  }
}

async function saveExpenses(close = false) {
  const target = close ? closing : saving
  target.value = true

  try {
    const res = await roundTripStore.updateReconciliation(props.roundTrip.id, {
      ...expenses.value,
      close,
    })
    report.value = res.data
    showToast('success', close ? 'Relatório fechado com sucesso.' : 'Despesas guardadas com sucesso.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    target.value = false
  }
}

async function downloadPdf() {
  downloadingPdf.value = true
  try {
    const blob = await roundTripStore.downloadReportPdf(props.roundTrip.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `relatorio-${props.roundTrip.process_number}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    downloadingPdf.value = false
  }
}

function handleClose() {
  emit('close')
}

onMounted(loadReport)
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">Relatório — {{ roundTrip.process_number }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div v-if="loading" class="stateBox">
            <div class="spinner" />
          </div>

          <div v-else-if="report" class="modalBody">
            <div class="sectionTitle">Receitas da Viagem</div>
            <table class="reportTable">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Qtd.</th>
                  <th>MZN</th>
                  <th>ZAR</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(label, key) in revenueLabels" :key="key">
                  <tr>
                    <td>{{ label }} - {{ outboundRouteName }}</td>
                    <td>{{ report.revenue[key].outbound.count }}</td>
                    <td>{{ fmt(report.revenue[key].outbound.mzn) }}</td>
                    <td>{{ fmt(report.revenue[key].outbound.zar) }}</td>
                  </tr>
                  <tr>
                    <td>{{ label }} - {{ returnRouteName }}</td>
                    <td>{{ report.revenue[key].return.count }}</td>
                    <td>{{ fmt(report.revenue[key].return.mzn) }}</td>
                    <td>{{ fmt(report.revenue[key].return.zar) }}</td>
                  </tr>
                  <tr class="totalRow">
                    <td>Total {{ label }}</td>
                    <td>{{ report.revenue[key].total.count }}</td>
                    <td>{{ fmt(report.revenue[key].total.mzn) }}</td>
                    <td>{{ fmt(report.revenue[key].total.zar) }}</td>
                  </tr>
                </template>
                <tr class="totalRow">
                  <td>Receita Total</td>
                  <td></td>
                  <td>{{ fmt(report.revenue_total.mzn) }}</td>
                  <td>{{ fmt(report.revenue_total.zar) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="sectionTitle">Reconciliação de Pagamentos</div>
            <table class="reportTable">
              <thead>
                <tr>
                  <th>Método</th>
                  <th>MZN</th>
                  <th>ZAR</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(label, key) in paymentMethodLabels" :key="key">
                  <td>{{ label }}</td>
                  <td>{{ fmt(report.payment_methods[key].mzn) }}</td>
                  <td>{{ fmt(report.payment_methods[key].zar) }}</td>
                </tr>
                <tr class="totalRow">
                  <td>Valor Entregue</td>
                  <td>{{ fmt(report.reconciliation.valor_entregue.mzn) }}</td>
                  <td>{{ fmt(report.reconciliation.valor_entregue.zar) }}</td>
                </tr>
                <tr>
                  <td>Diferença não depositada</td>
                  <td>{{ fmt(report.reconciliation.diferenca_nao_depositada.mzn) }}</td>
                  <td>{{ fmt(report.reconciliation.diferenca_nao_depositada.zar) }}</td>
                </tr>
              </tbody>
            </table>

            <div class="sectionTitle">Despesas da Viagem</div>
            <table class="reportTable editable">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>MZN</th>
                  <th>ZAR</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(label, key) in expenseLabels" :key="key">
                  <td>{{ label }}</td>
                  <td><input type="number" class="expenseInput" v-model="expenses[`expense_${key}_mzn`]" /></td>
                  <td><input type="number" class="expenseInput" v-model="expenses[`expense_${key}_zar`]" /></td>
                </tr>
                <tr class="totalRow">
                  <td>Total das Despesas</td>
                  <td>{{ fmt(report.reconciliation.expenses_total.mzn) }}</td>
                  <td>{{ fmt(report.reconciliation.expenses_total.zar) }}</td>
                </tr>
                <tr class="totalRow">
                  <td>Trocos</td>
                  <td>{{ fmt(report.reconciliation.trocos.mzn) }}</td>
                  <td>{{ fmt(report.reconciliation.trocos.zar) }}</td>
                </tr>
              </tbody>
            </table>

            <p v-if="report.reconciliation.approved_by" class="approvedNote">
              Fechado por {{ report.reconciliation.approved_by }}
            </p>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" :disabled="downloadingPdf" @click="downloadPdf">
              {{ downloadingPdf ? 'A gerar...' : 'Exportar PDF' }}
            </button>
            <button class="btnSecondary" :disabled="saving || closing" @click="saveExpenses(false)">
              {{ saving ? 'A guardar...' : 'Guardar despesas' }}
            </button>
            <button class="btnPrimary" :disabled="saving || closing" @click="saveExpenses(true)">
              {{ closing ? 'A fechar...' : 'Fechar relatório' }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modalCard {
  width: 100%;
  max-width: 680px;
  height: min(760px, calc(100vh - 80px));
  background: white;
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modalHeader {
  background: #922877;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.modalTitle {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
}

.closeBtn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  transition: background 0.15s;
}

.closeBtn:hover {
  background: rgba(255, 255, 255, 0.28);
}

.stateBox {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f0f0f0;
  border-top-color: #922877;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modalBody {
  flex: 1;
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sectionTitle {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #922877;
  padding: 6px 10px;
  border-radius: 6px;
  margin-top: 14px;
}

.reportTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.reportTable th {
  text-align: right;
  padding: 6px 8px;
  color: #888;
  font-weight: 600;
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

.reportTable .totalRow td {
  font-weight: 700;
  background: #f7f2f6;
}

.expenseInput {
  width: 100px;
  height: 30px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  text-align: right;
}

.approvedNote {
  margin-top: 10px;
  font-size: 12px;
  color: #2a6e2a;
  font-weight: 600;
}

.modalFooter {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.btnPrimary,
.btnSecondary {
  height: 40px;
  padding: 0 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btnPrimary {
  background: #922877;
  color: white;
}

.btnPrimary:hover:not(:disabled) {
  opacity: 0.88;
}

.btnPrimary:disabled,
.btnSecondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btnSecondary {
  background: #f0f0f0;
  color: #555;
}

.btnSecondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
</style>
