<script setup>
import { ref, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toPng } from 'html-to-image'
import { useToast } from '../../composables/useToast'
import { formatDate } from '../../utils/formatDate'
import TicketModal from '../../components/TicketModal.vue'
import TicketCard from '../../components/TicketCard.vue'

const router = useRouter()
const route = useRoute()
const { showToast } = useToast()

const bookings = JSON.parse(route.query.bookings ?? '[]')
const selectedTicket = ref(null)
const renderingForCapture = ref(false)
const downloading = ref(false)
const captureRefs = ref([])

const tripInfo = computed(() => ({
  route: route.query.route_name ?? 'Maputo → Johannesburg',
  date: route.query.date ?? '',
  time: route.query.time ?? '17:00',
}))

const tripSummary = computed(() => {
  const parts = [tripInfo.value.route]
  if (tripInfo.value.date) parts.push(formatDate(tripInfo.value.date))
  parts.push(tripInfo.value.time)
  return parts.join(' · ')
})

const isPlural = computed(() => bookings.length > 1)

function viewTicket(booking) {
  selectedTicket.value = booking
}

function sendWhatsApp(allBookings) {
  const numero = '258862051706'
  const ticketsText = allBookings
    .map((b, i) =>
      `Bilhete ${i + 1}: ${b.ticket_number}\n` +
      `Assento: ${b.seat_number}\n` +
      `Passageiro: ${b.passenger_name}`
    )
    .join('\n\n')
  const msg = `Olá, aqui estão os detalhes da minha reserva:\n\n${ticketsText}`
  window.open('https://wa.me/' + numero + '?text=' + encodeURIComponent(msg), '_blank')
}

async function downloadImage(el, filename) {
  const dataUrl = await toPng(el, { pixelRatio: 2, backgroundColor: '#ffffff' })
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

async function downloadTicket(allBookings) {
  if (downloading.value) return

  downloading.value = true
  renderingForCapture.value = true
  await nextTick()

  try {
    for (let i = 0; i < allBookings.length; i++) {
      const el = captureRefs.value[i]?.root
      if (!el) continue
      await downloadImage(el, `bilhete-${allBookings[i].ticket_number}.png`)
    }
    showToast('success', isPlural.value ? 'Bilhetes descarregados.' : 'Bilhete descarregado.')
  } catch (err) {
    showToast('error', 'Não foi possível gerar o(s) bilhete(s). Tente novamente.')
  } finally {
    renderingForCapture.value = false
    downloading.value = false
  }
}

function newBooking() {
  router.push('/booking')
}
</script>

<template>
  <div class="page">

    <!-- SUCCESS BANNER -->
    <div class="banner">
      <div class="bannerCheck">
        <i class="fi fi-sr-check checkIcon" />
      </div>
      <h1 class="bannerTitle">Reserva confirmada!</h1>
      <p class="bannerSub">O seu lugar está garantido.</p>
      <p class="bannerTrip">{{ tripSummary }}</p>
    </div>

    <!-- CONTENT -->
    <div class="content">

      <!-- BILHETES -->
      <div class="ticketList">
        <div
          v-for="(booking, idx) in bookings"
          :key="idx"
          class="ticketRow"
        >
          <div class="ticketRowLeft">
            <div class="seatBadge">{{ booking.seat_number }}</div>
            <div class="ticketInfo">
              <span class="ticketLabel">Bilhete #{{ idx + 1 }}</span>
              <span class="ticketName">{{ booking.passenger_name }}</span>
              <span class="ticketNum">{{ booking.ticket_number }}</span>
            </div>
          </div>
          <button class="eyeBtn" @click="viewTicket(booking)">
            <i class="fi fi-rs-eye" />
          </button>
        </div>
      </div>

      <!-- ACÇÕES -->
      <div class="actionsCard">
        <p class="actionsTitle">
          {{ isPlural ? `O que deseja fazer com os ${bookings.length} bilhetes?` : 'O que deseja fazer com o bilhete?' }}
        </p>

        <button class="actionRow" :class="{ disabled: downloading }" :disabled="downloading" @click="downloadTicket(bookings)">
          <div class="actionIconWrap dark">
            <i class="fi fi-rs-download actionIcon" />
          </div>
          <div class="actionText">
            <span class="actionLabel">
              {{ downloading ? 'A gerar...' : (isPlural ? 'Baixar bilhetes (Imagens)' : 'Baixar bilhete (Imagem)') }}
            </span>
            <span class="actionSub">
              {{ isPlural ? 'Guarda os bilhetes na Galeria do teu dispositivo' : 'Guarda o bilhete na Galeria do teu dispositivo' }}
            </span>
          </div>
          <i class="fi fi-rs-angle-right actionArrow" />
        </button>

        <div class="actionDivider" />

        <button class="actionRow" @click="sendWhatsApp(bookings)">
          <div class="actionIconWrap green">
          <i class="fi fi-brands-whatsapp actionIcon" />
          </div>
          <div class="actionText">
            <span class="actionLabel">Enviar por WhatsApp</span>
            <span class="actionSub">{{ isPlural ? 'Receba os bilhetes no seu WhatsApp' : 'Receba o bilhete no seu WhatsApp' }}</span>
          </div>
          <i class="fi fi-rs-angle-right actionArrow" />
        </button>
      </div>

      <!-- NOTA IMPORTANTE -->
      <div class="infoBox">
        <div class="infoTop">
          <span class="infoWarn"><i class="fi fi-sr-triangle-warning" /></span>
          <span class="infoTitle">Informação importante</span>
        </div>
        <p class="infoText">
          Esta reserva garante apenas o lugar do passageiro.
          O transporte de mercadorias ou cargas que não sejam bens de uso pessoal
          está sujeito à cobrança de taxas adicionais.
        </p>
        <p class="infoContact">
          Para conhecer as condições e os respectivos custos, contacte o nosso balcão pelo
          <a href="tel:+258867732237" class="infoPhone">+258 867732237</a>
        </p>
      </div>

      <!-- NOVA RESERVA -->
      <button class="newBookingBtn" @click="newBooking">
        Fazer outra reserva
      </button>

    </div>

    <!-- TICKET MODAL -->
    <TicketModal
      v-if="selectedTicket"
      :booking="selectedTicket"
      :trip-info="tripInfo"
      @close="selectedTicket = null"
    />

    <!-- CARTOES ESCONDIDOS PARA CAPTURA DE IMAGEM -->
    <div v-if="renderingForCapture" class="captureArea">
      <TicketCard
        v-for="(booking, idx) in bookings"
        :key="idx"
        :ref="el => (captureRefs[idx] = el)"
        :booking="booking"
        :trip-info="tripInfo"
      />
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

/* BANNER */
.banner {
  background: #922877;
  padding: 48px 24px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.bannerCheck {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2.5px solid rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.checkIcon {
  font-size: 24px;
  color: #fff;
  position: relative;
  top: 1px;
}

.bannerTitle {
  font-size: 24px;
  font-weight: 800;
  color: #fff;
}

.bannerSub {
  font-size: 14px;
  color: #fff;
}

.bannerTrip {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 4px;
}

/* CONTENT */
.content {
  flex: 1;
  padding: 0 16px 48px;
  margin-top: -40px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 480px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

/* TICKET LIST */
.ticketList {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #EEEEEE;
}

.ticketRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  gap: 12px;
  border-bottom: 1px solid #F5F5F5;
}

.ticketRow:last-child { border-bottom: none; }

.ticketRowLeft {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.seatBadge {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #922877;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ticketInfo {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.ticketLabel {
  font-size: 12px;
  font-weight: 700;
  color: #922877;
}

.ticketName {
  font-size: 14px;
  font-weight: 600;
  color: #221F20;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ticketNum {
  font-size: 11px;
  color: #bbb;
  font-family: 'Courier New', monospace;
}

.eyeBtn {
  width: 34px;
  height: 34px;
  border: none;
  background: rgba(146, 40, 119, 0.08);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #922877;
  font-size: 14px;
  flex-shrink: 0;
  transition: background 0.15s;
}

.eyeBtn:hover { background: rgba(146, 40, 119, 0.15); }

/* ACTIONS */
.actionsCard {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #EEEEEE;
  overflow: hidden;
}

.actionsTitle {
  font-size: 14px;
  font-weight: 600;
  color: #221F20;
  padding: 16px 18px 12px;
  border-bottom: 1px solid #F5F5F5;
}

.actionRow {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.actionRow:hover { background: #FAFAFA; }

.actionRow.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.actionIconWrap {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.actionIconWrap.dark {
  background: #221F20;
}

.actionIconWrap.green {
  background: #25D366;
}

.actionIcon {
  font-size: 18px;
  color: #fff;
  position: relative;
  top: 1px;
}

.actionText {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.actionLabel {
  font-size: 14px;
  font-weight: 600;
  color: #221F20;
}

.actionSub {
  font-size: 12px;
  color: #888;
}

.actionArrow {
  font-size: 13px;
  color: #ccc;
  flex-shrink: 0;
}

.actionDivider {
  height: 1px;
  background: #F5F5F5;
  margin: 0 18px;
}

/* INFO BOX */
.infoBox {
  background: #fff;
  border-radius: 14px;
  border: 1px solid #EEEEEE;
  border: 1px solid #FFB300; 
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.infoTop {
  display: flex;
  align-items: center;
  gap: 8px;
}

.infoWarn { 
    font-size: 16px; 
    color: #FFB300;
}

.infoTitle {
  font-size: 14px;
  font-weight: 700;
  color: #221F20;
}

.infoText {
  font-size: 13px;
  color: #666;
  line-height: 1.55;
}

.infoContact {
  font-size: 13px;
  color: #666;
  line-height: 1.55;
}

.infoPhone {
  color: #922877;
  font-weight: 700;
  text-decoration: none;
}

.infoPhone:hover { text-decoration: underline; }

/* NEW BOOKING */
.newBookingBtn {
  width: 100%;
  height: 50px;
  background: #922877;
  color: #fff;
  border: none;
  border-radius: 50px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s;
  font-family: 'Ubuntu', sans-serif;
  margin-top: 4px;
}

.newBookingBtn:hover { opacity: 0.9; }

/* CAPTURA ESCONDIDA */
.captureArea {
  position: fixed;
  top: 0;
  left: -10000px;
  width: 360px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* DESKTOP */
@media (min-width: 768px) {
  .banner { padding: 64px 40px 100px; }
  .content { padding: 0 40px 64px; }
}

@media (min-width: 1024px) {
  .banner { padding: 80px 80px 120px; }
  .content { padding: 0 80px 80px; }
}
</style>