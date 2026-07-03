<script setup>
defineProps({
  modelValue: String,
  placeholder: {
    type: String,
    default: 'Pesquisar...',
  },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="searchWrapper">
    <i class="fi fi-sr-search"></i>

    <input
      type="text"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<style scoped>
.searchWrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  background: #F0F0F0;
  border-radius: 5px;
  padding: 0 14px;
  border: 1.5px solid transparent;
  transition: 0.2s;
}

.searchWrapper:focus-within {
  border-color: #922877;
  background: #fff;
}

i {
  color: #922877;
  font-size: 14px;
  position: relative;
  top: 1px;
  flex-shrink: 0;
}

input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 14px;
}
</style>
