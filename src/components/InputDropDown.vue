<script setup>
import { ref, computed, watch } from 'vue'
import Text from './Text.vue'

const props = defineProps({
  width: String,
  label: String,
  modelValue: [String, Number],
  options: {
    type: Array,
    default: () => [],
  },
  error: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['update:modelValue'])

const selectedObj = ref('')
const showList = ref(false)

watch(
  () => [props.modelValue, props.options],
  ([value, options]) => {
    if (!value) {
      selectedObj.value = ''
      return
    }
    const match = options.find((o) => String(o.id) === String(value))
    if (match) selectedObj.value = match.name
  },
  { immediate: true }
)

const filteredOptions = computed(() =>
  props.options.filter((option) =>
    option.name.toLowerCase().includes(selectedObj.value.toLowerCase())
  )
)

const selectObj = (option) => {
  selectedObj.value = option.name
  emit('update:modelValue', option.id)
  showList.value = false
}

const validateObj = () => {
  const exists = props.options.some(
    (option) => option.name.toLowerCase() === selectedObj.value.toLowerCase()
  )

  if (!exists) {
    selectedObj.value = ''
    emit('update:modelValue', null)
  }
}
</script>

<template>
  <div class="InputWrapper" :style="{ width }">
    <label>{{ label }}</label>

    <div class="selectWrapper">
      <input
        type="text"
        v-model="selectedObj"
        @focus="showList = true"
        @blur="validateObj"
        placeholder="Pesquisar..."
      />

      <div class="List" v-if="showList && filteredOptions.length">
        <div
          class="Single"
          v-for="option in filteredOptions"
          :key="option.id"
          @mousedown="selectObj(option)"
        >
          <Text :txt="option.name" color="#333" weight="300" size="16px" />
        </div>
      </div>
    </div>

    <Transition name="field-error">
      <span v-if="error" class="errorMsg">
        <i class="fi fi-sr-exclamation errorIcon" />
        {{ error }}
      </span>
    </Transition>
  </div>
</template>

<style scoped>
.InputWrapper {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

label {
  font-size: 13px;
  color: #333;
}

input {
  width: 100%;
  height: 40px;
  border: 1.5px solid transparent;
  background: #F0F0F0;
  border-radius: 5px;
  padding-left: 12px;
  font-size: 15px;
  transition: 0.2s;
  outline: none;
}

input:focus {
  border-color: #922877;
  background: #fff;
}

.selectWrapper {
  position: relative;
  width: 100%;
  height: 40px;
}

.List {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  max-height: 200px;
  background: #F0F0F0;
  z-index: 9999;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  margin-top: 5px;
  border-radius: 5px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.Single {
  flex-shrink: 0;
  height: 40px;
  display: flex;
  align-items: center;
  padding-left: 12px;
  cursor: pointer;
}

.Single:hover {
  background: #fff;
}

.errorMsg {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #e74c3c;
  font-weight: 500;
}

.errorIcon {
  font-size: 11px;
  position: relative;
  top: 1px;
}

.field-error-enter-active,
.field-error-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.field-error-enter-from,
.field-error-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
