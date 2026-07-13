<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePublicBookingStore } from '../../stores/publicBookingStore'
import { useToast } from '../../composables/useToast'
import { parseApiError } from '../../utils/parseApiError'
import { formatDate } from '../../utils/formatDate'
import BookingStepper from '../../components/BookingStepper.vue'

import mpesaIcon from '../../assets/mpesa.png'
import emolaIcon from '../../assets/emola.png'
import cardIcon from '../../assets/card.png'

const router = useRouter()
const route = useRoute()
const bookingStore = usePublicBookingStore()
const { showToast } = useToast()

const tripId = route.query.trip_id ?? bookingStore.flow.tripId
const bookings = route.query.bookings
    ? JSON.parse(route.query.bookings)
    : (bookingStore.flow.bookingGroup ?? [])

const loading = ref(true)
const tripData = ref(null)

const selectedMethod = ref('')
const selectedCurrency = ref('mzn')
const submitting = ref(false)

const cardNumber = ref('')
const cardExpiry = ref('')
const cardCvv = ref('')
const cardName = ref('')
const mobilePhone = ref('')
const emolaPhone = ref('')

const seats = computed(() => bookings.map((b) => b.seat_number).join(', '))
const passengerCount = computed(() => bookings.length)

const totalMzn = computed(() => {
    const price = Number(tripData.value?.route?.price_mzn ?? 0)
    return (price * passengerCount.value).toLocaleString('pt-PT') + ' MT'
})

const totalZar = computed(() => {
    const price = Number(tripData.value?.route?.price_zar ?? 0)
    return (price * passengerCount.value).toLocaleString('pt-PT') + ' ZAR'
})

const tripInfo = computed(() => ({
    route: tripData.value?.route?.name ?? '--',
    date: formatDate(tripData.value?.departure_date),
    time: tripData.value?.departure_time?.slice(0, 5) ?? '--',
}))

const primaryTotal = computed(() =>
    selectedMethod.value === 'card' && selectedCurrency.value === 'zar' ? totalZar.value : totalMzn.value
)
const secondaryTotal = computed(() =>
    selectedMethod.value === 'card' && selectedCurrency.value === 'zar' ? totalMzn.value : totalZar.value
)

const methods = [
    { key: 'card', label: 'Cartão de crédito', sub: 'Visa, Mastercard', icon: cardIcon },
    { key: 'mpesa', label: 'M-Pesa', sub: 'Vodacom', icon: mpesaIcon },
    { key: 'emola', label: 'E-Mola', sub: 'Movitel', icon: emolaIcon },
    { key: 'local', label: 'Pagar no local', sub: 'Pagar no dia da viagem', icon: null },
]

async function fetchTripData() {
    try {
        tripData.value = await bookingStore.fetchAvailability(tripId)
    } catch (err) {
        showToast('error', parseApiError(err))
    } finally {
        loading.value = false
    }
}

onMounted(fetchTripData)

function canSubmit() {
    if (selectedMethod.value === 'card') {
        return cardNumber.value && cardExpiry.value && cardCvv.value && cardName.value
    }
    if (selectedMethod.value === 'mpesa') return mobilePhone.value
    if (selectedMethod.value === 'emola') return emolaPhone.value
    if (selectedMethod.value === 'local') return true
    return false
}

function formatCardNumber(e) {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16)
    val = val.replace(/(.{4})/g, '$1 ').trim()
    cardNumber.value = val
}

function formatExpiry(e) {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4)
    if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2)
    cardExpiry.value = val
}

async function confirm() {
    if (!canSubmit() || submitting.value) return
    submitting.value = true
    try {
        await new Promise((r) => setTimeout(r, 800))
        bookingStore.clearFlow()
        router.push({
            path: '/booking/success',
            query: {
                bookings: JSON.stringify(bookings),
                route_name: tripData.value?.route?.name,
                date: tripData.value?.departure_date,
                time: tripData.value?.departure_time?.slice(0, 5),
            },
        })
    } finally {
        submitting.value = false
    }
}

</script>

<template>
    <div class="page">

        <!-- STEPPER -->
        <BookingStepper :current="4" />

        <!-- CONTENT -->
        <div class="content">
            <div class="inner">

                <div v-if="loading" class="stateBox">
                    <div class="spinner" />
                </div>

                <template v-else>

                <h2 class="pageTitle">Pague e garanta o seu lugar</h2>

                <!-- RESUMO DA RESERVA -->
                <div class="summaryCard">
                    <div class="summaryTop">
                        <span class="summaryLabel">Resumo da reserva</span>
                        <span class="directionBadge">Ida</span>
                    </div>
                    <div class="summaryRoute">
                        <span class="summaryRouteName">{{ tripInfo.route }}</span>
                        <span class="summaryDateTime">{{ tripInfo.date }} · {{ tripInfo.time }}</span>
                    </div>
                    <p class="summaryPassengers">
                        {{ passengerCount }} passageiro{{ passengerCount !== 1 ? 's' : '' }} · Assentos {{ seats }}
                    </p>
                    <div class="summaryDivider" />
                    <div class="summaryTotal">
                        <span class="summaryTotalLabel">Total a pagar</span>
                        <div class="summaryTotalRight">
                            <span class="totalPrimary">{{ primaryTotal }}</span>
                            <span class="totalSecondary">ou {{ secondaryTotal }}</span>
                        </div>
                    </div>
                </div>

                <!-- METODO DE PAGAMENTO -->
                <div class="sectionTitle">Escolha um método de pagamento</div>

                <div class="methodList">

                    <div v-for="m in methods" :key="m.key" class="methodCard"
                        :class="{ selected: selectedMethod === m.key }" @click="selectedMethod = m.key">
                        <!-- HEADER DO CARD -->
                        <div class="methodHeader">
                            <div class="methodRadio" :class="{ checked: selectedMethod === m.key }">
                                <div v-if="selectedMethod === m.key" class="radioInner" />
                            </div>
                            <div class="methodIconWrap">
                                <img v-if="m.icon" :src="m.icon" :alt="m.label" class="methodIcon" />
                                <i v-else class="fi fi-rs-money-bill-wave methodFallbackIcon" />
                            </div>
                            <div class="methodText">
                                <span class="methodLabel">{{ m.label }}</span>
                                <span class="methodSub">{{ m.sub }}</span>
                            </div>
                        </div>

                        <!-- CAMPOS CARTAO -->
                        <Transition name="expand">
                            <div v-if="selectedMethod === 'card' && m.key === 'card'" class="methodBody">
                                <div class="field">
                                    <label class="fieldLabel">Moeda de pagamento</label>
                                    <div class="currencyToggle">
                                        <button type="button" class="currencyBtn"
                                            :class="{ active: selectedCurrency === 'mzn' }"
                                            @click.stop="selectedCurrency = 'mzn'">Metical (MT)</button>
                                        <button type="button" class="currencyBtn"
                                            :class="{ active: selectedCurrency === 'zar' }"
                                            @click.stop="selectedCurrency = 'zar'">Rand (ZAR)</button>
                                    </div>
                                </div>
                                <div class="field">
                                    <label class="fieldLabel">Número do cartão</label>
                                    <div class="inputWrap">
                                        <input :value="cardNumber" type="text" class="input"
                                            placeholder="0000 0000 0000 0000" maxlength="19" @input="formatCardNumber"
                                            @click.stop />
                                        <i class="fi fi-rs-credit-card inputIconRight" />
                                    </div>
                                </div>
                                <div class="fieldRow">
                                    <div class="field">
                                        <label class="fieldLabel">Validade</label>
                                        <input :value="cardExpiry" type="text" class="input" placeholder="MM/AA"
                                            maxlength="5" @input="formatExpiry" @click.stop />
                                    </div>
                                    <div class="field">
                                        <label class="fieldLabel">CVV</label>
                                        <input v-model="cardCvv" type="text" class="input" placeholder="123"
                                            maxlength="4" @click.stop />
                                    </div>
                                </div>
                                <div class="field">
                                    <label class="fieldLabel">Nome no cartão</label>
                                    <input v-model="cardName" type="text" class="input" placeholder="" @click.stop />
                                </div>
                            </div>
                        </Transition>

                        <!-- CAMPOS MPESA -->
                        <Transition name="expand">
                            <div v-if="selectedMethod === 'mpesa' && m.key === 'mpesa'" class="methodBody">
                                <div class="field">
                                    <label class="fieldLabel">Número de celular</label>
                                    <div class="inputWrap">
                                        <input v-model="mobilePhone" type="tel" class="input" placeholder="84 000 0000"
                                            @click.stop />
                                        <i class="fi fi-rs-mobile inputIconRight" />
                                    </div>
                                    <p class="fieldNote">NB.: Deve ser o número de celular com o qual deseja fazer o
                                        pagamento</p>
                                </div>
                            </div>
                        </Transition>

                        <!-- CAMPOS EMOLA -->
                        <Transition name="expand">
                            <div v-if="selectedMethod === 'emola' && m.key === 'emola'" class="methodBody">
                                <div class="field">
                                    <label class="fieldLabel">Número de celular</label>
                                    <div class="inputWrap">
                                        <input v-model="emolaPhone" type="tel" class="input" placeholder="86 000 0000"
                                            @click.stop />
                                        <i class="fi fi-rs-mobile inputIconRight" />
                                    </div>
                                    <p class="fieldNote">NB.: Deve ser o número de celular com o qual deseja fazer o
                                        pagamento</p>
                                </div>
                            </div>
                        </Transition>

                    </div>

                </div>

                <!-- BOTAO -->
                <div class="bottomArea">
                    <button class="confirmBtn" :class="{ disabled: !canSubmit() || submitting }"
                        :disabled="!canSubmit() || submitting" @click="confirm">
                        <span v-if="submitting">A processar...</span>
                        <span v-else>Confirmar pagamento</span>
                    </button>
                    <div class="secureNote">
                        <i class="fi fi-rs-lock secureIcon" />
                        <span>Pagamento 100% seguro</span>
                    </div>
                </div>

                </template>

            </div>
        </div>

    </div>
</template>

<style scoped>
.page {
    min-height: 100vh;
    background: #F6F6F6;
    display: flex;
    flex-direction: column;
}

.content {
    flex: 1;
    padding: 24px 16px 48px;
}

.inner {
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.pageTitle {
    font-size: 22px;
    font-weight: 700;
    color: #221F20;
}

/* STATE */
.stateBox {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
}

.spinner {
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

/* SUMMARY */
.summaryCard {
    background: #fff;
    border-radius: 14px;
    padding: 18px 20px;
    border: 1px solid #EEEEEE;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.summaryTop {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.summaryLabel {
    font-size: 14px;
    font-weight: 600;
    color: #221F20;
}

.directionBadge {
    font-size: 12px;
    font-weight: 600;
    color: #922877;
    border: 1.5px solid #922877;
    border-radius: 50px;
    padding: 2px 12px;
}

.summaryRoute {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.summaryRouteName {
    font-size: 15px;
    font-weight: 700;
    color: #221F20;
}

.summaryDateTime {
    font-size: 13px;
    color: #888;
    flex-shrink: 0;
}

.summaryPassengers {
    font-size: 13px;
    color: #888;
}

.summaryDivider {
    height: 1px;
    background: #F0F0F0;
}

.summaryTotal {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.summaryTotalLabel {
    font-size: 14px;
    font-weight: 600;
    color: #221F20;
}

.summaryTotalRight {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
}

.totalPrimary {
    font-size: 20px;
    font-weight: 800;
    color: #922877;
}

.totalSecondary {
    font-size: 12px;
    color: #aaa;
}

/* SECTION */
.sectionTitle {
    font-size: 16px;
    font-weight: 700;
    color: #221F20;
}

/* METHODS */
.methodList {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.methodCard {
    background: #fff;
    border-radius: 12px;
    border: 1.5px solid #EEEEEE;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
}

.methodCard.selected {
    border-color: #922877;
    background: rgba(146, 40, 119, 0.03);
}

.methodHeader {
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
}

.methodRadio {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #D0D0D0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: border-color 0.2s;
}

.methodRadio.checked {
    border-color: #922877;
}

.radioInner {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #922877;
}

.methodIconWrap {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #F6F6F6;
}

.methodIcon {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.methodFallbackIcon {
    font-size: 20px;
    color: #922877;
}

.methodText {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.methodLabel {
    font-size: 15px;
    font-weight: 700;
    color: #221F20;
}

.methodSub {
    font-size: 12px;
    color: #888;
}

/* BODY */
.methodBody {
    padding: 0 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    border-top: 1px solid #F0F0F0;
}

/* FIELDS */
.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.fieldRow {
    display: flex;
    gap: 12px;
}

.fieldRow .field {
    flex: 1;
}

.fieldLabel {
    font-size: 13px;
    font-weight: 600;
    color: #221F20;
}

.inputWrap {
    position: relative;
}

.inputWrap .input {
    padding-right: 42px;
}

.input {
    width: 100%;
    height: 48px;
    border: 1.5px solid #E0E0E0;
    border-radius: 10px;
    padding: 0 14px;
    font-size: 15px;
    color: #221F20;
    font-family: 'Ubuntu', sans-serif;
    outline: none;
    transition: border-color 0.15s;
    background: #fff;
}

/* DEPOIS */
.input:focus { border-color: #0D0D2B; }

.input::placeholder {
    color: #bbb;
}

.inputIconRight {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #bbb;
    font-size: 16px;
    pointer-events: none;
}

.fieldNote {
    font-size: 11px;
    color: #aaa;
    line-height: 1.5;
}

/* CURRENCY TOGGLE */
.currencyToggle {
    display: flex;
    gap: 8px;
}

.currencyBtn {
    flex: 1;
    height: 40px;
    border: 1.5px solid #E0E0E0;
    border-radius: 8px;
    background: #fff;
    color: #221F20;
    font-size: 13px;
    font-weight: 600;
    font-family: 'Ubuntu', sans-serif;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.currencyBtn.active {
    background: #922877;
    border-color: #922877;
    color: #fff;
}

/* BOTTOM */
.bottomArea {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-top: 4px;
}

.confirmBtn {
    width: 100%;
    height: 52px;
    background: #922877;
    color: #fff;
    border: none;
    border-radius: 50px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    font-family: 'Ubuntu', sans-serif;
}

.confirmBtn:hover:not(.disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
}

.confirmBtn:active:not(.disabled) {
    transform: translateY(0);
}

.confirmBtn.disabled {
    background: #ccc;
    cursor: not-allowed;
}

.secureNote {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
    color: #aaa;
}

.secureIcon {
    font-size: 12px;
}

/* TRANSITION */
.expand-enter-active,
.expand-leave-active {
    transition: opacity 0.2s, transform 0.2s;
}

.expand-enter-from,
.expand-leave-to {
    opacity: 0;
    transform: translateY(-8px);
}

/* DESKTOP */
@media (min-width: 768px) {
    .content {
        padding: 32px 40px 64px;
    }

    .inner {
        max-width: 540px;
    }
}

@media (min-width: 1024px) {
    .content {
        padding: 40px 80px 80px;
    }

    .inner {
        max-width: 560px;
    }
}
</style>