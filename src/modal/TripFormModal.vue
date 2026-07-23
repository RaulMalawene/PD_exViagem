<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTripStore } from '../stores/tripStore'
import { useRouteStore } from '../stores/routeStore'
import { useVehicleStore } from '../stores/vehicleStore'
import { useDriverStore } from '../stores/driverStore'
import { useHelperStore } from '../stores/helperStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { formatDate } from '../utils/formatDate'
import BaseInput from '../components/BaseInput.vue'
import InputDropDown from '../components/InputDropDown.vue'

const props = defineProps({
  trip: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const tripStore = useTripStore()
const routeStore = useRouteStore()
const vehicleStore = useVehicleStore()
const driverStore = useDriverStore()
const helperStore = useHelperStore()
const { showToast } = useToast()

const localTrip = ref(props.trip)

const form = ref({
  route_id: props.trip?.route?.id ?? '',
  departure_date: props.trip?.departure_date ?? '',
  departure_time: (props.trip?.departure_time ?? '17:00').slice(0, 5),
  vehicle_id: props.trip?.vehicle?.id ?? '',
  driver_id: props.trip?.driver?.id ?? '',
  helper_id: props.trip?.helper?.id ?? '',
  permit_number: props.trip?.permit_number ?? '',
  status: props.trip?.status ?? 'scheduled',
  notes: props.trip?.notes ?? '',
})

const formErrors = ref({ route_id: '', departure_date: '', departure_time: '' })
const isSaving = ref(false)

const statusOptions = [
  { id: 'scheduled', name: 'Agendada' },
  { id: 'boarding', name: 'Em embarque' },
  { id: 'in_progress', name: 'Em curso' },
  { id: 'completed', name: 'Concluída' },
  { id: 'cancelled', name: 'Cancelada' },
  { id: 'delayed', name: 'Com atraso' },
]

const routeOptions = computed(() => routeStore.routes.map((r) => ({ id: r.id, name: r.name })))
const vehicleOptions = computed(() => vehicleStore.vehicles.map((v) => ({ id: v.id, name: `${v.plate} - ${v.brand} ${v.model}` })))
const driverOptions = computed(() => driverStore.drivers.map((d) => ({ id: d.id, name: d.name })))
const helperOptions = computed(() => helperStore.helpers.map((h) => ({ id: h.id, name: h.name })))

function clearErrors() {
  formErrors.value = { route_id: '', departure_date: '', departure_time: '' }
}

function validate() {
  clearErrors()
  let valid = true

  if (!localTrip.value) {
    if (!form.value.route_id) {
      formErrors.value.route_id = 'A rota é obrigatória.'
      valid = false
    }
    if (!form.value.departure_date) {
      formErrors.value.departure_date = 'A data é obrigatória.'
      valid = false
    }
  }

  if (!form.value.departure_time) {
    formErrors.value.departure_time = 'A hora de partida é obrigatória.'
    valid = false
  } else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.value.departure_time)) {
    formErrors.value.departure_time = 'Formato inválido. Use HH:MM em 24 horas, ex: 17:00.'
    valid = false
  }

  return valid
}

async function handleSave() {
  if (!validate()) return
  isSaving.value = true

  try {
    if (localTrip.value) {
      const payload = {
        vehicle_id: form.value.vehicle_id || null,
        driver_id: form.value.driver_id || null,
        helper_id: form.value.helper_id || null,
        permit_number: form.value.permit_number || null,
        departure_time: form.value.departure_time,
        status: form.value.status,
        notes: form.value.notes || null,
      }
      const res = await tripStore.updateTrip(localTrip.value.id, payload)
      localTrip.value = res.data
      showToast('success', 'Viagem actualizada com sucesso.')
    } else {
      const payload = {
        route_id: form.value.route_id,
        departure_date: form.value.departure_date,
        departure_time: form.value.departure_time,
        vehicle_id: form.value.vehicle_id || null,
        driver_id: form.value.driver_id || null,
        helper_id: form.value.helper_id || null,
        permit_number: form.value.permit_number || null,
        notes: form.value.notes || null,
      }
      const res = await tripStore.createTrip(payload)
      localTrip.value = res.data
      showToast('success', 'Viagem criada com sucesso.')
      emit('close', true)
    }
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  emit('close', !!localTrip.value)
}

onMounted(() => {
  routeStore.fetchRoutes({ per_page: 100 })
  vehicleStore.fetchVehicles({ per_page: 100 })
  driverStore.fetchDrivers({ per_page: 100 })
  helperStore.fetchHelpers({ per_page: 100, all: 1 })
})
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">{{ localTrip ? 'Editar viagem' : 'Nova Viagem' }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="formGrid">
              <template v-if="!localTrip">
                <div class="fieldGroup">
                  <InputDropDown label="Rota" :modelValue="form.route_id" :options="routeOptions"
                    @update:modelValue="form.route_id = $event" />
                  <span v-if="formErrors.route_id" class="fieldError">{{ formErrors.route_id }}</span>
                </div>

                <div class="fieldGroup">
                  <BaseInput label="Data" type="date" :modelValue="form.departure_date"
                    @update:modelValue="form.departure_date = $event" />
                  <span v-if="formErrors.departure_date" class="fieldError">{{ formErrors.departure_date }}</span>
                </div>
              </template>

              <template v-else>
                <div class="fieldGroup">
                  <span class="readonlyLabel">Rota</span>
                  <span class="readonlyValue">{{ localTrip.route?.name ?? '--' }}</span>
                </div>

                <div class="fieldGroup">
                  <span class="readonlyLabel">Data</span>
                  <span class="readonlyValue">{{ formatDate(localTrip.departure_date) }}</span>
                </div>
              </template>

              <div class="fieldGroup">
                <BaseInput label="Hora de partida (24h)" type="text" placeholder="17:00"
                  :modelValue="form.departure_time" @update:modelValue="form.departure_time = $event" />
                <span v-if="formErrors.departure_time" class="fieldError">{{ formErrors.departure_time }}</span>
              </div>

              <div class="fieldGroup">
                <InputDropDown label="Veículo" :modelValue="form.vehicle_id" :options="vehicleOptions"
                  @update:modelValue="form.vehicle_id = $event" />
              </div>

              <div class="fieldGroup">
                <InputDropDown label="Motorista" :modelValue="form.driver_id" :options="driverOptions"
                  @update:modelValue="form.driver_id = $event" />
              </div>

              <div class="fieldGroup">
                <InputDropDown label="Ajudante" :modelValue="form.helper_id" :options="helperOptions"
                  @update:modelValue="form.helper_id = $event" />
              </div>

              <div class="fieldGroup">
                <BaseInput label="Permit Nº" :modelValue="form.permit_number"
                  @update:modelValue="form.permit_number = $event" />
              </div>

              <div class="fieldGroup" v-if="localTrip">
                <InputDropDown label="Estado" :modelValue="form.status" :options="statusOptions"
                  @update:modelValue="form.status = $event" />
              </div>

              <div class="fieldGroup">
                <BaseInput label="Notas" :modelValue="form.notes" @update:modelValue="form.notes = $event" />
              </div>
            </div>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">
              {{ localTrip ? 'Concluir' : 'Cancelar' }}
            </button>
            <button class="btnPrimary" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'A guardar...' : (localTrip ? 'Guardar alterações' : 'Registrar viagem') }}
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
  max-width: 560px;
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

.readonlyLabel {
  font-size: 13px;
  color: #333;
}

.readonlyValue {
  height: 40px;
  display: flex;
  align-items: center;
  padding-left: 12px;
  background: #f0f0f0;
  border-radius: 5px;
  font-size: 15px;
  color: #666;
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
