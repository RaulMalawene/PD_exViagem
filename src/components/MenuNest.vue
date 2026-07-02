<script setup>
import TextButton from './TextButton.vue'

defineProps({
  txt: String,
  icon: String,
  active: Boolean,
})
</script>

<template>
  <div class="fakebuttonn" :class="{ selected: active }">
    <i :class="icon"></i>

    <TextButton :txt="txt" weight="200" size="15px" />
  </div>
</template>

<style scoped>
.fakebuttonn {
  height: 45px;
  width: 100%;
  background: #EEEEEE;
  border-radius: 5px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 15px 20px;
  cursor: pointer;
  transition: 0.3s;
  color: #221F20;
  min-width: 0;
}

.fakebuttonn i {
  position: relative;
  top: 2px;
  flex-shrink: 0;
}

.fakebuttonn.selected {
  background: #A3206A;
  color: white;
}

@media (min-width: 1024px) and (max-width: 1279px) {
  .fakebuttonn {
    padding: 10px;
    font-size: 13px;
    gap: 6px;
  }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .fakebuttonn {
    padding: 12px 14px;
  }
}
</style>
