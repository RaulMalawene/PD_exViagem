<script setup>
import TextButton from './TextButton.vue'

defineProps({
  txt: String,
  icon: String,
  active: Boolean,
})
</script>

<template>
  <div class="fakebutton" :class="{ selected: active }">
    <i :class="icon"></i>

    <TextButton :txt="txt" weight="200" size="15px" />
  </div>
</template>

<style scoped>
.fakebutton {
  height: 45px;
  width: 100%;
  background: #EEEEEE;
  border-radius: 5px;
  display: flex;
  align-items: center;
  padding: 15px;
  padding-left: 28px;
  gap: 10px;
  cursor: pointer;
  transition: 0.3s;
  color: #221F20;
}

.fakebutton i {
  position: relative;
  top: 2px;
  color: #922877;
}

.fakebutton:hover {
  background: #922877;
  color: #EEEEEE;
}

.fakebutton:hover i {
  color: #8B9B1A;
}

.fakebutton.selected {
  background: #922877;
  color: #EEEEEE;
}

.fakebutton.selected i {
  color: #8B9B1A;
}

@media (max-width: 1279px) {
  .fakebutton {
    height: 40px;
    padding: 12px;
    padding-left: 18px;
    gap: 8px;
  }

  .fakebutton :deep(p) {
    font-size: 13px !important;
  }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .fakebutton {
    height: 42px;
    padding-left: 22px;
  }

  .fakebutton :deep(p) {
    font-size: 14px !important;
  }
}
</style>
