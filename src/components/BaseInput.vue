<script setup>
defineProps({
  label: String,
  type: {
    type: String,
    default: 'text',
  },
  placeholder: String,
  icon: String,
  modelValue: String,
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="inputWrapper">
    <label>{{ label }}</label>

    <div class="inputBox">
      <i :class="icon"></i>

      <input
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>
  </div>
</template>

<style scoped>
.inputWrapper {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

label {
  font-size: 13px;
  color: #333;
}

.inputBox {
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid #ddd;
  padding: 10px;
  border-radius: 8px;
  background: #fff;
}

input {
  border: none;
  outline: none;
  width: 100%;
}

i {
  color: #A3206A;
  position: relative;
  top: 1px;
}
</style>
