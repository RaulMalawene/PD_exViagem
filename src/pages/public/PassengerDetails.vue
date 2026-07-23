<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePublicBookingStore } from '../../stores/publicBookingStore'
import { useToast } from '../../composables/useToast'
import { parseApiError } from '../../utils/parseApiError'
import { formatDate } from '../../utils/formatDate'
import BookingStepper from '../../components/BookingStepper.vue'
import DatePicker from '../../components/DatePicker.vue'
import flagMz from '../../assets/flag_mz.svg'
import flagZa from '../../assets/flag_southAfrica.png'

const today = new Date().toISOString().split('T')[0]

const router = useRouter()
const route = useRoute()
const bookingStore = usePublicBookingStore()
const { showToast } = useToast()

const tripId = route.query.trip_id
const sessionToken = route.query.session_token
const seats = (route.query.seats ?? '').split(',').filter(Boolean)

const isValidSession = computed(() => !!(tripId && sessionToken && seats.length))

const openIndex = ref(0)
const submitting = ref(false)
const tripData = ref(null)
const boardingStops = computed(() => tripData.value?.route?.stops ?? [])

const countries = [
    { code: 'MZ', prefix: '+258', flag: flagMz, label: 'MZ +258' },
    { code: 'ZA', prefix: '+27', flag: flagZa, label: 'ZA +27' },
]

function buildEmptyPassenger() {
    return {
        name: '',
        passport_number: '',
        passport_expiry: '',
        phone: '',
        phone_country: 'MZ',
        emergency_contact_phone: '',
        emergency_country: 'MZ',
        boarding_stop_id: null,
        phone_open: false,
        emergency_open: false,
        expiry_open: false,
    }
}

function buildInitialPassengers() {
    const saved = bookingStore.flow.passengers
    const flowMatches = saved
        && String(bookingStore.flow.tripId) === String(tripId)
        && saved.length === seats.length

    if (!flowMatches) return seats.map(() => buildEmptyPassenger())

    return saved.map((p) => ({ ...buildEmptyPassenger(), ...p, phone_open: false, emergency_open: false, expiry_open: false }))
}

const passengers = ref(buildInitialPassengers())

const allFilled = computed(() =>
    passengers.value.every(
        (p) =>
            p.name.trim() &&
            p.passport_number.trim() &&
            p.passport_expiry &&
            p.phone.trim() &&
            p.emergency_contact_phone.trim() &&
            p.boarding_stop_id
    )
)

async function fetchTripData() {
    try {
        tripData.value = await bookingStore.fetchAvailability(tripId)
        const defaultStopId = tripData.value?.route?.stops?.[0]?.id ?? null
        passengers.value.forEach((p) => {
            if (!p.boarding_stop_id) p.boarding_stop_id = defaultStopId
        })
    } catch (err) {
        showToast('error', parseApiError(err))
    }
}

function getPrefix(code) {
    return countries.find((c) => c.code === code)?.prefix ?? '+258'
}

function getFlag(code) {
    return countries.find((c) => c.code === code)?.flag ?? flagMz
}

function isPassengerComplete(idx) {
    const p = passengers.value[idx]
    return (
        p.name.trim() &&
        p.passport_number.trim() &&
        p.passport_expiry &&
        p.phone.trim() &&
        p.emergency_contact_phone.trim() &&
        p.boarding_stop_id
    )
}

function selectBoardingStop(idx, stopId) {
    passengers.value[idx].boarding_stop_id = stopId
}

function selectExpiry(idx, date) {
    passengers.value[idx].passport_expiry = date
    passengers.value[idx].expiry_open = false
}

function goToStep(step) {
    const target = bookingStore.stepRoute(step)
    if (target) router.push(target)
}

function toggleAccordion(idx) {
    if (idx > 0 && !isPassengerComplete(idx - 1)) return
    openIndex.value = openIndex.value === idx ? -1 : idx
}

function selectPhoneCountry(idx, code) {
    passengers.value[idx].phone_country = code
    passengers.value[idx].phone_open = false
}

function selectEmergencyCountry(idx, code) {
    passengers.value[idx].emergency_country = code
    passengers.value[idx].emergency_open = false
}

function closeDropdowns(idx) {
    passengers.value[idx].phone_open = false
    passengers.value[idx].emergency_open = false
}

function serializablePassengers() {
    return passengers.value.map(({ phone_open, emergency_open, expiry_open, ...rest }) => rest)
}

let saveTimeout = null
watch(passengers, () => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
        bookingStore.saveFlow({ tripId, sessionToken, selectedSeats: seats, passengers: serializablePassengers() })
    }, 500)
}, { deep: true })

const HOLD_RENEW_THRESHOLD_MS = 90 * 1000
let holdRenewInterval = null

async function renewHoldIfNeeded() {
    const expiresAt = bookingStore.flow.holdExpiresAt
    if (!expiresAt) return

    const remaining = new Date(expiresAt).getTime() - Date.now()
    if (remaining > HOLD_RENEW_THRESHOLD_MS) return

    try {
        await Promise.all(seats.map((seat) => bookingStore.holdSeat(tripId, seat, sessionToken)))
        bookingStore.saveFlow({ holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() })
    } catch {
        // renovacao e best-effort - se falhar, o backend decide a expiracao real
    }
}

async function proceed() {
    if (!allFilled.value || submitting.value) return

    for (let i = 0; i < passengers.value.length; i++) {
        const p = passengers.value[i]
        const phone = getPrefix(p.phone_country) + p.phone.trim()
        const emergencyPhone = getPrefix(p.emergency_country) + p.emergency_contact_phone.trim()

        if (phone === emergencyPhone) {
            showToast('error', `Passageiro ${i + 1}: o telefone pessoal e o telefone de emergência não podem ser iguais.`)
            return
        }
    }

    const passportNumbers = passengers.value.map((p) => p.passport_number.trim().toUpperCase())
    const hasDuplicatePassport = new Set(passportNumbers).size !== passportNumbers.length

    if (hasDuplicatePassport) {
        showToast('error', 'Não pode haver dois passageiros com o mesmo número de passaporte.')
        return
    }

    const departureDate = tripData.value?.departure_date
    if (departureDate) {
        for (let i = 0; i < passengers.value.length; i++) {
            if (passengers.value[i].passport_expiry < departureDate) {
                showToast('error', `Passageiro ${i + 1}: o passaporte não pode estar expirado na data da viagem.`)
                return
            }
        }
    }

    submitting.value = true

    const payload = {
        session_token: sessionToken,
        trip_id: Number(tripId),
        payment_method: 'cash',
        payment_reference: null,
        bookings: seats.map((seat, i) => {
            const p = passengers.value[i]
            return {
                seat_number: seat,
                boarding_stop_id: p.boarding_stop_id,
                passenger: {
                    name: p.name.trim(),
                    passport_number: p.passport_number.trim(),
                    passport_expiry: p.passport_expiry,
                    phone: getPrefix(p.phone_country) + p.phone.trim(),
                    emergency_contact_phone: getPrefix(p.emergency_country) + p.emergency_contact_phone.trim(),
                },
            }
        }),
    }

    try {
        const res = await bookingStore.submitBooking(payload)
        bookingStore.saveFlow({ bookingGroup: res.data })
        router.push({
            path: '/booking/payment',
            query: {
                trip_id: tripId,
                bookings: JSON.stringify(res.data),
            },
        })
    } catch (err) {
        if (err.response?.status === 409) {
            showToast('error', 'Nenhum lugar seleccionado. Volte a escolher os seus lugares.')
            router.push({ path: '/booking/seats', query: { trip_id: tripId } })
        } else {
            showToast('error', parseApiError(err))
        }
    } finally {
        submitting.value = false
    }
}

function handleOutsideClick(e) {
    passengers.value.forEach((p) => {
        p.phone_open = false
        p.emergency_open = false
        p.expiry_open = false
    })
}

onMounted(() => {
    document.addEventListener('click', handleOutsideClick)

    const flow = bookingStore.flow
    if (flow.bookingGroup && String(flow.tripId) === String(tripId)) {
        router.replace({
            path: '/booking/payment',
            query: { trip_id: tripId, bookings: JSON.stringify(flow.bookingGroup) },
        })
        return
    }

    if (isValidSession.value) {
        fetchTripData()
        holdRenewInterval = setInterval(renewHoldIfNeeded, 30000)
    }
})
onUnmounted(() => {
    document.removeEventListener('click', handleOutsideClick)
    clearInterval(holdRenewInterval)
    clearTimeout(saveTimeout)
})
</script>

<template>
    <div class="page">

        <!-- STEPPER -->
        <BookingStepper :current="3" @step-click="goToStep" />

        <!-- CONTENT -->
        <div class="content">
            <div class="inner">

                <!-- SESSAO INVALIDA (acesso directo sem vir do fluxo) -->
                <div v-if="!isValidSession" class="stateBox">
                    <i class="fi fi-rs-triangle-warning emptyIcon" />
                    <p class="emptyTitle">Sessão inválida ou expirada</p>
                    <p class="emptyDesc">Não encontrámos os lugares seleccionados. Volte à pesquisa para escolher a sua viagem.</p>
                    <button class="backLink" @click="router.push('/booking')">Voltar à pesquisa</button>
                </div>

                <template v-else>
                <h2 class="pageTitle">Dados dos passageiros</h2>

                <!-- ACCORDION -->
                <div class="accordionList">
                    <div v-for="(passenger, idx) in passengers" :key="idx" class="accordionCard" :class="{
                        expanded: openIndex === idx,
                        locked: idx > 0 && !isPassengerComplete(idx - 1),
                    }">
                        <!-- HEADER -->
                        <div class="accordionHeader" @click="toggleAccordion(idx)">
                            <div class="accordionLeft">
                                <span class="seatBadge" :class="{
                                    active: openIndex === idx,
                                    done: isPassengerComplete(idx),
                                }">
                                    #{{ seats[idx] }}
                                </span>
                                <span class="accordionTitle"
                                    :class="{ grey: idx > 0 && !isPassengerComplete(idx - 1) }">
                                    Passageiro {{ idx + 1 }}
                                </span>
                            </div>
                            <i class="fi fi-rs-angle-small-down chevron" :class="{ rotated: openIndex === idx }" />
                        </div>

                        <!-- BODY -->
                        <Transition name="accordion">
                            <div v-if="openIndex === idx" class="accordionBody">

                                <!-- NOME -->
                                <div class="field">
                                    <label class="fieldLabel">Nome completo</label>
                                    <input v-model="passenger.name" type="text" class="input"
                                        placeholder="Nome e apelido" />
                                </div>

                                <!-- PASSAPORTE -->
                                <div class="field">
                                    <label class="fieldLabel">Número de passaporte</label>
                                    <div class="inputWrap">
                                        <input v-model="passenger.passport_number" type="text" class="input"
                                            placeholder="Ex: MZ123456" />
                                    </div>
                                </div>

                                <!-- VALIDADE DO PASSAPORTE -->
                                <div class="field">
                                    <label class="fieldLabel">Validade do passaporte</label>
                                    <div class="dateSelect" :class="{ open: passenger.expiry_open }"
                                        @click.stop="passenger.expiry_open = !passenger.expiry_open">
                                        <i class="fi fi-rs-calendar dateSelectIcon" />
                                        <span class="dateSelectValue" :class="{ placeholder: !passenger.passport_expiry }">
                                            {{ passenger.passport_expiry ? formatDate(passenger.passport_expiry) : 'Selecionar data' }}
                                        </span>
                                        <i class="fi fi-rs-angle-small-down dateChevron"
                                            :class="{ rotated: passenger.expiry_open }" />
                                        <Transition name="dropdown">
                                            <DatePicker v-if="passenger.expiry_open" :model-value="passenger.passport_expiry"
                                                :min="today" @update:model-value="selectExpiry(idx, $event)" />
                                        </Transition>
                                    </div>
                                </div>

                                <!-- LOCAL DE EMBARQUE -->
                                <div v-if="boardingStops.length" class="field">
                                    <label class="fieldLabel">Local de embarque</label>
                                    <div class="boardingToggle">
                                        <button v-for="stop in boardingStops" :key="stop.id" type="button"
                                            class="boardingBtn" :class="{ active: passenger.boarding_stop_id === stop.id }"
                                            @click="selectBoardingStop(idx, stop.id)">
                                            <span class="boardingBtnName">{{ stop.name }}</span>
                                            <span v-if="stop.boarding_time" class="boardingBtnTime">{{ stop.boarding_time.slice(0, 5) }}</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- TELEFONE PESSOAL -->
                                <div class="field">
                                    <label class="fieldLabel">Telefone pessoal</label>
                                    <div class="telWrap" :class="{ focused: passenger.phone_open }">
                                        <div class="telPrefix"
                                            @click.stop="passenger.phone_open = !passenger.phone_open; passenger.emergency_open = false">
                                            <img :src="getFlag(passenger.phone_country)" alt="" class="flagIcon" />
                                            <span class="prefixCode">{{ passenger.phone_country }} {{
                                                getPrefix(passenger.phone_country) }}</span>
                                            <i class="fi fi-rs-angle-small-down prefixChevron"
                                                :class="{ rotated: passenger.phone_open }" />
                                            <Transition name="drop">
                                                <ul v-if="passenger.phone_open" class="prefixDropdown" @click.stop>
                                                    <li v-for="c in countries" :key="c.code" class="prefixOption"
                                                        :class="{ active: passenger.phone_country === c.code }"
                                                        @click.stop="selectPhoneCountry(idx, c.code)">
                                                        <img :src="c.flag" alt="" class="flagIcon" />
                                                        <span>{{ c.label }}</span>
                                                    </li>
                                                </ul>
                                            </Transition>
                                        </div>
                                        <input v-model="passenger.phone" type="tel" class="input telInput"
                                            placeholder="84 000 0000" />
                                    </div>
                                </div>

                                <!-- TELEFONE EMERGENCIA -->
                                <div class="field">
                                    <label class="fieldLabel">Telefone do contacto de emergência</label>
                                    <div class="telWrap" :class="{ focused: passenger.emergency_open }">
                                        <div class="telPrefix"
                                            @click.stop="passenger.emergency_open = !passenger.emergency_open; passenger.phone_open = false">
                                            <img :src="getFlag(passenger.emergency_country)" alt="" class="flagIcon" />
                                            <span class="prefixCode">{{ passenger.emergency_country }} {{
                                                getPrefix(passenger.emergency_country) }}</span>
                                            <i class="fi fi-rs-angle-small-down prefixChevron"
                                                :class="{ rotated: passenger.emergency_open }" />
                                            <Transition name="drop">
                                                <ul v-if="passenger.emergency_open" class="prefixDropdown" @click.stop>
                                                    <li v-for="c in countries" :key="c.code" class="prefixOption"
                                                        :class="{ active: passenger.emergency_country === c.code }"
                                                        @click.stop="selectEmergencyCountry(idx, c.code)">
                                                        <img :src="c.flag" alt="" class="flagIcon" />
                                                        <span>{{ c.label }}</span>
                                                    </li>
                                                </ul>
                                            </Transition>
                                        </div>
                                        <input v-model="passenger.emergency_contact_phone" type="tel"
                                            class="input telInput" placeholder="84 000 0000" />
                                    </div>
                                </div>

                            </div>
                        </Transition>

                        <!-- NOTA BLOQUEADO -->
                        <p v-if="idx > 0 && !isPassengerComplete(idx - 1) && openIndex !== idx" class="lockedNote">
                            Preencha o Passageiro {{ idx }} primeiro
                        </p>

                    </div>
                </div>

                <!-- BOTÃO -->
                <button class="continueBtn" :class="{ disabled: !allFilled || submitting }"
                    :disabled="!allFilled || submitting" @click="proceed">
                    <span v-if="submitting">A processar...</span>
                    <span v-else>Continuar</span>
                </button>
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
    gap: 16px;
}

.pageTitle {
    font-size: 22px;
    font-weight: 700;
    color: #221F20;
}

/* SESSAO INVALIDA */
.stateBox {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 20px;
    text-align: center;
    background: #fff;
    border-radius: 14px;
    border: 1px solid #F0F0F0;
}

.emptyIcon {
    font-size: 44px;
    color: #922877;
    opacity: 0.3;
}

.emptyTitle {
    font-size: 17px;
    font-weight: 700;
    color: #333;
}

.emptyDesc {
    font-size: 14px;
    color: #999;
    max-width: 340px;
}

.backLink {
    margin-top: 4px;
    border: none;
    background: none;
    color: #922877;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    font-family: 'Ubuntu', sans-serif;
}

/* ACCORDION */
.accordionList {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.accordionCard {
    background: #fff;
    border-radius: 12px;
    border: 1.5px solid #EEEEEE;
    overflow: visible;
    transition: border-color 0.2s;
}

.accordionCard.expanded {
    border-left: 3px solid #922877;
    border-color: #922877;
}

.accordionCard.locked {
    opacity: 0.65;
}

.accordionHeader {
    padding: 16px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
}

.accordionLeft {
    display: flex;
    align-items: center;
    gap: 12px;
}

.seatBadge {
    font-size: 12px;
    font-weight: 700;
    padding: 4px 11px;
    border-radius: 50px;
    background: #EEEEEE;
    color: #888;
    transition: all 0.2s;
}

.seatBadge.active {
    background: #922877;
    color: #fff;
}

.seatBadge.done {
    background: #4a8f2a;
    color: #fff;
}

.accordionTitle {
    font-size: 15px;
    font-weight: 600;
    color: #221F20;
}

.accordionTitle.grey {
    color: #bbb;
}

.chevron {
    font-size: 18px;
    color: #aaa;
    transition: transform 0.2s;
}

.chevron.rotated {
    transform: rotate(180deg);
}

/* BODY */
.accordionBody {
    padding: 4px 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    border-top: 1px solid #F5F5F5;
}

.lockedNote {
    font-size: 12px;
    color: #bbb;
    font-style: italic;
    text-align: center;
    padding: 8px 18px 14px;
}

/* FIELDS */
.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.fieldLabel {
    font-size: 13px;
    font-weight: 600;
    color: #221F20;
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

.input:focus {
    border-color: #922877;
}

.input::placeholder {
    color: #bbb;
}

.input.errorInput {
    border-color: #D94040;
}

.inputWrap {
    position: relative;
}

.inputWrap .input {
    padding-right: 42px;
}

.inputIcon {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
}

.inputIcon.spinning {
    color: #aaa;
    animation: spin 0.7s linear infinite;
}

.inputIcon.green {
    color: #4a8f2a;
}

@keyframes spin {
    to {
        transform: translateY(-50%) rotate(360deg);
    }
}

.errorMsg {
    font-size: 12px;
    color: #D94040;
    font-weight: 500;
}

.fieldNote {
    font-size: 11px;
    color: #aaa;
    font-style: italic;
}

/* BOARDING */
.boardingToggle {
    display: flex;
    gap: 8px;
}

.boardingBtn {
    flex: 1;
    height: 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border: 1.5px solid #E0E0E0;
    border-radius: 10px;
    background: #fff;
    color: #221F20;
    font-size: 13px;
    font-weight: 600;
    font-family: 'Ubuntu', sans-serif;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.boardingBtnTime {
    font-size: 11px;
    font-weight: 500;
    color: #999;
}

.boardingBtn.active {
    background: #922877;
    border-color: #922877;
    color: #fff;
}

.boardingBtn.active .boardingBtnTime {
    color: rgba(255, 255, 255, 0.75);
}

/* DATE SELECT */
.dateSelect {
    position: relative;
    display: flex;
    align-items: center;
    height: 48px;
    border: 1.5px solid #E0E0E0;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    transition: border-color 0.15s;
    user-select: none;
}

.dateSelect.open {
    border-color: #922877;
}

.dateSelectIcon {
    position: absolute;
    left: 14px;
    color: #922877;
    font-size: 15px;
    pointer-events: none;
    top: 50%;
    transform: translateY(-50%);
}

.dateSelectValue {
    flex: 1;
    padding: 0 40px;
    font-size: 15px;
    color: #221F20;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dateSelectValue.placeholder {
    color: #bbb;
}

.dateChevron {
    position: absolute;
    right: 14px;
    color: #aaa;
    font-size: 13px;
    pointer-events: none;
    top: 50%;
    transform: translateY(-50%);
    transition: transform 0.2s;
}

.dateChevron.rotated {
    transform: translateY(-50%) rotate(180deg);
}

/* TEL */
.telWrap {
    display: flex;
    border: 1.5px solid #E0E0E0;
    border-radius: 10px;
    overflow: visible;
    transition: border-color 0.15s;
    background: #fff;
    position: relative;
}

.telWrap.focused {
    border-color: #922877;
}

.telWrap:focus-within {
    border-color: #922877;
}

.telPrefix {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 0 10px;
    background: #F6F6F6;
    border-right: 1.5px solid #E0E0E0;
    height: 48px;
    flex-shrink: 0;
    cursor: pointer;
    border-radius: 9px 0 0 9px;
    position: relative;
    user-select: none;
    transition: background 0.15s;
}

.telPrefix:hover {
    background: #EEEEEE;
}

.flagIcon {
    width: 20px;
    height: 14px;
    object-fit: cover;
    border-radius: 2px;
    flex-shrink: 0;
}

.prefixCode {
    font-size: 12px;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
}

.prefixChevron {
    font-size: 12px;
    color: #aaa;
    transition: transform 0.2s;
}

.prefixChevron.rotated {
    transform: rotate(180deg);
}

.prefixDropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    background: #fff;
    border: 1.5px solid #E0E0E0;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    z-index: 500;
    list-style: none;
    padding: 4px;
    min-width: 150px;
}

.prefixOption {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    font-size: 13px;
    color: #333;
    border-radius: 7px;
    cursor: pointer;
    transition: background 0.1s;
}

.prefixOption:hover {
    background: #F6F0F4;
}

.prefixOption.active {
    background: rgba(146, 40, 119, 0.08);
    color: #922877;
    font-weight: 600;
}

.telInput {
    border: none;
    border-radius: 0 9px 9px 0;
    flex: 1;
    min-width: 0;
    height: 46px;
}

.telInput:focus {
    border-color: transparent;
    outline: none;
}

/* BUTTON */
.continueBtn {
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

.continueBtn:hover:not(.disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
}

.continueBtn:active:not(.disabled) {
    transform: translateY(0);
}

.continueBtn.disabled {
    background: #ccc;
    cursor: not-allowed;
}

/* TRANSITIONS */
.accordion-enter-active,
.accordion-leave-active {
    transition: opacity 0.18s, transform 0.18s;
}

.accordion-enter-from,
.accordion-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}

.drop-enter-active,
.drop-leave-active {
    transition: opacity 0.15s, transform 0.15s;
}

.drop-enter-from,
.drop-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

.dropdown-enter-active,
.dropdown-leave-active {
    transition: opacity 0.15s, transform 0.15s;
}

.dropdown-enter-from,
.dropdown-leave-to {
    opacity: 0;
    transform: translateY(-6px);
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