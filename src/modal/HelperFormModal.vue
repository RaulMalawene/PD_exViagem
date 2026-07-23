<script setup>
import { ref } from 'vue'
import { useHelperStore } from '../stores/helperStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import BaseInput from '../components/BaseInput.vue'

const props = defineProps({
  helper: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const helperStore = useHelperStore()
const { showToast } = useToast()

const localHelper = ref(props.helper)

const form = ref({
  name: props.helper?.name ?? '',
  phone: props.helper?.phone ?? '',
  is_active: props.helper?.is_active ?? true,
})

const formErrors = ref({ name: '', phone: '' })
const isSaving = ref(false)

function clearErrors() {
  formErrors.value = { name: '', phone: '' }
}

function validate() {
  clearErrors()
  let valid = true

  if (!form.value.name.trim()) {
    formErrors.value.name = 'O nome é obrigatório.'
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

  try {
    const payload = {
      name: form.value.name,
      phone: form.value.phone,
    }

    if (localHelper.value) {
      payload.is_active = form.value.is_active
      const res = await helperStore.updateHelper(localHelper.value.id, payload)
      localHelper.value = res.data
      showToast('success', 'Alterações salvas com sucesso.')
    } else {
      const res = await helperStore.createHelper(payload)
      localHelper.value = res.data
      showToast('success', 'Ajudante criado com sucesso.')
    }
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSaving.value = false
  }
}

function handleClose() {
  emit('close', !!localHelper.value)
}
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">{{ props.helper ? 'Editar ajudante' : 'Novo Ajudante' }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="formGrid">
              <div class="fieldGroup">
                <BaseInput label="Nome Completo" :modelValue="form.name" @update:modelValue="form.name = $event" />
                <span v-if="formErrors.name" class="fieldError">{{ formErrors.name }}</span>
              </div>

              <div class="fieldGroup">
                <BaseInput label="Telefone" :modelValue="form.phone" @update:modelValue="form.phone = $event" />
                <span v-if="formErrors.phone" class="fieldError">{{ formErrors.phone }}</span>
              </div>

              <label v-if="localHelper" class="activeToggle">
                <input type="checkbox" v-model="form.is_active" />
                Ajudante activo
              </label>
            </div>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">
              {{ localHelper ? 'Concluir' : 'Cancelar' }}
            </button>
            <button class="btnPrimary" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'A guardar...' : (localHelper ? 'Guardar alterações' : 'Registrar ajudante') }}
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
