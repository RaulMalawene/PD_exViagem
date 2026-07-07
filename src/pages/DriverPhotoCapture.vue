<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import imageCompression from 'browser-image-compression'
import publicDriverPhotoService from '../services/publicDriverPhotoService'
import { parseApiError } from '../utils/parseApiError'

const route = useRoute()
const token = route.params.token

const status = ref('loading')
const driverName = ref('')
const errorMessage = ref('')
const fileInput = ref(null)

async function loadSession() {
  try {
    const res = await publicDriverPhotoService.getCaptureInfo(token)
    driverName.value = res.data.driver_name
    status.value = 'ready'
  } catch (err) {
    errorMessage.value = parseApiError(err)
    status.value = 'invalid'
  }
}

function triggerCapture() {
  fileInput.value?.click()
}

async function onFileSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return

  status.value = 'uploading'
  errorMessage.value = ''

  try {
    const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 })
    const formData = new FormData()
    formData.append('photo', compressed, file.name)

    await publicDriverPhotoService.upload(token, formData)
    status.value = 'done'
  } catch (err) {
    errorMessage.value = parseApiError(err)
    status.value = 'error'
  }
}

onMounted(() => loadSession())
</script>

<template>
  <div class="captureWrapper">
    <div class="captureCard">
      <div class="captureHeader">
        <i class="fi fi-rs-camera headerIcon" />
        <span>Foto do motorista</span>
      </div>

      <div v-if="status === 'loading'" class="stateBox">
        <div class="spinner" />
        <span>A carregar...</span>
      </div>

      <div v-else-if="status === 'invalid'" class="stateBox stateBox--error">
        <i class="fi fi-sr-cross-circle stateIcon" />
        <span>{{ errorMessage }}</span>
      </div>

      <template v-else-if="status === 'ready'">
        <p class="driverName">{{ driverName }}</p>
        <p class="hint">Tire uma fotografia clara do rosto do motorista.</p>

        <input ref="fileInput" type="file" accept="image/*" capture="environment" class="hiddenInput"
          @change="onFileSelected" />

        <button class="captureBtn" @click="triggerCapture">
          <i class="fi fi-rs-camera" />
          Tirar foto
        </button>
      </template>

      <div v-else-if="status === 'uploading'" class="stateBox">
        <div class="spinner" />
        <span>A enviar foto...</span>
      </div>

      <div v-else-if="status === 'done'" class="stateBox stateBox--success">
        <i class="fi fi-sr-check-circle stateIcon" />
        <span>Foto enviada com sucesso.</span>
        <p class="hint">Já pode fechar esta página.</p>
      </div>

      <div v-else-if="status === 'error'" class="stateBox stateBox--error">
        <i class="fi fi-sr-cross-circle stateIcon" />
        <span>{{ errorMessage }}</span>
        <button class="captureBtn" @click="triggerCapture">Tentar novamente</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.captureWrapper {
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: #f5f5f5;
  font-family: 'Ubuntu', sans-serif;
}

.captureCard {
  width: 100%;
  max-width: 360px;
  background: white;
  border-radius: 12px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.captureHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #922877;
}

.headerIcon {
  font-size: 18px;
}

.driverName {
  font-size: 18px;
  font-weight: 700;
  color: #222;
  text-align: center;
}

.hint {
  font-size: 13px;
  color: #999;
  text-align: center;
}

.hiddenInput {
  display: none;
}

.captureBtn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: #922877;
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.captureBtn:hover {
  opacity: 0.9;
}

.stateBox {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #666;
  font-size: 14px;
}

.stateBox--success {
  color: #0A3622;
}

.stateBox--error {
  color: #58151C;
}

.stateIcon {
  font-size: 32px;
}

.stateBox--success .stateIcon {
  color: #27ae60;
}

.stateBox--error .stateIcon {
  color: #e74c3c;
}

.spinner {
  width: 30px;
  height: 30px;
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
</style>
