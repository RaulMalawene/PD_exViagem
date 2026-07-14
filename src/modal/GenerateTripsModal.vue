<script setup>
import { ref } from 'vue'
import { useTripStore } from '../stores/tripStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import BaseInput from '../components/BaseInput.vue'

const emit = defineEmits(['close'])

const tripStore = useTripStore()
const { showToast } = useToast()

const today = new Date().toISOString().split('T')[0]

const form = ref({
  date_from: today,
  date_to: '',
})

const formErrors = ref({ date_from: '', date_to: '' })
const isGenerating = ref(false)

function clearErrors() {
  formErrors.value = { date_from: '', date_to: '' }
}

function validate() {
  clearErrors()
  let valid = true

  if (!form.value.date_from) {
    formErrors.value.date_from = 'A data inicial é obrigatória.'
    valid = false
  }
  if (!form.value.date_to) {
    formErrors.value.date_to = 'A data final é obrigatória.'
    valid = false
  } else if (form.value.date_from && form.value.date_to < form.value.date_from) {
    formErrors.value.date_to = 'A data final tem de ser igual ou depois da data inicial.'
    valid = false
  }

  return valid
}

async function handleGenerate() {
  if (!validate()) return
  isGenerating.value = true

  try {
    const res = await tripStore.generateTrips(form.value)
    const { created, skipped } = res
    showToast(
      'success',
      `${created} viagem(ns) criada(s)${skipped ? `, ${skipped} já existia(m) e foram ignoradas` : ''}.`
    )
    emit('close', created > 0)
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isGenerating.value = false
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
            <span class="modalTitle">Gerar viagens</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <p class="hint">
              Cria viagens para todas as rotas com horários activos dentro deste intervalo de datas.
              Viagens já existentes não são duplicadas.
            </p>

            <div class="formGrid">
              <div class="fieldGroup">
                <BaseInput label="Data inicial" type="date" :min="today" :modelValue="form.date_from"
                  @update:modelValue="form.date_from = $event" />
                <span v-if="formErrors.date_from" class="fieldError">{{ formErrors.date_from }}</span>
              </div>

              <div class="fieldGroup">
                <BaseInput label="Data final" type="date" :min="form.date_from || today" :modelValue="form.date_to"
                  @update:modelValue="form.date_to = $event" />
                <span v-if="formErrors.date_to" class="fieldError">{{ formErrors.date_to }}</span>
              </div>
            </div>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">Cancelar</button>
            <button class="btnPrimary" :disabled="isGenerating" @click="handleGenerate">
              {{ isGenerating ? 'A gerar...' : 'Gerar viagens' }}
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
  max-width: 420px;
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
  gap: 18px;
}

.hint {
  font-size: 13px;
  color: #888;
  line-height: 1.5;
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
