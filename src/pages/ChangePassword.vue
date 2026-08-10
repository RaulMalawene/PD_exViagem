<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../composables/useToast'
import { parseApiError } from '../utils/parseApiError'
import Logo from '../assets/logoPD.svg'
import SymbolLima from '../assets/symbol-lima.svg'
import BaseInput from '../components/BaseInput.vue'
import BaseButton from '../components/BaseButton.vue'
import Text from '../components/Text.vue'

const router = useRouter()
const authStore = useAuthStore()
const { showToast } = useToast()

const currentPassword = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const loading = ref(false)
const errorMessage = ref('')

function validate() {
  errorMessage.value = ''

  if (!currentPassword.value.trim()) {
    errorMessage.value = 'Introduza a password que recebeu por email.'
    return false
  }

  if (password.value.length < 8) {
    errorMessage.value = 'A nova password deve ter pelo menos 8 caracteres.'
    return false
  }

  if (password.value !== passwordConfirmation.value) {
    errorMessage.value = 'As passwords não coincidem.'
    return false
  }

  if (password.value === currentPassword.value) {
    errorMessage.value = 'A nova password tem de ser diferente da actual.'
    return false
  }

  return true
}

async function handleSubmit() {
  if (loading.value || !validate()) return

  loading.value = true

  try {
    // O PUT /me é o caminho que o servidor usa para levantar a marca; a rota
    // está entre as poucas que passam enquanto a password não for trocada.
    await authStore.updateMe({
      current_password: currentPassword.value,
      password: password.value,
      password_confirmation: passwordConfirmation.value,
    })

    showToast('success', 'Password definida com sucesso.')
    router.replace(authStore.homeRoute)
  } catch (err) {
    errorMessage.value = err.response?.status === 422
      ? 'A password actual não está correcta.'
      : parseApiError(err)
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  authStore.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="screen">
    <div class="box">
      <div class="left">
        <img :src="Logo" class="logo" alt="PD Viagens" />

        <div class="textHead">
          <Text txt="Defina a sua password" color="#333" weight="600" size="17px" />
          <Text
            txt="A password que recebeu por email é temporária. Defina uma password sua para continuar."
            color="#555"
            weight="300"
            size="15px"
          />
        </div>

        <form class="form" @submit.prevent="handleSubmit">
          <BaseInput
            v-model="currentPassword"
            label="Password actual"
            icon="fi fi-sr-key"
            type="password"
            placeholder="A que recebeu por email"
          />

          <BaseInput
            v-model="password"
            label="Nova password"
            icon="fi fi-sr-lock"
            type="password"
            placeholder="Mínimo 8 caracteres"
          />

          <BaseInput
            v-model="passwordConfirmation"
            label="Confirmar nova password"
            icon="fi fi-sr-lock"
            type="password"
            placeholder="Repita a nova password"
          />

          <Text v-if="errorMessage" :txt="errorMessage" color="#e74c3c" weight="500" size="14px" />

          <div class="actions">
            <BaseButton
              type="submit"
              :disabled="loading"
              :text="loading ? 'A guardar...' : 'Definir password'"
            />

            <button type="button" class="logoutLink" @click="handleLogout">Sair da conta</button>
          </div>
        </form>
      </div>

      <div class="right">
        <img :src="SymbolLima" class="rightSymbol" alt="Portador Diário" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E9E9E9;
  padding: 20px;
  overflow: hidden;
}

.box {
  width: min(850px, 100%);
  min-height: 480px;
  max-height: min(560px, calc(100vh - 40px));
  background: white;
  border-radius: 14px;
  display: flex;
  overflow: hidden;
  padding: clamp(32px, 5vw, 65px);
}

.left {
  width: 50%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.logo {
  width: clamp(120px, 15vw, 200px);
  height: auto;
}

.textHead {
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 330px;
}

.actions {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.logoutLink {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  color: #922877;
  text-decoration: underline;
  cursor: pointer;
  align-self: flex-start;
}

.right {
  width: 50%;
  background: #922877;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.rightSymbol {
  width: clamp(140px, 18vw, 230px);
  height: auto;
  opacity: 0.95;
}

@media (max-width: 600px) {
  .box {
    flex-direction: column;
    max-height: none;
    min-height: auto;
    padding: clamp(24px, 6vw, 40px);
  }

  .left { width: 100%; }
  .right { display: none; }
  .form { max-width: 100%; }
}
</style>
