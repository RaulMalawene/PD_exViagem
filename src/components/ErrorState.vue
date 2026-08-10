<script setup>
import Text from './Text.vue'

defineProps({
  title: { type: String, default: 'Não foi possível carregar os dados' },
  // Vem sempre do parseApiError(): nunca a mensagem crua do servidor.
  message: { type: String, default: '' },
  height: { type: String, default: '420px' },
  retrying: { type: Boolean, default: false },
})

defineEmits(['retry'])
</script>

<template>
  <div class="errorState" :style="{ height }">
    <i class="fi fi-sr-exclamation errorIcon" />
    <Text :txt="title" color="922877" weight="600" size="20px" />
    <p v-if="message" class="errorText">{{ message }}</p>
    <button class="retryBtn" :disabled="retrying" @click="$emit('retry')">
      {{ retrying ? 'A tentar...' : 'Voltar a tentar' }}
    </button>
  </div>
</template>

<style scoped>
.errorState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.errorIcon {
  font-size: 40px;
  color: #e74c3c;
  opacity: 0.6;
}

.errorText {
  font-size: 14px;
  color: #999;
  max-width: 420px;
}

.retryBtn {
  margin-top: 4px;
  height: 40px;
  padding: 0 20px;
  border-radius: 8px;
  border: none;
  background: #922877;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.retryBtn:hover:not(:disabled) {
  opacity: 0.88;
}

.retryBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 767px) {
  .errorState {
    height: 240px !important;
  }
}
</style>
