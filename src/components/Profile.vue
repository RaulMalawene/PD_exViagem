<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import { roleLabel as resolveRoleLabel } from '../utils/roles'
import BaseInput from './BaseInput.vue'
import Text from './Text.vue'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)
const isAdmin = computed(() => user.value?.role === 'admin')

const roleLabel = computed(() => resolveRoleLabel(user.value?.role))

const isOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)

const { showToast } = useToast()

const form = ref({ name: '', email: '', current_password: '', password: '', password_confirmation: '' })
const formErrors = ref({ name: '', email: '', current_password: '', password: '', password_confirmation: '' })

function clearErrors() {
  formErrors.value = { name: '', email: '', current_password: '', password: '', password_confirmation: '' }
}

function openEdit() {
  form.value = {
    name: user.value?.name ?? '',
    email: user.value?.email ?? '',
    current_password: '',
    password: '',
    password_confirmation: '',
  }
  clearErrors()
  isEditing.value = true
}

function closeEdit() {
  isEditing.value = false
  clearErrors()
}

watch(() => form.value.name, () => { if (formErrors.value.name) formErrors.value.name = '' })
watch(() => form.value.email, () => { if (formErrors.value.email) formErrors.value.email = '' })
watch(() => form.value.current_password, () => { if (formErrors.value.current_password) formErrors.value.current_password = '' })
watch(() => form.value.password, () => { if (formErrors.value.password) formErrors.value.password = '' })
watch(() => form.value.password_confirmation, () => { if (formErrors.value.password_confirmation) formErrors.value.password_confirmation = '' })

function validate() {
  clearErrors()
  let valid = true

  if (isAdmin.value) {
    if (!form.value.name.trim()) {
      formErrors.value.name = 'O nome é obrigatório.'
      valid = false
    }
    if (!form.value.email.trim()) {
      formErrors.value.email = 'O email é obrigatório.'
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
      formErrors.value.email = 'Email inválido.'
      valid = false
    }
  }

  if (form.value.password) {
    if (!form.value.current_password.trim()) {
      formErrors.value.current_password = 'Introduza a password actual.'
      valid = false
    }
    if (form.value.password.length < 8) {
      formErrors.value.password = 'Mínimo 8 caracteres.'
      valid = false
    } else if (form.value.password !== form.value.password_confirmation) {
      formErrors.value.password_confirmation = 'As passwords não coincidem.'
      valid = false
    }
  }

  return valid
}

async function handleSave() {
  if (!validate()) return
  isSaving.value = true

  try {
    const payload = {}

    if (isAdmin.value) {
      payload.name = form.value.name
      payload.email = form.value.email
    }

    if (form.value.password) {
      payload.current_password = form.value.current_password
      payload.password = form.value.password
      payload.password_confirmation = form.value.password_confirmation
    }

    await authStore.updateMe(payload)
    showToast('success', 'Perfil actualizado com sucesso!')
    closeEdit()
  } catch (err) {
    showToast('error', parseApiError(err))
  } finally {
    isSaving.value = false
  }
}

function handleOutside() {
  if (!isEditing.value) isOpen.value = false
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="profileWrapper">
    <div class="profile" @click="isOpen = !isOpen">
      <div class="profileImg">
        <i class="fi fi-sr-user profileIcon" />
      </div>
      <div class="nameRole">
        <Text :txt="user?.name" color="221F20" weight="600" size="15px" />
        <Text :txt="`(${roleLabel})`" color="221F20" weight="300" size="15px" />
      </div>
      <div class="drop" :class="{ 'drop--open': isOpen }">
        <i class="fi fi-br-angle-small-down" />
      </div>
    </div>

    <div v-if="isOpen" class="backdrop" @click="handleOutside" />

    <Transition name="card">
      <div v-if="isOpen" class="ProfileCard">

        <template v-if="!isEditing">
          <div class="CardHeader">
            <div class="avatarLarge">
              <i class="fi fi-sr-user avatarIcon" />
            </div>
            <div class="userMeta">
              <span class="userName">{{ user?.name }}</span>
              <span class="userRole">{{ roleLabel }}</span>
            </div>
          </div>

          <div class="Divider" />

          <div class="InfoList">
            <div class="InfoRow">
              <i class="fi fi-rs-envelope infoIcon" />
              <span class="infoLabel">Email</span>
              <span class="infoValue">{{ user?.email || '--' }}</span>
            </div>
            <div class="InfoRow">
              <i class="fi fi-rs-shield-check infoIcon" />
              <span class="infoLabel">Perfil</span>
              <span class="infoValue">{{ roleLabel }}</span>
            </div>
          </div>

          <div class="Divider" />

          <div class="CardActions">
            <button class="btn-edit" @click="openEdit">
              <i class="fi fi-rs-pencil" /> Editar perfil
            </button>
            <button class="btn-logout" @click="handleLogout">
              <i class="fi fi-rs-exit" /> Sair
            </button>
          </div>
        </template>

        <template v-else>
          <div class="EditHeader">
            <button class="backBtn" @click="closeEdit">
              <i class="fi fi-sr-angle-left" />
            </button>
            <span class="editTitle">Editar perfil</span>
          </div>

          <div class="Divider" />

          <div class="EditForm">
            <template v-if="isAdmin">
              <div class="fieldGroup">
                <BaseInput label="Nome" :modelValue="form.name" @update:modelValue="form.name = $event" />
                <span v-if="formErrors.name" class="fieldError">{{ formErrors.name }}</span>
              </div>
              <div class="fieldGroup">
                <BaseInput label="Email" type="email" :modelValue="form.email" @update:modelValue="form.email = $event" />
                <span v-if="formErrors.email" class="fieldError">{{ formErrors.email }}</span>
              </div>
            </template>

            <div class="sectionLabel">Alterar password <span class="optional">(opcional)</span></div>

            <div class="fieldGroup">
              <BaseInput label="Password actual" type="password" :modelValue="form.current_password" @update:modelValue="form.current_password = $event" />
              <span v-if="formErrors.current_password" class="fieldError">{{ formErrors.current_password }}</span>
            </div>
            <div class="fieldGroup">
              <BaseInput label="Nova password" type="password" :modelValue="form.password" @update:modelValue="form.password = $event" />
              <span v-if="formErrors.password" class="fieldError">{{ formErrors.password }}</span>
            </div>
            <div class="fieldGroup">
              <BaseInput label="Confirmar password" type="password" :modelValue="form.password_confirmation" @update:modelValue="form.password_confirmation = $event" />
              <span v-if="formErrors.password_confirmation" class="fieldError">{{ formErrors.password_confirmation }}</span>
            </div>
          </div>

          <button class="btn-save" :disabled="isSaving" @click="handleSave">
            <i v-if="isSaving" class="fi fi-sr-spinner saveSpinner" />
            {{ isSaving ? 'A guardar...' : 'Guardar alterações' }}
          </button>
        </template>

      </div>
    </Transition>
  </div>
</template>

<style scoped>
.profileWrapper {
  position: relative;
}

.profile {
  height: 100%;
  width: auto;
  background: #d9d9d9;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px 5px 5px;
  cursor: pointer;
  border-radius: 55px;
  position: relative;
  z-index: 1001;
  transition: background 0.15s;
}

.profile:hover {
  background: #ccc;
}

.profileImg {
  height: 30px;
  width: 30px;
  background: #922877;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
}

.profileIcon {
  color: white;
  font-size: 14px;
  position: relative;
  top: 1px;
}

.nameRole {
  display: flex;
  gap: 5px;
  align-items: center;
}

.drop {
  position: relative;
  top: 1px;
  transition: transform 0.2s;
  margin-left: 3px;
}

.drop--open {
  transform: rotate(180deg);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.ProfileCard {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 300px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.14);
  padding: 24px 20px 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.CardHeader {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatarLarge {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #922877;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.avatarIcon {
  color: white;
  font-size: 22px;
  position: relative;
  top: 2px;
}

.userMeta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.userName {
  font-size: 15px;
  font-weight: 700;
  color: #222;
}

.userRole {
  font-size: 12px;
  color: #922877;
  font-weight: 600;
  background: rgba(163, 32, 106, 0.1);
  padding: 2px 8px;
  border-radius: 20px;
  width: fit-content;
}

.Divider {
  height: 1px;
  background: #f0f0f0;
  margin: 0 -4px;
}

.InfoList {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.InfoRow {
  display: flex;
  align-items: center;
  gap: 10px;
}

.infoIcon {
  color: #922877;
  font-size: 13px;
  width: 16px;
  flex-shrink: 0;
}

.infoLabel {
  font-size: 12px;
  color: #999;
  font-weight: 500;
  width: 60px;
  flex-shrink: 0;
}

.infoValue {
  font-size: 13px;
  color: #222;
  font-weight: 500;
  margin-left: auto;
  text-align: right;
}

.CardActions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-edit,
.btn-logout {
  width: 100%;
  height: 38px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s;
}

.btn-edit {
  background: #922877;
  color: white;
}

.btn-logout {
  background-color: #f5f5f5;
  color: #555;
}

.btn-edit:hover,
.btn-logout:hover {
  opacity: 0.85;
}

.EditHeader {
  display: flex;
  align-items: center;
  gap: 12px;
}

.backBtn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: #f0f0f0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #555;
  transition: background 0.15s;
  flex-shrink: 0;
}

.backBtn:hover {
  background: #e0e0e0;
}

.editTitle {
  font-size: 16px;
  font-weight: 700;
  color: #222;
}

.EditForm {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 2px;
}

.EditForm::-webkit-scrollbar {
  width: 3px;
}

.EditForm::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 4px;
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

.sectionLabel {
  font-size: 12px;
  font-weight: 600;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-top: 4px;
}

.optional {
  font-weight: 400;
  text-transform: none;
  color: #aaa;
  letter-spacing: 0;
}

.btn-save {
  width: 100%;
  height: 40px;
  border-radius: 8px;
  border: none;
  background: #922877;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.btn-save:hover:not(:disabled) {
  opacity: 0.88;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes spin {
  to { transform: rotate(1turn); }
}

.saveSpinner {
  animation: spin 0.8s linear infinite;
  display: inline-block;
}

.card-enter-active,
.card-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (min-width: 768px) and (max-width: 1439px) {
  .nameRole :deep(p) {
    font-size: 13px !important;
  }

  .profileImg {
    height: 26px;
    width: 26px;
  }
}

@media (max-width: 767px) {
  .profile {
    padding: 4px;
    gap: 0;
  }

  .profileImg {
    height: 26px;
    width: 26px;
    margin-right: 0;
  }

  .nameRole {
    display: none;
  }

  .drop {
    margin-left: 4px;
  }

  .ProfileCard {
    width: min(300px, calc(100vw - 24px));
  }
}
</style>
