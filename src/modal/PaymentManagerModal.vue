<script setup>
import { ref, onMounted } from 'vue'
import { useBookingStore } from '../stores/bookingStore'
import { useInvoiceStore } from '../stores/invoiceStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import Badge from '../components/Badge.vue'

const props = defineProps({
  booking: { type: Object, required: true },
})

const emit = defineEmits(['close'])

const bookingStore = useBookingStore()
const invoiceStore = useInvoiceStore()
const { showToast } = useToast()

const bookingStatus = ref(props.booking.status)
const invoice = ref(props.booking.invoice ? { ...props.booking.invoice } : null)
const changed = ref(false)

const paymentMethodOptions = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'transfer_mz', label: 'Transferência (MZ)' },
  { value: 'transfer_za', label: 'Transferência (ZA)' },
  { value: 'card', label: 'Cartão' },
  { value: 'pos', label: 'POS' },
  { value: 'deposit', label: 'Depósito' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'emola', label: 'E-Mola' },
]

const currencyOptions = [
  { value: 'MZN', label: 'MZN' },
  { value: 'ZAR', label: 'ZAR' },
]

// --- Bilhete: confirmar / cancelar / desconto ---
const confirmPaymentMethod = ref('')
const confirmError = ref('')
const isConfirming = ref(false)

const showCancelForm = ref(false)
const cancelForm = ref({ notes: '' })
const cancelError = ref('')
const isCancelling = ref(false)

const showDiscountForm = ref(false)
const discountForm = ref({
  amount: invoice.value?.discount_amount ?? 0,
  reason: invoice.value?.discount_reason ?? '',
})
const isSavingDiscount = ref(false)

async function handleConfirm() {
  confirmError.value = ''
  if (!confirmPaymentMethod.value) {
    confirmError.value = 'Seleccione o método de pagamento.'
    return
  }

  isConfirming.value = true

  try {
    const res = await bookingStore.confirmBooking(props.booking.id, { payment_method: confirmPaymentMethod.value })
    bookingStatus.value = res.data.status
    invoice.value = res.data.invoice
    changed.value = true
    showToast('success', 'Reserva confirmada com sucesso.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isConfirming.value = false
  }
}

async function handleCancelBooking() {
  cancelError.value = ''
  if (!cancelForm.value.notes.trim()) {
    cancelError.value = 'O motivo do cancelamento é obrigatório.'
    return
  }

  isCancelling.value = true

  try {
    const res = await bookingStore.cancelBooking(props.booking.id, cancelForm.value.notes)
    bookingStatus.value = res.data.status
    invoice.value = res.data.invoice
    changed.value = true
    showCancelForm.value = false
    cancelForm.value.notes = ''
    showToast('success', 'Reserva cancelada com sucesso.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isCancelling.value = false
  }
}

async function handleSaveDiscount() {
  isSavingDiscount.value = true

  try {
    const res = await bookingStore.updateBookingPayment(props.booking.id, {
      discount_amount: discountForm.value.amount || 0,
      discount_reason: discountForm.value.reason || null,
    })
    invoice.value = res.data.invoice
    changed.value = true
    showDiscountForm.value = false
    showToast('success', 'Desconto guardado com sucesso.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSavingDiscount.value = false
  }
}

// --- Bagagens ---
const packages = ref([])
const loadingPackages = ref(false)
const showAddPackageForm = ref(false)
const packageForm = ref({ description: '', amount: null, currency: 'MZN', payment_method: '' })
const packageError = ref('')
const isAddingPackage = ref(false)
const packageActionId = ref(null)

async function fetchPackages() {
  loadingPackages.value = true
  try {
    const res = await bookingStore.fetchPackages(props.booking.id)
    packages.value = res.data
  } finally {
    loadingPackages.value = false
  }
}

async function handleAddPackage() {
  packageError.value = ''
  if (!packageForm.value.description.trim()) {
    packageError.value = 'A descrição é obrigatória.'
    return
  }
  if (!packageForm.value.amount || Number(packageForm.value.amount) <= 0) {
    packageError.value = 'O preço tem de ser maior que zero.'
    return
  }

  isAddingPackage.value = true

  try {
    const res = await bookingStore.createPackage(props.booking.id, {
      description: packageForm.value.description,
      amount: packageForm.value.amount,
      currency: packageForm.value.currency,
      payment_method: packageForm.value.payment_method || null,
    })
    packages.value.unshift(res.data)
    changed.value = true
    showAddPackageForm.value = false
    packageForm.value = { description: '', amount: null, currency: 'MZN', payment_method: '' }
    showToast('success', 'Bagagem adicionada com sucesso.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isAddingPackage.value = false
  }
}

async function handlePayPackage(pkg) {
  packageActionId.value = pkg.id

  try {
    const res = await invoiceStore.confirmInvoice(pkg.id)
    const index = packages.value.findIndex((p) => p.id === pkg.id)
    if (index !== -1) packages.value[index] = res.data
    changed.value = true
    showToast('success', 'Bagagem marcada como paga.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    packageActionId.value = null
  }
}

async function handleCancelPackage(pkg) {
  packageActionId.value = pkg.id

  try {
    const res = await invoiceStore.cancelInvoice(pkg.id)
    const index = packages.value.findIndex((p) => p.id === pkg.id)
    if (index !== -1) packages.value[index] = res.data
    changed.value = true
    showToast('success', 'Bagagem cancelada.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    packageActionId.value = null
  }
}

function handleClose() {
  emit('close', changed.value)
}

onMounted(() => {
  fetchPackages()
})
</script>

<template>
  <Transition name="overlay">
    <div class="drawerOverlay">
      <Transition name="drawer" appear>
        <div class="drawerCard">
          <div class="drawerHeader">
            <span class="drawerTitle">Gerir pagamentos</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="drawerBody">
            <div class="section">
              <div class="sectionHeader">
                <span class="sectionTitle">Bilhete</span>
                <Badge v-if="invoice" :status="invoice.status" />
              </div>

              <div v-if="invoice" class="amountGrid">
                <div class="amountItem">
                  <span class="amountLabel">Subtotal</span>
                  <span class="amountValue">{{ invoice.subtotal_amount }} {{ invoice.currency }}</span>
                </div>
                <div class="amountItem">
                  <span class="amountLabel">Desconto</span>
                  <span class="amountValue">-{{ invoice.discount_amount }} {{ invoice.currency }}</span>
                </div>
                <div class="amountItem total">
                  <span class="amountLabel">Total</span>
                  <span class="amountValue">{{ invoice.total_amount }} {{ invoice.currency }}</span>
                </div>
              </div>

              <template v-if="invoice?.status === 'pending'">
                <template v-if="!showDiscountForm">
                  <button class="actionBtn secondaryBtn" @click="showDiscountForm = true">
                    <i class="fi fi-rs-badge-percent" />
                    Conceder desconto
                  </button>
                </template>

                <template v-else>
                  <div class="fieldGroup">
                    <label class="fieldLabel">Desconto</label>
                    <input class="textInput" type="number" min="0" step="0.01" v-model.number="discountForm.amount" />
                  </div>
                  <div class="fieldGroup">
                    <label class="fieldLabel">Motivo do desconto</label>
                    <input class="textInput" type="text" v-model="discountForm.reason" placeholder="Opcional" />
                  </div>
                  <div class="cancelActions">
                    <button class="btnSecondary" @click="showDiscountForm = false">Voltar</button>
                    <button class="actionBtn secondaryBtn" :disabled="isSavingDiscount" @click="handleSaveDiscount">
                      {{ isSavingDiscount ? 'A guardar...' : 'Guardar desconto' }}
                    </button>
                  </div>
                </template>
              </template>

              <template v-if="bookingStatus === 'pending'">
                <div class="fieldGroup">
                  <label class="fieldLabel">Método de pagamento na confirmação</label>
                  <select class="selectInput" v-model="confirmPaymentMethod">
                    <option value="" disabled>Seleccione...</option>
                    <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                  <span v-if="confirmError" class="fieldError">{{ confirmError }}</span>
                </div>
                <button class="actionBtn green" :disabled="isConfirming" @click="handleConfirm">
                  <i class="fi fi-rs-check" />
                  {{ isConfirming ? 'A confirmar...' : 'Confirmar reserva' }}
                </button>
              </template>

              <template v-if="bookingStatus !== 'cancelled'">
                <template v-if="!showCancelForm">
                  <button class="actionBtn red" @click="showCancelForm = true">
                    <i class="fi fi-rs-ban" />
                    Cancelar reserva
                  </button>
                </template>
                <template v-else>
                  <div class="fieldGroup">
                    <label class="fieldLabel">Motivo do cancelamento</label>
                    <textarea class="textareaInput" v-model="cancelForm.notes" rows="2" placeholder="Explique o motivo do cancelamento" />
                    <span v-if="cancelError" class="fieldError">{{ cancelError }}</span>
                  </div>
                  <div class="cancelActions">
                    <button class="btnSecondary" @click="showCancelForm = false; cancelForm.notes = ''; cancelError = ''">Voltar</button>
                    <button class="actionBtn red" :disabled="isCancelling" @click="handleCancelBooking">
                      {{ isCancelling ? 'A cancelar...' : 'Confirmar cancelamento' }}
                    </button>
                  </div>
                </template>
              </template>
            </div>

            <div class="divider" />

            <div class="section">
              <div class="sectionHeader">
                <span class="sectionTitle">Bagagens</span>
              </div>

              <div v-if="loadingPackages" class="stateBox">
                <div class="spinner" />
              </div>

              <template v-else>
                <div v-if="packages.length === 0" class="emptyPackages">Nenhuma bagagem registada.</div>

                <div v-else class="packageList">
                  <div v-for="pkg in packages" :key="pkg.id" class="packageRow">
                    <div class="packageInfo">
                      <span class="packageDescription">{{ pkg.description }}</span>
                      <span class="packageAmount">{{ pkg.total_amount }} {{ pkg.currency }}</span>
                    </div>
                    <div class="packageActions">
                      <Badge :status="pkg.status" />
                      <template v-if="pkg.status === 'pending'">
                        <button class="iconBtn pay" :disabled="packageActionId === pkg.id" @click="handlePayPackage(pkg)" title="Marcar como pago">
                          <i class="fi fi-rs-check" />
                        </button>
                        <button class="iconBtn cancel" :disabled="packageActionId === pkg.id" @click="handleCancelPackage(pkg)" title="Cancelar">
                          <i class="fi fi-rs-cross-small" />
                        </button>
                      </template>
                    </div>
                  </div>
                </div>

                <template v-if="!showAddPackageForm">
                  <button class="actionBtn secondaryBtn" @click="showAddPackageForm = true">
                    <i class="fi fi-rs-box" />
                    Adicionar bagagem
                  </button>
                </template>

                <template v-else>
                  <div class="fieldGroup">
                    <label class="fieldLabel">Descrição</label>
                    <input class="textInput" type="text" v-model="packageForm.description" placeholder="Ex: Bagagem em excesso" />
                  </div>
                  <div class="fieldRow">
                    <div class="fieldGroup">
                      <label class="fieldLabel">Preço</label>
                      <input class="textInput" type="number" min="0.01" step="0.01" v-model.number="packageForm.amount" />
                    </div>
                    <div class="fieldGroup">
                      <label class="fieldLabel">Moeda</label>
                      <select class="selectInput" v-model="packageForm.currency">
                        <option v-for="opt in currencyOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                      </select>
                    </div>
                  </div>
                  <div class="fieldGroup">
                    <label class="fieldLabel">Método de pagamento</label>
                    <select class="selectInput" v-model="packageForm.payment_method">
                      <option value="">Não definir</option>
                      <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <span v-if="packageError" class="fieldError">{{ packageError }}</span>
                  <div class="cancelActions">
                    <button class="btnSecondary" @click="showAddPackageForm = false; packageError = ''">Voltar</button>
                    <button class="actionBtn magenta" :disabled="isAddingPackage" @click="handleAddPackage">
                      {{ isAddingPackage ? 'A adicionar...' : 'Adicionar' }}
                    </button>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.drawerOverlay {
  position: fixed;
  inset: 0;
  z-index: 5001;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: calc(50vw + 90px);
}

.drawerCard {
  width: 100%;
  max-width: 400px;
  max-height: calc(100vh - 80px);
  background: white;
  border-radius: 10px;
  overflow: hidden;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.drawerHeader {
  background: #922877;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.drawerTitle {
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

.drawerBody {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sectionHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sectionTitle {
  font-size: 13px;
  font-weight: 700;
  color: #922877;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.divider {
  height: 1px;
  background: #f0f0f0;
}

.amountGrid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 12px;
}

.amountItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.amountItem.total {
  border-top: 1px solid #eee;
  margin-top: 4px;
  padding-top: 6px;
  font-weight: 700;
}

.amountLabel {
  color: #777;
}

.amountValue {
  color: #222;
  font-weight: 600;
}

.fieldRow {
  display: flex;
  gap: 12px;
}

.fieldRow .fieldGroup {
  flex: 1;
  min-width: 0;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fieldLabel {
  font-size: 12px;
  font-weight: 600;
  color: #555;
}

.selectInput,
.textInput {
  height: 38px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
  color: #333;
  font-family: 'Ubuntu', sans-serif;
  background: #fff;
  outline: none;
}

.textareaInput {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  color: #333;
  font-family: 'Ubuntu', sans-serif;
  background: #fff;
  outline: none;
  resize: vertical;
}

.selectInput:focus,
.textInput:focus,
.textareaInput:focus {
  border-color: #922877;
}

.fieldError {
  font-size: 11px;
  color: #e74c3c;
}

.cancelActions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.actionBtn {
  align-self: flex-start;
  height: 38px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.15s;
  color: #fff;
}

.actionBtn:hover:not(:disabled) {
  opacity: 0.88;
}

.actionBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.actionBtn.green {
  background: #8B9B1A;
}

.actionBtn.magenta {
  background: #922877;
}

.actionBtn.red {
  background: #d33939;
}

.actionBtn.secondaryBtn {
  background: #922877;
}

.btnSecondary {
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: none;
  background: #f0f0f0;
  color: #555;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btnSecondary:hover {
  background: #e0e0e0;
}

.stateBox {
  display: flex;
  justify-content: center;
  padding: 16px 0;
}

.spinner {
  width: 26px;
  height: 26px;
  border: 3px solid #f0f0f0;
  border-top-color: #922877;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.emptyPackages {
  font-size: 13px;
  color: #999;
  padding: 8px 0;
}

.packageList {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.packageRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.packageInfo {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.packageDescription {
  font-size: 13px;
  font-weight: 600;
  color: #222;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.packageAmount {
  font-size: 12px;
  color: #777;
}

.packageActions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.iconBtn {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 11px;
  transition: opacity 0.15s;
}

.iconBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.iconBtn.pay {
  background: #8B9B1A;
}

.iconBtn.cancel {
  background: #d33939;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

@media (max-width: 767px) {
  .drawerOverlay {
    padding-left: 12px;
    padding-right: 12px;
    justify-content: center;
  }

  .drawerCard {
    max-width: 100%;
    max-height: calc(100vh - 24px);
  }
}
</style>
