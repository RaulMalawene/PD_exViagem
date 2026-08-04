<script setup>
import { ref, computed, watch } from 'vue'
import { useVehicleStore } from '../stores/vehicleStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import BaseInput from '../components/BaseInput.vue'
import SeatLayoutEditor from '../components/SeatLayoutEditor.vue'

const props = defineProps({
  vehicle: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const vehicleStore = useVehicleStore()
const { showToast } = useToast()

const localVehicle = ref(props.vehicle)

const form = ref({
  plate: props.vehicle?.plate ?? '',
  trailer_plate: props.vehicle?.trailer_plate ?? '',
  model: props.vehicle?.model ?? '',
  brand: props.vehicle?.brand ?? '',
  capacity: props.vehicle?.capacity ?? '',
  seat_layout: props.vehicle?.seat_layout ?? null,
  is_active: props.vehicle?.is_active ?? true,
})

const useLayoutEditor = ref(!!props.vehicle?.seat_layout)

const layoutSeatCount = computed(() => {
  if (!form.value.seat_layout?.rows) return 0
  return form.value.seat_layout.rows.flat().filter((cell) => cell !== null).length
})

watch(layoutSeatCount, (count) => {
  if (useLayoutEditor.value) form.value.capacity = count
})

function toggleLayoutEditor() {
  useLayoutEditor.value = !useLayoutEditor.value
  if (useLayoutEditor.value) {
    form.value.capacity = layoutSeatCount.value
  } else {
    form.value.seat_layout = null
  }
}

const formErrors = ref({ plate: '', model: '', brand: '', capacity: '' })
const isSaving = ref(false)

function clearErrors() {
  formErrors.value = { plate: '', model: '', brand: '', capacity: '' }
}

function validate() {
  clearErrors()
  let valid = true

  if (!form.value.plate.trim()) {
    formErrors.value.plate = 'A matrícula é obrigatória.'
    valid = false
  }
  if (!form.value.model.trim()) {
    formErrors.value.model = 'O modelo é obrigatório.'
    valid = false
  }
  if (!form.value.brand.trim()) {
    formErrors.value.brand = 'A marca é obrigatória.'
    valid = false
  }
  if (useLayoutEditor.value) {
    if (layoutSeatCount.value < 1) {
      formErrors.value.capacity = 'O layout de assentos tem de ter pelo menos 1 lugar.'
      valid = false
    }
  } else if (!form.value.capacity || Number(form.value.capacity) < 1) {
    formErrors.value.capacity = 'A capacidade tem de ser pelo menos 1.'
    valid = false
  }

  return valid
}

async function handleSave() {
  if (!validate()) return
  isSaving.value = true

  try {
    const payload = {
      plate: form.value.plate,
      trailer_plate: form.value.trailer_plate.trim() || null,
      model: form.value.model,
      brand: form.value.brand,
      capacity: Number(form.value.capacity),
      seat_layout: useLayoutEditor.value ? form.value.seat_layout : null,
    }

    if (localVehicle.value) {
      payload.is_active = form.value.is_active
      const res = await vehicleStore.updateVehicle(localVehicle.value.id, payload)
      localVehicle.value = res.data
      showToast('success', 'Alterações salvas com sucesso.')
    } else {
      const res = await vehicleStore.createVehicle(payload)
      localVehicle.value = res.data
      showToast('success', 'Veículo criado com sucesso.')
      emit('close', true)
    }
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  emit('close', !!localVehicle.value)
}
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard" :class="{ wide: useLayoutEditor }">
          <div class="modalHeader">
            <span class="modalTitle">{{ props.vehicle ? 'Editar veículo' : 'Novo Veículo' }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody" :class="{ split: useLayoutEditor }">
            <div class="formColumn">
              <div class="formGrid">
                <div class="fieldGroup">
                  <BaseInput label="Matrícula" :modelValue="form.plate" @update:modelValue="form.plate = $event" />
                  <span v-if="formErrors.plate" class="fieldError">{{ formErrors.plate }}</span>
                </div>

                <div class="fieldGroup">
                  <BaseInput label="Matrícula da trela" :modelValue="form.trailer_plate" @update:modelValue="form.trailer_plate = $event" />
                 
                </div>

                <div class="fieldGroup">
                  <BaseInput label="Modelo" :modelValue="form.model" @update:modelValue="form.model = $event" />
                  <span v-if="formErrors.model" class="fieldError">{{ formErrors.model }}</span>
                </div>

                <div class="fieldGroup">
                  <BaseInput label="Marca" :modelValue="form.brand" @update:modelValue="form.brand = $event" />
                  <span v-if="formErrors.brand" class="fieldError">{{ formErrors.brand }}</span>
                </div>

                <div class="fieldGroup">
                  <BaseInput label="Capacidade" type="number" :modelValue="form.capacity"
                    :disabled="useLayoutEditor"
                    @update:modelValue="form.capacity = $event" />
                  <span v-if="formErrors.capacity" class="fieldError">{{ formErrors.capacity }}</span>
                  <span v-if="useLayoutEditor" class="fieldHint">Calculada automaticamente a partir do layout de assentos.</span>
                </div>

                <label class="activeToggle">
                  <input type="checkbox" :checked="useLayoutEditor" @change="toggleLayoutEditor" />
                  Configurar layout de assentos
                </label>

                <label v-if="localVehicle" class="activeToggle">
                  <input type="checkbox" v-model="form.is_active" />
                  Veículo activo
                </label>
              </div>
            </div>

            <template v-if="useLayoutEditor">
              <div class="modalDivider" />
              <div class="layoutColumn">
                <p class="layoutColumnTitle">Layout de assentos</p>
                <SeatLayoutEditor v-model="form.seat_layout" />
              </div>
            </template>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">
              {{ localVehicle ? 'Concluir' : 'Cancelar' }}
            </button>
            <button class="btnPrimary" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'A guardar...' : (localVehicle ? 'Guardar alterações' : 'Registrar veículo') }}
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
  transition: max-width 0.2s ease;
}

.modalCard.wide {
  max-width: 880px;
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

.modalBody.split {
  flex-direction: row;
  align-items: flex-start;
}

.formColumn {
  flex: 1;
  min-width: 0;
}

.modalDivider {
  align-self: stretch;
  width: 1px;
  background: #eee;
  flex-shrink: 0;
}

.layoutColumn {
  flex: 1.3;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.layoutColumnTitle {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.formGrid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 720px) {
  .modalBody.split {
    flex-direction: column;
  }

  .modalDivider {
    display: none;
  }
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

.fieldHint {
  font-size: 11px;
  color: #999;
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
