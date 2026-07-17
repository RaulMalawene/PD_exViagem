<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue'])

function buildInitialGrid(modelValue) {
  if (!modelValue?.rows?.length) {
    // 6 filas x 4 colunas, corredor na 3a posicao nas primeiras 5 filas,
    // ultima fila (banco corrido) sem corredor - 19 lugares, layout ja usado na frota
    return Array.from({ length: 6 }, (_, rowIdx) =>
      rowIdx < 5 ? [true, true, false, true] : [true, true, true, true]
    )
  }

  const maxCols = Math.max(...modelValue.rows.map((row) => row.length))

  return modelValue.rows.map((row) =>
    Array.from({ length: maxCols }, (_, i) => row[i] !== undefined && row[i] !== null)
  )
}

const grid = ref(buildInitialGrid(props.modelValue))

const numCols = computed(() => grid.value[0]?.length ?? 0)

const rowsWithCodes = computed(() =>
  grid.value.map((row, rowIdx) => {
    let letterIndex = 0
    return row.map((isSeat) => {
      if (!isSeat) return null
      const code = `${rowIdx + 1}${String.fromCharCode(65 + letterIndex)}`
      letterIndex++
      return code
    })
  })
)

const seatCount = computed(() =>
  rowsWithCodes.value.reduce((sum, row) => sum + row.filter((cell) => cell !== null).length, 0)
)

function addRow() {
  const cols = numCols.value || 4
  grid.value = [...grid.value, Array.from({ length: cols }, () => true)]
}

function removeRow() {
  if (grid.value.length <= 1) return
  grid.value = grid.value.slice(0, -1)
}

function addColumn() {
  grid.value = grid.value.map((row) => [...row, true])
}

function removeColumn() {
  if (numCols.value <= 1) return
  grid.value = grid.value.map((row) => row.slice(0, -1))
}

function toggleCell(rowIdx, colIdx) {
  grid.value = grid.value.map((row, r) =>
    r !== rowIdx ? row : row.map((cell, c) => (c === colIdx ? !cell : cell))
  )
}

watch(rowsWithCodes, (rows) => {
  emit('update:modelValue', { rows })
}, { immediate: true, deep: true })
</script>

<template>
  <div class="layoutEditor">
    <div class="layoutControls">
      <button type="button" class="ctrlBtn" @click="addRow">+ Fila</button>
      <button type="button" class="ctrlBtn" @click="removeRow">– Fila</button>
      <button type="button" class="ctrlBtn" @click="addColumn">+ Coluna</button>
      <button type="button" class="ctrlBtn" @click="removeColumn">– Coluna</button>
    </div>

    <div class="grid">
      <div v-for="(row, rowIdx) in grid" :key="rowIdx" class="gridRow">
        <div
          v-for="(isSeat, colIdx) in row"
          :key="colIdx"
          class="cell"
          :class="{ seat: isSeat, aisle: !isSeat }"
          @click="toggleCell(rowIdx, colIdx)"
        >
          {{ isSeat ? rowsWithCodes[rowIdx][colIdx] : '' }}
        </div>
      </div>
    </div>

    <p class="hint">Clique numa célula para alternar entre lugar e corredor. <strong>{{ seatCount }}</strong> lugares definidos.</p>
  </div>
</template>

<style scoped>
.layoutEditor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.layoutControls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ctrlBtn {
  height: 32px;
  padding: 0 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Ubuntu', sans-serif;
  transition: background 0.15s;
}

.ctrlBtn:hover {
  background: #f6f6f6;
}

.grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.gridRow {
  display: flex;
  gap: 6px;
}

.cell {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s;
}

.cell.seat {
  background: #922877;
  color: #fff;
}

.cell.seat:hover {
  opacity: 0.85;
}

.cell.aisle {
  background: #f0f0f0;
  border: 1.5px dashed #d8d8d8;
}

.cell.aisle:hover {
  background: #e6e6e6;
}

.hint {
  font-size: 12px;
  color: #888;
}

.hint strong {
  color: #922877;
}
</style>
