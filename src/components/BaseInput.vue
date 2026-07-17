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
  disabled: {
    type: Boolean,
    default: false,
  },
  min: String,
  max: String,
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="inputWrapper">
    <label>{{ label }}</label>

    <div class="inputBox" :class="{ disabled }">
      <i :class="icon"></i>

      <input
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        :disabled="disabled"
        :min="min"
        :max="max"
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

.inputBox.disabled {
  background: #f6f6f6;
}

.inputBox.disabled input {
  cursor: not-allowed;
  color: #888;
}

input {
  border: none;
  outline: none;
  width: 100%;
}

i {
  color: #922877;
  position: relative;
  top: 1px;
}
</style>
