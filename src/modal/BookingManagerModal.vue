<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBookingStore } from '../stores/bookingStore'
import { useInvoiceStore } from '../stores/invoiceStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { formatDate } from '../utils/formatDate'
import Badge from '../components/Badge.vue'
import DataCard from '../components/DataCard.vue'

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
const activeView = ref('info')

const paymentMethodOptions = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'transfer_mz', label: 'Transferência (MZ)' },
  { value: 'transfer_za', label: 'Transferência (ZA)' },
]

const currencyOptions = [
  { value: 'MZN', label: 'MZN' },
  { value: 'ZAR', label: 'ZAR' },
]

// --- Bilhete: confirmar / cancelar / desconto ---
const confirmPaymentMethod = ref('')
const isConfirming = ref(false)

const cancelForm = ref({ notes: '' })
const cancelError = ref('')
const isCancelling = ref(false)

const discountForm = ref({
  amount: invoice.value?.discount_amount ?? 0,
  reason: invoice.value?.discount_reason ?? '',
  payment_method: invoice.value?.payment_method ?? '',
})
const isSavingDiscount = ref(false)

async function handleConfirm() {
  isConfirming.value = true

  try {
    const payload = {}
    if (confirmPaymentMethod.value) payload.payment_method = confirmPaymentMethod.value

    const res = await bookingStore.confirmBooking(props.booking.id, payload)
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
    cancelForm.value.notes = ''
    activeView.value = 'info'
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
      payment_method: discountForm.value.payment_method || null,
    })
    invoice.value = res.data.invoice
    changed.value = true
    showToast('success', 'Desconto guardado com sucesso.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSavingDiscount.value = false
  }
}

// --- Mercadorias ---
const packages = ref([])
const loadingPackages = ref(false)
const showAddPackageForm = ref(false)
const packageForm = ref({ description: '', amount: null, currency: 'MZN', payment_method: '' })
const packageError = ref('')
const isAddingPackage = ref(false)
const packageActionId = ref(null)

const packagesTotal = computed(() =>
  packages.value.reduce((sum, p) => sum + Number(p.total_amount), 0)
)

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
    showToast('success', 'Mercadoria adicionada com sucesso.')
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
    showToast('success', 'Mercadoria marcada como paga.')
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
    showToast('success', 'Mercadoria cancelada.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    packageActionId.value = null
  }
}

function handleClose() {
  emit('close', changed.value)
}

function goToPayment() {
  activeView.value = 'payment'
}

onMounted(() => {
  fetchPackages()
})
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <div class="headerLeft">
              <i class="fi fi-rs-ticket headerIcon" />
              <span class="headerTitle">{{ booking.ticket_number ?? 'Reserva' }}</span>
              <div class="headerDivider" />
              <span class="headerMeta">Assento {{ booking.seat_number ?? '--' }}</span>
            </div>
            <div class="headerRight">
              <Badge :status="bookingStatus" />
              <Badge v-if="invoice" :status="invoice.status" />
              <button class="closeBtn" @click="handleClose">
                <i class="fi fi-br-cross" />
              </button>
            </div>
          </div>

          <div class="modalBody">
            <div class="leftPanel">
              <div class="passengerBar">
                <span class="passengerLabel">Passageiro</span>
                <span class="passengerName">{{ booking.passenger?.name ?? '--' }}</span>
              </div>

              <div class="cardsGrid">
                <DataCard icon="fi fi-rs-chair" title="Assento" :value="booking.seat_number ?? '--'" />
                <DataCard icon="fi fi-rs-ticket" title="Total do bilhete" :value="invoice?.total_amount ?? '--'" :unit="invoice?.currency" />
                <DataCard icon="fi fi-rs-box" title="Mercadorias" :value="String(packages.length)" />
                <DataCard icon="fi fi-rs-sack-dollar" title="Total mercadorias" :value="packagesTotal.toFixed(2)" :unit="invoice?.currency ?? 'MZN'" />
              </div>

              <div class="viewActions">
                <button class="viewBtn" :class="{ active: activeView === 'info' }" title="Informação" @click="activeView = 'info'">
                  <i class="fi fi-rs-info" />
                </button>
                <button class="viewBtn" :class="{ active: activeView === 'payment' }" title="Pagamento" @click="activeView = 'payment'">
                  <i class="fi fi-rs-credit-card" />
                </button>
                <button class="viewBtn" :class="{ active: activeView === 'packages' }" title="Mercadorias" @click="activeView = 'packages'">
                  <i class="fi fi-rs-box" />
                </button>
                <button class="viewBtn danger" :class="{ active: activeView === 'cancel' }" title="Cancelar" @click="activeView = 'cancel'">
                  <i class="fi fi-rs-ban" />
                </button>
              </div>

              <button v-if="bookingStatus === 'pending'" class="ctaBtn" @click="goToPayment">
                <i class="fi fi-rs-check" />
                Confirmar reserva
              </button>
            </div>

            <div class="verticalDivider" />

            <div class="rightPanel">
              <Transition name="fade-slide" mode="out-in">
                <div v-if="activeView === 'info'" key="info" class="viewContent">
                  <div class="section">
                    <span class="sectionTitle">Passageiro</span>
                    <div class="infoGrid">
                      <div class="infoItem">
                        <span class="infoLabel">Nome</span>
                        <span class="infoValue">{{ booking.passenger?.name ?? '--' }}</span>
                      </div>
                      <div class="infoItem">
                        <span class="infoLabel">Passaporte</span>
                        <span class="infoValue">{{ booking.passenger?.passport_number ?? '--' }}</span>
                      </div>
                      <div class="infoItem">
                        <span class="infoLabel">Validade do passaporte</span>
                        <span class="infoValue">{{ formatDate(booking.passenger?.passport_expiry) }}</span>
                      </div>
                      <div class="infoItem">
                        <span class="infoLabel">Telefone</span>
                        <span class="infoValue">{{ booking.passenger?.phone ?? '--' }}</span>
                      </div>
                      <div class="infoItem">
                        <span class="infoLabel">Contacto de emergência</span>
                        <span class="infoValue">{{ booking.passenger?.emergency_contact_phone ?? '--' }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="section">
                    <span class="sectionTitle">Viagem</span>
                    <div class="infoGrid">
                      <div class="infoItem">
                        <span class="infoLabel">Rota</span>
                        <span class="infoValue">{{ booking.trip?.route?.name ?? '--' }}</span>
                      </div>
                      <div class="infoItem">
                        <span class="infoLabel">Data</span>
                        <span class="infoValue">{{ formatDate(booking.trip?.departure_date) }}</span>
                      </div>
                      <div class="infoItem">
                        <span class="infoLabel">Hora de partida</span>
                        <span class="infoValue">{{ booking.trip?.departure_time ?? '--' }}</span>
                      </div>
                      <div class="infoItem">
                        <span class="infoLabel">Ponto de embarque</span>
                        <span class="infoValue">
                          {{ booking.boarding_stop ? `${booking.boarding_stop.name} · ${booking.boarding_stop.boarding_time}` : '--' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div v-if="booking.notes" class="section">
                    <span class="sectionTitle">Notas</span>
                    <p class="notesText">{{ booking.notes }}</p>
                  </div>
                </div>

                <div v-else-if="activeView === 'payment'" key="payment" class="viewContent">
                  <div class="section">
                    <span class="sectionTitle">Bilhete</span>

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
                      <div class="fieldRow">
                        <div class="fieldGroup">
                          <label class="fieldLabel">Desconto</label>
                          <input class="textInput" type="number" min="0" step="0.01" v-model.number="discountForm.amount" />
                        </div>
                        <div class="fieldGroup">
                          <label class="fieldLabel">Motivo do desconto</label>
                          <input class="textInput" type="text" v-model="discountForm.reason" placeholder="Opcional" />
                        </div>
                      </div>
                      <div class="fieldGroup">
                        <label class="fieldLabel">Método de pagamento</label>
                        <select class="selectInput" v-model="discountForm.payment_method">
                          <option value="">Não definir</option>
                          <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                        </select>
                      </div>
                      <button class="actionBtn secondaryBtn" :disabled="isSavingDiscount" @click="handleSaveDiscount">
                        {{ isSavingDiscount ? 'A guardar...' : 'Guardar desconto' }}
                      </button>
                    </template>

                    <template v-if="bookingStatus === 'pending'">
                      <div class="divider" />
                      <div class="fieldGroup">
                        <label class="fieldLabel">Método de pagamento na confirmação</label>
                        <select class="selectInput" v-model="confirmPaymentMethod">
                          <option value="">Não definir</option>
                          <option v-for="opt in paymentMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                        </select>
                      </div>
                      <button class="actionBtn green" :disabled="isConfirming" @click="handleConfirm">
                        <i class="fi fi-rs-check" />
                        {{ isConfirming ? 'A confirmar...' : 'Confirmar reserva' }}
                      </button>
                    </template>
                  </div>
                </div>

                <div v-else-if="activeView === 'packages'" key="packages" class="viewContent">
                  <div class="section">
                    <span class="sectionTitle">Mercadorias</span>

                    <div v-if="loadingPackages" class="stateBox">
                      <div class="spinner" />
                    </div>

                    <template v-else>
                      <div v-if="packages.length === 0" class="emptyPackages">Nenhuma mercadoria registada.</div>

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
                          Adicionar mercadoria
                        </button>
                      </template>

                      <template v-else>
                        <div class="fieldGroup">
                          <label class="fieldLabel">Descrição</label>
                          <input class="textInput" type="text" v-model="packageForm.description" placeholder="Ex: Bagagem em excesso, caixa de mercadoria" />
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

                <div v-else-if="activeView === 'cancel'" key="cancel" class="viewContent">
                  <div class="section">
                    <span class="sectionTitle">Cancelar reserva</span>

                    <p v-if="bookingStatus === 'cancelled'" class="notesText">Esta reserva já está cancelada.</p>

                    <template v-else>
                      <div class="fieldGroup">
                        <label class="fieldLabel">Motivo do cancelamento</label>
                        <textarea class="textareaInput" v-model="cancelForm.notes" rows="3" placeholder="Explique o motivo do cancelamento" />
                        <span v-if="cancelError" class="fieldError">{{ cancelError }}</span>
                      </div>
                      <button class="actionBtn red" :disabled="isCancelling" @click="handleCancelBooking">
                        <i class="fi fi-rs-ban" />
                        {{ isCancelling ? 'A cancelar...' : 'Confirmar cancelamento' }}
                      </button>
                    </template>
                  </div>
                </div>
              </Transition>
            </div>
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
  max-width: 960px;
  max-height: calc(100vh - 80px);
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
  gap: 16px;
  flex-shrink: 0;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.headerIcon {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  flex-shrink: 0;
  position: relative;
  top: 1px;
}

.headerTitle {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.headerMeta {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  white-space: nowrap;
}

.headerDivider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}

.headerRight {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
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
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.leftPanel {
  width: 38%;
  flex-shrink: 0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

.passengerBar {
  height: 44px;
  background: #922877;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 14px;
  gap: 1px;
}

.passengerLabel {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.passengerName {
  font-size: 14px;
  color: #fff;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cardsGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.viewActions {
  display: flex;
  gap: 8px;
}

.viewBtn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  background: rgba(146, 40, 119, 0.08);
  color: #922877;
  transition: all 0.18s ease;
}

.viewBtn:hover {
  background: rgba(146, 40, 119, 0.18);
}

.viewBtn.active {
  background: #922877;
  color: #fff;
}

.viewBtn.danger {
  background: rgba(211, 57, 57, 0.08);
  color: #d33939;
}

.viewBtn.danger:hover {
  background: rgba(211, 57, 57, 0.18);
}

.viewBtn.danger.active {
  background: #d33939;
  color: #fff;
}

.ctaBtn {
  margin-top: auto;
  height: 44px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: linear-gradient(135deg, #922877, #b32d90);
  box-shadow: 0 4px 14px rgba(146, 40, 119, 0.25);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.ctaBtn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(146, 40, 119, 0.35);
}

.verticalDivider {
  width: 1px;
  background: #e8e8e8;
  flex-shrink: 0;
  align-self: stretch;
}

.rightPanel {
  flex: 1;
  min-width: 0;
  padding: 24px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #e0e0e0 transparent;
}

.viewContent {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sectionTitle {
  font-size: 13px;
  font-weight: 700;
  color: #922877;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.infoGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.infoItem {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.infoLabel {
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.infoValue {
  font-size: 14px;
  color: #222;
  font-weight: 500;
}

.notesText {
  font-size: 13px;
  color: #555;
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 12px;
}

.amountGrid {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fafafa;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 4px;
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

.divider {
  height: 1px;
  background: #f0f0f0;
  margin: 4px 0;
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

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}
</style>
