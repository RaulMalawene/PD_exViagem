<script setup>
import Text from './Text.vue'

defineProps({
  title: String,
  data: [String, Number],
})
</script>

<template>
  <div class="statiscWrapper">
    <div class="titleStatistc">
      <i class="fi fi-ss-bullet"></i>
      <Text :txt="title" color="221F20" weight="200" size="17px" />
    </div>
    <Text :txt="data != null ? String(data) : '--'" color="221F20" weight="800" size="30px" />
  </div>
</template>

<style scoped>
.statiscWrapper {
  min-height: 80px;
  height: auto;
  flex: 1;
  min-width: 130px;
  max-width: 230px;
  background: rgb(255, 255, 255);
  border-radius: 10px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}

.titleStatistc {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.titleStatistc i {
  position: relative;
  top: 3px;
  color: #922877;
  flex-shrink: 0;
  font-size: 10px;
}

.titleStatistc :deep(p) {
  line-height: 1.3;
  word-break: break-word;
}

.statiscWrapper > :deep(p) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 767px) {
  .statiscWrapper { min-height: 68px; padding: 10px 12px; }
  .titleStatistc :deep(p) { font-size: 13px !important; }
  .statiscWrapper > :deep(p) { font-size: 22px !important; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .statiscWrapper { min-height: 68px; padding: 10px 12px; min-width: 110px; }
  .titleStatistc :deep(p) { font-size: 13px !important; }
  .statiscWrapper > :deep(p) { font-size: 20px !important; }
}

@media (min-width: 1024px) and (max-width: 1279px) {
  .statiscWrapper { padding: 10px 12px; min-width: 110px; }
  .titleStatistc :deep(p) { font-size: 13px !important; }
  .statiscWrapper > :deep(p) { font-size: 22px !important; }
}

@media (min-width: 1280px) and (max-width: 1439px) {
  .statiscWrapper { padding: 12px 14px; }
  .titleStatistc :deep(p) { font-size: 15px !important; }
  .statiscWrapper > :deep(p) { font-size: 25px !important; }
}

@media (min-width: 1440px) and (max-width: 1599px) {
  .titleStatistc :deep(p) { font-size: 16px !important; }
  .statiscWrapper > :deep(p) { font-size: 28px !important; }
}

@media (min-width: 1600px) and (max-width: 1919px) {
  .titleStatistc :deep(p) { font-size: 17px !important; }
  .statiscWrapper > :deep(p) { font-size: 30px !important; }
}
</style>
