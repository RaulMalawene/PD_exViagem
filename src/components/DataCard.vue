<script setup>
import Text from './Text.vue'

defineProps({
  icon: String,
  title: String,
  value: String,
  unit: String,
})
</script>

<template>
  <div class="DataBoxWrapper">
    <div class="OrderTitle">
      <i :class="icon"></i>

      <Text :txt="title" color="#fff" weight="400" size="17px" />
    </div>
    <div class="OrderValue">
      <Text :txt="value" color="#fff" weight="600" size="20px" />
      <Text v-if="unit" :txt="unit" color="#8B9B1A" weight="600" size="20px" />
    </div>
  </div>
</template>

<style scoped>
.DataBoxWrapper {
  width: 100%;
  min-height: 76px;
  height: auto;
  border-radius: 8px;
  background: #922877;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 12px 14px 12px 18px;
  gap: 4px;
}

.OrderTitle {
  display: flex;
  align-items: center;
  gap: 8px;
}

.OrderTitle i {
  color: #8B9B1A;
  flex-shrink: 0;
  font-size: 13px;
}

.OrderValue {
  display: flex;
  align-items: baseline;
  gap: 5px;
  flex-wrap: wrap;
  word-break: break-word;
}
</style>
