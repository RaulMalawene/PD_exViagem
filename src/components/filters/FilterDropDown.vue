<script setup>
defineProps({
  txt: String,
  options: {
    type: Array,
    default: () => [],
  },
  icon: String,
  color: String,
  modelValue: String,
})

const emit = defineEmits(['update:modelValue'])

function getLabel(option) {
  return typeof option === 'object' ? (option.label ?? option.name ?? option.value) : option
}

function getValue(option) {
  return typeof option === 'object' ? (option.value ?? option.id) : option
}
</script>

<template>
  <div class="DropDownWrapper">
    <div class="filterTitle">
      <i :class="icon" :style="{ color }"></i>
      <p>{{ txt }}</p>
    </div>

    <div class="selectWrapper">
      <select :value="modelValue" @change="emit('update:modelValue', $event.target.value)">
        <option value="">Selecione uma opção</option>
        <option v-for="option in options" :key="getValue(option)" :value="getValue(option)">
          {{ getLabel(option) }}
        </option>
      </select>

      <i class="fi fi-rs-angle-small-down"></i>
    </div>
  </div>
</template>

<style scoped>
.DropDownWrapper {
  height: 100%;
  flex: 1;
  min-width: 130px;
  max-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.DropDownWrapper p {
  color: #333;
  font-weight: 200;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selectWrapper {
  position: relative;
  width: 100%;
}

.selectWrapper i {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #555;
  display: flex;
  align-items: center;
}

select {
  height: 40px;
  width: 100%;
  background: white;
  border: none;
  border-radius: 5px;
  padding: 0 40px 0 10px;
  cursor: pointer;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  font-size: 14px;
}

.filterTitle {
  display: flex;
  gap: 10px;
}
</style>
