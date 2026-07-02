<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()

onMounted(async () => {
  if (authStore.token) {
    try {
      await authStore.getMe()
    } catch {
      authStore.logout()
    }
  }
})
</script>

<template>
  <RouterView />
</template>
