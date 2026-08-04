<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import QRCode from 'qrcode'
import { formatDate } from '../utils/formatDate'
import LogoPD from '../assets/LogoPD.svg'

const props = defineProps({
    booking: { type: Object, required: true },
    tripInfo: { type: Object, default: () => ({}) },
})

const root = ref(null)

defineExpose({ root })

// Siglas das cidades. Espelham o CITY_CODES do TicketPdfService - manter os
// dois em sincronia enquanto forem fixos no codigo.
const cityCodes = {
    Maputo: 'MPM',
    Johannesburg: 'JNB',
}

// Moradas e contactos dos balcoes. Espelham o config/company.php do backend.
const branches = [
    {
        name: 'Balcão da Sede • Maputo',
        address: 'Av. Acordos de Lusaka, n° 3237, Rés-do-chão',
        phones: '+258 21 415544 · +258 86 188 1538',
    },
    {
        name: 'Balcão de Johannesburg',
        address: '122 Bree Street, Johannesburg 2001, Gauteng',
        phones: '+27 11 555 0142 · +27 82 555 0198',
    },
]

function code(city) {
    if (!city) return '--'
    return cityCodes[city] ?? city.slice(0, 3).toUpperCase()
}

const originCode = computed(() => code(props.tripInfo.origin))
const destinationCode = computed(() => code(props.tripInfo.destination))

const statusLabel = computed(() => {
    const map = { confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado' }
    return map[props.booking.status] ?? props.booking.status
})

const methodLabel = computed(() => {
    const map = {
        cash: 'Numerário',
        transfer_mz: 'Transf. MZ',
        transfer_za: 'Transf. ZA',
        mpesa: 'M-Pesa',
        emola: 'E-Mola',
        card: 'Cartão',
        pos: 'POS',
        deposit: 'Depósito',
    }
    return map[props.booking.payment_method] ?? '--'
})

function money(value) {
    if (value === null || value === undefined || value === '') return null
    return Number(value).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const priceMzn = computed(() => money(props.tripInfo.price_mzn) ?? '--')
const priceZar = computed(() => money(props.tripInfo.price_zar) ?? '--')

const paidLabel = computed(() => {
    const total = props.booking.total_amount
    if (total === null || total === undefined || total === '') return null
    return `${money(total)} ${props.booking.currency === 'ZAR' ? 'R' : 'MT'}`
})

const boardingLabel = computed(() => {
    const stop = props.booking.boarding_stop ?? 'Sede'
    const time = props.booking.boarding_time?.slice(0, 5)
    return time ? `${stop} · ${time}` : stop
})

const qrImage = ref('')

async function buildQr() {
    if (!props.booking.ticket_number) return
    const url = `${window.location.origin}/bilhete/${props.booking.ticket_number}`
    qrImage.value = await QRCode.toDataURL(url, { margin: 0, width: 240 })
}

onMounted(buildQr)
watch(() => props.booking.ticket_number, buildQr)
</script>

<template>
    <div class="ticketCard" ref="root">

        <!-- CORPO -->
        <div class="main">

            <div class="head">
                <img :src="LogoPD" alt="Portador Diário" class="brandLogo" />
                <div class="headRight">
                    <span class="label">Bilhete N</span>
                    <span class="ticketNo">{{ booking.ticket_number }}</span>
                </div>
            </div>

            <div class="rule" />

            <div class="routeRow">
                <div class="routeSide">
                    <span class="iata">{{ originCode }}</span>
                    <span class="city">{{ tripInfo.origin ?? '--' }}</span>
                    <span class="leg">Partida . {{ booking.boarding_time?.slice(0, 5) ?? tripInfo.time ?? '--' }}</span>
                </div>

                <div class="track">
                    <span class="dot" />
                    <span class="dash" />
                    <span class="busIcon"><i class="fi fi-rs-bus" /></span>
                    <span class="dash" />
                    <span class="dot" />
                </div>

                <div class="routeSide right">
                    <span class="iata">{{ destinationCode }}</span>
                    <span class="city">{{ tripInfo.destination ?? '--' }}</span>
                    <span class="leg">Destino</span>
                </div>
            </div>

            <div class="grid">
                <div class="gridRow">
                    <div class="gridCell" style="flex: 0 0 26%;">
                        <span class="label">Data</span>
                        <span class="value">{{ formatDate(tripInfo.date) }}</span>
                    </div>
                    <div class="gridCell" style="flex: 0 0 20%;">
                        <span class="label">Hora</span>
                        <span class="value">{{ tripInfo.time ?? '--' }}</span>
                    </div>
                    <div class="gridCell" style="flex: 1 1 auto;">
                        <span class="label">Passageiro</span>
                        <span class="value">{{ booking.passenger_name ?? '--' }}</span>
                    </div>
                </div>

                <div class="gridRow last">
                    <div class="gridCell" style="flex: 0 0 30%;">
                        <span class="label">Passaporte</span>
                        <span class="value">{{ booking.passenger_passport ?? '--' }}</span>
                    </div>
                    <div class="gridCell" style="flex: 1 1 auto;">
                        <span class="label">Embarque</span>
                        <span class="value">{{ boardingLabel }}</span>
                    </div>
                    <div class="gridCell" style="flex: 0 0 16%;">
                        <span class="label">Lugar</span>
                        <span class="value">{{ booking.seat_number ?? '--' }}</span>
                    </div>
                    <div class="gridCell" style="flex: 0 0 26%;">
                        <span class="label">Estado</span>
                        <span class="value" :class="{
                            ok: booking.status === 'confirmed',
                            warn: booking.status === 'pending',
                            bad: booking.status === 'cancelled',
                        }">
                            <span class="statusDot" />{{ statusLabel }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="money">
                <div class="moneyCell">
                    <span class="moneyLabel">Preço MZN</span>
                    <span class="moneyValue">{{ priceMzn }} <small>MT</small></span>
                </div>
                <div class="moneyCell">
                    <span class="moneyLabel">Preço ZAR</span>
                    <span class="moneyValue">{{ priceZar }} <small>R</small></span>
                </div>
                <div class="moneyCell" v-if="paidLabel">
                    <span class="moneyLabel accent">PAGO</span>
                    <span class="moneyValue accent">{{ paidLabel }}</span>
                </div>
                <div class="moneyCell">
                    <span class="moneyLabel">Método de pagamento</span>
                    <span class="moneyValue">{{ methodLabel }}</span>
                </div>
            </div>

            <div class="dashed" />

            <div class="contacts">
                <div class="contactCell" v-for="branch in branches" :key="branch.name">
                    <span class="contactName">
                        <i class="fi fi-rs-marker" />{{ branch.name }}
                    </span>
                    <span class="contactLine">{{ branch.address }}</span>
                    <span class="contactLine">{{ branch.phones }}</span>
                </div>
            </div>

        </div>

        <!-- TALAO -->
        <div class="stub">
            <span class="stubLabel">LUGAR</span>
            <span class="stubSeat">{{ booking.seat_number ?? '--' }}</span>

            <span class="stubLeg">{{ originCode }} → {{ destinationCode }}</span>
            <span class="stubDate">{{ formatDate(tripInfo.date) }} · {{ tripInfo.time ?? '--' }}</span>

            <div class="qrBox">
                <img v-if="qrImage" :src="qrImage" alt="QR" />
            </div>

            <span class="stubTicket">{{ booking.ticket_number }}</span>
            <span class="stubName">{{ booking.passenger_name ?? '--' }}</span>
        </div>

    </div>
</template>

<style scoped>
.ticketCard {
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    width: 100%;
    max-width: 620px;
    font-family: inherit;
}

/* ---------- CORPO ---------- */
.main {
    flex: 1;
    min-width: 0;
    padding: 18px 18px 16px;
    display: flex;
    flex-direction: column;
}

.head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.brandLogo {
    height: 34px;
    width: auto;
}

.headRight {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
}

.label {
    font-size: 9px;
    color: #999;
}

.ticketNo {
    font-size: 13px;
    font-weight: 700;
    color: #221F20;
    white-space: nowrap;
}

.rule {
    height: 1.5px;
    background: #922877;
    margin: 12px 0 14px;
}

/* Rota */
.routeRow {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
}

.routeSide {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
}

.routeSide.right {
    align-items: flex-end;
    text-align: right;
}

.iata {
    font-size: 27px;
    font-weight: 800;
    color: #221F20;
    line-height: 1.05;
}

.city {
    font-size: 11px;
    color: #777;
}

.leg {
    font-size: 11px;
    font-weight: 600;
    color: #922877;
    margin-top: 2px;
}

.track {
    display: flex;
    align-items: center;
    gap: 3px;
    flex: 1;
    padding-top: 12px;
}

.dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #922877;
    flex-shrink: 0;
}

.dash {
    flex: 1;
    border-top: 1.5px dotted #922877;
}

.busIcon {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1.5px solid #922877;
    color: #922877;
    font-size: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

/* Grelha */
.grid {
    border: 1px solid #E6E6E6;
    border-radius: 8px;
    margin-top: 16px;
    overflow: hidden;
}

/* Duas linhas explicitas em vez de um unico flex com wrap: assim a quebra
   acontece sempre onde deve, independentemente da largura. */
.gridRow {
    display: flex;
    border-bottom: 1px solid #EFEFEF;
}

.gridRow.last {
    border-bottom: none;
}

.gridCell {
    min-width: 0;
    padding: 8px 10px;
    border-right: 1px solid #EFEFEF;
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.gridCell:last-child {
    border-right: none;
}

/* Sem nowrap/ellipsis: o bilhete tem de mostrar sempre o dado completo,
   mesmo que a celula cresca em altura. */
.value {
    font-size: 12px;
    font-weight: 700;
    color: #221F20;
    overflow-wrap: anywhere;
}

.value.ok { color: #2e7d32; }
.value.warn { color: #f57f17; }
.value.bad { color: #c62828; }

.statusDot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    margin-right: 4px;
    vertical-align: middle;
}

/* Faixa dos precos */
.money {
    display: flex;
    flex-wrap: wrap;
    background: #1C1B2E;
    border-radius: 8px;
    margin-top: 12px;
    overflow: hidden;
}

/* flex-basis generoso + wrap: em vez de espremer as quatro celulas ate os
   valores se sobreporem, passam para a linha de baixo. */
.moneyCell {
    flex: 1 1 120px;
    min-width: 0;
    padding: 9px 11px;
    border-right: 1px solid rgba(255, 255, 255, 0.12);
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.moneyCell:last-child {
    border-right: none;
}

.moneyLabel {
    font-size: 8px;
    color: rgba(255, 255, 255, 0.6);
    letter-spacing: 0.04em;
}

.moneyValue {
    font-size: 13px;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
}

.moneyValue small {
    font-size: 9px;
    font-weight: 600;
    opacity: 0.75;
}

.moneyLabel.accent,
.moneyValue.accent {
    color: #8B9B1A;
}

.dashed {
    border-top: 1.5px dashed #E0E0E0;
    margin: 14px 0 12px;
}

/* Contactos */
.contacts {
    display: flex;
    gap: 16px;
}

.contactCell {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.contactName {
    font-size: 10px;
    font-weight: 700;
    color: #922877;
    display: flex;
    align-items: center;
    gap: 4px;
}

.contactLine {
    font-size: 9.5px;
    color: #888;
    line-height: 1.45;
}

/* ---------- TALAO ---------- */
.stub {
    width: 30%;
    flex-shrink: 0;
    background: linear-gradient(160deg, #A32B84 0%, #6E1F5B 100%);
    padding: 18px 14px 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    color: #fff;
}

.stubLabel {
    font-size: 10px;
    letter-spacing: 0.14em;
    color: rgba(255, 255, 255, 0.75);
    align-self: flex-start;
}

.stubSeat {
    font-size: 48px;
    font-weight: 800;
    line-height: 1;
    margin-top: 2px;
    align-self: flex-start;
}

.stubLeg {
    font-size: 13px;
    font-weight: 700;
    margin-top: 14px;
    align-self: flex-start;
}

.stubDate {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
    margin-top: 2px;
    align-self: flex-start;
}

.qrBox {
    background: #fff;
    border-radius: 8px;
    padding: 9px;
    margin-top: 18px;
    line-height: 0;
}

.qrBox img {
    width: 104px;
    height: 104px;
    display: block;
}

.stubTicket {
    font-size: 10px;
    font-weight: 700;
    margin-top: 10px;
}

.stubName {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.85);
    margin-top: 1px;
}

/* O cartao quer os seus ~620px. Abaixo disso empilha o talao em baixo em vez
   de espremer as duas colunas lado a lado. */
@media (max-width: 640px) {
    .ticketCard {
        flex-direction: column;
    }

    .stub {
        width: 100%;
    }

    .iata {
        font-size: 22px;
    }

    .stubSeat {
        font-size: 38px;
    }

    .gridRow {
        flex-wrap: wrap;
    }

    .gridCell {
        flex: 1 1 45% !important;
    }
}
</style>
