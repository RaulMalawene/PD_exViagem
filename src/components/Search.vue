<script setup>
defineProps({
  txt: String,
  modelValue: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="searchWrapper">
    <div class="inputWrapper">
      <div class="icon">
        <i class="fi fi-bs-search"></i>
      </div>

      <input
        type="text"
        :placeholder="txt"
        :value="modelValue"
        @input="emit('update:modelValue', $event.target.value)"
      />
    </div>
  </div>
</template>

<style scoped>
.inputWrapper {
  position: relative;
  width: clamp(220px, 40vw, 450px);
  display: flex;
  align-items: center;
}

input {
  width: 100%;
  height: 40px;
  padding: 10px 10px 10px 45px;
  border-radius: 5px;
  background-color: #ffffff;
  border: none;
  outline: none;
}

.icon {
  position: absolute;
  left: 15px;
  top: 55%;
  transform: translateY(-50%);
  color: #999;
  font-size: 13px;
}
</style>
