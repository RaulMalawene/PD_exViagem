<script setup>
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoundTripStore } from '../stores/roundTripStore'
import { useTripStore } from '../stores/tripStore'
import { useRouteStore } from '../stores/routeStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { formatDate } from '../utils/formatDate'
import { routeAbbr } from '../utils/routeAbbr'
import BaseInput from '../components/BaseInput.vue'
import InputDropDown from '../components/InputDropDown.vue'

const props = defineProps({
  roundTrip: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const roundTripStore = useRoundTripStore()
const tripStore = useTripStore()
const routeStore = useRouteStore()
const { trips } = storeToRefs(tripStore)
const { routes } = storeToRefs(routeStore)
const { showToast } = useToast()

const localRoundTrip = ref(props.roundTrip)
const selectedRouteId = ref(props.roundTrip?.outbound_trip?.route?.id ?? '')

const form = ref({
  process_number: props.roundTrip?.process_number ?? '',
  outbound_trip_id: props.roundTrip?.outbound_trip?.id ?? '',
  return_trip_id: props.roundTrip?.return_trip?.id ?? '',
  notes: props.roundTrip?.notes ?? '',
})

const errorText = ref('')
const isSaving = ref(false)

function tripLabel(t) {
  return `${routeAbbr(t.route)} · ${formatDate(t.departure_date)} · ${(t.departure_time ?? '').slice(0, 5)}`
}

const routeOptions = computed(() => routes.value.map((r) => ({ id: r.id, name: routeAbbr(r) })))

const returnRouteId = computed(() => {
  const route = routes.value.find((r) => String(r.id) === String(selectedRouteId.value))
  return route?.reverse_route_id ?? null
})

const outboundTripOptions = computed(() =>
  trips.value
    .filter((t) => t.status !== 'cancelled')
    .filter((t) => !selectedRouteId.value || String(t.route?.id) === String(selectedRouteId.value))
    .map((t) => ({ id: t.id, name: tripLabel(t) }))
)

const returnTripOptions = computed(() =>
  trips.value
    .filter((t) => t.status !== 'cancelled')
    .filter((t) => returnRouteId.value && String(t.route?.id) === String(returnRouteId.value))
    .map((t) => ({ id: t.id, name: tripLabel(t) }))
)

function handleRouteChange(routeId) {
  selectedRouteId.value = routeId
  form.value.outbound_trip_id = ''
  form.value.return_trip_id = ''
}

function validate() {
  errorText.value = ''

  if (!form.value.process_number.trim()) {
    errorText.value = 'O número de processo é obrigatório.'
    return false
  }
  if (!form.value.outbound_trip_id) {
    errorText.value = 'Escolha a viagem de ida.'
    return false
  }

  return true
}

async function handleSave() {
  if (!validate()) return
  isSaving.value = true

  try {
    const payload = {
      process_number: form.value.process_number.trim(),
      outbound_trip_id: Number(form.value.outbound_trip_id),
      return_trip_id: form.value.return_trip_id ? Number(form.value.return_trip_id) : null,
      notes: form.value.notes || null,
    }

    if (localRoundTrip.value) {
      const res = await roundTripStore.updateRoundTrip(localRoundTrip.value.id, payload)
      localRoundTrip.value = res.data
      showToast('success', 'Alterações salvas com sucesso.')
    } else {
      const res = await roundTripStore.createRoundTrip(payload)
      localRoundTrip.value = res.data
      showToast('success', 'Viagem completa criada com sucesso.')
    }

    emit('close', true)
  } catch (err) {
    errorText.value = parseApiError(err)
    showToast('error', errorText.value)
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  emit('close', false)
}

onMounted(() => {
  const params = { per_page: 100, unpaired: 1 }
  if (props.roundTrip?.id) {
    params.except_round_trip_id = props.roundTrip.id
  }
  tripStore.fetchTrips(params)
  routeStore.fetchRoutes({ per_page: 100 })
})
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">{{ props.roundTrip ? 'Editar viagem completa' : 'Nova Viagem Completa' }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="fieldGroup">
              <BaseInput label="Número de processo" :modelValue="form.process_number"
                @update:modelValue="form.process_number = $event" />
            </div>

            <div class="fieldGroup">
              <InputDropDown label="Rota" :modelValue="selectedRouteId" :options="routeOptions"
                @update:modelValue="handleRouteChange" />
            </div>

            <div class="fieldGroup">
              <InputDropDown label="Viagem de ida" :modelValue="form.outbound_trip_id" :options="outboundTripOptions"
                @update:modelValue="form.outbound_trip_id = $event" />
            </div>

            <div class="fieldGroup">
              <InputDropDown label="Viagem de volta (opcional)" :modelValue="form.return_trip_id" :options="returnTripOptions"
                @update:modelValue="form.return_trip_id = $event" />
              <span v-if="selectedRouteId && !returnRouteId" class="fieldHint">Esta rota ainda não tem rota reversa configurada.</span>
            </div>

            <div class="fieldGroup">
              <label class="fieldLabel">Notas</label>
              <textarea class="textarea" v-model="form.notes" rows="2" />
            </div>

            <span v-if="errorText" class="fieldError">{{ errorText }}</span>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">Cancelar</button>
            <button class="btnPrimary" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'A guardar...' : (localRoundTrip ? 'Guardar alterações' : 'Criar viagem completa') }}
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
  gap: 14px;
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

.fieldHint {
  font-size: 11px;
  color: #999;
}

.textarea {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  font-size: 13px;
  font-family: 'Ubuntu', sans-serif;
  color: #333;
  resize: vertical;
}

.fieldError {
  font-size: 12px;
  color: #e74c3c;
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
