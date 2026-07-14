<script setup>
import { ref } from 'vue'
import { useRouteStore } from '../stores/routeStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import BaseInput from '../components/BaseInput.vue'

const props = defineProps({
  route: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const routeStore = useRouteStore()
const { showToast } = useToast()

const localRoute = ref(props.route)

const existingDuration = props.route?.estimated_duration_minutes ?? null

const form = ref({
  name: props.route?.name ?? '',
  origin: props.route?.origin ?? '',
  destination: props.route?.destination ?? '',
  price_mzn: props.route?.price_mzn ?? '',
  price_zar: props.route?.price_zar ?? '',
  duration_hours: existingDuration !== null ? Math.floor(existingDuration / 60) : '',
  duration_minutes: existingDuration !== null ? existingDuration % 60 : '',
  is_active: props.route?.is_active ?? true,
})

const formErrors = ref({ name: '', origin: '', destination: '', price_mzn: '', price_zar: '' })
const isSaving = ref(false)

function clearErrors() {
  formErrors.value = { name: '', origin: '', destination: '', price_mzn: '', price_zar: '' }
}

function validate() {
  clearErrors()
  let valid = true

  if (!form.value.name.trim()) {
    formErrors.value.name = 'O nome da rota é obrigatório.'
    valid = false
  }
  if (!form.value.origin.trim()) {
    formErrors.value.origin = 'A origem é obrigatória.'
    valid = false
  }
  if (!form.value.destination.trim()) {
    formErrors.value.destination = 'O destino é obrigatório.'
    valid = false
  }
  if (form.value.price_mzn === '' || Number(form.value.price_mzn) < 0) {
    formErrors.value.price_mzn = 'Indique um preço em Metical válido.'
    valid = false
  }
  if (form.value.price_zar === '' || Number(form.value.price_zar) < 0) {
    formErrors.value.price_zar = 'Indique um preço em Rand válido.'
    valid = false
  }

  return valid
}

async function handleSave() {
  if (!validate()) return
  isSaving.value = true

  try {
    const hours = Number(form.value.duration_hours) || 0
    const minutes = Number(form.value.duration_minutes) || 0

    const payload = {
      name: form.value.name,
      origin: form.value.origin,
      destination: form.value.destination,
      price_mzn: Number(form.value.price_mzn),
      price_zar: Number(form.value.price_zar),
      estimated_duration_minutes: (hours || minutes) ? (hours * 60 + minutes) : null,
    }

    if (localRoute.value) {
      payload.is_active = form.value.is_active
      const res = await routeStore.updateRoute(localRoute.value.id, payload)
      localRoute.value = res.data
      showToast('success', 'Alterações salvas com sucesso.')
    } else {
      const res = await routeStore.createRoute(payload)
      localRoute.value = res.data
      showToast('success', 'Rota criada com sucesso.')
      emit('close', true)
    }
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  emit('close', !!localRoute.value)
}
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">{{ props.route ? 'Editar rota' : 'Nova Rota' }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="formGrid">
              <div class="fieldGroup">
                <BaseInput label="Nome da rota" :modelValue="form.name" @update:modelValue="form.name = $event" />
                <span v-if="formErrors.name" class="fieldError">{{ formErrors.name }}</span>
              </div>

              <div class="fieldRow">
                <div class="fieldGroup">
                  <BaseInput label="Origem" :modelValue="form.origin" @update:modelValue="form.origin = $event" />
                  <span v-if="formErrors.origin" class="fieldError">{{ formErrors.origin }}</span>
                </div>

                <div class="fieldGroup">
                  <BaseInput label="Destino" :modelValue="form.destination"
                    @update:modelValue="form.destination = $event" />
                  <span v-if="formErrors.destination" class="fieldError">{{ formErrors.destination }}</span>
                </div>
              </div>

              <div class="fieldRow">
                <div class="fieldGroup">
                  <BaseInput label="Preço (MZN)" type="number" :modelValue="form.price_mzn"
                    @update:modelValue="form.price_mzn = $event" />
                  <span v-if="formErrors.price_mzn" class="fieldError">{{ formErrors.price_mzn }}</span>
                </div>

                <div class="fieldGroup">
                  <BaseInput label="Preço (ZAR)" type="number" :modelValue="form.price_zar"
                    @update:modelValue="form.price_zar = $event" />
                  <span v-if="formErrors.price_zar" class="fieldError">{{ formErrors.price_zar }}</span>
                </div>
              </div>

              <div class="fieldGroup">
                <label class="fieldLabel">Duração estimada da viagem</label>
                <div class="fieldRow">
                  <BaseInput label="Horas" type="number" :modelValue="form.duration_hours"
                    @update:modelValue="form.duration_hours = $event" />
                  <BaseInput label="Minutos" type="number" :modelValue="form.duration_minutes"
                    @update:modelValue="form.duration_minutes = $event" />
                </div>
              </div>

              <label v-if="localRoute" class="activeToggle">
                <input type="checkbox" v-model="form.is_active" />
                Rota activa
              </label>
            </div>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">
              {{ localRoute ? 'Concluir' : 'Cancelar' }}
            </button>
            <button class="btnPrimary" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'A guardar...' : (localRoute ? 'Guardar alterações' : 'Registrar rota') }}
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
  font-size: 13px;
  color: #333;
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
