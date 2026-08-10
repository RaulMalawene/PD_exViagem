<script setup>
import { ref, computed, watch } from 'vue'
import { usePublicBookingStore } from '../stores/publicBookingStore'

const props = defineProps({
    routeId: { type: [String, Number], required: true },
    selectedDate: { type: String, default: '' },
})

const emit = defineEmits(['select'])

const bookingStore = usePublicBookingStore()

function toDateStr(date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function todayDateStr() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return toDateStr(d)
}

function addDays(dateStr, amount) {
    const d = new Date(`${dateStr}T00:00:00`)
    d.setDate(d.getDate() + amount)
    return toDateStr(d)
}

function initialWindowStart() {
    const today = todayDateStr()
    if (!props.selectedDate) return today
    const centered = addDays(props.selectedDate, -3)
    return centered < today ? today : centered
}

const windowStart = ref(initialWindowStart())
const loading = ref(true)
const availableDates = ref(new Set())
const priceMzn = ref(null)

const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(windowStart.value, i)))
const canGoBack = computed(() => windowStart.value > todayDateStr())

function formatDay(dateStr) {
    const d = new Date(`${dateStr}T00:00:00`)
    const month = d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '')
    return `${d.getDate()} ${month.charAt(0).toUpperCase()}${month.slice(1)}`
}

async function fetchWindow() {
    if (!props.routeId) return

    loading.value = true
    try {
        const windowEnd = addDays(windowStart.value, 6)
        const data = await bookingStore.fetchTripCalendar(props.routeId, windowStart.value, windowEnd)
        availableDates.value = new Set(data.dates)
        priceMzn.value = data.price_mzn
    } catch {
        // O calendario e acessorio: sem ele a pesquisa continua a funcionar.
        availableDates.value = new Set()
    } finally {
        loading.value = false
    }
}

function prevWindow() {
    const candidate = addDays(windowStart.value, -7)
    windowStart.value = candidate < todayDateStr() ? todayDateStr() : candidate
}

function nextWindow() {
    windowStart.value = addDays(windowStart.value, 7)
}

function selectDate(dateStr) {
    if (!availableDates.value.has(dateStr)) return
    emit('select', dateStr)
}

watch(() => [props.routeId, windowStart.value], fetchWindow, { immediate: true })

watch(() => props.selectedDate, (newDate) => {
    if (newDate && (newDate < windowStart.value || newDate > addDays(windowStart.value, 6))) {
        windowStart.value = initialWindowStart()
    }
})
</script>

<template>
    <div class="dateStrip">
        <button class="stripArrow" :disabled="!canGoBack" @click="prevWindow">
            <i class="fi fi-rs-angle-left" />
        </button>

        <div class="stripDays">
            <button v-for="d in days" :key="d" type="button" class="dayTile"
                :class="{ active: d === selectedDate, unavailable: !availableDates.has(d) }"
                :disabled="!availableDates.has(d)" @click="selectDate(d)">
                <span class="dayLabel">{{ formatDay(d) }}</span>
                <span v-if="loading" class="dayPrice">...</span>
                <span v-else-if="availableDates.has(d)" class="dayPrice">
                    {{ Number(priceMzn).toLocaleString('pt-PT') }} MT
                </span>
                <span v-else class="dayPrice muted">Sem viagens</span>
            </button>
        </div>

        <button class="stripArrow" @click="nextWindow">
            <i class="fi fi-rs-angle-right" />
        </button>
    </div>
</template>

<style scoped>
.dateStrip {
    display: flex;
    align-items: stretch;
    gap: 8px;
    background: #fff;
    border: 1px solid #EEEEEE;
    border-radius: 14px;
    padding: 10px;
}

.stripArrow {
    flex-shrink: 0;
    width: 32px;
    border: none;
    background: #F6F6F6;
    border-radius: 8px;
    color: #922877;
    font-size: 14px;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
}

.stripArrow:hover:not(:disabled) {
    background: #EEEEEE;
}

.stripArrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.stripDays {
    flex: 1;
    display: flex;
    gap: 6px;
    overflow-x: auto;
}

.dayTile {
    flex: 1;
    min-width: 84px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 6px;
    border: 1.5px solid #EEEEEE;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
    font-family: 'Ubuntu', sans-serif;
}

.dayTile:hover:not(:disabled) {
    border-color: #922877;
}

.dayTile.active {
    border-color: #922877;
    background: rgba(146, 40, 119, 0.06);
}

.dayTile.unavailable {
    cursor: not-allowed;
}

.dayLabel {
    font-size: 12px;
    font-weight: 700;
    color: #221F20;
}

.dayPrice {
    font-size: 11px;
    font-weight: 700;
    color: #922877;
}

.dayPrice.muted {
    font-weight: 500;
    color: #bbb;
}
</style>
