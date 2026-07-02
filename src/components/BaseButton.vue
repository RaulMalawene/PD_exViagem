<script setup>
defineProps({
  text: String,
  type: {
    type: String,
    default: 'button',
  },
  disabled: Boolean,
})

defineEmits(['click'])
</script>

<template>
  <button :type="type" :disabled="disabled" @click="$emit('click')">
    {{ text }}
  </button>
</template>

<style scoped>
button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #A3206A;
  color: white;
  font-weight: 600;
  cursor: pointer;
}

button:hover {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
