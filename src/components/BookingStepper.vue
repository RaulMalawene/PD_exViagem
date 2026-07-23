<script setup>
const props = defineProps({
  current: { type: Number, default: 1 },
})

const emit = defineEmits(['step-click'])

const steps = [
  { n: 1, label: 'Viagem' },
  { n: 2, label: 'Assentos' },
  { n: 3, label: 'Dados' },
  { n: 4, label: 'Pagamento' },
]

function handleClick(step) {
  if (step.n >= props.current) return
  emit('step-click', step.n)
}
</script>

<template>
  <div class="stepper">
    <div v-for="(step, i) in steps" :key="step.n" class="stepWrap">
      <div
        class="step"
        :class="{ active: step.n === current, done: step.n < current, clickable: step.n < current }"
        @click="handleClick(step)"
      >
        <div class="stepCircle">
          <i v-if="step.n < current" class="fi fi-sr-check checkIcon" />
          <span v-else>{{ step.n }}</span>
        </div>
        <span class="stepLabel">{{ step.label }}</span>
      </div>
      <div v-if="i < steps.length - 1" class="connector" :class="{ filled: step.n < current }" />
    </div>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  padding: 20px 16px;
  background: #fff;
  border-bottom: 1px solid #EEEEEE;
}

.stepWrap {
  display: flex;
  align-items: center;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.step.clickable {
  cursor: pointer;
}

.step.clickable:hover .stepCircle {
  opacity: 0.8;
}

.step.clickable:hover .stepLabel {
  text-decoration: underline;
}

.stepCircle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #EEEEEE;
  color: #aaa;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}

.step.active .stepCircle {
  background: #922877;
  color: #fff;
}

.step.done .stepCircle {
  background: #922877;
  color: #fff;
}

.checkIcon {
  font-size: 12px;
  position: relative;
  top: 1px;
}

.stepLabel {
  font-size: 11px;
  font-weight: 500;
  color: #bbb;
  white-space: nowrap;
  transition: color 0.2s;
}

.step.active .stepLabel {
  color: #922877;
  font-weight: 700;
}

.step.done .stepLabel {
  color: #922877;
}

.connector {
  width: clamp(24px, 6vw, 60px);
  height: 2px;
  background: #EEEEEE;
  margin: 0 4px;
  margin-bottom: 18px;
  transition: background 0.2s;
  flex-shrink: 0;
}

.connector.filled {
  background: #922877;
}
</style>