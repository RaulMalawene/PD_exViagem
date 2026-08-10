<script setup>
defineProps({
  // A altura reservada evita que a página salte quando os dados chegam.
  height: { type: String, default: '420px' },
  label: { type: String, default: '' },
})
</script>

<template>
  <div class="loaderWrapper" :style="{ height }">
    <div class="loader" />
    <p v-if="label" class="loaderLabel">{{ label }}</p>
  </div>
</template>

<style scoped>
.loaderWrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.loader {
  width: 36px;
  height: 36px;
  border: 3px solid #f0f0f0;
  border-top-color: #922877;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.loaderLabel {
  font-size: 13px;
  color: #999;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 767px) {
  .loaderWrapper {
    height: 240px !important;
  }
}
</style>
