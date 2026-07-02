<script setup>
const props = defineProps({
  status: {
    type: String,
    required: true,
  },
})

const config = {
  pending: { bg: '#FFF3CD', color: '#856404', label: 'Pendente' },
  confirmed: { bg: '#D1E7DD', color: '#0A3622', label: 'Confirmado' },
  cancelled: { bg: '#F8D7DA', color: '#58151C', label: 'Cancelado' },
  paid: { bg: '#D1E7DD', color: '#0A3622', label: 'Pago' },
  refunded: { bg: '#E2E3E5', color: '#41464B', label: 'Reembolsado' },
}

const current = () => config[props.status] ?? { bg: '#E2E3E5', color: '#41464B', label: props.status }
</script>

<template>
  <span
    class="badge"
    :style="{ background: current().bg, color: current().color }"
  >
    {{ current().label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
