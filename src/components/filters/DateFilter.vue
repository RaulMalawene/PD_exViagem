<script setup>
defineProps({
  txt: String,
  icon: String,
  color: String,
  modelValue: String,
})

const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <div class="DateFilterComponent">
    <div class="filterTitle">
      <i :class="icon" :style="{ color }"></i>
      <p>{{ txt }}</p>
    </div>

    <input
      type="date"
      :value="modelValue"
      @change="emit('update:modelValue', $event.target.value)"
    />
  </div>
</template>

<style scoped>
.DateFilterComponent {
  height: 100%;
  flex: 1;
  min-width: 110px;
  max-width: 160px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.DateFilterComponent p {
  color: #333;
  font-weight: 200;
  font-size: 14px;
  white-space: nowrap;
}

.DateFilterComponent input {
  height: 40px;
  width: 100%;
  background: #ffffff;
  padding: 0 8px;
  border: none;
  border-radius: 5px;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.filterTitle {
  display: flex;
  gap: 10px;
}

@media (max-width: 767px) {
  .DateFilterComponent p {
    font-size: 13px;
  }

  .DateFilterComponent input {
    height: 38px;
    font-size: 12px;
  }
}

@media (min-width: 768px) and (max-width: 1279px) {
  .DateFilterComponent p {
    font-size: 13px;
  }

  .DateFilterComponent input {
    height: 38px;
    font-size: 12px;
  }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .DateFilterComponent p {
    font-size: 13px;
  }
}
</style>
