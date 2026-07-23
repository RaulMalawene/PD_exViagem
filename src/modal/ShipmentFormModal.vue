<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useShipmentStore } from '../stores/shipmentStore'
import { useTripStore } from '../stores/tripStore'
import { useRouteStore } from '../stores/routeStore'
import { useInvoiceStore } from '../stores/invoiceStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { formatDate } from '../utils/formatDate'
import { routeAbbr } from '../utils/routeAbbr'
import BaseInput from '../components/BaseInput.vue'
import InputDropDown from '../components/InputDropDown.vue'
import Badge from '../components/Badge.vue'

const props = defineProps({
  shipment: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const shipmentStore = useShipmentStore()
const tripStore = useTripStore()
const routeStore = useRouteStore()
const invoiceStore = useInvoiceStore()
const { trips } = storeToRefs(tripStore)
const { routes } = storeToRefs(routeStore)
const { showToast } = useToast()

const selectedRouteId = ref(props.shipment?.trip?.route?.id ?? '')

const localShipment = ref(props.shipment)
const invoice = ref(props.shipment?.invoice ?? null)
const changed = ref(false)
const isPaymentActionLoading = ref(false)

const isLocked = computed(() => invoice.value?.status === 'paid')

const typeOptions = [
  { value: 'correio', label: 'Correio' },
  { value: 'drop_off', label: 'Drop off' },
  { value: 'carga', label: 'Carga' },
]

const statusOptions = [
  { value: 'pending_docs', label: 'Pendente de documentos' },
  { value: 'cleared', label: 'Documentação regularizada' },
  { value: 'on_trip', label: 'Em trânsito' },
  { value: 'ready_for_pickup', label: 'Pronto para levantamento' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
]

const paymentMethodOptions = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'pos', label: 'POS' },
  { value: 'deposit', label: 'Depósito' },
  { value: 'transfer_mz', label: 'Transferência (MZ)' },
  { value: 'transfer_za', label: 'Transferência (ZA)' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'emola', label: 'E-Mola' },
]

const form = ref({
  type: props.shipment?.type ?? 'correio',
  trip_id: props.shipment?.trip?.id ?? '',
  origin_company: props.shipment?.origin_company ?? '',
  sender_name: props.shipment?.sender_name ?? '',
  sender_phone: props.shipment?.sender_phone ?? '',
  receiver_name: props.shipment?.receiver_name ?? '',
  receiver_phone: props.shipment?.receiver_phone ?? '',
  description: props.shipment?.description ?? '',
  declared_value: props.shipment?.declared_value ?? '',
  weight_kg: props.shipment?.weight_kg ?? '',
  customs_reference: props.shipment?.customs_reference ?? '',
  total_fees: props.shipment?.total_fees ?? '',
  currency: props.shipment?.currency ?? 'MZN',
  payment_method: 'cash',
  status: props.shipment?.status ?? 'pending_docs',
})

const errorText = ref('')
const isSaving = ref(false)
const attachmentFile = ref(null)
const attachmentUrl = ref(props.shipment?.attachment_url ?? null)

function handleAttachmentChange(event) {
  attachmentFile.value = event.target.files[0] ?? null
}

const routeOptions = computed(() => routes.value.map((r) => ({ id: r.id, name: routeAbbr(r) })))

const tripOptions = computed(() => [
  { id: '', name: 'Sem viagem atribuída' },
  ...trips.value
    .filter((t) => !['cancelled', 'completed'].includes(t.status))
    .filter((t) => !selectedRouteId.value || String(t.route?.id) === String(selectedRouteId.value))
    .map((t) => ({
      id: t.id,
      name: `${routeAbbr(t.route)} · ${formatDate(t.departure_date)} · ${(t.departure_time ?? '').slice(0, 5)}`,
    })),
])

function handleRouteChange(routeId) {
  selectedRouteId.value = routeId
  form.value.trip_id = ''
}

function validate() {
  errorText.value = ''

  if (!form.value.sender_name.trim() || !form.value.sender_phone.trim()) {
    errorText.value = 'Preencha o nome e telefone do remetente.'
    return false
  }
  if (!form.value.receiver_name.trim() || !form.value.receiver_phone.trim()) {
    errorText.value = 'Preencha o nome e telefone do destinatário.'
    return false
  }
  if (!form.value.description.trim()) {
    errorText.value = 'A descrição é obrigatória.'
    return false
  }
  if (form.value.declared_value === '' || form.value.weight_kg === '' || form.value.total_fees === '') {
    errorText.value = 'Preencha o valor declarado, o peso e a taxa cobrada.'
    return false
  }

  return true
}

async function handleSave() {
  if (!validate()) return
  isSaving.value = true

  try {
    const payload = {
      type: form.value.type,
      trip_id: form.value.trip_id || null,
      origin_company: form.value.type === 'drop_off' ? (form.value.origin_company || null) : null,
      sender_name: form.value.sender_name.trim(),
      sender_phone: form.value.sender_phone.trim(),
      receiver_name: form.value.receiver_name.trim(),
      receiver_phone: form.value.receiver_phone.trim(),
      description: form.value.description.trim(),
      declared_value: Number(form.value.declared_value),
      weight_kg: Number(form.value.weight_kg),
      customs_reference: form.value.customs_reference || null,
      total_fees: Number(form.value.total_fees),
      currency: form.value.currency,
    }

    if (localShipment.value) {
      payload.status = form.value.status
      const res = await shipmentStore.updateShipment(localShipment.value.id, payload)
      localShipment.value = res.data
      invoice.value = res.data.invoice
      changed.value = true
      showToast('success', 'Alterações salvas com sucesso.')
    } else {
      payload.payment_method = form.value.payment_method
      const res = await shipmentStore.createShipment(payload)
      localShipment.value = res.data
      invoice.value = res.data.invoice
      changed.value = true
      showToast('success', 'Mercadoria registada com sucesso.')
    }

    if (form.value.type === 'carga' && attachmentFile.value) {
      try {
        const res = await shipmentStore.uploadAttachment(localShipment.value.id, attachmentFile.value)
        localShipment.value = res.data
        attachmentUrl.value = res.data.attachment_url
        attachmentFile.value = null
      } catch (err) {
        showToast('error', `Mercadoria guardada, mas falhou o envio do anexo: ${parseApiError(err)}`)
        return
      }
    }

    emit('close', true)
  } catch (err) {
    errorText.value = parseApiError(err)
    showToast('error', errorText.value)
  } finally {
    isSaving.value = false
  }
}

async function handleConfirmPayment() {
  if (!invoice.value) return
  isPaymentActionLoading.value = true

  try {
    const res = await invoiceStore.confirmInvoice(invoice.value.id)
    invoice.value = res.data
    changed.value = true
    showToast('success', 'Mercadoria marcada como paga.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isPaymentActionLoading.value = false
  }
}

async function handleCancelPayment() {
  if (!invoice.value) return
  isPaymentActionLoading.value = true

  try {
    const res = await invoiceStore.cancelInvoice(invoice.value.id)
    invoice.value = res.data
    changed.value = true
    showToast('success', 'Invoice da mercadoria cancelada.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isPaymentActionLoading.value = false
  }
}

function handleClose() {
  emit('close', changed.value)
}

onMounted(() => {
  tripStore.fetchTrips({ per_page: 100 })
  routeStore.fetchRoutes({ per_page: 100 })
})
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">{{ props.shipment ? 'Editar mercadoria' : 'Nova Mercadoria' }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="fieldGroup">
              <label class="fieldLabel">Tipo</label>
              <div class="typeTabs">
                <button
                  v-for="t in typeOptions"
                  :key="t.value"
                  type="button"
                  class="typeTab"
                  :class="{ active: form.type === t.value }"
                  :disabled="isLocked"
                  @click="form.type = t.value"
                >
                  {{ t.label }}
                </button>
              </div>
            </div>

            <template v-if="isLocked">
              <div class="fieldGroup">
                <span class="fieldLabel">Viagem</span>
                <span class="readonlyValue">{{ props.shipment?.trip ? `${routeAbbr(props.shipment.trip.route)} · ${formatDate(props.shipment.trip.departure_date)}` : 'Sem viagem atribuída' }}</span>
              </div>
            </template>
            <template v-else>
              <div class="fieldGroup">
                <InputDropDown label="Rota" :modelValue="selectedRouteId" :options="routeOptions"
                  @update:modelValue="handleRouteChange" />
              </div>
              <div class="fieldGroup">
                <InputDropDown label="Viagem" :modelValue="form.trip_id" :options="tripOptions"
                  @update:modelValue="form.trip_id = $event" />
              </div>
            </template>

            <div v-if="form.type === 'drop_off'" class="fieldGroup">
              <BaseInput label="Companhia de origem" :modelValue="form.origin_company"
                @update:modelValue="form.origin_company = $event" />
            </div>

            <span class="sectionTitle">Remetente</span>
            <div class="fieldRow">
              <div class="fieldGroup">
                <BaseInput label="Nome" :modelValue="form.sender_name" @update:modelValue="form.sender_name = $event" />
              </div>
              <div class="fieldGroup">
                <BaseInput label="Telefone" :modelValue="form.sender_phone" @update:modelValue="form.sender_phone = $event" />
              </div>
            </div>

            <span class="sectionTitle">Destinatário</span>
            <div class="fieldRow">
              <div class="fieldGroup">
                <BaseInput label="Nome" :modelValue="form.receiver_name" @update:modelValue="form.receiver_name = $event" />
              </div>
              <div class="fieldGroup">
                <BaseInput label="Telefone" :modelValue="form.receiver_phone" @update:modelValue="form.receiver_phone = $event" />
              </div>
            </div>

            <div class="fieldGroup">
              <label class="fieldLabel">Descrição</label>
              <textarea class="textarea" v-model="form.description" rows="2" />
            </div>

            <div class="fieldRow">
              <div class="fieldGroup">
                <BaseInput label="Valor declarado" type="number" :modelValue="form.declared_value"
                  @update:modelValue="form.declared_value = $event" />
              </div>
              <div class="fieldGroup">
                <BaseInput label="Peso (Kg)" type="number" :modelValue="form.weight_kg"
                  @update:modelValue="form.weight_kg = $event" />
              </div>
            </div>

            <div v-if="form.type === 'carga'" class="fieldGroup">
              <BaseInput label="Referência aduaneira" :modelValue="form.customs_reference"
                @update:modelValue="form.customs_reference = $event" />
            </div>

            <div v-if="form.type === 'carga'" class="fieldGroup">
              <label class="fieldLabel">Anexo</label>
              <a v-if="attachmentUrl && !attachmentFile" :href="attachmentUrl" target="_blank" rel="noopener" class="attachmentLink">
                <i class="fi fi-rs-file" />
                Ver anexo actual
              </a>
              <input class="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png" @change="handleAttachmentChange" />
              <span v-if="attachmentFile" class="fieldHint">Novo ficheiro seleccionado: {{ attachmentFile.name }}</span>
            </div>

            <span class="sectionTitle">Taxa</span>
            <div class="fieldRow">
              <div class="fieldGroup">
                <BaseInput label="Valor da taxa" type="number" :disabled="isLocked" :modelValue="form.total_fees"
                  @update:modelValue="form.total_fees = $event" />
              </div>
              <div class="fieldGroup">
                <label class="fieldLabel">Moeda</label>
                <select class="selectInput" v-model="form.currency" :disabled="isLocked">
                  <option value="MZN">MZN</option>
                  <option value="ZAR">ZAR</option>
                </select>
              </div>
            </div>

            <div v-if="!localShipment" class="fieldGroup">
              <label class="fieldLabel">Método de pagamento</label>
              <select class="selectInput" v-model="form.payment_method">
                <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <div v-else class="fieldGroup">
              <label class="fieldLabel">Estado</label>
              <select class="selectInput" v-model="form.status">
                <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>

            <template v-if="localShipment && invoice">
              <span class="sectionTitle">Pagamento</span>
              <div class="paymentRow">
                <div class="paymentInfo">
                  <span class="paymentAmount">{{ invoice.total_amount }} {{ invoice.currency }}</span>
                  <Badge :status="invoice.status" />
                </div>
                <div v-if="invoice.status === 'pending'" class="paymentActions">
                  <button class="btnPay" :disabled="isPaymentActionLoading" @click="handleConfirmPayment">
                    <i class="fi fi-rs-check" />
                    Marcar como paga
                  </button>
                  <button class="btnCancelInvoice" :disabled="isPaymentActionLoading" @click="handleCancelPayment">
                    <i class="fi fi-rs-cross-small" />
                    Cancelar
                  </button>
                </div>
              </div>
            </template>

            <span v-if="errorText" class="fieldError">{{ errorText }}</span>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">Cancelar</button>
            <button class="btnPrimary" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'A guardar...' : (localShipment ? 'Guardar alterações' : 'Registar mercadoria') }}
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
  max-width: 560px;
  height: min(720px, calc(100vh - 80px));
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

.modalBody {
  flex: 1;
  min-height: 0;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sectionTitle {
  font-size: 12px;
  font-weight: 700;
  color: #922877;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 4px;
}

.typeTabs {
  display: flex;
  gap: 8px;
}

.typeTab {
  flex: 1;
  height: 38px;
  border-radius: 8px;
  border: 1.5px solid #e0e0e0;
  background: #fff;
  color: #555;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.typeTab.active {
  background: #922877;
  border-color: #922877;
  color: #fff;
}

.typeTab:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.readonlyValue {
  height: 40px;
  display: flex;
  align-items: center;
  padding-left: 12px;
  background: #f0f0f0;
  border-radius: 5px;
  font-size: 15px;
  color: #666;
}

.paymentRow {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  padding: 12px;
}

.paymentInfo {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.paymentAmount {
  font-size: 15px;
  font-weight: 700;
  color: #222;
}

.paymentActions {
  display: flex;
  gap: 10px;
}

.btnPay,
.btnCancelInvoice {
  flex: 1;
  height: 38px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  transition: opacity 0.15s;
}

.btnPay {
  background: #8B9B1A;
}

.btnCancelInvoice {
  background: #d33939;
}

.btnPay:disabled,
.btnCancelInvoice:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fieldRow {
  display: flex;
  gap: 14px;
}

.fieldRow .fieldGroup {
  flex: 1;
  min-width: 0;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.fieldLabel {
  font-size: 13px;
  color: #333;
}

.fieldHint {
  font-size: 11px;
  color: #999;
}

.fileInput {
  font-size: 13px;
  color: #333;
  font-family: 'Ubuntu', sans-serif;
}

.attachmentLink {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #922877;
  font-weight: 600;
  text-decoration: none;
  width: fit-content;
}

.attachmentLink:hover {
  text-decoration: underline;
}

.textarea {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  font-family: 'Ubuntu', sans-serif;
  color: #333;
  resize: vertical;
}

.selectInput {
  height: 40px;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 13px;
  color: #333;
  font-family: 'Ubuntu', sans-serif;
  background: #fff;
  outline: none;
}

.selectInput:disabled {
  background: #f6f6f6;
  color: #888;
  cursor: not-allowed;
}

.fieldError {
  font-size: 12px;
  color: #e74c3c;
}

.modalFooter {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
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

.btnPrimary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btnSecondary {
  background: #f0f0f0;
  color: #555;
}

.btnSecondary:hover {
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
