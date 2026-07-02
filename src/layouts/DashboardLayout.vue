<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import Logo from '../assets/logoPD.svg'
import IconTextButton from '../components/IconTextButton.vue'
import IconText from '../components/IconText.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const role = computed(() => authStore.user?.role)
const isAdmin = computed(() => role.value === 'admin')
const isStaff = computed(() => role.value === 'staff')
const isDriver = computed(() => role.value === 'driver')

const adminMenu = [
  { txt: 'Dashboard', icon: 'fi fi-rs-home', route: '/dashboard/home' },
  { txt: 'Reservas', icon: 'fi fi-rs-ticket', route: '/dashboard/bookings' },
  { txt: 'Viagens', icon: 'fi fi-rs-road', route: '/dashboard/trips' },
  { txt: 'Horários', icon: 'fi fi-rs-clock', route: '/dashboard/schedules' },
  { txt: 'Rotas', icon: 'fi fi-rs-map-marker-road', route: '/dashboard/routes' },
  { txt: 'Veículos', icon: 'fi fi-rs-bus', route: '/dashboard/vehicles' },
  { txt: 'Motoristas', icon: 'fi fi-rs-user-helmet-safety', route: '/dashboard/drivers' },
  { txt: 'Utilizadores', icon: 'fi fi-rs-users', route: '/dashboard/users' },
]

const staffMenu = [
  { txt: 'Dashboard', icon: 'fi fi-rs-home', route: '/dashboard/home' },
  { txt: 'Reservas', icon: 'fi fi-rs-ticket', route: '/dashboard/bookings' },
  { txt: 'Viagens', icon: 'fi fi-rs-road', route: '/dashboard/trips' },
]

const driverMenu = [
  { txt: 'Dashboard', icon: 'fi fi-rs-home', route: '/dashboard/home' },
]

const menuItems = computed(() => {
  if (isAdmin.value) return adminMenu
  if (isStaff.value) return staffMenu
  return driverMenu
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="main">
    <div class="sidebar">
      <div class="sidebarInner">
        <div class="logo">
          <img :src="Logo" alt="PD Viagens" />
        </div>

        <div class="menu">
          <nav>
            <IconTextButton v-for="item in menuItems" :key="item.route" :icon="item.icon" :txt="item.txt"
              :active="route.path === item.route" @click="router.push(item.route)" />

            <div class="logOut">
              <IconText @click="handleLogout" icon="fi fi-rs-exit" txt="Sair da Conta" background="#e74c3c"
                textcolor="#fff" />
            </div>
          </nav>
        </div>
      </div>

      <div class="line">
        <hr />
      </div>
    </div>

    <div class="windows">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.main {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  display: flex;
  flex-shrink: 0;
}

.sidebarInner {
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

.sidebarInner::-webkit-scrollbar {
  width: 4px;
}

.sidebarInner::-webkit-scrollbar-track {
  background: transparent;
}

.sidebarInner::-webkit-scrollbar-thumb {
  background: #c8c8c8;
  border-radius: 4px;
}

.line hr {
  height: 100vh;
  width: 3px;
  background: #D8D8D8;
  border: none;
}

.logo {
  flex-shrink: 0;
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
}

.logOut {
  height: 45px;
  width: 100%;
  margin-top: 40px;
  flex-shrink: 0;
}

.windows {
  flex: 1;
  min-width: 0;
  height: 100vh;
  background: #f0f0f0;
  padding: 65px;
  overflow-y: auto;
  overflow-x: auto;
}

.windows::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.windows::-webkit-scrollbar-track {
  background: transparent;
}

.windows::-webkit-scrollbar-thumb {
  background: #c8c8c8;
  border-radius: 99px;
}

.windows::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

@media (max-width: 767px) {
  .sidebarInner {
    width: 160px;
    padding: 16px 10px;
  }

  .logo img {
    width: 100px;
  }

  .logOut {
    margin-top: 16px;
  }

  .windows {
    padding: 12px 16px;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .sidebarInner {
    width: 180px;
    padding: 20px 14px;
  }

  .logo img {
    width: 110px;
  }

  .logOut {
    margin-top: 20px;
  }

  .windows {
    padding: 16px 20px;
  }
}

@media (min-width: 1024px) and (max-width: 1279px) {
  .sidebarInner {
    width: 210px;
    padding: 24px 16px;
  }

  .logo img {
    width: 120px;
  }

  .logOut {
    margin-top: 24px;
  }

  .windows {
    padding: 28px 24px;
  }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .sidebarInner {
    width: 240px;
    padding: 32px 24px;
  }

  .logo img {
    width: 140px;
  }

  .windows {
    padding: 40px;
  }
}

@media (min-width: 1440px) and (max-width: 1599px) {
  .sidebarInner {
    width: 270px;
    padding: 38px 28px;
  }

  .logo img {
    width: 155px;
  }

  .windows {
    padding: 50px;
  }
}

@media (min-width: 1600px) and (max-width: 1919px) {
  .sidebarInner {
    width: 290px;
    padding: 42px 32px;
  }

  .windows {
    padding: 55px 60px;
  }
}

@media (min-width: 1920px) {
  .sidebarInner {
    width: 350px;
    padding: 50px;
  }

  .logo img {
    width: 200px;
  }

  .windows {
    padding: 65px;
  }
}
</style>
