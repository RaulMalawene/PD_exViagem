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
</style>
