<script setup>
import { ref, computed, watch, watchEffect } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import Logo from '../assets/logoPD.svg'
import IconTextButton from '../components/IconTextButton.vue'
import IconText from '../components/IconText.vue'
import TextButton from '../components/TextButton.vue'

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
  { txt: 'Mercadorias', icon: 'fi fi-rs-box-open', route: '/dashboard/shipments' },
  { txt: 'Viagens Completas', icon: 'fi fi-rs-arrows-repeat', route: '/dashboard/round-trips' },
  {
    group: 'Operacional',
    icon: 'fi fi-rs-settings-sliders',
    items: [
      { txt: 'Rotas', icon: 'fi fi-rs-map-marker-road', route: '/dashboard/routes' },
      { txt: 'Horários', icon: 'fi fi-rs-clock', route: '/dashboard/schedules' },
      { txt: 'Veículos', icon: 'fi fi-rs-bus', route: '/dashboard/vehicles' },
      { txt: 'Motoristas', icon: 'fi fi-rs-user-helmet-safety', route: '/dashboard/drivers' },
      { txt: 'Ajudantes', icon: 'fi fi-rs-user-helmet-safety', route: '/dashboard/helpers' },
      { txt: 'Utilizadores', icon: 'fi fi-rs-users', route: '/dashboard/users' },
    ],
  },
  {
    group: 'Relatórios',
    icon: 'fi fi-rs-chart-histogram',
    items: [
      { txt: 'Ocupação por Viagem', icon: 'fi fi-rs-bus', route: '/dashboard/reports/occupancy' },
      { txt: 'Financeiro', icon: 'fi fi-rs-money-bill-wave', route: '/dashboard/reports/financial' },
      { txt: 'Descontos Aplicados', icon: 'fi fi-rs-badge-percent', route: '/dashboard/reports/discounts' },
    ],
  },
]

const staffMenu = [
  { txt: 'Dashboard', icon: 'fi fi-rs-home', route: '/dashboard/home' },
  { txt: 'Reservas', icon: 'fi fi-rs-ticket', route: '/dashboard/bookings' },
  { txt: 'Mercadorias', icon: 'fi fi-rs-box-open', route: '/dashboard/shipments' },
  { txt: 'Viagens Completas', icon: 'fi fi-rs-arrows-repeat', route: '/dashboard/round-trips' },
  {
    group: 'Relatórios',
    icon: 'fi fi-rs-chart-histogram',
    items: [
      { txt: 'Ocupação por Viagem', icon: 'fi fi-rs-bus', route: '/dashboard/reports/occupancy' },
      { txt: 'Financeiro', icon: 'fi fi-rs-money-bill-wave', route: '/dashboard/reports/financial' },
      { txt: 'Descontos Aplicados', icon: 'fi fi-rs-badge-percent', route: '/dashboard/reports/discounts' },
    ],
  },
]

const driverMenu = [
  { txt: 'Dashboard', icon: 'fi fi-rs-home', route: '/dashboard/home' },
]

const menuItems = computed(() => {
  if (isAdmin.value) return adminMenu
  if (isStaff.value) return staffMenu
  return driverMenu
})

const mobileOpen = ref(false)

const openGroups = ref({})

function isGroupOpen(name) {
  return !!openGroups.value[name]
}

function toggleGroup(name) {
  openGroups.value[name] = !openGroups.value[name]
}

watchEffect(() => {
  for (const item of menuItems.value) {
    if (item.group && item.items.some((sub) => sub.route === route.path)) {
      openGroups.value[item.group] = true
    }
  }
})

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

watch(() => route.path, () => {
  mobileOpen.value = false
})
</script>

<template>
  <div class="main">
    <div class="mobileTopBar">
      <button class="hamburgerBtn" @click="mobileOpen = true">
        <i class="fi fi-rs-burger-menu" />
      </button>
      <img :src="Logo" alt="PD Viagens" class="mobileLogo" />
    </div>

    <div class="mobileBackdrop" v-if="mobileOpen" @click="mobileOpen = false" />

    <div class="sidebar" :class="{ open: mobileOpen }">
      <div class="sidebarInner">
        <div class="logo">
          <img :src="Logo" alt="PD Viagens" />
        </div>

        <div class="menu">
          <nav>
            <template v-for="item in menuItems" :key="item.group ?? item.route">
              <IconTextButton v-if="!item.group" :icon="item.icon" :txt="item.txt"
                :active="route.path === item.route" @click="router.push(item.route)" />

              <div v-else class="menuGroup">
                <div class="groupHeader" :class="{ open: isGroupOpen(item.group) }" @click="toggleGroup(item.group)">
                  <i :class="item.icon"></i>
                  <TextButton :txt="item.group" weight="200" size="15px" />
                  <i class="fi fi-rs-angle-small-down chevron"></i>
                </div>

                <div class="groupItems" v-show="isGroupOpen(item.group)">
                  <IconTextButton v-for="sub in item.items" :key="sub.route" :icon="sub.icon" :txt="sub.txt"
                    :active="route.path === sub.route" @click="router.push(sub.route)" />
                </div>
              </div>
            </template>

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

.menuGroup {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.groupHeader {
  height: 45px;
  width: 100%;
  display: flex;
  align-items: center;
  padding: 15px;
  padding-left: 28px;
  gap: 10px;
  cursor: pointer;
  color: #221F20;
  border-radius: 5px;
  transition: 0.3s;
}

.groupHeader:hover {
  background: #EEEEEE;
}

.groupHeader i:first-child {
  position: relative;
  top: 2px;
  color: #922877;
}

.groupHeader .chevron {
  margin-left: auto;
  font-size: 11px;
  color: #999;
  transition: transform 0.2s;
}

.groupHeader.open .chevron {
  transform: rotate(180deg);
}

.groupItems {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-left: 18px;
  border-left: 2px solid #E5E5E5;
  margin-left: 20px;
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

.mobileTopBar {
  display: none;
}

.mobileBackdrop {
  display: none;
}

@media (max-width: 767px) {
  .mobileTopBar {
    display: flex;
    align-items: center;
    gap: 16px;
    height: 56px;
    padding: 0 16px;
    background: #F6F6F6;
    border-bottom: 1px solid #E5E5E5;
    flex-shrink: 0;
  }

  .hamburgerBtn {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 8px;
    background: #EEEEEE;
    color: #922877;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .mobileLogo {
    height: 26px;
    width: auto;
  }

  .mobileBackdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 1999;
  }

  .main {
    flex-direction: column;
    height: 100vh;
  }

  .sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 2000;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .sidebar.open {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
  }

  .sidebarInner {
    width: 260px;
    padding: 24px 20px;
  }

  .logo img {
    width: 130px;
  }

  .logOut {
    margin-top: 16px;
  }

  .windows {
    flex: 1;
    height: auto;
    padding: 16px;
  }
}

@media (max-width: 1279px) {
  .groupHeader {
    height: 40px;
    padding: 12px;
    padding-left: 18px;
    gap: 8px;
  }

  .groupHeader :deep(p) {
    font-size: 13px !important;
  }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .groupHeader {
    height: 42px;
    padding-left: 22px;
  }

  .groupHeader :deep(p) {
    font-size: 14px !important;
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
