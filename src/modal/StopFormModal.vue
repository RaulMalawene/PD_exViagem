<script setup>
import { ref } from 'vue'
import { useStopStore } from '../stores/stopStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import BaseInput from '../components/BaseInput.vue'

const props = defineProps({
  routeId: { type: [Number, String], required: true },
  stop: { type: Object, default: null },
  nextOrder: { type: Number, default: 1 },
})

const emit = defineEmits(['close'])

const stopStore = useStopStore()
const { showToast } = useToast()

const localStop = ref(props.stop)

const typeOptions = [
  { value: 'departure', label: 'Partida' },
  { value: 'transit', label: 'Trânsito' },
  { value: 'border', label: 'Fronteira' },
  { value: 'arrival', label: 'Chegada' },
]

const form = ref({
  name: props.stop?.name ?? '',
  order: props.stop?.order ?? props.nextOrder,
  type: props.stop?.type ?? 'transit',
  is_boarding_point: props.stop?.is_boarding_point ?? false,
  boarding_time: props.stop?.boarding_time?.slice(0, 5) ?? '',
})

const formErrors = ref({ name: '', order: '', boarding_time: '' })
const isSaving = ref(false)

function clearErrors() {
  formErrors.value = { name: '', order: '', boarding_time: '' }
}

function validate() {
  clearErrors()
  let valid = true

  if (!form.value.name.trim()) {
    formErrors.value.name = 'O nome da paragem é obrigatório.'
    valid = false
  }
  if (!form.value.order || Number(form.value.order) < 1) {
    formErrors.value.order = 'A ordem tem de ser pelo menos 1.'
    valid = false
  }
  if (form.value.is_boarding_point && !form.value.boarding_time) {
    formErrors.value.boarding_time = 'Um ponto de embarque tem de ter uma hora de embarque.'
    valid = false
  }

  return valid
}

async function handleSave() {
  if (!validate()) return
  isSaving.value = true

  try {
    const payload = {
      name: form.value.name,
      order: Number(form.value.order),
      type: form.value.type,
      is_boarding_point: form.value.is_boarding_point,
      boarding_time: form.value.is_boarding_point ? form.value.boarding_time : null,
    }

    if (localStop.value) {
      await stopStore.updateStop(localStop.value.id, payload)
      showToast('success', 'Alterações salvas com sucesso.')
    } else {
      await stopStore.createStop(props.routeId, payload)
      showToast('success', 'Paragem criada com sucesso.')
    }
    emit('close', true)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  emit('close', false)
}
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">{{ props.stop ? 'Editar paragem' : 'Nova Paragem' }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="formGrid">
              <div class="fieldGroup">
                <BaseInput label="Nome da paragem" :modelValue="form.name" @update:modelValue="form.name = $event" />
                <span v-if="formErrors.name" class="fieldError">{{ formErrors.name }}</span>
              </div>

              <div class="fieldRow">
                <div class="fieldGroup">
                  <BaseInput label="Ordem" type="number" :modelValue="form.order"
                    @update:modelValue="form.order = $event" />
                  <span v-if="formErrors.order" class="fieldError">{{ formErrors.order }}</span>
                </div>

                <div class="fieldGroup">
                  <label class="fieldLabel">Tipo</label>
                  <select class="selectInput" v-model="form.type">
                    <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
              </div>

              <label class="activeToggle">
                <input type="checkbox" v-model="form.is_boarding_point" />
                É um ponto de embarque
              </label>

              <div v-if="form.is_boarding_point" class="fieldGroup">
                <BaseInput label="Hora de embarque" type="time" :modelValue="form.boarding_time"
                  @update:modelValue="form.boarding_time = $event" />
                <span v-if="formErrors.boarding_time" class="fieldError">{{ formErrors.boarding_time }}</span>
              </div>
            </div>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">Cancelar</button>
            <button class="btnPrimary" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'A guardar...' : (localStop ? 'Guardar alterações' : 'Adicionar paragem') }}
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
  z-index: 6000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modalCard {
  width: 100%;
  max-width: 480px;
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

.formGrid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fieldRow {
  display: flex;
  gap: 14px;
}

.fieldRow .fieldGroup {
  flex: 1;
  min-width: 0;
}

.fieldGroup {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.fieldLabel {
  font-size: 12px;
  font-weight: 600;
  color: #555;
}

.selectInput {
  height: 40px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 13px;
  color: #333;
  font-family: 'Ubuntu', sans-serif;
  background: #fff;
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
  accent-color: #922877;
  cursor: pointer;
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
