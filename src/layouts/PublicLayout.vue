<script setup>
import PublicHeader from '../components/PublicHeader.vue'
</script>

<template>
  <div class="publicLayout">
    <PublicHeader />
    <RouterView />
  </div>
</template>

<style scoped>
.publicLayout {
  min-height: 100vh;
  background: #F6F6F6;
}
</style>