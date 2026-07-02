<script setup>
defineProps({
  txt: String,
  weight: {
    type: [String, Number],
    default: '400',
  },
  size: {
    type: String,
    default: '16px',
  },
  textcolor: String,
})
</script>

<template>
  <p :style="{ fontWeight: weight, fontSize: size, color: textcolor }">{{ txt }}</p>
</template>
