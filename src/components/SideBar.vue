<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

import LogoPD from '../assets/LogoPD.svg'
import IconTextButton from './IconTextButton.vue'
import IconTextButtonNested from './IconTextButtonNested.vue'
import IconText from './IconText.vue'
import Text from './Text.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const role = computed(() => authStore.user?.role)
const isAdmin = computed(() => role.value === 'admin')
const isStaff = computed(() => role.value === 'staff')

const active = ref({
  main: null,
  nest: null,
})

const rotasNests = [
  { txt: 'Rotas', icon: 'fi fi-rs-route', route: '/dashboard/routes' },
  { txt: 'Paragens', icon: 'fi fi-rs-map-marker', route: '/dashboard/stops' },
]

const viagensNests = [
  { txt: 'Viagens', icon: 'fi fi-rs-road', route: '/dashboard/trips' },
  { txt: 'Horários', icon: 'fi fi-rs-clock', route: '/dashboard/schedules' },
]

const operacionalNests = computed(() => {
  if (isAdmin.value) {
    return [
      { txt: 'Veículos', icon: 'fi fi-rs-bus', route: '/dashboard/vehicles' },
      { txt: 'Motoristas', icon: 'fi fi-rs-id-badge', route: '/dashboard/drivers' },
      { txt: 'Utilizadores', icon: 'fi fi-rs-users', route: '/dashboard/users' },
    ]
  }
  return []
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="wrapperr">
    <div class="main">
      <div class="logo">
        <img :src="LogoPD" alt="PD Viagens" />
      </div>

      <div class="menu">
        <Text txt="Menu" color="#221F20" weight="" size="15px" />

        <nav>
          <IconTextButton icon="fi fi-rs-home" txt="Dashboard" :active="route.path === '/dashboard/home'"
            @click="router.push('/dashboard/home')" />

          <IconTextButton icon="fi fi-rs-ticket" txt="Reservas" :active="route.path === '/dashboard/bookings'"
            @click="router.push('/dashboard/bookings')" />

          <IconTextButtonNested icon="fi fi-rs-road" txt="Viagens" :active="active.main === 'viagens'"
            @click="active.main = active.main === 'viagens' ? null : 'viagens'; active.nest = null"
            :nests="viagensNests" v-model:selectedNest="active.nest" />

          <IconTextButtonNested icon="fi fi-rs-route" txt="Rotas" :active="active.main === 'rotas'"
            @click="active.main = active.main === 'rotas' ? null : 'rotas'; active.nest = null" :nests="rotasNests"
            v-model:selectedNest="active.nest" />

          <template v-if="isAdmin">
            <IconTextButtonNested icon="fi fi-rs-settings" txt="Operacional" :active="active.main === 'operacional'"
              @click="active.main = active.main === 'operacional' ? null : 'operacional'; active.nest = null"
              :nests="operacionalNests" v-model:selectedNest="active.nest" />
          </template>

          <div class="logOut">
            <IconText @click="handleLogout" icon="fi fi-rs-exit" txt="Sair da Conta" background="#ff0000" />
          </div>
        </nav>
      </div>
    </div>

    <div class="line">
      <hr />
    </div>
  </div>
</template>

<style scoped>
.wrapperr {
  display: flex;
  flex-shrink: 0;
}

.line hr {
  height: 100vh;
  width: 3px;
  background: #D8D8D8;
  border: none;
}

.main {
  width: 300px;
  height: 100vh;
  background: #F6F6F6;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 40px 32px;
  gap: 5px;
  overflow-y: auto;
  overflow-x: hidden;
}

.main::-webkit-scrollbar {
  width: 4px;
}

.main::-webkit-scrollbar-track {
  background: transparent;
}

.main::-webkit-scrollbar-thumb {
  background: #c8c8c8;
  border-radius: 4px;
}

.main::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.logo {
  flex-shrink: 0;
  height: auto;
  width: 100%;
}

.logo img {
  width: 160px;
  height: auto;
}

.menu {
  margin-top: 16px;
  min-width: 0;
}

nav {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: auto;
}

.logOut {
  height: 45px;
  width: 100%;
  margin-top: 40px;
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .main {
    width: 160px;
    padding: 16px 10px;
  }

  .logo img {
    width: 100px;
  }

  .logOut {
    margin-top: 16px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .main {
    width: 180px;
    padding: 20px 14px;
  }

  .logo img {
    width: 110px;
  }

  .logOut {
    margin-top: 20px;
  }
}

@media (min-width: 1024px) and (max-width: 1279px) {
  .main {
    width: 210px;
    padding: 24px 16px;
  }

  .logo img {
    width: 120px;
  }

  .logOut {
    margin-top: 24px;
  }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .main {
    width: 240px;
    padding: 32px 24px;
  }

  .logo img {
    width: 140px;
  }
}

@media (min-width: 1440px) and (max-width: 1599px) {
  .main {
    width: 270px;
    padding: 38px 28px;
  }

  .logo img {
    width: 155px;
  }
}

@media (min-width: 1600px) and (max-width: 1919px) {
  .main {
    width: 290px;
    padding: 42px 32px;
  }
}

@media (min-width: 1920px) {
  .main {
    width: 350px;
    padding: 50px;
  }

  .logo img {
    width: 200px;
  }
}
</style>
