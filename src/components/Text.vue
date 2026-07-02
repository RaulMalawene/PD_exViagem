<script setup>
defineProps({
  txt: String,
  color: {
    type: String,
    default: '#000',
  },
  weight: {
    type: [String, Number],
    default: '400',
  },
  size: {
    type: String,
    default: '16px',
  },
})
</script>

<template>
  <p :style="{ color, fontWeight: weight, fontSize: size }">{{ txt }}</p>
</template>
