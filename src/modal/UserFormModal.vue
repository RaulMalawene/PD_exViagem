<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { roleOptions, ROLE_DESCRIPTIONS } from '../utils/roles'
import BaseInput from '../components/BaseInput.vue'
import InputDropDown from '../components/InputDropDown.vue'

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close'])

const userStore = useUserStore()
const authStore = useAuthStore()
const { showToast } = useToast()

const localUser = ref(props.user)

const form = ref({
  name: props.user?.name ?? '',
  email: props.user?.email ?? '',
  role: props.user?.role ?? '',
  is_active: props.user?.is_active ?? true,
})

const roleHint = computed(() => ROLE_DESCRIPTIONS[form.value.role] ?? '')

// Reenviar credenciais gera uma password nova: nao faz sentido na propria
// conta (ficava sem acesso) nem numa conta desactivada.
const canResend = computed(() =>
  !!localUser.value
  && localUser.value.id !== authStore.user?.id
  && form.value.is_active
)

const confirmingResend = ref(false)
const isResending = ref(false)

const formErrors = ref({ name: '', email: '', role: '' })
const isSaving = ref(false)

function clearErrors() {
  formErrors.value = { name: '', email: '', role: '' }
}

function validate() {
  clearErrors()
  let valid = true

  if (!form.value.name.trim()) {
    formErrors.value.name = 'O nome é obrigatório.'
    valid = false
  }
  if (!form.value.email.trim()) {
    formErrors.value.email = 'O email é obrigatório.'
    valid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) {
    formErrors.value.email = 'Indique um email válido.'
    valid = false
  }
  if (!form.value.role) {
    formErrors.value.role = 'O perfil é obrigatório.'
    valid = false
  }

  return valid
}

async function handleSave() {
  if (!validate()) return
  isSaving.value = true

  try {
    const payload = {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      role: form.value.role,
    }

    if (localUser.value) {
      payload.is_active = form.value.is_active
      const res = await userStore.updateUser(localUser.value.id, payload)
      localUser.value = res.data
      showToast('success', 'Alterações salvas com sucesso.')
    } else {
      const res = await userStore.createUser(payload)
      localUser.value = res.data
      showToast('success', 'Utilizador criado! As credenciais foram enviadas por email.')
      emit('close', true)
    }
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSaving.value = false
  }
}

async function handleResend() {
  isResending.value = true

  try {
    const res = await userStore.resendCredentials(localUser.value.id)
    confirmingResend.value = false
    showToast('success', res?.message ?? 'Novas credenciais enviadas por email.')
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isResending.value = false
  }
}

function handleClose() {
  emit('close', !!localUser.value)
}
</script>

<template>
  <Transition name="overlay">
    <div class="modalOverlay" @click.self="handleClose">
      <Transition name="modal" appear>
        <div class="modalCard">
          <div class="modalHeader">
            <span class="modalTitle">{{ props.user ? 'Editar utilizador' : 'Novo Utilizador' }}</span>
            <button class="closeBtn" @click="handleClose">
              <i class="fi fi-br-cross" />
            </button>
          </div>

          <div class="modalBody">
            <div class="formGrid">
              <div v-if="!localUser" class="infoBanner">
                <i class="fi fi-rs-info" />
                As credenciais de acesso serão enviadas automaticamente por email para o utilizador.
              </div>

              <div class="fieldGroup">
                <BaseInput label="Nome Completo" :modelValue="form.name" @update:modelValue="form.name = $event" />
                <span v-if="formErrors.name" class="fieldError">{{ formErrors.name }}</span>
              </div>

              <div class="fieldGroup">
                <BaseInput label="Email" type="email" :modelValue="form.email" @update:modelValue="form.email = $event" />
                <span v-if="formErrors.email" class="fieldError">{{ formErrors.email }}</span>
              </div>

              <div class="fieldGroup">
                <InputDropDown label="Perfil" :modelValue="form.role" :options="roleOptions"
                  @update:modelValue="form.role = $event" />
                <span v-if="formErrors.role" class="fieldError">{{ formErrors.role }}</span>
                <span v-if="roleHint && !formErrors.role" class="fieldHint">{{ roleHint }}</span>
              </div>

              <label v-if="localUser" class="activeToggle">
                <input type="checkbox" v-model="form.is_active" />
                Utilizador activo
              </label>

              <div v-if="canResend" class="resendBlock">
                <template v-if="!confirmingResend">
                  <p class="resendText">
                    Se o email estava errado, corrija-o acima, guarde e reenvie as credenciais.
                    Serve também quando o utilizador esquece a password.
                  </p>
                  <button class="btnGhost" @click="confirmingResend = true">
                    <i class="fi fi-rs-paper-plane" />
                    Reenviar credenciais
                  </button>
                </template>

                <template v-else>
                  <p class="resendWarning">
                    Vai ser gerada uma <strong>password nova</strong> e enviada para
                    <strong>{{ localUser.email }}</strong>. A password actual deixa de funcionar
                    e as sessões abertas são terminadas.
                  </p>
                  <div class="resendActions">
                    <button class="btnGhost" :disabled="isResending" @click="confirmingResend = false">
                      Cancelar
                    </button>
                    <button class="btnPrimary btnSmall" :disabled="isResending" @click="handleResend">
                      {{ isResending ? 'A enviar...' : 'Confirmar e enviar' }}
                    </button>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="modalFooter">
            <button class="btnSecondary" @click="handleClose">
              {{ localUser ? 'Concluir' : 'Cancelar' }}
            </button>
            <button class="btnPrimary" :disabled="isSaving" @click="handleSave">
              {{ isSaving ? 'A guardar...' : (localUser ? 'Guardar alterações' : 'Registar utilizador') }}
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

.infoBanner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #F3ECF2;
  color: #922877;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  line-height: 1.4;
}

.infoBanner i {
  position: relative;
  top: 1px;
  flex-shrink: 0;
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

.resendBlock {
  margin-top: 4px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resendText {
  font-size: 12px;
  color: #777;
  line-height: 1.5;
}

.resendWarning {
  font-size: 12px;
  color: #b9770e;
  line-height: 1.5;
  background: #FDF6E7;
  border-radius: 8px;
  padding: 10px 12px;
}

.resendActions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btnGhost {
  display: flex;
  align-items: center;
  gap: 7px;
  align-self: flex-start;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1.5px solid #922877;
  background: transparent;
  color: #922877;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btnGhost:hover:not(:disabled) {
  background: #F3ECF2;
}

.btnGhost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btnSmall {
  height: 36px;
  font-size: 12.5px;
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
