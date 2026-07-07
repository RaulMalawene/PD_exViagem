<script setup>
import { useToast } from '../composables/useToast'

const { notification } = useToast()
</script>

<template>
  <Transition name="toast">
    <div v-if="notification" :class="['toast', `toast--${notification.type}`]">
      <i :class="notification.type === 'success' ? 'fi fi-sr-check-circle' : 'fi fi-sr-cross-circle'" />
      <span>{{ notification.message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 99999;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  min-width: 280px;
}

.toast--success {
  background: #922877;
}

.toast--error {
  background: #e74c3c;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

@media (max-width: 600px) {
  .toast {
    bottom: 15px;
    right: 15px;
    left: 15px;
    min-width: auto;
    width: calc(100% - 30px);
  }
}
</style>
