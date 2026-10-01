<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTripScheduleStore } from '../stores/tripScheduleStore'
import { useRouteStore } from '../stores/routeStore'
import { useToast } from '../composables/useToast'
import { useDropdownOptions } from '../composables/useDropdownOptions'
import { parseApiError } from '../utils/parseApiError'
import BaseInput from '../components/BaseInput.vue'
import InputDropDown from '../components/InputDropDown.vue'

const props = defineProps({
  schedule: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const scheduleStore = useTripScheduleStore()
const routeStore = useRouteStore()
const loadOptions = useDropdownOptions()
const { showToast } = useToast()

const localSchedule = ref(props.schedule)

const dayOptions = [
  { id: 'monday', name: 'Segunda-feira' },
  { id: 'tuesday', name: 'Terça-feira' },
  { id: 'wednesday', name: 'Quarta-feira' },
  { id: 'thursday', name: 'Quinta-feira' },
  { id: 'friday', name: 'Sexta-feira' },
  { id: 'saturday', name: 'Sábado' },
  { id: 'sunday', name: 'Domingo' },
]

const routeOptions = computed(() => routeStore.options.map((r) => ({ id: r.id, name: r.name })))

const form = ref({
  route_id: props.schedule?.route_id ?? '',
  day_of_week: props.schedule?.day_of_week ?? '',
  departure_time: props.schedule?.departure_time?.slice(0, 5) ?? '',
  latest_departure_time: props.schedule?.latest_departure_time?.slice(0, 5) ?? '',
  is_active: props.schedule?.is_active ?? true,
})

const formErrors = ref({ route_id: '', day_of_week: '', departure_time: '', latest_departure_time: '' })
const isSaving = ref(false)

function clearErrors() {
  formErrors.value = { route_id: '', day_of_week: '', departure_time: '', latest_departure_time: '' }
}

function validate() {
  clearErrors()
  let valid = true

  if (!form.value.route_id) {
    formErrors.value.route_id = 'A rota é obrigatória.'
    valid = false
  }
  if (!form.value.day_of_week) {
    formErrors.value.day_of_week = 'O dia da semana é obrigatório.'
    valid = false
  }
  if (!form.value.departure_time) {
    formErrors.value.departure_time = 'A hora de partida é obrigatória.'
    valid = false
  }
  if (!form.value.latest_departure_time) {
    formErrors.value.latest_departure_time = 'A hora limite é obrigatória.'
    valid = false
  } else if (form.value.departure_time && form.value.latest_departure_time <= form.value.departure_time) {
    formErrors.value.latest_departure_time = 'A hora limite tem de ser depois da hora de partida.'
    valid = false
  }

  return valid
}

async function handleSave() {
  if (!validate()) return
  isSaving.value = true

  try {
    const payload = {
      route_id: form.value.route_id,
      day_of_week: form.value.day_of_week,
      departure_time: form.value.departure_time,
      latest_departure_time: form.value.latest_departure_time,
    }

    if (localSchedule.value) {
      payload.is_active = form.value.is_active
      await scheduleStore.updateSchedule(localSchedule.value.id, payload)
      showToast('success', 'Alterações salvas com sucesso.')
    } else {
      await scheduleStore.createSchedule(payload)
      showToast('success', 'Horário criado com sucesso.')
      emit('close', true)
      return
    }
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  emit('close', !!localSchedule.value)
}

onMounted(() => {
  loadOptions(routeStore.fetchOptions())
})
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">{{ props.schedule ? 'Editar horário' : 'Novo Horário' }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="formGrid">
              <div class="fieldGroup">
                <InputDropDown label="Rota" :modelValue="form.route_id" :options="routeOptions"
                  @update:modelValue="form.route_id = $event" />
                <span v-if="formErrors.route_id" class="fieldError">{{ formErrors.route_id }}</span>
              </div>

              <div class="fieldGroup">
                <InputDropDown label="Dia da semana" :modelValue="form.day_of_week" :options="dayOptions"
                  @update:modelValue="form.day_of_week = $event" />
                <span v-if="formErrors.day_of_week" class="fieldError">{{ formErrors.day_of_week }}</span>
              </div>

              <div class="fieldRow">
                <div class="fieldGroup">
                  <BaseInput label="Hora de partida" type="time" :modelValue="form.departure_time"
                    @update:modelValue="form.departure_time = $event" />
                  <span v-if="formErrors.departure_time" class="fieldError">{{ formErrors.departure_time }}</span>
                </div>

                <div class="fieldGroup">
                  <BaseInput label="Hora limite" type="time" :modelValue="form.latest_departure_time"
                    @update:modelValue="form.latest_departure_time = $event" />
                  <span v-if="formErrors.latest_departure_time" class="fieldError">{{ formErrors.latest_departure_time }}</span>
                </div>
              </div>

              <label v-if="localSchedule" class="activeToggle">
                <input type="checkbox" v-model="form.is_active" />
                Horário activo
              </label>
            </div>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">
              {{ localSchedule ? 'Concluir' : 'Cancelar' }}
            </button>
            <button class="btnPrimary" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'A guardar...' : (localSchedule ? 'Guardar alterações' : 'Registrar horário') }}
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
  max-width: 640px;
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
