<script setup>
import { ref, computed } from 'vue'
import { formatDate } from '../utils/formatDate'
import LogoPD from '../assets/LogoPD.svg'

const props = defineProps({
    booking: { type: Object, required: true },
    tripInfo: { type: Object, default: () => ({}) },
})

const root = ref(null)

defineExpose({ root })

const statusLabel = computed(() => {
    const map = { confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado' }
    return map[props.booking.status] ?? props.booking.status
})

const methodLabel = computed(() => {
    const map = {
        cash: 'Dinheiro no local',
        transfer_mz: 'Transferência',
        transfer_za: 'Transferência',
        mpesa: 'M-Pesa',
        emola: 'E-Mola',
        card: 'Cartão',
    }
    return map[props.booking.payment_method] ?? props.booking.payment_method ?? 'Transferência'
})

const weekdayDate = computed(() => {
    if (!props.tripInfo.date) return ''
    const d = new Date(props.tripInfo.date + 'T00:00:00')
    const label = d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    return label.charAt(0).toUpperCase() + label.slice(1)
})

const passportExpiryLabel = computed(() => {
    if (!props.booking.passenger_passport_expiry) return ''
    return ` · Válido até ${formatDate(props.booking.passenger_passport_expiry)}`
})
</script>

<template>
    <div class="ticketCard" ref="root">

        <!-- MARCA -->
        <div class="ticketBrand">
            <img :src="LogoPD" alt="Portador Diário" class="brandLogo" />
        </div>

        <!-- TOP -->
        <div class="ticketTop">
            <div class="ticketTopRow">
                <span class="ticketTypeLabel">Bilhete de Viagem</span>
                <span class="ticketNumber">{{ booking.ticket_number }}</span>
            </div>
            <h2 class="ticketRoute">{{ tripInfo.route ?? 'Maputo → Johannesburg' }}</h2>
            <p class="ticketDate">{{ weekdayDate }}</p>
        </div>

        <div class="dash" />

        <!-- PARTIDA + LUGAR -->
        <div class="ticketGrid">
            <div class="ticketGridItem">
                <div class="ticketGridLabel">
                    <svg class="labelIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 3" />
                    </svg>
                    Partida
                </div>
                <span class="ticketGridValue">{{ booking.boarding_time?.slice(0, 5) ?? tripInfo.time ?? '--' }}</span>
            </div>
            <div class="ticketGridItem right">
                <div class="ticketGridLabel">
                    Lugar
                    <svg class="labelIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M5 11V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6" />
                        <path d="M5 11h9a3 3 0 0 1 3 3v3" />
                        <path d="M5 11v6a1 1 0 0 0 1 1h1" />
                        <path d="M19 17v2a1 1 0 0 1-1 1h-1" />
                        <path d="M5 21h14" />
                    </svg>
                </div>
                <span class="ticketGridValue accent">{{ booking.seat_number ?? '--' }}</span>
                <span class="ticketGridSub">Autocarro</span>
            </div>
        </div>

        <div class="dash" />

        <!-- PASSAGEIRO -->
        <div class="ticketSection">
            <div class="ticketSectionLabel">
                <svg class="labelIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
                </svg>
                Passageiro
            </div>
            <p class="ticketPassengerName">{{ booking.passenger_name ?? '--' }}</p>
            <p class="ticketPassengerDoc">Passaporte: {{ booking.passenger_passport ?? '--' }}{{ passportExpiryLabel }}</p>
        </div>

        <div class="dash" />

        <!-- EMBARQUE -->
        <div class="ticketSection">
            <div class="ticketSectionLabel">Embarque</div>
            <p class="ticketEmbarkValue">{{ booking.boarding_stop ?? 'Sede' }}</p>
        </div>

        <div class="dash" />

        <!-- FOOTER -->
        <div class="ticketFooter">
            <div class="ticketFooterRow">
                <span class="ticketFooterLabel">Estado</span>
                <span class="statusBadge" :class="{
                    green: booking.status === 'confirmed',
                    orange: booking.status === 'pending',
                    red: booking.status === 'cancelled',
                }">
                    {{ statusLabel }}
                </span>
            </div>
            <div class="ticketFooterRow">
                <span class="ticketFooterLabel">Pagamento</span>
                <div class="paymentRight">
                    <span class="ticketFooterValue">{{ methodLabel }}</span>
                    <span v-if="booking.payment_reference" class="ticketFooterRef">
                        REF: {{ booking.payment_reference }}
                    </span>
                </div>
            </div>
        </div>

    </div>
</template>

<style scoped>
.ticketCard {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 360px;
    overflow: hidden;
    position: relative;
}

.ticketBrand {
    padding: 16px 20px 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid #F5F5F5;
    /* background: rgba(146, 40, 119, 0.03); */
}

.brandLogo {
    height: 24px;
    width: auto;
}

.ticketTop {
    padding: 16px 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.ticketTopRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.ticketTypeLabel {
    font-size: 10px;
    font-weight: 700;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.ticketNumber {
    font-size: 11px;
    font-weight: 700;
    color: #922877;
    font-family: 'Courier New', monospace;
}

.ticketRoute {
    font-size: 20px;
    font-weight: 800;
    color: #221F20;
    margin-top: 4px;
}

.ticketDate {
    font-size: 13px;
    color: #888;
}

/* DASHED DIVIDER */
.dash {
    width: 100%;
    height: 0;
    border-top: 1.5px dashed #E8E8E8;
    position: relative;
}

.dash::before,
.dash::after {
    content: '';
    position: absolute;
    top: -10px;
    width: 18px;
    height: 18px;
    background: #F6F6F6;
    border-radius: 50%;
}

.dash::before {
    left: -10px;
}

.dash::after {
    right: -10px;
}

.ticketGrid {
    padding: 14px 20px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
}

.ticketGridItem {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.ticketGridItem.right {
    align-items: flex-end;
}

.ticketGridLabel {
    font-size: 10px;
    font-weight: 700;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 4px;
}

.labelIcon {
    width: 11px;
    height: 11px;
    color: #aaa;
    flex-shrink: 0;
}

.ticketGridValue {
    font-size: 24px;
    font-weight: 800;
    color: #221F20;
}

.ticketGridValue.accent {
    color: #922877;
}

.ticketGridSub {
    font-size: 11px;
    color: #bbb;
}

.ticketSection {
    padding: 14px 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.ticketSectionLabel {
    font-size: 10px;
    font-weight: 700;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 4px;
}

.ticketPassengerName {
    font-size: 16px;
    font-weight: 700;
    color: #221F20;
}

.ticketPassengerDoc {
    font-size: 12px;
    color: #888;
}

.ticketEmbarkValue {
    font-size: 14px;
    font-weight: 600;
    color: #221F20;
}

.ticketFooter {
    background: rgba(146, 40, 119, 0.04);
    padding: 14px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.ticketFooterRow {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.ticketFooterLabel {
    font-size: 11px;
    font-weight: 700;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
}

.paymentRight {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
}

.ticketFooterValue {
    font-size: 14px;
    font-weight: 700;
    color: #221F20;
}

.ticketFooterRef {
    font-size: 11px;
    color: #aaa;
}

.statusBadge {
    font-size: 12px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 50px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.statusBadge.green {
    background: #e8f5e9;
    color: #2e7d32;
}

.statusBadge.orange {
    background: #fff8e1;
    color: #f57f17;
}

.statusBadge.red {
    background: #fce4ec;
    color: #c62828;
}
</style>
