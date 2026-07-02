<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import Text from './Text.vue'

const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)

const roleLabel = computed(() => {
  const map = { admin: 'Administrador', staff: 'Staff', driver: 'Motorista' }
  return map[user.value?.role] ?? user.value?.role ?? ''
})

const isOpen = ref(false)

const handleOutside = () => {
  isOpen.value = false
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
        </div>

        <div class="Divider" />

        <div class="CardActions">
          <button class="btn-logout" @click="handleLogout">
            <i class="fi fi-rs-exit" /> Sair da conta
          </button>
        </div>
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
  background: #A3206A;
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
  width: 280px;
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
  background: #A3206A;
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
  gap: 4px;
}

.userName {
  font-size: 15px;
  font-weight: 700;
  color: #222;
}

.userRole {
  font-size: 12px;
  color: #A3206A;
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
  color: #A3206A;
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
  background-color: #f5f5f5;
  color: #555;
}

.btn-logout:hover {
  opacity: 0.85;
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
</style>
