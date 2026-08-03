<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { loadStripe } from '@stripe/stripe-js'
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

const mobilePhone = ref('')
const mpesaWaiting = ref(false)
const mpesaSeconds = ref(0)
const mpesaError = ref('')
const emolaPhone = ref('')

const sessionToken = route.query.session_token ?? bookingStore.flow.sessionToken

let stripeInstance = null
let stripeElements = null
let paymentElement = null
let isUnmounted = false
const cardElementRef = ref(null)
const cardLoading = ref(false)
const cardReady = ref(false)
const cardError = ref('')

onUnmounted(() => { isUnmounted = true })

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
    { key: 'emola', label: 'E-Mola', sub: 'Movitel', icon: emolaIcon, disabled: true },
]


const otherMethods = methods.filter((m) => m.key !== 'card')

async function fetchTripData() {
    try {
        const data = await bookingStore.fetchAvailability(tripId)
        if (isUnmounted) return
        tripData.value = data
    } catch (err) {
        if (!isUnmounted) showToast('error', parseApiError(err))
    } finally {
        if (!isUnmounted) loading.value = false
    }
}

onMounted(fetchTripData)

function goToStep(step) {
    const target = bookingStore.stepRoute(step)
    if (target) router.push(target)
}

function canSubmit() {
    if (mpesaWaiting.value) return false
    if (selectedMethod.value === 'card') return cardReady.value && !cardLoading.value
    if (selectedMethod.value === 'mpesa') return /^(?:\+?258)?8[45]\d{7}$/.test(mobilePhone.value.replace(/[\s-]/g, ''))
    if (selectedMethod.value === 'emola') return emolaPhone.value
    if (selectedMethod.value === 'local') return true
    return false
}

async function initCardPayment() {
    if (cardLoading.value) return
    cardError.value = ''

    if (!stripeElements) {
        if (!sessionToken) {
            cardError.value = 'Sessão inválida. Volte a iniciar a reserva.'
            return
        }

        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
        if (!publishableKey) {
            cardError.value = 'Pagamento por cartão indisponível de momento.'
            return
        }

        cardLoading.value = true

        try {
            const intent = await bookingStore.createPaymentIntent(sessionToken)
            if (isUnmounted) return

            stripeInstance = await loadStripe(publishableKey)
            if (isUnmounted) return

            stripeElements = stripeInstance.elements({ clientSecret: intent.client_secret })
            paymentElement = stripeElements.create('payment')
            paymentElement.on('change', (event) => { cardError.value = event.error?.message ?? '' })
            paymentElement.on('ready', () => { cardLoading.value = false; cardReady.value = true })
        } catch (err) {
            if (!isUnmounted) {
                cardError.value = parseApiError(err)
                cardLoading.value = false
            }
            return
        }
    }

    await nextTick()
    if (isUnmounted || !cardElementRef.value) {
        cardLoading.value = false
        return
    }

    try {
        paymentElement.mount(cardElementRef.value)
    } catch (err) {
        console.error('Stripe mount() falhou:', err)
        cardError.value = 'Não foi possível carregar o formulário de cartão. Tente novamente.'
        cardLoading.value = false
    }
}

watch(selectedMethod, (method) => {
    if (method === 'card') {
        selectedCurrency.value = 'zar'
        initCardPayment()
    }
})

/**
 * O C2B do M-Pesa e sincrono: este pedido fica pendurado enquanto o cliente
 * digita o PIN. Nao ha webhook — a resposta e o resultado.
 */
async function payWithMpesa() {
    mpesaError.value = ''
    mpesaWaiting.value = true
    mpesaSeconds.value = 0

    const ticker = setInterval(() => { mpesaSeconds.value++ }, 1000)

    try {
        const res = await bookingStore.payWithMpesa(sessionToken, mobilePhone.value.trim())

        if (!res?.success) {
            mpesaError.value = res?.message ?? 'Não foi possível processar o pagamento.'
            return false
        }

        return true
    } catch (err) {
        mpesaError.value = err.response?.data?.data?.message ?? parseApiError(err)
        return false
    } finally {
        clearInterval(ticker)
        mpesaWaiting.value = false
    }
}

async function confirm() {
    if (!canSubmit() || submitting.value) return
    submitting.value = true
    try {
        if (selectedMethod.value === 'card') {
            const { error } = await stripeInstance.confirmPayment({
                elements: stripeElements,
                confirmParams: { return_url: window.location.href },
                redirect: 'if_required',
            })

            if (error) {
                cardError.value = error.message ?? 'Não foi possível processar o pagamento.'
                showToast('error', cardError.value)
                return
            }
        } else if (selectedMethod.value === 'mpesa') {
            const paid = await payWithMpesa()
            if (!paid) return
        } else {
            await new Promise((r) => setTimeout(r, 800))
        }

        bookingStore.completeFlow(sessionToken)
        router.replace({
            path: '/booking/success',
            query: {
                session_token: sessionToken,
                method: selectedMethod.value,
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
        <BookingStepper :current="4" @step-click="goToStep" />

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

                    <!-- CARTAO - fora do v-for de proposito (ver nota junto a otherMethods no script) -->
                    <div class="methodCard" :class="{ selected: selectedMethod === 'card' }"
                        @click="selectedMethod = 'card'">
                        <div class="methodHeader">
                            <div class="methodRadio" :class="{ checked: selectedMethod === 'card' }">
                                <div v-if="selectedMethod === 'card'" class="radioInner" />
                            </div>
                            <div class="methodIconWrap">
                                <img :src="cardIcon" alt="Cartão de crédito" class="methodIcon" />
                            </div>
                            <div class="methodText">
                                <span class="methodLabel">Cartão de crédito</span>
                                <span class="methodSub">Visa, Mastercard</span>
                            </div>
                        </div>

                        <Transition name="expand">
                            <div v-show="selectedMethod === 'card'" class="methodBody">
                                <p class="fieldNote">Pagamentos por cartão são cobrados em Rand (ZAR).</p>
                                <div class="field">
                                    <label class="fieldLabel">Dados do cartão</label>
                                    <div class="stripeElementWrap">
                                        <!-- este elemento nunca fica display:none - a Stripe precisa de um
                                             alvo com layout real para montar, senao rejeita com "Invalid DOM element" -->
                                        <div ref="cardElementRef" class="stripeElement" @click.stop />
                                        <div v-if="cardLoading" class="cardLoadingBox">
                                            <div class="cardSpinner" />
                                            <span>A preparar pagamento seguro...</span>
                                        </div>
                                    </div>
                                    <p v-if="cardError" class="cardErrorText">{{ cardError }}</p>
                                </div>
                            </div>
                        </Transition>
                    </div>

                    <!-- M-PESA / E-MOLA -->
                    <div v-for="m in otherMethods" :key="m.key" class="methodCard"
                        :class="{ selected: selectedMethod === m.key, unavailable: m.disabled }"
                        @click="m.disabled || (selectedMethod = m.key)">
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
                            <span v-if="m.disabled" class="soonBadge">Brevemente</span>
                        </div>

                        <!-- CAMPOS MPESA -->
                        <Transition name="expand">
                            <div v-if="selectedMethod === 'mpesa' && m.key === 'mpesa'" class="methodBody">
                                <div class="field">
                                    <label class="fieldLabel">Número de celular</label>
                                    <div class="inputWrap">
                                        <input v-model="mobilePhone" type="tel" class="input" placeholder="84 000 0000"
                                            :disabled="mpesaWaiting" @click.stop />
                                        <i class="fi fi-rs-mobile inputIconRight" />
                                    </div>
                                    <p class="fieldNote">NB.: Deve ser o número de celular com o qual deseja fazer o
                                        pagamento</p>

                                    <p v-if="mpesaError" class="mpesaError">{{ mpesaError }}</p>

                                    <div v-if="mpesaWaiting" class="mpesaWaiting" @click.stop>
                                        <div class="mpesaSpinner" />
                                        <div class="mpesaWaitingText">
                                            <strong>Confirme o pagamento no seu telemóvel</strong>
                                            <span>Enviámos um pedido para o {{ mobilePhone }}. Introduza o seu PIN
                                                M-Pesa.</span>
                                            <span class="mpesaTimer">À espera há {{ mpesaSeconds }}s — não feche esta
                                                página.</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Transition>

                        <!-- CAMPOS EMOLA - inactivo ate haver credenciais da Movitel -->
                        <Transition name="expand">
                            <div v-if="false && selectedMethod === 'emola' && m.key === 'emola'" class="methodBody">
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

/* M-PESA: erro e ecra de espera do PIN */
.mpesaError {
    margin-top: 8px;
    font-size: 13px;
    color: #c62828;
    background: #fce4ec;
    border-radius: 8px;
    padding: 10px 12px;
    line-height: 1.45;
}

.mpesaWaiting {
    margin-top: 12px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    background: #FFF8E1;
    border: 1px solid #FFE0A3;
    border-radius: 10px;
    padding: 14px;
}

.mpesaSpinner {
    width: 22px;
    height: 22px;
    border: 3px solid #FFE0A3;
    border-top-color: #C77800;
    border-radius: 50%;
    animation: mpesaSpin 0.8s linear infinite;
    flex-shrink: 0;
    margin-top: 2px;
}

@keyframes mpesaSpin {
    to { transform: rotate(1turn); }
}

.mpesaWaitingText {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
}

.mpesaWaitingText strong {
    font-size: 14px;
    color: #221F20;
}

.mpesaWaitingText span {
    font-size: 12px;
    color: #7a5c1e;
    line-height: 1.45;
}

.mpesaTimer {
    font-weight: 600;
}

/* Metodo ainda indisponivel (E-Mola) */
.methodCard.unavailable {
    opacity: 0.55;
    cursor: not-allowed;
}

.methodCard.unavailable:hover {
    border-color: #E6E6E6;
}

.soonBadge {
    margin-left: auto;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #7a5c1e;
    background: #FFF3D6;
    border-radius: 20px;
    padding: 4px 10px;
    white-space: nowrap;
}

/* STRIPE ELEMENT */
.stripeElementWrap {
    position: relative;
    min-height: 40px;
}

.stripeElement {
    border: 1.5px solid #E0E0E0;
    border-radius: 10px;
    padding: 12px 14px;
    background: #fff;
    min-height: 40px;
}

.cardLoadingBox {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 4px;
    font-size: 13px;
    color: #888;
    background: #fff;
    border: 1.5px solid #E0E0E0;
    border-radius: 10px;
}

.cardSpinner {
    width: 18px;
    height: 18px;
    border: 2.5px solid #f0f0f0;
    border-top-color: #922877;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
}

.cardErrorText {
    font-size: 12px;
    color: #E53935;
    margin-top: 2px;
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