<script setup>
import { ref } from 'vue'
import { useDriverStore } from '../stores/driverStore'
import { parseApiError } from '../utils/parseApiError'
import BaseInput from '../components/BaseInput.vue'
import DriverPhotoQr from '../components/DriverPhotoQr.vue'

const props = defineProps({
  driver: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const driverStore = useDriverStore()

const localDriver = ref(props.driver)
const photoUrl = ref(props.driver?.photo_url ?? null)

const form = ref({
  name: props.driver?.name ?? '',
  license_number: props.driver?.license_number ?? '',
  license_expiry: props.driver?.license_expiry ?? '',
  phone: props.driver?.phone ?? '',
  is_active: props.driver?.is_active ?? true,
})

const formErrors = ref({ name: '', license_number: '', license_expiry: '', phone: '' })
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

function clearErrors() {
  formErrors.value = { name: '', license_number: '', license_expiry: '', phone: '' }
}

function validate() {
  clearErrors()
  let valid = true

  if (!form.value.name.trim()) {
    formErrors.value.name = 'O nome é obrigatório.'
    valid = false
  }
  if (!form.value.license_number.trim()) {
    formErrors.value.license_number = 'O número de carta é obrigatório.'
    valid = false
  }
  if (!form.value.license_expiry) {
    formErrors.value.license_expiry = 'A validade da carta é obrigatória.'
    valid = false
  }
  if (!form.value.phone.trim()) {
    formErrors.value.phone = 'O telefone é obrigatório.'
    valid = false
  }

  return valid
}

async function handleSave() {
  if (!validate()) return
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const payload = {
      name: form.value.name,
      license_number: form.value.license_number,
      license_expiry: form.value.license_expiry,
      phone: form.value.phone,
    }

    if (localDriver.value) {
      payload.is_active = form.value.is_active
      const res = await driverStore.updateDriver(localDriver.value.id, payload)
      localDriver.value = res.data
      successMessage.value = 'Alterações salvas com sucesso.'
    } else {
      const res = await driverStore.createDriver(payload)
      localDriver.value = res.data
      photoUrl.value = res.data.photo_url
      successMessage.value = 'Motorista criado. Já pode adicionar a foto.'
    }
  } catch (err) {
    errorMessage.value = parseApiError(err)
  } finally {
    isSaving.value = false
  }
}

function handlePhotoUpdated(newPhotoUrl) {
  photoUrl.value = newPhotoUrl
}

function handleClose() {
  emit('close', !!localDriver.value)
}
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">{{ props.driver ? 'Editar motorista' : 'Novo Motorista' }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="photoSection">
              <div class="avatar">
                <img v-if="photoUrl" :src="photoUrl" alt="Foto do motorista" />
                <i v-else class="fi fi-sr-user avatarIcon" />
              </div>

              <DriverPhotoQr v-if="localDriver" :driverId="localDriver.id" :photoUrl="photoUrl"
                @photo-updated="handlePhotoUpdated" />
              <p v-else class="photoHint">Registre os dados do motorista para poder adicionar a foto.</p>
            </div>

            <div class="formGrid">
              <div class="fieldGroup">
                <BaseInput label="Nome Completo" :modelValue="form.name" @update:modelValue="form.name = $event" />
                <span v-if="formErrors.name" class="fieldError">{{ formErrors.name }}</span>
              </div>

              <div class="fieldGroup">
                <BaseInput label="Nº de Carta" :modelValue="form.license_number"
                  @update:modelValue="form.license_number = $event" />
                <span v-if="formErrors.license_number" class="fieldError">{{ formErrors.license_number }}</span>
              </div>

              <div class="fieldGroup">
                <BaseInput label="Validade da Carta" type="date" :modelValue="form.license_expiry"
                  @update:modelValue="form.license_expiry = $event" />
                <span v-if="formErrors.license_expiry" class="fieldError">{{ formErrors.license_expiry }}</span>
              </div>

              <div class="fieldGroup">
                <BaseInput label="Telefone" :modelValue="form.phone" @update:modelValue="form.phone = $event" />
                <span v-if="formErrors.phone" class="fieldError">{{ formErrors.phone }}</span>
              </div>

              <label v-if="localDriver" class="activeToggle">
                <input type="checkbox" v-model="form.is_active" />
                Motorista activo
              </label>
            </div>

            <p v-if="errorMessage" class="formMessage formMessage--error">{{ errorMessage }}</p>
            <p v-if="successMessage" class="formMessage formMessage--success">{{ successMessage }}</p>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">
              {{ localDriver ? 'Concluir' : 'Cancelar' }}
            </button>
            <button class="btnPrimary" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'A guardar...' : (localDriver ? 'Guardar alterações' : 'Registrar motorista') }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modalCard {
  width: 100%;
  max-width: 520px;
  max-height: calc(100vh - 80px);
  background: white;
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modalHeader {
 background: #922877; 
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.modalTitle {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
}

.closeBtn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  transition: background 0.15s;
}

.closeBtn:hover {
  background: rgba(255, 255, 255, 0.28);
}

.modalBody {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.photoSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatarIcon {
  font-size: 28px;
  color: #bbb;
}

.photoHint {
  font-size: 12px;
  color: #999;
  text-align: center;
  max-width: 260px;
}

.formGrid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.fieldError {
  font-size: 11px;
  color: #e74c3c;
  padding-left: 2px;
}

.activeToggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #444;
  cursor: pointer;
}

.activeToggle input {
  accent-color: #A3206A;
  cursor: pointer;
}

.formMessage {
  font-size: 13px;
  padding: 8px 12px;
  border-radius: 6px;
}

.formMessage--error {
  background: #F8D7DA;
  color: #58151C;
}

.formMessage--success {
  background: #D1E7DD;
  color: #0A3622;
}

.modalFooter {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-shrink: 0;
}

.btnPrimary,
.btnSecondary {
  height: 40px;
  padding: 0 18px;
  border-radius: 8px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btnPrimary {
  background: #922877;
  color: white;
}

.btnPrimary:hover:not(:disabled) {
  opacity: 0.88;
}

.btnPrimary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btnSecondary {
  background: #f0f0f0;
  color: #555;
}

.btnSecondary:hover {
  background: #e0e0e0;
}

.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}
</style>
