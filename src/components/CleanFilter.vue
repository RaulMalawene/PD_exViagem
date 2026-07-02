<script setup>
const emit = defineEmits(['click'])
</script>

<template>
  <div class="selectWrapper" @click="emit('click')">
    <div class="Icon">
      <i class="fi fi-sr-cross-circle"></i>
    </div>
  </div>
</template>

<style scoped>
.selectWrapper {
  width: 40px;
  display: flex;
  align-self: flex-end;
  cursor: pointer;
  flex-shrink: 0;
}

.Icon {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #A3206A;
  border-radius: 5px;
}

.Icon i {
  color: white;
  font-size: 18px;
  position: relative;
  top: 2px;
}
</style>
