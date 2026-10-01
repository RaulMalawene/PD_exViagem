<script setup>
import TextButton from './TextButton.vue'

defineProps({
  txt: String,
  icon: String,
  background: String,
  bborder: String,
  color: String,
  textcolor: String,
  active: Boolean,
})
</script>

<template>
  <div
    class="fakebutton"
    :class="{ selected: active }"
    :style="{ background, border: bborder }"
  >
    <i :class="icon" :style="{ color }"></i>

    <TextButton :txt="txt" :textcolor="textcolor" weight="200" size="15px" />
  </div>
</template>

<style scoped>
.fakebutton {
  height: 40px;
  width: 100%;
  border-radius: 5px;
  display: flex;
  align-items: center;
  padding: 15px;
  padding-left: 28px;
  gap: 10px;
  cursor: pointer;
  transition: 0.3s;
  color: #ffffff;
}

.fakebutton i {
  position: relative;
  top: 2px;
}

@media (max-width: 767px) {
  .fakebutton {
    height: 38px;
    padding: 12px;
    padding-left: 18px;
    font-size: 13px;
  }

  .fakebutton :deep(p) {
    font-size: 13px !important;
  }
}

@media (min-width: 768px) and (max-width: 1279px) {
  .fakebutton {
    height: 38px;
    padding: 12px;
    padding-left: 20px;
  }

  .fakebutton :deep(p) {
    font-size: 13px !important;
  }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .fakebutton :deep(p) {
    font-size: 14px !important;
  }
}
</style>
