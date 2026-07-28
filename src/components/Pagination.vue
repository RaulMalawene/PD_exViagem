<script setup>
import { computed } from 'vue'

const props = defineProps({
  pagination: { type: Object, required: true },
})

const emit = defineEmits(['change'])

function goTo(page) {
  if (page < 1 || page > props.pagination.last_page) return
  emit('change', page)
}

const pageNumbers = computed(() => {
  const current = props.pagination.current_page
  const last = props.pagination.last_page
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)

  const range = []
  const start = Math.max(1, current - 2)
  const end = Math.min(last, current + 2)

  if (start > 1) { range.push(1); if (start > 2) range.push('...') }
  for (let i = start; i <= end; i++) range.push(i)
  if (end < last) { if (end < last - 1) range.push('...'); range.push(last) }

  return range
})
</script>

<template>
  <div class="pagination" v-if="pagination.last_page > 1">
    <span class="pageInfo">{{ pagination.from }}-{{ pagination.to }} de {{ pagination.total }} registos</span>

    <div class="pageControls">
      <button class="pageBtn" :disabled="pagination.current_page === 1" @click="goTo(pagination.current_page - 1)">
        <i class="fi fi-sr-angle-left" />
      </button>

      <template v-for="(page, i) in pageNumbers" :key="i">
        <span v-if="page === '...'" class="pageEllipsis">&hellip;</span>
        <button v-else class="pageNumBtn" :class="{ active: page === pagination.current_page }" @click="goTo(page)">
          {{ page }}
        </button>
      </template>

      <button class="pageBtn" :disabled="pagination.current_page === pagination.last_page" @click="goTo(pagination.current_page + 1)">
        <i class="fi fi-sr-angle-right" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.pageControls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.pageInfo {
  font-size: 13px;
  color: #999;
}

.pageBtn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  transition: background 0.15s;
}

.pageBtn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.pageBtn:not(:disabled):hover {
  background: #e0e0e0;
}

.pageNumBtn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: none;
  background: #f0f0f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  transition: background 0.15s;
}

.pageNumBtn:hover {
  background: #e0e0e0;
}

.pageNumBtn.active {
  background: #922877;
  color: white;
  font-weight: 600;
}

.pageEllipsis {
  font-size: 13px;
  color: #999;
  padding: 0 4px;
}

@media (max-width: 767px) {
  .pageInfo {
    font-size: 12px;
  }

  .pageBtn,
  .pageNumBtn {
    width: 28px;
    height: 28px;
    min-width: 28px;
    font-size: 12px;
  }
}
</style>
