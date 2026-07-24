<script setup>
const props = defineProps({
  headers: { type: Array, default: () => [] },
  rows: { type: Array, default: () => [] },
  displayIcon: { type: String, default: 'flex' },
  displayEye: { type: String, default: 'none' },
  color: { type: String, default: '#e74c3c' },
  hideActions: { type: Boolean, default: false },
  rowClass: { type: Function, default: null },
})

const emit = defineEmits(['row-click', 'row-edit', 'row-delete'])

const handleRowClick = (row) => {
  if (window.getSelection()?.toString().length > 0) return
  emit('row-click', row)
}

function visibleEntries(row) {
  return Object.entries(row).filter(([key]) => key !== 'id' && !String(key).startsWith('_'))
}
</script>

<template>
  <div class="tablebaseWrapper">
    <table>
      <thead>
        <tr>
          <th v-for="header in headers" :key="header">{{ header }}</th>
          <th v-if="!hideActions">Acções</th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="(row, index) in rows"
          :key="index"
          :class="[{ 'row-clickable': displayEye !== 'none' }, props.rowClass ? props.rowClass(row) : '']"
          @click="displayEye !== 'none' && handleRowClick(row)"
        >
          <td
            v-for="([key, value], idx) in visibleEntries(row)"
            :key="key"
            :data-label="headers[idx]"
          >
            {{ value }}
          </td>

          <th v-if="!hideActions" class="actionsCell">
            <div class="Icons">
              <i
                class="fi fi-rs-pencil"
                :style="{ display: displayIcon }"
                @click.stop="emit('row-edit', row)"
              ></i>
              <i
                class="fi fi-sr-trash"
                :style="{ display: displayIcon, color }"
                @click.stop="emit('row-delete', row)"
              ></i>
              <div
                class="Eye"
                :style="{ display: displayEye }"
                @click.stop="emit('row-click', row)"
              >
                <i class="fi fi-sr-eye"></i>
              </div>
            </div>
          </th>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.tablebaseWrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
  width: 100%;
  scrollbar-width: thin;
  scrollbar-color: #d4d4d4 transparent;
}

.tablebaseWrapper::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.tablebaseWrapper::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 99px;
}

.tablebaseWrapper::-webkit-scrollbar-thumb {
  background-color: #d4d4d4;
  border-radius: 99px;
}

.tablebaseWrapper::-webkit-scrollbar-thumb:hover {
  background-color: #a8a8a8;
}

table {
  width: 100%;
  min-width: 600px;
  border-collapse: separate;
  border-spacing: 0;
}

thead th {
  position: sticky;
  top: 0;
  background: #EEEEEE;
  z-index: 999;
  white-space: nowrap;
}

th {
  height: 45px;
  text-align: left;
  padding: 0 15px;
  font-weight: 600;
  color: #333;
}

td {
  height: 50px;
  padding: 0 15px;
  border-bottom: 1px solid #f1f1f1;
  color: #555;
}

tbody tr.row-clickable {
  cursor: pointer;
  transition: background 0.15s;
}

tbody tr.row-clickable:hover {
  background: rgba(163, 32, 106, 0.04);
}

.Icons {
  display: flex;
  gap: 10px;
  align-items: center;
}

.Icons i {
  cursor: pointer;
}

.Eye {
  height: 30px;
  width: 30px;
  background: #922877;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.Eye i {
  position: relative;
  top: 2px;
}

@media (max-width: 767px) {
  .tablebaseWrapper {
    max-height: none;
    overflow-x: visible;
  }

  table {
    min-width: 0;
  }

  table, thead, tbody, tr, td, th {
    display: block;
    width: 100%;
  }

  thead {
    display: none;
  }

  tbody tr {
    margin-bottom: 12px;
    border: 1px solid #eee;
    border-radius: 8px;
    padding: 8px 12px;
    background: #fff;
  }

  tbody tr:last-child {
    margin-bottom: 0;
  }

  td {
    height: auto;
    min-height: 36px;
    padding: 6px 0;
    border-bottom: 1px solid #f6f6f6;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: right;
  }

  td:last-of-type {
    border-bottom: none;
  }

  td::before {
    content: attr(data-label);
    font-weight: 600;
    color: #333;
    text-align: left;
  }

  .actionsCell {
    padding: 8px 0 0;
    border-top: 1px solid #f6f6f6;
    margin-top: 4px;
  }

  .Icons {
    justify-content: flex-end;
  }
}
</style>
