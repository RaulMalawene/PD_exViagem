<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePublicBookingStore } from '../../stores/publicBookingStore'
import { parseApiError } from '../../utils/parseApiError'
import BookingStepper from '../../components/BookingStepper.vue'
import DateStrip from '../../components/DateStrip.vue'

const router = useRouter()
const route = useRoute()
const bookingStore = usePublicBookingStore()

const loading = ref(true)
const selectedDate = ref(route.query.date ?? '')
const loadError = ref(null)
const routeId = ref(route.query.route_id ?? '')
const dateStripAnchor = ref(null)

const trips = computed(() => bookingStore.trips)

function goBack() {
    router.back()
}

function goToStep(step) {
    const target = bookingStore.stepRoute(step)
    if (target) router.push(target)
}

function onSelectDate(date) {
    selectedDate.value = date
    router.replace({ query: { ...route.query, date } })
    fetchTrips()
}

function scrollToDateStrip() {
    dateStripAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function formatTripDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(`${dateStr}T00:00:00`)
    const label = date.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' })
    return label.charAt(0).toUpperCase() + label.slice(1)
}

function selectTrip(trip) {
    bookingStore.saveFlow({ routeId: routeId.value })
    router.push({
        path: '/booking/seats',
        query: { trip_id: trip.id },
    })
}

async function fetchTrips() {
    loading.value = true
    try {
        await bookingStore.searchTrips({
            route_id: routeId.value,
            ...(selectedDate.value ? { date: selectedDate.value } : {}),
        })
        loadError.value = null
    } catch (err) {
        // Sem este catch o erro era engolido e a pagina mostrava
        // "sem viagens" — o cliente concluia que nao havia viagens.
        loadError.value = parseApiError(err)
    } finally {
        loading.value = false
    }
}

onMounted(async () => {
    // As rotas so aquecem a cache e nem sao lidas nesta pagina. Sem este
    // catch, uma falha aqui impedia o fetchTrips() de correr e o loading
    // ficava preso a true — spinner eterno para o cliente.
    await bookingStore.fetchRoutes().catch(() => {})
    await fetchTrips()
})
</script>

<template>
    <div class="page">

        <!-- STEPPER -->
        <BookingStepper :current="1" @step-click="goToStep" />

        <!-- CONTENT -->
        <div class="content">
            <div class="inner">

                <div class="sectionLabel">Viagens disponiveis</div>
                <p class="sectionNote">* Horários sujeitos a alterações dependendo do tráfego.</p>

                <!-- TIRA DE DATAS -->
                <div ref="dateStripAnchor">
                    <DateStrip v-if="routeId" :route-id="routeId" :selected-date="selectedDate"
                        @select="onSelectDate" />
                </div>

                <!-- LOADING -->
                <div v-if="loading" class="stateBox">
                    <div class="spinner" />
                </div>

                <!-- ERRO: distinto de "sem viagens", que era o que se via antes -->
                <div v-else-if="loadError" class="stateBox">
                    <i class="fi fi-sr-exclamation emptyIcon" />
                    <p class="emptyTitle">Não foi possível carregar as viagens</p>
                    <p class="emptyDesc">{{ loadError }}</p>
                    <button class="backLink" @click="fetchTrips">Voltar a tentar</button>
                </div>

                <!-- EMPTY COM DATA ESPECIFICA -->
                <div v-else-if="trips.length === 0 && selectedDate" class="stateBox">
                    <i class="fi fi-rs-calendar-xmark emptyIcon" />
                    <p class="emptyTitle">Não há viagens disponíveis para {{ formatTripDate(selectedDate) }}</p>
                    <p class="emptyDesc">Escolha outra data disponível.</p>
                    <button class="backLink" @click="scrollToDateStrip">Ver datas disponíveis</button>
                </div>

                <!-- EMPTY SEM DATA -->
                <div v-else-if="trips.length === 0" class="stateBox">
                    <i class="fi fi-rs-bus emptyIcon" />
                    <p class="emptyTitle">Sem viagens disponíveis</p>
                    <p class="emptyDesc">Não existem viagens para os critérios seleccionados.</p>
                    <button class="backLink" @click="goBack">Voltar à pesquisa</button>
                </div>

                <!-- TRIP CARDS -->
                <div v-else class="tripList">
                    <div v-for="trip in trips" :key="trip.id" class="tripCard">

                        <div class="tripDateBadge">
                            <i class="fi fi-rs-calendar dateIcon" />
                            {{ formatTripDate(trip.departure_date) }}
                        </div>

                        <div class="tripTime">
                            <span class="timeDepart">{{ trip.departure_time?.slice(0, 5) }}</span>
                            <div class="timeLine">
                                <div class="lineBar" />
                                <i class="fi fi-rs-bus busIcon" />
                                <div class="lineBar" />
                            </div>
                            <span v-if="trip.estimated_arrival" class="timeArrive">
                                ~{{ trip.estimated_arrival.time }}<template v-if="trip.estimated_arrival.next_day"> +1</template>
                            </span>
                        </div>

                        <div class="stops">
                            <template v-for="(stop, i) in (trip.route?.stops ?? [])" :key="i">
                                <span class="stopPill">{{ stop.name }}</span>
                                <i v-if="i < trip.route.stops.length - 1" class="fi fi-rs-angle-right stopArrow" />
                            </template>
                        </div>

                        <div class="tripDivider" />

                        <div class="tripFooter">
                            <div class="seatsInfo">
                                <i class="fi fi-rs-bus seatsIcon" />
                                <span class="seatsLabel">{{ trip.available_seats ?? '--' }} lugares disponíveis</span>
                            </div>
                            <div class="priceBlock">
                                <span class="priceMzn">{{ trip.route?.price_mzn ?
                                    Number(trip.route.price_mzn).toLocaleString('pt-PT') + ' MT' :
                                    '--' }}</span>
                                <span class="priceZar">ou {{ trip.route?.price_zar ?
                                    Number(trip.route.price_zar).toLocaleString('pt-PT') + ' ZAR' : '--' }}</span>
                            </div>
                        </div>

                        <button class="selectBtn" @click="selectTrip(trip)">
                            Selecionar esta viagem
                        </button>

                    </div>
                </div>

             <!-- FEATURE CARD
                <div class="featureCard">
                    <div class="featureIconWrap">
                        <i class="fi fi-rs-bus featureIcon" />
                    </div>
                    <div class="featureText">
                        <span class="featureTitle">Viagens Seguras</span>
                        <span class="featureDesc">Todos os nossos motoristas são profissionais e seguem rigorosos
                            protocolos de
                            segurança.</span>
                    </div>
                </div>

            -->
                

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

/* CONTENT */
.content {
    flex: 1;
    padding: 24px 20px 48px;
}

.inner {
    max-width: 720px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.sectionLabel {
    font-size: 16px;
    font-weight: 700;
    color: #922877;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.sectionNote {
    font-size: 12px;
    color: #aaa;
    font-style: italic;
    margin-top: -8px;
}

/* STATES */
.stateBox {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 60px 0;
    text-align: center;
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
    to {
        transform: rotate(360deg);
    }
}

.emptyIcon {
    font-size: 48px;
    color: #922877;
    opacity: 0.25;
}

.emptyTitle {
    font-size: 17px;
    font-weight: 700;
    color: #333;
}

.emptyDesc {
    font-size: 14px;
    color: #999;
}

.backLink {
    margin-top: 8px;
    border: none;
    background: none;
    color: #922877;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    font-family: 'Ubuntu', sans-serif;
}

/* TRIP LIST */
.tripList {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* TRIP CARD */
.tripCard {
    background: #fff;
    border-radius: 14px;
    padding: 20px;
    border: 1px solid #F0F0F0;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.tripDateBadge {
    display: flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    font-size: 12px;
    font-weight: 700;
    color: #922877;
    background: rgba(146, 40, 119, 0.08);
    border-radius: 20px;
    padding: 4px 10px;
    text-transform: capitalize;
}

.dateIcon {
    font-size: 11px;
}

.tripTime {
    display: flex;
    align-items: center;
    gap: 10px;
}

.timeDepart {
    font-size: 26px;
    font-weight: 800;
    color: #221F20;
    letter-spacing: -0.02em;
    flex-shrink: 0;
}

.timeLine {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
}

.lineBar {
    flex: 1;
    height: 1.5px;
    background: #E0E0E0;
}

.busIcon {
    font-size: 18px;
    color: #922877;
    flex-shrink: 0;
    position: relative;
    top: 1px;
}

.timeArrive {
    font-size: 14px;
    color: #888;
    flex-shrink: 0;
}

/* STOPS */
.stops {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
}

.stopPill {
    font-size: 12px;
    color: #555;
    background: #F6F6F6;
    border: 1px solid #E8E8E8;
    border-radius: 4px;
    padding: 3px 8px;
    white-space: nowrap;
}

.stopArrow {
    font-size: 10px;
    color: #ccc;
}

/* DIVIDER */
.tripDivider {
    height: 1px;
    background: #F0F0F0;
}

/* FOOTER */
.tripFooter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.seatsInfo {
    display: flex;
    align-items: center;
    gap: 7px;
}

.seatsIcon {
    font-size: 14px;
    color: #922877;
    position: relative;
    top: 1px;
}

.seatsLabel {
    font-size: 13px;
    font-weight: 600;
    color: #922877;
}

.priceBlock {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
}

.priceMzn {
    font-size: 20px;
    font-weight: 800;
    color: #922877;
    letter-spacing: -0.01em;
}

.priceZar {
    font-size: 12px;
    color: #aaa;
}

/* BUTTON */
.selectBtn {
    width: 100%;
    height: 50px;
    background: #922877;
    color: #fff;
    border: none;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
    font-family: 'Ubuntu', sans-serif;
}

.selectBtn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

.selectBtn:active {
    transform: translateY(0);
}

/* FEATURE CARD */
.featureCard {
    background: #fff;
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border: 1px solid #F0E8ED;
    margin-top: 8px;
}

.featureIconWrap {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(146, 40, 119, 0.08);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.featureIcon {
    font-size: 18px;
    color: #922877;
    position: relative;
    top: 1px;
}

.featureText {
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.featureTitle {
    font-size: 14px;
    font-weight: 700;
    color: #922877;
}

.featureDesc {
    font-size: 13px;
    color: #888;
    line-height: 1.45;
}

/* DESKTOP */
@media (min-width: 768px) {
    .content {
        padding: 32px 24px 64px;
    }

    .tripCard {
        padding: 24px 28px;
    }

    .timeDepart {
        font-size: 30px;
    }
}

@media (min-width: 1024px) {
    .content {
        padding: 40px 40px 80px;
    }

    .inner {
        max-width: 860px;
    }

    .tripList {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
    }

    .featureCard {
        max-width: 420px;
    }
}

@media (min-width: 1440px) {
    .inner {
        max-width: 960px;
    }

    .tripList {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (min-width: 768px) {
  .content {
    padding: 32px 40px 64px;
  }

  .inner {
    max-width: 100%;
  }

  .tripList {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

@media (min-width: 1024px) {
  .content {
    padding: 40px 80px 80px;
  }

  .sectionLabel {
    font-size: 12px;
  }

  .tripList {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .tripCard {
    padding: 24px 28px;
  }

  .timeDepart {
    font-size: 32px;
  }

  .featureCard {
    max-width: 480px;
  }
}

@media (min-width: 1280px) {
  .content {
    padding: 40px 120px 80px;
  }

  .tripList {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
}

@media (min-width: 1440px) {
  .content {
    padding: 40px 160px 80px;
  }
}
</style>