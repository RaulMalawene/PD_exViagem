<script setup>
import { ref, onUnmounted } from 'vue'
import { useDriverStore } from '../stores/driverStore'

const props = defineProps({
  driverId: {
    type: [Number, String],
    required: true,
  },
  photoUrl: {
    type: String,
    default: null,
  },
})

const emit = defineEmits(['photo-updated'])

const driverStore = useDriverStore()

const status = ref('idle')
const qrImage = ref(null)
const captureUrl = ref(null)
const errorMessage = ref('')
const isDev = import.meta.env.DEV

let pollTimer = null
const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 5 * 60 * 1000

function stopPolling() {
  clearInterval(pollTimer)
  pollTimer = null
}

function startPolling(initialPhotoUrl) {
  stopPolling()
  const startedAt = Date.now()

  pollTimer = setInterval(async () => {
    try {
      const res = await driverStore.fetchDriver(props.driverId)
      const newPhotoUrl = res.data.photo_url

      if (newPhotoUrl && newPhotoUrl !== initialPhotoUrl) {
        stopPolling()
        status.value = 'done'
        emit('photo-updated', newPhotoUrl)
        return
      }

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stopPolling()
        status.value = 'timeout'
      }
    } catch {
      stopPolling()
      status.value = 'error'
      errorMessage.value = 'Não foi possível verificar o estado da foto.'
    }
  }, POLL_INTERVAL_MS)
}

async function generateQr() {
  status.value = 'generating'
  errorMessage.value = ''

  try {
    const res = await driverStore.generatePhotoToken(props.driverId)
    captureUrl.value = `${window.location.origin}/captura-motorista/${res.data.token}`
    const { default: QRCode } = await import('qrcode')
    qrImage.value = await QRCode.toDataURL(captureUrl.value)
    status.value = 'waiting'
    startPolling(props.photoUrl)
  } catch {
    status.value = 'error'
    errorMessage.value = 'Não foi possível gerar o código QR.'
  }
}

onUnmounted(() => stopPolling())
</script>

<template>
  <div class="qrWrapper">
    <div v-if="status === 'idle' || status === 'error'" class="qrIdle">
      <button v-if="photoUrl" type="button" class="qrButton qrButton--edit" @click="generateQr">
        <i class="fi fi-rs-pencil" />
        Editar foto
      </button>
      <button v-else type="button" class="qrButton" @click="generateQr">
        <i class="fi fi-rs-qrcode" />
        Gerar QR code
      </button>
      <p v-if="errorMessage" class="qrError">{{ errorMessage }}</p>
    </div>

    <div v-else-if="status === 'generating'" class="qrState">
      <div class="spinner" />
      <span>A gerar código...</span>
    </div>

    <div v-else-if="status === 'waiting'" class="qrWaiting">
      <img :src="qrImage" alt="QR code para captura de foto" class="qrImage" />
      <p class="qrHint">Aponte a câmara do telemóvel para tirar a foto do motorista.</p>
      <a v-if="isDev" :href="captureUrl" target="_blank" rel="noopener" class="qrDevLink">
        {{ captureUrl }}
      </a>
      <div class="qrState">
        <div class="spinner" />
        <span>A aguardar foto...</span>
      </div>
    </div>

    <div v-else-if="status === 'done'" class="qrDone">
      <i class="fi fi-sr-check-circle" />
      <span>Foto recebida com sucesso.</span>
    </div>

    <div v-else-if="status === 'timeout'" class="qrError">
      <span>Tempo esgotado à espera da fotografia.</span>
      <button type="button" class="qrButton" @click="generateQr">Tentar novamente</button>
    </div>
  </div>
</template>

<style scoped>
.qrWrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qrIdle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.qrButton {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: #922877;
  color: white;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.qrButton:hover {
  opacity: 0.9;
}

.qrButton--edit {
  background: #f0f0f0;
  color: #555;
}

.qrState {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid #f0f0f0;
  border-top-color: #922877;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.qrWaiting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.qrImage {
  width: 160px;
  height: 160px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.qrHint {
  font-size: 12px;
  color: #999;
  text-align: center;
  max-width: 220px;
}

.qrDevLink {
  font-size: 11px;
  color: #922877;
  text-align: center;
  word-break: break-all;
  max-width: 240px;
}

.qrDone {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0A3622;
  font-weight: 600;
  font-size: 13px;
}

.qrDone i {
  color: #27ae60;
}

.qrError {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #d33939;
  font-size: 13px;
}
</style>
