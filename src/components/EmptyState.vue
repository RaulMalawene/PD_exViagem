<script setup>
import Text from './Text.vue'

defineProps({
  title: { type: String, default: 'Nenhum resultado encontrado' },
  message: { type: String, default: '' },
  icon: { type: String, default: 'fi fi-sr-folder-open' },
  height: { type: String, default: '420px' },
})
</script>

<template>
  <div class="emptyState" :style="{ height }">
    <i :class="icon" class="emptyIcon" />
    <Text :txt="title" color="922877" weight="600" size="22px" />
    <p v-if="message" class="emptyText">{{ message }}</p>
    <slot />
  </div>
</template>

<style scoped>
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.emptyIcon {
  font-size: 48px;
  color: #922877;
  opacity: 0.4;
}

.emptyText {
  font-size: 14px;
  color: #999;
  max-width: 420px;
}

@media (max-width: 767px) {
  .emptyState {
    height: 240px !important;
  }
}
</style>
