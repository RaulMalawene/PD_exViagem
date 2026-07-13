<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { usePublicBookingStore } from '../stores/publicBookingStore'

const props = defineProps({
    modelValue: { type: String, default: '' },
    min: { type: String, default: '' },
    routeId: { type: [String, Number], default: '' },
})

const emit = defineEmits(['update:modelValue'])

const bookingStore = usePublicBookingStore()
const tripDates = ref(new Set())

const today = new Date()
today.setHours(0, 0, 0, 0)

const currentMonth = ref(
    props.modelValue
        ? new Date(props.modelValue + 'T00:00:00')
        : new Date(today)
)

const viewMode = ref('days') // 'days' | 'years'
const yearsListEl = ref(null)

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const monthLabel = computed(() => {
    return currentMonth.value.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
})

const minYear = computed(() => (props.min ? new Date(props.min + 'T00:00:00').getFullYear() : null))

const yearsList = computed(() => {
    const start = minYear.value ?? today.getFullYear() - 10
    const end = today.getFullYear() + 20
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

async function openYearPicker() {
    viewMode.value = 'years'
    await nextTick()
    yearsListEl.value?.querySelector('.yearItem.selected')?.scrollIntoView({ block: 'center' })
}

function selectYear(year) {
    if (minYear.value !== null && year < minYear.value) return
    const d = new Date(currentMonth.value)
    d.setFullYear(year)
    currentMonth.value = d
    viewMode.value = 'days'
}

const calendarDays = computed(() => {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth()

    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrev = new Date(year, month, 0).getDate()

    const days = []

    for (let i = firstDay - 1; i >= 0; i--) {
        days.push({ day: daysInPrev - i, current: false, date: null })
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d)
        date.setHours(0, 0, 0, 0)
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        const minDate = props.min ? new Date(props.min + 'T00:00:00') : null
        const isPast = minDate ? date < minDate : false
        days.push({
            day: d,
            current: true,
            date: dateStr,
            isToday: date.getTime() === today.getTime(),
            isSelected: dateStr === props.modelValue,
            isPast,
            hasTrip: tripDates.value.has(dateStr),
        })
    }

    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
        days.push({ day: d, current: false, date: null })
    }

    return days
})

function toDateStr(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function fetchTripDates() {
    if (!props.routeId) return

    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const lastOfMonth = new Date(year, month + 1, 0)

    const dateFrom = firstOfMonth < today ? today : firstOfMonth
    if (dateFrom > lastOfMonth) {
        tripDates.value = new Set()
        return
    }

    const data = await bookingStore.fetchTripCalendar(props.routeId, toDateStr(dateFrom), toDateStr(lastOfMonth))
    tripDates.value = new Set(data.dates)
}

watch(() => [props.routeId, currentMonth.value], fetchTripDates, { immediate: true })

function prevMonth() {
    const d = new Date(currentMonth.value)
    d.setMonth(d.getMonth() - 1)
    currentMonth.value = d
}

function nextMonth() {
    const d = new Date(currentMonth.value)
    d.setMonth(d.getMonth() + 1)
    currentMonth.value = d
}

function selectDay(day) {
    if (!day.current || day.isPast) return
    emit('update:modelValue', day.date)
}
</script>

<template>
    <div class="calendar" @click.stop>

        <!-- VISTA DE DIAS -->
        <template v-if="viewMode === 'days'">
            <div class="calHeader">
                <button class="navBtn" @click.stop="prevMonth">
                    <i class="fi fi-rs-angle-left" />
                </button>
                <button class="monthLabel" @click.stop="openYearPicker">{{ monthLabel }}</button>
                <button class="navBtn" @click.stop="nextMonth">
                    <i class="fi fi-rs-angle-right" />
                </button>
            </div>

            <div class="weekDays">
                <span v-for="w in weekDays" :key="w" class="weekDay">{{ w }}</span>
            </div>

            <div class="daysGrid">
                <button v-for="(day, i) in calendarDays" :key="i" class="dayBtn" :class="{
                    outside: !day.current,
                    today: day.isToday && !day.isSelected,
                    selected: day.isSelected,
                    past: day.isPast,
                    disabled: !day.current || day.isPast,
                }" @click.stop="selectDay(day)">
                    {{ day.day }}
                    <i v-if="day.hasTrip" class="fi fi-rs-bus dayTripIcon" />
                </button>
            </div>
        </template>

        <!-- VISTA DE ANOS -->
        <template v-else>
            <div class="calHeader">
                <button class="navBtn" @click.stop="viewMode = 'days'">
                    <i class="fi fi-rs-angle-left" />
                </button>
                <span class="monthLabel static">Selecionar ano</span>
                <span class="navBtn placeholder" />
            </div>

            <div class="yearsList" ref="yearsListEl">
                <button v-for="year in yearsList" :key="year" type="button" class="yearItem" :class="{
                    selected: year === currentMonth.getFullYear(),
                    disabled: minYear !== null && year < minYear,
                }" @click.stop="selectYear(year)">
                    {{ year }}
                </button>
            </div>
        </template>

    </div>
</template>

<style scoped>

.calendar {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  width: min(300px, calc(100vw - 32px));
  background: #fff;
  border: 1.5px solid #E0E0E0;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 14px;
  z-index: 300;
  user-select: none;
}

.calHeader {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}

.navBtn {
    width: 30px;
    height: 30px;
    border: none;
    background: #f5f5f5;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #555;
    font-size: 12px;
    transition: background 0.15s;
}

.navBtn:hover {
    background: #ebebeb;
}

.monthLabel {
    font-size: 14px;
    font-weight: 600;
    color: #221F20;
    text-transform: capitalize;
    border: none;
    background: none;
    padding: 4px 8px;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Ubuntu', sans-serif;
    transition: background 0.15s;
}

.monthLabel:hover {
    background: #f5f5f5;
}

.monthLabel.static {
    cursor: default;
}

.monthLabel.static:hover {
    background: none;
}

.navBtn.placeholder {
    background: none;
    pointer-events: none;
}

.weekDays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 6px;
}

.weekDay {
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    color: #bbb;
    padding: 4px 0;
    text-transform: uppercase;
}

.daysGrid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
}

.dayBtn {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border: none;
    background: transparent;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #221F20;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.12s, color 0.12s;
    font-family: 'Ubuntu', sans-serif;
}

.dayTripIcon {
    position: absolute;
    bottom: -2px;
    font-size: 11px;
    color: #922877;
}

.dayBtn.selected .dayTripIcon {
    color: #fff;
}

.dayBtn:hover:not(.disabled) {
    background: rgba(163, 32, 106, 0.08);
    color: #922877;
}

.dayBtn.outside {
    color: #ddd;
    cursor: default;
}

.dayBtn.today {
    border: 1.5px solid #922877;
    color: #922877;
    font-weight: 700;
}

.dayBtn.selected {
    background: #922877;
    color: #fff;
    font-weight: 700;
}

.dayBtn.selected:hover {
    background: #922877;
    color: #fff;
}

.dayBtn.past {
    color: #ccc;
    cursor: not-allowed;
}

.dayBtn.disabled {
    pointer-events: none;
}

/* YEARS */
.yearsList {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 260px;
    overflow-y: auto;
}

.yearItem {
    width: 100%;
    padding: 11px 0;
    border: none;
    background: transparent;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #221F20;
    cursor: pointer;
    text-align: center;
    transition: background 0.12s, color 0.12s;
    font-family: 'Ubuntu', sans-serif;
    flex-shrink: 0;
}

.yearItem:hover:not(.disabled) {
    background: rgba(163, 32, 106, 0.08);
    color: #922877;
}

.yearItem.selected {
    background: #922877;
    color: #fff;
}

.yearItem.disabled {
    color: #ccc;
    cursor: not-allowed;
}
</style>