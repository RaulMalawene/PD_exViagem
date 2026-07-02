<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import Logo from '../assets/logoPD.svg'
import BaseInput from '../components/BaseInput.vue'
import BaseButton from '../components/BaseButton.vue'
import Text from '../components/Text.vue'
import SymbolWhite from '../assets/symbol-white.svg'
import SymbolLima from '../assets/symbol-lima.svg'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function handleLogin() {
  if (loading.value) return

  errorMessage.value = ''

  try {
    loading.value = true

    await authStore.login({ email: email.value, password: password.value })

    router.push(authStore.homeRoute)
  } catch (e) {
    if (e.response?.status === 422 || e.response?.status === 401) {
      errorMessage.value = 'Credenciais inválidas'
    } else {
      errorMessage.value = 'Erro interno. Tente novamente.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="screen">
    <div class="loginBox">
      <div class="left">
        <img :src="Logo" class="logo" alt="PD Viagens" />

        <div class="TextHead">
          <Text txt="Entre na sua conta" color="#333" weight="600" size="17px" />
          <Text
            txt="Introduza as suas credenciais para aceder à sua conta"
            color="#555"
            weight="300"
            size="15px"
          />
        </div>

        <form class="form" @submit.prevent="handleLogin">
          <BaseInput
            v-model="email"
            label="Email"
            icon="fi fi-sr-envelope"
            type="email"
            placeholder="Digite o seu email"
          />

          <BaseInput
            v-model="password"
            label="Senha"
            icon="fi fi-sr-key"
            type="password"
            placeholder="Digite a sua senha"
          />

          <Text
            v-if="errorMessage"
            :txt="errorMessage"
            color="#e74c3c"
            weight="500"
            size="14px"
          />

          <div class="Button">
            <BaseButton
              type="submit"
              :disabled="loading"
              :text="loading ? 'A entrar...' : 'Entrar'"
            />
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

.loginBox {
  width: min(850px, 100%);
  height: auto;
  min-height: 480px;
  max-height: min(520px, calc(100vh - 40px));
  background: white;
  border-radius: 14px;
  display: flex;
  overflow: hidden;
  padding: clamp(32px, 5vw, 65px);
}

.left {
  width: 50%;
  height: 100%;
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

.TextHead {
  width: 100%;
  max-width: 300px;
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

.Button {
  margin-top: 20px;
}

.right {
  width: 50%;
  background: #A3206A;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.busIcon {
  opacity: 0.95;
}

@media (max-width: 600px) {
  .loginBox {
    flex-direction: column;
    max-height: none;
    min-height: auto;
    padding: clamp(24px, 6vw, 40px);
  }

  .left {
    width: 100%;
  }

  .right {
    display: none;
  }

  .form {
    max-width: 100%;
  }
}

@media (min-width: 1024px) and (max-width: 1279px) {
  .loginBox {
    padding: 36px;
    min-height: 440px;
  }
}
</style>
